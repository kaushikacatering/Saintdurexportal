

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

interface User {
  user_id: number;
  email: string;
  username: string;
  auth_level?: number;
}

interface AuthState {
  user: User | null;
  customer: any | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  googleLogin: (
    userInfo: any,
    userType?: "customer" | "wholesale",
    wholesaleType?: "premium" | "essential"
  ) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  verifyResetToken: (
    token: string
  ) => Promise<{ valid: boolean; email?: string }>;
  resetPassword: (token: string, password: string) => Promise<void>;
  setInitialized: (initialized: boolean) => void;
  isWholesaleApproved: () => boolean;
  checkUserExists: (email: string) => Promise<any>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      customer: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      login: async (username, password) => {
        try {
          set({ isLoading: true });
          const response = await api.post("/store/auth/login", {
            username,
            password,
          });
          const { token, user, customer } = response.data;

          if (!token) {
            throw new Error("No token received from server");
          }

          set({
            user,
            customer,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          if (typeof document !== "undefined") {
            const expires = new Date();
            expires.setTime(expires.getTime() + 4 * 60 * 60 * 1000);
            document.cookie = `caterly-auth=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
          }
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.message || error.response?.data?.message || "Login failed";
          throw new Error(message);
        }
      },

      register: async (data) => {
        try {
          set({ isLoading: true });

          // Check if user already exists with this email
          try {
            const checkResponse = await api.get(
              `/store/auth/check-user/${encodeURIComponent(data.email)}`
            );
            const existingUser = checkResponse.data;

            if (existingUser.user) {
              // User exists - check if they're trying to change user type
              const existingIsWholesale =
                existingUser.customer?.wholesale_type ||
                existingUser.customer?.service_type?.includes("Wholesaler");
              const newIsWholesale = data.wholesale_type || data.company_name;

              if (existingIsWholesale !== !!newIsWholesale) {
                // User is trying to change account type - provide specific error message
                if (existingIsWholesale) {
                  // Existing user is wholesale, trying to register as retail
                  throw new Error(
                    "You are already registered as a wholesale customer. You cannot register as a retail customer. Please contact support if you need to change your account type."
                  );
                } else {
                  // Existing user is retail, trying to register as wholesale
                  throw new Error(
                    "You are already registered as a retail customer. You cannot register as a wholesale customer. Please contact support if you need to change your account type."
                  );
                }
              }

              // If same type, allow registration (might be updating details)
            }
          } catch (checkError: any) {
            // If check fails with 404, user doesn't exist - that's fine
            if (checkError.response?.status !== 404) {
              console.warn("Error checking existing user:", checkError);
            }
          }

          const response = await api.post("/store/auth/register", data);
          const { token, user, customer } = response.data;

          if (token && typeof window !== "undefined") {
            set({
              user,
              customer,
              token,
              isAuthenticated: true,
              isLoading: false,
            });

            document.cookie = `caterly-auth=${token}; path=/; max-age=${60 * 60 * 4
              }; SameSite=Lax`;
          }
        } catch (error: any) {
          set({ isLoading: false });
          const message =
            error.message || error.response?.data?.message || "Registration failed";
          throw new Error(message);
        }
      },

      googleLogin: async (
        userInfo: any,
        userType: "customer" | "wholesale" = "customer",
        wholesaleType?: "premium" | "essential"
      ) => {
        try {
          set({ isLoading: true });
          const email = userInfo.email;
          const googleId = userInfo.id || email;

          const googlePassword = `google_oauth_${googleId}`;

          console.log(
            "Google login attempt for:",
            email,
            "User type:",
            userType,
            "Wholesale type:",
            wholesaleType
          );

          // STEP 1: Try to login with Google password (for users who previously used Google)
          try {
            console.log("Trying login with Google password...");
            const loginResponse = await api.post("/store/auth/login", {
              username: email,
              password: googlePassword,
            });

            const { token, user, customer } = loginResponse.data;

            if (token) {
              console.log("Login successful with Google password");
              set({
                user,
                customer,
                token,
                isAuthenticated: true,
                isLoading: false,
              });

              if (typeof document !== "undefined") {
                const expires = new Date();
                expires.setTime(expires.getTime() + 4 * 60 * 60 * 1000);
                document.cookie = `caterly-auth=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;

                localStorage.setItem(
                  "google_user_data",
                  JSON.stringify({
                    user,
                    customer,
                    token,
                    provider: "google",
                    userType: customer?.wholesale_type
                      ? "wholesale"
                      : "customer",
                    wholesaleType: customer?.wholesale_type || null,
                    loginTime: Date.now(),
                  })
                );
              }
              return;
            }
          } catch (loginError: any) {
            console.log(
              "Google password login failed:",
              loginError.response?.data?.message || loginError.message
            );

            // If user exists but password is wrong (email/password user), show error
            const errorMsg = loginError.message || loginError.response?.data?.message || "";
            if (
              errorMsg.includes("password") ||
              errorMsg.includes("incorrect") ||
              errorMsg.includes("invalid")
            ) {
              throw new Error(
                "An account with this email already exists. Please login with email and password."
              );
            }
          }

          // STEP 2: Check if user exists
          try {
            const checkResponse = await api.get(
              `/store/auth/check-user/${encodeURIComponent(email)}`
            );
            const existingUser = checkResponse.data;

            if (existingUser.user) {
              // User exists - check if they're trying to change user type
              const existingIsWholesale =
                existingUser.customer?.wholesale_type ||
                existingUser.customer?.service_type?.includes("Wholesaler");
              const newIsWholesale = userType === "wholesale";

              if (existingIsWholesale !== newIsWholesale) {
                // User is trying to change account type
                if (existingIsWholesale) {
                  throw new Error(
                    "You are already registered as a wholesale customer. You cannot register as a retail customer."
                  );
                } else {
                  throw new Error(
                    "You are already registered as a retail customer. You cannot register as a wholesale customer."
                  );
                }
              }

              // User exists with same type - throw error to use email/password
              throw new Error(
                "An account with this email already exists. Please login with email and password."
              );
            }
          } catch (checkError: any) {
            // If check fails with 404, user doesn't exist - that's fine
            if (checkError.response?.status !== 404) {
              console.warn("Error checking existing user:", checkError);
            }
          }

          // STEP 3: Register new user with Google
          const nameToSplit = (userInfo.name || email.split("@")[0] || "Google").trim();
          const nameParts = nameToSplit.split(/\s+/);
          const firstname = nameParts[0] || "Google";
          // Backend requires lastname — use firstname as fallback if no last name available
          const lastname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : firstname;

          const registrationData: any = {
            firstname: firstname,
            lastname: lastname,
            email: email,
            username: email,
            password: googlePassword,
            telephone: "",
            address_line1: "",
            address_line2: "",
            suburb: "",
            postal_code: "",
            state: "",
          };

          // Use the provided userType from the page
          if (userType === "wholesale") {
            console.log("Registering as wholesale customer");
            registrationData.company_name = userInfo.name
              ? userInfo.name + " Company"
              : "Google User Company";
            registrationData.preferred_contact_method = "Email";
            registrationData.business_type = "New Business";
            registrationData.wholesale_type =
              wholesaleType === "premium" ? "premium" : "essential";
            registrationData.service_type =
              wholesaleType === "premium"
                ? "Full Service Wholesaler"
                : "Half Service";
            registrationData.estimated_opening_date = null;
          }

          console.log("Registration data:", registrationData);

          const registerResponse = await api.post(
            "/store/auth/register",
            registrationData
          );
          const { token, user, customer } = registerResponse.data;

          if (!token) {
            throw new Error("Registration failed - no token received");
          }

          set({
            user,
            customer,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          if (typeof document !== "undefined") {
            const expires = new Date();
            expires.setTime(expires.getTime() + 4 * 60 * 60 * 1000);
            document.cookie = `caterly-auth=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;

            localStorage.setItem(
              "google_user_data",
              JSON.stringify({
                user,
                customer,
                token,
                provider: "google",
                userType: userType,
                wholesaleType:
                  userType === "wholesale" ? wholesaleType : null,
                loginTime: Date.now(),
              })
            );
          }
        } catch (error: any) {
          set({ isLoading: false });
          console.error("Google authentication error:", error);

          let errorMessage = "Google authentication failed";

          if (error.message.includes("already exists")) {
            errorMessage = `An account with this email already exists. Please login with email and password.`;
          } else if (error.message.includes("Network error")) {
            errorMessage = "Network error - unable to connect to server";
          } else {
            errorMessage = error.message || "Google authentication failed";
          }

          throw new Error(errorMessage);
        }
      },

      logout: () => {
        set({
          user: null,
          customer: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });

        if (typeof document !== "undefined") {
          document.cookie =
            "caterly-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          localStorage.removeItem("google_user_data");
          localStorage.removeItem("last_registration_type");
          localStorage.removeItem("last_wholesale_type");
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          let token = get().token;

          if (!token && typeof window !== "undefined") {
            try {
              const auth = localStorage.getItem("caterly-auth");
              if (auth) {
                const parsed = JSON.parse(auth);
                token = parsed.state?.token;
              }
            } catch (e) {
              console.warn("Failed to parse auth from localStorage:", e);
            }
          }

          if (!token && typeof window !== "undefined") {
            try {
              const googleData = localStorage.getItem("google_user_data");
              if (googleData) {
                const parsed = JSON.parse(googleData);
                const loginTime = parsed.loginTime || 0;
                const now = Date.now();
                const fourHours = 4 * 60 * 60 * 1000;

                if (now - loginTime < fourHours) {
                  token = parsed.token;
                  set({
                    user: parsed.user,
                    customer: parsed.customer,
                    token: parsed.token,
                    isAuthenticated: true,
                    isLoading: false,
                  });
                  return;
                } else {
                  localStorage.removeItem("google_user_data");
                }
              }
            } catch (e) {
              console.warn("Failed to parse Google data:", e);
            }
          }

          if (!token) {
            set({ isAuthenticated: false, isLoading: false });
            return;
          }

          const response = await api.get("/store/auth/me");
          set({
            user: response.data.user,
            customer: response.data.customer,
            isAuthenticated: true,
            token: token,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          const errorStatus = error?.response?.status;
          if (errorStatus === 401) {
            set({
              user: null,
              customer: null,
              token: null,
              isAuthenticated: false,
            });

            if (typeof document !== "undefined") {
              localStorage.removeItem("caterly-auth");
              localStorage.removeItem("google_user_data");
              document.cookie =
                "caterly-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            }
          }
        }
      },

      setInitialized: (initialized: boolean) => {
        set({ isInitialized: initialized });
      },

      isWholesaleApproved: () => {
        const state = get();
        if (!state.customer) return false;

        // Check if user is wholesale
        const isWholesale =
          state.customer.wholesale_type ||
          state.customer.service_type?.includes("Wholesaler");
        if (!isWholesale) return true; // Retail users are always "approved"

        // For wholesale users, check approval status
        return (
          state.customer.approved === true ||
          state.customer.status === "approved" ||
          state.customer.approved === 1
        );
      },

      checkUserExists: async (email: string) => {
        try {
          const response = await api.get(`/store/auth/check-user/${encodeURIComponent(email)}`);
          return response.data;
        } catch (error: any) {
          if (error.response?.status === 404) {
            return null; // User doesn't exist
          }
          throw error;
        }
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true });
        try {
          await api.post("/store/auth/forgot-password", { email });
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyResetToken: async (token: string) => {
        set({ isLoading: true });
        try {
          const response = await api.get("/store/auth/verify-reset-token", {
            params: { token },
          });
          set({ isLoading: false });
          return response.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true });
        try {
          await api.post("/store/auth/reset-password", { token, password });
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: "caterly-auth",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setInitialized(true);
        }
      },
    }
  )
);
