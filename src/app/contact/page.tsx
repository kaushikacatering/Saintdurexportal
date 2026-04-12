"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, Mail } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    message: ""
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [captchaLoaded, setCaptchaLoaded] = useState(false)
  const captchaRef = useRef<HTMLDivElement>(null)
  const captchaWidgetId = useRef<number | null>(null) // Track widget ID to prevent re-rendering
  const isRenderingCaptcha = useRef<boolean>(false) // Track if we're currently rendering

  // Load Google reCAPTCHA
  useEffect(() => {
    // Don't render if already rendered or currently rendering
    if (captchaWidgetId.current !== null || isRenderingCaptcha.current) {
      return
    }

    const renderCaptcha = () => {
      if (!window.grecaptcha || !captchaRef.current) {
        isRenderingCaptcha.current = false
        return
      }

      // Check if element already has a widget rendered (prevent double render)
      if (captchaRef.current.hasChildNodes()) {
        // Check if there's already a reCAPTCHA iframe
        const existingWidget = captchaRef.current.querySelector('iframe[src*="recaptcha"]')
        if (existingWidget) {
          // Widget already exists, just mark as loaded
          setCaptchaLoaded(true)
          isRenderingCaptcha.current = false
          return
        }
      }

      // Check if widget ID already exists (from previous render)
      if (captchaWidgetId.current !== null) {
        setCaptchaLoaded(true)
        isRenderingCaptcha.current = false
        return
      }

      // Mark that we're rendering to prevent concurrent renders
      isRenderingCaptcha.current = true

      // Clear the container before rendering (in case of stale content)
      if (captchaRef.current) {
        captchaRef.current.innerHTML = ''
      }

      try {
        const widgetId = window.grecaptcha.render(captchaRef.current, {
          sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', // Default test key
          theme: 'light',
        })
        captchaWidgetId.current = widgetId
        setCaptchaLoaded(true)
        isRenderingCaptcha.current = false
      } catch (error: any) {
        // If error is about already rendered, mark as loaded
        if (error.message && error.message.includes('already been rendered')) {
          setCaptchaLoaded(true)
          isRenderingCaptcha.current = false
          return
        }
        console.error('Error rendering reCAPTCHA:', error)
        isRenderingCaptcha.current = false
      }
    }

    let checkInterval: NodeJS.Timeout | null = null

    // Check if script already exists
    if (document.querySelector('script[src*="recaptcha"]')) {
      // Script exists, check if grecaptcha is ready
      if (window.grecaptcha && window.grecaptcha.ready) {
        window.grecaptcha.ready(renderCaptcha)
      } else if (window.grecaptcha) {
        // grecaptcha exists but not ready yet
        renderCaptcha()
      } else {
        // Wait a bit for grecaptcha to be ready
        checkInterval = setInterval(() => {
          if (window.grecaptcha) {
            if (window.grecaptcha.ready) {
              window.grecaptcha.ready(renderCaptcha)
            } else {
              renderCaptcha()
            }
            if (checkInterval) clearInterval(checkInterval)
          }
        }, 100)

        // Cleanup interval after 5 seconds
        setTimeout(() => {
          if (checkInterval) clearInterval(checkInterval)
        }, 5000)
      }
    } else {
      // Load the script
      const script = document.createElement('script')
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.grecaptcha && window.grecaptcha.ready) {
          window.grecaptcha.ready(renderCaptcha)
        } else {
          // Fallback: try rendering after a short delay
          setTimeout(renderCaptcha, 100)
        }
      }
      script.onerror = () => {
        console.error('Failed to load reCAPTCHA script')
        isRenderingCaptcha.current = false
      }
      document.body.appendChild(script)
    }

    // Cleanup function
    return () => {
      // Clear any intervals
      if (checkInterval) {
        clearInterval(checkInterval)
      }
      // Note: We don't reset the widget ID here because React StrictMode
      // causes components to mount/unmount twice in development, and we
      // want to preserve the widget ID across re-renders
    }
  }, []) // Empty dependency array ensures this only runs once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Verify reCAPTCHA
    if (captchaLoaded && window.grecaptcha) {
      let captchaResponse: string | null = null
      if (captchaWidgetId.current !== null) {
        // Use the specific widget ID
        captchaResponse = window.grecaptcha.getResponse(captchaWidgetId.current)
      } else {
        // Fallback to default (first widget)
        captchaResponse = window.grecaptcha.getResponse()
      }
      
      if (!captchaResponse) {
        toast.error("Please complete the reCAPTCHA verification")
        return
      }
    }

    setLoading(true)

    try {
      await api.post("/store/contact", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        message: formData.message,
      })

      toast.success("Thank you! Your message has been sent successfully.")
      setSubmitted(true)
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        phoneNumber: "",
        email: "",
        message: ""
      })

      // Reset captcha
      if (window.grecaptcha && captchaWidgetId.current !== null) {
        try {
          window.grecaptcha.reset(captchaWidgetId.current)
        } catch (error) {
          // Ignore reset errors
        }
      }

      // Reset submitted state after 5 seconds
      setTimeout(() => {
        setSubmitted(false)
      }, 5000)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to send message. Please try again."
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col bg-white">
      {/* Hero Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Left Column - Contact Info */}
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Get in Touch
              </h1>
              <p className="text-gray-600 mb-12 leading-relaxed">
                Have a question, idea, or just want to say hi? We'd love to hear from you. Drop us a message below, and we'll get back to you soon — preferably before your next cup runs out.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#2952E6] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 font-medium mb-1">Address</p>
                    <p className="text-gray-700">St Dreux Coffee Roasters</p>
                    <p className="text-gray-700">3/93 Jedda Rd, Prestons NSW 2170</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#2952E6] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 font-medium">Email</p>
                    <p className="text-gray-700">contact@stdreux.com.au</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#2952E6] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 font-medium">Phone</p>
                    <p className="text-gray-700">(02) 4611 7229</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div>
              <Card className="border-2">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Contact Form
                  </h2>
                  
                  {submitted ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                      <div className="text-green-600 mb-2">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-green-900 mb-2">
                        Message Sent Successfully!
                      </h3>
                      <p className="text-green-700">
                        Thank you for contacting us. We'll get back to you as soon as possible.
                      </p>
                    </div>
                  ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          type="text"
                          placeholder="First Name"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="py-6"
                          required
                        />
                      </div>
                      <div>
                        <Input
                          type="text"
                          placeholder="Last Name"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="py-6"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          type="tel"
                          placeholder="Phone Number"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          className="py-6"
                          required
                        />
                      </div>
                      <div>
                        <Input
                          type="email"
                          placeholder="Email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="py-6"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Textarea
                        placeholder="Message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="min-h-32 resize-none"
                        required
                      />
                    </div>

                    {/* reCAPTCHA */}
                    <div className="flex">
                      <div ref={captchaRef} id="recaptcha-container"></div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full py-6 bg-[#2952E6] hover:bg-[#1e3fb3] text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Submit"}
                    </Button>
                  </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Find Us</h2>
          <div className="relative aspect-[21/9] rounded-lg overflow-hidden bg-gray-200 shadow-lg">
            <iframe
              src="https://www.google.com/maps?q=3/93+Jedda+Rd,+Prestons+NSW+2170,+Australia&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="St Dreux Coffee Roasters Location"
              className="absolute inset-0"
            />
          </div>
          <div className="mt-6 text-center">
            <p className="text-gray-700 font-medium">St Dreux Coffee Roasters</p>
            <p className="text-gray-600">3/93 Jedda Rd, Prestons NSW 2170</p>
          </div>
        </div>
      </section>
    </div>
  )
}

