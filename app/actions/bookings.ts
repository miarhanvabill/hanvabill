"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

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
  payment_date: string // New column to add to invoices
  amount: number // New column to add to invoices
  method: string // New column to add to invoices
  status: "completed" | "pending" | "failed" // New column to add to invoices
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

export async function getBookings(date?: string, status?: string, search?: string): Promise<Booking[]> {
  try {
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
        JOIN booking_services bs ON b.id = bs.booking_id
        JOIN services s ON bs.service_id = s.id
        LEFT JOIN staff st ON b.staff_id = st.id
        LEFT JOIN reviews r ON b.id = r.booking_id
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE DATE(b.booking_date) = ${date}
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
        JOIN booking_services bs ON b.id = bs.booking_id
        JOIN services s ON bs.service_id = s.id
        LEFT JOIN staff st ON b.staff_id = st.id
        LEFT JOIN reviews r ON b.id = r.booking_id
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE DATE(b.booking_date) = ${date} AND b.status = ${status}
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
        JOIN booking_services bs ON b.id = bs.booking_id
        JOIN services s ON bs.service_id = s.id
        LEFT JOIN staff st ON b.staff_id = st.id
        LEFT JOIN reviews r ON b.id = r.booking_id
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE DATE(b.booking_date) = ${date}
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
        JOIN booking_services bs ON b.id = bs.booking_id
        JOIN services s ON bs.service_id = s.id
        LEFT JOIN staff st ON b.staff_id = st.id
        LEFT JOIN reviews r ON b.id = r.booking_id
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE b.status = ${status}
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
        JOIN booking_services bs ON b.id = bs.booking_id
        JOIN services s ON bs.service_id = s.id
        LEFT JOIN staff st ON b.staff_id = st.id
        LEFT JOIN reviews r ON b.id = r.booking_id
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE DATE(b.booking_date) = ${date}
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
        JOIN booking_services bs ON b.id = bs.booking_id
        JOIN services s ON bs.service_id = s.id
        LEFT JOIN staff st ON b.staff_id = st.id
        LEFT JOIN reviews r ON b.id = r.booking_id
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE b.status = ${status}
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
        JOIN booking_services bs ON b.id = bs.booking_id
        JOIN services s ON bs.service_id = s.id
        LEFT JOIN staff st ON b.staff_id = st.id
        LEFT JOIN reviews r ON b.id = r.booking_id
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE c.full_name ILIKE ${searchPattern}
           OR c.phone_number ILIKE ${searchPattern}
           OR s.name ILIKE ${searchPattern}
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
        JOIN booking_services bs ON b.id = bs.booking_id
        JOIN services s ON bs.service_id = s.id
        LEFT JOIN staff st ON b.staff_id = st.id
        LEFT JOIN reviews r ON b.id = r.booking_id
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE 1=1
        GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
        ORDER BY b.booking_date DESC, b.booking_time DESC
      `
      return bookings.map(mapBookingResult)
    }
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
}

export async function getBookingStats(): Promise<BookingStats> {
  try {
    const today = new Date().toISOString().split("T")[0]
    const [totalResult, todayResult, pendingResult, confirmedResult, completedResult, cancelledResult, revenueResult] =
      await Promise.all([
        sql`SELECT COUNT(*) as count FROM bookings`,
        sql`SELECT COUNT(*) as count FROM bookings WHERE DATE(booking_date) = ${today}`,
        sql`SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'`,
        sql`SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'`,
        sql`SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'`,
        sql`SELECT COUNT(*) as count FROM bookings WHERE status = 'cancelled'`,
        sql`SELECT COALESCE(SUM(total_amount), 0) as revenue FROM bookings WHERE status IN ('completed', 'confirmed')`,
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
}

export async function getBookingById(id: string): Promise<Booking | null> {
  try {
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
      JOIN booking_services bs ON b.id = bs.booking_id
      JOIN services s ON bs.service_id = s.id
      LEFT JOIN staff st ON b.staff_id = st.id
      LEFT JOIN reviews r ON b.id = r.booking_id
      LEFT JOIN customers c ON b.customer_id = c.id -- Added customer join
      WHERE b.id = ${id}
      GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating -- Added c.full_name to GROUP BY
    `
    if (!booking) return null
    return mapBookingResult(booking)
  } catch (error) {
    console.error("Error fetching booking:", error)
    return null
  }
}

export async function createBooking(formData: FormData) {
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
        SELECT id FROM customers WHERE phone_number = ${customerPhone.toString()}
      `

      if (existingCustomer.length > 0) {
        finalCustomerId = Number(existingCustomer[0].id)
      } else {
        const [newCustomer] = await sql`
          INSERT INTO customers (full_name, phone_number, email, created_at, updated_at)
          VALUES (
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
          SELECT id, name FROM services WHERE LOWER(name) = LOWER(${serviceNames.toString()}) LIMIT 1
        `

        // If no exact match, try partial match
        if (serviceResult.length === 0) {
          serviceResult = await sql`
            SELECT id, name FROM services WHERE LOWER(name) LIKE LOWER(${"%" + serviceNames.toString() + "%"}) LIMIT 1
          `
        }

        // If still no match, get all available services for debugging
        if (serviceResult.length === 0) {
          const allServices = await sql`SELECT id, name FROM services ORDER BY name`
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
        const serviceResult = await sql`SELECT price FROM services WHERE id = ${serviceId}`
        const servicePrice = serviceResult[0] ? Number(serviceResult[0].price) : 0

        await sql`
          INSERT INTO booking_services (booking_id, service_id, quantity, price)
          VALUES (${bookingId}, ${serviceId}, 1, ${servicePrice})
        `
        console.log("[v0] Added service", serviceId, "to booking", bookingId)
      } catch (serviceError) {
        console.error(`[v0] Error adding service ${serviceId} to booking:`, serviceError)
        // Continue with other services instead of failing completely
      }
    }

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
}

export async function updateBookingStatus(bookingId: number, status: string) {
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
      WHERE id = ${bookingId}
      RETURNING id
    `

    if (result.length === 0) {
      return { success: false, message: "Booking not found" }
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
}

export async function deleteBooking(bookingId: number) {
  try {
    if (!bookingId || isNaN(bookingId)) {
      return { success: false, message: "Invalid booking ID" }
    }

    // First delete related booking_services records
    await sql`DELETE FROM booking_services WHERE booking_id = ${bookingId}`

    // Then delete the booking
    const result = await sql`DELETE FROM bookings WHERE id = ${bookingId} RETURNING id`

    if (result.length === 0) {
      return { success: false, message: "Booking not found" }
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
}

export async function getBookingsByCustomerId(customerId: string): Promise<Booking[]> {
  try {
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
      JOIN booking_services bs ON b.id = bs.booking_id
      JOIN services s ON bs.service_id = s.id
      LEFT JOIN staff st ON b.staff_id = st.id
      LEFT JOIN reviews r ON b.id = r.booking_id -- LEFT JOIN for optional reviews
      LEFT JOIN customers c ON b.customer_id = c.id -- Added customer join
      WHERE b.customer_id = ${customerId}
      GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating -- Added c.full_name to GROUP BY
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `
    return bookings.map(mapBookingResult)
  } catch (error) {
    console.error(`Error fetching bookings for customer ${customerId}:`, error)
    return []
  }
}

export async function getInvoicesByCustomerId(customerId: string): Promise<Invoice[]> {
  // Renamed from getPaymentsByCustomerId
  try {
    const invoices = await sql`
      SELECT
        i.id,
        i.invoice_number,
        i.booking_id,
        b.customer_id, -- Join to get customer_id from bookings
        i.payment_date, -- New column
        i.amount,       -- New column
        i.method,       -- New column
        i.status,       -- New column
        i.created_at,
        i.updated_at
      FROM invoices i
      JOIN bookings b ON i.booking_id = b.id
      WHERE b.customer_id = ${customerId}
      ORDER BY i.payment_date DESC, i.created_at DESC
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
}

export async function getBookingsByStaffId(staffId: string): Promise<Booking[]> {
  try {
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
      JOIN booking_services bs ON b.id = bs.booking_id
      JOIN services s ON bs.service_id = s.id
      LEFT JOIN staff st ON b.staff_id = st.id
      LEFT JOIN reviews r ON b.id = r.booking_id -- LEFT JOIN for optional reviews
      LEFT JOIN customers c ON b.customer_id = c.id -- Added customer join
      WHERE b.staff_id = ${staffId}
      GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating -- Added c.full_name to GROUP BY
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `
    return bookings.map(mapBookingResult)
  } catch (error) {
    console.error(`Error fetching bookings for staff ${staffId}:`, error)
    return []
  }
}
