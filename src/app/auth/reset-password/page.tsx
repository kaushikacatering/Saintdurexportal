"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/auth"
import { toast } from "sonner"

function ResetPasswordPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const resetPassword = useAuthStore((state) => state.resetPassword)
  const verifyResetToken = useAuthStore((state) => state.verifyResetToken)

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [email, setEmail] = useState("")
  const [mountError, setMountError] = useState(false)

  useEffect(() => {
    // TODO: Temporary - remove this flag once reset password is fixed
    setMountError(true)
    setVerifying(false)
  }, [])

  useEffect(() => {
    if (mountError) return
    const verifyToken = async () => {
      if (!token) {
        setVerifying(false)
        setTokenValid(false)
        return
      }

      try {
        const result = await verifyResetToken(token)
        if (result.valid) {
          setTokenValid(true)
          setEmail(result.email || "")
        } else {
          setTokenValid(false)
          toast.error("Invalid or expired reset token")
        }
      } catch (error: any) {
        setTokenValid(false)
        toast.error(error.response?.data?.message || "Invalid or expired reset token")
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [token, verifyResetToken, mountError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long")
      return
    }

    if (!token) {
      toast.error("Invalid reset token")
      return
    }

    setLoading(true)

    try {
      await resetPassword(token, formData.password)
      toast.success("Password reset successfully!")
      router.push("/auth/login")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  if (mountError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-full max-w-md px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-red-900 mb-2">Component Mount Failed</h2>
            <p className="text-red-700 mb-4">
              Something went wrong while loading this page. Please try again later.
            </p>
            <Link href="/auth/login">
              <Button className="bg-[#2952E6] hover:bg-[#1e3fb3] text-white">
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2952E6] mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying reset token...</p>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-full max-w-md px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-red-900 mb-2">Invalid Reset Link</h2>
            <p className="text-red-700 mb-4">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link href="/auth/forgot-password">
              <Button className="bg-[#2952E6] hover:bg-[#1e3fb3] text-white">
                Request New Reset Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
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

      {/* Right Side - Reset Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-gray-600 mt-2">
              Enter your new password for {email}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                type="password"
                placeholder="New Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs mt-1 text-gray-500">
                Password should be at least 8 characters long
              </p>
            </div>

            <div>
              <Input
                type="password"
                placeholder="Confirm New Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 bg-[#2952E6] hover:bg-[#1e3fb3] text-white font-semibold rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>

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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordPageContent />
    </Suspense>
  )
}

