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
    staff_members?: Array<{ id: number; name: string; split_percentage: number }>
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
  booking_id?: number
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
        SELECT id, full_name, phone_number, email FROM customers WHERE id = ${customerId} AND tenant_id = ${tenantId}
      `
      
      if (!customer) {
        return { success: false, message: "Customer not found or unauthorized" }
      }


      let taxRate = 18;
      try {
        const taxRow = await sql`
          SELECT setting_value 
          FROM store_settings 
          WHERE tenant_id = ${tenantId.toString()} AND setting_key = 'business.taxRate'
          LIMIT 1
        `;
        if (taxRow.length > 0) {
          const val = Number.parseFloat(taxRow[0].setting_value);
          if (!isNaN(val)) taxRate = val;
        }
      } catch(e) {
         console.error("Error fetching taxRate:", e);
      }

      // Calculate totals
      const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const couponDiscount = Number(input.coupon_discount) || Number(input.manual_discount) || 0
      const gstAmount = ((subtotal - couponDiscount) * taxRate) / 100

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
      if (input.booking_id) {
        bookingId = input.booking_id;
        // Update existing booking
        await sql`
          UPDATE bookings 
          SET status = 'completed',
              payment_method = ${input.payment_method},
              total_amount = ${total},
              updated_at = NOW()
          WHERE id = ${bookingId} AND tenant_id = ${tenantId}
        `;
      } else if (serviceItems.length > 0) {
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
            total_amount, status, payment_method, notes, tenant_id, created_at, updated_at
          ) VALUES (
            ${bookingNumber},
            ${customerId},
            ${serviceItems[0]?.staff_id || null},
            ${bookingDate},
            ${bookingTime},
            ${total},
            'completed',
            ${input.payment_method || 'cash'},
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

      if (bookingId) {
        // Increment membership usage for this checkout
        await sql`
          UPDATE customer_memberships
          SET bookings_used = bookings_used + 1, updated_at = NOW()
          WHERE customer_id = ${customerId}
          AND tenant_id = ${tenantId}
          AND status = 'active'
          AND end_date > CURRENT_DATE
        `
      }

      // Increment coupon usage if a valid coupon code was provided
      if (input.coupon_code) {
        await sql`
          UPDATE coupons
          SET used_count = COALESCE(used_count, 0) + 1,
              updated_at = NOW()
          WHERE UPPER(code) = UPPER(${input.coupon_code})
          AND tenant_id = ${tenantId}
        `
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
      
      // Process customer packages
      for (const pkgItem of packageItems) {
        // Fetch package details
        const [pkgDetails] = await sql`
          SELECT id, services, validity_days FROM service_packages 
          WHERE id = ${pkgItem.id} AND tenant_id = ${tenantId}
        `
        if (pkgDetails) {
          const servicesArr = Array.isArray(pkgDetails.services) 
            ? pkgDetails.services 
            : JSON.parse(pkgDetails.services || "[]")
          
          // Assuming 1 quantity of each service in the package per package bought
          // If the user bought multiple of the same package, we create multiple records or multiply
          const totalServices = servicesArr.map((s: number) => ({ service_id: s, quantity: 1 * pkgItem.quantity }))
          const remainingServices = totalServices;
          
          let expiresAt = null;
          if (pkgDetails.validity_days) {
            expiresAt = new Date(Date.now() + pkgDetails.validity_days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          }

          await sql`
            INSERT INTO customer_packages (
              tenant_id, customer_id, package_id, total_services, remaining_services, expires_at
            ) VALUES (
              ${tenantId}, ${customerId}, ${pkgItem.id}, 
              ${JSON.stringify(totalServices)}, ${JSON.stringify(remainingServices)}, ${expiresAt}
            )
          `
        }
      }

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

      // --- Staff Commission Splits ---
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS staff_commission_splits (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            invoice_id INTEGER NOT NULL,
            service_item_name TEXT NOT NULL,
            staff_id INTEGER NOT NULL,
            split_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00,
            revenue_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
        await sql`CREATE INDEX IF NOT EXISTS idx_commission_splits_invoice ON staff_commission_splits(invoice_id);`
        await sql`CREATE INDEX IF NOT EXISTS idx_commission_splits_staff ON staff_commission_splits(staff_id, tenant_id);`

        for (const item of serviceItems) {
          if (item.staff_members && item.staff_members.length > 0) {
            for (const member of item.staff_members) {
              const amount = (item.price * item.quantity * member.split_percentage) / 100
              await sql`
                INSERT INTO staff_commission_splits (
                  tenant_id, invoice_id, service_item_name, staff_id, 
                  split_percentage, revenue_amount, created_at
                ) VALUES (
                  ${tenantId}, ${invoice.id}, ${item.name}, ${member.id},
                  ${member.split_percentage}, ${amount}, NOW()
                )
              `
            }
          } else if (item.staff_id) {
            await sql`
              INSERT INTO staff_commission_splits (
                tenant_id, invoice_id, service_item_name, staff_id, 
                split_percentage, revenue_amount, created_at
              ) VALUES (
                ${tenantId}, ${invoice.id}, ${item.name}, ${item.staff_id},
                100, ${item.price * item.quantity}, NOW()
              )
            `
          }
        }
      } catch (err) {
        console.error("Failed to insert staff commission splits:", err)
      }

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

      // Process points earning (with dynamic expiry) with tenant_id
      if (pointsEarned > 0) {
        const settingsResult = await sql`
          SELECT points_validity_days FROM loyalty_settings
          WHERE tenant_id = ${tenantId} LIMIT 1
        `
        const validityDays = settingsResult.length > 0 ? settingsResult[0].points_validity_days : 45

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
            NOW() + (${validityDays}::text || ' days')::interval,
            ${tenantId},
            NOW()
          )
        `
      }


      // Trigger WhatsApp Automations (Invoice Receipt & Loyalty Alert)
      if (customer?.phone_number) {
        // Run asynchronously so it doesn't block the checkout response
        import("@/lib/whatsapp-automations").then(({ triggerWhatsAppAutomation }) => {
          // 1. Send Invoice Receipt
          triggerWhatsAppAutomation({
            tenantId: tenantId.toString(),
            eventType: "invoice_receipt",
            recipientPhone: customer.phone_number,
            customerId: customerId,
            referenceId: `invoice:${invoice.id}`,
            variables: {
              customer_name: customer.full_name,
              booking_number: invoiceNumber,
              total_amount: total,
              invoice_url: `https://biz.hanva.in/inv/${share_token}`,
              points: pointsEarned,
              coupon_code: input.coupon_code || "",
            },
            sql,
          }).catch((err) => console.error("Failed to send WhatsApp invoice automation:", err))

          // 2. Send Loyalty Update if points were earned or redeemed
          if (pointsEarned > 0 || pointsRedeemed > 0) {
            sql`
              SELECT COALESCE(SUM(CASE WHEN transaction_type = 'earned' THEN points ELSE -points END), 0) as balance
              FROM loyalty_transactions
              WHERE customer_id = ${customerId} AND tenant_id = ${tenantId}
            `.then((balRes: any) => {
              const balance = balRes[0]?.balance || pointsEarned
              triggerWhatsAppAutomation({
                tenantId: tenantId.toString(),
                eventType: "loyalty_update",
                recipientPhone: customer.phone_number,
                customerId: customerId,
                referenceId: `loyalty:${invoice.id}`,
                variables: {
                  customer_name: customer.full_name,
                  points: balance,
                  points_earned: pointsEarned,
                  points_redeemed: pointsRedeemed,
                },
                sql,
              }).catch((err: any) => console.error("Failed to send WhatsApp loyalty automation:", err))
            }).catch(() => {})
          }
        }).catch((err) => console.error("Failed to import whatsapp-automations:", err))
      }

      // -------------------------------------------------------------
      // REFERRAL REWARD (First Checkout Logic)
      // -------------------------------------------------------------
      try {
        const [refCheck] = await sql`
          SELECT c.referred_by_customer_id,
                 (SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id AND i.tenant_id = ${tenantId} ) as invoice_count
          FROM customers c 
          WHERE c.id = ${customerId} AND c.tenant_id = ${tenantId}
        `
        if (refCheck && refCheck.referred_by_customer_id && Number(refCheck.invoice_count) === 1) {
          const { processReferralReward } = await import("@/app/actions/loyalty")
          await processReferralReward(customerId, refCheck.referred_by_customer_id, tenantId)
        }
      } catch (err) {
        console.error("Failed to process referral reward:", err)
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
