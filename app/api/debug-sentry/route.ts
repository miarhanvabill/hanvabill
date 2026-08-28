import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    throw new Error("Sentry Test Error: This is a deliberate crash to test if Sentry is successfully receiving errors.");
  } catch (e) {
    Sentry.captureException(e);
    await Sentry.flush(2000); // Wait for the event to be sent
    return NextResponse.json({ success: false, error: "Error caught and sent to Sentry", dsn_configured: !!process.env.NEXT_PUBLIC_SENTRY_DSN });
  }
}
