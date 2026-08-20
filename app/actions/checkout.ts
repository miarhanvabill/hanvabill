"use server"
import crypto from 'crypto';

import { withTenantAuth } from "@/lib/withTenantAuth"

export interface FinalizeCheckoutInput {
  customer_id: number
  items: Array<{
    id: number
    name: string
    price: number
    quantity: number
    type: "service" | "product" | "package" | "membership"
    staff_id?: number
    staff_name?: string
  }>
  payment_method: string
  notes?: string | null
  coupon_code?: string | null
  coupon_discount?: number
  manual_discount?: number
  invoice_date?: string
  due_date?: string
  booking_date?: string
  booking_time?: string
  redeem_points?: number
  points_earned_client?: number
  gift_cards?: Array<{ code: string; amount: number }>
  idempotency_key?: string | null
}

export interface FinalizeCheckoutResult {
  success: boolean
  message?: string
  invoice?: any
  totals?: {
    subtotal: number
    couponDiscount: number
    gstAmount: number
    giftCardDiscount: number
    loyaltyDiscount: number
    total: number
    pointsRedeemed?: number
    pointsEarned?: number
  }
}

export async function finalizeCheckout(input: FinalizeCheckoutInput): Promise<FinalizeCheckoutResult> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const customerId = Number(input.customer_id)
    if (!Number.isFinite(customerId) || customerId <= 0) {
      return { success: false, message: "Invalid customer id" }
    }

    try {
      // Verify customer exists and belongs to tenant
      const [customer] = await sql`
        SELECT id FROM customers WHERE id = ${customerId} AND tenant_id = ${tenantId}
      `
      
      if (!customer) {
        return { success: false, message: "Customer not found or unauthorized" }
      }

      // Calculate totals
      const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const couponDiscount = Number(input.coupon_discount) || Number(input.manual_discount) || 0
      const gstAmount = ((subtotal - couponDiscount) * 18) / 100
      const giftCardDiscount = input.gift_cards?.reduce((sum, gc) => sum + gc.amount, 0) || 0
      const loyaltyDiscount = input.redeem_points || 0
      const totalRaw = Math.max(
        0,
        Math.max(
          0,
          Math.min(Number.MAX_SAFE_INTEGER, subtotal + gstAmount - couponDiscount - giftCardDiscount - loyaltyDiscount),
        ),
      )
      const total = Math.round(totalRaw * 100) / 100

      let bookingId: number | null = null

      const serviceItems = input.items.filter((item) => item.type === "service")
      if (serviceItems.length > 0) {
        const serviceIds = serviceItems.map((item) => item.id)

        // Check services exist within tenant
        const existingServices = await sql`
          SELECT id FROM services WHERE id = ANY(${serviceIds}) AND is_active = true AND tenant_id = ${tenantId}
        `

        const existingServiceIds = new Set(existingServices.map((s) => Number(s.id)))
        const invalidServiceIds = serviceIds.filter((id) => !existingServiceIds.has(id))

        if (invalidServiceIds.length > 0) {
          console.error("Invalid service IDs found:", invalidServiceIds)
          return {
            success: false,
            message: `Invalid service IDs: ${invalidServiceIds.join(", ")}. Please refresh and try again.`,
          }
        }

        // Generate booking number
        const bookingNumber = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`
        const dateIST = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
        // Convert MM/DD/YYYY to YYYY-MM-DD
        const [month, day, year] = dateIST.split('/');
        const formattedDateIST = `${year}-${month}-${day}`;
        const bookingDate = input.booking_date || formattedDateIST
        const nowIST = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
        const bookingTime = input.booking_time || nowIST

        // Create booking for service items only with tenant_id
        const [booking] = await sql`
          INSERT INTO bookings (
            booking_number, customer_id, staff_id, booking_date, booking_time, 
            total_amount, status, notes, tenant_id, created_at, updated_at
          ) VALUES (
            ${bookingNumber},
            ${customerId},
            ${serviceItems[0]?.staff_id || null},
            ${bookingDate},
            ${bookingTime},
            ${total},
            'completed',
            ${[
            input.notes,
            input.coupon_code ? `Coupon: ${input.coupon_code} (-${couponDiscount})` : null,
            input.manual_discount > 0 ? `Manual Discount: -${input.manual_discount}` : null,
            loyaltyDiscount > 0 ? `Loyalty Redeemed: ₹${loyaltyDiscount}` : null,
            giftCardDiscount > 0 ? `Gift Card Redeemed: ₹${giftCardDiscount}` : null,
            input.points_earned_client > 0 ? `Points Earned: ${input.points_earned_client}` : null,
          ].filter(Boolean).join(' | ')},
            ${tenantId},
            NOW(),
            NOW()
          ) RETURNING id
        `

        bookingId = Number(booking.id)

        // Create booking_services entries for services only
        for (const item of serviceItems) {
          await sql`
            INSERT INTO booking_services (booking_id, service_id, quantity, price, tenant_id) 
            VALUES (${bookingId}, ${item.id}, ${item.quantity}, ${item.price}, ${tenantId})
          `
        }
      }

      const membershipItems = input.items.filter((item) => item.type === "membership")
      for (const membershipItem of membershipItems) {
        // Verify membership plan exists within tenant
        const [membershipPlan] = await sql`
          SELECT id FROM membership_plans WHERE id = ${membershipItem.id} AND tenant_id = ${tenantId}
        `
        
        if (!membershipPlan) {
          return { success: false, message: `Membership plan ${membershipItem.id} not found` }
        }

        // Create customer membership record with tenant_id
        const startDate = new Date().toISOString().split("T")[0]
        const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 1 year from now
        await sql`
          INSERT INTO customer_memberships (customer_id, membership_plan_id, start_date, end_date, tenant_id, created_at, updated_at)
          VALUES (${customerId}, ${membershipItem.id}, ${startDate}, ${endDate}, ${tenantId}, NOW(), NOW())
        `
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`
      const invoiceDate = input.invoice_date || new Date().toISOString().split("T")[0]
      const dueDate = input.due_date || invoiceDate

      const productItems = input.items.filter((item) => item.type === "product")
      const packageItems = input.items.filter((item) => item.type === "package")

      // Create invoice with proper item categorization and tenant_id
      const [invoice] = await sql`
        INSERT INTO invoices (
          invoice_number, customer_id, booking_id, amount, subtotal, discount_amount, gst_amount,
          payment_method, service_details, product_details, invoice_date, due_date,
          notes, tenant_id, share_token, created_at, updated_at
        ) VALUES (
          ${invoiceNumber},
          ${customerId},
          ${bookingId},
          ${Math.round(total * 100) / 100},
          ${subtotal},
          ${couponDiscount},
          ${gstAmount},
          ${input.payment_method},
          ${JSON.stringify([...serviceItems, ...packageItems, ...membershipItems])},
          ${JSON.stringify(productItems)},
          ${invoiceDate},
          ${dueDate},
                    ${[
            input.notes,
            input.coupon_code ? `Coupon: ${input.coupon_code} (-${couponDiscount})` : null,
            input.manual_discount && input.manual_discount > 0 ? `Manual Discount: -${input.manual_discount}` : null,
            loyaltyDiscount > 0 ? `Loyalty Redeemed: ₹${loyaltyDiscount}` : null,
            giftCardDiscount > 0 ? `Gift Card Redeemed: ₹${giftCardDiscount}` : null,
            input.points_earned_client && input.points_earned_client > 0 ? `Points Earned: ${input.points_earned_client}` : null,
          ].filter(Boolean).join(' | ')},
          ${tenantId},
          ${crypto.randomBytes(16).toString("hex")},
          NOW(),
          NOW()
        ) RETURNING *
      `

      const pointsRedeemed = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, input.redeem_points || 0))
      const pointsEarned = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, input.points_earned_client || 0))

      // Process point redemption with tenant_id
      if (pointsRedeemed > 0) {
        await sql`
          INSERT INTO loyalty_transactions (
            customer_id, points, amount, transaction_type, type, description, invoice_id, tenant_id, created_at
          ) VALUES (
            ${customerId},
            ${pointsRedeemed},
            ${pointsRedeemed},
            'redeemed',
            'redeemed',
            ${"Points redeemed for invoice " + invoiceNumber},
            ${invoice.id},
            ${tenantId},
            NOW()
          )
        `
      }

      // Process points earning (with 45-day expiry) with tenant_id
      if (pointsEarned > 0) {
        await sql`
          INSERT INTO loyalty_transactions (
            customer_id, points, amount, transaction_type, type, description, invoice_id, expires_at, tenant_id, created_at
          ) VALUES (
            ${customerId},
            ${pointsEarned},
            ${total},
            'earned',
            'earned',
            ${"Points earned from invoice " + invoiceNumber},
            ${invoice.id},
            NOW() + INTERVAL '45 days',
            ${tenantId},
            NOW()
          )
        `
      }

      return {
        success: true,
        invoice,
        totals: {
          subtotal,
          couponDiscount,
          gstAmount,
          giftCardDiscount,
          loyaltyDiscount,
          total,
          pointsRedeemed,
          pointsEarned,
        },
      }
    } catch (error: any) {
      console.error("finalizeCheckout error:", error)
      if (error?.message?.includes("violates foreign key constraint")) {
        return { success: false, message: "Invalid service or data reference. Please refresh the page and try again." }
      }
      if (error?.message?.includes("duplicate key value")) {
        return { success: false, message: "Duplicate transaction detected. Please try again." }
      }
      return { success: false, message: error?.message || "Failed to finalize checkout" }
    }
  })
}
