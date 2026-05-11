
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useCartStore, generateCartItemId } from "@/store/cart"
import { useAuthStore } from "@/store/auth"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Minus, Plus, Trash2, ShoppingCart, X, Upload, Tag, Check, XCircle, ChevronDown, ChevronUp, Gift, CreditCard, FileText, CheckCircle } from "lucide-react"
import { getProductImageUrl } from "@/lib/product-utils"
import { Textarea } from "@/components/ui/textarea"

interface Product {
  product_id: number
  product_name: string
  product_price: string
  user_price?: string
  retail_price?: string
  product_image?: string
  premium_price_discounted?: string
  product_price_premium?: string
  categories?: Array<{ category_id: number; category_name: string }>
}

interface CustomerDetails {
  firstname?: string
  lastname?: string
  telephone?: string
  address_line1?: string
  address_line2?: string
  suburb?: string
  state?: string
  postal_code?: string
  email?: string
}

interface Coupon {
  code: string
  description: string
  type: 'percentage' | 'fixed'
  value: number
  valid_from: string | null
  valid_until: string | null
  minimum_order?: number
  maximum_discount?: number
}

interface ValidatedCoupon {
  valid: boolean
  message?: string
  coupon?: {
    code: string
    name: string
    type: 'percentage' | 'fixed'
    value: number
    discount_amount: number
    minimum_order?: number
    maximum_discount?: number
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, getTotalPrice, getItemPrice, addItem, clearCart, updateItemsPrices } = useCartStore()
  const { isAuthenticated, user, customer, checkAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [shippingMethod, setShippingMethod] = useState(() => {
    try { const v = typeof window !== 'undefined' ? sessionStorage.getItem('checkout_shippingMethod') : null; return v || "standard"; } catch { return "standard"; }
  })
  const [shipToDifferentAddress, setShipToDifferentAddress] = useState(() => {
    try { const v = typeof window !== 'undefined' ? sessionStorage.getItem('checkout_shipDiff') : null; return v === 'true'; } catch { return false; }
  })
  const [subscriptionFrequency, setSubscriptionFrequency] = useState("One Time")
  const [deliveryStartDate, setDeliveryStartDate] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState(() => {
    try { const v = typeof window !== 'undefined' ? sessionStorage.getItem('checkout_deliveryNotes') : null; return v || ""; } catch { return ""; }
  })
  // const [deliveryDateTime, setDeliveryDateTime] = useState("")
  const [deliveryNotesImage, setDeliveryNotesImage] = useState<File | null>(null)
  const [deliveryNotesImagePreview, setDeliveryNotesImagePreview] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isFetchingUserDetails, setIsFetchingUserDetails] = useState(false)
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null)

  // Coupon states
  const [couponCode, setCouponCode] = useState("")
  const [validatedCoupon, setValidatedCoupon] = useState<ValidatedCoupon | null>(null)
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<ValidatedCoupon['coupon'] | null>(null)
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])
  const [showAvailableCoupons, setShowAvailableCoupons] = useState(false)
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false)
  const [paymentAction, setPaymentAction] = useState<'card' | 'invoice'>('card')
  const paymentActionRef = useRef<'card' | 'invoice'>('card') // Ref for sync access in handlePlaceOrder
  const initialLoadCompleteRef = useRef(false) // Prevents premature redirect before verifyAuth finishes
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [confirmedOrderIds, setConfirmedOrderIds] = useState<string[]>([])
  const [isOrderPlaced, setIsOrderPlaced] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isValidatingEmail, setIsValidatingEmail] = useState(false)

  const checkEmailRegistration = async (email: string) => {
    if (!email || isAuthenticated) return
    try {
      setIsValidatingEmail(true)
      const response = await api.get(`/store/auth/check-email?email=${encodeURIComponent(email)}`)
      if (response.data.registered) {
        setEmailError(response.data.message)
      } else {
        setEmailError(null)
      }
    } catch (error) {
      console.error("Failed to check email:", error)
    } finally {
      setIsValidatingEmail(false)
    }
  }

  const defaultFormData = {
    firstName: "",
    lastName: "",
    phone: "",
    country: "Australia",
    streetAddress: "",
    apartment: "",
    suburb: "",
    state: "",
    postcode: "",
    email: "",
  }

  const getSessionFormData = (key: string) => {
    try {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem(key) : null
      if (saved) return JSON.parse(saved)
    } catch {}
    return null
  }

  const [billingData, setBillingData] = useState(() => getSessionFormData('checkout_billing') || { ...defaultFormData })

  const [shippingData, setShippingData] = useState(() => getSessionFormData('checkout_shipping') || { ...defaultFormData })

  // Persist form data to sessionStorage on every change
  useEffect(() => {
    sessionStorage.setItem('checkout_billing', JSON.stringify(billingData))
  }, [billingData])

  useEffect(() => {
    sessionStorage.setItem('checkout_shipping', JSON.stringify(shippingData))
  }, [shippingData])

  useEffect(() => {
    sessionStorage.setItem('checkout_shippingMethod', shippingMethod)
  }, [shippingMethod])

  useEffect(() => {
    sessionStorage.setItem('checkout_shipDiff', String(shipToDifferentAddress))
  }, [shipToDifferentAddress])

  useEffect(() => {
    sessionStorage.setItem('checkout_deliveryNotes', deliveryNotes)
  }, [deliveryNotes])



 useEffect(() => {
    // Wait for both React hydration and Zustand cart store rehydration
    if (useCartStore.persist.hasHydrated()) {
      setIsHydrated(true)
    } else {
      const unsub = useCartStore.persist.onFinishHydration(() => {
        setIsHydrated(true)
        unsub()
      })
      return () => unsub()
    }
  }, [])

  // Function to fetch user profile from API
  const fetchUserProfile = async (): Promise<CustomerDetails | null> => {
    try {
      setIsFetchingUserDetails(true)

      const response = await api.get("/store/auth/me")
      const userData = response.data.user
      const customerData = response.data.customer

      if (userData) {
        // Parse name from customer data if available, otherwise fallback to user username
        let firstName = customerData?.firstname?.trim() || "";
        let lastName = customerData?.lastname?.trim() || "";

        if (!firstName && userData.username) {
          const nameParts = (userData.username || "").trim().split(/\s+/);
          firstName = nameParts[0] || "";
          lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
        }

        // Deduplicate if they are exactly the same (bug from registration)
        if (firstName && lastName && firstName.toLowerCase() === lastName.toLowerCase()) {
          lastName = "";
        }

        // Parse address from customer_address if individual fields are missing
        let address1 = customerData?.address_line1 || "";
        let suburb = customerData?.suburb || "";
        let state = customerData?.state || "";
        let postalCode = customerData?.postal_code || "";

        if (!address1 && !suburb && !state && !postalCode && customerData?.customer_address) {
          const parts = customerData.customer_address.split(",").map((p: string) => p.trim());
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
            address1 = customerData.customer_address;
          }
        }

        return {
          firstname: firstName,
          lastname: lastName,
          telephone: customerData?.telephone || "",
          address_line1: address1,
          address_line2: customerData?.address_line2 || "",
          suburb: suburb,
          state: state,
          postal_code: postalCode,
          email: customerData?.email || userData.email || "",
        }
      }

      return null
    } catch (error: any) {
      console.error("Failed to fetch user profile:", error)

      try {
        if (user?.email) {
          const checkResponse = await api.get(`/store/auth/check-user/${encodeURIComponent(user.email)}`)
          const existingUser = checkResponse.data

          if (existingUser.user) {
            // Parse name
            let firstName = existingUser.customer?.firstname?.trim() || "";
            let lastName = existingUser.customer?.lastname?.trim() || "";

            if (!firstName && existingUser.user.username) {
              const nameParts = (existingUser.user.username || "").trim().split(/\s+/);
              firstName = nameParts[0] || "";
              lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
            }

            // Deduplicate
            if (firstName && lastName && firstName.toLowerCase() === lastName.toLowerCase()) {
              lastName = "";
            }

            // Parse address
            let address1 = existingUser.customer?.address_line1 || "";
            let suburb = existingUser.customer?.suburb || "";
            let state = existingUser.customer?.state || "";
            let postalCode = existingUser.customer?.postal_code || "";

            if (!address1 && !suburb && !state && !postalCode && existingUser.customer?.customer_address) {
              const parts = existingUser.customer.customer_address.split(",").map((p: string) => p.trim());
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
                address1 = existingUser.customer.customer_address;
              }
            }

            return {
              firstname: firstName,
              lastname: lastName,
              telephone: existingUser.customer?.telephone || "",
              address_line1: address1,
              address_line2: existingUser.customer?.address_line2 || "",
              suburb: suburb,
              state: state,
              postal_code: postalCode,
              email: existingUser.customer?.email || existingUser.user.email || user.email,
            }
          }
        }
      } catch (checkError) {
        console.error("Check user endpoint also failed:", checkError)
      }

      return null
    } finally {
      setIsFetchingUserDetails(false)
    }
  }

  const populateBillingFromUser = async () => {
    const authState = useAuthStore.getState()
    if (!authState.isAuthenticated || !authState.user) return

    try {
      setIsFetchingUserDetails(true)

      await checkAuth()
      const currentAuthState = useAuthStore.getState()
      const currentUser = currentAuthState.user

      if (!currentUser) return

      const fetchedDetails = await fetchUserProfile()

      if (fetchedDetails) {
        setCustomerDetails(fetchedDetails)

        // Only overwrite form data from API if user hasn't already filled the form
        const savedBilling = getSessionFormData('checkout_billing')
        const hasUserFilledForm = savedBilling && Object.values(savedBilling).some((v: any) => v && v !== 'Australia')

        if (!hasUserFilledForm) {
          const newBillingData = {
            firstName: fetchedDetails.firstname || "",
            lastName: fetchedDetails.lastname || "",
            phone: fetchedDetails.telephone || "",
            country: "Australia",
            streetAddress: fetchedDetails.address_line1 || "",
            apartment: fetchedDetails.address_line2 || "",
            suburb: fetchedDetails.suburb || "",
            state: fetchedDetails.state || "",
            postcode: fetchedDetails.postal_code || "",
            email: fetchedDetails.email || currentUser.email || "",
          }

          setBillingData(newBillingData)

          setShippingData({
            ...newBillingData,
            firstName: newBillingData.firstName,
            lastName: newBillingData.lastName,
          })
        }
      } else {
        const nameParts = (currentUser.username || "").trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        let lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

        // Deduplicate
        if (firstName && lastName && firstName.toLowerCase() === lastName.toLowerCase()) {
          lastName = "";
        }

        const newBillingData = {
          ...billingData,
          email: currentUser.email || "",
          firstName: firstName,
          lastName: lastName,
        }
        setBillingData(newBillingData)
      }

    } catch (error) {
      console.error("Failed to populate billing from user:", error)

      if (authState.user) {
        const nameParts = (authState.user.username || "").trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        let lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

        // Deduplicate
        if (firstName && lastName && firstName.toLowerCase() === lastName.toLowerCase()) {
          lastName = "";
        }

        const newBillingData = {
          ...billingData,
          email: authState.user.email || "",
          firstName: firstName,
          lastName: lastName,
        }
        setBillingData(newBillingData)
      }
    } finally {
      setIsFetchingUserDetails(false)
    }
  }

  // Fetch available coupons
  const fetchAvailableCoupons = async () => {
    try {
      setIsLoadingCoupons(true)
      const response = await api.get("/store/coupons")
      console.log("Coupons API response:", response.data)
      setAvailableCoupons(response.data.coupons || [])
    } catch (error: any) {
      console.error("Failed to fetch coupons:", error)
      toast.error("Failed to load available coupons")
    } finally {
      setIsLoadingCoupons(false)
    }
  }

  useEffect(() => {
    const verifyAuth = async () => {
      // Wait for cart store to finish rehydrating from localStorage
      if (!useCartStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useCartStore.persist.onFinishHydration(() => {
            unsub()
            resolve()
          })
        })
      }

      // First, try to restore auth if possible
      try {
        if (!isAuthenticated) {
          await checkAuth()
        }
      } catch (error) {
        // Silent failure - proceed as guest
        console.log("Proceeding as guest due to checkAuth error:", error)
      }

      // Re-read items from store after hydration
      const currentItems = useCartStore.getState().items
      if (currentItems.length === 0) {
        router.push("/cart")
        return
      }

      // Mark initial load as complete - now the reactive useEffect can safely redirect
      // if the user empties their cart while on this page
      initialLoadCompleteRef.current = true

      fetchRelatedProducts()
      if (useAuthStore.getState().isAuthenticated) {
        fetchAvailableCoupons()
      }
      await populateBillingFromUser()
    }

    verifyAuth()
  }, [])

  // Refresh cart prices when authenticated to ensure correct pricing (e.g. Wholesale)
  // Refresh cart prices when authenticated to ensure correct pricing (e.g. Wholesale)
  useEffect(() => {
    const refreshPrices = async () => {
      if (!isAuthenticated || !isHydrated) return

      const currentItems = useCartStore.getState().items
      if (currentItems.length === 0) return

      // Use current auth store state to ensure we have the latest customer details
      const currentAuthState = useAuthStore.getState()
      const currentCustomer = currentAuthState.customer
      const customerType = currentCustomer?.customer_type || ''
      const isWholesale = customerType && (customerType.includes('Wholesale') || customerType.includes('Wholesaler') || currentCustomer.wholesale_type !== null)
      const isPremium =
        isWholesale &&
        (currentCustomer.wholesale_type === "premium" ||
          currentCustomer.service_type === "Full Service Wholesaler" ||
          currentCustomer.service_type === "Full Service");

      try {
        // Collect unique product IDs to fetch details efficiently
        const productIds = Array.from(new Set(currentItems.map(item => item.product_id)))
        const productsMap: Record<number, any> = {}

        // Fetch all product details
        await Promise.all(productIds.map(async (id) => {
          try {
            const response = await api.get(`/store/products/${id}`)
            productsMap[id] = response.data.product
          } catch (err) {
            console.error(`Failed to fetch product ${id} for price refresh`, err)
          }
        }))

        // Iterate through each cart item and recalculate its price
        currentItems.forEach(item => {
          const product = productsMap[item.product_id]
          if (!product) return

          // Skip price refresh for subscription items that already have a valid price.
          // These come from the subscription renewal flow where price is pre-set from
          // subscription.products[].price and should not be overwritten by the product API.
          const existingPrice = parseFloat(item.product_price || "0")
          if (item.subscription && existingPrice > 0) return

          // 1. Determine Base Price based on Role
          let basePrice = 0
          if (isPremium) {
            const p1 = parseFloat(product.premium_price_discounted || "0");
            const p2 = parseFloat(product.product_price_premium || "0");
            basePrice = p1 > 0 ? p1 : p2;
          } else if (isWholesale) {
            const wp = parseFloat((product as any).wholesale_price || "0");
            basePrice = wp > 0 ? wp : parseFloat(product.retail_price || product.product_price || "0");
          } else {
            basePrice = Number.parseFloat(product.user_price || product.product_price || "0")
          }

          // 2. Recalculate Options and adjust Base Price if override applies
          let finalBasePrice = basePrice
          const newOptions = (item.options || []).map(itemOption => {
            let deltaPrice = 0

            // Find matching option in product data
            if (product.options) {
              const productOption = product.options.find((o: any) => o.option_id === itemOption.option_id)
              if (productOption) {
                // Find matching value
                // Note: itemOption.option_value_id is likely the specific ID we need
                const productValue = productOption.values.find((v: any) => v.option_value_id === itemOption.option_value_id)

                if (productValue) {
                  // Check for overrides
                  let overridePrice = 0

                  if (isPremium) {
                    overridePrice = Number.parseFloat(productValue.wholesale_price_premium || "0")
                  } else if (isWholesale) {
                    overridePrice = Number.parseFloat(productValue.wholesale_price || "0")
                  } else {
                    overridePrice = Number.parseFloat(productValue.standard_price || "0")
                  }

                  if (overridePrice > 0) {
                    if (finalBasePrice === 0) {
                      finalBasePrice = overridePrice
                      deltaPrice = 0 // Included in base
                    } else {
                      deltaPrice = overridePrice
                    }
                  } else {
                    // Standard delta price logic
                    if (productValue.has_discount && productValue.discounted_option_price) {
                      deltaPrice = Number.parseFloat(productValue.discounted_option_price)
                    } else {
                      deltaPrice = Number.parseFloat(productValue.product_option_price || "0")
                    }
                  }

                  return {
                    ...itemOption,
                    option_price: deltaPrice.toString(),
                    // Update prefix if needed, though usually standard adds positive value
                    option_price_prefix: '+'
                  }
                }
              }
            }

            // Fallback for options not found (shouldn't happen often)
            return itemOption
          })

          // 3. Update the item in the store
          const cartStore = useCartStore.getState()
          if (cartStore.updateCartItem) {
            const cartItemId = item.cart_item_id || generateCartItemId(item.product_id, item.options, item.subscription)
            cartStore.updateCartItem(cartItemId, {
              product_price: finalBasePrice.toString(),
              options: newOptions
            })
          }
        })

        console.log("Refreshed cart prices and options successfully")

      } catch (error) {
        console.error("Failed to refresh cart prices:", error)
      }
    }

    refreshPrices()
  }, [isAuthenticated, isHydrated, customer])

  useEffect(() => {
    // Only redirect if verifyAuth has already confirmed the cart had items initially.
    // This prevents premature redirects during hydration/auth state transitions
    // but still handles the case where user removes all items on this page.
    if (items.length === 0 && isHydrated && !isOrderPlaced && initialLoadCompleteRef.current) {
      router.push("/cart")
    }
  }, [items.length, router, isHydrated, isOrderPlaced])

  // Pre-fill subscription details from cart items
  useEffect(() => {
    const subscriptionItem = items.find(item => item.subscription);
    if (subscriptionItem && subscriptionItem.subscription) {
      setSubscriptionFrequency(subscriptionItem.subscription.frequency);
      if (subscriptionItem.subscription.startDate) {
        setDeliveryStartDate(subscriptionItem.subscription.startDate);
      }
    } else {
      setSubscriptionFrequency("One Time");
    }
  }, [items]);

  const fetchRelatedProducts = async () => {
    try {
      const response = await api.get("/store/products/featured", { params: { limit: 5 } })
      const products = response.data.products || []

      const mappedProducts = products.map((product: any) => {
        const customerType = customer?.customer_type || ''
        const isWholesale = customerType && (customerType.includes('Wholesale') || customerType.includes('Wholesaler') || customer.wholesale_type !== null)
        const isPremium =
          isWholesale &&
          (customer.wholesale_type === "premium" ||
            customer.service_type === "Full Service Wholesaler" ||
            customer.service_type === "Full Service");

        let displayPrice = product.retail_price || product.product_price

        if (isPremium) {
          const p1 = parseFloat(product.premium_price_discounted || "0");
          const p2 = parseFloat(product.product_price_premium || "0");
          displayPrice = p1 > 0 ? p1 : p2;
        } else if (isWholesale) {
          const wp = parseFloat((product as any).wholesale_price || "0");
          displayPrice = wp > 0 ? wp : (product.retail_price || product.product_price);
        } else {
          displayPrice = product.user_price || product.retail_price || product.product_price
        }

        return {
          ...product,
          product_price: displayPrice,
          retail_price: product.retail_price || product.product_price,
          user_price: product.user_price
        }
      })

      setRelatedProducts(mappedProducts)
    } catch (error: any) {
      console.error("Failed to fetch related products:", error)
      setRelatedProducts([])
    }
  }

  // Validate coupon function
  const validateCoupon = async (code?: string) => {
    const couponToValidate = code || couponCode

    if (!couponToValidate.trim()) {
      toast.error("Please enter a coupon code")
      return
    }

    setIsValidatingCoupon(true)
    try {
      const subtotal = getTotalPrice()
      console.log("Validating coupon:", couponToValidate, "with subtotal:", subtotal)
      const response = await api.post("/store/coupons/validate", {
        coupon_code: couponToValidate,
        order_total: subtotal
      })

      console.log("Coupon validation response:", response.data)
      // setValidatedCoupon(response.data) // No longer needed for intermediate step if we auto-apply

      if (response.data.valid && response.data.coupon) {
        // Auto-apply immediately
        setAppliedCoupon(response.data.coupon)
        setCouponCode("")
        setValidatedCoupon(null)
        toast.success(`Coupon "${response.data.coupon.code}" applied successfully!`)
      } else {
        setValidatedCoupon(response.data) // Keep for error state if needed, though we use toast mostly
        toast.error(response.data.message || "Invalid coupon code")
      }
    } catch (error: any) {
      console.error("Coupon validation error:", error)
      const errorData = {
        valid: false,
        message: error.response?.data?.message || "Invalid coupon code or expired"
      }
      setValidatedCoupon(errorData)
      toast.error(errorData.message)
    } finally {
      setIsValidatingCoupon(false)
    }
  }

  // applyCoupon function removed as it is now integrated into validateCoupon

  // Remove coupon function
  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode("")
    setValidatedCoupon(null)
    toast.info("Coupon removed")
  }

  // Handle coupon input change
  const handleCouponInputChange = (value: string) => {
    setCouponCode(value.toUpperCase())
    // Clear validation if user starts typing
    if (validatedCoupon) {
      setValidatedCoupon(null)
    }
  }

  // Handle apply coupon from available coupons list
  const handleApplyAvailableCoupon = (coupon: Coupon) => {
    setCouponCode(coupon.code)
    validateCoupon(coupon.code)
  }

  const calculateTotal = () => {
    if (!isHydrated) {
      return {
        subtotal: 0,
        wholesaleDiscount: 0,
        couponDiscount: 0,
        afterWholesaleDiscount: 0,
        afterDiscount: 0,
        shippingFee: 0,
        gst: 0,
        total: 0,
      }
    }

    let subtotal = getTotalPrice()

    const wholesaleDiscount = 0
    const afterWholesaleDiscount = subtotal

    // Calculate coupon discount
    let couponDiscount = 0
    if (appliedCoupon) {
      const value = Number(appliedCoupon.value) || 0;
      const type = (appliedCoupon.type || '').toLowerCase(); // Handle case sensitivity

      // Calculate subtotals for mixed cart check
      const oneTimeItems = items.filter(item => !item.subscription);
      const subscriptionItems = items.filter(item => item.subscription);
      const hasOneTime = oneTimeItems.length > 0;
      const hasSubscription = subscriptionItems.length > 0;

      let applicableSubtotal = subtotal;

      // If mixed cart, restrict coupon application to one-time items only
      if (hasOneTime && hasSubscription) {
        applicableSubtotal = oneTimeItems.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0);
      }

      if (type === 'percentage') {
        couponDiscount = (applicableSubtotal * value) / 100
        // Apply maximum discount if specified
        if (appliedCoupon.maximum_discount && couponDiscount > appliedCoupon.maximum_discount) {
          couponDiscount = appliedCoupon.maximum_discount
        }
      } else {
        couponDiscount = value
      }
      // Don't allow discount to exceed applicable subtotal
      couponDiscount = Math.min(couponDiscount, applicableSubtotal)
    }

    const afterDiscount = Math.max(0, afterWholesaleDiscount - couponDiscount)
    const shippingFee = shippingMethod === "pickup" ? 0 : 10

    // Calculate 10% GST only for items in Packaging or Ancillaries
    let taxableAmount = 0;
    const taxableCategories = ["packaging", "ancillaries"];

    items.forEach(item => {
      const category = item.category?.toLowerCase().trim() || "";
      if (taxableCategories.includes(category)) {
        taxableAmount += getItemPrice(item) * item.quantity;
      }
    });

    // Apply proportional coupon discount to taxable amount if any
    if (couponDiscount > 0 && subtotal > 0) {
      taxableAmount = taxableAmount * (1 - (couponDiscount / subtotal));
    }

    const gst = taxableAmount * 0.1
    const total = afterDiscount + shippingFee

    return {
      subtotal,
      wholesaleDiscount,
      couponDiscount,
      afterWholesaleDiscount,
      afterDiscount,
      shippingFee,
      gst,
      total,
    }
  }

  const handleAddToCart = (product: Product) => {
    if (!isHydrated) {
      toast.error("Please wait while cart is loading...")
      return
    }

    try {
      const customerType = customer?.customer_type || ''
      const isWholesale = customerType && (customerType.includes('Wholesale') || customerType.includes('Wholesaler') || customer.wholesale_type !== null)
      const isPremium =
        isWholesale &&
        (customer.wholesale_type === "premium" ||
          customer.service_type === "Full Service Wholesaler" ||
          customer.service_type === "Full Service");

      let priceToUse = product.product_price

      if (isPremium) {
        const p1 = parseFloat((product as any).premium_price_discounted || "0");
        const p2 = parseFloat((product as any).product_price_premium || "0");
        priceToUse = (p1 > 0 ? p1 : p2).toString();
      } else if (isWholesale) {
        const wp = parseFloat((product as any).wholesale_price || "0");
        priceToUse = wp > 0 ? wp.toString() : (product.retail_price || product.product_price);
      } else {
        priceToUse = product.user_price || product.retail_price || product.product_price
      }

      const productToAdd = {
        product_id: product.product_id,
        product_name: product.product_name,
        product_price: priceToUse,
        product_image: getProductImageUrl(product),
        quantity: 1,
        options: [],
        category: product.categories && product.categories.length > 0 ? product.categories[0].category_name : undefined,
      }

      addItem(productToAdd)
      toast.success(`${product.product_name} added to cart!`)
    } catch (error) {
      console.error("Error adding item to cart:", error)
      toast.error("Failed to add item to cart. Please try again.")
    }
  }

  const getDisplayPrice = (product: Product) => {
    const customerType = customer?.customer_type || ''
    const isWholesale = customerType && (customerType.includes('Wholesale') || customerType.includes('Wholesaler') || customer.wholesale_type !== null)
    const isPremium =
      isWholesale &&
      (customer.wholesale_type === "premium" ||
        customer.service_type === "Full Service Wholesaler" ||
        customer.service_type === "Full Service");

    if (isPremium) {
      const p1 = parseFloat((product as any).premium_price_discounted || "0");
      const p2 = parseFloat((product as any).product_price_premium || "0");
      return p1 > 0 ? p1 : p2;
    } else if (isWholesale) {
      const wp = parseFloat((product as any).wholesale_price || "0");
      return wp > 0 ? wp : (product.retail_price || product.product_price);
    } else {
      return product.user_price || product.retail_price || product.product_price
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB")
        return
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file")
        return
      }
      setDeliveryNotesImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setDeliveryNotesImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setDeliveryNotesImage(null)
    setDeliveryNotesImagePreview(null)
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    // Proceed with guest checkout if not authenticated
    // if (!isAuthenticated) {
    //   toast.error("Please login to place an order")
    //   router.push("/auth/login?redirect=/checkout")
    //   return
    // }

    // Validate State fields manually as Select components might not trigger native required validation
    if (!billingData.state) {
      toast.error("Please select a valid state for billing address")
      return
    }

    if (shipToDifferentAddress && !shippingData.state) {
      toast.error("Please select a valid state for shipping address")
      return
    }

    if (emailError) {
      toast.error(emailError)
      setLoading(false)
      return
    }

    setLoading(true)


    try {
      // Split items into One-Time and Subscription
      const oneTimeItems = items.filter(item => !item.subscription);
      const subscriptionItems = items.filter(item => item.subscription);

      // Calculate subtotals for allocation
      const getItemsSubtotal = (groupItems: any[]) => groupItems.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0);
      const subtotalOneTime = getItemsSubtotal(oneTimeItems);
      const subtotalSubscription = getItemsSubtotal(subscriptionItems);
      const totalCartSubtotal = subtotalOneTime + subtotalSubscription;

      // Prepare allocated coupons
      let couponOneTime = appliedCoupon;
      let couponSubscription = appliedCoupon;

      // Check if both types of orders exist
      const hasOneTime = oneTimeItems.length > 0;
      const hasSubscription = subscriptionItems.length > 0;

      if (hasOneTime && hasSubscription) {
        console.log("Mixed cart detected. Restricting coupon to one-time items.", appliedCoupon);
        // If both exist, apply coupon ONLY to one-time items
        couponOneTime = appliedCoupon;
        couponSubscription = null;
      }

      console.log("Coupon allocation finalized:", { couponOneTime, couponSubscription });

      const ordersToCreate = [];

      if (oneTimeItems.length > 0) {
        ordersToCreate.push({
          type: 'onetime',
          items: oneTimeItems,
          frequency: 'One Time',
          startDate: null,
          coupon: couponOneTime
        });
      }

      if (subscriptionItems.length > 0) {
        // Use the frequency/date from the First subscription item
        const freq = subscriptionItems[0].subscription?.frequency || subscriptionFrequency;
        const start = subscriptionItems[0].subscription?.startDate || deliveryStartDate;
        const time = subscriptionItems[0].subscription?.deliveryTime;

        ordersToCreate.push({
          type: 'subscription',
          items: subscriptionItems,
          frequency: freq,
          startDate: start,
          deliveryTime: time,
          coupon: couponSubscription
        });
      }

      // 1. Construct all order payloads (without creating them yet)
      const preparedOrders = [];
      let totalAmountToPay = 0;
      // We need to track the first order for shipping fee application logic
      let isFirstOrder = true;

      for (const orderGroup of ordersToCreate) {
        const orderItems = orderGroup.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.product_price,
          options: item.options || [],
        }))

        // Apply shipping only to the first order created in this batch to avoid double charging
        const applyShipping = isFirstOrder;
        isFirstOrder = false;

        const groupTotals = calculateOrderTotalsForGroup(orderGroup.items, applyShipping ? totals.shippingFee : 0, orderGroup.coupon);

        // Build delivery address
        const addressParts: string[] = []
        if (shipToDifferentAddress) {
          if (shippingData.streetAddress) addressParts.push(shippingData.streetAddress)
          if (shippingData.apartment) addressParts.push(shippingData.apartment)
          if (shippingData.suburb) addressParts.push(shippingData.suburb)
          if (shippingData.state) addressParts.push(shippingData.state)
          if (shippingData.postcode) addressParts.push(shippingData.postcode)
        } else {
          if (billingData.streetAddress) addressParts.push(billingData.streetAddress)
          if (billingData.apartment) addressParts.push(billingData.apartment)
          if (billingData.suburb) addressParts.push(billingData.suburb)
          if (billingData.state) addressParts.push(billingData.state)
          if (billingData.postcode) addressParts.push(billingData.postcode)
        }
        const deliveryAddress = addressParts.join(", ") || billingData.streetAddress || ""

        // Map frequency to days
        let standingOrder = 0;
        if (orderGroup.frequency === "2 Weeks") standingOrder = 14;
        if (orderGroup.frequency === "4 Weeks") standingOrder = 28;
        if (orderGroup.frequency === "8 Weeks") standingOrder = 56;

        const orderPayload: any = {
          items: orderItems,
          delivery_address: deliveryAddress,
          delivery_fee: groupTotals.shippingFee,
          payment_method: paymentActionRef.current === 'invoice' ? 'invoice' : 'card', // Use ref for sync value
          coupon_code: orderGroup.coupon?.code || undefined,
          coupon_discount: groupTotals.couponDiscount || 0,
          postcode: billingData.postcode,
          notes: deliveryNotes || null,
          standing_order: standingOrder,
          delivery_start_date: standingOrder > 0 && orderGroup.startDate ? `${orderGroup.startDate}T00:00:00.000Z` : null,
          next_delivery_date: standingOrder > 0 && orderGroup.startDate ? `${orderGroup.startDate}T00:00:00.000Z` : null,
          order_total: groupTotals.total,
          subtotal: groupTotals.subtotal,
          gst: groupTotals.gst,
          delivery_date_time: standingOrder > 0 && orderGroup.startDate
            ? `${orderGroup.startDate}T${orderGroup.deliveryTime || '00:00:00'}.000Z`
            : null,
          delivery_date: standingOrder > 0 && orderGroup.startDate
            ? orderGroup.startDate
            : null,
          telephone: billingData.phone,
          ...(!isAuthenticated ? {
            firstname: billingData.firstName,
            lastname: billingData.lastName,
            email: billingData.email
          } : {})
        }

        preparedOrders.push(orderPayload);
        totalAmountToPay += groupTotals.total;
      }

      // Handle "Pay Later / Invoice" Flow - LEGACY / EXISTING
      if (paymentActionRef.current === 'invoice') {
        const createdOrderIds: string[] = [];

        for (const orderPayload of preparedOrders) {
          console.log("Submitting invoice order payload:", orderPayload);
          const endpoint = isAuthenticated ? "/store/orders" : "/store/orders/guest";
          const response = await api.post(endpoint, orderPayload);
          createdOrderIds.push(response.data.order_id);

          // Handle Image Upload (only for first order if multiple)
          if (deliveryNotesImage && createdOrderIds.length === 1) {
            try {
              const formData = new FormData()
              formData.append("image", deliveryNotesImage)
              await api.post(`/store/orders/${response.data.order_id}/upload-image`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              })
            } catch (uploadError) {
              console.log("Image upload skipped (optional):", uploadError)
            }
          }
        }

        if (createdOrderIds.length > 0) {
          setIsOrderPlaced(true)
          clearCart()
          sessionStorage.removeItem('checkout_billing')
          sessionStorage.removeItem('checkout_shipping')
          sessionStorage.removeItem('checkout_shippingMethod')
          sessionStorage.removeItem('checkout_shipDiff')
          sessionStorage.removeItem('checkout_deliveryNotes')
          setConfirmedOrderIds(createdOrderIds)
          setShowSuccessModal(true)
        }

      }
      // Handle "Pay Now / Card" Flow - NEW FLOW
      else {
        // 1. Create Payment Intent for Cart Amount
        const emailToUse = isAuthenticated ? user?.email : billingData.email;
        console.log(`[CheckoutPage] Initiating payment intent for email: "${emailToUse}", isAuthenticated: ${isAuthenticated}`);
        
        const response = await api.post("/store/payment/create-intent-for-cart", {
          amount: totalAmountToPay,
          currency: 'aud', // Optional, likely default
          email: emailToUse,
          firstname: billingData.firstName,
          lastname: billingData.lastName,
          telephone: billingData.phone
        });

        const { client_secret, payment_intent_id } = response.data;

        // 2. Store Order Payloads and Intent Details in Session Storage
        // The payment page will read this, complete payment, then create orders
        sessionStorage.setItem('pending_orders', JSON.stringify(preparedOrders));
        sessionStorage.setItem('payment_intent_id', payment_intent_id);
        sessionStorage.setItem('client_secret', client_secret);

        // Also store image if needed? Images in session storage is bad.
        // We might need to upload image separately or skip for now. 
        // For now, let's assume the payment page might handle it or we lose it in this flow 
        // unless we upload it to a temp endpoint. 
        // Given constraints, we will proceed without complex image handling refactor.

        // 3. Redirect to Payment Page (client_secret passed via sessionStorage, not URL)
        router.push(`/payment?mode=intent&amount=${totalAmountToPay}`);
      }

    } catch (error: any) {
      console.error("Order processing error:", error)
      const errorMessage = error.response?.data?.message || error.message || "Failed to process order"
      if (!error.response || error.response.status < 500) {
        toast.error(errorMessage)
      } else {
        toast.error("An unexpected error occurred. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateOrderTotalsForGroup = (groupItems: any[], shippingFee: number, coupon: any) => {
    // Calculate subtotal for specific items
    const subtotal = groupItems.reduce((total, item) => {
      const itemPrice = getItemPrice(item)
      return total + itemPrice * item.quantity
    }, 0)

    let wholesaleDiscount = 0
    // Wholesale logic if needed... (simplified here as per current context)

    const afterWholesaleDiscount = subtotal - wholesaleDiscount

    let couponDiscount = 0
    if (coupon) {
      if (coupon.type === 'percentage') {
        couponDiscount = (subtotal * coupon.value) / 100
        if (coupon.maximum_discount && couponDiscount > coupon.maximum_discount) {
          couponDiscount = coupon.maximum_discount
        }
      } else {
        // Fixed amount. Using it fully on this group?
        // If we're calling this per group, fixed amount usage is tricky.
        // For now assuming percentage or small fixed. 
        // Or we could pass 'remainingCouponValue' but complex.
        // Simplified: apply fixed value if passed.
        couponDiscount = coupon.value
      }
      couponDiscount = Math.min(couponDiscount, subtotal)
    }

    const afterDiscount = Math.max(0, afterWholesaleDiscount - couponDiscount)

    // Calculate 10% GST only for items in Packaging or Ancillaries
    let taxableAmountGroup = 0;
    const taxableCategories = ["packaging", "ancillaries"];

    groupItems.forEach(item => {
      const category = item.category?.toLowerCase().trim() || "";
      if (taxableCategories.includes(category)) {
        taxableAmountGroup += getItemPrice(item) * item.quantity;
      }
    });

    // Apply proportional coupon discount to taxable amount if any
    if (couponDiscount > 0 && subtotal > 0) {
      taxableAmountGroup = taxableAmountGroup * (1 - (couponDiscount / subtotal));
    }

    const gst = taxableAmountGroup * 0.1
    const total = afterDiscount + shippingFee

    return {
      subtotal,
      wholesaleDiscount,
      couponDiscount,
      afterWholesaleDiscount,
      afterDiscount,
      shippingFee,
      gst,
      total,
    }
  }

  const totals = calculateTotal()

  // Show loading while hydrating or fetching user details
  if (!isHydrated || isFetchingUserDetails) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-white">
      {/* You May Also Like Section */}
      {/* {relatedProducts.length > 0 && (
        <section className="py-8 bg-white border-b">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">You may also like</h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {relatedProducts.map((product) => {
                const displayPrice = getDisplayPrice(product)
                return (
                  <Card key={product.product_id} className="min-w-[200px] flex-shrink-0">
                    <div className="relative aspect-square bg-gray-100">
                      {getProductImageUrl(product) ? (
                        <Image
                          src={getProductImageUrl(product)!}
                          alt={product.product_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-sm mb-1">{product.product_name}</h3>
                      <p className="text-sm text-gray-600 mb-2">${parseFloat(displayPrice).toFixed(2)}</p>
                      {product.user_price && product.retail_price && parseFloat(product.user_price) < parseFloat(product.retail_price) && (
                        <p className="text-xs text-gray-500 line-through mb-1">
                          ${parseFloat(product.retail_price).toFixed(2)}
                        </p>
                      )}
                      <Link href={`/shop/${product.product_id}`} className="w-full block">
                        <Button
                          size="sm"
                          className="w-full"
                          variant="outline"
                        >
                          View Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>
      )} */}

      {/* Guest Sign In Prompt */}
      {!isAuthenticated && isHydrated && (
        <div className="container mx-auto px-6 mt-8">
          <div className="bg-[#FFF5F5] border border-[#FFE3E3] rounded-xl p-4 md:p-5 text-center shadow-sm">
            <p className="text-gray-700 text-sm md:text-base">
              Already have an account?{" "}
              <Link href="/auth/login?redirect=/checkout" className="text-[#2563eb] font-bold hover:underline">
                Sign In
              </Link>
              <span className="mx-4 text-gray-400">|</span>
              New here?{" "}
              <Link href="/auth/register?redirect=/checkout" className="text-[] font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Main Checkout Content */}
      <section className="py-8">
        <div className="container mx-auto px-6">
          <form onSubmit={handlePlaceOrder}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column - Billing and Shipping */}
              <div className="lg:col-span-2 space-y-6 order-1 lg:order-1">
                {/* Billing Details */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Billing Details</h2>
                      {isAuthenticated && (
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                              Using your account details
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={populateBillingFromUser}
                            disabled={isFetchingUserDetails}
                          >
                            {isFetchingUserDetails ? "Refreshing..." : "Refresh Details"}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="billing-firstname">First Name <span className="text-red-500">*</span></Label>
                          <Input
                            id="billing-firstname"
                            value={billingData.firstName}
                            onChange={(e) => setBillingData({ ...billingData, firstName: e.target.value })}
                            required
                            placeholder="Enter your first name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="billing-lastname">Last Name</Label>
                          <Input
                            id="billing-lastname"
                            value={billingData.lastName}
                            onChange={(e) => setBillingData({ ...billingData, lastName: e.target.value })}
                            placeholder="Enter your last name"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="billing-phone">Phone <span className="text-red-500">*</span></Label>
                        <Input
                          id="billing-phone"
                          type="tel"
                          value={billingData.phone}
                          onChange={(e) => setBillingData({ ...billingData, phone: e.target.value })}
                          required
                          placeholder="Enter your phone number"
                        />
                      </div>
 <div>
                        <Label htmlFor="billing-email">Email Address <span className="text-red-500">*</span></Label>
                        <Input
                          id="billing-email"
                          type="email"
                          value={billingData.email}
                          onChange={(e) => {
                            setBillingData({ ...billingData, email: e.target.value })
                            if (emailError) setEmailError(null)
                          }}
                          onBlur={(e) => checkEmailRegistration(e.target.value)}
                          required
                          placeholder="Enter your email address"
                          className={emailError ? "border-red-500 focus-visible:ring-red-500" : ""}
                        />
                        {emailError && (
                          <p className="text-xs text-red-500 mt-2 font-medium">{emailError}</p>
                        )}
                      </div>
                      {/* <div>
                        <Label htmlFor="billing-country">Country Region</Label>
                        <Select value={billingData.country} onValueChange={(value) => setBillingData({ ...billingData, country: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Australia">Australia</SelectItem>
                            <SelectItem value="New Zealand">New Zealand</SelectItem>
                          </SelectContent>
                        </Select>
                      </div> */}

                      <div>
                        <Label htmlFor="billing-street">House number & street name <span className="text-red-500">*</span></Label>
                        <Input
                          id="billing-street"
                          value={billingData.streetAddress}
                          onChange={(e) => setBillingData({ ...billingData, streetAddress: e.target.value })}
                          required
                          placeholder="Enter your street address"
                        />
                      </div>

                      <div>
                        <Label htmlFor="billing-apartment">Apartment, suite, unit, etc (optional)</Label>
                        <Input
                          id="billing-apartment"
                          value={billingData.apartment}
                          onChange={(e) => setBillingData({ ...billingData, apartment: e.target.value })}
                          placeholder="Apartment, suite, unit"
                        />
                      </div>

                      <div>
                        <Label htmlFor="billing-suburb">Suburb <span className="text-red-500">*</span></Label>
                        <Input
                          id="billing-suburb"
                          value={billingData.suburb}
                          onChange={(e) => setBillingData({ ...billingData, suburb: e.target.value })}
                          required
                          placeholder="Enter your suburb"
                        />
                      </div>

                      <div className="relative">
                        <Label htmlFor="billing-state">State <span className="text-red-500">*</span></Label>
                        <Select value={billingData.state} onValueChange={(value) => setBillingData({ ...billingData, state: value })}>
                          <SelectTrigger>
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
                        <input
                          key={billingData.state}
                          tabIndex={-1}
                          autoComplete="off"
                          style={{ opacity: 0, height: 1, position: "absolute", bottom: 0, left: 0, zIndex: -1 }}
                          value={billingData.state}
                          required
                          onChange={() => { }}
                          onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("Please fill this field")}
                        />
                      </div>

                      <div>
                        <Label htmlFor="billing-postcode">Postcode <span className="text-red-500">*</span></Label>
                        <Input
                          id="billing-postcode"
                          value={billingData.postcode}
                          onChange={(e) => setBillingData({ ...billingData, postcode: e.target.value })}
                          required
                          placeholder="Enter your postcode"
                        />
                      </div>

                     
                    </div>
                  </CardContent>
                </Card>

                {/* Ship to Different Address */}
                {/* <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 mb-6">
                      <input
                        type="checkbox"
                        id="ship-different"
                        checked={shipToDifferentAddress}
                        onChange={(e) => setShipToDifferentAddress(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="ship-different" className="font-normal cursor-pointer text-lg">
                        Ship to a different Address?
                      </Label>
                    </div>

                    {shipToDifferentAddress && (
                      <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="shipping-firstname">First Name</Label>
                            <Input
                              id="shipping-firstname"
                              value={shippingData.firstName}
                              onChange={(e) => setShippingData({ ...shippingData, firstName: e.target.value })}
                              placeholder="Enter recipient first name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="shipping-lastname">Last Name</Label>
                            <Input
                              id="shipping-lastname"
                              value={shippingData.lastName}
                              onChange={(e) => setShippingData({ ...shippingData, lastName: e.target.value })}
                              placeholder="Enter recipient last name"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="shipping-phone">Phone</Label>
                          <Input
                            id="shipping-phone"
                            type="tel"
                            value={shippingData.phone}
                            onChange={(e) => setShippingData({ ...shippingData, phone: e.target.value })}
                            placeholder="Enter recipient phone number"
                          />
                        </div>

                        <div>
                          <Label htmlFor="shipping-country">Country Region</Label>
                          <Select value={shippingData.country} onValueChange={(value) => setShippingData({ ...shippingData, country: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Australia">Australia</SelectItem>
                              <SelectItem value="New Zealand">New Zealand</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="shipping-street">House number & street name</Label>
                          <Input
                            id="shipping-street"
                            value={shippingData.streetAddress}
                            onChange={(e) => setShippingData({ ...shippingData, streetAddress: e.target.value })}
                            placeholder="Enter shipping street address"
                          />
                        </div>

                        <div>
                          <Label htmlFor="shipping-apartment">Apartment, suite, unit, etc (optional)</Label>
                          <Input
                            id="shipping-apartment"
                            value={shippingData.apartment}
                            onChange={(e) => setShippingData({ ...shippingData, apartment: e.target.value })}
                            placeholder="Apartment, suite, unit"
                          />
                        </div>

                        <div>
                          <Label htmlFor="shipping-suburb">Suburb</Label>
                          <Input
                            id="shipping-suburb"
                            value={shippingData.suburb}
                            onChange={(e) => setShippingData({ ...shippingData, suburb: e.target.value })}
                            placeholder="Enter shipping suburb"
                          />
                        </div>

                        <div className="relative">
                          <Label htmlFor="shipping-state">State</Label>
                          <Select value={shippingData.state} onValueChange={(value) => setShippingData({ ...shippingData, state: value })}>
                            <SelectTrigger>
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
                          <input
                            key={shippingData.state}
                            tabIndex={-1}
                            autoComplete="off"
                            style={{ opacity: 0, height: 1, position: "absolute", bottom: 0, left: 0, zIndex: -1 }}
                            value={shippingData.state}
                            required
                            onChange={() => { }}
                            onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("Please fill this field")}
                          />
                        </div>

                        <div>
                          <Label htmlFor="shipping-postcode">Postcode</Label>
                          <Input
                            id="shipping-postcode"
                            value={shippingData.postcode}
                            onChange={(e) => setShippingData({ ...shippingData, postcode: e.target.value })}
                            placeholder="Enter shipping postcode"
                          />
                        </div>

                        <div>
                          <Label htmlFor="shipping-email">Email Address</Label>
                          <Input
                            id="shipping-email"
                            type="email"
                            value={shippingData.email}
                            onChange={(e) => setShippingData({ ...shippingData, email: e.target.value })}
                            placeholder="Enter recipient email address"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card> */}

                {/* Delivery Details */}
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Details</h2>
                    <div className="space-y-4">


                      <div>
                        <Label htmlFor="delivery-notes">Delivery Notes (Optional)</Label>
                        <Textarea
                          id="delivery-notes"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="Add any special delivery instructions..."
                          rows={4}
                          className="mt-2"
                        />
                      </div>
                      {/* <div>
                        <Label htmlFor="delivery-notes-image">Attach Image (Optional)</Label>
                        <div className="mt-2">
                          {deliveryNotesImagePreview ? (
                            <div className="relative inline-block">
                              <img
                                src={deliveryNotesImagePreview}
                                alt="Delivery notes preview"
                                className="max-w-full h-48 object-contain border rounded"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removeImage}
                                className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                              </div>
                              <input
                                id="delivery-notes-image"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                              />
                            </label>
                          )}
                        </div>
                      </div> */}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Order Summary */}
              <div className="lg:col-span-1 order-2 lg:order-2">
                <Card className="sticky top-24">
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>

                    {/* Cart Items */}
                    <div className="space-y-4 mb-6">
                      {items.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-gray-500">Your cart is empty</p>
                        </div>
                      ) : (
                        items.map((item) => {
                          const cartItemId = item.cart_item_id || generateCartItemId(item.product_id, item.options)
                          const itemPrice = getItemPrice(item)
                          return (
                            <div key={cartItemId} className="flex gap-4 pb-4 border-b">
                              <div className="relative w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                                {item.product_image ? (
                                  <Image
                                    src={item.product_image}
                                    alt={item.product_name}
                                    fill
                                    className="object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                    No Image
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-sm mb-1">{item.product_name}</h3>
                                {item.category && (
                                  <div className="text-xs font-medium text-gray-500 mb-1 uppercase">
                                    {item.category}
                                  </div>
                                )}
                                {item.subscription ? (
                                  <div className="text-xs text-[#031881] mb-2 font-medium bg-blue-50 p-1 px-2 rounded inline-block">
                                    <p>Subscription: {item.subscription.frequency}</p>
                                    {item.subscription.startDate && (
                                      <p className="mt-1">
                                        Start Date: {new Date(item.subscription.startDate.split('T')[0]).toLocaleDateString('en-GB')}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs text-[#031881] mb-2 font-medium bg-blue-50 p-1 px-2 rounded inline-block">
                                    One Time Purchase
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center border rounded">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updateQuantity(cartItemId, item.quantity - 1)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="px-2 text-sm w-6 text-center">{item.quantity}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updateQuantity(cartItemId, item.quantity + 1)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm">${(itemPrice * item.quantity).toFixed(2)}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeItem(cartItemId)}
                                      className="h-6 w-6 p-0 text-red-400 hover:text-red-500 hover:bg-transparent"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Coupon Code Section */}
                    {isAuthenticated && (
                      <div className="mb-6 pb-4 border-b">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="block font-medium">Coupon Code</Label>
                          {availableCoupons.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAvailableCoupons(!showAvailableCoupons)}
                              className="text-blue-600 hover:text-blue-800 h-auto p-0 hover:bg-transparent font-normal"
                            >
                              <Gift className="h-3 w-3 mr-1" />
                              {showAvailableCoupons ? "Hide" : "View Available Coupons"}
                              {showAvailableCoupons ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                            </Button>
                          )}
                        </div>

                        {/* Available Coupons Accordion */}
                        {showAvailableCoupons && (
                          <div className="mb-4 p-3 border rounded-lg bg-gray-50">
                            {isLoadingCoupons ? (
                              <div className="text-center py-2">
                                <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
                              </div>
                            ) : availableCoupons.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-2">No coupons available</p>
                            ) : (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {availableCoupons.map((coupon) => (
                                  <div
                                    key={coupon.code}
                                    className="p-3 border rounded bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => handleApplyAvailableCoupon(coupon)}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-blue-600">{coupon.code}</span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleApplyAvailableCoupon(coupon)
                                        }}
                                      >
                                        Apply
                                      </Button>
                                    </div>
                                    <p className="text-xs text-gray-600">{coupon.description}</p>
                                    <div className="mt-1 text-xs font-semibold text-green-600">
                                      {coupon.type === 'percentage'
                                        ? `${coupon.value}% OFF`
                                        : `$${Number(coupon.value).toFixed(2)} OFF`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {!appliedCoupon ? (
                          <div className="flex gap-2">
                            {/* Input and button logic from before if needed, or simplified if not present in snippet */}
                            <Input
                              placeholder="Enter code"
                              value={couponCode}
                              onChange={(e) => handleCouponInputChange(e.target.value)}
                              className="h-9"
                            />
                            <Button
                              type="button"
                              onClick={() => validateCoupon()}
                              disabled={isValidatingCoupon || !couponCode}
                              className="h-9 bg-gray-900 text-white hover:bg-gray-800"
                            >
                              {isValidatingCoupon ? "..." : "Apply"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded text-sm">
                            <span className="text-green-700 font-medium">{appliedCoupon.code} applied</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeCoupon}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-transparent"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Shipping Options - Moved Up */}
                    <div className="mb-6 pb-6 border-b">
                      <Label className="mb-3 block font-medium">Shipping</Label>
                      <div className="space-y-3">
                        <label className="flex items-start space-x-3 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="radio"
                              name="shipping"
                              value="pickup"
                              checked={shippingMethod === "pickup"}
                              onChange={(e) => setShippingMethod(e.target.value)}
                              className="peer sr-only"
                            />
                            <div className="w-4 h-4 border border-gray-300 rounded-full peer-checked:border-blue-600 peer-checked:border-4 transition-all"></div>
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">Local Pickup</span>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              St Dreux Coffee Roasters<br />
                              3/93 Jedda Rd, Prestons NSW 2170
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer group">
                          <div className="relative flex items-center">
                            <input
                              type="radio"
                              name="shipping"
                              value="standard"
                              checked={shippingMethod === "standard"}
                              onChange={(e) => setShippingMethod(e.target.value)}
                              className="peer sr-only"
                            />
                            <div className="w-4 h-4 border border-gray-300 rounded-full peer-checked:border-blue-600 peer-checked:border-4 transition-all"></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">Standard Shipping - $10.00</span>
                        </label>
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="space-y-3 mb-8">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span className="font-medium text-gray-900">${totals.subtotal.toFixed(2)}</span>
                      </div>

                      {totals.shippingFee > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Shipping</span>
                          <span className="font-medium text-gray-900">${totals.shippingFee.toFixed(2)}</span>
                        </div>
                      )}

                      {appliedCoupon && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span>-${totals.couponDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-baseline pt-4 border-t mt-4">
                        <span className="text-xl font-bold text-gray-900">Total</span>
                        <span className="text-xl font-bold text-gray-900">${totals.total.toFixed(2)}</span>
                      </div>
                      {totals.gst > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>GST (Incl.)</span>
                          <span>${totals.gst.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {customer?.pay_later && (
                        <Button
                          type="submit"
                          variant="outline"
                          className="w-full bg-white hover:bg-gray-50 text-gray-900 border-gray-200 py-6 font-medium"
                          disabled={loading || items.length === 0}
                          onClick={() => { paymentActionRef.current = 'invoice'; setPaymentAction('invoice'); }}
                        >
                          <div className="p-2 bg-blue-50 rounded-full mr-3 text-blue-600">
                            <FileText className="w-4 h-4" />
                          </div>
                          Pay Later / Invoice
                        </Button>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-[#031881] hover:bg-[#1a3a9e] text-white py-6 font-medium shadow-sm shadow-blue-200"
                        disabled={loading || items.length === 0}
                        onClick={() => { paymentActionRef.current = 'card'; setPaymentAction('card'); }}
                      >
                        <CreditCard className="w-5 h-5 mr-2" />
                        {loading && paymentAction === 'card' ? "Processing..." : "Pay Now (Card)"}
                      </Button>

                      <p className="text-[10px] text-center text-gray-400 mt-4 leading-normal px-4">
                        {customer?.pay_later
                          ? 'Clicking "Pay Now" will create your order as "Payment Pending" and redirect you to our secure payment portal.'
                          : 'Your order will be created after successful payment.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </section>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent
          className="sm:max-w-md text-center p-10"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full border-2 border-[#031881] p-3">
              <Check className="h-8 w-8 text-[#031881]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-medium text-black">
                Hey {billingData.firstName}{billingData.lastName ? ` ${billingData.lastName}` : ""},
              </h2>
              <h3 className="text-2xl font-bold text-black">
                Your Order is Confirmed!
              </h3>
              <p className="text-sm text-gray-500 max-w-[16rem] mx-auto leading-relaxed">
                We'll send you a shipping confirmation email as soon as your order ships.
              </p>
            </div>

            <Button
              className="w-full bg-[#031881] hover:bg-[#031881] text-white mt-6 py-6 uppercase tracking-wider font-medium"
              onClick={() => router.push('/account?tab=orders')}
            >
              Your Order History
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
