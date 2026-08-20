const fs = require('fs');
let code = fs.readFileSync('app/actions/invoices.ts', 'utf8');

const newLogic = `      // Reconstruct profile settings from individual keys
      businessSettings = { profile: { ...defaultSettings.profile } };
      
      for (const row of settingsResult) {
        const { setting_key, setting_value, setting_type } = row;
        
        // Handle legacy flat JSON
        if (setting_key === 'profile.settings') {
           try {
              const parsed = typeof setting_value === 'string' ? JSON.parse(setting_value) : setting_value;
              businessSettings.profile = { ...businessSettings.profile, ...parsed };
           } catch(e) {}
           continue;
        }

        // Handle flattened keys (e.g. profile.salonName)
        if (setting_key.startsWith('profile.')) {
          const key = setting_key.replace('profile.', '');
          
          let value = setting_value;
          try {
            if (setting_type === "boolean") {
              value = setting_value === "true" || setting_value === true;
            } else if (setting_type === "number") {
              const numValue = Number.parseFloat(setting_value);
              value = isNaN(numValue) ? 0 : numValue;
            } else if (setting_type === "json") {
              value = typeof setting_value === 'string' ? JSON.parse(setting_value) : setting_value;
            } else if (typeof setting_value === "string") {
              // Sometimes strings are accidentally JSON encoded like "\\"Cheap and Best\\""
              if (setting_value.startsWith('"') && setting_value.endsWith('"')) {
                try { value = JSON.parse(setting_value); } catch(e) {}
              }
            }
          } catch(e) {}
          
          businessSettings.profile[key] = value;
        }
      }`;

const oldLogicRegex = /\/\/ Reconstruct profile settings from individual keys[\s\S]*?businessSettings\.profile\[key\] = s\.setting_value;\n\s*\}/;

if (code.match(oldLogicRegex)) {
  code = code.replace(oldLogicRegex, newLogic);
} else {
  // Try another regex if first fails
  const oldLogicFallback = /\/\/ Reconstruct profile settings from individual keys[\s\S]*?businessSettings\.profile\[key\] = s\.setting_value;\n\s*\}\n\s*\}/;
  code = code.replace(oldLogicFallback, newLogic + "\n      }");
}

fs.writeFileSync('app/actions/invoices.ts', code);
