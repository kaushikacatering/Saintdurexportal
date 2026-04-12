"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { Printer, Download, ArrowLeft } from "lucide-react"
import Image from "next/image"
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
    firstname: string
    lastname: string
    date_added: string
    items?: OrderItem[]
    subtotal?: string
    wholesale_discount?: string
    coupon_discount?: string
    coupon_code?: string
    after_discount?: string
    gst?: string
    delivery_fee?: string
    total?: string
    payment_status?: string
}

export default function InvoicePage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const orderId = params?.id as string
    const authParam = searchParams.get("auth")
    const { isAuthenticated, checkAuth, token } = useAuthStore()
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrderData = async () => {
            try {
                setLoading(true)
                let ord = null;

                // Try with auth param if provided
                if (authParam) {
                    try {
                        const response = await api.get(`/store/orders/${orderId}`, {
                            headers: { Authorization: `Bearer ${authParam}` }
                        })
                        ord = response.data.order
                    } catch (e) {
                        console.warn("Invoice auth token failed, retrying with session auth...", e)
                    }
                }

                // If no order yet, try with standard session auth
                if (!ord) {
                    const response = await api.get(`/store/orders/${orderId}`)
                    ord = response.data.order
                }

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
                }

                setOrder(ord)
            } catch (error) {
                console.error("Failed to fetch order for invoice:", error)
            } finally {
                setLoading(false)
            }
        }

        if (orderId) {
            fetchOrderData()
        }
    }, [orderId, authParam])

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold mb-4">Invoice not found</h2>
                <p className="text-gray-500 mb-8">
                    We couldn't retrieve the invoice details. The link may be expired or invalid.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link href="/account">
                        <Button variant="outline">Back to Account</Button>
                    </Link>
                    {!isAuthenticated && (
                        <Link href={`/auth/login?redirect=/orders/${orderId}/invoice`}>
                            <Button>Login to View Invoice</Button>
                        </Link>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:py-0 print:px-0">
            <div className="max-w-4xl mx-auto">
                {/* Navigation - Hidden on Print */}
                <div className="mb-8 flex justify-between items-center print:hidden">
                    <Link href={`/orders/${orderId}`}>
                        <Button variant="ghost" className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Order #{order.order_id}
                        </Button>
                    </Link>
                    <Button
                        onClick={handlePrint}
                        className="bg-[#3B5BD6] text-white hover:bg-[#2A4AC9] px-6 rounded-lg shadow-sm"
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Invoice
                    </Button>
                </div>

                {/* Invoice Card */}
                <div className="bg-white shadow-[0_0_40px_rgba(0,0,0,0.03)] border border-gray-100 rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
                    {/* Top Branding Bar */}
                    <div className="h-1.5 bg-[#3B5BD6]" />

                    <div className="p-8 sm:p-12">
                        {/* Header: Logo & Title */}
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-12 gap-8">
                            <div className="space-y-4">
                                <Image
                                    src="/assets/images/logo.png"
                                    alt="St. Dreux Coffee"
                                    width={180}
                                    height={45}
                                    className="object-contain"
                                    style={{ filter: "brightness(0)" }}
                                />
                                <div className="text-sm text-gray-500 leading-relaxed">
                                    <p className="font-bold text-gray-800">St. Dreux Coffee Roasters</p>
                                    <p>12/10-12 Morella Place</p>
                                    <p>Smithfield NSW 2164, Australia</p>
                                    <p className="mt-1">ABN: 12 345 678 910</p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right">
                                <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">INVOICE</h1>
                                <div className="inline-grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                                    <span className="text-gray-400">Invoice Number</span>
                                    <span className="font-bold text-gray-900">INV-{order.order_id}</span>
                                    <span className="text-gray-400">Date Issued</span>
                                    <span className="font-medium text-gray-700">{new Date(order.date_added).toLocaleDateString("en-AU")}</span>
                                    <span className="text-gray-400">Payment Status</span>
                                    <span className={`font-bold uppercase ${order.order_status === 2 || order.order_status === 5 || order.payment_status === 'succeeded' || order.payment_status === 'paid' ? "text-green-600" : "text-amber-600"}`}>
                                        {order.order_status === 2 || order.order_status === 5 || order.payment_status === 'succeeded' || order.payment_status === 'paid' ? "Paid" : "Pending"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 w-full mb-12" />

                        {/* Client Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 mb-16">
                            <div className="space-y-4">
                                <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Billing Details</h2>
                                <div className="text-gray-900">
                                    <p className="font-bold text-lg mb-1">{order.firstname} {order.lastname}</p>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{order.delivery_address}</p>
                                    <div className="mt-4 pt-4 border-t border-gray-50 text-sm text-gray-500 space-y-1">
                                        <p>{order.delivery_email}</p>
                                        <p>{order.delivery_phone}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Shipping Destination</h2>
                                <div className="text-gray-900">
                                    <p className="font-bold text-lg mb-1">{order.firstname} {order.lastname}</p>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{order.delivery_address}</p>
                                </div>
                            </div>
                        </div>

                        {/* Line Items Table */}
                        <div className="mb-12 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-y border-gray-100">
                                        <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Description</th>
                                        <th className="py-4 px-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Qty</th>
                                        <th className="py-4 px-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Unit Price</th>
                                        <th className="py-4 px-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {order.items?.map((item, index) => (
                                        <tr key={index} className="group">
                                            <td className="py-6 px-4">
                                                <p className="font-bold text-gray-900 group-hover:text-[#3B5BD6] transition-colors">{item.product_name}</p>
                                            </td>
                                            <td className="py-6 px-4 text-center text-gray-600">{item.quantity}</td>
                                            <td className="py-6 px-4 text-right text-gray-600">${parseFloat(item.price).toFixed(2)}</td>
                                            <td className="py-6 px-4 text-right font-bold text-gray-900">${parseFloat(item.total).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary & Totals */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-12 pt-8">
                            <div className="hidden sm:block">
                                <p className="text-sm text-gray-400 max-w-xs leading-relaxed italic">
                                    Thank you for your business. For any invoice-related queries, please head over to our support page or scan our official portal.
                                </p>
                            </div>

                            {(() => {
                                const subtotal = parseFloat(order.subtotal || order.order_total || "0");
                                const shipping = parseFloat(order.delivery_fee || "0");
                                const wholesaleDiscount = parseFloat(order.wholesale_discount || "0");
                                const couponDiscount = parseFloat(order.coupon_discount || "0");
                                const afterDiscount = Math.max(0, subtotal - wholesaleDiscount - couponDiscount);
                                const totalAmount = afterDiscount + shipping;

                                return (
                                    <div className="w-full sm:w-80 space-y-3">
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>Subtotal</span>
                                            <span className="font-semibold text-gray-800">${subtotal.toFixed(2)}</span>
                                        </div>

                                        {wholesaleDiscount > 0 && (
                                            <div className="flex justify-between text-sm text-[#3B5BD6]">
                                                <span>Wholesale Discount</span>
                                                <span className="font-semibold">-${wholesaleDiscount.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {couponDiscount > 0 && (
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>Coupon Discount</span>
                                                <span className="font-semibold">-${couponDiscount.toFixed(2)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between text-sm font-bold text-gray-900 pt-3 border-t border-gray-50">
                                            <span>After Discount</span>
                                            <span>${afterDiscount.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>Shipping</span>
                                            <span className="font-semibold text-gray-800">${shipping.toFixed(2)}</span>
                                        </div>

                                        {(() => {
                                            const taxableCategories = ["packaging", "ancillaries"];
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
                                                    <div className="flex justify-between text-xs text-gray-500 italic">
                                                        <span>Includes GST (10% on taxable items)</span>
                                                        <span>${gstAmount.toFixed(2)}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        <div className="flex justify-between items-center pt-6 mt-4 border-t-2 border-gray-900">
                                            <span className="text-lg font-black text-gray-900 uppercase tracking-tighter">Total AUD</span>
                                            <span className="text-4xl font-black text-[#3B5BD6]">
                                                ${totalAmount.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* <div className="mt-20 pt-12 border-t border-gray-50 text-center text-gray-400 text-[10px] uppercase tracking-[0.3em]">
                            www.stdreux.com.au
                        </div> */}
                    </div>
                </div>
            </div>

            <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print-hidden, button { display: none !important; }
        }
      `}</style>
        </div>
    )
}
