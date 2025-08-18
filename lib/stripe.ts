import { loadStripe, type Stripe } from "@stripe/stripe-js"

// Create ONE stable promise for the entire app
const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
if (!pk) {
  // Optional: throw to catch misconfig at build time
  // throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing")
}

// Do not put this inside a React component
export const stripePromise: Promise<Stripe | null> = loadStripe(pk || "")
