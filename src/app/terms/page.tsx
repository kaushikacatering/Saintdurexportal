"use client"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-16">
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="text-5xl font-bold text-gray-900 text-center mb-4">
          Terms & Conditions
        </h1>
        <p className="text-center text-gray-600 mb-12">
          Last updated 14 Oct, 2025
        </p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Agreement Acceptance
            </h2>
            <p className="text-gray-700 leading-relaxed">
              By using this website and registering an account, you agree to these terms and conditions for product purchase, membership, or wholesale activity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Changes
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We may update these terms at any time. We will notify you of major changes, and continued use of the site constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Intellectual Property
            </h2>
            <p className="text-gray-700 leading-relaxed">
              All website content, logos, and trademarks remain the property of St. Dreux Coffee. Use without consent is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Limitation of Liability
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Our responsibility is limited to direct damages up to the value of the purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Governing Law
            </h2>
            <p className="text-gray-700 leading-relaxed">
              All activity on this site is governed by the laws of our jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              For Retail Customers
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Eligibility to purchase as individuals for personal use only.</li>
              <li>Standard payment, shipping, and return/refund policies apply as outlined above.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              For Club Members
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Additional terms relate to membership eligibility, fees, renewals, benefits, and conduct obligations.</li>
              <li>Membership can be suspended or terminated for breach of terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              For Wholesale Customers
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Agreement to minimum order quantities and wholesale pricing requirements.</li>
              <li>Special terms for business account creation, order placement, invoice payment, and returns.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

