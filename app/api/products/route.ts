import { NextResponse } from "next/server"
import { getProducts } from "@/app/actions/products"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const products = await getProducts()
    const activeProducts = products.filter(p => p.is_active)
    return NextResponse.json(activeProducts)
  } catch (e: any) {
    console.warn("GET /api/products fallback:", e?.message || e)
    return NextResponse.json([], { status: 500 })
  }
}
