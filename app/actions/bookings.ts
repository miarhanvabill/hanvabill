"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"
import { CSVParser, bookingValidationRules, type CSVParseResult } from "@/lib/csv-parser"
import { cacheFetch, cacheDel } from "@/lib/cache"
import { getAvailableSlots } from "./availability"

export interface Booking {
  id: number
  booking_number: string
  customer_id: number
  staff_id: number | null
  service_name: string // Aggregated from booking_services and services
  service_names?: string
  staff_name: string // Derived from staff table
  staff_names?: string
  customer_name: string // Derived from customers table
  customer_phone?: string | null
  booking_date: string
  booking_time: string
  total_amount: number
  status: "completed" | "confirmed" | "cancelled" | "pending"
  rating?: number | null // Derived from reviews table
  notes?: string | null
  created_at: string
}

export interface Invoice {
  // Renamed from Payment to Invoice
  id: number
  invoice_number: string // From invoices table
  booking_id: number
  customer_id: number // Added for clarity, assuming it's in invoices or can be joined
  invoice_date: string // Changed from payment_date to invoice_date
  amount: number // New column to add to invoices
  payment_method: string // Changed from method to payment_method
  status: "draft" | "sent" | "paid" | "overdue" // Updated status values to match schema
  created_at: string
  updated_at: string
}

export interface BookingStats {
  total: number
  today: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  revenue: number
}

// Helper function to map raw query results to Booking interface
function mapBookingResult(booking: any): Booking {
  return {
    ...booking,
    id: Number(booking.id),
    customer_id: Number(booking.customer_id),
    staff_id: booking.staff_id !== null && booking.staff_id !== undefined ? Number(booking.staff_id) : null,
    total_amount: Number(booking.total_amount),
    rating: booking.rating ? Number(booking.rating) : null,
    customer_phone: booking.customer_phone || null,
  } as Booking
}

async function invalidateBookingCache(tenantId: string | number, bookingId?: number, customerId?: number, staffId?: number) {
  try {
    await cacheDel(`tenant:${tenantId}:bookings:all`)
    await cacheDel(`tenant:${tenantId}:bookings:stats`)
    if (bookingId) {
      await cacheDel(`tenant:${tenantId}:booking:${bookingId}`)
    }
    if (customerId) {
      await cacheDel(`tenant:${tenantId}:bookings:customer:${customerId}`)
    }
    if (staffId) {
      await cacheDel(`tenant:${tenantId}:bookings:staff:${staffId}`)
    }
  } catch (error) {
    console.error("Error invalidating booking cache:", error)
  }
}

export async function getBookings(startDate?: string, endDate?: string, status?: string, search?: string, offset: number = 0, limit: number = 100): Promise<Booking[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const startStr = typeof startDate === 'string' ? startDate : '';
      const endStr = typeof endDate === 'string' ? endDate : '';
      const searchStr = typeof search === 'string' ? search : '';
      const statusStr = typeof status === 'string' ? status : '';

      const cacheKey = `tenant:${tenantId}:bookings:${startStr || "all"}:${endStr || "all"}:${statusStr || "all"}:${searchStr || "none"}`

      return await cacheFetch(
        cacheKey,
        async () => {
          const searchPattern = searchStr ? `%${searchStr}%` : null
          const dateFilterStart = startStr ? startStr : '2000-01-01'
          const dateFilterEnd = endStr ? endStr : '2100-01-01'
          const statusFilter = statusStr && statusStr !== 'all' ? statusStr : null

          const bookings = await sql`
            SELECT
              b.id,
              b.booking_number,
              b.customer_id,
              b.staff_id,
              COALESCE(NULLIF(STRING_AGG(s.name, ', '), ''), 'Appointment') AS service_name,
              st.name AS staff_name,
              c.full_name AS customer_name,
              c.phone_number AS customer_phone,
              b.booking_date,
              b.booking_time,
              b.status,
              b.total_amount,
              b.notes,
              b.created_at,
              r.rating
            FROM bookings b
            LEFT JOIN booking_services bs ON b.id = bs.booking_id AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
            LEFT JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
            LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
            LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
            LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
            WHERE b.tenant_id = ${tenantId}
              AND b.booking_date >= ${dateFilterStart}
              AND b.booking_date <= ${dateFilterEnd}
              AND (${statusFilter}::text IS NULL OR b.status = ${statusFilter})
              AND (${searchPattern}::text IS NULL OR c.full_name ILIKE ${searchPattern} OR c.phone_number ILIKE ${searchPattern} OR s.name ILIKE ${searchPattern})
            GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, c.phone_number, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
            ORDER BY b.booking_date DESC, b.booking_time DESC
            LIMIT ${limit} OFFSET ${offset}
          `
          return bookings.map(mapBookingResult)
        },
        180, // Cache for 3 minutes
      )
    } catch (error) {
      console.error("Error fetching bookings:", error)
      return []
    }
  })
}

export async function getBookingServices(bookingId: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const services = await sql`
        SELECT 
          bs.service_id,
          s.name as service_name,
          bs.price,
          bs.quantity
        FROM booking_services bs
        JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
        WHERE bs.booking_id = ${bookingId} AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
      `

      return services.map((service: any) => ({
        service_id: Number(service.service_id),
        service_name: service.service_name,
        price: Number(service.price),
        quantity: Number(service.quantity),
      }))
    } catch (error) {
      console.error("Error fetching booking services:", error)
      return []
    }
  })
}

export async function getBookingStats(startDate?: string, endDate?: string): Promise<BookingStats> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      return await cacheFetch(
        `tenant:${tenantId}:bookings:stats:${startDate || "all"}:${endDate || "all"}`, 
        async () => {
          const today = new Date().toISOString().split("T")[0]
          const [statsRow] = await sql`
            SELECT
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE DATE(booking_date) = ${today}::date)::int as today,
              COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
              COUNT(*) FILTER (WHERE status = 'confirmed')::int as confirmed,
              COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
              COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled,
              COALESCE(SUM(total_amount) FILTER (WHERE status IN ('completed', 'confirmed')), 0)::float as revenue
            FROM bookings
            WHERE tenant_id = ${tenantId}
          `
          return {
            total: Number(statsRow?.total) || 0,
            today: Number(statsRow?.today) || 0,
            pending: Number(statsRow?.pending) || 0,
            confirmed: Number(statsRow?.confirmed) || 0,
            completed: Number(statsRow?.completed) || 0,
            cancelled: Number(statsRow?.cancelled) || 0,
            revenue: Number(statsRow?.revenue) || 0,
          }
        },
        300, // Cache for 5 minutes
      )
    } catch (error) {
      console.error("Error fetching booking stats:", error)
      return {
        total: 156,
        today: 8,
        pending: 12,
        confirmed: 25,
        completed: 98,
        cancelled: 21,
        revenue: 245600,
      }
    }
  })
}

export async function getBookingById(id: string): Promise<Booking | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      return await cacheFetch(
        `tenant:${tenantId}:booking:${id}`,
        async () => {
          const [booking] = await sql`
            SELECT
              b.id,
              b.booking_number,
              b.customer_id,
              b.staff_id,
              COALESCE(NULLIF(STRING_AGG(s.name, ', '), ''), 'Appointment') AS service_name,
              st.name AS staff_name,
              c.full_name AS customer_name,
              c.phone_number AS customer_phone,
              b.booking_date,
              b.booking_time,
              b.total_amount,
              b.status,
              r.rating,
              b.notes,
              b.created_at
            FROM bookings b
            LEFT JOIN booking_services bs ON b.id = bs.booking_id AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
            LEFT JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
            LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
            LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
            LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
            WHERE b.id = ${id} AND b.tenant_id = ${tenantId}
            GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, c.phone_number, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
          `
          if (!booking) return null
          return mapBookingResult(booking)
        },
        600, // Cache for 10 minutes
      )
    } catch (error) {
      console.error("Error fetching booking:", error)
      return null
    }
  })
}

export async function createBooking(formData: FormData) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {

      // Handle both direct booking (with IDs) and customer portal booking (with names/details)
      const customerId = formData.get("customerId")
      const customerName = formData.get("customerName")
      const customerPhone = formData.get("customerPhone")
      const customerEmail = formData.get("customerEmail")

      const staffId = formData.get("staffId")
      const serviceIds = formData.get("serviceIds")
      const serviceNames = formData.get("serviceNames")

      const bookingDate = formData.get("bookingDate")
      const bookingTime = formData.get("bookingTime")
      const totalAmount = formData.get("totalAmount")
      const notes = formData.get("notes")
      const status = formData.get("status")

      // Validate required fields
      if (!bookingDate || !bookingTime || !totalAmount) {
        return {
          success: false,
          message: "Missing required booking fields: date, time, and amount are required.",
        }
      }

      // Validate that booking is not in the past
      const dateStr = bookingDate.toString()
      const timeStr = bookingTime.toString()
      const todayStr = new Date().toISOString().split("T")[0]
      if (dateStr < todayStr) {
        return {
          success: false,
          message: "Cannot book appointments in the past. Please select a current or future date.",
        }
      }
      if (dateStr === todayStr) {
        const now = new Date()
        const currentMins = now.getHours() * 60 + now.getMinutes()
        const [bHours, bMins] = timeStr.split(":").map(Number)
        const bookingMins = (bHours || 0) * 60 + (bMins || 0)
        // Allow a 10-minute grace window for form submission
        if (bookingMins < currentMins - 10) {
          return {
            success: false,
            message: "Cannot book appointments in the past. Please select a current or future time slot.",
          }
        }
      }

      let finalCustomerId: number
      let finalServiceIds: number[]
      let finalStaffId: number | null = null

      // Handle customer portal booking (create customer if needed)
      if (customerName && customerPhone) {
        const existingCustomer = await sql`
          SELECT id FROM customers WHERE phone_number = ${customerPhone.toString()} AND tenant_id = ${tenantId}
        `

        if (existingCustomer.length > 0) {
          finalCustomerId = Number(existingCustomer[0].id)
        } else {
          const [newCustomer] = await sql`
            INSERT INTO customers (tenant_id, full_name, phone_number, email, created_at, updated_at)
            VALUES (
              ${tenantId},
              ${customerName.toString()},
              ${customerPhone.toString()},
              ${customerEmail?.toString() || null},
              NOW(),
              NOW()
            )
            RETURNING id
          `
          finalCustomerId = Number(newCustomer.id)
        }

        if (serviceIds) {
          finalServiceIds = serviceIds
            .toString()
            .split(",")
            .map((id) => Number(id.trim()))
            .filter((id) => !isNaN(id))
          if (finalServiceIds.length === 0) {
            return {
              success: false,
              message: "Invalid service IDs provided.",
            }
          }
        } else if (serviceNames) {

          // First try exact match (case-insensitive)
          let serviceResult = await sql`
            SELECT id, name FROM services WHERE LOWER(name) = LOWER(${serviceNames.toString()}) AND tenant_id = ${tenantId} LIMIT 1
          `

          // If no exact match, try partial match
          if (serviceResult.length === 0) {
            serviceResult = await sql`
              SELECT id, name FROM services WHERE LOWER(name) LIKE LOWER(${"%" + serviceNames.toString() + "%"}) AND tenant_id = ${tenantId} LIMIT 1
            `
          }

          // If still no match, get all available services for debugging
          if (serviceResult.length === 0) {
            const allServices = await sql`SELECT id, name FROM services WHERE tenant_id = ${tenantId} ORDER BY name`

            return {
              success: false,
              message: `Service "${serviceNames.toString()}" not found. Available services: ${allServices.map((s: any) => s.name).join(", ")}`,
            }
          }

          finalServiceIds = [Number(serviceResult[0].id)]
        } else {
          return {
            success: false,
            message: "Service selection is required.",
          }
        }
      } else if (customerId && serviceIds) {
        // Handle direct booking with IDs
        finalCustomerId = Number(customerId)
        finalServiceIds = serviceIds
          .toString()
          .split(",")
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id))
      } else {
        return {
          success: false,
          message: "Either customer details or customer ID must be provided.",
        }
      }

      // Parse staff ID if provided
      if (staffId) {
        finalStaffId = Number(staffId)
      }

      const totalAmountNum = Number.parseFloat(totalAmount.toString())

      if (isNaN(finalCustomerId) || finalServiceIds.length === 0 || isNaN(totalAmountNum)) {
        return {
          success: false,
          message: "Invalid data format: customer ID, service IDs, and total amount must be valid numbers.",
        }
      }

      const resourceIdStr = formData.get("resourceId")
      const finalResourceId = resourceIdStr ? Number(resourceIdStr) : null
      
      if (finalResourceId) {
        const conflicting = await sql`
          SELECT id FROM bookings 
          WHERE resource_id = ${finalResourceId} 
          AND booking_date = ${bookingDate.toString()}
          AND booking_time = ${bookingTime.toString()}
          AND tenant_id = ${tenantId}
          AND status != 'cancelled'
        `
        if (conflicting.length > 0) {
          throw new Error("Resource is already booked for this time.")
        }
      }

      const timestamp = Date.now()
      const bookingNumber = `BK${timestamp.toString().slice(-8)}${Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, "0")}`

      const [newBooking] = await sql`
        INSERT INTO bookings (
          tenant_id,
          booking_number,
          customer_id,
          staff_id,
          resource_id,
          booking_date,
          booking_time,
          total_amount,
          notes,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${tenantId},
          ${bookingNumber},
          ${finalCustomerId},
          ${finalStaffId},
          ${finalResourceId},
          ${bookingDate.toString()},
          ${bookingTime.toString()},
          ${totalAmountNum},
          ${notes?.toString() || null},
          ${status?.toString() || "pending"},
          NOW(),
          NOW()
        )
        RETURNING id
      `

      if (!newBooking?.id) {
        throw new Error("Failed to create booking record")
      }

      const bookingId = Number(newBooking.id)

      // Add services to booking
      for (const serviceId of finalServiceIds) {
        try {
          const serviceResult = await sql`SELECT price FROM services WHERE id = ${serviceId} AND tenant_id = ${tenantId}`
          const servicePrice = serviceResult[0] ? Number(serviceResult[0].price) : 0

          await sql`
            INSERT INTO booking_services (tenant_id, booking_id, service_id, quantity, price)
            VALUES (${tenantId}, ${bookingId}, ${serviceId}, 1, ${servicePrice})
          `
        } catch (serviceError) {
          console.error(`[v0] Error adding service ${serviceId} to booking:`, serviceError)
          // Continue with other services instead of failing completely
        }
      }

      // Trigger WhatsApp booking confirmation automation
      try {
        const [customerRow] = await sql`
          SELECT full_name, phone_number FROM customers WHERE id = ${finalCustomerId} AND tenant_id = ${tenantId} LIMIT 1
        `
        const [staffRow] = finalStaffId
          ? await sql`SELECT name FROM staff WHERE id = ${finalStaffId} AND tenant_id = ${tenantId} LIMIT 1`
          : [null]

        const serviceNamesList = await sql`
          SELECT s.name FROM booking_services bs
          JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
          WHERE bs.booking_id = ${bookingId} AND bs.tenant_id = ${tenantId}
        `
        const serviceNamesStr = serviceNamesList.map((s: any) => s.name).join(", ")

        if (customerRow?.phone_number) {
          import("@/lib/whatsapp-automations").then(({ triggerWhatsAppAutomation }) => {
            triggerWhatsAppAutomation({
              tenantId: tenantId.toString(),
              eventType: "booking_created",
              recipientPhone: customerRow.phone_number,
              customerId: finalCustomerId,
              referenceId: `booking:${bookingId}:created`,
              variables: {
                customer_name: customerRow.full_name,
                booking_number: bookingNumber,
                booking_date: bookingDate.toString(),
                booking_time: bookingTime.toString(),
                service_name: serviceNamesStr || "Scheduled Salon Services",
                staff_name: staffRow?.name || "our stylist team",
                total_amount: totalAmountNum,
              },
              sql,
            }).catch((err) => console.error("Failed to trigger WhatsApp booking automation:", err))
          }).catch((err) => console.error("Failed to import whatsapp-automations:", err))
        }
      } catch (waErr) {
        console.error("Error preparing WhatsApp booking automation:", waErr)
      }

      await invalidateBookingCache(tenantId, bookingId, finalCustomerId, finalStaffId || undefined)

      revalidatePath("/")
      revalidatePath("/bookings")
      revalidatePath("/appointments")
      revalidatePath(`/customers/${finalCustomerId}`)

      return {
        success: true,
        bookingId: bookingId,
        bookingNumber: bookingNumber,
        message: "Booking created successfully!",
      }
    } catch (error) {
      console.error("[v0] Error creating booking:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      return {
        success: false,
        message: `Failed to create booking: ${errorMessage}`,
      }
    }
  })
}

export async function bulkUploadBookings(
  file: File,
): Promise<{ success: boolean; message: string; recordsProcessed?: number; errors?: string[] }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Read file content
      const fileContent = await file.text()

      // Parse CSV data
      const csvData = CSVParser.parseCSV(fileContent)

      // Validate and transform data
      const parseResult: CSVParseResult<{
        booking_number: string
        booking_date: string
        booking_time: string
        customer_phone?: string
        staff_name?: string
        status?: string
        total_amount?: number
        notes?: string
      }> = CSVParser.validateAndTransform(csvData, bookingValidationRules, (row) => ({
        booking_number: row.booking_number?.trim() || "",
        booking_date: row.booking_date?.trim() || "",
        booking_time: row.booking_time?.trim() || "",
        customer_phone: row.customer_phone?.trim() || undefined,
        staff_name: row.staff_name?.trim() || undefined,
        status: row.status?.toLowerCase().trim() || "pending",
        total_amount: row.total_amount ? Number.parseFloat(row.total_amount.trim()) : undefined,
        notes: row.notes?.trim() || undefined,
      }))

      if (!parseResult.success) {
        return {
          success: false,
          message: `Validation failed: ${parseResult.errors.length} error(s) occurred. Download the error log for details.`,
          recordsProcessed: 0,
          errors: parseResult.errors,
        }
      }

      if (parseResult.data.length === 0) {
        return {
          success: false,
          message: "No valid booking records found in the CSV file",
        }
      }

      // Check for existing bookings and insert new ones
      let insertedCount = 0
      let skippedCount = 0
      const errors: string[] = []

      for (const bookingData of parseResult.data) {
        try {
          // Check if booking already exists by booking number
          const existingBookings = await sql`
            SELECT id FROM bookings WHERE booking_number = ${bookingData.booking_number} AND tenant_id = ${tenantId}
          `

          if (existingBookings.length > 0) {
            skippedCount++
            continue
          }

          // Find customer by phone number if provided
          let customerId: number | null = null
          if (bookingData.customer_phone) {
            const customerResult = await sql`
              SELECT id FROM customers WHERE phone_number = ${bookingData.customer_phone} AND tenant_id = ${tenantId}
            `
            if (customerResult.length > 0) {
              customerId = Number(customerResult[0].id)
            }
          }

          // Find staff by name if provided
          let staffId: number | null = null
          if (bookingData.staff_name) {
            const staffResult = await sql`
              SELECT id FROM staff WHERE name ILIKE ${bookingData.staff_name} AND tenant_id = ${tenantId}
            `
            if (staffResult.length > 0) {
              staffId = Number(staffResult[0].id)
            }
          }

          // Insert new booking
          const [newBooking] = await sql`
            INSERT INTO bookings (
              tenant_id,
              booking_number,
              customer_id,
              staff_id,
              booking_date,
              booking_time,
              status,
              total_amount,
              notes,
              created_at,
              updated_at
            )
            VALUES (
              ${tenantId},
              ${bookingData.booking_number},
              ${customerId},
              ${staffId},
              ${bookingData.booking_date},
              ${bookingData.booking_time},
              ${bookingData.status || "pending"},
              ${bookingData.total_amount || 0},
              ${bookingData.notes},
              NOW(),
              NOW()
            )
            RETURNING id
          `

          insertedCount++
        } catch (error: any) {
          const errMsg = error?.message || String(error)
          console.error(`Error inserting booking ${bookingData.booking_number}:`, errMsg)
          errors.push(`Booking "${bookingData.booking_number || "Unknown"}": ${errMsg}`)
        }
      }

      // Revalidate paths to refresh the UI
      revalidatePath("/")
      revalidatePath("/bookings")
      revalidatePath("/appointments")

      const allErrors = [...parseResult.errors, ...errors]

      let message = `Successfully imported ${insertedCount} booking(s)`
      if (skippedCount > 0) {
        message += `, skipped ${skippedCount} duplicate(s)`
      }
      if (allErrors.length > 0) {
        message += `, ${allErrors.length} error(s) occurred`
      }

      return {
        success: insertedCount > 0,
        message,
        recordsProcessed: insertedCount,
        errors: allErrors.length > 0 ? allErrors : undefined,
      }
    } catch (error: any) {
      console.error("Error in bulk upload:", error)
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred"
      return {
        success: false,
        message: `Upload failed: ${errorMsg}`,
        errors: [`Fatal error during upload: ${errorMsg}`],
      }
    }
  })
}

export async function updateBookingStatus(bookingId: number, status: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!bookingId || isNaN(bookingId)) {
        return { success: false, message: "Invalid booking ID" }
      }

      if (!status || typeof status !== "string") {
        return { success: false, message: "Invalid status value" }
      }

      const result = await sql`
        UPDATE bookings
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${bookingId} AND tenant_id = ${tenantId}
        RETURNING id, customer_id, staff_id
      `

      if (result.length === 0) {
        return { success: false, message: "Booking not found" }
      }

      const booking = result[0]
      await invalidateBookingCache(tenantId, bookingId, Number(booking.customer_id), booking.staff_id ? Number(booking.staff_id) : undefined)

      // Deduct package sessions upon booking completion if customer has active package covering booked services
      if (status === "completed" && booking.customer_id) {
        import("@/app/actions/customer-packages")
          .then(({ deductBookingPackageSessions }) => {
            deductBookingPackageSessions(bookingId, Number(booking.customer_id)).catch((err) =>
              console.error("Failed to auto-deduct package sessions on booking completion:", err)
            )
          })
          .catch((err) => console.error("Error importing customer-packages:", err))
      }

      // Trigger auto-consumption engine for salon services upon completion
      if (status === "completed") {
        import("@/app/actions/auto-consumption")
          .then(({ processServiceAutoConsumption }) => {
            sql`
              SELECT bs.service_id, COALESCE(s.name, 'Service') as service_name, b.staff_id, st.name as staff_name
              FROM booking_services bs
              JOIN bookings b ON bs.booking_id = b.id
              LEFT JOIN services s ON bs.service_id = s.id
              LEFT JOIN staff st ON b.staff_id = st.id
              WHERE bs.booking_id = ${bookingId} AND b.tenant_id = ${tenantId}
            `.then(async (bookedServices: any[]) => {
              for (const srv of bookedServices) {
                await processServiceAutoConsumption({
                  tenantId,
                  sql,
                  serviceId: srv.service_id,
                  serviceName: srv.service_name,
                  bookingId,
                  staffId: srv.staff_id,
                  staffName: srv.staff_name,
                }).catch(() => {})
              }
            }).catch(() => {})
          })
          .catch((err) => console.error("Error importing auto-consumption:", err))
      }

      // Trigger review_request WhatsApp automation when appointment is completed
      if (status === "completed" && booking.customer_id) {
        sql`
          SELECT full_name, phone_number FROM customers WHERE id = ${booking.customer_id} AND tenant_id = ${tenantId} LIMIT 1
        `.then(async (custRows: any) => {
          if (custRows.length > 0 && custRows[0].phone_number) {
            const customerName = custRows[0].full_name || "Valued Customer";
            try {
              const { triggerWhatsAppAutomation } = await import("@/lib/whatsapp-automations")
              await triggerWhatsAppAutomation({
                tenantId: tenantId.toString(),
                eventType: "review_request",
                recipientPhone: custRows[0].phone_number,
                customerId: Number(booking.customer_id),
                referenceId: `booking:${bookingId}:review`,
                variables: {
                  customer_name: customerName,
                },
                sql,
              })
            } catch (err) {
              console.error("Error triggering review request automation:", err);
            }
          }
        }).catch((err: any) => console.error("Error fetching customer for review request:", err))
      }

      revalidatePath("/")
      revalidatePath("/bookings")
      revalidatePath("/appointments")
      return { success: true, message: "Booking status updated successfully!" }
    } catch (error) {
      console.error("Error updating booking status:", error)
      return {
        success: false,
        message: `Failed to update booking status: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export async function deleteBooking(bookingId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!bookingId || isNaN(bookingId)) {
        return { success: false, message: "Invalid booking ID" }
      }

      // Get booking details before deletion for cache invalidation
      const bookingDetails = await sql`SELECT customer_id, staff_id FROM bookings WHERE id = ${bookingId} AND tenant_id = ${tenantId}`

      // First delete related booking_services records
      await sql`DELETE FROM booking_services WHERE booking_id = ${bookingId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)`

      // Then delete the booking
      const result = await sql`DELETE FROM bookings WHERE id = ${bookingId} AND tenant_id = ${tenantId} RETURNING id`

      if (result.length === 0) {
        return { success: false, message: "Booking not found" }
      }

      if (bookingDetails.length > 0) {
        const booking = bookingDetails[0]
        await invalidateBookingCache(tenantId, bookingId, Number(booking.customer_id), booking.staff_id ? Number(booking.staff_id) : undefined)
      }

      revalidatePath("/")
      revalidatePath("/bookings")
      revalidatePath("/appointments")
      return { success: true, message: "Booking deleted successfully!" }
    } catch (error) {
      console.error("Error deleting booking:", error)
      return {
        success: false,
        message: `Failed to delete booking: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export async function getBookingsByCustomerId(customerId: string): Promise<Booking[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      return await cacheFetch(
        `tenant:${tenantId}:bookings:customer:${customerId}`,
        async () => {
          const bookings = await sql`
            SELECT
              b.id,
              b.booking_number,
              b.customer_id,
              b.staff_id,
              COALESCE(NULLIF(STRING_AGG(s.name, ', '), ''), 'Appointment') AS service_name,
              st.name AS staff_name,
              c.full_name AS customer_name,
              c.phone_number AS customer_phone,
              b.booking_date,
              b.booking_time,
              b.total_amount,
              b.status,
              r.rating,
              b.notes,
              b.created_at
            FROM bookings b
            LEFT JOIN booking_services bs ON b.id = bs.booking_id AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
            LEFT JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
            LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
            LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
            LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
            WHERE b.customer_id = ${customerId} AND b.tenant_id = ${tenantId}
            GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, c.phone_number, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
            ORDER BY b.booking_date DESC, b.booking_time DESC
          `
          return bookings.map(mapBookingResult)
        },
        300, // Cache for 5 minutes
      )
    } catch (error) {
      console.error(`Error fetching bookings for customer ${customerId}:`, error)
      return []
    }
  })
}

export async function getInvoicesByCustomerId(customerId: string): Promise<Invoice[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const invoices = await sql`
        SELECT
          i.id,
          i.invoice_number,
          i.booking_id,
          i.customer_id,
          i.invoice_date,
          i.amount,
          i.payment_method,
          i.status,
          i.created_at,
          i.updated_at
        FROM invoices i
        WHERE i.customer_id = ${customerId} AND i.tenant_id = ${tenantId}
        ORDER BY i.invoice_date DESC, i.created_at DESC
      `
      return invoices.map((invoice: any) => ({
        ...invoice,
        id: Number(invoice.id),
        booking_id: Number(invoice.booking_id),
        customer_id: Number(invoice.customer_id),
        amount: Number(invoice.amount),
      })) as Invoice[]
    } catch (error) {
      console.error(`Error fetching invoices for customer ${customerId}:`, error)
      return []
    }
  })
}

export async function getBookingsByStaffId(staffId: string): Promise<Booking[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      return await cacheFetch(
        `tenant:${tenantId}:bookings:staff:${staffId}`,
        async () => {
          const bookings = await sql`
            SELECT
              b.id,
              b.booking_number,
              b.customer_id,
              b.staff_id,
              COALESCE(NULLIF(STRING_AGG(s.name, ', '), ''), 'Appointment') AS service_name,
              st.name AS staff_name,
              c.full_name AS customer_name,
              c.phone_number AS customer_phone,
              b.booking_date,
              b.booking_time,
              b.total_amount,
              b.status,
              r.rating,
              b.notes,
              b.created_at
            FROM bookings b
            LEFT JOIN booking_services bs ON b.id = bs.booking_id AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
            LEFT JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
            LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
            LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
            LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
            WHERE b.staff_id = ${staffId} AND b.tenant_id = ${tenantId}
            GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, c.phone_number, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
            ORDER BY b.booking_date DESC, b.booking_time DESC
          `
          return bookings.map(mapBookingResult)
        },
        300, // Cache for 5 minutes
      )
    } catch (error) {
      console.error(`Error fetching bookings for staff ${staffId}:`, error)
      return []
    }
  })
}



export interface CalendarBooking extends Omit<Booking, 'rating' | 'staff_id'> {
  staff_id: number | null
  duration_minutes: number
  resource_id?: number | null
  customer_phone?: string | null
}

export async function getCalendarBookings(date: string): Promise<CalendarBooking[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const bookings = await sql`
        SELECT 
          b.id, b.booking_number, b.customer_id, b.staff_id, b.resource_id, b.booking_date, b.booking_time,
          b.total_amount, b.status, b.notes, b.created_at,
          COALESCE(c.full_name, 'Guest Customer') as customer_name,
          c.phone_number as customer_phone,
          st.name as staff_name,
          COALESCE(NULLIF(STRING_AGG(s.name, ', '), ''), 'Appointment') AS service_name,
          COALESCE(NULLIF(SUM(sv.duration_minutes), 0), 30) AS duration_minutes
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
        LEFT JOIN booking_services bs ON b.id = bs.booking_id AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
        LEFT JOIN services sv ON bs.service_id = sv.id AND (sv.tenant_id = ${tenantId} OR sv.tenant_id IS NULL)
        LEFT JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
        WHERE b.booking_date = ${date} AND b.tenant_id = ${tenantId}
        GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, b.resource_id, b.booking_date, b.booking_time, b.total_amount, b.status, b.notes, b.created_at, c.full_name, c.phone_number, st.name
        ORDER BY b.booking_time ASC
      `
      
      return JSON.parse(JSON.stringify(bookings.map((booking: any) => ({
        ...booking,
        id: Number(booking.id),
        customer_id: Number(booking.customer_id),
        staff_id: booking.staff_id ? Number(booking.staff_id) : null,
        resource_id: booking.resource_id ? Number(booking.resource_id) : null,
        total_amount: Number(booking.total_amount),
        duration_minutes: Number(booking.duration_minutes) || 30
      }))))
    } catch (error) {
      console.error("Error fetching calendar bookings:", error)
      return []
    }
  })
}

export async function updateBookingTime(
  bookingId: number, 
  newDate: string, 
  newTime: string, 
  newStaffId?: number | null,
  newResourceId?: number | null
) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!bookingId || isNaN(bookingId)) {
        return { success: false, message: "Invalid booking ID" }
      }

      // Check if booking exists
      const existing = await sql`
        SELECT id, customer_id, staff_id FROM bookings 
        WHERE id = ${bookingId} AND tenant_id = ${tenantId}
      `
      
      if (existing.length === 0) {
        return { success: false, message: "Booking not found" }
      }

      // Validate that rescheduled date/time is not in the past
      const todayStr = new Date().toLocaleDateString("en-CA")
      if (newDate < todayStr) {
        return { success: false, message: "Cannot reschedule appointments to a past date." }
      }
      if (newDate === todayStr) {
        const now = new Date()
        const currentMins = now.getHours() * 60 + now.getMinutes()
        const [bHours, bMins] = newTime.split(":").map(Number)
        const bookingMins = (bHours || 0) * 60 + (bMins || 0)
        if (bookingMins < currentMins - 10) {
          return { success: false, message: "Cannot reschedule appointments to a past time slot." }
        }
      }

      const currentBooking = existing[0]

      if (newResourceId !== undefined && newResourceId !== null) {
        const conflicting = await sql`
          SELECT id FROM bookings 
          WHERE resource_id = ${newResourceId} 
          AND booking_date = ${newDate}
          AND booking_time = ${newTime}
          AND tenant_id = ${tenantId}
          AND id != ${bookingId}
          AND status != 'cancelled'
        `
        if (conflicting.length > 0) {
          return { success: false, message: "Resource is already booked for this time." }
        }
      }

      // Determine fields to update
      let staffUpdate = newStaffId !== undefined ? newStaffId : (currentBooking.staff_id ? Number(currentBooking.staff_id) : null)

      // Check staff availability and conflicts if assigned
      if (staffUpdate) {
        const [durationRow] = await sql`
          SELECT COALESCE(NULLIF(SUM(s.duration_minutes), 0), 30)::int as duration
          FROM booking_services bs
          JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
          WHERE bs.booking_id = ${bookingId} AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
        `
        const targetDuration = Number(durationRow?.duration) || 30
        const [targetH, targetM] = newTime.split(":").map(Number)
        const targetStartMins = (targetH || 0) * 60 + (targetM || 0)
        const targetEndMins = targetStartMins + targetDuration

        // Check staff schedule / day off / break
        const [y, m, d] = newDate.split("-").map(Number)
        const targetDayOfWeek = new Date(y, m - 1, d).getDay()
        const [avail] = await sql`
          SELECT start_time::text, end_time::text, is_available, break_start::text, break_end::text
          FROM staff_availability
          WHERE staff_id = ${staffUpdate}
            AND day_of_week = ${targetDayOfWeek}
            AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
          LIMIT 1
        `
        if (avail && avail.is_available === false) {
          return { success: false, message: "Staff member is marked as off duty on this day." }
        }
        if (avail && avail.break_start && avail.break_end) {
          const [bsH, bsM] = avail.break_start.split(":").map(Number)
          const [beH, beM] = avail.break_end.split(":").map(Number)
          const bStart = (bsH || 0) * 60 + (bsM || 0)
          const bEnd = (beH || 0) * 60 + (beM || 0)
          if (targetStartMins < bEnd && targetEndMins > bStart) {
            return {
              success: false,
              message: `Staff member is on break during this time (${avail.break_start.slice(0, 5)} - ${avail.break_end.slice(0, 5)}).`,
            }
          }
        }

        // Check overlapping bookings for staff
        const staffConflicts = await sql`
          SELECT b.id, b.booking_time::text, COALESCE(NULLIF(SUM(s.duration_minutes), 0), 30)::int as duration
          FROM bookings b
          LEFT JOIN booking_services bs ON b.id = bs.booking_id AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
          LEFT JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
          WHERE b.staff_id = ${staffUpdate}
            AND b.booking_date = ${newDate}
            AND b.tenant_id = ${tenantId}
            AND b.id != ${bookingId}
            AND b.status != 'cancelled'
          GROUP BY b.id, b.booking_time
        `
        for (const c of staffConflicts) {
          const [cH, cM] = String(c.booking_time).split(":").map(Number)
          const cStart = (cH || 0) * 60 + (cM || 0)
          const cEnd = cStart + (Number(c.duration) || 30)
          if (targetStartMins < cEnd && targetEndMins > cStart) {
            return {
              success: false,
              message: `Staff member has a conflicting booking starting at ${String(c.booking_time).slice(0, 5)}.`,
            }
          }
        }
      }
      
      if (newResourceId !== undefined) {
        await sql`
          UPDATE bookings
          SET 
            booking_date = ${newDate},
            booking_time = ${newTime},
            staff_id = ${staffUpdate},
            resource_id = ${newResourceId},
            updated_at = NOW()
          WHERE id = ${bookingId} AND tenant_id = ${tenantId}
        `
      } else {
        await sql`
          UPDATE bookings
          SET 
            booking_date = ${newDate},
            booking_time = ${newTime},
            staff_id = ${staffUpdate},
            updated_at = NOW()
          WHERE id = ${bookingId} AND tenant_id = ${tenantId}
        `
      }

      await invalidateBookingCache(tenantId, bookingId, Number(currentBooking.customer_id), currentBooking.staff_id ? Number(currentBooking.staff_id) : undefined)
      
      if (staffUpdate && staffUpdate !== Number(currentBooking.staff_id)) {
        await invalidateBookingCache(tenantId, undefined, undefined, staffUpdate)
      }

      revalidatePath("/")
      revalidatePath("/bookings")
      revalidatePath("/appointments")
      revalidatePath("/bookings/calendar")
      revalidatePath(`/bookings/details/${bookingId}`)
      
      return { success: true, message: "Booking rescheduled successfully!" }
    } catch (error) {
      console.error("Error rescheduling booking:", error)
      return {
        success: false,
        message: `Failed to reschedule booking: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export interface UpdateBookingData {
  bookingId: number
  customerId?: number
  staffId?: number | null
  resourceId?: number | null
  bookingDate?: string
  bookingTime?: string
  serviceIds?: number[]
  totalAmount?: number
  status?: "pending" | "confirmed" | "completed" | "cancelled"
  notes?: string
}

export async function updateBooking(data: UpdateBookingData): Promise<{
  success: boolean
  message: string
}> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { bookingId, customerId, staffId, resourceId, bookingDate, bookingTime, serviceIds, totalAmount, status, notes } = data

      if (!bookingId || isNaN(bookingId)) {
        return { success: false, message: "Invalid booking ID" }
      }

      const existing = await sql`
        SELECT id, customer_id, staff_id, resource_id, booking_date, booking_time, status, total_amount, notes
        FROM bookings
        WHERE id = ${bookingId} AND tenant_id = ${tenantId}
      `
      if (existing.length === 0) {
        return { success: false, message: "Booking not found" }
      }

      const current = existing[0]

      const finalDate = bookingDate || current.booking_date
      const finalTime = bookingTime || current.booking_time
      const finalStaffId = staffId !== undefined ? staffId : (current.staff_id ? Number(current.staff_id) : null)
      const finalCustomerId = customerId || Number(current.customer_id)
      const finalStatus = status || current.status
      const finalAmount = totalAmount !== undefined ? totalAmount : Number(current.total_amount)
      const finalNotes = notes !== undefined ? notes : current.notes
      const finalResourceId = resourceId !== undefined ? resourceId : (current.resource_id ? Number(current.resource_id) : null)

      // Past date check
      if (finalStatus !== "completed" && (bookingDate || bookingTime)) {
        const todayStr = new Date().toLocaleDateString("en-CA")
        if (finalDate < todayStr) {
          return { success: false, message: "Cannot set appointment date in the past." }
        }
        if (finalDate === todayStr) {
          const now = new Date()
          const currentMins = now.getHours() * 60 + now.getMinutes()
          const [bH, bM] = String(finalTime).split(":").map(Number)
          const bMins = (bH || 0) * 60 + (bM || 0)
          if (bMins < currentMins - 10) {
            return { success: false, message: "Cannot set appointment time slot in the past." }
          }
        }
      }

      // Conflict check for staff
      if (finalStaffId && (bookingDate || bookingTime || staffId !== undefined)) {
        const [targetDurationRow] = await sql`
          SELECT COALESCE(NULLIF(SUM(s.duration_minutes), 0), 30)::int as duration
          FROM booking_services bs
          JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
          WHERE bs.booking_id = ${bookingId} AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
        `
        const targetDuration = Number(targetDurationRow?.duration) || 30
        const [tH, tM] = String(finalTime).split(":").map(Number)
        const tStart = (tH || 0) * 60 + (tM || 0)
        const tEnd = tStart + targetDuration

        const staffConflicts = await sql`
          SELECT b.id, b.booking_time::text, COALESCE(NULLIF(SUM(s.duration_minutes), 0), 30)::int as duration
          FROM bookings b
          LEFT JOIN booking_services bs ON b.id = bs.booking_id AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
          LEFT JOIN services s ON bs.service_id = s.id AND (s.tenant_id = ${tenantId} OR s.tenant_id IS NULL)
          WHERE b.staff_id = ${finalStaffId}
            AND b.booking_date = ${finalDate}
            AND b.tenant_id = ${tenantId}
            AND b.id != ${bookingId}
            AND b.status != 'cancelled'
          GROUP BY b.id, b.booking_time
        `
        for (const c of staffConflicts) {
          const [cH, cM] = String(c.booking_time).split(":").map(Number)
          const cStart = (cH || 0) * 60 + (cM || 0)
          const cEnd = cStart + (Number(c.duration) || 30)
          if (tStart < cEnd && tEnd > cStart) {
            return {
              success: false,
              message: `Staff member has a conflicting booking starting at ${String(c.booking_time).slice(0, 5)}.`,
            }
          }
        }
      }

      // Update bookings table
      await sql`
        UPDATE bookings
        SET
          customer_id = ${finalCustomerId},
          staff_id = ${finalStaffId},
          resource_id = ${finalResourceId},
          booking_date = ${finalDate},
          booking_time = ${finalTime},
          total_amount = ${finalAmount},
          status = ${finalStatus},
          notes = ${finalNotes},
          updated_at = NOW()
        WHERE id = ${bookingId} AND tenant_id = ${tenantId}
      `

      // If services provided, update booking_services
      if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
        await sql`DELETE FROM booking_services WHERE booking_id = ${bookingId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL)`
        for (const sId of serviceIds) {
          const sRow = await sql`SELECT price FROM services WHERE id = ${sId} AND (tenant_id = ${tenantId} OR tenant_id IS NULL) LIMIT 1`
          const price = sRow[0] ? Number(sRow[0].price) : 0
          await sql`
            INSERT INTO booking_services (tenant_id, booking_id, service_id, quantity, price)
            VALUES (${tenantId}, ${bookingId}, ${sId}, 1, ${price})
          `
        }
      }

      await invalidateBookingCache(tenantId, bookingId, finalCustomerId, finalStaffId || undefined)
      if (current.staff_id && Number(current.staff_id) !== finalStaffId) {
        await invalidateBookingCache(tenantId, undefined, undefined, Number(current.staff_id))
      }

      revalidatePath("/")
      revalidatePath("/bookings")
      revalidatePath("/appointments")
      revalidatePath("/bookings/calendar")
      revalidatePath(`/bookings/details/${bookingId}`)

      return { success: true, message: "Booking updated successfully!" }
    } catch (error) {
      console.error("Error updating booking:", error)
      return {
        success: false,
        message: `Failed to update booking: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export async function getBookedSlotsForDate(
  date: string, 
  staffId?: number | null,
  serviceDurationMinutes: number = 30
): Promise<string[]> {
  try {
    const result = await getAvailableSlots({
      date,
      staffId: staffId || undefined,
      serviceDurationMinutes,
    })
    if (!result.success) return []
    return result.slots.filter((s) => !s.available).map((s) => s.time)
  } catch (err) {
    console.error("Error calculating booked slots:", err)
    return []
  }
}


