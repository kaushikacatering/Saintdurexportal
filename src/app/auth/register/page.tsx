"use client";

import { useState, useEffect, Suspense } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/auth";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useAuthStore((state) => state.register);

  const [userType, setUserType] = useState<"customer" | "wholesale">(
    "customer"
  );
  const [wholesaleType, setWholesaleType] = useState<"premium" | "essential">(
    "premium"
  );

  useEffect(() => {
    const type = searchParams?.get("type");
    const plan = searchParams?.get("plan");

    if (type === "wholesale") {
      setUserType("wholesale");
    }

    if (plan === "essential") {
      setWholesaleType("essential");
    } else if (plan === "premium") {
      setWholesaleType("premium");
    }

    // Store in localStorage for Google login to detect
    if (typeof window !== "undefined") {
      if (type === "wholesale") {
        localStorage.setItem("last_registration_type", "wholesale");
        localStorage.setItem("last_wholesale_type", wholesaleType);
      } else {
        localStorage.removeItem("last_registration_type");
        localStorage.removeItem("last_wholesale_type");
      }
    }
  }, [searchParams, wholesaleType]);

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    companyName: "",
    addressLine1: "",
    addressLine2: "",
    suburb: "",
    postalCode: "",
    state: "",
    preferredContactMethod: "",
    businessType: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to get user info from Google");
        }

        const userInfo = await response.json();

        const authStore = useAuthStore.getState();

        if (typeof authStore.googleLogin !== "function") {
          console.error("Auth store functions:", Object.keys(authStore));
          throw new Error("Google login function not available");
        }

        // Use the current userType and wholesaleType from the form
        await authStore.googleLogin(
          userInfo,
          userType,
          wholesaleType
        );

        const userTypeText =
          userType === "wholesale"
            ? wholesaleType === "premium"
              ? "Premium Wholesaler"
              : "Essential Wholesaler"
            : "Retail Customer";

        toast.success(`✅ Successfully registered with Google as ${userTypeText}!`, {
          duration: 4000,
        });

        // Save user type to localStorage for future logins
        if (typeof window !== "undefined") {
          localStorage.setItem("last_registration_type", userType);
          if (userType === "wholesale") {
            localStorage.setItem("last_wholesale_type", wholesaleType);
          }
        }

        // Get current auth state to check approval status
        const currentAuth = useAuthStore.getState();
        const isWholesale = currentAuth.customer?.wholesale_type ||
          currentAuth.customer?.service_type?.includes("Wholesaler");
        const isApproved = currentAuth.customer?.approved === true ||
          currentAuth.customer?.status === "approved" ||
          currentAuth.customer?.approved === 1;

        // Redirect based on user type and approval status
        let redirectPath = "/";
        if (isWholesale) {
          if (isApproved) {
            redirectPath = "/wholesale";
          } else {
            redirectPath = "/pending";
          }
        }

        setTimeout(() => {
          window.location.href = redirectPath;
        }, 500);
      } catch (error: any) {
        console.error("Google registration error:", error);

        if (
          error.message.includes("EXISTING_EMAIL_PASSWORD_USER") ||
          error.message.includes("already exists") ||
          error.message.includes("email already exists")
        ) {
          // Check if it's a wholesale registration issue
          if (userType === "wholesale") {
            toast.error(
              "⚠️ A wholesale account with this email already exists. Please login with email and password."
            );
          } else {
            toast.error(
              "⚠️ An account with this email already exists. Please login with email and password."
            );
          }
        } else if (error.message.includes("Validation failed")) {
          toast.error(error.message);
        } else if (error.message.includes("Network error")) {
          toast.error(
            "Unable to connect to server. Please check your internet connection."
          );
        } else if (error.message.includes("function not available")) {
          toast.error("Authentication system error. Please refresh the page.");
        } else {
          toast.error(error.message || "Google authentication failed");
        }
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google OAuth error:", error);
      if (error?.error === "access_denied") {
        toast.error("Google signup was cancelled.");
      } else {
        toast.error("Google authentication failed. Please try again.");
      }
      setLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userType === "wholesale") {
      if (!formData.preferredContactMethod) {
        toast.error("Please select a preferred contact method");
        return;
      }
      if (!formData.businessType) {
        toast.error("Please select New or Existing Business");
        return;
      }
      if (!formData.state) {
        toast.error("Please select a State");
        return;
      }
    }


    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password should be at least 8 characters long");
      return;
    }

    if (!formData.agreeToTerms) {
      toast.error("Please agree to Terms & Conditions");
      return;
    }

    setLoading(true);

    try {
      const nameParts = formData.fullName.trim().split(/\s+/);
      const firstname = nameParts[0] || "";
      const lastname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      const registrationData: any = {
        firstname: firstname,
        lastname: lastname,
        email: formData.email,
        username: formData.email,
        password: formData.password,
        telephone: formData.phoneNumber || "",
        address_line1: formData.addressLine1 || "",
        address_line2: formData.addressLine2 || "",
        suburb: formData.suburb || "",
        postal_code: formData.postalCode || "",
        state: formData.state || "",
      };

      if (userType === "wholesale") {
        registrationData.company_name =
          formData.companyName || `${firstname}'s Company`;
        registrationData.preferred_contact_method =
          formData.preferredContactMethod;
        registrationData.business_type = formData.businessType;
        registrationData.wholesale_type =
          wholesaleType === "premium" ? "premium" : "essential";
        registrationData.service_type =
          wholesaleType === "premium"
            ? "Full Service Wholesaler"
            : "Half Service";
      }

      await register(registrationData);

      // Save user type for future Google logins
      if (typeof window !== "undefined") {
        localStorage.setItem("last_registration_type", userType);
        if (userType === "wholesale") {
          localStorage.setItem("last_wholesale_type", wholesaleType);
        }

        // Also update google_user_data if it exists
        const googleData = localStorage.getItem("google_user_data");
        if (googleData) {
          const parsed = JSON.parse(googleData);
          parsed.userType = userType;
          parsed.wholesaleType =
            userType === "wholesale" ? wholesaleType : null;
          localStorage.setItem("google_user_data", JSON.stringify(parsed));
        }
      }

      // Get current auth state
      const currentAuth = useAuthStore.getState();
      const isWholesale = currentAuth.customer?.wholesale_type ||
        currentAuth.customer?.service_type?.includes("Wholesaler");
      const isApproved = currentAuth.customer?.approved === true ||
        currentAuth.customer?.status === "approved" ||
        currentAuth.customer?.approved === 1;

      if (isWholesale) {
        if (isApproved) {
          toast.success("✅ Wholesale account created successfully!", {
            duration: 4000,
          });
          router.push("/wholesale");
        } else {
          toast.success("✅ Wholesale account created! Pending approval.", {
            duration: 4000,
          });
          router.push("/pending");
        }
      } else {
        toast.success("✅ Registration successful!", {
          duration: 4000,
        });
        router.push("/");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      const errorMsg = error.message || error.response?.data?.message || "Registration failed";

      if (
        errorMsg.includes("User already exists") ||
        errorMsg.includes("email already exists") ||
        errorMsg.includes("EXISTING_EMAIL_PASSWORD_USER")
      ) {
        toast.error("This email already exists. Please login with your password.");
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Render registration page
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-black items-start justify-center overflow-hidden">
        <Image
          src="/assets/sndurex/Group 164 (2).png"
          alt="St. Dreux Coffee Registration"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent z-10" />
        <div className="absolute top-20 left-0 right-0 z-20 text-center px-8">
          <h1
            className="text-white font-script text-7xl mb-2"
            style={{ fontFamily: "cursive" }}
          >
            St. Dreux
          </h1>
          <p className="text-white tracking-[0.5em] text-sm font-light uppercase">
            COFFEE
          </p>
        </div>
      </div>

      <div
        className={`w-full lg:w-1/2 flex items-center justify-center px-8 py-12 overflow-y-auto ${userType === "wholesale" ? "bg-white" : "bg-white"
          }`}
      >
        <div className="w-full max-w-md">
          <div className="flex gap-0 mb-8 border-b border-gray-200">
            <button
              type="button"
              onClick={() => {
                setUserType("customer");
                localStorage.removeItem("last_registration_type");
                localStorage.removeItem("last_wholesale_type");
              }}
              className={`flex-1 py-3 px-6 font-medium transition-colors rounded-t-lg ${userType === "customer"
                ? "bg-[#031881] text-white"
                : "bg-[#F5F5F0] text-gray-600 hover:bg-gray-50"
                }`}
            >
              Retail Customers
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType("wholesale");
                localStorage.setItem("last_registration_type", "wholesale");
                localStorage.setItem("last_wholesale_type", wholesaleType);
              }}
              className={`flex-1 py-3 px-6 font-medium transition-colors rounded-t-lg ${userType === "wholesale"
                ? "bg-[#031881] text-white"
                : "bg-[#F5F5F0] text-gray-600 hover:bg-gray-50"
                }`}
            >
              Wholesale
            </button>
          </div>

          {userType === "wholesale" && (
            <div className="mb-6">
              <label
                className={`block mb-2 font-medium ${userType === "wholesale" ? "text-black" : "text-gray-700"
                  }`}
              >
                Premium or Essential Wholesaler
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWholesaleType("premium");
                    localStorage.setItem("last_wholesale_type", "premium");
                  }}
                  className={`flex-1 py-2 px-4 font-medium transition-colors rounded-lg ${wholesaleType === "premium"
                    ? "bg-[#2952E6] text-white"
                    : "bg-[#0F2C5C] text-white/70 hover:bg-[#1e3a6b]"
                    }`}
                >
                  Premium
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWholesaleType("essential");
                    localStorage.setItem("last_wholesale_type", "essential");
                  }}
                  className={`flex-1 py-2 px-4 font-medium transition-colors rounded-lg ${wholesaleType === "essential"
                    ? "bg-[#2952E6] text-white"
                    : "bg-[#0F2C5C] text-white/70 hover:bg-[#1e3a6b]"
                    }`}
                >
                  Essential
                </button>
              </div>
              <p
                className={`text-sm mt-2 ${userType === "wholesale" ? "text-black" : "text-gray-500"
                  }`}
              >
                {wholesaleType === "premium"
                  ? "Premium Wholesaler"
                  : "Essential Wholesaler"}
              </p>
            </div>
          )}

          <div className="mb-8">
            <h2
              className={`text-3xl font-bold mb-6 ${userType === "wholesale" ? "text-black" : "text-gray-900"
                }`}
            >
              Register as{" "}
              {userType === "wholesale"
                ? wholesaleType === "premium"
                  ? "Premium Wholesaler"
                  : "Essential Wholesaler"
                : "Retail Customer"}
            </h2>
          </div>

          <div className="space-y-3 mb-6">
            {userType !== "wholesale" && (
              <Button
                type="button"
                variant="outline"
                className="w-full py-6 border-2 rounded-lg font-medium flex items-center justify-center gap-3 border-gray-300 hover:bg-gray-50"
                onClick={() => {
                  if (!loading) {
                    googleLogin();
                  }
                }}
                disabled={loading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign up with Google
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {userType === "wholesale" ? (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <Input
                  type="text"
                  placeholder="Company Name"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  className="px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            ) : (
              <div>
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="tel"
                placeholder="Phone Number"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                className="px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <Input
                type="text"
                placeholder={
                  userType === "wholesale" ? "Address Line 1" : "Address"
                }
                value={formData.addressLine1}
                onChange={(e) =>
                  setFormData({ ...formData, addressLine1: e.target.value })
                }
                className="w-full px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {userType === "wholesale" && (
              <div>
                <Input
                  type="text"
                  placeholder="Address Line 2 (Optional)"
                  value={formData.addressLine2}
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine2: e.target.value })
                  }
                  className="w-full px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {userType === "customer" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Suburb"
                    value={formData.suburb}
                    onChange={(e) =>
                      setFormData({ ...formData, suburb: e.target.value })
                    }
                    className="w-full px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <Input
                    type="text"
                    placeholder="Postal Code"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    className="w-full px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <Select
                    value={formData.state}
                    onValueChange={(value) =>
                      setFormData({ ...formData, state: value })
                    }
                  >
                    <SelectTrigger className="w-full px-4 py-6 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="State" />
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
            )}

            {userType === "wholesale" && (
              <>
                <div>
                  <Input
                    type="text"
                    placeholder="Suburb"
                    value={formData.suburb}
                    onChange={(e) =>
                      setFormData({ ...formData, suburb: e.target.value })
                    }
                    className="w-full px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="text"
                    placeholder="Postal Code"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    className="px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <Select
                    value={formData.state}
                    onValueChange={(value) =>
                      setFormData({ ...formData, state: value })
                    }
                  >
                    <SelectTrigger className="px-4 py-6 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="State" />
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
              </>
            )}

            {userType === "wholesale" && (
              <>
                <div>
                  <Select
                    value={formData.preferredContactMethod}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        preferredContactMethod: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-full px-4 py-6 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Nominate preferred contact method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    value={formData.businessType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, businessType: value })
                    }
                  >
                    <SelectTrigger className="w-full px-4 py-6 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="New or Existing Business" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Existing">Existing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


              </>
            )}

            {userType === "wholesale" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="px-4 py-6 pr-12 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re - Enter Password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="px-4 py-6 pr-12 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs mt-1 text-gray-500">
                  Password should at least be 8 characters long
                </p>
              </>
            ) : (
              <>
                <div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-4 py-6 pr-12 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs mt-1 text-gray-500">
                    Password should at least be 8 characters long
                  </p>
                </div>
                <div>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re - Enter Password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-6 pr-12 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, agreeToTerms: checked as boolean })
                }
              />
              <label
                htmlFor="terms"
                className="text-sm text-gray-600"
              >
                {userType === "wholesale" ? (
                  <>
                    I agree to all{" "}
                    <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">
                      Terms
                    </Link>
                    ,{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <Link href="/fees" target="_blank" className="text-blue-600 hover:underline">
                      Fees
                    </Link>
                  </>
                ) : (
                  <>
                    I agree to all{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-blue-500 hover:underline"
                    >
                      Terms & Conditions
                    </Link>
                    ,{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-blue-500 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </>
                )}
              </label>
            </div>

            <Button
              type="submit"
              className="w-full py-6 bg-[#2952E6] hover:bg-[#1e3fb3] text-white font-semibold rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <p
            className="text-center mt-6 text-gray-600"
          >
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-semibold hover:underline text-[#2952E6]"
            >
              login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
