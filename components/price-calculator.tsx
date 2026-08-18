"use client"

import { useBusinessSettings } from "@/hooks/use-settings"
import { calculateTotal } from "@/lib/currency"
import { CurrencyDisplay } from "./currency-display"

interface PriceCalculatorProps {
  subtotal: number
  className?: string
}

export function PriceCalculator({ subtotal, className }: PriceCalculatorProps) {
  const businessSettings = useBusinessSettings()

  const { tax, serviceCharge, total } = calculateTotal(
    subtotal,
    businessSettings.taxRate,
    businessSettings.serviceCharge,
  )

  return (
    <div className={className}>
      <div className="flex justify-between">
        <span>Subtotal:</span>
        <CurrencyDisplay amount={subtotal} />
      </div>

      {businessSettings.taxRate > 0 && (
        <div className="flex justify-between">
          <span>Tax ({businessSettings.taxRate}%):</span>
          <CurrencyDisplay amount={tax} />
        </div>
      )}

      {businessSettings.serviceCharge > 0 && (
        <div className="flex justify-between">
          <span>Service Charge ({businessSettings.serviceCharge}%):</span>
          <CurrencyDisplay amount={serviceCharge} />
        </div>
      )}

      <div className="flex justify-between font-bold border-t pt-2">
        <span>Total:</span>
        <CurrencyDisplay amount={total} />
      </div>
    </div>
  )
}
