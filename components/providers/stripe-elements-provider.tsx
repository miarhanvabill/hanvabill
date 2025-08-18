"use client"

import { useMemo } from "react"
import { Elements, type Appearance, type StripeElementsOptions } from "@stripe/react-stripe-js"
import { stripePromise } from "@/lib/stripe"

export default function StripeElementsProvider({ children }: { children: React.ReactNode }) {
  // Keep options stable with useMemo; you may vary appearance but do not change `stripe`
  const options: StripeElementsOptions = useMemo(() => {
    const appearance: Appearance = {
      theme: "stripe",
      variables: { colorPrimary: "#4f46e5" },
    }
    return { appearance, locale: "en" }
  }, [])

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  )
}
