"use server"

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

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

function clamp(value: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return Math.max(min, Math.min(max, value))
}

async function ensureInvoiceSchemaOutsideTxn() {
  try {
    // Ensure invoices table has booking_id column
    await sql`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id)
    `
  } catch (error: any) {
    // Schema updates are expected to fail if column already exists
    // Only log if it's an unexpected error
    if (!error?.message?.includes("already exists")) {
      console.error("Unexpected schema update error:", error)
    }
  }
}

export async function finalizeCheckout(input: FinalizeCheckoutInput): Promise<FinalizeCheckoutResult> {
  await ensureInvoiceSchemaOutsideTxn()

  const customerId = Number(input.customer_id)
  if (!Number.isFinite(customerId) || customerId <= 0) {
    return { success: false, message: "Invalid customer id" }
  }

  try {
    // Calculate totals
    const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const couponDiscount = 0 // Simplified for now
    const gstAmount = (subtotal * 18) / 100
    const giftCardDiscount = input.gift_cards?.reduce((sum, gc) => sum + gc.amount, 0) || 0
    const loyaltyDiscount = input.redeem_points || 0
    const total = Math.max(0, subtotal + gstAmount - couponDiscount - giftCardDiscount - loyaltyDiscount)

    let bookingId: number | null = null

    const serviceItems = input.items.filter((item) => item.type === "service")

    if (serviceItems.length > 0) {
      const serviceIds = serviceItems.map((item) => item.id)
      const existingServices = await sql`
        SELECT id FROM services WHERE id = ANY(${serviceIds}) AND is_active = true
      `

      const existingServiceIds = new Set(existingServices.map((s) => s.id))
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
      const bookingDate = input.booking_date || new Date().toISOString().split("T")[0]
      const bookingTime = input.booking_time || "10:00"

      // Create booking for service items only
      const [booking] = await sql`
        INSERT INTO bookings (
          booking_number, customer_id, staff_id, booking_date, booking_time, 
          total_amount, status, notes, created_at, updated_at
        ) VALUES (
          ${bookingNumber},
          ${customerId},
          ${serviceItems[0]?.staff_id || null},
          ${bookingDate},
          ${bookingTime},
          ${total},
          'completed',
          ${input.notes || null},
          NOW(),
          NOW()
        ) RETURNING id
      `

      bookingId = booking.id

      // Create booking_services entries for services only (now validated)
      for (const item of serviceItems) {
        await sql`
          INSERT INTO booking_services (booking_id, service_id, quantity, price) 
          VALUES (${bookingId}, ${item.id}, ${item.quantity}, ${item.price})
        `
      }
    }

    const membershipItems = input.items.filter((item) => item.type === "membership")
    for (const membershipItem of membershipItems) {
      // Create customer membership record
      const startDate = new Date().toISOString().split("T")[0]
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 1 year from now

      await sql`
        INSERT INTO customer_memberships (customer_id, membership_plan_id, start_date, end_date, created_at, updated_at)
        VALUES (${customerId}, ${membershipItem.id}, ${startDate}, ${endDate}, NOW(), NOW())
      `
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`
    const invoiceDate = input.invoice_date || new Date().toISOString().split("T")[0]
    const dueDate = input.due_date || invoiceDate

    const productItems = input.items.filter((item) => item.type === "product")
    const packageItems = input.items.filter((item) => item.type === "package")

    // Create invoice with proper item categorization
    const [invoice] = await sql`
      INSERT INTO invoices (
        invoice_number, customer_id, booking_id, amount, subtotal, discount_amount, gst_amount,
        payment_method, service_details, product_details, invoice_date, due_date,
        notes, created_at, updated_at
      ) VALUES (
        ${invoiceNumber},
        ${customerId},
        ${bookingId},
        ${total},
        ${subtotal},
        ${couponDiscount},
        ${gstAmount},
        ${input.payment_method},
        ${JSON.stringify([...serviceItems, ...packageItems, ...membershipItems])},
        ${JSON.stringify(productItems)},
        ${invoiceDate},
        ${dueDate},
        ${input.notes || null},
        NOW(),
        NOW()
      ) RETURNING *
    `

    const pointsRedeemed = clamp(input.redeem_points || 0, 0)
    const pointsEarned = clamp(input.points_earned_client || 0, 0)

    // Ensure loyalty_transactions table exists
    await sql`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        points INTEGER NOT NULL,
        amount DECIMAL(10,2) DEFAULT 0,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed')),
        type VARCHAR(20),
        description TEXT,
        invoice_id INTEGER REFERENCES invoices(id),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    // Process point redemption
    if (pointsRedeemed > 0) {
      await sql`
        INSERT INTO loyalty_transactions (
          customer_id, points, amount, transaction_type, type, description, invoice_id, created_at
        ) VALUES (
          ${customerId},
          ${pointsRedeemed},
          ${pointsRedeemed},
          'redeemed',
          'redeemed',
          ${"Points redeemed for invoice " + invoiceNumber},
          ${invoice.id},
          NOW()
        )
      `
    }

    // Process points earning (with 45-day expiry)
    if (pointsEarned > 0) {
      await sql`
        INSERT INTO loyalty_transactions (
          customer_id, points, amount, transaction_type, type, description, invoice_id, expires_at, created_at
        ) VALUES (
          ${customerId},
          ${pointsEarned},
          ${total},
          'earned',
          'earned',
          ${"Points earned from invoice " + invoiceNumber},
          ${invoice.id},
          NOW() + INTERVAL '45 days',
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
    return { success: false, message: error?.message || "Failed to finalize checkout" }
  }
}
