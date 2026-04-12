// "use client"

// import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
// import { useState } from "react"

// export function Providers({ children }: { children: React.ReactNode }) {
//   const [queryClient] = useState(() => new QueryClient())

//   return (
//     <QueryClientProvider client={queryClient}>
//       {children}
//     </QueryClientProvider>
//   )
// }
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { GoogleProvider } from "@/app/google-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <GoogleProvider>
        {children}
      </GoogleProvider>
    </QueryClientProvider>
  )
}

