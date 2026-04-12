"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCartStore, generateCartItemId } from "@/store/cart"
import { useAuthStore } from "@/store/auth"
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

export default function CartPage() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, getTotalPrice, getItemPrice, updateItemsPrices } = useCartStore()
  const { isAuthenticated, customer, isWholesaleApproved } = useAuthStore()
  // Pending wholesale = registered wholesale but not yet approved → treat as retail
  const isPendingWholesale = !!(customer?.wholesale_type || customer?.service_type?.includes("Wholesaler")) && !isWholesaleApproved()
  const [isHydrated, setIsHydrated] = useState(false)
  const [productsData, setProductsData] = useState<Record<number, any>>({})

  // Wait for hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Refresh cart prices when authenticated to ensure correct pricing (e.g. Wholesale)
  useEffect(() => {
    const refreshPrices = async () => {
      if (!isAuthenticated || !isHydrated) return

      const currentItems = useCartStore.getState().items
      if (currentItems.length === 0) return

      const currentAuthState = useAuthStore.getState()
      const currentCustomer = currentAuthState.customer
      const customerType = currentCustomer?.customer_type || ''
      const isWholesale = !isPendingWholesale && customerType && (customerType.includes('Wholesale') || customerType.includes('Wholesaler') || currentCustomer.wholesale_type !== null)
      const isPremium =
        isWholesale &&
        (currentCustomer.wholesale_type === "premium" ||
          currentCustomer.service_type === "Full Service Wholesaler" ||
          currentCustomer.service_type === "Full Service");

      try {
        const productIds = Array.from(new Set(currentItems.map(item => item.product_id)))
        const productsMap: Record<number, any> = {}

        await Promise.all(productIds.map(async (id) => {
          try {
            const response = await api.get(`/store/products/${id}`)
            productsMap[id] = response.data.product
          } catch (err) {
            console.error(`Failed to fetch product ${id} for price refresh`, err)
          }
        }))

        currentItems.forEach(item => {
          const product = productsMap[item.product_id]
          if (!product) return

          // Determine Base Price based on Role
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

          let finalBasePrice = basePrice
          const newOptions = (item.options || []).map(itemOption => {
            let deltaPrice = 0
            
            if (product.options) {
              const productOption = product.options.find((o: any) => o.option_id === itemOption.option_id)
              if (productOption) {
                const productValue = productOption.values.find((v: any) => v.option_value_id === itemOption.option_value_id)
                
                if (productValue) {
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
                       deltaPrice = 0
                     } else {
                       deltaPrice = overridePrice
                     }
                  } else {
                     if (productValue.has_discount && productValue.discounted_option_price) {
                        deltaPrice = Number.parseFloat(productValue.discounted_option_price)
                     } else {
                        deltaPrice = Number.parseFloat(productValue.product_option_price || "0")
                     }
                  }
                  
                  return {
                    ...itemOption,
                    option_price: deltaPrice.toString(),
                    option_price_prefix: '+' 
                  }
                }
              }
            }
            return itemOption 
          })

          const cartStore = useCartStore.getState()
          if (cartStore.updateCartItem) {
             const cartItemId = item.cart_item_id || generateCartItemId(item.product_id, item.options, item.subscription)
             cartStore.updateCartItem(cartItemId, {
               product_price: finalBasePrice.toString(),
               options: newOptions
             })
          }
        })
        
        setProductsData(productsMap)
      } catch (error) {
        console.error("Failed to refresh cart prices:", error)
      }
    }

    refreshPrices()
  }, [isAuthenticated, isHydrated, customer])

  const handleCheckout = () => {
    router.push("/checkout")
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">
              Start adding some delicious items to your cart!
            </p>
            <Button onClick={() => router.push("/shop")}>
              Browse Products
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Cart Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {items.map((item) => {
                const cartItemId = item.cart_item_id || generateCartItemId(item.product_id, item.options)
                const itemPrice = getItemPrice(item)
                return (
                  <div key={cartItemId} className="py-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-24 h-48 sm:h-24 bg-gray-200 rounded flex-shrink-0">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-base sm:text-lg">{item.product_name}</h3>

                        {item.category && (
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1 mb-1">
                            <span className="font-bold text-gray-700">Category:</span>
                            <span className="font-medium">{item.category}</span>
                          </div>
                        )}

                        {/* Display Subscription Details */}
                        {item.subscription && (
                          <div className="mt-2 text-sm text-[#2952E6] font-medium bg-blue-50 p-2 rounded inline-block">
                            <p>Subscription: {item.subscription.frequency}</p>
                            {item.subscription.startDate && (
                              <p>Start Date: {new Date(item.subscription.startDate).toLocaleDateString('en-GB')}</p>
                            )}
                            {item.subscription.deliveryTime && (
                              <p>Time: {item.subscription.deliveryTime}</p>
                            )}
                          </div>
                        )}
                        
                        {/* Display Options */}
                        {item.options && item.options.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {item.options.map((option, idx) => (
                              <p key={idx} className="text-xs sm:text-sm text-gray-600">
                                {option.option_name}: {option.option_value}
                                {Number.parseFloat(option.option_price || "0") > 0 && (
                                  <span className="text-gray-500">
                                    {option.option_price_prefix === '+' ? ' (+$' : ' (-$'}
                                    {Number.parseFloat(option.option_price).toFixed(2)})
                                  </span>
                                )}
                              </p>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex flex-col mt-1">
                          {(() => {
                            const product = productsData[item.product_id];
                            const customerType = customer?.customer_type || '';
                            const isWholesale = customerType && (customerType.includes('Wholesale') || customerType.includes('Wholesaler') || customer?.wholesale_type !== null);
                            
                            let strikePrice = 0;
                            if (product && isWholesale) {
                               strikePrice = parseFloat(product.base_retail_price || product.user_price || product.product_price || "0");
                            }

                            return (
                              <div className="flex flex-wrap items-center gap-2">
                                {strikePrice > itemPrice && (
                                  <span className="text-sm text-gray-500 line-through">
                                    ${strikePrice.toFixed(2)}
                                  </span>
                                )}
                                <span className="text-primary font-bold text-sm sm:text-base">
                                  ${itemPrice.toFixed(2)}
                                </span>
                                {isWholesale && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    WHOLESALE
                                  </Badge>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center border rounded">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(cartItemId, item.quantity - 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="px-3 sm:px-4 font-medium text-sm sm:text-base">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(cartItemId, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(cartItemId)}
                            className="text-red-600 hover:text-red-700 h-8"
                          >
                            <Trash2 className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Remove</span>
                          </Button>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="font-bold text-base sm:text-lg">
                          ${(itemPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">${getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-medium">$10.00</span>
              </div>
              {(() => {
                const taxableCategories = ["packaging", "ancillaries"];
                const taxableAmount = items.reduce((sum, item) => {
                  const category = item.category?.toLowerCase().trim() || "";
                  if (taxableCategories.includes(category)) {
                    return sum + (getItemPrice(item) * item.quantity);
                  }
                  return sum;
                }, 0);
                const gst = taxableAmount * 0.1;

                if (gst > 0) {
                  return (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>GST (Incl.)</span>
                      <span className="font-medium">${gst.toFixed(2)}</span>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${(getTotalPrice() + 10.00).toFixed(2)}</span>
                </div>
              </div>

              {isPendingWholesale ? (
                <div className="w-full rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-center">
                  <p className="font-semibold text-yellow-800 mb-1">Account Pending Approval</p>
                  <p className="text-sm text-yellow-700 mb-3">
                    Checkout is available once your wholesale account is approved.
                  </p>
                  <a
                    href="/pending"
                    className="text-sm font-medium text-[#2952E6] underline underline-offset-2"
                  >
                    View approval status →
                  </a>
                </div>
              ) : (
                <Button className="w-full" size="lg" onClick={handleCheckout}>
                  Proceed to Checkout
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/shop")}
              >
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


// "use client"

// import { useRouter } from "next/navigation"
// import { useEffect, useState } from "react"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { useCartStore, generateCartItemId } from "@/store/cart"
// import { useAuthStore } from "@/store/auth"
// import { Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react"

// export default function CartPage() {
//   const router = useRouter()
//   const { items, updateQuantity, removeItem, getTotalPrice, getItemPrice } = useCartStore()
//   const { isAuthenticated, isLoading: authLoading } = useAuthStore()
//   const [isCheckingAuth, setIsCheckingAuth] = useState(true)

//   // Check authentication status on component mount
//   useEffect(() => {
//     // If auth store is still loading, wait
//     if (authLoading) return
    
//     // If not authenticated, redirect to login with return URL
//     if (!isAuthenticated) {
//       router.push(`/auth/login?redirect=${encodeURIComponent("/cart")}`)
//     } else {
//       setIsCheckingAuth(false)
//     }
//   }, [isAuthenticated, authLoading, router])

//   const handleCheckout = () => {
//     router.push("/checkout")
//   }

//   // Show loading state while checking authentication
//   if (isCheckingAuth || authLoading) {
//     return (
//       <div className="container mx-auto px-4 py-16">
//         <Card>
//           <CardContent className="py-16 text-center">
//             <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
//             <h2 className="text-2xl font-bold mb-2">Loading your cart...</h2>
//             <p className="text-gray-600">
//               Please wait while we verify your account
//             </p>
//           </CardContent>
//         </Card>
//       </div>
//     )
//   }

//   // Only show empty cart or cart content if user is authenticated
//   if (items.length === 0) {
//     return (
//       <div className="container mx-auto px-4 py-16">
//         <Card>
//           <CardContent className="py-16 text-center">
//             <ShoppingBag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
//             <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
//             <p className="text-gray-600 mb-6">
//               Start adding some delicious items to your cart!
//             </p>
//             <Button onClick={() => router.push("/products")}>
//               Browse Menu
//             </Button>
//           </CardContent>
//         </Card>
//       </div>
//     )
//   }

//   return (
//     <div className="container mx-auto px-4 py-8">
//       <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         {/* Cart Items */}
//         <div className="lg:col-span-2">
//           <Card>
//             <CardHeader>
//               <CardTitle>Cart Items ({items.length})</CardTitle>
//             </CardHeader>
//             <CardContent className="divide-y">
//               {items.map((item) => {
//                 const cartItemId = item.cart_item_id || generateCartItemId(item.product_id, item.options)
//                 const itemPrice = getItemPrice(item)
//                 return (
//                   <div key={cartItemId} className="py-4 flex flex-col sm:flex-row gap-4">
//                     <div className="w-full sm:w-24 h-48 sm:h-24 bg-gray-200 rounded flex-shrink-0">
//                       {item.product_image ? (
//                         <img
//                           src={item.product_image}
//                           alt={item.product_name}
//                           className="w-full h-full object-cover rounded"
//                         />
//                       ) : (
//                         <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
//                           No Image
//                         </div>
//                       )}
//                     </div>

//                     <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//                       <div className="flex-1">
//                         <h3 className="font-bold text-base sm:text-lg">{item.product_name}</h3>
                        
//                         {/* Display Options */}
//                         {item.options && item.options.length > 0 && (
//                           <div className="mt-1 space-y-1">
//                             {item.options.map((option, idx) => (
//                               <p key={idx} className="text-xs sm:text-sm text-gray-600">
//                                 {option.option_name}: {option.option_value}
//                                 {Number.parseFloat(option.option_price || "0") > 0 && (
//                                   <span className="text-gray-500">
//                                     {option.option_price_prefix === '+' ? ' (+$' : ' (-$'}
//                                     {Number.parseFloat(option.option_price).toFixed(2)})
//                                   </span>
//                                 )}
//                               </p>
//                             ))}
//                           </div>
//                         )}
                        
//                         <p className="text-primary font-bold mt-1 text-sm sm:text-base">
//                           ${itemPrice.toFixed(2)} each
//                         </p>

//                         <div className="flex items-center gap-3 mt-3">
//                           <div className="flex items-center border rounded">
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               onClick={() => updateQuantity(cartItemId, item.quantity - 1)}
//                               className="h-8 w-8 p-0"
//                             >
//                               <Minus className="h-4 w-4" />
//                             </Button>
//                             <span className="px-3 sm:px-4 font-medium text-sm sm:text-base">{item.quantity}</span>
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               onClick={() => updateQuantity(cartItemId, item.quantity + 1)}
//                               className="h-8 w-8 p-0"
//                             >
//                               <Plus className="h-4 w-4" />
//                             </Button>
//                           </div>

//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => removeItem(cartItemId)}
//                             className="text-red-600 hover:text-red-700 h-8"
//                           >
//                             <Trash2 className="h-4 w-4 sm:mr-1" />
//                             <span className="hidden sm:inline">Remove</span>
//                           </Button>
//                         </div>
//                       </div>

//                       <div className="text-left sm:text-right">
//                         <p className="font-bold text-base sm:text-lg">
//                           ${(itemPrice * item.quantity).toFixed(2)}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 )
//               })}
//             </CardContent>
//           </Card>
//         </div>

//         {/* Order Summary */}
//         <div>
//           <Card>
//             <CardHeader>
//               <CardTitle>Order Summary</CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="flex justify-between">
//                 <span>Subtotal</span>
//                 <span className="font-medium">${getTotalPrice().toFixed(2)}</span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Delivery Fee</span>
//                 <span className="font-medium">$10.00</span>
//               </div>
//               <div className="border-t pt-4">
//                 <div className="flex justify-between text-lg font-bold">
//                   <span>Total</span>
//                   <span className="text-primary">${(getTotalPrice() + 10.00).toFixed(2)}</span>
//                 </div>
//               </div>

//               <Button className="w-full" size="lg" onClick={handleCheckout}>
//                 Proceed to Checkout
//               </Button>

//               <Button
//                 variant="outline"
//                 className="w-full"
//                 onClick={() => router.push("/products")}
//               >
//                 Continue Shopping
//               </Button>
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   )
// }