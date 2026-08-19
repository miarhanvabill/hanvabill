const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

const oldDataBlock = /const data = \{[\s\S]*?sacCode: "999599",\n  \}/;

const newDataBlock = `
  const bizProfile = res.businessSettings?.profile || {};

  const data = {
    invoiceNumber: inv.invoice_number,
    invoiceDate: inv.invoice_date,
    dueDate: inv.due_date || new Date(new Date(inv.invoice_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    customerName: inv.customer_name || "Walk-in Customer",
    customerAddress: "",
    customerPhone: inv.customer_phone || "",
    customerEmail: inv.customer_email || "",
    customerGSTIN: "",
    items,
    subtotal: inv.subtotal || (inv.amount - inv.gst_amount) || 0,
    discount: inv.discount_amount || 0,
    gstRate: 18,
    isInterState: false,
    placeOfSupply: "Karnataka",
    businessName: bizProfile.salonName || process.env.BUSINESS_NAME || "Hanva Salon",
    businessAddress: bizProfile.address || process.env.BUSINESS_ADDRESS || "Business Address",
    businessPhone: bizProfile.phone || process.env.BUSINESS_PHONE || "",
    businessEmail: bizProfile.email || process.env.BUSINESS_EMAIL || "",
    businessGSTIN: bizProfile.gstNumber || process.env.BUSINESS_GSTIN || "",
    businessPAN: process.env.BUSINESS_PAN || "",
    sacCode: "999599",
  }
`;

code = code.replace(oldDataBlock, newDataBlock.trim());
fs.writeFileSync('app/inv/[token]/page.tsx', code);
