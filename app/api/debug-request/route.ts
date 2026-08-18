import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import {
  getCustomerLoyalty,
  getLoyaltySettings,
  getLoyaltyTransactions,
  getExpiringSoon,
  enrollCustomerInLoyalty,
  unenrollCustomerInLoyalty,
} from "@/app/actions/loyalty"

export async function GET(request: NextRequest) {
  return await withTenantAuth(async ({ tenantId }) => {
    try {
      console.log("🔍 === DEBUG START ===")
      const p = request.nextUrl.searchParams
      console.log("Query params:", Object.fromEntries(p))

      const idParam = p.get("id")
      const id = Number(idParam)
      
      console.log("Customer ID:", id, "Tenant ID:", tenantId)

      if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ success: false, error: "Valid id is required" }, { status: 400 })
      }

      // Test each function with extensive error handling
      console.log("🧪 Testing getCustomerLoyalty...")
      let data
      try {
        data = await getCustomerLoyalty(id, tenantId)
        console.log("✅ getCustomerLoyalty result:", JSON.stringify(data, null, 2))
        console.log("📊 Data type:", typeof data)
        if (data && typeof data === 'object') {
          console.log("🔑 Data keys:", Object.keys(data))
        }
      } catch (error) {
        console.error("❌ getCustomerLoyalty failed:", error.message)
        throw error
      }

      console.log("🧪 Testing getLoyaltySettings...")
      let settings
      try {
        settings = await getLoyaltySettings(tenantId)
        console.log("✅ getLoyaltySettings result:", JSON.stringify(settings, null, 2))
        console.log("📊 Settings type:", typeof settings)
        if (settings && typeof settings === 'object') {
          console.log("🔑 Settings keys:", Object.keys(settings))
        }
      } catch (error) {
        console.error("❌ getLoyaltySettings failed:", error.message)
        throw error
      }

      console.log("🧪 Testing getExpiringSoon...")
      let expiringSoon = 0
      const days = Number(p.get("expDays") || 7)
      
      if (data) {
        try {
          expiringSoon = await getExpiringSoon(id, days, tenantId)
          console.log("✅ getExpiringSoon result:", expiringSoon)
          console.log("📊 ExpiringSoon type:", typeof expiringSoon)
        } catch (error) {
          console.error("❌ getExpiringSoon failed:", error.message)
          // Don't throw, just log and continue
        }
      } else {
        console.log("⚠️  Skipping getExpiringSoon - no customer data")
      }

      console.log("✅ All tests passed successfully!")
      
      return NextResponse.json({
        success: true,
        data,
        settings,
        expiringSoon: { days, points: expiringSoon },
      })

    } catch (e: any) {
      console.error("🔥 === CRITICAL ERROR ===")
      console.error("Error message:", e.message)
      console.error("Error stack:", e.stack)
      console.error("Error name:", e.name)
      
      // Additional debugging for .length errors
      if (e.message?.includes('length')) {
        console.error("🔍 This is a .length error - checking common causes:")
        
        // Check if it's in the error stack
        const stack = e.stack || ''
        if (stack.includes('getCustomerLoyalty')) {
          console.error("📍 Error originated in getCustomerLoyalty")
        } else if (stack.includes('getLoyaltySettings')) {
          console.error("📍 Error originated in getLoyaltySettings")
        } else if (stack.includes('getExpiringSoon')) {
          console.error("📍 Error originated in getExpiringSoon")
        } else if (stack.includes('getLoyaltyTransactions')) {
          console.error("📍 Error originated in getLoyaltyTransactions")
        } else {
          console.error("📍 Error origin unknown from stack trace")
        }
      }

      return NextResponse.json({ 
        success: false, 
        error: e.message,
        debug: {
          errorType: e?.name,
          isLengthError: e?.message?.includes('length'),
          stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
        }
      }, { status: 500 })
    }
  })
}
