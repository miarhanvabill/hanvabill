import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="pl-0 gap-2 hover:bg-transparent hover:text-primary">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Hanva Technologies Pvt Ltd ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and share information when you use our Hanva Billing software and services (the "Service").
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="mb-2">We collect several different types of information for various purposes to provide and improve our Service to you:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Personal Data:</strong> When signing up, we may ask for personally identifiable information such as your email address, first name, last name, phone number, and business details.</li>
              <li><strong>Customer Data:</strong> As a business owner, you may input data regarding your own customers (e.g., names, phone numbers for billing/WhatsApp). We act as a data processor for this information.</li>
              <li><strong>Usage Data:</strong> We may collect information on how the Service is accessed and used, including your IP address, browser type, and interaction metrics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Data</h2>
            <p className="mb-2">We use the collected data for various purposes:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide and maintain the Service</li>
              <li>To manage your account and subscription</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features (like WhatsApp integration)</li>
              <li>To provide customer care and support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Multi-Tenant Data Isolation</h2>
            <p>
              Your data is strictly partitioned at the database layer using Row-Level Security (RLS) to ensure that your business metrics, invoices, and customer lists are securely isolated and completely inaccessible to other tenants on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Third-Party Services</h2>
            <p>
              We may employ third-party companies to facilitate our Service, such as authentication providers (e.g., Clerk) and messaging APIs (e.g., Hanva/WhatsApp). These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Security</h2>
            <p>
              The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at support@hanva.in.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
