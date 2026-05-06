
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

function PaymentForm({
  orderId,
  orderTotal,
  clientSecret,
  onSuccess,
  mode
}: {
  orderId: string;
  orderTotal: number;
  clientSecret: string;
  onSuccess: () => void;
  mode?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { isAuthenticated } = useAuthStore();
  const [processing, setProcessing] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret || !paymentElementReady) {
      toast.error("Payment form is not ready yet. Please wait.");
      return;
    }

    // Additional validation to ensure Payment Element is properly mounted
    const paymentElement = elements.getElement(PaymentElement);
    if (!paymentElement) {
      toast.error("Payment form is not fully loaded. Please try again.");
      return;
    }

    setProcessing(true);

    try {
      // First, submit the elements to collect all form data
      const submitResult = await elements.submit();

      if (submitResult.error) {
        toast.error(
          submitResult.error.message || "Failed to validate payment details",
        );
        setProcessing(false);
        return;
      }

      // Then confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?payment_intent_id={PAYMENT_INTENT_ID}&order_id=${orderId}&mode=${mode || ''}`,
          payment_method_data: {
            billing_details: {
              address: {
                country: 'AU',
              },
            },
          },
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Payment failed");
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {

        if (mode === 'intent') {
          // Handle "Pay Now" flow: create orders AFTER payment success
          try {
            const pendingOrdersJson = sessionStorage.getItem('pending_orders');
            if (pendingOrdersJson) {
              const pendingOrders = JSON.parse(pendingOrdersJson);
              const createdOrderIds: string[] = [];

              for (const orderPayload of pendingOrders) {
                // Add payment intent ID to payload
                const finalPayload = {
                  ...orderPayload,
                  payment_intent_id: paymentIntent.id
                };

                const endpoint = isAuthenticated ? "/store/orders" : "/store/orders/guest";
                console.log("Creating order after payment:", finalPayload, "endpoint:", endpoint);
                const response = await api.post(endpoint, finalPayload);
                createdOrderIds.push(response.data.order_id);

                // Handle Image Upload if present (this part is tricky as image is not in session storage)
                // Assuming image upload is not critical or handled separately
              }

              sessionStorage.removeItem('pending_orders');
              sessionStorage.removeItem('payment_intent_id');
              sessionStorage.removeItem('client_secret');

              toast.success("Payment successful! Orders created.");
              onSuccess();
            } else {
              toast.error("Session expired or order data missing. Please contact support.");
            }
          } catch (createError: any) {
            console.error("Failed to create orders after payment:", createError);
            toast.error("Payment successful, but failed to create order record. Please contact support.");
          }
        } else {
          // Standard flow: Verify payment on backend
          await api.post("/store/payment/verify", {
            payment_intent_id: paymentIntent.id,
            order_id: orderId, // This might passed as comma-separated string if multiple
            order_ids: orderId.includes(',') ? orderId.split(',') : undefined
          });

          toast.success("Payment processed successfully!");
          onSuccess();
        }

      } else {
        toast.error("Payment was not successful. Please try again.");
        setProcessing(false);
      }
    } catch (error: any) {
      console.error("Payment error:", error);

      // Specific error handling for Stripe integration errors
      if (
        error.type === "invalid_request_error" ||
        error.code === "payment_intent_unexpected_state"
      ) {
        toast.error(
          "Payment session expired. Please refresh the page and try again.",
        );
      } else {
        toast.error(
          error.response?.data?.message ||
          "Payment processing failed. Please try again.",
        );
      }
      setProcessing(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Failed to initialize payment</div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!paymentElementReady && (
        <div className="text-center py-4 border rounded-lg bg-gray-50">
          <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
          <p className="text-sm text-gray-500">Loading payment form...</p>
        </div>
      )}

      <div className={paymentElementReady ? "block" : "hidden"}>
        <PaymentElement
          options={{
            layout: "tabs",
            fields: {
              billingDetails: {
                address: {
                  country: 'never',
                }
              }
            }
          }}
          onReady={() => {
            console.log("PaymentElement is ready");
            setPaymentElementReady(true);
          }}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={processing || !stripe || !paymentElementReady}
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          `Pay $${Number.parseFloat(orderTotal.toString()).toFixed(2)}`
        )}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Your payment is secured with Stripe. We do not store your card details.
      </p>
    </form>
  );
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawOrderId = searchParams.get("order_id");
  const rawOrderIds = searchParams.get("order_ids");
  const mode = searchParams.get("mode");
  const urlAmount = searchParams.get("amount");

  // Normalize to valid IDs array
  // Use state to keep track of remaining orders to pay
  const [allOrderIds, setAllOrderIds] = useState<string[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [completedOrderIds, setCompletedOrderIds] = useState<string[]>([]);

  const { isAuthenticated } = useAuthStore();
  const { clearCart } = useCartStore();
  const [order, setOrder] = useState<any>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [allFinished, setAllFinished] = useState(false);
  const [isAggregated, setIsAggregated] = useState(false);

  // Initialize IDs
  useEffect(() => {
    if (mode === 'intent') {
      // Mode intent: No initial order IDs needed
      setLoadingOrder(false);
      const storedClientSecret = sessionStorage.getItem('client_secret');
      if (storedClientSecret) {
        setClientSecret(storedClientSecret);
      }
      if (urlAmount) {
        setOrder({
          order_total: urlAmount,
          total: urlAmount,
          subtotal: urlAmount
        });
      }
      return;
    }

    const ids = rawOrderIds
      ? rawOrderIds.split(',')
      : (rawOrderId ? [rawOrderId] : []);

    if (ids.length > 0) {
      setAllOrderIds(ids);

      // If we have multiple IDs, try to aggregate
      if (ids.length > 1) {
        setIsAggregated(true);
        fetchOrdersCombined(ids).then((ord) => {
          if (ord) {
            createPaymentIntentAggregated(ids, Number.parseFloat(ord.total));
          }
        });
      } else {
        setIsAggregated(false);
        if (!currentOrderId && completedOrderIds.length === 0) {
          setCurrentOrderId(ids[0]);
        }
      }
    }
  }, [rawOrderId, rawOrderIds, mode, urlAmount]);

  useEffect(() => {
    if (mode === 'intent') return;

    if (!isAggregated && currentOrderId && !allFinished) {
      fetchOrder(currentOrderId).then((ord) => {
        if (ord) {
          createPaymentIntent(currentOrderId, Number.parseFloat(ord.total));
        }
      });
    } else if (!isAggregated) {
      // If no current order but we have IDs, we might be done or loading
      if (allOrderIds.length > 0 && completedOrderIds.length === allOrderIds.length) {
        setAllFinished(true);
        clearCart();
      }
    }
  }, [isAuthenticated, currentOrderId, isAggregated, mode]);

  const calculateOrderTotal = (order: any) => {
    const subtotal = Number.parseFloat(order.subtotal || "0");
    const delivery = Number.parseFloat(order.delivery_fee || "0");
    const wholesale = Number.parseFloat(order.wholesale_discount || "0");
    const coupon = Number.parseFloat(order.coupon_discount || "0");
    const afterDiscount = Math.max(0, subtotal - wholesale - coupon);
    // Total = After Discount + Delivery (Exclude GST)
    return (afterDiscount + delivery).toFixed(2);
  };

  const fetchOrder = async (id: string) => {
    try {
      setLoadingOrder(true);
      const endpoint = isAuthenticated ? `/store/orders/${id}` : `/store/orders/${id}/public-view`;
      const response = await api.get(endpoint);
      const ord = response.data.order;

      if (ord) {
        const newTotal = calculateOrderTotal(ord);
        ord.total = newTotal;
        ord.order_total = newTotal;
      }

      setOrder(ord);
      return ord;
    } catch (error) {
      console.error("Failed to fetch order:", error);
      toast.error("Failed to load order details");
      return null;
    } finally {
      setLoadingOrder(false);
    }
  };

  const fetchOrdersCombined = async (ids: string[]) => {
    try {
      setLoadingOrder(true);
      const endpoint = (id: string) => isAuthenticated ? `/store/orders/${id}` : `/store/orders/${id}/public-view`;
      const promises = ids.map(id => api.get(endpoint(id)));
      const responses = await Promise.all(promises);
      const orders = responses.map(r => r.data.order);

      // Aggregate totals
      const combinedOrder = orders.reduce((acc, curr) => {
        return {
          order_id: ids.join(", "), // Show combined IDs
          subtotal: (Number.parseFloat(acc.subtotal || "0") + Number.parseFloat(curr.subtotal || "0")).toString(),
          total: (Number.parseFloat(acc.total || "0") + Number.parseFloat(curr.total || "0")).toString(),
          order_total: (Number.parseFloat(acc.order_total || "0") + Number.parseFloat(curr.order_total || "0")).toString(),
          delivery_fee: (Number.parseFloat(acc.delivery_fee || "0") + Number.parseFloat(curr.delivery_fee || "0")).toString(),
          gst: (Number.parseFloat(acc.gst || "0") + Number.parseFloat(curr.gst || "0")).toString(),
          wholesale_discount: (Number.parseFloat(acc.wholesale_discount || "0") + Number.parseFloat(curr.wholesale_discount || "0")).toString(),
          coupon_discount: (Number.parseFloat(acc.coupon_discount || "0") + Number.parseFloat(curr.coupon_discount || "0")).toString(),
          after_discount: (Number.parseFloat(acc.after_discount || "0") + Number.parseFloat(curr.after_discount || "0")).toString(),
          coupon_code: acc.coupon_code || curr.coupon_code,
        };
      }, {
        subtotal: "0", total: "0", order_total: "0", delivery_fee: "0", gst: "0",
        wholesale_discount: "0", coupon_discount: "0", after_discount: "0"
      });

      const newTotal = calculateOrderTotal(combinedOrder);
      combinedOrder.total = newTotal;
      combinedOrder.order_total = newTotal;

      setOrder(combinedOrder);
      return combinedOrder;
    } catch (error) {
      console.error("Failed to fetch combined orders:", error);
      toast.error("Failed to load order details");
      return null;
    } finally {
      setLoadingOrder(false);
    }
  };

  const createPaymentIntent = async (id: string, amountOverride?: number) => {
    try {
      setLoadingPayment(true);
      const payload: any = { order_id: id };
      if (amountOverride !== undefined) {
        payload.amount = amountOverride;
      }
      const response = await api.post("/store/payment/create-intent", payload);

      if (response.data.success && response.data.client_secret) {
        setClientSecret(response.data.client_secret);
      } else {
        toast.error(response.data.message || "Failed to initialize payment");
      }
    } catch (error: any) {
      console.error("Payment intent error:", error);
      toast.error(
        error.response?.data?.message ||
        "Failed to initialize payment. Please try again.",
      );
    } finally {
      setLoadingPayment(false);
    }
  };

  const createPaymentIntentAggregated = async (ids: string[], amountOverride?: number) => {
    try {
      setLoadingPayment(true);

      const payload: any = {
        order_id: ids[0],
        amount: amountOverride
      };

      // Also send order_ids just in case
      // payload.order_ids = ids; 

      const response = await api.post("/store/payment/create-intent", payload);

      if (response.data.success && response.data.client_secret) {
        setClientSecret(response.data.client_secret);
      } else {
        // Fallback to sequential if aggregation fails ??
        // Error means we can't do one payment.
        console.error("Aggregation failed", response.data);
        setIsAggregated(false);
        setCurrentOrderId(ids[0]); // Start sequential
      }
    } catch (error: any) {
      console.error("Payment intent aggregation error:", error);
      // Fallback
      setIsAggregated(false);
      setCurrentOrderId(ids[0]);
    } finally {
      setLoadingPayment(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (mode === 'intent') {
      setPaymentSuccess(true);
      clearCart();
      return;
    }

    if (isAggregated) {
      setPaymentSuccess(true);
      clearCart();
      return;
    }

    if (!currentOrderId) return;

    const newCompleted = [...completedOrderIds, currentOrderId];
    setCompletedOrderIds(newCompleted);

    // Find next order
    const currentIndex = allOrderIds.indexOf(currentOrderId);
    if (currentIndex < allOrderIds.length - 1) {
      const nextId = allOrderIds[currentIndex + 1];
      toast.success("Payment successful! Proceeding to next order...");

      // Reset state for next order
      setClientSecret(null);
      setOrder(null);
      setCurrentOrderId(nextId);
    } else {
      setAllFinished(true);
      clearCart();
    }
  };

  if (allFinished || (isAggregated && paymentSuccess) || (mode === 'intent' && paymentSuccess)) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-3xl font-bold mb-4">
              {isAggregated || mode === 'intent' ? "Payment Successful!" : "All Payments Successful!"}
            </h2>
            <p className="text-gray-600 mb-6">
              Your orders have been confirmed and processed.
            </p>
            {allOrderIds.length > 0 && <p className="text-sm text-gray-500 mb-8">Order ID(s): {allOrderIds.join(', ')}</p>}
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push("/account")}>
                View Orders
              </Button>
              <Button variant="outline" onClick={() => router.push("/shop")}>
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-8 text-center">
            <p className="text-red-600 mb-4">Stripe is not configured. Please set
              NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable.</p>
            <Link href="/checkout">
              <Button variant="outline">Return to Checkout</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (allOrderIds.length === 0 && mode !== 'intent') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-8 text-center">
            <p className="text-red-600 mb-4">Order ID is missing</p>
            <Link href="/checkout">
              <Button variant="outline">Return to Checkout</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/checkout`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Checkout
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8">
        Payment
        {!isAggregated && allOrderIds.length > 1 && ` (${completedOrderIds.length + 1}/${allOrderIds.length})`}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details {(!isAggregated && allOrderIds.length > 1) ? `- Order #${currentOrderId}` : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayment || (isAggregated && loadingOrder) || (!clientSecret && (!order || parseFloat(order.total || order.order_total || '0') <= 0)) ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4" />
                  <p>Initializing payment...</p>
                </div>
              ) : (
                <Elements stripe={stripePromise} options={
                  clientSecret ? {
                    clientSecret,
                    appearance: { theme: 'stripe' },
                  } : {
                    mode: 'payment',
                    currency: 'aud',
                    amount: Math.round(parseFloat(order?.total || '0') * 100),
                    appearance: { theme: 'stripe' },
                  }
                }>
                  <PaymentForm
                    orderId={isAggregated ? allOrderIds.join(',') : (currentOrderId || "")}
                    orderTotal={
                      order
                        ? parseFloat(order.order_total || order.total || "0")
                        : 0
                    }
                    clientSecret={clientSecret || ''}
                    onSuccess={handlePaymentSuccess}
                    mode={mode || undefined}
                  />
                </Elements>

              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingOrder ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                  <p className="text-sm text-gray-500 mt-2">
                    Loading order details...
                  </p>
                </div>
              ) : order ? (
                <div className="space-y-2 text-sm">
                  {/* <div className="flex justify-between">
                    <span>Order ID</span>
                    <span className="font-medium">#{order.order_id}</span>
                  </div> */}
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>
                      $
                      {Number.parseFloat(
                        order.subtotal || order.order_total || "0",
                      ).toFixed(2)}
                    </span>
                  </div>
                  {order.wholesale_discount &&
                    parseFloat(order.wholesale_discount) > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Wholesale Discount</span>
                        <span>
                          -$
                          {Number.parseFloat(order.wholesale_discount).toFixed(
                            2,
                          )}
                        </span>
                      </div>
                    )}
                  {order.coupon_discount &&
                    parseFloat(order.coupon_discount) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>
                          Coupon Discount{" "}
                          {order.coupon_code && `(${order.coupon_code})`}
                        </span>
                        <span>
                          -$
                          {Number.parseFloat(order.coupon_discount).toFixed(2)}
                        </span>
                      </div>
                    )}
                  {order.after_discount && (
                    <div className="flex justify-between">
                      <span>After Discount</span>
                      <span>
                        ${Number.parseFloat(order.after_discount).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {order.gst && parseFloat(order.gst) > 0 && (
                    <div className="flex justify-between">
                      <span> GST (10%) Inclusive</span>
                      <span>${Number.parseFloat(order.gst).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>
                      ${Number.parseFloat(order.delivery_fee || "0").toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>
                        $
                        {Number.parseFloat(
                          order.total || order.order_total || "0",
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="font-medium text-red-600 mb-2">Order not found</p>
                  <p className="text-sm mb-4">
                    Could not load order #{currentOrderId || rawOrderId || "Unknown"}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (currentOrderId) fetchOrder(currentOrderId);
                      else window.location.reload();
                    }}
                  >
                    Retry Loading
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4" />
            <p>Loading payment page...</p>
          </div>
        </div>
      }
    >
      <PaymentPageContent />
    </Suspense>
  );
}
