"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Facebook, Instagram } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export function Footer() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error("Please enter your email address")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address")
      return
    }

    try {
      setLoading(true)
      const response = await api.post("/store/newsletter/subscribe", {
        email: email.trim(),
      })

      toast.success(response.data.message || "Successfully subscribed to our newsletter!")
      setEmail("")
    } catch (error: any) {
      console.error("Newsletter subscription error:", error)
      const errorMessage = error.response?.data?.message || "Failed to subscribe. Please try again later."
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className="bg-[#0A1F44] text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Logo and Brand */}
          <div>
            <div className="mb-4">
              <Image
                src="/assets/images/logo.png"
                alt="St. Dreux Coffee"
                width={200}
                height={50}
                className="object-contain"
              />
            </div>
            <p className="text-sm text-white/60">COFFEE</p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-semibold mb-4">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-white/70 hover:text-white transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/shop" className="text-white/70 hover:text-white transition-colors text-sm">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-white/70 hover:text-white transition-colors text-sm">
                  About
                </Link>
              </li>
              <li>
                <Link href="/shop?purchaseType=subscription" className="text-white/70 hover:text-white transition-colors text-sm">
                  Subscriptions
                </Link>
              </li>
              <li>
                <Link href="/wholesale-info" className="text-white/70 hover:text-white transition-colors text-sm">
                  Wholesale Partner
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/70 hover:text-white transition-colors text-sm">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/70 hover:text-white transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-white/70">contact@stdreux.com.au</li>
              <li className="text-white/70">+61 246117229</li>
            </ul>

            <div className="mt-6">
              <h4 className="font-semibold mb-3">Follow us</h4>
              <div className="flex gap-3">
                <a
                  href="https://facebook.com/stdreuxcoffee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com/stdreuxcoffee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>

              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-2 lg:col-span-2">
            <h4 className="text-xl font-bold mb-4" style={{ fontFamily: 'Albert Sans' }}>Sign up for our Newsletter</h4>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2 w-full max-w-xl">
              <Input
                type="email"
                placeholder="Enter Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 disabled:opacity-50 flex-1 h-12 text-base rounded-md"
                required
                style={{ fontFamily: 'Albert Sans' }}
              />
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#031881] hover:bg-[#1a3a9e] px-8 h-12 text-base disabled:opacity-50 whitespace-nowrap rounded-md"
                style={{ fontFamily: 'Albert Sans', fontWeight: 600 }}
              >
                {loading ? "Subscribing..." : "Submit"}
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-6 text-center">
          <p className="text-sm text-white/60">
            COPYRIGHT © 2026 ST DREUX COFFEE
          </p>
        </div>
      </div>
    </footer>
  )
}
