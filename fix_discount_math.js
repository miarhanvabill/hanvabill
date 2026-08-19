const fs = require('fs');
let code = fs.readFileSync('app/bookings/details/[id]/page.tsx', 'utf8');

code = code.replace(
  /discount: bookingServices\.reduce\(\(acc, curr\) => acc \+ \(curr\.price \* curr\.quantity\), 0\) - booking\.total_amount \+ \(booking\.total_amount \* 0\.18\), \/\/ Math fallback/,
  `discount: Math.max(0, bookingServices.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) - (booking.total_amount / 1.18)),`
);

fs.writeFileSync('app/bookings/details/[id]/page.tsx', code);
