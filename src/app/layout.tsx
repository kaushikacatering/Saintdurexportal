import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { SessionManager } from "@/components/session-manager"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "St. Dreux Coffee - Premium Coffee & Tea",
  description: "Discover premium coffee and tea from St. Dreux Coffee. Shop our selection or become a wholesale partner.",
  icons: {
    icon: "/assets/images/logo.png",
    apple: "/assets/images/logo.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <SessionManager />
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster 
            position="top-right" 
            richColors
            closeButton
            duration={3000}
          />
        </Providers>
      </body>
    </html>
  )
}


