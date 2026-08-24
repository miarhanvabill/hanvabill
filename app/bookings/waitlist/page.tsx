import { getWaitlist } from "@/app/actions/waitlist"
import { getCustomers } from "@/app/actions/customers"
import { getStaff } from "@/app/actions/staff"
import { WaitlistClient } from "./waitlist-client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Waitlist | Manage",
  description: "Manage smart waitlist",
}

export default async function WaitlistPage() {
  const waitlist = await getWaitlist()
  const customers = await getCustomers()
  const staff = await getStaff()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Smart Waitlist</h2>
      </div>
      <WaitlistClient 
        initialWaitlist={waitlist} 
        customers={customers} 
        staff={staff} 
      />
    </div>
  )
}
