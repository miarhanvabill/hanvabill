import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TermsOfServicePage() {
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

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using the Hanva Billing software and services (the "Service") provided by Hanva Technologies Pvt Ltd ("we," "us," or "our"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              Hanva Billing is a SaaS (Software as a Service) platform designed for salon and business management, including invoicing, inventory, customer management, and messaging integrations. We reserve the right to modify, suspend, or discontinue the Service at any time, with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Account Responsibilities</h2>
            <p>
              When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Multi-Tenant and Data Security</h2>
            <p>
              Your data is isolated securely using multi-tenant architecture. However, you are strictly prohibited from attempting to access, manipulate, or interfere with data belonging to other tenants. Any violation will result in immediate termination of your account and potential legal action.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Third-Party Integrations (WhatsApp)</h2>
            <p>
              Our Service allows integration with third-party platforms such as WhatsApp through authorized resellers. We are not responsible for the uptime, compliance, or terms of service of these third-party platforms. You agree to comply with Meta's Commerce and Business Policies when utilizing our messaging integrations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Payment and Subscription</h2>
            <p>
              Certain aspects of the Service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis (Billing Cycle). At the end of each Billing Cycle, your Subscription will automatically renew under the exact same conditions unless you or we cancel it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
            <p>
              In no event shall Hanva Technologies Pvt Ltd, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at support@hanva.in.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
