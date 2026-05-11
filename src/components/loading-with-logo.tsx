"use client"

import Image from "next/image"

interface LoadingWithLogoProps {
  readonly message?: string
  readonly size?: "sm" | "md" | "lg"
}

export function LoadingWithLogo({ message = "Loading...", size = "md" }: LoadingWithLogoProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }

  const logoSize = {
    sm: 40,
    md: 60,
    lg: 80,
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="relative">
        {/* Animated background circle */}
        <div className={`${sizeClasses[size]} rounded-full border-4 border-[#031881]/20 animate-pulse`} />
        
        {/* Logo with rotation animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin-slow">
            <Image
              src="/assets/images/logo.png"
              alt="Loading"
              width={logoSize[size]}
              height={logoSize[size]}
              className="object-contain opacity-80"
              priority
            />
          </div>
        </div>
      </div>
      
      {/* Loading text */}
      <div className="text-center">
        <p className="text-gray-600 font-medium text-lg animate-pulse">{message}</p>
        <div className="flex justify-center gap-1 mt-2">
          <div className="w-2 h-2 bg-[#031881] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-[#031881] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-[#031881] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  )
}

