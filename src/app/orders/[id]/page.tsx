"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { ArrowLeft, Package, MapPin, Calendar, CreditCard } from "lucide-react"
import Link from "next/link"

interface OrderItem {
  product_id: number
  product_name: string
  quantity: number
  price: string
  total: string
  category?: string
}

interface Order {
  order_id: number
  order_total: string
  order_status: number
  delivery_address: string
  delivery_phone: string
  delivery_email: string
  delivery_date_time: string
  order_comments: string
  date_added: string
  items?: OrderItem[]
  subtotal?: string
  wholesale_discount?: string
  coupon_discount?: string
  coupon_code?: string
  after_wholesale_discount?: string
  after_discount?: string
  gst?: string
  delivery_fee?: string
  total?: string
  standing_order?: number
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id as string
  const { isAuthenticated, checkAuth } = useAuthStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated) {
        router.push("/auth/login")
        return
      }

      // Verify token is still valid
      try {
        await checkAuth()
        if (!useAuthStore.getState().isAuthenticated) {
          router.push("/auth/login")
          return
        }
      } catch (error) {
        router.push("/auth/login")
        return
      }

      if (orderId) {
        fetchOrder()
      }
    }

    verifyAuth()
  }, [orderId, isAuthenticated, router, checkAuth])



  const calculateOrderTotal = (order: any) => {
    const subtotal = Number.parseFloat(order.subtotal || "0");
    const delivery = Number.parseFloat(order.delivery_fee || "0");
    const wholesale = Number.parseFloat(order.wholesale_discount || "0");
    const coupon = Number.parseFloat(order.coupon_discount || "0");
    const afterDiscount = Math.max(0, subtotal - wholesale - coupon);
    // Total = After Discount + Delivery (Exclude GST)
    return (afterDiscount + delivery).toFixed(2);
  };

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/store/orders/${orderId}`)
      const ord = response.data.order

      if (ord && ord.items) {
        // Fetch categories for each item to determine GST
        await Promise.all(
          ord.items.map(async (item: any) => {
            try {
              const prodResponse = await api.get(`/store/products/${item.product_id}`)
              const product = prodResponse.data.product
              if (product && product.categories && product.categories.length > 0) {
                item.category = product.categories[0].category_name
              }
            } catch (err) {
              console.error(`Failed to fetch product ${item.product_id} for category`, err)
            }
          })
        )

        const newTotal = calculateOrderTotal(ord)
        ord.total = newTotal
        ord.order_total = newTotal
      }

      setOrder(ord)
    } catch (error: any) {
      console.error("Failed to fetch order:", error)
      if (error.response?.status === 401) {
        useAuthStore.getState().logout()
        router.push("/auth/login")
        return
      }
      toast.error(error.response?.data?.message || "Failed to load order")
      router.push("/account")
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status: number) => {
    const statuses: Record<number, string> = {
      0: "Cancelled",
      1: "Payment Pending",
      2: "Paid",
      4: "Awaiting Approval",
      5: "Completed",
      7: "Approved",
      8: "Rejected",
    }
    return statuses[status] || "Unknown"
  }

  const handleMakePayment = () => {
    router.push(`/payment?order_id=${orderId}`)
  }

  const isPaymentPending = order?.order_status === 1

  const getStatusColor = (status: number) => {
    const colors: Record<number, string> = {
      0: "text-red-600",
      1: "text-blue-600",
      2: "text-green-600",
      4: "text-yellow-600",
      5: "text-green-600",
      7: "text-green-600",
      8: "text-red-600",
    }
    return colors[status] || "text-gray-600"
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Order not found</h2>
          <Link href="/account">
            <Button>Back to Account</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/account?tab=orders">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </Link>

        {/* Payment Pending Alert */}
        {isPaymentPending && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <div>
                  <h3 className="font-semibold text-yellow-900">Payment Pending</h3>
                  <p className="text-sm text-yellow-700">
                    Complete your payment to confirm this order
                  </p>
                </div>
              </div>
              <Button
                onClick={handleMakePayment}
                className="bg-primary hover:bg-primary/90 text-white"
                size="lg"
              >
                Make Payment
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Order #{order.order_id}</h1>
            <p className={`text-lg font-medium mt-2 ${getStatusColor(order.order_status)}`}>
              {getStatusText(order.order_status)}
            </p>
          </div>
          <Link href={`/orders/${order.order_id}/invoice`}>
            <Button variant="outline" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              View Invoice
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${parseFloat(item.total).toFixed(2)}</p>
                        <p className="text-sm text-gray-600">${parseFloat(item.price).toFixed(2)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No items found</p>
              )}
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-medium">{order.delivery_address || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{order.delivery_phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{order.delivery_email || "N/A"}</p>
              </div>
              {order.delivery_date_time && order.standing_order && Number(order.standing_order) > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Delivery Date</p>
                  <p className="font-medium">
                    {new Date(order.delivery_date_time).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
                  </p>
                </div>
              )}
              {order.order_comments && (
                <div>
                  <p className="text-sm text-gray-600">Notes</p>
                  <p className="font-medium">{order.order_comments}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Order Date</span>
                <span className="font-medium">
                  {new Date(order.date_added).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Order ID</span>
                <span className="font-medium">#{order.order_id}</span>
              </div>
              <div className="border-t pt-4 space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">
                    ${parseFloat(order.subtotal || order.order_total || '0').toFixed(2)}
                  </span>
                </div>

                {/* Wholesale Discount */}
                {order.wholesale_discount && parseFloat(order.wholesale_discount) > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Wholesale Discount</span>
                    <span className="font-medium">
                      -${parseFloat(order.wholesale_discount).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Coupon Discount */}
                {order.coupon_discount && parseFloat(order.coupon_discount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      Coupon Discount {order.coupon_code && `(${order.coupon_code})`}
                    </span>
                    <span className="font-medium">
                      -${parseFloat(order.coupon_discount).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* After Discount */}
                {order.after_discount && (
                  <div className="flex justify-between">
                    <span>After Discount</span>
                    <span className="font-medium">
                      ${parseFloat(order.after_discount).toFixed(2)}
                    </span>
                  </div>
                )}



                {/* Shipping */}
                {order.delivery_fee && parseFloat(order.delivery_fee) > 0 && (
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-medium">
                      ${parseFloat(order.delivery_fee).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* GST */}
                {(() => {
                  const taxableCategories = ["packaging", "ancillaries"];
                  const subtotal = parseFloat(order.subtotal || order.order_total || '0');
                  const couponDiscount = parseFloat(order.coupon_discount || '0');

                  let taxableAmount = 0;
                  order.items?.forEach(item => {
                    const category = item.category?.toLowerCase().trim() || "";
                    if (taxableCategories.includes(category)) {
                      taxableAmount += parseFloat(item.total);
                    }
                  });

                  // Apply proportional discount
                  if (couponDiscount > 0 && subtotal > 0) {
                    taxableAmount = taxableAmount * (1 - (couponDiscount / subtotal));
                  }

                  const gstAmount = taxableAmount * 0.1;

                  if (gstAmount > 0) {
                    return (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>GST (Incl.)</span>
                        <span>${gstAmount.toFixed(2)}</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Total */}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${parseFloat(order.total || order.order_total || '0').toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

