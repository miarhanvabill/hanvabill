const fs = require('fs');
let code = fs.readFileSync('app/actions/invoices.ts', 'utf8');

const oldFunc = `export async function getInvoiceByShareToken(token: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql\`
        SELECT i.*, c.full_name as customer_name, c.phone_number as customer_phone, c.email as customer_email
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id AND c.tenant_id = \${tenantId}
        WHERE i.share_token = \${token} AND i.tenant_id = \${tenantId}
        LIMIT 1
      \`
      if (result.length === 0) return { success: false, message: "Invoice not found" }
      return { success: true, invoice: result[0] }
    } catch (error) {
      console.error("Error fetching invoice by token:", error)
      return { success: false, message: "Failed to fetch invoice" }
    }
  });
}`;

const newFunc = `export async function getInvoiceByShareToken(token: string) {
  try {
    // PUBLIC endpoint: Do not use withTenantAuth. Look up by unguessable token.
    const { neon } = require("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);
    
    const result = await sql\`
      SELECT i.*, c.full_name as customer_name, c.phone_number as customer_phone, c.email as customer_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.share_token = \${token}
      LIMIT 1
    \`
    if (result.length === 0) return { success: false, message: "Invoice not found" }
    
    // Also fetch the tenant details so the invoice can display business information!
    const tenantId = result[0].tenant_id;
    let businessSettings = null;
    try {
      const settingsResult = await sql\`
        SELECT setting_key, setting_value, setting_type
        FROM store_settings
        WHERE tenant_id = \${tenantId}
      \`;
      
      const defaultSettings = {
        profile: {
          salonName: "Hanva salon",
          ownerName: "Gaurav",
          email: "gaurav@hanva.com",
          phone: "+919321501389",
          address: "123 Main Street, City, State 12345",
          website: "www.hanva.com",
          gstNumber: "GSTIN123456789",
        }
      };
      
      const profileSettingsStr = settingsResult.find((s: any) => s.setting_key === 'profile.settings')?.setting_value;
      if (profileSettingsStr) {
         try {
            const parsed = JSON.parse(profileSettingsStr);
            businessSettings = { profile: parsed };
         } catch(e) {
            businessSettings = defaultSettings;
         }
      } else {
         businessSettings = defaultSettings;
      }
    } catch (err) {
      console.error("Error fetching store settings for public invoice:", err);
    }
    
    return { success: true, invoice: result[0], businessSettings }
  } catch (error) {
    console.error("Error fetching invoice by token:", error)
    return { success: false, message: "Failed to fetch invoice" }
  }
}`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('app/actions/invoices.ts', code);
