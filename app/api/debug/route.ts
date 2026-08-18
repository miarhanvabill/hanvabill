// app/api/debug/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic"; // Prevents build-time execution

export async function GET() {
  try {
    const { userId, orgId, orgRole, sessionId } = await auth();

    return NextResponse.json({
      message: "✅ Debug Tenant Context",
      userId: userId || null,
      tenantId: orgId || null,
      orgRole: orgRole || null,
      sessionId: sessionId || null,
      note: !orgId
        ? "⚠️ No organization selected. Use Clerk Org Switcher."
        : "✅ Tenant context is working!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
