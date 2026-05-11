"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuthStore } from "@/store/auth"
import { useCartStore } from "@/store/cart"
import { api } from "@/lib/api"
import { ShoppingBag, User, LogOut, Lock, X, ChevronLeft, ChevronRight, CreditCard, Save, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface Order {
  order_id: number
  total: string | number
  order_status: number
  date_added: string
  delivery_date?: string
  delivery_time?: string
  shipping_address_1?: string
  item_count?: number
  delivery_date_time?: string
  gst?: string | number
}

interface Subscription {
  order_id: number
  order_status: number
  order_total: string
  delivery_date_time?: string
  customer_order_name?: string
  products?: Array<{
    product_id: number
    product_name: string
    quantity: number
    price: number
    total: number
    product_image?: string
    options?: Array<{
      option_name: string
      option_value: string
      option_quantity: number
    }>
  }>
  standing_order?: number
  gst?: string | number
}

function AccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "profile"
  const { user, customer, isAuthenticated, logout, token, checkAuth } = useAuthStore()
  const { addItem, clearCart } = useCartStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [subscriptionToRenew, setSubscriptionToRenew] = useState<Subscription | null>(null)
  const [subscriptionIdToCancel, setSubscriptionIdToCancel] = useState<number | null>(null)
  const [showCancelSuccess, setShowCancelSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Profile Form State
  const [profileData, setProfileData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    telephone: "",
    company_name: "",
    address_line1: "",
    address_line2: "",
    suburb: "",
    postal_code: "",
    state: "",
    preferred_contact_method: "",
    business_type: "",
    estimated_opening_date: "",
  })
  const [isWholesale, setIsWholesale] = useState(false)
  const [updatingProfile, setUpdatingProfile] = useState(false)

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated) {
        router.push("/auth/login")
        return
      }

      // Verify token is still valid
      try {
        await checkAuth()
        // If checkAuth fails, it will clear auth state and we'll redirect
        if (!useAuthStore.getState().isAuthenticated) {
          router.push("/auth/login")
          return
        }
      } catch (error) {
        // Token expired or invalid - redirect to login
        router.push("/auth/login")
        return
      }



      fetchOrders()
      fetchSubscriptions()
    }

    verifyAuth()
  }, [isAuthenticated, currentPage, router, checkAuth])

  useEffect(() => {
    const loadProfileData = async () => {
      if (user && customer) {
        setIsWholesale(
          !!(customer.wholesale_type || customer.service_type?.includes("Wholesaler"))
        )

        // Initial population from auth store
        // We rely on checkAuth to keep this up to date via /store/auth/me
        let currentCustomer = customer;

        try {
          // Explicitly fetch fresh data from /store/auth/me to ensure we have the latest
          const response = await api.get("/store/auth/me");
          if (response.data && response.data.customer) {
            currentCustomer = response.data.customer;
          }
        } catch (err) {
          console.error("Failed to fetch fresh user profile:", err)
        }

        // Parse address from customer_address if individual fields are missing
        // The /me endpoint often returns a combined string in customer_address
        let address1 = currentCustomer.address_line1 || "";
        let suburb = currentCustomer.suburb || "";
        let state = currentCustomer.state || "";
        let postalCode = currentCustomer.postal_code || "";
        let address2 = currentCustomer.address_line2 || "";

        if (!address1 && !suburb && !state && !postalCode && currentCustomer.customer_address) {
          const parts = currentCustomer.customer_address.split(",").map((p: string) => p.trim());
          // Assuming format: Street, Suburb, State, Postcode
          if (parts.length >= 4) {
            address1 = parts[0];
            suburb = parts[parts.length - 3];
            state = parts[parts.length - 2];
            postalCode = parts[parts.length - 1];
          } else if (parts.length === 3) {
            address1 = parts[0];
            state = parts[1];
            postalCode = parts[2];
          } else {
            address1 = currentCustomer.customer_address;
          }
        }

        const firstname = (currentCustomer.firstname || user.username?.split(' ')[0] || "").trim();
        let lastname = (currentCustomer.lastname || user.username?.split(' ').slice(1).join(' ') || "").trim();

        // Fix for existing users with duplicate first/last name from the registration bug
        if (firstname && lastname && firstname.toLowerCase() === lastname.toLowerCase()) {
          lastname = "";
        }

        setProfileData({
          firstname: firstname,
          lastname: lastname,
          email: user.email || currentCustomer.email || "",
          telephone: currentCustomer.telephone || "",
          company_name: currentCustomer.company_name || "",
          address_line1: address1,
          address_line2: address2,
          suburb: suburb,
          postal_code: postalCode,
          state: state,
          preferred_contact_method: currentCustomer.preferred_contact_method || "",
          business_type: currentCustomer.business_type || "",
          estimated_opening_date: currentCustomer.estimated_opening_date ? new Date(currentCustomer.estimated_opening_date).toISOString().split('T')[0] : "",
        })
      }
    }

    loadProfileData()
  }, [user, customer])

  const handleUpdateProfile = async () => {
    try {
      setUpdatingProfile(true)

      // Sanitize payload: convert empty strings to null for optional fields to avoid DB errors
      const sanitizedData = { ...profileData }
      const optionalFields = [
        'estimated_opening_date',
        'business_type',
        'preferred_contact_method',
        'company_name',
        'address_line2'
      ]

      optionalFields.forEach(field => {
        if (sanitizedData[field as keyof typeof sanitizedData] === "") {
          (sanitizedData as any)[field] = null
        }
      })

      const payload: any = {
        ...sanitizedData,
        // Ensure we send back the ID if needed by the backend
        customer_id: customer?.customer_id
      }

      // Use /store/auth/update-profile for profile updates as requested
      await api.post("/store/auth/update-profile", payload)

      toast.success("Profile updated successfully")

      // Refresh local user data to reflect changes
      await checkAuth()
    } catch (error: any) {
      console.error("Profile update error:", error)
      const message = error.response?.data?.message || "Failed to update profile"
      toast.error(message)
    } finally {
      setUpdatingProfile(false)
    }
  }

  // Effect to fetch orders when page changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [currentPage, isAuthenticated])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await api.get("/store/orders", {
        params: { page: currentPage, limit: 10 },
      })

      // Handle response data safely
      const ordersData = response?.data?.orders || []
      const paginationData = response?.data?.pagination || {}

      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setTotalPages(paginationData.total_pages || 1)
    } catch (error: any) {
      console.error("Failed to fetch orders:", error)

      // Handle 401 - token expired
      if (error.response?.status === 401) {
        logout()
        router.push("/auth/login")
        return
      }

      // Only show error toast if it's not a 404 or empty result
      if (error.response?.status !== 404) {
        const errorMessage = error.response?.data?.message || error.message || "Failed to load orders"
        toast.error(errorMessage)
      }

      setOrders([]) // Set empty array on error
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      setSubscriptionsLoading(true)
      const response = await api.get("/store/subscriptions")
      setSubscriptions(response.data.subscriptions || [])
    } catch (error: any) {
      console.error("Failed to fetch subscriptions:", error)
      // Handle 401 - token expired
      if (error.response?.status === 401) {
        logout()
        router.push("/auth/login")
        return
      }
      // Don't show error if user just doesn't have subscriptions
      setSubscriptions([]) // Set empty array on error
    } finally {
      setSubscriptionsLoading(false)
    }
  }

  const handleRenewClick = (subscription: Subscription) => {
    setSubscriptionToRenew(subscription)
  }

  const performSubscriptionRenewal = async () => {
    if (!subscriptionToRenew) return

    try {
      clearCart()

      // Calculate next start date based on frequency
      const today = new Date()
      const freqDays = subscriptionToRenew.standing_order || 14
      const nextDate = new Date(today)
      nextDate.setDate(today.getDate() + freqDays)
      // Use local date parts to avoid UTC timezone shift (e.g. IST midnight → previous UTC day)
      const pad = (n: number) => String(n).padStart(2, '0')
      const startDateStr = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}-${pad(nextDate.getDate())}`

      // Map standing_order days to frequency string
      let freqString = "2 Weeks"
      if (subscriptionToRenew.standing_order === 14) freqString = "2 Weeks"
      else if (subscriptionToRenew.standing_order === 28) freqString = "4 Weeks"
      else if (subscriptionToRenew.standing_order === 56) freqString = "8 Weeks"

      const products = subscriptionToRenew.products || []

      for (const product of products) {
        const productPrice = parseFloat(String(product.price || product.total || 0))

        // Fetch full product details to get option IDs (needed by the backend when placing order)
        let resolvedOptions: any[] = []
        try {
          const { data } = await api.get(`/store/products/${product.product_id}`)
          const fullProduct = data.product

          if (product.options && product.options.length > 0 && fullProduct?.options) {
            resolvedOptions = product.options.map((subOpt: any) => {
              // Find matching option group by name
              const matchedGroup = fullProduct.options.find((o: any) =>
                o.option_name?.toLowerCase() === subOpt.option_name?.toLowerCase()
              )
              if (!matchedGroup) return null

              // Find matching value by option_value string
              const matchedValue = matchedGroup.values?.find((v: any) =>
                v.option_value?.toLowerCase() === subOpt.option_value?.toLowerCase()
              )
              if (!matchedValue) return null

              // Determine price from the matched value
              const optionPrice = parseFloat(
                matchedValue.standard_price ||
                matchedValue.product_option_price ||
                "0"
              )

              return {
                option_id: matchedGroup.option_id,
                option_name: matchedGroup.option_name,
                option_value_id: matchedValue.option_value_id,
                option_value: matchedValue.option_value,
                product_option_id: matchedValue.product_option_value_id || matchedValue.product_option_id || matchedGroup.product_option_id,
                option_price: optionPrice > 0 ? optionPrice.toFixed(2) : "0",
                option_price_prefix: "+"
              }
            }).filter(Boolean)
          }
        } catch (err) {
          console.warn(`Could not fetch product details for ${product.product_id}:`, err)
        }

        // If options carry the price (base product price is 0), keep it in options
        // Otherwise put price in product_price and zero out options
        const optionsTotal = resolvedOptions.reduce((sum, o) => sum + parseFloat(o.option_price || "0"), 0)
        let finalProductPrice = productPrice.toFixed(2)
        let finalOptions = resolvedOptions

        if (productPrice > 0 && optionsTotal > 0) {
          // Price is in product_price already — zero out option prices to avoid double-counting
          finalOptions = resolvedOptions.map(o => ({ ...o, option_price: "0" }))
        }

        addItem({
          product_id: product.product_id,
          product_name: product.product_name,
          product_price: finalProductPrice,
          quantity: product.quantity || 1,
          product_image: product.product_image || "",
          options: finalOptions,
          subscription: {
            frequency: freqString,
            startDate: startDateStr,
            deliveryTime: "00:00:00"
          }
        })
      }

      setSubscriptionToRenew(null)
      router.push('/checkout')

    } catch (e) {
      console.error("Failed to renew:", e)
      toast.error("Failed to renew subscription")
    }
  }




  const handleCancelSubscription = (subscriptionId: number) => {
    setSubscriptionIdToCancel(subscriptionId)
  }

  const performCancellation = async () => {
    if (!subscriptionIdToCancel) return

    try {
      await api.post(`/store/subscriptions/${subscriptionIdToCancel}/cancel`)
      fetchSubscriptions()
      setSubscriptionIdToCancel(null)
      setShowCancelSuccess(true)
    } catch (error: any) {
      console.error("Failed to cancel subscription:", error)
      toast.error(error.response?.data?.message || "Failed to cancel subscription")
    }
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields")
      return
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    try {
      setUpdatingPassword(true)
      await api.post("/store/auth/update-password", {
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.success("Password updated successfully")
      setShowPasswordDialog(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("Failed to update password:", error)
      toast.error(error.response?.data?.message || "Failed to update password")
    } finally {
      setUpdatingPassword(false)
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

  const isSubscriptionActive = (subscription: Subscription) => {
    // Cancelled (0) or Rejected (8) are always inactive
    if (subscription.order_status === 0 || subscription.order_status === 8) {
      return false
    }

    // If we have both delivery date and frequency, use them to determine if it's still active
    if (subscription.delivery_date_time && subscription.standing_order) {
      const deliveryDate = new Date(subscription.delivery_date_time)
      const now = new Date()

      // Calculate when the subscription period ends (standing_order is in days)
      const expiryDate = new Date(deliveryDate.getTime() + (subscription.standing_order * 24 * 60 * 60 * 1000))

      return now < expiryDate
    }

    // Fallback: Default to status-based logic if date info is missing
    // Status 1 (Payment Pending), 2 (Paid), 5 (Completed), 7 (Approved)
    return [1, 2, 5, 7].includes(subscription.order_status)
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-bold">My Account</h1>
        {customer && (
          <Badge variant="outline" className={`text-sm ${customer.wholesale_type === "premium" ||
              customer.service_type === "Full Service Wholesaler" ||
              customer.service_type === "Full Service"
              ? "bg-purple-50 text-purple-700 border-purple-200"
              : customer.wholesale_type || customer.service_type?.includes("Wholesaler")
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
            {(() => {
              if (
                customer.wholesale_type === "premium" ||
                customer.service_type === "Full Service Wholesaler" ||
                customer.service_type === "Full Service"
              ) {
                return "Premium Wholesaler";
              } else if (
                customer.wholesale_type ||
                customer.service_type?.includes("Wholesaler")
              ) {
                return "Essential Wholesaler";
              } else {
                return "Retailer";
              }
            })()}
          </Badge>
        )}
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstname">First Name</Label>
                      <Input
                        id="firstname"
                        value={profileData.firstname}
                        onChange={(e) => setProfileData({ ...profileData, firstname: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastname">Last Name</Label>
                      <Input
                        id="lastname"
                        value={profileData.lastname}
                        onChange={(e) => setProfileData({ ...profileData, lastname: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telephone">Phone Number</Label>
                      <Input
                        id="telephone"
                        value={profileData.telephone}
                        onChange={(e) => setProfileData({ ...profileData, telephone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_line1">Address Line 1</Label>
                    <Input
                      id="address_line1"
                      value={profileData.address_line1}
                      onChange={(e) => setProfileData({ ...profileData, address_line1: e.target.value })}
                    />
                  </div>

                  {isWholesale && (
                    <div className="space-y-2">
                      <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
                      <Input
                        id="address_line2"
                        value={profileData.address_line2}
                        onChange={(e) => setProfileData({ ...profileData, address_line2: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="suburb">Suburb</Label>
                      <Input
                        id="suburb"
                        value={profileData.suburb}
                        onChange={(e) => setProfileData({ ...profileData, suburb: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={profileData.postal_code}
                        onChange={(e) => setProfileData({ ...profileData, postal_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={profileData.state}
                        onValueChange={(value) => setProfileData({ ...profileData, state: value })}
                      >
                        <SelectTrigger id="state">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NSW">NSW</SelectItem>
                          <SelectItem value="VIC">VIC</SelectItem>
                          <SelectItem value="QLD">QLD</SelectItem>
                          <SelectItem value="SA">SA</SelectItem>
                          <SelectItem value="WA">WA</SelectItem>
                          <SelectItem value="TAS">TAS</SelectItem>
                          <SelectItem value="NT">NT</SelectItem>
                          <SelectItem value="ACT">ACT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isWholesale && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="company_name">Company Name</Label>
                        <Input
                          id="company_name"
                          value={profileData.company_name}
                          onChange={(e) => setProfileData({ ...profileData, company_name: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="preferred_contact_method">Preferred Contact Method</Label>
                          <Select
                            value={profileData.preferred_contact_method}
                            onValueChange={(value) => setProfileData({ ...profileData, preferred_contact_method: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Phone">Phone</SelectItem>
                              <SelectItem value="Email">Email</SelectItem>
                              <SelectItem value="Text">Text</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="business_type">Business Type</Label>
                          <Select
                            value={profileData.business_type}
                            onValueChange={(value) => setProfileData({ ...profileData, business_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="New">New</SelectItem>
                              <SelectItem value="Existing">Existing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="estimated_opening_date">Estimated Opening Date</Label>
                        <Input
                          id="estimated_opening_date"
                          type="date"
                          value={profileData.estimated_opening_date}
                          onChange={(e) => setProfileData({ ...profileData, estimated_opening_date: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <div className="pt-4 flex justify-end">
                    <Button onClick={handleUpdateProfile} disabled={updatingProfile} className="w-full md:w-auto">
                      <Save className="h-4 w-4 mr-2" />
                      {updatingProfile ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Lock className="h-4 w-4 mr-2" />
                        Update Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Password</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="current-password">Current Password</Label>
                          <Input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-password">New Password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password (min 8 characters)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowPasswordDialog(false)
                              setCurrentPassword("")
                              setNewPassword("")
                              setConfirmPassword("")
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleUpdatePassword}
                            disabled={updatingPassword}
                          >
                            {updatingPassword ? "Updating..." : "Update Password"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Order History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-4">No orders yet</p>
                  <Link href="/shop">
                    <Button>Start Shopping</Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.order_id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <Link href={`/orders/${order.order_id}`} className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  Order #{order.order_id}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Ordered Date: {new Date(order.date_added).toLocaleDateString('en-GB')}
                                </p>
                                {order.item_count && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-bold">
                                  ${(parseFloat(String(order.total || 0))).toFixed(2)}
                                </p>
                                <p className={`text-sm ${order.order_status === 0 ? 'text-red-600' :
                                  order.order_status === 2 ? 'text-green-600' :
                                    order.order_status === 1 ? 'text-yellow-600' :
                                      'text-gray-600'
                                  }`}>
                                  {getStatusText(order.order_status)}
                                </p>
                              </div>
                            </div>
                          </Link>
                          <div className="flex flex-col gap-2 ml-4">
                            <Link href={`/orders/${order.order_id}/invoice`}>
                              <Button variant="outline" size="sm" className="w-full">
                                Invoice
                              </Button>
                            </Link>
                            {order.order_status === 1 && (
                              <Button
                                onClick={(e) => {
                                  e.preventDefault()
                                  router.push(`/payment?order_id=${order.order_id}`)
                                }}
                                className="bg-primary hover:bg-primary/90"
                                size="sm"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Payment
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                My Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-4">No active subscriptions</p>
                  <Link href="/shop?purchaseType=subscription">
                    <Button>Browse Subscriptions</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((subscription) => (
                    <div
                      key={subscription.order_id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-bold">
                              Subscription #{subscription.order_id}
                            </h3>
                            <Badge
                              className={`w-fit px-4 py-1 text-sm ${isSubscriptionActive(subscription)
                                ? "bg-[#F97316] hover:bg-[#EA580C] text-white border-none"
                                : "bg-gray-100 text-gray-800"
                                }`}
                            >
                              {isSubscriptionActive(subscription)
                                ? "Active"
                                : "Inactive"}
                            </Badge>
                          </div>

                          {/* Desktop Buttons (Right Side) */}
                          <div className="hidden md:flex items-center gap-2">
                            {(subscription.order_status === 2 || subscription.order_status === 5) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleRenewClick(subscription)}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Re Order
                              </Button>
                            )}
                            {(subscription.order_status === 1 || subscription.order_status === 7) && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCancelSubscription(subscription.order_id)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex-1">
                          {subscription.products && subscription.products.length > 0 && (
                            <div className="text-sm text-gray-600 mb-2">
                              {subscription.products.map((product: any, idx: number) => (
                                <span key={idx} className="block font-medium text-black">
                                  {product.product_name} x{product.quantity}
                                </span>
                              ))}
                            </div>
                          )}
                          {subscription.standing_order && (
                            <p className="text-sm text-gray-600 mb-2">
                              Frequency: {Math.round(subscription.standing_order / 7)} Weeks
                            </p>
                          )}
                          {subscription.delivery_date_time && (
                            <p className="text-sm text-gray-600 mb-2">
                              Next Delivery: {new Date(subscription.delivery_date_time).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}
                            </p>
                          )}
                          <p className="font-bold text-lg mb-4">
                            ${(parseFloat(subscription.order_total || '0')).toFixed(2)}
                          </p>

                          {/* Mobile Buttons (Bottom) */}
                          <div className="flex md:hidden items-center gap-2">
                            {/* Renew button — shown when subscription is Inactive (paid/completed) */}
                            {(subscription.order_status === 2 || subscription.order_status === 5) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleRenewClick(subscription)}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Re Order
                              </Button>
                            )}
                            {/* Cancel button — shown when subscription is Active */}
                            {(subscription.order_status === 1 || subscription.order_status === 7) && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCancelSubscription(subscription.order_id)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={!!subscriptionToRenew} onOpenChange={(open) => !open && setSubscriptionToRenew(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
            <DialogDescription>
              Re-ordering this subscription will add the items to your cart for checkout. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionToRenew(null)}>Cancel</Button>
            <Button onClick={performSubscriptionRenewal} className="bg-[#031881]">Proceed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!subscriptionIdToCancel} onOpenChange={(open) => !open && setSubscriptionIdToCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this subscription? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionIdToCancel(null)}>Keep Subscription</Button>
            <Button onClick={performCancellation} variant="destructive">Yes, Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelSuccess} onOpenChange={setShowCancelSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription Cancelled</DialogTitle>
            <DialogDescription>
              Your subscription has been successfully cancelled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowCancelSuccess(false)} className="bg-[#031881]">OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    }>
      <AccountContent />
    </Suspense>
  )
}


