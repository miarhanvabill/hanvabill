// app/api/debug-auth/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId, sessionId, orgId } = await auth();
    const hasSession = !!userId;

    console.log("[DEBUG] Clerk auth result:", { userId, sessionId, orgId, hasSession });

    return NextResponse.json({
      hasSession,
      userId,
      sessionId,
      orgId,
      isAuthenticated: hasSession,
    });
  } catch (error) {
    console.error("[DEBUG] Clerk auth error:", error);
    return NextResponse.json(
      { error: "Auth check failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
