import { NextResponse } from "next/server";

export async function GET() {
  throw new Error("Sentry Test Error: This is a deliberate crash to test if Sentry is successfully receiving errors.");
  return NextResponse.json({ success: true });
}
