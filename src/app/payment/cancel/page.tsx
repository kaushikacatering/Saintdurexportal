"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { XCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

function PaymentCancelContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get("order_id")

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-16 text-center">
          <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
          <p className="text-gray-600 mb-6">
            Your payment was cancelled. No charges have been made.
          </p>
          {orderId && (
            <p className="text-sm text-gray-500 mb-6">
              Order ID: #{orderId}
            </p>
          )}
          <p className="text-sm text-gray-500 mb-8">
            You can complete your payment at any time from your account.
          </p>
          <div className="flex gap-4 justify-center">
            {orderId && (
              <Button 
                onClick={() => router.push(`/payment?order_id=${orderId}`)}
                className="bg-[#2952E6] hover:bg-[#1e3fb3]"
              >
                Try Again
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push("/account")}>
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

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Loading...</p>
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  )
}

