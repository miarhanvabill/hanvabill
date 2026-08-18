// lib/currency.ts

export function formatCurrency(amount: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount ?? 0)
}

export function formatCurrencyCompact(amount: number): string {
  const v = Number(amount) || 0
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, "")

  if (v >= 10000000) return `₹${trim(v / 10000000)}Cr`
  if (v >= 100000) return `₹${trim(v / 100000)}L`
  if (v >= 1000) return `₹${trim(v / 1000)}K`
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

export function parseCurrency(value: string): number {
  if (!value) return 0
  const cleaned = value.replace(/[^\d.-]/g, "")
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

// Indian-numbering words
export function numberToWords(num: number): string {
  if (!Number.isFinite(num)) return "Zero"

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

  const two = (n: number): string => {
    if (n === 0) return ""
    if (n < 10) return ones[n]
    if (n < 20) return teens[n - 10]
    const t = Math.floor(n / 10)
    const o = n % 10
    return `${tens[t]}${o ? " " + ones[o] : ""}`.trim()
  }
  const three = (n: number): string => {
    if (n === 0) return ""
    const h = Math.floor(n / 100)
    const r = n % 100
    return [h ? `${ones[h]} Hundred` : "", two(r)].filter(Boolean).join(" ").trim()
  }

  const isNeg = num < 0
  const abs = Math.abs(Math.round(num))
  if (abs === 0) return "Zero"

  let n = abs
  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  const last = n

  const parts: string[] = []
  if (crore) parts.push(`${two(crore)} Crore`)
  if (lakh) parts.push(`${two(lakh)} Lakh`)
  if (thousand) parts.push(`${two(thousand)} Thousand`)
  if (last) parts.push(three(last))

  const words = parts.join(" ").trim() || "Zero"
  return isNeg ? `Minus ${words}` : words
}

// For tax-inclusive grand total → split out GST components
export function calculateGST(
  amount: number,
  gstRate = 18,
  interState = false,
): {
  baseAmount: number
  cgst: number
  sgst: number
  igst: number
  totalGst: number
  totalAmount: number
} {
  const safe = Number(amount) || 0
  const baseAmount = safe / (1 + gstRate / 100)
  const totalGst = safe - baseAmount
  const igst = interState ? totalGst : 0
  const cgst = interState ? 0 : totalGst / 2
  const sgst = interState ? 0 : totalGst / 2

  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    totalGst: Math.round(totalGst * 100) / 100,
    totalAmount: Math.round(safe * 100) / 100,
  }
}

// For base amount → add GST
export function addGST(baseAmount: number, gstRate = 18, interState = false) {
  const safeBase = Number(baseAmount) || 0
  const totalGst = (safeBase * gstRate) / 100
  const igst = interState ? totalGst : 0
  const cgst = interState ? 0 : totalGst / 2
  const sgst = interState ? 0 : totalGst / 2
  const totalAmount = safeBase + totalGst

  return {
    baseAmount: Math.round(safeBase * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    totalGst: Math.round(totalGst * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  }
}

export function calculateTotal(
  subtotal: number,
  taxRate = 18,
  serviceChargeRate = 0,
): {
  subtotal: number
  tax: number
  serviceCharge: number
  total: number
} {
  const safeSubtotal = Number(subtotal) || 0
  const safeTaxRate = Number(taxRate) || 0
  const safeServiceChargeRate = Number(serviceChargeRate) || 0

  const tax = (safeSubtotal * safeTaxRate) / 100
  const serviceCharge = (safeSubtotal * safeServiceChargeRate) / 100
  const total = safeSubtotal + tax + serviceCharge

  return {
    subtotal: Math.round(safeSubtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    serviceCharge: Math.round(serviceCharge * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}
