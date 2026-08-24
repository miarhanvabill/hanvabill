import { NextResponse } from "next/server";
import { getBusinessAnalytics } from "@/app/actions/analytics";

export async function GET() {
  try {
    const data = await getBusinessAnalytics("30");
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
