import { Metadata } from "next"
import { getSubscription, getBillingHistory } from "@/app/actions/tenant-billing"
import { BillingClient } from "./billing-client"

export const metadata: Metadata = {
  title: "Plans & Billing | Salon Management",
  description: "Manage your subscription plan and billing history.",
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
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <BillingClient subscription={subscription} history={history} />
    </div>
  )
}
