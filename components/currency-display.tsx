"use client"

import { useBusinessSettings } from "@/hooks/use-settings"
import { formatCurrency } from "@/lib/currency"

interface CurrencyDisplayProps {
  amount: number
  className?: string
}

export function CurrencyDisplay({ amount, className }: CurrencyDisplayProps) {
  const businessSettings = useBusinessSettings()

  return <span className={className}>{formatCurrency(amount, businessSettings.currency)}</span>
}
