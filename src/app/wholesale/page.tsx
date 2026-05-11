// "use client"

// import { useState } from "react"
// import Link from "next/link"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Textarea } from "@/components/ui/textarea"
// import { Card, CardContent } from "@/components/ui/card"
// import { Building2, Store, Package, Building } from "lucide-react"
// import Image from "next/image"
// import { api } from "@/lib/api"
// import { toast } from "sonner"

// export default function WholesalePage() {
//   const [formData, setFormData] = useState({
//     // Contact Information
//     firstName: "",
//     lastName: "",
//     businessName: "",
//     email: "",
//     phoneNumber: "",
    
//     // Business Address
//     businessAddress: "",
//     addressLine2: "",
//     suburb: "",
//     state: "",
//     postcode: "",
//     businessLicense: "",
    
//     // Business Website
//     businessWebsite: "",
    
//     // Coffee Volume
//     weeklyVolume: "",
    
//     // Start Date
//     startMonth: "",
//     startYear: ""
//   })
//   const [loading, setLoading] = useState(false)
//   const [submitted, setSubmitted] = useState(false)

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setLoading(true)

//     try {
//       await api.post("/store/wholesale-enquiry", {
//         firstName: formData.firstName,
//         lastName: formData.lastName,
//         businessName: formData.businessName,
//         email: formData.email,
//         phoneNumber: formData.phoneNumber,
//         businessAddress: formData.businessAddress,
//         suburb: formData.suburb,
//         state: formData.state,
//         postcode: formData.postcode,
//         businessLicense: formData.businessLicense || null,
//         businessWebsite: formData.businessWebsite || null,
//         weeklyVolume: formData.weeklyVolume,
//         startMonth: formData.startMonth,
//         startYear: formData.startYear,
//       })

//       toast.success("Thank you! Your wholesale enquiry has been submitted successfully.")
//       setSubmitted(true)
      
//       // Reset form
//       setFormData({
//         firstName: "",
//         lastName: "",
//         businessName: "",
//         email: "",
//         phoneNumber: "",
//         businessAddress: "",
//         addressLine2: "",
//         suburb: "",
//         state: "",
//         postcode: "",
//         businessLicense: "",
//         businessWebsite: "",
//         weeklyVolume: "",
//         startMonth: "",
//         startYear: ""
//       })

//       // Reset submitted state after 8 seconds
//       setTimeout(() => {
//         setSubmitted(false)
//       }, 8000)
//     } catch (error: any) {
//       const errorMessage = error.response?.data?.message || "Failed to submit enquiry. Please try again."
//       toast.error(errorMessage)
//     } finally {
//       setLoading(false)
//     }
//   }

//   const partnerTypes = [
//     {
//       icon: <Store className="w-12 h-12 text-[#031881]" />,
//       title: "Independent Cafes",
//       description: "Focused on quality and loyal customers."
//     },
//     {
//       icon: <Building2 className="w-12 h-12 text-[#031881]" />,
//       title: "Retailers",
//       description: "Looking to stock premium, ethically sourced blends."
//     },
//     {
//       icon: <Package className="w-12 h-12 text-[#031881]" />,
//       title: "Wholesalers",
//       description: "Who value reliability, speed, and standout product."
//     },
//     {
//       icon: <Building className="w-12 h-12 text-[#031881]" />,
//       title: "Hospitality & Offices",
//       description: "Elevate guest & team experiences with premium coffee."
//     }
//   ]

//   return (
//     <div className="flex flex-col">
//       {/* Hero Section */}
//       <section className="relative h-96 sm:h-[500px] bg-gradient-to-r from-amber-900/80 to-amber-800/80">
//         <div className="absolute inset-0">
//           <Image
//             src="/assets/sndurex/Frame 1000007198.png"
//             alt="Wholesale Partnership"
//             fill
//             className="object-cover"
//             priority
//           />
//           <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/40" />
//         </div>
//         <div className="relative container mx-auto px-6 h-full flex flex-col items-center justify-center text-white text-center">
//           <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4">
//             Join cafés, retailers & wholesalers serving premium coffee.
//           </h1>
//           <Link href="/auth/register?type=wholesale">
//             <Button size="lg" className="bg-[#031881] hover:bg-[#1a3a9e] text-white px-12 py-6 text-lg mt-6">
//               Register Now
//             </Button>
//           </Link>
//         </div>
//       </section>

//       {/* Who We Work With Section */}
//       <section className="py-20 bg-[#F5F5F0]">
//         <div className="container mx-auto px-6">
//           <div className="flex items-start justify-between mb-12">
//             <div className="max-w-2xl">
//               <p className="text-sm text-[#C4A484] mb-2">Partnerships</p>
//               <h2 className="text-4xl font-bold text-gray-900 mb-4">
//                 Who we work with
//               </h2>
//               <p className="text-gray-600 leading-relaxed">
//                 Crafted with passion, enjoyed in every bite. Taste the difference!
//               </p>
//             </div>
//             <Link href="/auth/register?type=wholesale">
//               <Button className="bg-[#031881] hover:bg-[#1a3a9e] text-white px-8">
//                 Register
//               </Button>
//             </Link>
//           </div>

//           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
//             {partnerTypes.map((partner, index) => (
//               <Card key={index} className="text-center hover:shadow-lg transition-shadow bg-white border border-blue-200">
//                 <CardContent className="pt-8 pb-6">
//                   <div className="flex justify-center mb-4">
//                     {partner.icon}
//                   </div>
//                   <h3 className="text-xl font-bold text-gray-900 mb-3">
//                     {partner.title}
//                   </h3>
//                   <p className="text-gray-600 text-sm">
//                     {partner.description}
//                   </p>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Why Partner Section */}
//       <section className="py-20 bg-[#F5F5F0]">
//         <div className="container mx-auto px-6 text-center max-w-4xl">
//           <p className="text-sm text-[#C4A484] mb-2">Why partner with us?</p>
//           <h2 className="text-4xl font-bold text-gray-900 mb-6">
//             Your coffee deserves more than just beans, it deserves a brand that elevates every sip.
//           </h2>
//           <p className="text-gray-700 leading-relaxed mb-6">
//             Join our family of cafés, restaurants, and creators who care about quality and connection. From freshly roasted beans to barista training and co-branded experiences, we've got your back — one cup at a time.
//           </p>
//           <Link href="/auth/register?type=wholesale">
//             <Button size="lg" className="bg-[#031881] hover:bg-[#1a3a9e] text-white px-10">
//               Register Now!
//             </Button>
//           </Link>
//         </div>
//       </section>

//       {/* Enquiry Form Section */}
//       <section className="py-20 bg-[#F5F5F0]">
//         <div className="container mx-auto px-6 max-w-4xl">
//           <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
//             Enquiry Form
//           </h2>

//           {submitted ? (
//             <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center mb-8">
//               <div className="text-green-600 mb-4">
//                 <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//               </div>
//               <h3 className="text-2xl font-semibold text-green-900 mb-3">
//                 Enquiry Submitted Successfully!
//               </h3>
//               <p className="text-green-700 text-lg mb-2">
//                 Thank you for your interest in becoming a wholesale partner.
//               </p>
//               <p className="text-green-600">
//                 Our team will review your submission and get back to you within 2-3 business days.
//               </p>
//             </div>
//           ) : null}

//           <form onSubmit={handleSubmit} className="space-y-8">
//             {/* 1. Contact Information */}
//             <div>
//               <h3 className="text-2xl font-bold text-gray-900 mb-6">
//                 1. Contact Information
//               </h3>
//               <div className="grid md:grid-cols-2 gap-6">
//                 <Input
//                   type="text"
//                   placeholder="First Name"
//                   value={formData.firstName}
//                   onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
//                   className="py-6"
//                   required
//                 />
//                 <Input
//                   type="text"
//                   placeholder="Last Name"
//                   value={formData.lastName}
//                   onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
//                   className="py-6"
//                   required
//                 />
//               </div>
//               <div className="grid md:grid-cols-2 gap-6 mt-6">
//                 <Input
//                   type="tel"
//                   placeholder="Phone Number"
//                   value={formData.phoneNumber}
//                   onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
//                   className="py-6"
//                   required
//                 />
//                 <Input
//                   type="email"
//                   placeholder="Email"
//                   value={formData.email}
//                   onChange={(e) => setFormData({ ...formData, email: e.target.value })}
//                   className="py-6"
//                   required
//                 />
//               </div>
//               <div className="mt-6">
//                 <Input
//                   type="text"
//                   placeholder="Company Name"
//                   value={formData.businessName}
//                   onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
//                   className="py-6"
//                   required
//                 />
//               </div>
//             </div>

//             {/* 2. Business Address */}
//             <div>
//               <h3 className="text-2xl font-bold text-gray-900 mb-6">
//                 2. Business Address
//               </h3>
//               <div className="space-y-6">
//                 <Input
//                   type="text"
//                   placeholder="Address line 1"
//                   value={formData.businessAddress}
//                   onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
//                   className="py-6"
//                   required
//                 />
//                 <Input
//                   type="text"
//                   placeholder="Address line 2 (Optional)"
//                   value={formData.addressLine2}
//                   onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
//                   className="py-6"
//                 />
//                 <Input
//                   type="text"
//                   placeholder="City/Town"
//                   value={formData.suburb}
//                   onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
//                   className="py-6"
//                   required
//                 />
//                 <div className="grid md:grid-cols-2 gap-6">
//                   <Input
//                     type="text"
//                     placeholder="State/Region province"
//                     value={formData.state}
//                     onChange={(e) => setFormData({ ...formData, state: e.target.value })}
//                     className="py-6"
//                     required
//                   />
//                   <Input
//                     type="text"
//                     placeholder="Zip/Postcode"
//                     value={formData.postcode}
//                     onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
//                     className="py-6"
//                     required
//                   />
//                 </div>
//                 <Input
//                   type="text"
//                   placeholder="Business License Number (Optional)"
//                   value={formData.businessLicense}
//                   onChange={(e) => setFormData({ ...formData, businessLicense: e.target.value })}
//                   className="py-6"
//                 />
//               </div>
//             </div>

//             {/* 3. Your Business Website */}
//             <div>
//               <h3 className="text-2xl font-bold text-gray-900 mb-6">
//                 3. Your Business Website (If Applicable)
//               </h3>
//               <Input
//                 type="url"
//                 placeholder="Enter Here"
//                 value={formData.businessWebsite}
//                 onChange={(e) => setFormData({ ...formData, businessWebsite: e.target.value })}
//                 className="py-6"
//               />
//             </div>

//             {/* 4. What's your expected weekly coffee volume? */}
//             <div>
//               <h3 className="text-2xl font-bold text-gray-900 mb-6">
//                 4. What&#39;s your expected weekly coffee volume? (Kilograms)
//               </h3>
//               <Input
//                 type="text"
//                 placeholder="Enter here"
//                 value={formData.weeklyVolume}
//                 onChange={(e) => setFormData({ ...formData, weeklyVolume: e.target.value })}
//                 className="py-6"
//                 required
//               />
//             </div>

//             {/* 5. What date would you like to start */}
//             <div>
//               <h3 className="text-2xl font-bold text-gray-900 mb-6">
//                 5. What date would you like to start
//               </h3>
//               <div className="grid grid-cols-2 gap-4">
//                 <Input
//                   type="text"
//                   placeholder="Month (e.g., January, February, or MM)"
//                   value={formData.startMonth}
//                   onChange={(e) => setFormData({ ...formData, startMonth: e.target.value })}
//                   className="py-6"
//                   required
//                 />
//                 <Input
//                   type="text"
//                   placeholder="Year (YYYY)"
//                   value={formData.startYear}
//                   onChange={(e) => setFormData({ ...formData, startYear: e.target.value })}
//                   className="py-6"
//                   required
//                 />
//               </div>
//             </div>

//             <Button 
//               type="submit" 
//               className="w-full py-6 bg-[#031881] hover:bg-[#1a3a9e] text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
//               disabled={loading || submitted}
//             >
//               {loading ? "Submitting..." : (submitted ? "Submitted!" : "Submit")}
//             </Button>
//           </form>
//         </div>
//       </section>
//     </div>
//   )
// }

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WholesalePortalPage() {
  const router = useRouter();
  const { isAuthenticated, customer, isWholesaleApproved } = useAuthStore();

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      toast.error("Please login to access wholesale portal");
      router.push("/auth/login?redirect=/wholesale");
      return;
    }

    // Check if user is wholesale
    const isWholesale = customer?.wholesale_type || 
                       customer?.service_type?.includes("Wholesaler");
    
    if (!isWholesale) {
      toast.error("This portal is for wholesale customers only");
      router.push("/shop");
      return;
    }

    // Check if approved
    if (!isWholesaleApproved()) {
      toast.error("Your wholesale account is pending approval");
      router.push("/pending");
      return;
    }
  }, [isAuthenticated, customer, isWholesaleApproved, router]);

  // Show loading while checking
  if (!isAuthenticated || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#031881] mx-auto mb-4"></div>
          <p>Loading wholesale portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Wholesale Portal</h1>
        <p className="text-gray-600 text-lg">
          Welcome back, {customer.firstname}! You're logged in as a{" "}
          <span className="font-semibold">
            {customer.wholesale_type || "Essential"} Wholesaler
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Browse Products</h3>
              <p className="text-gray-600 mb-4">View our wholesale product catalog</p>
              <Button asChild className="w-full">
                <Link href="/shop">View Products</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">My Orders</h3>
              <p className="text-gray-600 mb-4">View and manage your orders</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/account">View Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">My Account</h3>
              <p className="text-gray-600 mb-4">Manage your account details</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/account">Account Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wholesale Exclusive Features */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Wholesale Exclusive Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold">✓</span>
            </div>
            <div>
              <h4 className="font-semibold">Bulk Pricing</h4>
              <p className="text-sm text-gray-600">Special wholesale pricing on bulk orders</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold">✓</span>
            </div>
            <div>
              <h4 className="font-semibold">Dedicated Support</h4>
              <p className="text-sm text-gray-600">Priority customer support for wholesale clients</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold">✓</span>
            </div>
            <div>
              <h4 className="font-semibold">Custom Orders</h4>
              <p className="text-sm text-gray-600">Ability to place custom bulk orders</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold">✓</span>
            </div>
            <div>
              <h4 className="font-semibold">Order History</h4>
              <p className="text-sm text-gray-600">Access to complete order history</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
