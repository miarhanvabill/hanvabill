// app/api/staff/route.ts
import { NextResponse } from "next/server"
import { getStaff, getStaffStats, createStaff, updateStaff, deleteStaff, type Staff } from "@/app/actions/staff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    if (searchParams.get("stats") === "1") {
      const stats = await getStaffStats()
      return NextResponse.json(stats, { status: 200 })
    }
    const staff = await getStaff()
    return NextResponse.json({ success: true, staff }, { status: 200 })
  } catch (error) {
    console.error("GET /api/staff:", error)
    return NextResponse.json({ success: false, staff: [], error: "Failed to fetch staff" }, { status: 200 })
  }
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Omit<Staff, "id" | "created_at" | "updated_at">
    const result = await createStaff(data)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error("POST /api/staff:", error)
    return NextResponse.json({ success: false, message: "Failed to create staff member" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const id = Number(body.id)
    const data = (body.data ?? body) as Partial<Staff>

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
    }

    const result = await updateStaff(id, data)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error("PUT /api/staff:", error)
    return NextResponse.json({ success: false, message: "Failed to update staff member" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    let id = Number(searchParams.get("id"))
    if (!id) {
      try {
        const body = await req.json()
        id = Number(body.id)
      } catch {
        // ignore empty body
      }
    }

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
    }

    const result = await deleteStaff(id)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error("DELETE /api/staff:", error)
    return NextResponse.json({ success: false, message: "Failed to delete staff member" }, { status: 500 })
  }
}
