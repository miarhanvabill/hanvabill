import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    clerkSecretKey: process.env.CLERK_SECRET_KEY ? "SET" : "MISSING",
    clerkSecretKeyLength: process.env.CLERK_SECRET_KEY?.length || 0,
    clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "SET" : "MISSING",
    allKeys: Object.keys(process.env).filter(k => k.includes("CLERK")),
  });
}
