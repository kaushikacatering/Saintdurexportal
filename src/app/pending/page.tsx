"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore } from "@/store/auth"
import { toast } from "sonner"

export default function PendingApprovalPage() {
  const router = useRouter()
  const { user, customer, isAuthenticated, isWholesaleApproved, logout } = useAuthStore()

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    // Check if user is actually wholesale
    const isWholesale = customer?.wholesale_type || customer?.service_type?.includes("Wholesaler")

    if (!isWholesale) {
      // Not a wholesale user, redirect to home
      router.push('/')
      return
    }

    // Check if user is approved
    if (isWholesaleApproved()) {
      // User is approved, redirect to wholesale page
      router.push('/wholesale')
      return
    }

    // User is wholesale but not approved - show pending page
  }, [isAuthenticated, customer, isWholesaleApproved, router])

  const handleLogout = () => {
    logout()
    toast.success("Logged out successfully")
    router.push('/')
  }

  if (!isAuthenticated || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2952E6] mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  const isWholesale = customer?.wholesale_type || customer?.service_type?.includes("Wholesaler")
  const wholesaleType = customer?.wholesale_type || "Essential"

  if (!isWholesale) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Brand Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#1a1a1a] items-center justify-center overflow-hidden">
        <Image
          src="/assets/sndurex/Frame 1000007200.png"
          alt="St. Dreux Coffee"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-transparent z-10" />
        <div className="relative z-20 text-center px-8">
          <h1 className="text-white font-script text-7xl mb-2" style={{ fontFamily: 'cursive' }}>
            St. Dreux
          </h1>
          <p className="text-white tracking-[0.5em] text-sm font-light uppercase">COFFEE</p>
        </div>
      </div>

      {/* Right Side - Pending Approval Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-[#F5F5F0]">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                Account Pending Approval
              </CardTitle>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Welcome, <span className="font-semibold text-gray-900">
                    {(() => {
                      if (customer?.firstname && customer?.lastname) {
                        if (customer.firstname.toLowerCase() === customer.lastname.toLowerCase()) {
                          return customer.firstname;
                        }
                        return `${customer.firstname} ${customer.lastname}`;
                      }
                      return customer?.firstname || user?.username?.split('@')[0] || "User";
                    })()}
                  </span>!
                </p>
                <p className="text-gray-600 mb-4">
                  Your <span className="font-semibold">{wholesaleType} Wholesale</span> account is currently under review.
                </p>
                <p className="text-sm text-gray-500">
                  Our team will review your application and contact you within 2-3 business days.
                  You'll receive an email notification once your account is approved.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">What you can do while waiting:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Browse our blogs and articles</li>
                  <li>• Visit our about page</li>
                  <li>• Contact us with any questions</li>
                  <li>• Learn more about our products</li>
                </ul>
              </div>

              {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">Access Restrictions:</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• <strong>Product purchases are not available</strong> until approval</li>
                  <li>• <strong>Wholesale portal access is restricted</strong> until approval</li>
                  <li>• <strong>Shopping cart and checkout are disabled</strong> until approval</li>
                  <li>• <strong>You can browse blogs and contact pages only</strong></li>
                </ul>
              </div> */}

              
              <div className="text-center pt-4 border-t border-gray-200">
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}