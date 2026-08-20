import { NextResponse } from 'next/server';
import { getInvoiceByShareToken } from '@/app/actions/invoices';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await getInvoiceByShareToken('5f2b5cf53cc001d300e677e44e75ba32');
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
