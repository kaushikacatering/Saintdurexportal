"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function WholesaleInfoPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Wholesale Partnership</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Partner with St. Dreux Coffee to offer premium coffee products to your customers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 text-blue-600">Premium Wholesale</h3>
              <ul className="text-left space-y-3 mb-6">
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✓</span>
                  Full service support
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✓</span>
                  Dedicated account manager
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✓</span>
                  Equipment Options
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✓</span>
                  Custom branding options
                </li>
              </ul>
              <Button asChild className="w-full bg-[#031881] hover:bg-[#021466]">
                <Link href="/auth/register?type=wholesale&plan=premium">
                  Apply for Premium
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 text-green-600">Essential Wholesale</h3>
              <ul className="text-left space-y-3 mb-6">
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✓</span>
                  Standard wholesale pricing
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✓</span>
                  Online order management
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✓</span>
                  Bulk order discounts
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-green-500">✓</span>
                  Email support
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full bg-[#031881] text-white  hover:bg-[#021466] hover:text-white  ">
                <Link href="/auth/register?type=wholesale&plan=essential">
                  Apply for Essential
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-gray-50 rounded-2xl p-8 mb-12">
        <h2 className="text-3xl font-bold mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Apply Online</h3>
            <p className="text-gray-600">
              Complete our wholesale application form with your business details
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">2</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Get Approved</h3>
            <p className="text-gray-600">
              Our team reviews your application (usually within 2-3 business days)
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">3</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Start Ordering</h3>
            <p className="text-gray-600">
              Access the wholesale portal and place your first order
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to Partner With Us?</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/auth/register?type=wholesale">
              Apply for Wholesale Account
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/contact">
              Contact Sales Team
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}