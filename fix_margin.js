const fs = require('fs');

let file1 = fs.readFileSync('components/invoice-screen.tsx', 'utf8');
file1 = file1.replace(/margin: \[0\.5, 0\.5, 0\.5, 0\.5\]/, 'margin: 0.5');
fs.writeFileSync('components/invoice-screen.tsx', file1);

let file2 = fs.readFileSync('app/bookings/details/[id]/page.tsx', 'utf8');
file2 = file2.replace(/margin: \[0\.5, 0\.5, 0\.5, 0\.5\]/, 'margin: 0.5');
fs.writeFileSync('app/bookings/details/[id]/page.tsx', file2);
