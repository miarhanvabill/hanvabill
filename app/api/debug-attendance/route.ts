import { NextResponse } from "next/server";
import { withTenantAuth } from "@/lib/withTenantAuth";

export async function GET() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const res = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'attendance'
      `;
      return NextResponse.json({ success: true, columns: res });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  });
}
