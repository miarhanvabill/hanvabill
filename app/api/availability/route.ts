// app/api/availability/route.ts
// Handles full CRUD for staff_availability table used by the manage/availability page.

import { NextRequest, NextResponse } from "next/server"
import {
  getStaffAvailability,
  saveStaffAvailability,
  updateStaffAvailability,
  deleteStaffAvailability,
} from "@/app/actions/availability"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ─── GET — list all staff availability records ────────────────────────────────
export async function GET(_request: NextRequest) {
  try {
    const result = await getStaffAvailability()
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "Failed to fetch availability" },
        { status: 500 },
      )
    }
    return NextResponse.json(
      { success: true, availability: result.availability },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("[v0] GET /api/availability error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

// ─── POST — create (or upsert) a staff availability record ───────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { staff_id, day_of_week, start_time, end_time, is_available, break_start, break_end, notes } = body

    if (!staff_id || day_of_week === undefined) {
      return NextResponse.json(
        { success: false, message: "staff_id and day_of_week are required" },
        { status: 400 },
      )
    }

    const result = await saveStaffAvailability({
      staff_id: Number(staff_id),
      day_of_week: Number(day_of_week),
      start_time: start_time || "09:00",
      end_time: end_time || "17:00",
      is_available: Boolean(is_available ?? true),
      break_start: break_start || null,
      break_end: break_end || null,
      notes: notes || null,
    })

    return NextResponse.json(result, { status: result.success ? 201 : 400 })
  } catch (error) {
    console.error("[v0] POST /api/availability error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

// ─── PUT — update an existing staff availability record ──────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, staff_id, day_of_week, start_time, end_time, is_available, break_start, break_end, notes } = body

    if (!id) {
      return NextResponse.json({ success: false, message: "id is required" }, { status: 400 })
    }

    const result = await updateStaffAvailability(Number(id), {
      staff_id: staff_id !== undefined ? Number(staff_id) : undefined,
      day_of_week: day_of_week !== undefined ? Number(day_of_week) : undefined,
      start_time,
      end_time,
      is_available: is_available !== undefined ? Boolean(is_available) : undefined,
      break_start: break_start || null,
      break_end: break_end || null,
      notes: notes || null,
    })

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error("[v0] PUT /api/availability error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

// ─── DELETE — remove a staff availability record ─────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, message: "id query parameter is required" }, { status: 400 })
    }

    const result = await deleteStaffAvailability(Number(id))
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error("[v0] DELETE /api/availability error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
