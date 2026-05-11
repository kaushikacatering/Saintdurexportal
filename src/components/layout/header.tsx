// "use client"

// import Link from "next/link"
// import Image from "next/image"
// import { useEffect, useState } from "react"
// import { Button } from "@/components/ui/button"
// import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu"
// import { useAuthStore } from "@/store/auth"
// import { useCartStore } from "@/store/cart"
// import { ShoppingCart, Menu, X, User, LogOut, LogIn } from "lucide-react"

// export function Header() {
//   const { isAuthenticated, user, logout, checkAuth } = useAuthStore()
//   const { getTotalItems } = useCartStore()
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
//   const [mounted, setMounted] = useState(false)

//   useEffect(() => {
//     setMounted(true)
//     checkAuth()
//   }, [checkAuth])

//   // Close mobile menu when route changes
//   useEffect(() => {
//     setMobileMenuOpen(false)
//   }, [])

//   return (
//     <header className="bg-[#031881] sticky top-0 z-50 shadow-md">
//       <div className="container mx-auto px-4 sm:px-6">
//         <div className="flex items-center justify-between h-16 sm:h-20 min-h-[64px] sm:min-h-[80px]">
//           {/* Logo */}
//           <Link href="/" className="flex items-center py-2 sm:py-3" onClick={() => setMobileMenuOpen(false)}>
//             <Image
//               src="/assets/images/logo.png"
//               alt="St. Dreux Coffee"
//               width={240}
//               height={56}
//               className="object-contain h-10 sm:h-14 w-auto"
//               priority
//             />
//           </Link>

//           {/* Desktop Navigation */}
//           <nav className="hidden lg:flex items-center gap-6 xl:gap-10">
//             <Link href="/shop" className="text-white hover:text-white/80 transition-colors text-base">
//               Shop
//             </Link>
//             <Link href="/shop?purchaseType=subscription" className="text-white hover:text-white/80 transition-colors text-base">
//               Subscriptions
//             </Link>
//             <Link href="/wholesale" className="text-white hover:text-white/80 transition-colors text-base">
//               Wholesale
//             </Link>
//             <Link href="/blogs" className="text-white hover:text-white/80 transition-colors text-base">
//               Blogs
//             </Link>
//             <Link href="/about" className="text-white hover:text-white/80 transition-colors text-base">
//               About Us
//             </Link>
//             <Link href="/contact" className="text-white hover:text-white/80 transition-colors text-base">
//               Get in Touch
//             </Link>
//           </nav>

//           {/* Desktop Actions */}
//           <div className="hidden lg:flex items-center gap-4 xl:gap-6">
//             <Link href="/cart" className="flex items-center gap-2 text-white hover:text-white/80 transition-colors whitespace-nowrap">
//               <ShoppingCart className="h-5 w-5" />
//               <span className="text-base">Cart</span>
//               {mounted && getTotalItems() > 0 && (
//                 <span className="ml-1 text-sm">({getTotalItems()})</span>
//               )}
//               {!mounted && <span className="ml-1 text-sm" style={{ visibility: 'hidden' }}>(0)</span>}
//             </Link>

//             {!mounted ? (
//               // Show nothing during SSR to prevent hydration mismatch
//               <div className="flex items-center gap-3" style={{ minHeight: '40px' }}></div>
//             ) : isAuthenticated ? (
//               <DropdownMenu
//                 trigger={
//                   <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20">
//                     <User className="h-5 w-5" />
//                   </button>
//                 }
//                 align="right"
//               >
//                 <div className="py-1">
//                   <div className="px-4 py-2 border-b">
//                     <p className="text-sm font-medium text-gray-900">
//                       {user?.username || user?.email?.split('@')[0] || 'User'}
//                     </p>
//                     {user?.email && (
//                       <p className="text-xs text-gray-500 truncate">{user.email}</p>
//                     )}
//                   </div>
//                   <DropdownMenuItem asChild>
//                     <Link href="/account" className="flex items-center gap-2">
//                       <User className="h-4 w-4" />
//                       Account
//                     </Link>
//                   </DropdownMenuItem>
//                   <DropdownMenuItem onClick={logout} className="text-red-600">
//                     <div className="flex items-center gap-2">
//                       <LogOut className="h-4 w-4" />
//                       Logout
//                     </div>
//                   </DropdownMenuItem>
//                 </div>
//               </DropdownMenu>
//             ) : (
//               <DropdownMenu
//                 trigger={
//                   <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20">
//                     <User className="h-5 w-5" />
//                   </button>
//                 }
//                 align="right"
//               >
//                 <div className="py-1">
//                   <DropdownMenuItem asChild>
//                     <Link href="/auth/login" className="flex items-center gap-2">
//                       <LogIn className="h-4 w-4" />
//                       Login
//                     </Link>
//                   </DropdownMenuItem>
//                   <DropdownMenuItem asChild>
//                     <Link href="/auth/register" className="flex items-center gap-2">
//                       <User className="h-4 w-4" />
//                       Register
//                     </Link>
//                   </DropdownMenuItem>
//                 </div>
//               </DropdownMenu>
//             )}
//           </div>

//           {/* Mobile Actions */}
//           <div className="flex lg:hidden items-center gap-3">
//             <Link href="/cart" className="flex items-center gap-1 text-white hover:text-white/80 transition-colors relative">
//               <ShoppingCart className="h-5 w-5" />
//               {mounted && getTotalItems() > 0 ? (
//                 <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
//                   {getTotalItems()}
//                 </span>
//               ) : null}
//             </Link>

//             {/* Mobile Menu Button */}
//             <button
//               onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
//               className="text-white hover:text-white/80 transition-colors p-2"
//               aria-label="Toggle menu"
//             >
//               {mobileMenuOpen ? (
//                 <X className="h-6 w-6" />
//               ) : (
//                 <Menu className="h-6 w-6" />
//               )}
//             </button>
//           </div>
//         </div>

//         {/* Mobile Menu */}
//         {mobileMenuOpen && (
//           <div className="lg:hidden border-t border-white/20 animate-in slide-in-from-top">
//             <nav className="flex flex-col py-4">
//               <Link
//                 href="/shop"
//                 className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
//                 onClick={() => setMobileMenuOpen(false)}
//               >
//                 Shop
//               </Link>
//               <Link
//                 href="/shop?purchaseType=subscription"
//                 className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
//                 onClick={() => setMobileMenuOpen(false)}
//               >
//                 Subscriptions
//               </Link>
//               <Link
//                 href="/wholesale"
//                 className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
//                 onClick={() => setMobileMenuOpen(false)}
//               >
//                 Wholesale
//               </Link>
//               <Link
//                 href="/blogs"
//                 className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
//                 onClick={() => setMobileMenuOpen(false)}
//               >
//                 Blogs
//               </Link>
//               <Link
//                 href="/about"
//                 className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
//                 onClick={() => setMobileMenuOpen(false)}
//               >
//                 About Us
//               </Link>
//               <Link
//                 href="/contact"
//                 className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
//                 onClick={() => setMobileMenuOpen(false)}
//               >
//                 Get in Touch
//               </Link>

//               <div className="border-t border-white/20 mt-2 pt-4 space-y-1">
//                 {!mounted ? (
//                   // Show nothing during SSR to prevent hydration mismatch
//                   <div style={{ minHeight: '40px' }}></div>
//                 ) : isAuthenticated ? (
//                   <>
//                     <div className="px-4 py-2 border-b border-white/10">
//                       <p className="text-white text-sm font-medium">
//                         {user?.username || user?.email?.split('@')[0] || 'User'}
//                       </p>
//                       {user?.email && (
//                         <p className="text-white/70 text-xs truncate">{user.email}</p>
//                       )}
//                     </div>
//                     <Link
//                       href="/account"
//                       className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
//                       onClick={() => setMobileMenuOpen(false)}
//                     >
//                       <User className="h-4 w-4" />
//                       Account
//                     </Link>
//                     <button
//                       className="flex items-center gap-2 w-full px-4 py-3 text-white hover:bg-white/10 transition-colors text-base text-left"
//                       onClick={() => {
//                         logout()
//                         setMobileMenuOpen(false)
//                       }}
//                     >
//                       <LogOut className="h-4 w-4" />
//                       Logout
//                     </button>
//                   </>
//                 ) : (
//                   <>
//                     <Link
//                       href="/auth/login"
//                       className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
//                       onClick={() => setMobileMenuOpen(false)}
//                     >
//                       <LogIn className="h-4 w-4" />
//                       Login
//                     </Link>
//                     <Link
//                       href="/auth/register"
//                       className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
//                       onClick={() => setMobileMenuOpen(false)}
//                     >
//                       <User className="h-4 w-4" />
//                       Register
//                     </Link>
//                   </>
//                 )}
//               </div>
//             </nav>
//           </div>
//         )}
//       </div>
//     </header>
//   )
// }


"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { ShoppingCart, Menu, X, User, LogOut, LogIn } from "lucide-react";

export function Header() {
  const { isAuthenticated, user, customer, logout, checkAuth } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  // Check if user is wholesale
  const isWholesale =
    customer?.wholesale_type || customer?.service_type?.includes("Wholesaler");
  const isWholesaleApproved = useAuthStore(
    (state) => state.isWholesaleApproved
  )();

  // Determine wholesale link based on user status
  const getWholesaleLink = () => {
    if (!isAuthenticated) {
      return "/wholesale-info"; // Non-logged-in users see public info
    }

    if (isWholesale) {
      if (isWholesaleApproved) {
        return "/wholesale"; // Approved wholesale users see portal
      } else {
        return "/pending"; // Unapproved wholesale users see pending page
      }
    }

    return "/wholesale-info"; // Retail users see public info
  };

  const getWholesaleLabel = () => {
    if (!isAuthenticated) {
      return "Wholesale";
    }

    if (isWholesale) {
      if (isWholesaleApproved) {
        return "Wholesale Portal";
      } else {
        return "Pending Approval";
      }
    }

    return "Wholesale";
  };

  return (
    <header className="bg-[#031881] sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20 min-h-[64px] sm:min-h-[80px]">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center py-2 sm:py-3"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Image
              src="/assets/images/logo.png"
              alt="St. Dreux Coffee"
              width={240}
              height={56}
              className="object-contain h-10 sm:h-14 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-10">
            {isWholesale && !isWholesaleApproved ? (
              // Unapproved wholesale users - can browse shop at retail prices
              <>
                <Link
                  href="/shop"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  Shop
                </Link>
                <Link
                  href="/blogs"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  Blogs
                </Link>
                <Link
                  href="/about"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  About Us
                </Link>
                <Link
                  href="/contact"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  Get in Touch
                </Link>
                <Link
                  href={getWholesaleLink()}
                  className="text-white hover:text-white/80 transition-colors text-base font-semibold"
                >
                  {getWholesaleLabel()}
                </Link>
              </>
            ) : isWholesale ? (
              // Approved wholesale users
              <>
                <Link
                  href="/shop"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  Shop
                </Link>
                <Link
                  href="/blogs"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  Blogs
                </Link>
                <Link
                  href="/about"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  About Us
                </Link>

                <Link
                  href={getWholesaleLink()}
                  className="text-white hover:text-white/80 transition-colors text-base font-semibold"
                >
                  {getWholesaleLabel()}
                </Link>
                <Link
                  href="/contact"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  Get in Touch
                </Link>
              </>
            ) : (
              // Retail users or non-logged-in users
              <>
                <Link
                  href="/shop"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  Shop
                </Link>
                <Link
                  href="/shop?purchaseType=subscription"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  Subscriptions
                </Link>
                <Link
                  href="/blogs"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  Blogs
                </Link>
                <Link
                  href="/about"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  About Us
                </Link>

                <Link
                  href={getWholesaleLink()}
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  {getWholesaleLabel()}
                </Link>
                <Link
                  href="/contact"
                  className="text-white hover:text-white/80 transition-colors text-base"
                >
                  Get in Touch
                </Link>
              </>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6">
            <Link
              href={isAuthenticated ? "/checkout" : "/cart"}
              className="flex items-center gap-2 text-white hover:text-white/80 transition-colors whitespace-nowrap"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-base">Cart</span>
              {mounted && getTotalItems() > 0 && (
                <span className="ml-1 text-sm">({getTotalItems()})</span>
              )}
              {!mounted && (
                <span className="ml-1 text-sm" style={{ visibility: "hidden" }}>
                  (0)
                </span>
              )}
            </Link>

            {!mounted ? (
              // Show nothing during SSR to prevent hydration mismatch
              <div
                className="flex items-center gap-3"
                style={{ minHeight: "40px" }}
              ></div>
            ) : isAuthenticated ? (
              <DropdownMenu
                trigger={
                  <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20">
                    <User className="h-5 w-5" />
                  </button>
                }
                align="right"
              >
                <div className="py-1">
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-medium text-gray-900">
                      {(() => {
                        if (customer?.firstname || customer?.lastname) {
                          const first = (customer.firstname || "").trim();
                          const last = (customer.lastname || "").trim();
                          if (first && last && first.toLowerCase() === last.toLowerCase()) {
                            return first;
                          }
                          return `${first} ${last}`.trim() || user?.username || "User";
                        }
                        return user?.username || user?.email?.split("@")[0] || "User";
                      })()}
                    </p>
                    {user?.email && (
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    )}
                    {isWholesale && (
                      <p className={`text-xs ${isWholesaleApproved ? 'text-green-600' : 'text-yellow-600'}`}>
                        {isWholesaleApproved ? (
                          (customer?.wholesale_type === "premium" ||
                            customer?.service_type === "Full Service Wholesaler" ||
                            customer?.service_type === "Full Service") ? '✓ Premium Wholesaler' : '✓  Essential Wholesaler'
                        ) : '⏳ Pending Approval'}
                      </p>
                    )}
                    {!isWholesale && (
                      <p className="text-xs text-blue-600">
                        Retailer
                      </p>
                    )}
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <div className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </div>
                  </DropdownMenuItem>
                </div>
              </DropdownMenu>
            ) : (
              <DropdownMenu
                trigger={
                  <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20">
                    <User className="h-5 w-5" />
                  </button>
                }
                align="right"
              >
                <div className="py-1">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/auth/login"
                      className="flex items-center gap-2"
                    >
                      <LogIn className="h-4 w-4" />
                      Login
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/auth/register"
                      className="flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      Register
                    </Link>
                  </DropdownMenuItem>
                </div>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-3">
            <Link
              href={isAuthenticated ? "/checkout" : "/cart"}
              className="flex items-center gap-1 text-white hover:text-white/80 transition-colors relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {mounted && getTotalItems() > 0 ? (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              ) : null}
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-white/80 transition-colors p-2"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/20 animate-in slide-in-from-top">
            <nav className="flex flex-col py-4">
              {isWholesale && !isWholesaleApproved ? (
                // Unapproved wholesale users - can browse shop at retail prices
                <>
                  <Link
                    href="/shop"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Shop
                  </Link>
                  <Link
                    href="/blogs"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Blogs
                  </Link>
                  <Link
                    href="/about"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    About Us
                  </Link>
                  <Link
                    href="/contact"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get in Touch
                  </Link>
                  <Link
                    href={getWholesaleLink()}
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {getWholesaleLabel()}
                  </Link>
                </>
              ) : isWholesale ? (
                // Approved wholesale users
                <>
                  <Link
                    href="/shop"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Shop
                  </Link>
                  <Link
                    href="/blogs"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Blogs
                  </Link>
                  <Link
                    href="/about"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    About Us
                  </Link>
                  <Link
                    href="/contact"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get in Touch
                  </Link>
                  <Link
                    href={getWholesaleLink()}
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {getWholesaleLabel()}
                  </Link>
                </>
              ) : (
                // Retail users or non-logged-in users
                <>
                  <Link
                    href="/shop"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Shop
                  </Link>
                  <Link
                    href="/shop?purchaseType=subscription"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Subscriptions
                  </Link>
                  <Link
                    href="/blogs"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Blogs
                  </Link>
                  <Link
                    href="/about"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    About Us
                  </Link>
                  <Link
                    href="/contact"
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get in Touch
                  </Link>
                  <Link
                    href={getWholesaleLink()}
                    className="px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {getWholesaleLabel()}
                  </Link>
                </>
              )}

              <div className="border-t border-white/20 mt-2 pt-4 space-y-1">
                {!mounted ? (
                  // Show nothing during SSR to prevent hydration mismatch
                  <div style={{ minHeight: "40px" }}></div>
                ) : isAuthenticated ? (
                  <>
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-white text-sm font-medium">
                        {(() => {
                          if (customer?.firstname || customer?.lastname) {
                            const first = (customer.firstname || "").trim();
                            const last = (customer.lastname || "").trim();
                            if (first && last && first.toLowerCase() === last.toLowerCase()) {
                              return first;
                            }
                            return `${first} ${last}`.trim() || user?.username || "User";
                          }
                          return user?.username || user?.email?.split("@")[0] || "User";
                        })()}
                      </p>
                      {user?.email && (
                        <p className="text-white/70 text-xs truncate">
                          {user.email}
                        </p>
                      )}
                      {isWholesale && (
                        <p className={`text-xs ${isWholesaleApproved ? 'text-green-400' : 'text-yellow-400'}`}>
                          {isWholesaleApproved ? '✓ Approved Wholesaler' : '⏳ Pending Approval'}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/account"
                      className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Account
                    </Link>
                    <button
                      className="flex items-center gap-2 w-full px-4 py-3 text-white hover:bg-white/10 transition-colors text-base text-left"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LogIn className="h-4 w-4" />
                      Login
                    </Link>
                    <Link
                      href="/auth/register"
                      className="flex items-center gap-2 px-4 py-3 text-white hover:bg-white/10 transition-colors text-base"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Register
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}