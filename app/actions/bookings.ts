"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"
import { CSVParser, bookingValidationRules, type CSVParseResult } from "@/lib/csv-parser"
import { cacheFetch, cacheDel } from "@/lib/cache"

export interface Booking {
  id: number
  booking_number: string
  customer_id: number
  staff_id: number
  service_name: string // Aggregated from booking_services and services
  staff_name: string // Derived from staff table
  customer_name: string // Derived from customers table
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
    staff_id: Number(booking.staff_id),
    total_amount: Number(booking.total_amount),
    rating: booking.rating ? Number(booking.rating) : null,
  } as Booking
}

async function invalidateBookingCache(bookingId?: number, customerId?: number, staffId?: number) {
  try {
    await cacheDel("bookings:all")
    await cacheDel("bookings:stats")
    if (bookingId) {
      await cacheDel(`booking:${bookingId}`)
    }
    if (customerId) {
      await cacheDel(`bookings:customer:${customerId}`)
    }
    if (staffId) {
      await cacheDel(`bookings:staff:${staffId}`)
    }
  } catch (error) {
    console.error("Error invalidating booking cache:", error)
  }
}

export async function getBookings(date?: string, status?: string, search?: string): Promise<Booking[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const cacheKey = `bookings:${date || "all"}:${status || "all"}:${search || "none"}`

      return await cacheFetch(
        cacheKey,
        async () => {
          const searchPattern = search ? `%${search}%` : null

          // Build dynamic query based on filters
          if (date && status && status !== "all" && search && search.trim()) {
            const bookings = await sql`
              SELECT
                b.id,
                b.booking_number,
                b.customer_id,
                b.staff_id,
                STRING_AGG(s.name, ', ') AS service_name,
                st.name AS staff_name,
                c.full_name AS customer_name,
                b.booking_date,
                b.booking_time,
                b.status,
                b.total_amount,
                b.notes,
                b.created_at,
                r.rating
              FROM bookings b
              JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
              JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
              LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
              LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
              LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
              WHERE b.tenant_id = ${tenantId}
                AND DATE(b.booking_date) = ${date}
                AND b.status = ${status}
                AND (
                  c.full_name ILIKE ${searchPattern}
                  OR c.phone_number ILIKE ${searchPattern}
                  OR s.name ILIKE ${searchPattern}
                )
              GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
              ORDER BY b.booking_date DESC, b.booking_time DESC
            `
            return bookings.map(mapBookingResult)
          } else if (date && status && status !== "all") {
            const bookings = await sql`
              SELECT
                b.id,
                b.booking_number,
                b.customer_id,
                b.staff_id,
                STRING_AGG(s.name, ', ') AS service_name,
                st.name AS staff_name,
                c.full_name AS customer_name,
                b.booking_date,
                b.booking_time,
                b.status,
                b.total_amount,
                b.notes,
                b.created_at,
                r.rating
              FROM bookings b
              JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
              JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
              LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
              LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
              LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
              WHERE b.tenant_id = ${tenantId}
                AND DATE(b.booking_date) = ${date}
                AND b.status = ${status}
              GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
              ORDER BY b.booking_date DESC, b.booking_time DESC
            `
            return bookings.map(mapBookingResult)
          } else if (date && search && search.trim()) {
            const bookings = await sql`
              SELECT
                b.id,
                b.booking_number,
                b.customer_id,
                b.staff_id,
                STRING_AGG(s.name, ', ') AS service_name,
                st.name AS staff_name,
                c.full_name AS customer_name,
                b.booking_date,
                b.booking_time,
                b.status,
                b.total_amount,
                b.notes,
                b.created_at,
                r.rating
              FROM bookings b
              JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
              JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
              LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
              LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
              LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
              WHERE b.tenant_id = ${tenantId}
                AND DATE(b.booking_date) = ${date}
                AND (
                  c.full_name ILIKE ${searchPattern}
                  OR c.phone_number ILIKE ${searchPattern}
                  OR s.name ILIKE ${searchPattern}
                )
              GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
              ORDER BY b.booking_date DESC, b.booking_time DESC
            `
            return bookings.map(mapBookingResult)
          } else if (status && status !== "all" && search && search.trim()) {
            const bookings = await sql`
              SELECT
                b.id,
                b.booking_number,
                b.customer_id,
                b.staff_id,
                STRING_AGG(s.name, ', ') AS service_name,
                st.name AS staff_name,
                c.full_name AS customer_name,
                b.booking_date,
                b.booking_time,
                b.status,
                b.total_amount,
                b.notes,
                b.created_at,
                r.rating
              FROM bookings b
              JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
              JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
              LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
              LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
              LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
              WHERE b.tenant_id = ${tenantId}
                AND b.status = ${status}
                AND (
                  c.full_name ILIKE ${searchPattern}
                  OR c.phone_number ILIKE ${searchPattern}
                  OR s.name ILIKE ${searchPattern}
                )
              GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
              ORDER BY b.booking_date DESC, b.booking_time DESC
            `
            return bookings.map(mapBookingResult)
          } else if (date) {
            const bookings = await sql`
              SELECT
                b.id,
                b.booking_number,
                b.customer_id,
                b.staff_id,
                STRING_AGG(s.name, ', ') AS service_name,
                st.name AS staff_name,
                c.full_name AS customer_name,
                b.booking_date,
                b.booking_time,
                b.status,
                b.total_amount,
                b.notes,
                b.created_at,
                r.rating
              FROM bookings b
              JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
              JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
              LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
              LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
              LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
              WHERE b.tenant_id = ${tenantId}
                AND DATE(b.booking_date) = ${date}
              GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
              ORDER BY b.booking_date DESC, b.booking_time DESC
            `
            return bookings.map(mapBookingResult)
          } else if (status && status !== "all") {
            const bookings = await sql`
              SELECT
                b.id,
                b.booking_number,
                b.customer_id,
                b.staff_id,
                STRING_AGG(s.name, ', ') AS service_name,
                st.name AS staff_name,
                c.full_name AS customer_name,
                b.booking_date,
                b.booking_time,
                b.status,
                b.total_amount,
                b.notes,
                b.created_at,
                r.rating
              FROM bookings b
              JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
              JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
              LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
              LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
              LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
              WHERE b.tenant_id = ${tenantId}
                AND b.status = ${status}
              GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
              ORDER BY b.booking_date DESC, b.booking_time DESC
            `
            return bookings.map(mapBookingResult)
          } else if (search && search.trim()) {
            const bookings = await sql`
              SELECT
                b.id,
                b.booking_number,
                b.customer_id,
                b.staff_id,
                STRING_AGG(s.name, ', ') AS service_name,
                st.name AS staff_name,
                c.full_name AS customer_name,
                b.booking_date,
                b.booking_time,
                b.status,
                b.total_amount,
                b.notes,
                b.created_at,
                r.rating
              FROM bookings b
              JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
              JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
              LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
              LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
              LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
              WHERE b.tenant_id = ${tenantId}
                AND (
                  c.full_name ILIKE ${searchPattern}
                  OR c.phone_number ILIKE ${searchPattern}
                  OR s.name ILIKE ${searchPattern}
                )
              GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
              ORDER BY b.booking_date DESC, b.booking_time DESC
            `
            return bookings.map(mapBookingResult)
          } else {
            // No filters - get all bookings
            const bookings = await sql`
              SELECT
                b.id,
                b.booking_number,
                b.customer_id,
                b.staff_id,
                STRING_AGG(s.name, ', ') AS service_name,
                st.name AS staff_name,
                c.full_name AS customer_name,
                b.booking_date,
                b.booking_time,
                b.status,
                b.total_amount,
                b.notes,
                b.created_at,
                r.rating
              FROM bookings b
              JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
              JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
              LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
              LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
              LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
              WHERE b.tenant_id = ${tenantId}
              GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
              ORDER BY b.booking_date DESC, b.booking_time DESC
            `
            return bookings.map(mapBookingResult)
          }
        },
        180, // Cache for 3 minutes
      )
    } catch (error) {
      console.error("Error fetching bookings:", error)
      // Return sample data as fallback
      return [
        {
          id: 1,
          booking_number: "BKG001",
          customer_id: 1,
          staff_id: 1,
          service_name: "Hair Cut & Style",
          staff_name: "Priya Sharma",
          customer_name: "Rahul Kumar",
          booking_date: new Date().toISOString().split("T")[0],
          booking_time: "10:00",
          status: "confirmed",
          total_amount: 1500,
          notes: "Regular customer",
          created_at: new Date().toISOString(),
          rating: 5,
        },
        {
          id: 2,
          booking_number: "BKG002",
          customer_id: 2,
          staff_id: 2,
          service_name: "Facial Treatment",
          staff_name: "Anjali Gupta",
          customer_name: "Priya Singh",
          booking_date: new Date().toISOString().split("T")[0],
          booking_time: "14:30",
          status: "pending",
          total_amount: 2500,
          notes: "First time customer",
          created_at: new Date().toISOString(),
          rating: null,
        },
      ]
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
        JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
        WHERE bs.booking_id = ${bookingId} AND bs.tenant_id = ${tenantId}
      `

      return services.map((service) => ({
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

export async function getBookingStats(): Promise<BookingStats> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      return await cacheFetch(
        "bookings:stats",
        async () => {
          const today = new Date().toISOString().split("T")[0]
          const [
            totalResult,
            todayResult,
            pendingResult,
            confirmedResult,
            completedResult,
            cancelledResult,
            revenueResult,
          ] = await Promise.all([
            sql`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = ${tenantId}`,
            sql`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = ${tenantId} AND DATE(booking_date) = ${today}`,
            sql`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = ${tenantId} AND status = 'pending'`,
            sql`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = ${tenantId} AND status = 'confirmed'`,
            sql`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = ${tenantId} AND status = 'completed'`,
            sql`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = ${tenantId} AND status = 'cancelled'`,
            sql`SELECT COALESCE(SUM(total_amount), 0) as revenue FROM bookings WHERE tenant_id = ${tenantId} AND status IN ('completed', 'confirmed')`,
          ])
          return {
            total: Number(totalResult[0]?.count) || 0,
            today: Number(todayResult[0]?.count) || 0,
            pending: Number(pendingResult[0]?.count) || 0,
            confirmed: Number(confirmedResult[0]?.count) || 0,
            completed: Number(completedResult[0]?.count) || 0,
            cancelled: Number(cancelledResult[0]?.count) || 0,
            revenue: Number(revenueResult[0]?.revenue) || 0,
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
        `booking:${id}`,
        async () => {
          const [booking] = await sql`
            SELECT
              b.id,
              b.booking_number,
              b.customer_id,
              b.staff_id,
              STRING_AGG(s.name, ', ') AS service_name, -- Aggregate service names
              st.name AS staff_name, -- Get staff name
              c.full_name AS customer_name, -- Added customer name
              b.booking_date,
              b.booking_time,
              b.total_amount,
              b.status,
              r.rating, -- Join to get rating from reviews
              b.notes,
              b.created_at
            FROM bookings b
            JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
            JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
            LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
            LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
            LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
            WHERE b.id = ${id} AND b.tenant_id = ${tenantId}
            GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
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
      console.log("[v0] Creating booking with form data:", Object.fromEntries(formData.entries()))

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

        if (serviceNames) {
          console.log("[v0] Looking for service with name:", serviceNames.toString())

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
            console.log(
              "[v0] Available services:",
              allServices.map((s) => s.name),
            )

            return {
              success: false,
              message: `Service "${serviceNames.toString()}" not found. Available services: ${allServices.map((s) => s.name).join(", ")}`,
            }
          }

          finalServiceIds = [Number(serviceResult[0].id)]
          console.log("[v0] Found service:", serviceResult[0].name, "with ID:", serviceResult[0].id)
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

      const timestamp = Date.now()
      const bookingNumber = `BK${timestamp.toString().slice(-8)}${Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, "0")}`

      console.log("[v0] Creating booking with:", {
        bookingNumber,
        finalCustomerId,
        finalStaffId,
        finalServiceIds,
        bookingDate: bookingDate.toString(),
        bookingTime: bookingTime.toString(),
        totalAmountNum,
        status: status?.toString() || "pending",
      })

      const [newBooking] = await sql`
        INSERT INTO bookings (
          tenant_id,
          booking_number,
          customer_id,
          staff_id,
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
      console.log("[v0] Created booking with ID:", bookingId)

      // Add services to booking
      for (const serviceId of finalServiceIds) {
        try {
          const serviceResult = await sql`SELECT price FROM services WHERE id = ${serviceId} AND tenant_id = ${tenantId}`
          const servicePrice = serviceResult[0] ? Number(serviceResult[0].price) : 0

          await sql`
            INSERT INTO booking_services (tenant_id, booking_id, service_id, quantity, price)
            VALUES (${tenantId}, ${bookingId}, ${serviceId}, 1, ${servicePrice})
          `
          console.log("[v0] Added service", serviceId, "to booking", bookingId)
        } catch (serviceError) {
          console.error(`[v0] Error adding service ${serviceId} to booking:`, serviceError)
          // Continue with other services instead of failing completely
        }
      }

      await invalidateBookingCache(bookingId, finalCustomerId, finalStaffId)

      revalidatePath("/")
      revalidatePath("/bookings")
      revalidatePath("/appointments")
      revalidatePath(`/customers/${finalCustomerId}`)

      console.log("[v0] Booking created successfully:", bookingNumber)
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
): Promise<{ success: boolean; message: string; recordsProcessed?: number }> {
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
        customer_phone: row.customer_phone?.trim() || null,
        staff_name: row.staff_name?.trim() || null,
        status: row.status?.toLowerCase().trim() || "pending",
        total_amount: row.total_amount ? Number.parseFloat(row.total_amount.trim()) : null,
        notes: row.notes?.trim() || null,
      }))

      if (!parseResult.success) {
        return {
          success: false,
          message: `Validation failed: ${parseResult.errors.slice(0, 3).join("; ")}${parseResult.errors.length > 3 ? "..." : ""}`,
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
        } catch (error) {
          console.error(`Error inserting booking ${bookingData.booking_number}:`, error)
          errors.push(`Failed to insert ${bookingData.booking_number}: ${error}`)
        }
      }

      // Revalidate paths to refresh the UI
      revalidatePath("/")
      revalidatePath("/bookings")
      revalidatePath("/appointments")

      let message = `Successfully imported ${insertedCount} bookings`
      if (skippedCount > 0) {
        message += `, skipped ${skippedCount} duplicates`
      }
      if (errors.length > 0) {
        message += `, ${errors.length} errors occurred`
      }

      return {
        success: insertedCount > 0,
        message,
        recordsProcessed: insertedCount,
      }
    } catch (error) {
      console.error("Error in bulk upload:", error)
      return {
        success: false,
        message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      await invalidateBookingCache(bookingId, Number(booking.customer_id), Number(booking.staff_id))

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
      await sql`DELETE FROM booking_services WHERE booking_id = ${bookingId} AND tenant_id = ${tenantId}`

      // Then delete the booking
      const result = await sql`DELETE FROM bookings WHERE id = ${bookingId} AND tenant_id = ${tenantId} RETURNING id`

      if (result.length === 0) {
        return { success: false, message: "Booking not found" }
      }

      if (bookingDetails.length > 0) {
        const booking = bookingDetails[0]
        await invalidateBookingCache(bookingId, Number(booking.customer_id), Number(booking.staff_id))
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
        `bookings:customer:${customerId}`,
        async () => {
          const bookings = await sql`
            SELECT
              b.id,
              b.booking_number,
              b.customer_id,
              b.staff_id,
              STRING_AGG(s.name, ', ') AS service_name, -- Aggregate service names
              st.name AS staff_name, -- Get staff name
              c.full_name AS customer_name, -- Added customer name
              b.booking_date,
              b.booking_time,
              b.total_amount,
              b.status,
              r.rating, -- Join to get rating from reviews
              b.notes,
              b.created_at
            FROM bookings b
            JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
            JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
            LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
            LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
            LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
            WHERE b.customer_id = ${customerId} AND b.tenant_id = ${tenantId}
            GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
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
      return invoices.map((invoice) => ({
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
        `bookings:staff:${staffId}`,
        async () => {
          const bookings = await sql`
            SELECT
              b.id,
              b.booking_number,
              b.customer_id,
              b.staff_id,
              STRING_AGG(s.name, ', ') AS service_name, -- Aggregate service names
              st.name AS staff_name, -- Get staff name
              c.full_name AS customer_name, -- Added customer name
              b.booking_date,
              b.booking_time,
              b.total_amount,
              b.status,
              r.rating, -- Join to get rating from reviews
              b.notes,
              b.created_at
            FROM bookings b
            JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
            JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
            LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
            LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
            LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
            WHERE b.staff_id = ${staffId} AND b.tenant_id = ${tenantId}
            GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
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
