"use client"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-16">
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="text-5xl font-bold text-gray-900 text-center mb-4">
          Privacy Policy
        </h1>
        <p className="text-center text-gray-600 mb-12">
          Last updated 14 Oct, 2025
        </p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Information We Collect
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We collect information that you provide directly to us, including when you create an account, place an order, subscribe to our newsletter, or contact us. This may include your name, email address, phone number, shipping address, payment information, and other details necessary to process your orders.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              How We Use Your Information
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>To process and fulfill your orders</li>
              <li>To communicate with you about your orders, account, or our services</li>
              <li>To send you marketing communications (with your consent)</li>
              <li>To improve our website and services</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Information Sharing
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We do not sell your personal information. We may share your information with service providers who assist us in operating our website, processing payments, shipping orders, or conducting business. These third parties are required to protect your information and use it only for the purposes we specify.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Data Security
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Cookies and Tracking
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your Rights
            </h2>
            <p className="text-gray-700 leading-relaxed">
              You have the right to access, update, or delete your personal information. You may also opt-out of marketing communications at any time. To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Contact Us
            </h2>
            <p className="text-gray-700 leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact us through our website contact form or email us directly.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

