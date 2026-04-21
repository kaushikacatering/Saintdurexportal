import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the token from cookies
  const token = request.cookies.get('caterly-auth')?.value
  
  // Only protect specific routes
  const protectedRoutes = ['/wholesale', '/shop', '/cart', '/checkout']
  const currentPath = request.nextUrl.pathname
  
  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    currentPath.startsWith(route)
  )
  
  if (isProtectedRoute && token) {
    // In real implementation, you would decode the JWT token
    // and check if user is an unapproved wholesaler
    // For now, we'll rely on client-side checks
  }
  
  const response = NextResponse.next()

  // Prevent server-level caching for HTML pages (fixes LiteSpeed/cPanel cache issues)
  if (!currentPath.startsWith('/_next/static')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/wholesale/:path*',
    '/shop/:path*',
    '/cart/:path*',
    '/checkout/:path*',
  ],
}