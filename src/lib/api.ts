import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.stdreux.com.au/"

// Log API URL and warn if using localhost in production
if (typeof window !== "undefined") {
  if (process.env.NODE_ENV === "development") {
    console.log("🔗 API Base URL:", API_URL)
  } else if (API_URL.includes("localhost") || API_URL.includes("127.0.0.1")) {
    console.error("⚠️ WARNING: API URL is set to localhost in production!", {
      currentURL: API_URL,
      message: "Please set NEXT_PUBLIC_API_URL environment variable to your production API URL"
    })
  }
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (Zustand persist)
    if (typeof window !== "undefined") {
      let token: string | null = null

      // Try to get from Zustand persist storage (caterly-auth)
      const auth = localStorage.getItem("caterly-auth")
      if (auth) {
        try {
          const parsed = JSON.parse(auth)
          // Zustand persist format: { state: { token, ... }, version: 0 }
          token = parsed?.state?.token || null
        } catch (error) {
          // Parse error, try fallback
        }
      }

      // Fallback to old token format
      if (!token) {
        token = localStorage.getItem("token")
      }

      // Set Authorization header if we have a token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle token expiration and unauthorized errors
    if (error.response?.status === 401) {
      const errorMessage = error.response.data?.message || 'Session expired. Please login again.'

      // Clear auth state if token expired
      if (typeof window !== 'undefined') {
        // Import auth store dynamically to avoid circular dependency
        import('@/store/auth').then(({ useAuthStore }) => {
          useAuthStore.getState().logout()
        }).catch(() => {
          // Fallback: clear storage manually
          localStorage.removeItem('caterly-auth')
          localStorage.removeItem('token')
        })

        // Clear cookie
        document.cookie = 'caterly-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

        // Only redirect if not already on login/auth page and not a public API
        const currentPath = window.location.pathname
        const isPublicPath = currentPath.includes('/auth/') ||
          currentPath === '/' ||
          currentPath === '/products' ||
          currentPath === '/shop' ||
          currentPath.startsWith('/shop/') ||
          currentPath === '/about' ||
          currentPath === '/contact' ||
          currentPath === '/blogs' ||
          currentPath.startsWith('/blogs/') ||
          currentPath === '/privacy' ||
          currentPath === '/checkout' ||
          currentPath === '/cart' ||
          currentPath === '/payment' ||
          currentPath.includes('/invoice') ||
          currentPath === '/terms'

        // Don't redirect for public APIs (products, shop, etc.)
        const isPublicAPI = error.config?.url?.includes('/store/products') ||
          error.config?.url?.includes('/store/products/categories') ||
          error.config?.url?.includes('/store/blogs') ||
          error.config?.url?.includes('/public-view')

        if (!isPublicPath && !isPublicAPI && !currentPath.includes('/auth/login') && !currentPath.includes('/login')) {
          // Store intended destination
          const fullPath = currentPath + window.location.search
          if (fullPath !== '/auth/login' && fullPath !== '/login') {
            window.location.href = `/auth/login?redirect=${encodeURIComponent(fullPath)}`
          }
        }
      }

      // Return error with clear message
      return Promise.reject(new Error(errorMessage))
    }

    // Enhanced error logging for debugging
    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const message = error.response.data?.message || error.message

      // Log error for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ API Error [${status}]:`, {
          url: error.config?.url,
          method: error.config?.method,
          message,
        })
      }

      // Return user-friendly error message
      const userMessage = message || `Request failed with status ${status}`
      return Promise.reject(new Error(userMessage))
    } else if (error.request) {
      // Request was made but no response received
      const userMessage = 'Network error. Please check your connection and try again.'
      return Promise.reject(new Error(userMessage))
    } else {
      // Something else happened
      const userMessage = error.message || 'An unexpected error occurred. Please try again.'
      return Promise.reject(new Error(userMessage))
    }
  }
)


