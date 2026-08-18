// app/api/test-tenant/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Ensures this runs at request time

export async function GET() {
  try {
    const { userId, orgId, sessionClaims } = await auth();

    // Extract all possible tenant IDs from claims
    const tenantId =
      (sessionClaims?.tenantId as string) ||
      (sessionClaims?.tenant_Id as string) ||
      (sessionClaims?.org_id as string) ||
      orgId ||
      null;

    return NextResponse.json({
      success: true,
      message: "✅ Tenant Test Endpoint",
      userId,
      orgId,
      // Explicitly log all custom claims you showed
      claims: {
        org_id: sessionClaims?.org_id,
        tenant: sessionClaims?.tenant,
        org_name: sessionClaims?.org_name,
        org_slug: sessionClaims?.org_slug,
        tenantId: sessionClaims?.tenantId,
        tenant_Id: sessionClaims?.tenant_Id,
        userid: sessionClaims?.userid,
      },
      resolvedTenantId: tenantId,
      note: !tenantId
        ? "❌ No tenant detected — check JWT template"
        : "✅ Tenant resolved successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
