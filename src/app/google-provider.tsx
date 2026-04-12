"use client"

import { GoogleOAuthProvider } from '@react-oauth/google'

interface GoogleProviderProps {
  children: React.ReactNode
}

export function GoogleProvider({ children }: GoogleProviderProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!clientId) {
    console.warn('Google OAuth client ID not found. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable.')
    return <>{children}</>
  }

  return (
    <GoogleOAuthProvider 
      clientId={clientId}
      onScriptLoadError={() => console.error('Google OAuth script failed to load')}
      onScriptLoadSuccess={() => console.log('Google OAuth script loaded successfully')}
    >
      {children}
    </GoogleOAuthProvider>
  )
}