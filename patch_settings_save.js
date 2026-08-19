const fs = require('fs');
let code = fs.readFileSync('app/actions/settings.ts', 'utf8');

// Fix string value truncation (10000 -> 1000000 or remove entirely)
code = code.replace(
  /if \(stringValue\.length > 10000\) \{[\s\S]*?stringValue = stringValue\.substring\(0, 10000\)\n\s*\}/,
  `if (stringValue.length > 5000000) {
                  console.warn(\`Value too long for key \${fullKey}, truncating\`)
                  stringValue = stringValue.substring(0, 5000000)
                }`
);

// Fix update/insert logic
const oldUpdateLogic = `const updateResult = await sql\`
            UPDATE store_settings 
            SET setting_value = \${setting.value}, setting_type = \${setting.type}, updated_at = NOW()
            WHERE setting_key = \${setting.key} AND tenant_id = \${tenantId}
          \`

          if (updateResult.rowCount === 0) {`;

const newUpdateLogic = `const updateResult = await sql\`
            UPDATE store_settings 
            SET setting_value = \${setting.value}, setting_type = \${setting.type}, updated_at = NOW()
            WHERE setting_key = \${setting.key} AND tenant_id = \${tenantId}
            RETURNING id
          \`

          if (updateResult.length === 0) {`;

code = code.replace(oldUpdateLogic, newUpdateLogic);

// Fix ensureStoreSettingsTable rows check
code = code.replace(
  /const exists = tableExists\?\.rows\?\.\[0\]\?\.exists/,
  `const exists = tableExists?.[0]?.exists || tableExists?.rows?.[0]?.exists`
);
code = code.replace(
  /if \(hasData\?\.rows\?\.\[0\]\?\.exists\) \{/,
  `if (hasData?.[0]?.exists || hasData?.rows?.[0]?.exists) {`
);
code = code.replace(
  /if \(duplicateCheck\?\.rows && duplicateCheck\.rows\.length > 0\) \{/,
  `if ((duplicateCheck?.length > 0) || (duplicateCheck?.rows?.length > 0)) {`
);

fs.writeFileSync('app/actions/settings.ts', code);
