import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FALLBACK_PRODUCTS = [
  { id: 101, name: "Shampoo 250ml", price: 299, category_name: "Hair", stock_quantity: 12 },
  { id: 102, name: "Face Serum 30ml", price: 799, category_name: "Skincare", stock_quantity: 6 },
  { id: 103, name: "Nail Polish", price: 199, category_name: "Beauty", stock_quantity: 20 },
]

export async function GET() {
  try {
    return await withTenantAuth(async ({ sql, tenantId }) => {
      const products = await sql`
        SELECT * FROM products 
        WHERE tenant_id = ${tenantId} 
        AND is_active = 'true'
        ORDER BY name
      `
      return NextResponse.json(products)
    })
  } catch (e: any) {
    console.warn("GET /api/products fallback:", e?.message || e)
    return NextResponse.json(FALLBACK_PRODUCTS, { status: 200 })
  }
}
