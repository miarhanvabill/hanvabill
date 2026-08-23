import { Metadata } from "next"
import { getSubscription, getBillingHistory } from "@/app/actions/tenant-billing"
import { BillingClient } from "./billing-client"
import { ErrorBoundary } from "react-error-boundary"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Plans & Billing | Salon Management",
  description: "Manage your subscription plan and billing history.",
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error Loading Billing Info</AlertTitle>
      <AlertDescription>
        There was a problem loading your billing data. Please try again later.
        <br />
        <span className="text-xs opacity-50">{error.message}</span>
      </AlertDescription>
    </Alert>
  )
}

export default async function BillingPage() {
  let subscription = null
  let history = []
  
  try {
    const rawSub = await getSubscription()
    subscription = rawSub ? JSON.parse(JSON.stringify(rawSub)) : null
    
    const rawHistory = await getBillingHistory()
    history = rawHistory ? JSON.parse(JSON.stringify(rawHistory)) : []
  } catch (err) {
    console.error("Error fetching billing details", err)
    // Error boundary will catch if we re-throw, but let's just pass null/[] if the tables aren't created yet for the mock env.
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <BillingClient subscription={subscription} history={history} />
      </ErrorBoundary>
    </div>
  )
}
