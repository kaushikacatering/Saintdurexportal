"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function AboutPage() {
  const [currentStep, setCurrentStep] = useState(0)

  const roastingSteps = [
    {
      title: "Sourcing & Green-bean Inspection",
      description: "We start with carefully selected lots — single origins and trusted microlots. Each shipment is inspected for uniformity, moisture, and cup potential before we ever roast a batch.",
      image: "/assets/sndurex/Image (26).png"
    },
    {
      title: "Roasting Process",
      description: "Our roasters carefully monitor temperature curves and development time to bring out the best characteristics of each bean origin. We roast in small batches to ensure consistency and profile accuracy.",
      image: "/assets/sndurex/Frame 1000007202.png"
    },
    {
      title: "Quality Control",
      description: "Every batch is cupped and evaluated to ensure consistency and quality before packaging. We adhere to strict quality standards to ensure every bag meets our premium requirements.",
      image: "/assets/sndurex/Rectangle 180.png"
    },
    {
      title: "Packaging & Delivery",
      description: "We package our coffee immediately after roasting to preserve freshness. Our logistics team ensures that your order arrives promptly, ready for you to enjoy the perfect cup.",
      image: "/assets/sndurex/Rectangle 180 (1).png"
    }
  ]

  const nextStep = () => {
    setCurrentStep((prev) => (prev + 1) % roastingSteps.length)
  }

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + roastingSteps.length) % roastingSteps.length)
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[600px] sm:h-[700px] bg-black">
        <div className="absolute inset-0">
          <Image
            src="/assets/sndurex/Wireframe - 37.png"
            alt="The St. Dreux Story"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        </div>
        <div className="relative container mx-auto px-6 h-full flex items-center">
          <div className="max-w-2xl text-white">
            <p className="text-lg sm:text-xl mb-3 font-light italic" style={{ color: '#C4A484' }}>People. Passion. Purpose.</p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6">
              The St. Dreux Story
            </h1>
            <p className="text-xl mb-8 text-white/90">
              Crafted with passion, enjoyed in sip. Taste the difference.
            </p>
            <Link href="/contact">
              <Button size="lg" className="bg-[#031881] hover:bg-[#021466] text-white px-8 py-6 text-lg">
                Get in Touch
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-gray-700 leading-relaxed text-lg mb-6">
              At St. Dreux Coffee, everything starts with <span className="font-semibold italic" style={{ color: '#C4A484' }}>passion</span> — for people, for craft, and for the perfect cup. With decades of experience and a love for coffee's rich heritage, we bring together growers, baristas, and café owners to create something truly special.
            </p>
            <p className="text-gray-700 leading-relaxed text-lg mb-6">
              Rooted in integrity and creativity, we build lasting partnerships and a community that shares our love for great coffee. Inspired by St. Dreux, the patron saint of coffeehouses, we carry forward his spirit of devotion and purpose — one cup at a time.
            </p>
          </div>
        </div>
      </section>

      {/* Our Roasting Process Section */}
      <section className="py-20 bg-[#031881]">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Image */}
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden order-2 lg:order-1 bg-black/10">
              <Image
                key={currentStep} // Force re-render animation
                src={roastingSteps[currentStep].image}
                alt={roastingSteps[currentStep].title}
                fill
                className="object-cover transition-opacity duration-500"
              />
            </div>

            {/* Content */}
            <div className="text-white order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex gap-1">
                  {roastingSteps.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentStep ? 'bg-white w-4' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-sm mb-2 text-white/80 italic">Our Roasting Process</p>
              <h2 className="text-4xl font-bold mb-6">
                {roastingSteps[currentStep].title}
              </h2>
              <p className="text-white/90 mb-8 leading-relaxed min-h-[100px]">
                {roastingSteps[currentStep].description}
              </p>

              <div className="flex gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full bg-white text-[#031881] hover:bg-white/90 border-0"
                  onClick={prevStep}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full bg-white text-[#031881] hover:bg-white/90 border-0"
                  onClick={nextStep}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values/Mission Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-8">
              Rooted in integrity and creativity
            </h2>
            <p className="text-gray-700 leading-relaxed text-lg mb-6">
              We build lasting partnerships and a community that shares our love for great coffee. Inspired by St. Dreux, the patron saint of coffee-holics, we carry forward his spirit of devotion and purpose — one cup at a time.
            </p>
            <Link href="/wholesale-info">
              <Button size="lg" className="bg-[#031881] hover:bg-[#021466] text-white px-8">
                Partner With Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

