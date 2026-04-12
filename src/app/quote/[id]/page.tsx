"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, Edit, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

interface QuoteProduct {
  product_id: number
  product_name: string
  quantity: number
  price: number
  total: number
  options?: Array<{
    option_name: string
    option_value: string
    option_quantity: number
    option_price: number
  }>
}

interface QuoteDetails {
  order_id: number
  firstname?: string
  lastname?: string
  email?: string
  telephone?: string
  delivery_date_time?: string
  order_comments?: string
  company_name?: string
  department_name?: string
  delivery_address?: string
  location_name?: string
  products: QuoteProduct[]
  subtotal: number
  delivery_fee: number
  wholesale_discount?: number
  coupon_discount: number
  total_discount?: number
  coupon_code?: string
  gst: number
  calculated_total: number
  order_total: number
  order_status?: number
}

export default function PublicQuotePage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.id
  const [comments, setComments] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [actionTaken, setActionTaken] = useState<string | null>(null)

  // Fetch quote from public API (no authentication required)
  const { data: quoteData, isLoading, error } = useQuery({
    queryKey: ['public-quote', quoteId],
    queryFn: async () => {
      const response = await api.get(`/store/quotes/${quoteId}`)
      return response.data.quote
    },
    retry: 1
  })

  const quote: QuoteDetails | null = quoteData || null

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ action, comments }: { action: string, comments: string }) => {
      const response = await api.post(`/store/quotes/${quoteId}/feedback`, {
        action,
        comments: comments.trim() || null
      })
      return response.data
    },
    onSuccess: (data, variables) => {
      setActionTaken(variables.action)
      const actionMessages = {
        approve: "Quote approved successfully!",
        modify: "Modification request submitted successfully!",
        reject: "Quote rejected successfully!"
      }
      toast.success(actionMessages[variables.action as keyof typeof actionMessages] || "Feedback submitted successfully!")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to submit feedback")
    }
  })

  const handleSubmit = (action: 'approve' | 'modify' | 'reject') => {
    if (action === 'modify' && !comments.trim()) {
      toast.error("Please provide comments for requested modifications")
      return
    }

    setSubmitting(true)
    submitFeedbackMutation.mutate(
      { action, comments },
      {
        onSettled: () => {
          setSubmitting(false)
        }
      }
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#0d6efd]" />
          <p className="mt-4 text-gray-600">Loading quote...</p>
        </div>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
            <p className="text-gray-600 mb-6">
              The quote you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push('/')} className="bg-[#0d6efd] hover:bg-[#0b5ed7]">
              Go to Homepage
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Check if quote already has customer action
  const statusMessages: Record<number, string> = {
    7: 'Approved',
    8: 'Rejected',
    9: 'Modification Requested'
  }
  const currentStatus = quote.order_status ? statusMessages[quote.order_status] : null

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quote #{quote.order_id}</h1>
          {currentStatus && (
            <div className="inline-block px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
              Status: {currentStatus}
            </div>
          )}
        </div>

        {/* Quote Details Card */}
        <Card className="p-6 mb-6 bg-white border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quote Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Customer Name</p>
              <p className="font-medium">
                {quote.firstname && quote.lastname 
                  ? `${quote.firstname} ${quote.lastname}` 
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{quote.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{quote.telephone || 'N/A'}</p>
            </div>
            {quote.delivery_date_time && (
              <div>
                <p className="text-sm text-gray-600">Delivery Date & Time</p>
                <p className="font-medium">{formatDate(quote.delivery_date_time)}</p>
              </div>
            )}
            {quote.location_name && (
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium">{quote.location_name}</p>
              </div>
            )}
            {quote.company_name && (
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="font-medium">{quote.company_name}</p>
              </div>
            )}
          </div>

          {quote.delivery_address && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">Delivery Address</p>
              <p className="font-medium">{quote.delivery_address}</p>
            </div>
          )}
        </Card>

        {/* Products Card */}
        <Card className="p-6 mb-6 bg-white border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quote Items</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Product</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Quantity</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.products?.map((product, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="font-medium">{product.product_name}</div>
                      {product.options && product.options.length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          {product.options.map((opt, optIndex) => (
                            <div key={optIndex}>
                              {opt.option_name}: {opt.option_value} ({opt.option_quantity} × ${Number(opt.option_price).toFixed(2)})
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="text-right py-3 px-4">{product.quantity}</td>
                    <td className="text-right py-3 px-4">${Number(product.price).toFixed(2)}</td>
                    <td className="text-right py-3 px-4 font-medium">${Number(product.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-b border-gray-100">
                  <td colSpan={3} className="text-right py-3 px-4">
                    <span className="text-sm font-medium text-gray-700">Sub Total</span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="text-sm font-medium text-gray-900">
                      ${Number(quote.subtotal || 0).toFixed(2)}
                    </span>
                  </td>
                </tr>

                {quote.wholesale_discount && quote.wholesale_discount > 0 && (
                  <tr className="border-b border-gray-100">
                    <td colSpan={3} className="text-right py-3 px-4">
                      <span className="text-sm font-medium text-green-600">Wholesale Discount</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-sm font-medium text-green-600">
                        -${Number(quote.wholesale_discount || 0).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                )}

                {quote.coupon_discount > 0 && (
                  <tr className="border-b border-gray-100">
                    <td colSpan={3} className="text-right py-3 px-4">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-green-600">Coupon Discount</span>
                        {quote.coupon_code && (
                          <span className="text-xs text-gray-500 mt-1">🎟️ {quote.coupon_code}</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-sm font-medium text-green-600">
                        -${Number(quote.coupon_discount || 0).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                )}

                <tr className="border-b border-gray-100">
                  <td colSpan={3} className="text-right py-3 px-4">
                    <span className="text-sm font-medium text-gray-700">Delivery Fee</span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="text-sm font-medium text-gray-900">
                      ${Number(quote.delivery_fee || 0).toFixed(2)}
                    </span>
                  </td>
                </tr>

                {/* <tr className="border-b border-gray-100">
                  <td colSpan={3} className="text-right py-3 px-4">
                    <span className="text-sm font-medium text-gray-700">GST (10%)</span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="text-sm font-medium text-gray-900">
                      ${Number(quote.gst || 0).toFixed(2)}
                    </span>
                  </td>
                </tr> */}

                <tr>
                  <td colSpan={3} className="text-right py-3 px-4">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="text-lg font-bold text-[#0d6efd]">
                      ${Number(quote.calculated_total || quote.order_total || 0).toFixed(2)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Customer Feedback Section */}
        {!currentStatus && (
          <Card className="p-6 bg-white border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Feedback</h2>
            
            <div className="mb-6">
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                Comments / Feedback
              </label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Please provide any comments, modifications needed, or feedback about this quote..."
                rows={6}
                className="w-full border-gray-300 focus:ring-[#0d6efd] focus:border-[#0d6efd]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => handleSubmit('approve')}
                disabled={submitting || actionTaken !== null}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting && actionTaken === 'approve' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Quote
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleSubmit('modify')}
                disabled={submitting || actionTaken !== null}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {submitting && actionTaken === 'modify' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Need Modifications
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleSubmit('reject')}
                disabled={submitting || actionTaken !== null}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting && actionTaken === 'reject' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Quote
                  </>
                )}
              </Button>
            </div>

            {actionTaken && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 text-sm">
                  {actionTaken === 'approve' && "✓ Quote approved successfully!"}
                  {actionTaken === 'modify' && "✓ Modification request submitted successfully!"}
                  {actionTaken === 'reject' && "✓ Quote rejected successfully!"}
                </p>
                <p className="text-green-700 text-xs mt-1">
                  Your feedback has been recorded and the team will be notified.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Show existing feedback if status already set */}
        {currentStatus && quote.order_comments && (
          <Card className="p-6 bg-white border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Previous Feedback</h2>
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-gray-700">{quote.order_comments}</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

