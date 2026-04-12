"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/auth"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const forgotPassword = useAuthStore((state) => state.forgotPassword)

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await forgotPassword(email)
      setEmailSent(true)
      toast.success("Password reset link sent to your email!")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Brand Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#1a1a1a] items-center justify-center overflow-hidden">
        <Image
          src="/assets/images/reg.png"
          alt="St. Dreux Coffee"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent z-10" />
        <div className="relative z-20 text-center">
          <h1 className="text-white font-script text-7xl mb-2" style={{ fontFamily: 'cursive' }}>
            St. Dreux
          </h1>
          <p className="text-white tracking-[0.5em] text-sm font-light">COFFEE</p>
        </div>
      </div>

      {/* Right Side - Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Forgot Password</h2>
            <p className="text-gray-600 mt-2">
              {emailSent 
                ? "Check your email for reset instructions"
                : "Enter your email address and we'll send you a reset link"}
            </p>
          </div>

          {emailSent ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-800">
                  If an account exists with <strong>{email}</strong>, a password reset link has been sent.
                </p>
              </div>
              <Button
                onClick={() => router.push("/auth/login")}
                className="w-full py-6 bg-[#2952E6] hover:bg-[#1e3fb3] text-white font-semibold rounded-lg transition-colors"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full py-6 bg-[#2952E6] hover:bg-[#1e3fb3] text-white font-semibold rounded-lg transition-colors"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}

          <p className="text-center text-gray-600 mt-8">
            Remember your password?{" "}
            <Link href="/auth/login" className="text-[#2952E6] font-semibold hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

