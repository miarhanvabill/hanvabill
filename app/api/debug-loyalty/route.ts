import { NextResponse } from "next/server";
import { getCustomerLoyalty, getLoyaltySettings } from "@/app/actions/loyalty";
import { withTenantAuth } from "@/lib/withTenantAuth";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return await withTenantAuth(async ({ tenantId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      const [data, settings] = await Promise.all([
        getCustomerLoyalty(id || 1, tenantId), 
        getLoyaltySettings(tenantId)
      ]);
      return NextResponse.json({ success: true, data, settings });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message, stack: e.stack });
    }
  });
}
