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
  split_cash_amount?: number
  split_second_method?: string
  referral_code?: string | null
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
  product_consumptions?: Array<{
    inventory_id?: number
    product_id?: number
    name: string
    sku?: string
    quantity: number
    unit?: string
    service_name?: string
    staff_name?: string
    notes?: string
  }>
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

export async function finalizeCheckout(
  input: FinalizeCheckoutInput,
  authContext?: { sql: any; tenantId: string }
): Promise<FinalizeCheckoutResult> {
  const runner = async ({ sql, tenantId }: { sql: any; tenantId: string }) => {
    const customerId = Number(input.customer_id)
    if (!Number.isFinite(customerId) || customerId <= 0) {
      return { success: false, message: "Invalid customer id" }
    }

    try {
      // 1. Idempotency Check: prevent double charges or duplicate invoices on retry
      if (input.idempotency_key) {
        try {
          await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);`.catch(() => {})
          const existingInvoices = await sql`
            SELECT * FROM invoices 
            WHERE tenant_id = ${tenantId} AND idempotency_key = ${input.idempotency_key}
            LIMIT 1
          `.catch(() => [])
          
          if (existingInvoices.length > 0) {
            const existing = existingInvoices[0]
            console.log(`[POS Checkout] Idempotent request intercepted for key: ${input.idempotency_key}`)
            return {
              success: true,
              invoice: existing,
              message: "Checkout already processed (idempotent)",
              totals: {
                subtotal: Number(existing.subtotal || 0),
                couponDiscount: Number(existing.discount_amount || 0),
                gstAmount: Number(existing.gst_amount || 0),
                giftCardDiscount: 0,
                loyaltyDiscount: 0,
                total: Number(existing.amount || 0),
              },
            }
          }
        } catch (idempErr) {
          console.warn("[POS Checkout] Idempotency check warning:", idempErr)
        }
      }

      // Verify customer exists and belongs to tenant
      const [customer] = await sql`
        SELECT id, full_name, phone_number, email FROM customers WHERE id = ${customerId} AND tenant_id = ${tenantId}
      `
      
      if (!customer) {
        return { success: false, message: "Customer not found or unauthorized" }
      }

      // Fetch business tax and payment settings
      let taxRate = 18;
      let taxInclusive = false;
      let discountLimit = 100;
      try {
        const settingsRows = await sql`
          SELECT setting_key, setting_value 
          FROM store_settings 
          WHERE tenant_id = ${tenantId.toString()} 
            AND setting_key IN ('business.taxRate', 'payments.taxInclusive', 'payments.discountLimit')
        `;
        for (const row of settingsRows) {
          if (row.setting_key === 'business.taxRate') {
            const val = Number.parseFloat(row.setting_value);
            if (!isNaN(val)) taxRate = val;
          } else if (row.setting_key === 'payments.taxInclusive') {
            taxInclusive = row.setting_value === 'true' || row.setting_value === true;
          } else if (row.setting_key === 'payments.discountLimit') {
            const val = Number.parseFloat(row.setting_value);
            if (!isNaN(val)) discountLimit = val;
          }
        }
      } catch(e) {
         console.error("Error fetching tax and discount settings:", e);
      }

      // Calculate totals with discount limit cap
      const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      
      let manualDiscount = Number(input.manual_discount) || 0
      if (discountLimit > 0 && discountLimit < 100) {
        const maxManualAllowed = (subtotal * discountLimit) / 100
        manualDiscount = Math.min(manualDiscount, maxManualAllowed)
      }
      const couponDiscount = Number(input.coupon_discount) || 0
      const totalDiscount = couponDiscount > 0 ? couponDiscount : manualDiscount
      const netSubtotal = Math.max(0, subtotal - totalDiscount)

      // Tax/GST calculation: Tax Inclusive vs Exclusive
      let gstAmount = 0
      if (taxInclusive) {
        const baseAmount = taxRate > 0 ? netSubtotal / (1 + taxRate / 100) : netSubtotal
        gstAmount = Math.round((netSubtotal - baseAmount) * 100) / 100
      } else {
        gstAmount = Math.round(((netSubtotal * taxRate) / 100) * 100) / 100
      }

      const giftCardDiscount = input.gift_cards?.reduce((sum, gc) => sum + gc.amount, 0) || 0
      const loyaltyDiscount = input.redeem_points || 0
      const amountBeforeRedemptions = taxInclusive ? netSubtotal : (netSubtotal + gstAmount)
      const totalRaw = Math.max(0, amountBeforeRedemptions - giftCardDiscount - loyaltyDiscount)
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

        const existingServiceIds = new Set(existingServices.map((s: any) => Number(s.id)))
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
            input.manual_discount && input.manual_discount > 0 ? `Manual Discount: -${input.manual_discount}` : null,
            loyaltyDiscount > 0 ? `Loyalty Redeemed: ₹${loyaltyDiscount}` : null,
            giftCardDiscount > 0 ? `Gift Card Redeemed: ₹${giftCardDiscount}` : null,
            input.points_earned_client && input.points_earned_client > 0 ? `Points Earned: ${input.points_earned_client}` : null,
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

      // Deduct Gift Card balances if redeemed during checkout
      if (input.gift_cards && input.gift_cards.length > 0) {
        for (const gc of input.gift_cards) {
          if (gc.code && gc.amount > 0) {
            await sql`
              UPDATE gift_cards 
              SET balance = GREATEST(0, balance - ${gc.amount}),
                  status = CASE WHEN balance - ${gc.amount} <= 0 THEN 'used' ELSE status END,
                  updated_at = NOW()
              WHERE UPPER(code) = UPPER(${gc.code}) 
              AND tenant_id = ${tenantId}
            `.catch((err: any) => console.error("Error deducting gift card balance in checkout:", err))
          }
        }
      }

      // Auto-deduct sessions from active customer packages if booking has services
      if (bookingId && serviceItems.length > 0) {
        import("@/app/actions/customer-packages")
          .then(({ deductBookingPackageSessions }) => {
            deductBookingPackageSessions(bookingId, customerId).catch((err) =>
              console.error("Error auto-deducting package sessions during checkout:", err)
            )
          })
          .catch((err) => console.error("Error importing customer-packages:", err))
      }

      const membershipItems = input.items.filter((item) => item.type === "membership")
      for (const membershipItem of membershipItems) {
        // Verify membership plan exists within tenant
        const [membershipPlan] = await sql`
          SELECT id, duration_months, price FROM membership_plans WHERE id = ${membershipItem.id} AND tenant_id = ${tenantId}
        `
        
        if (!membershipPlan) {
          return { success: false, message: `Membership plan ${membershipItem.id} not found` }
        }

        // Create customer membership record with tenant_id and actual duration_months
        const startDate = new Date().toISOString().split("T")[0]
        const durationMonths = Number(membershipPlan.duration_months) || 12
        const endDateObj = new Date()
        endDateObj.setMonth(endDateObj.getMonth() + durationMonths)
        const endDate = endDateObj.toISOString().split("T")[0]
        const amountPaid = Number(membershipItem.price) || Number(membershipPlan.price) || 0

        await sql`
          INSERT INTO customer_memberships (
            customer_id, membership_plan_id, start_date, end_date, tenant_id, status, amount_paid, bookings_used, created_at, updated_at
          )
          VALUES (
            ${customerId}, ${membershipItem.id}, ${startDate}, ${endDate}, ${tenantId}, 'active', ${amountPaid}, 0, NOW(), NOW()
          )
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
        let pkgDetails: any = null
        try {
          const res = await sql`
            SELECT id, services, validity_days FROM service_packages 
            WHERE id = ${pkgItem.id} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
          `
          pkgDetails = res[0]
        } catch {
          try {
            const res = await sql`
              SELECT id, services, validity_days FROM service_packages 
              WHERE id = ${pkgItem.id}
            `
            pkgDetails = res[0]
          } catch {
            pkgDetails = null
          }
        }

        if (pkgDetails) {
          const servicesArr = Array.isArray(pkgDetails.services) 
            ? pkgDetails.services 
            : JSON.parse(pkgDetails.services || "[]")
          
          // Assuming 1 quantity of each service in the package per package bought
          const totalServices = servicesArr.map((s: number) => ({ service_id: s, quantity: 1 * pkgItem.quantity }))
          const remainingServices = totalServices;
          
          let expiresAt = null;
          if (pkgDetails.validity_days) {
            expiresAt = new Date(Date.now() + pkgDetails.validity_days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          }

          try {
            await sql`
              INSERT INTO customer_packages (
                tenant_id, customer_id, package_id, total_services, remaining_services, expires_at
              ) VALUES (
                ${tenantId}, ${customerId}, ${pkgItem.id}, 
                ${JSON.stringify(totalServices)}, ${JSON.stringify(remainingServices)}, ${expiresAt}
              )
            `
          } catch (errCp) {
            console.error("Could not record customer package:", errCp)
          }
        }
      }

      // Create invoice with proper item categorization and tenant_id
      let invoice: any;
      const shareToken = crypto.randomBytes(16).toString("hex")
      try {
        const rows = await sql`
          INSERT INTO invoices (
            invoice_number, customer_id, booking_id, amount, subtotal, discount_amount, gst_amount,
            payment_method, service_details, product_details, invoice_date, due_date,
            notes, tenant_id, share_token, idempotency_key, created_at, updated_at
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
            ${shareToken},
            ${input.idempotency_key || null},
            NOW(),
            NOW()
          ) RETURNING *
        `
        invoice = rows[0]
      } catch (err) {
        // Fallback without idempotency_key column if schema issue
        const rows = await sql`
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
            ${shareToken},
            NOW(),
            NOW()
          ) RETURNING *
        `
        invoice = rows[0]
      }

      // --- Staff Commission Splits (Services & Retail Products) ---
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

        const commissionItems = input.items.filter((item) => (item.staff_members && item.staff_members.length > 0) || item.staff_id)
        for (const item of commissionItems) {
          if (item.staff_members && item.staff_members.length > 0) {
            for (const member of item.staff_members) {
              const splitPct = Number(member.split_percentage) || 0
              const amount = Math.round(((item.price * item.quantity * splitPct) / 100) * 100) / 100
              await sql`
                INSERT INTO staff_commission_splits (
                  tenant_id, invoice_id, service_item_name, staff_id, 
                  split_percentage, revenue_amount, created_at
                ) VALUES (
                  ${Number(tenantId)}, ${invoice.id}, ${item.name}, ${Number(member.id)},
                  ${splitPct}, ${amount}, NOW()
                )
              `
            }
          } else if (item.staff_id) {
            await sql`
              INSERT INTO staff_commission_splits (
                tenant_id, invoice_id, service_item_name, staff_id, 
                split_percentage, revenue_amount, created_at
              ) VALUES (
                ${Number(tenantId)}, ${invoice.id}, ${item.name}, ${Number(item.staff_id)},
                100, ${item.price * item.quantity}, NOW()
              )
            `
          }
        }
      } catch (err) {
        console.error("Failed to insert staff commission splits:", err)
      }

      // --- Deduct Inventory Stock (Retail Products & Salon Consumptions) ---
      try {
        // 1. Deduct retail products sold in cart
        for (const item of productItems) {
          const qty = Number(item.quantity) || 1
          await sql`
            UPDATE inventory SET 
              quantity = GREATEST(0, quantity - ${qty}),
              status = CASE 
                WHEN GREATEST(0, quantity - ${qty}) = 0 THEN 'out_of_stock'
                WHEN GREATEST(0, quantity - ${qty}) <= COALESCE(reorder_level, min_stock_level, 5) THEN 'low_stock'
                ELSE 'active'
              END,
              updated_at = NOW()
            WHERE (id = ${item.id} OR LOWER(name) = LOWER(${item.name})) AND tenant_id = ${tenantId}
          `.catch(() => {})

          await sql`
            UPDATE products SET 
              stock_quantity = GREATEST(0, stock_quantity - ${qty}),
              updated_at = NOW()
            WHERE (id = ${item.id} OR LOWER(name) = LOWER(${item.name})) AND tenant_id = ${tenantId}
          `.catch(() => {})

          // Record in inventory_adjustments
          await sql`
            INSERT INTO inventory_adjustments (
              tenant_id, product_id, adjustment_type, quantity, reason, notes, created_at
            ) VALUES (
              ${tenantId}, ${item.id}, 'decrease', ${qty},
              ${'POS Sale #' + invoiceNumber}, ${'Retail product sold to ' + customer.full_name}, NOW()
            )
          `.catch(() => {})
        }

        // 2. Deduct in-salon service product consumptions (e.g. 30 ml hair color, 50 ml developer, 15 ml shampoo)
        if (input.product_consumptions && input.product_consumptions.length > 0) {
          for (const consumption of input.product_consumptions) {
            const deductQty = Math.max(0, Number(consumption.quantity) || 0)
            const unit = consumption.unit || "ml"
            const name = consumption.name || "Salon Product"
            const sku = consumption.sku || null

            // Deduct from inventory
            if (consumption.inventory_id) {
              await sql`
                UPDATE inventory SET
                  quantity = GREATEST(0, quantity - ${deductQty}),
                  status = CASE 
                    WHEN GREATEST(0, quantity - ${deductQty}) = 0 THEN 'out_of_stock'
                    WHEN GREATEST(0, quantity - ${deductQty}) <= COALESCE(reorder_level, min_stock_level, 5) THEN 'low_stock'
                    ELSE 'active'
                  END,
                  updated_at = NOW()
                WHERE id = ${consumption.inventory_id} AND tenant_id = ${tenantId}
              `.catch(() => {})
            } else if (sku) {
              await sql`
                UPDATE inventory SET
                  quantity = GREATEST(0, quantity - ${deductQty}),
                  status = CASE 
                    WHEN GREATEST(0, quantity - ${deductQty}) = 0 THEN 'out_of_stock'
                    WHEN GREATEST(0, quantity - ${deductQty}) <= COALESCE(reorder_level, min_stock_level, 5) THEN 'low_stock'
                    ELSE 'active'
                  END,
                  updated_at = NOW()
                WHERE (UPPER(sku) = UPPER(${sku}) OR UPPER(barcode) = UPPER(${sku})) AND tenant_id = ${tenantId}
              `.catch(() => {})
            } else {
              await sql`
                UPDATE inventory SET
                  quantity = GREATEST(0, quantity - ${deductQty}),
                  status = CASE 
                    WHEN GREATEST(0, quantity - ${deductQty}) = 0 THEN 'out_of_stock'
                    WHEN GREATEST(0, quantity - ${deductQty}) <= COALESCE(reorder_level, min_stock_level, 5) THEN 'low_stock'
                    ELSE 'active'
                  END,
                  updated_at = NOW()
                WHERE LOWER(name) = LOWER(${name}) AND tenant_id = ${tenantId}
              `.catch(() => {})
            }

            // Record in product_consumptions table
            await sql`
              INSERT INTO product_consumptions (
                tenant_id, invoice_id, booking_id, inventory_id, product_id,
                product_name, sku, quantity_deducted, unit, service_name, staff_name, notes, created_at
              ) VALUES (
                ${tenantId}, ${invoice.id}, ${bookingId}, ${consumption.inventory_id || null},
                ${consumption.product_id || null}, ${name}, ${sku}, ${deductQty},
                ${unit}, ${consumption.service_name || null}, ${consumption.staff_name || null},
                ${consumption.notes || 'Service Consumption'}, NOW()
              )
            `.catch(() => {})

            // Also record in inventory_adjustments
            await sql`
              INSERT INTO inventory_adjustments (
                tenant_id, product_id, adjustment_type, quantity, reason, notes, created_at
              ) VALUES (
                ${tenantId}, ${consumption.inventory_id || consumption.product_id || invoice.id}, 'decrease', ${deductQty},
                ${'Service Consumption: ' + (consumption.service_name || 'In-Salon Service')},
                ${(consumption.staff_name ? 'Used by ' + consumption.staff_name + ': ' : '') + deductQty + ' ' + unit + ' of ' + name},
                NOW()
              )
            `.catch(() => {})
          }
        }

        // 3. Auto-trigger active consumption rules for billed services if no manual consumptions passed
        if (!input.product_consumptions || input.product_consumptions.length === 0) {
          try {
            const serviceItems = input.items.filter((item) => item.type === "service" || !item.type)
            if (serviceItems.length > 0) {
              const { processServiceAutoConsumption } = await import("@/app/actions/auto-consumption")
              for (const sItem of serviceItems) {
                if (sItem.id) {
                  await processServiceAutoConsumption({
                    tenantId,
                    sql,
                    serviceId: sItem.id,
                    serviceName: sItem.name,
                    bookingId: bookingId || undefined,
                    invoiceId: invoice.id,
                    staffId: sItem.staff_id || (sItem.staff_members?.[0]?.id ? Number(sItem.staff_members[0].id) : undefined),
                    staffName: sItem.staff_members?.[0]?.name,
                  }).catch(() => {})
                }
              }
            }
          } catch (autoErr) {
            console.error("Auto-consumption evaluation failed during checkout:", autoErr)
          }
        }
      } catch (stockErr) {
        console.error("Failed to deduct inventory stock during checkout:", stockErr)
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
              invoice_url: `https://biz.hanva.in/inv/${invoice.share_token}`,
              points: pointsEarned,
              coupon_code: input.coupon_code || "",
            },
            sql,
          }).catch((err) => console.error("Failed to send WhatsApp invoice automation:", err))

          // 2. Send Loyalty Update if points were earned or redeemed
          if (pointsEarned > 0 || pointsRedeemed > 0) {
            import("@/app/actions/loyalty").then(async ({ getCustomerLoyalty }) => {
              const loyaltyInfo = await getCustomerLoyalty(customerId, tenantId.toString())
              const balance = (loyaltyInfo as any)?.current_points ?? pointsEarned
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
            }).catch(() => {
              sql`
                SELECT COALESCE(SUM(CASE WHEN transaction_type IN ('earned', 'bonus', 'refund', 'referral', 'welcome') THEN points ELSE -points END), 0) as balance
                FROM loyalty_transactions
                WHERE customer_id = ${customerId} AND tenant_id = ${tenantId}
                  AND (expires_at IS NULL OR expires_at > NOW())
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
            })
          }
        }).catch((err) => console.error("Failed to import whatsapp-automations:", err))
      }

      // -------------------------------------------------------------
      // WALLET DEDUCTION (Customer prepaid monetary wallet)
      // -------------------------------------------------------------
      const methodStr = String(input.payment_method || "").toLowerCase().trim()
      const isFullWallet = methodStr === 'wallet'
      const isSplitWallet = input.split_second_method === 'wallet' || (methodStr.includes('split') && methodStr.includes('wallet'))

      if (isFullWallet) {
        try {
          const { debitWallet } = await import("@/app/actions/wallet")
          const debitAmount = Math.round(total * 100) / 100
          if (debitAmount > 0) {
            const debitRes = await debitWallet(
              customerId,
              debitAmount,
              `Payment for Invoice #${invoiceNumber}`,
              invoice.id
            )
            if (!debitRes.success) {
              console.warn("Wallet debit warning:", debitRes.error)
            }
          }
        } catch (walletErr) {
          console.error("Failed to debit wallet during checkout:", walletErr)
        }
      } else if (isSplitWallet) {
        try {
          const { debitWallet } = await import("@/app/actions/wallet")
          const cashPortion = Number(input.split_cash_amount) || 0
          const walletPortion = Math.max(0, Math.round((total - cashPortion) * 100) / 100)
          if (walletPortion > 0) {
            const debitRes = await debitWallet(
              customerId,
              walletPortion,
              `Split payment (Wallet portion) for Invoice #${invoiceNumber}`,
              invoice.id
            )
            if (!debitRes.success) {
              console.warn("Split wallet debit warning:", debitRes.error)
            }
          }
        } catch (walletErr) {
          console.error("Failed to debit split wallet during checkout:", walletErr)
        }
      }

      // -------------------------------------------------------------
      // REFERRAL LINKING & REWARD (First-Time Checkout Logic)
      // -------------------------------------------------------------
      if (input.referral_code) {
        try {
          const cleanRef = input.referral_code.trim().toUpperCase()
          const refRows = await sql`
            SELECT id FROM customers
            WHERE tenant_id = ${tenantId}
              AND (
                ('REF' || LPAD(id::text, 4, '0') || RIGHT(phone_number, 4)) = ${cleanRef}
                OR ('REF' || id::text) = ${cleanRef}
                OR referral_code = ${cleanRef}
              )
            LIMIT 1
          `.catch(() => [])
          if (refRows.length > 0) {
            const referrerId = refRows[0].id
            if (Number(referrerId) !== Number(customerId)) {
              await sql`
                UPDATE customers
                SET referred_by_customer_id = ${referrerId}
                WHERE id = ${customerId} AND tenant_id = ${tenantId} AND (referred_by_customer_id IS NULL)
              `.catch(() => {})
            }
          }
        } catch (refErr) {
          console.error("Failed to link referral during checkout:", refErr)
        }
      }

      try {
        const { processFirstTimeReferralOnCheckout } = await import("@/app/actions/referrals")
        await processFirstTimeReferralOnCheckout({
          customerId,
          invoiceId: invoice.id,
          totalAmount: total,
          tenantId,
        })
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
  }

  if (authContext) {
    return await runner(authContext)
  }
  return await withTenantAuth(runner)
}
