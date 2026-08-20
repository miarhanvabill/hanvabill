import { getInvoiceByShareToken } from './app/actions/invoices.ts';

async function test() {
  const result = await getInvoiceByShareToken('5f2b5cf53cc001d300e677e44e75ba32');
  console.log(JSON.stringify(result.businessSettings, null, 2));
}

test();
