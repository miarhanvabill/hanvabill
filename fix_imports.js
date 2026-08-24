const fs = require('fs');
let file = fs.readFileSync('app/bookings/calendar/page.tsx', 'utf8');

// Remove the wrongly placed import Link
file = file.replace(/^import Link from "next\/link"\n+/m, '');

// Insert it after "use client"
file = file.replace(/"use client"\n+/, '"use client"\n\nimport Link from "next/link"\n');

fs.writeFileSync('app/bookings/calendar/page.tsx', file);
