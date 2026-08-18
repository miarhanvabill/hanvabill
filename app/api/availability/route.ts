import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth } from '@/lib/withTenantAuth'

export async function GET(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const date = searchParams.get('date')
      const staffId = searchParams.get('staffId')

      if (!date) {
        return NextResponse.json(
          { error: 'Date parameter is required' },
          { status: 400 }
        )
      }

      // Get available time slots for the given date and staff
      const bookings = await sql`
        SELECT booking_time 
        FROM bookings 
        WHERE booking_date = ${date} 
        AND tenant_id = ${tenantId}
        ${staffId ? sql`AND staff_id = ${staffId}` : sql``}
        AND status IN ('confirmed', 'pending')
      `

      const bookedTimes = bookings.map(booking => booking.booking_time)
      
      // Generate available time slots (example: 9 AM to 6 PM in 30-min intervals)
      const availableSlots = []
      for (let hour = 9; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          if (!bookedTimes.includes(time)) {
            availableSlots.push(time)
          }
        }
      }

      return NextResponse.json({ availableSlots })
    } catch (error) {
      console.error('Availability check error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const body = await request.json()
      const { date, time, staffId } = body

      if (!date || !time) {
        return NextResponse.json(
          { error: 'Date and time are required' },
          { status: 400 }
        )
      }

      // Check if the time slot is already booked
      const existingBooking = await sql`
        SELECT id 
        FROM bookings 
        WHERE booking_date = ${date} 
        AND booking_time = ${time}
        AND tenant_id = ${tenantId}
        ${staffId ? sql`AND staff_id = ${staffId}` : sql``}
        AND status IN ('confirmed', 'pending')
        LIMIT 1
      `

      return NextResponse.json({ 
        available: existingBooking.length === 0 
      })
    } catch (error) {
      console.error('Availability check error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}
