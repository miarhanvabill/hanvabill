const fs = require('fs');
let code = fs.readFileSync('app/actions/checkout.ts', 'utf8');

// Replace hardcoded "10:00" with the current time in IST
code = code.replace(
  /const bookingTime = input\.booking_time \|\| "10:00"/,
  `const nowIST = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });\n        const bookingTime = input.booking_time || nowIST`
);

// We should also replace the hardcoded bookingDate to use IST date, otherwise a sale at 3 AM IST (which is 9:30 PM UTC) will get yesterday's date!
code = code.replace(
  /const bookingDate = input\.booking_date \|\| new Date\(\)\.toISOString\(\)\.split\("T"\)\[0\]/,
  `const dateIST = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });\n        // Convert MM/DD/YYYY to YYYY-MM-DD\n        const [month, day, year] = dateIST.split('/');\n        const formattedDateIST = \`\${year}-\${month}-\${day}\`;\n        const bookingDate = input.booking_date || formattedDateIST`
);

fs.writeFileSync('app/actions/checkout.ts', code);
