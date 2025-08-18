import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get("dateRange") || "This Month"

    // Calculate date range
    const startDate = new Date()
    switch (dateRange) {
      case "Today":
        startDate.setHours(0, 0, 0, 0)
        break
      case "This Week":
        startDate.setDate(startDate.getDate() - startDate.getDay())
        break
      case "This Month":
        startDate.setDate(1)
        break
      case "Last 3 Months":
        startDate.setMonth(startDate.getMonth() - 3)
        break
    }
    const startIso = startDate.toISOString().split("T")[0]

    const paymentData = await sql`
      SELECT 
        payment_method,
        COUNT(*) as transactions,
        COALESCE(SUM(total_amount), 0) as amount
      FROM bookings 
      WHERE booking_date >= ${startIso}
      AND status IN ('completed', 'confirmed')
      AND payment_method IS NOT NULL
      GROUP BY payment_method
      ORDER BY amount DESC
    `

    const totalAmount = paymentData.reduce((sum, item) => sum + Number(item.amount), 0)

    const formattedData = paymentData.map((item) => {
      const amount = Number(item.amount) || 0
      const transactions = Number(item.transactions) || 0

      return {
        method: item.payment_method || "Unknown",
        amount: amount,
        percentage: totalAmount > 0 ? Number(((amount / totalAmount) * 100).toFixed(1)) : 0,
        transactions: transactions,
        average_transaction: transactions > 0 ? Math.round(amount / transactions) : 0,
        icon: getPaymentIcon(item.payment_method),
        color: getPaymentColor(item.payment_method),
      }
    })

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Error fetching payment source data:", error)
    return NextResponse.json({ error: "Failed to fetch payment source data" }, { status: 500 })
  }
}

function getPaymentIcon(method: string): string {
  switch (method?.toLowerCase()) {
    case "cash":
      return "banknote"
    case "card":
    case "credit card":
    case "debit card":
      return "credit-card"
    case "upi":
    case "digital wallet":
      return "smartphone"
    default:
      return "credit-card"
  }
}

function getPaymentColor(method: string): string {
  switch (method?.toLowerCase()) {
    case "cash":
      return "bg-green-500"
    case "card":
    case "credit card":
    case "debit card":
      return "bg-blue-500"
    case "upi":
    case "digital wallet":
      return "bg-purple-500"
    default:
      return "bg-orange-500"
  }
}
