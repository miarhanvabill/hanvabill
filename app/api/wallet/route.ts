import { type NextRequest, NextResponse } from "next/server"
import { getCustomerWallets, getWalletTransactions, addWalletPoints } from "@/app/actions/wallet"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type")

    if (type === "transactions") {
      const transactions = await getWalletTransactions()
      return NextResponse.json({ success: true, transactions })
    }

    const wallets = await getCustomerWallets()
    return NextResponse.json({ success: true, wallets })
  } catch (error) {
    console.error("Wallet API error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch wallet data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, points, type, description } = body

    if (!customerId || !points || !type || !description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const result = await addWalletPoints(customerId, Number(points), type, description)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Wallet API error:", error)
    return NextResponse.json({ success: false, error: "Failed to add points" }, { status: 500 })
  }
}
