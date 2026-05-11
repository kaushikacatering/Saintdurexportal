

"use client";

import React, { useState, Suspense, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { login, logout, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

        // Check if user was previously registered as wholesale
        const existingGoogleData = localStorage.getItem("google_user_data");
        let userType: "customer" | "wholesale" = "customer";
        let wholesaleType: "premium" | "essential" | undefined = undefined;

        if (existingGoogleData) {
          try {
            const parsed = JSON.parse(existingGoogleData);
            const loginTime = parsed.loginTime || 0;
            const now = Date.now();
            const fourHours = 4 * 60 * 60 * 1000;

            if (now - loginTime < fourHours) {
              userType = parsed.userType || "customer";
              wholesaleType = parsed.wholesaleType;
              console.log("Found existing Google session data:", {
                userType,
                wholesaleType,
              });
            }
          } catch (e) {
            console.warn("Error parsing Google data:", e);
          }
        }

        console.log(
          "Google login attempt with userType:",
          userType,
          "wholesaleType:",
          wholesaleType
        );

        const authStore = useAuthStore.getState();

        if (typeof authStore.googleLogin !== "function") {
          console.error("Auth store functions:", Object.keys(authStore));
          throw new Error("Google login function not available in auth store");
        }

        try {
          await authStore.googleLogin(userInfo, userType, wholesaleType);

          // Check what type of user we actually logged in as and their approval status
          const currentAuth = useAuthStore.getState();
          const isWholesale =
            currentAuth.customer?.wholesale_type ||
            currentAuth.customer?.service_type?.includes("Wholesaler");
          const isApproved =
            currentAuth.customer?.approved === true ||
            currentAuth.customer?.status === "approved" ||
            currentAuth.customer?.approved === 1;

          let redirectPath = "/";
          let userTypeMessage = "Retail Customer";

          if (isWholesale) {
            userTypeMessage = `${
              currentAuth.customer?.wholesale_type || "Essential"
            } Wholesaler`;
            if (isApproved) {
              redirectPath = "/wholesale";
            } else {
              redirectPath = "/pending";
            }
          }

          console.log("Google login successful:", {
            isWholesale,
            isApproved,
            redirectPath,
            userTypeMessage,
          });

          // Show success message with longer duration
          toast.success(
            `Successfully signed in with Google as ${userTypeMessage}!`,
            {
              duration: 4000,
            }
          );

          // Override redirect if there's a specific redirect parameter, but only for approved users
          const finalRedirectPath =
            redirect &&
            redirect !== "/auth/login" &&
            redirect !== "/login" &&
            isApproved
              ? redirect
              : redirectPath;

          setTimeout(() => {
            window.location.href = finalRedirectPath;
          }, 500);
        } catch (error: any) {
          // Handle special cases
          if (error.message.includes("already exists")) {
            // Check if it's the modified email success case
            if (
              error.message.includes("GOOGLE_LOGIN_SUCCESS_WITH_MODIFIED_EMAIL")
            ) {
              const message =
                error.message.split(":")[1] ||
                "Google login successful with modified email!";
              toast.success(message);

              const redirectPath =
                redirect && redirect !== "/auth/login" && redirect !== "/login"
                  ? redirect
                  : "/";
              setTimeout(() => {
                window.location.href = redirectPath;
              }, 300);
            } else {
              // Regular "already exists" error
              toast.error(
                error.message ||
                  "An account with this email already exists. Please login with email and password."
              );
            }
          } else {
            // Re-throw other errors
            throw error;
          }
        }
      } catch (error: any) {
        console.error("Google login error:", error);

        if (
          error.message.includes("already exists") &&
          !error.message.includes("GOOGLE_LOGIN_SUCCESS_WITH_MODIFIED_EMAIL")
        ) {
          toast.error(
            "An account with this email already exists. Please login with email and password, or use a different Google account."
          );
        } else if (error.message.includes("Validation failed")) {
          toast.error(error.message);
        } else if (error.message.includes("Network error")) {
          toast.error(
            "Unable to connect to server. Please check your internet connection."
          );
        } else if (error.message.includes("function not available")) {
          toast.error(
            "Authentication system error. Please refresh the page and try again."
          );
        } else if (
          error.message.includes("GOOGLE_LOGIN_SUCCESS_WITH_MODIFIED_EMAIL")
        ) {
          // Already handled above
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
        toast.error("Google login was cancelled or access denied.");
      } else {
        toast.error("Google authentication failed. Please try again.");
      }
      setLoading(false);
    },
  });

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Wait for Zustand store to rehydrate from localStorage
      if (!useAuthStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useAuthStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }

      const authState = useAuthStore.getState();
      if (authState.isAuthenticated && authState.token) {
        // Determine redirect based on user type and approval status
        const isWholesale =
          authState.customer?.wholesale_type ||
          authState.customer?.service_type?.includes("Wholesaler");
        const isApproved =
          authState.customer?.approved === true ||
          authState.customer?.status === "approved" ||
          authState.customer?.approved === 1;

        let redirectPath = "/";
        if (isWholesale) {
          if (isApproved) {
            redirectPath = "/wholesale";
          } else {
            redirectPath = "/pending";
          }
        }

        // Override with redirect param only for approved users
        const finalRedirectPath =
          redirect &&
          redirect !== "/auth/login" &&
          redirect !== "/login" &&
          isApproved
            ? redirect
            : redirectPath;
        router.push(finalRedirectPath);
        return;
      }

      // Only logout if store is hydrated and there's genuinely no auth
      // Don't call logout() blindly — it would clear a valid token that hasn't loaded yet
    };

    checkAuthAndRedirect();
  }, [router, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.username, formData.password);

      const authState = useAuthStore.getState();
      if (!authState.isAuthenticated || !authState.token) {
        throw new Error("Login failed - authentication state not set");
      }

      await new Promise((resolve) => setTimeout(resolve, 800));

      // Check user type and approval status for redirection
      const isWholesale =
        authState.customer?.wholesale_type ||
        authState.customer?.service_type?.includes("Wholesaler");
      const isApproved =
        authState.customer?.approved === true ||
        authState.customer?.status === "approved" ||
        authState.customer?.approved === 1;

      let redirectPath = "/";
      let userTypeMessage = "Retail Customer";

      if (isWholesale) {
        userTypeMessage = `${
          authState.customer?.wholesale_type || "Essential"
        } Wholesaler`;
        if (isApproved) {
          redirectPath = "/wholesale";
        } else {
          redirectPath = "/pending";
        }
      }

      toast.success(`Login successful as ${userTypeMessage}!`);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("just-logged-in", "true");
        // Store user type for future Google logins
        const googleData = localStorage.getItem("google_user_data");
        if (googleData) {
          const parsed = JSON.parse(googleData);
          parsed.userType = isWholesale ? "wholesale" : "customer";
          parsed.wholesaleType = isWholesale
            ? authState.customer?.wholesale_type === "Premium"
              ? "premium"
              : "essential"
            : null;
          localStorage.setItem("google_user_data", JSON.stringify(parsed));
        }
      }

      // Override redirect if there's a specific redirect parameter, but only for approved users
      const finalRedirectPath =
        redirect &&
        redirect !== "/auth/login" &&
        redirect !== "/login" &&
        isApproved
          ? redirect
          : redirectPath;

      setTimeout(() => {
        window.location.href = finalRedirectPath;
      }, 300);
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage =
        error?.message ||
        error.response?.data?.message ||
        "Login failed. Please check your credentials.";
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const isButtonDisabled = loading || isLoading;

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#1a1a1a] items-center justify-center overflow-hidden">
        <Image
          src="/assets/sndurex/Frame 1000007200.png"
          alt="St. Dreux Coffee"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-transparent z-10" />
        <div className="relative z-20 text-center px-8">
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

      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-[#F5F5F0]">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Login</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                type="text"
                placeholder="Email Address"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full px-4 py-6 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isButtonDisabled}
              />
            </div>

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
                  disabled={isButtonDisabled}
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
              <div className="mt-2 text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-[#031881] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-6 bg-[#031881] hover:bg-[#1a3a9e] text-white font-semibold rounded-lg transition-colors"
              disabled={isButtonDisabled}
            >
              {isButtonDisabled ? "Processing..." : "Log in"}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full py-6 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-3"
              onClick={() => {
                if (!isButtonDisabled) {
                  googleLogin();
                }
              }}
              disabled={isButtonDisabled}
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
              Sign in with Google
            </Button>

            {/* <Button
              type="button"
              className="w-full py-6 bg-black hover:bg-gray-900 text-white font-medium rounded-lg flex items-center justify-center gap-3"
              disabled={isButtonDisabled}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Sign up with Apple
            </Button> */}
          </div>

          <p className="text-center text-gray-600 mt-8">
            Not a member yet?{" "}
            <Link
              href="/auth/register"
              className="text-[#031881] font-semibold hover:underline"
            >
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
