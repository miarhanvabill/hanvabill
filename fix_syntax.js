const fs = require('fs');
let code = fs.readFileSync('app/actions/invoices.ts', 'utf8');

const target = `          businessSettings.profile[key] = value;
        }
      }
      }
    } catch (err) {`;

const replacement = `          businessSettings.profile[key] = value;
        }
      }
    } catch (err) {`;

code = code.replace(target, replacement);
fs.writeFileSync('app/actions/invoices.ts', code);
