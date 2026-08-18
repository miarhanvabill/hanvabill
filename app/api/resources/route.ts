import { type NextRequest, NextResponse } from "next/server"
import { getAllResources, createResource, getResourceStats } from "@/app/actions/resources"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stats = searchParams.get("stats")

    if (stats === "true") {
      const resourceStats = await withTenantAuth(async ({ sql, tenantId }) => {
        return await getResourceStats({ sql, tenantId })
      })
      return NextResponse.json(resourceStats)
    }

    const resources = await withTenantAuth(async ({ sql, tenantId }) => {
      return await getAllResources({ sql, tenantId })
    })
    return NextResponse.json(resources)
  } catch (error) {
    console.error("[v0] Error in resources GET:", error)
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const resource = await withTenantAuth(async ({ sql, tenantId }) => {
      return await createResource(data, { sql, tenantId })
    })

    if (!resource) {
      return NextResponse.json({ error: "Failed to create resource" }, { status: 500 })
    }

    return NextResponse.json(resource, { status: 201 })
  } catch (error) {
    console.error("[v0] Error in resources POST:", error)
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 })
  }
}
