"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore } from "@/store/auth"
import { toast } from "sonner"

// Session timeout: 2 days (172800 seconds) or 4 hours (14400 seconds) for JWT
const SESSION_TIMEOUT = 2 * 24 * 60 * 60 * 1000 // 2 days in milliseconds
const IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes of inactivity
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes

export function SessionManager() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, token, checkAuth, logout } = useAuthStore()
  const lastActivityRef = useRef<number>(Date.now())
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    // Listen to user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
    }
  }, [])

  // Check token expiration periodically
  useEffect(() => {
    // Don't check on auth pages
    if (pathname?.includes('/auth/')) {
      return
    }

    // Wait a bit for auth state to hydrate from localStorage before checking
    const initializeChecks = async () => {
      // Check if we just logged in - if so, wait longer and skip initial check
      const justLoggedIn = typeof window !== 'undefined' && sessionStorage.getItem('just-logged-in') === 'true'
      
      if (justLoggedIn) {
        // Clear the flag immediately but keep the value
        sessionStorage.removeItem('just-logged-in')
        // Wait longer after login to ensure everything is hydrated
        await new Promise(resolve => setTimeout(resolve, 3000))
      } else {
        // Normal wait for hydration
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      const currentAuth = useAuthStore.getState()
      if (!currentAuth.isAuthenticated || !currentAuth.token) {
        return
      }
      
      // Additional check: verify token is actually in localStorage
      const storedAuth = localStorage.getItem('caterly-auth')
      if (!storedAuth) {
        // Token not in localStorage, skip checks
        return
      }
      
      // If we just logged in, skip the initial check (let periodic checks handle it)
      if (justLoggedIn) {
        // Set up periodic checks but skip initial check
        const checkToken = async () => {
          try {
            const currentAuth = useAuthStore.getState()
            if (!currentAuth.token || !currentAuth.isAuthenticated) {
              return
            }

            const timeSinceActivity = Date.now() - lastActivityRef.current
            if (timeSinceActivity > IDLE_TIMEOUT) {
              logout()
              toast.info("You have been logged out due to inactivity")
              if (!pathname?.includes('/auth/')) {
                router.push('/auth/login')
              }
              return
            }

            await checkAuth()
            
            const currentState = useAuthStore.getState()
            if (!currentState.isAuthenticated || !currentState.token) {
              logout()
              if (!pathname?.includes('/auth/')) {
                router.push('/auth/login')
              }
              return
            }
          } catch (error: any) {
            const errorStatus = error?.response?.status
            if (errorStatus === 401) {
              logout()
              if (!pathname?.includes('/auth/')) {
                router.push('/auth/login')
              }
            }
          }
        }

        // Set up periodic checks (skip initial)
        tokenCheckIntervalRef.current = setInterval(checkToken, TOKEN_CHECK_INTERVAL)

        activityTimeoutRef.current = setInterval(() => {
          const currentAuth = useAuthStore.getState()
          const timeSinceActivity = Date.now() - lastActivityRef.current
          if (timeSinceActivity > IDLE_TIMEOUT && currentAuth.isAuthenticated) {
            logout()
            toast.info("You have been logged out due to inactivity")
            if (!pathname?.includes('/auth/')) {
              router.push('/auth/login')
            }
          }
        }, 60000)

        return
      }

      const checkToken = async () => {
        try {
          // Check if token exists and user is still authenticated
          const currentAuth = useAuthStore.getState()
          if (!currentAuth.token || !currentAuth.isAuthenticated) {
            return
          }

          // Check last activity time
          const timeSinceActivity = Date.now() - lastActivityRef.current
          if (timeSinceActivity > IDLE_TIMEOUT) {
            // User has been idle for too long - logout
            logout()
            toast.info("You have been logged out due to inactivity")
            if (!pathname?.includes('/auth/')) {
              router.push('/auth/login')
            }
            return
          }

          // Verify token is still valid by calling checkAuth
          await checkAuth()
          
          // Double-check authentication state after checkAuth
          const currentState = useAuthStore.getState()
          if (!currentState.isAuthenticated || !currentState.token) {
            logout()
            if (!pathname?.includes('/auth/')) {
              router.push('/auth/login')
            }
            return
          }
        } catch (error: any) {
          // Only logout if it's a 401 (unauthorized), not network errors or other issues
          const errorStatus = error?.response?.status
          if (errorStatus === 401) {
            // Token is invalid - logout
            logout()
            if (!pathname?.includes('/auth/')) {
              router.push('/auth/login')
            }
          }
          // For other errors (network, 500, etc.), don't logout - might be temporary
          // Just log for debugging
          if (process.env.NODE_ENV === 'development') {
            console.warn("Auth check failed (non-401):", error)
          }
        }
      }

      // Initial check (after hydration delay)
      checkToken()

      // Set up periodic checks
      tokenCheckIntervalRef.current = setInterval(checkToken, TOKEN_CHECK_INTERVAL)

      // Set up idle timeout check
      activityTimeoutRef.current = setInterval(() => {
        const currentAuth = useAuthStore.getState()
        const timeSinceActivity = Date.now() - lastActivityRef.current
        if (timeSinceActivity > IDLE_TIMEOUT && currentAuth.isAuthenticated) {
          logout()
          toast.info("You have been logged out due to inactivity")
          if (!pathname?.includes('/auth/')) {
            router.push('/auth/login')
          }
        }
      }, 60000) // Check every minute
    }

    initializeChecks()

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current)
      }
      if (activityTimeoutRef.current) {
        clearInterval(activityTimeoutRef.current)
      }
    }
  }, [pathname, checkAuth, logout, router])

  // Don't check auth on mount - let the periodic check handle it after hydration
  // This prevents immediate checks that might fail due to hydration timing

  return null // This component doesn't render anything
}

