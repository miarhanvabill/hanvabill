import { type NextRequest, NextResponse } from "next/server"
import { updateResource, deleteResource } from "@/app/actions/resources"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()
    const resource = await updateResource(params.id, data)

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    return NextResponse.json(resource)
  } catch (error) {
    console.error("[v0] Error in resource PUT:", error)
    return NextResponse.json({ error: "Failed to update resource" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = await deleteResource(params.id)

    if (!success) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Resource deleted successfully" })
  } catch (error) {
    console.error("[v0] Error in resource DELETE:", error)
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 })
  }
}
