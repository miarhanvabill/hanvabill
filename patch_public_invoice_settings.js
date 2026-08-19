const fs = require('fs');
let code = fs.readFileSync('app/actions/invoices.ts', 'utf8');

const oldLogic = `      const profileSettingsStr = settingsResult.find((s: any) => s.setting_key === 'profile.settings')?.setting_value;
      if (profileSettingsStr) {
        try {
          businessSettings = { profile: JSON.parse(profileSettingsStr) };
        } catch(e) {
          businessSettings = defaultSettings;
        }
      } else {
        businessSettings = defaultSettings;
      }`;

const newLogic = `      // Reconstruct profile settings from individual keys
      businessSettings = { profile: { ...defaultSettings.profile } };
      for (const s of settingsResult) {
        if (s.setting_key.startsWith('profile.')) {
          const key = s.setting_key.replace('profile.', '');
          businessSettings.profile[key] = s.setting_value;
        }
      }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('app/actions/invoices.ts', code);
