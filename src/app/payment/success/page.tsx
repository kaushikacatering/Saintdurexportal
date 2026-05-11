"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Loader2, CreditCard } from "lucide-react"
import { useCartStore } from "@/store/cart"
import { useAuthStore } from "@/store/auth"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { clearCart } = useCartStore()
  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const { user } = useAuthStore()
  const isAuthenticated = !!user
  
  const paymentIntentId = searchParams.get("payment_intent_id")
  const orderIdParam = searchParams.get("order_id")
  const mode = searchParams.get("mode")

  useEffect(() => {
    // If we have a payment intent and (an order ID OR we are in intent mode), try to verify/create
    if (paymentIntentId && (orderIdParam || mode === 'intent')) {
      if (orderIdParam) setOrderId(orderIdParam)
      verifyPayment()
    } else {
      setVerifying(false)
      // Only show error if we've been waiting for a while or it's clearly missing
      if (!paymentIntentId) {
        toast.error("Missing payment information")
      }
    }
  }, [paymentIntentId, orderIdParam, mode])

  useEffect(() => {
    // Clear cart on successful payment
    if (verified) {
      clearCart()
    }
  }, [verified, clearCart])

  const verifyPayment = async () => {
    if (!paymentIntentId) return

    try {
      let finalOrderIds = orderIdParam ? (orderIdParam.includes(',') ? orderIdParam.split(',') : [orderIdParam]) : []

      // If we are in intent mode and NO order IDs were passed in URL,
      // it means we were redirected by Stripe before order was created.
      if (mode === 'intent' && finalOrderIds.length === 0) {
        console.log("Redirected with mode=intent and no order_id. Checking session storage...");
        const pendingOrdersStr = sessionStorage.getItem('pending_orders')
        
        if (pendingOrdersStr) {
          const pendingOrders = JSON.parse(pendingOrdersStr)
          console.log("Found pending orders to create:", pendingOrders)
          
          const createdOrderIds: string[] = []
          
          // Create each order
          for (const orderPayload of pendingOrders) {
            const finalPayload = {
              ...orderPayload,
              payment_intent_id: paymentIntentId
            }
            
            const endpoint = isAuthenticated ? "/store/orders" : "/store/orders/guest"
            const response = await api.post(endpoint, finalPayload)
            createdOrderIds.push(response.data.order_id)
          }
          
          if (createdOrderIds.length > 0) {
            finalOrderIds = createdOrderIds.map(id => id.toString())
            setOrderId(finalOrderIds.join(','))
            
            // Cleanup session storage NOW that we've created them
            sessionStorage.removeItem('pending_orders')
            sessionStorage.removeItem('pending_order_id')
            sessionStorage.removeItem('order_creation_attempted')
          }
        } else {
          // No pending orders in session storage either
          console.error("No pending orders found in session storage")
          toast.error("Could not find order details to complete your purchase")
          setVerifying(false)
          return
        }
      }

      if (finalOrderIds.length === 0) {
        toast.error("Missing order information")
        setVerifying(false)
        return
      }

      // Verify payment with backend for each order
      // Usually marking the first one as paid is enough if the backend supports it,
      // but let's be thorough if we have multiple.
      const payload: any = {
        payment_intent_id: paymentIntentId,
      }

      if (finalOrderIds.length > 1) {
        payload.order_ids = finalOrderIds
        payload.order_id = parseInt(finalOrderIds[0])
      } else {
        payload.order_id = parseInt(finalOrderIds[0])
      }

      const response = await api.post("/store/payment/verify", payload)

      if (response.data.success) {
        setVerified(true)
        toast.success("Payment successful and orders created!")
      } else {
        toast.error("Payment verification failed")
      }
    } catch (error: any) {
      console.error("Payment verification error:", error)
      toast.error(error.response?.data?.message || "Failed to complete order processing")
    } finally {
      setVerifying(false)
    }
  }

  if (verifying) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-16 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-[#031881] animate-spin mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verifying Payment...</h2>
            <p className="text-gray-600">Please wait while we confirm your payment</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!verified) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-16 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Verification Failed</h2>
            <p className="text-gray-600 mb-6">
              We couldn't verify your payment. Please contact support if you have been charged.
            </p>
            {paymentIntentId && (
              <p className="text-sm text-gray-500 mb-6">
                Payment Intent ID: {paymentIntentId.substring(0, 20)}...
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push("/account")}>
                View Orders
              </Button>
              <Button variant="outline" onClick={() => router.push("/contact")}>
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-16 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your order #{orderId} has been paid successfully.
          </p>
          {paymentIntentId && (
            <p className="text-sm text-gray-500 mb-6">
              Payment Intent ID: {paymentIntentId.substring(0, 20)}...
            </p>
          )}
          <p className="text-sm text-gray-500 mb-8">
            You will receive a confirmation email shortly.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push("/account")} className="bg-[#031881] hover:bg-[#021466]">
              View Orders
            </Button>
            <Button variant="outline" onClick={() => router.push("/shop")}>
              Continue Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="h-12 w-12 mx-auto text-[#031881] animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}

