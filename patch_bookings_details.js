const fs = require('fs');
let code = fs.readFileSync('app/bookings/details/[id]/page.tsx', 'utf8');

code = code.replace(
  /quantity: bs\.quantity,\n\s*rate: bs\.price,\n\s*amount: bs\.price \* bs\.quantity,/,
  `quantity: Number(bs.quantity),
                    rate: Number(bs.price),
                    amount: Number(bs.price) * Number(bs.quantity),`
);

code = code.replace(
  /subtotal: bookingServices\.reduce\(\(acc, curr\) => acc \+ \(curr\.price \* curr\.quantity\), 0\),/,
  `subtotal: bookingServices.reduce((acc, curr) => acc + (Number(curr.price) * Number(curr.quantity)), 0),`
);

fs.writeFileSync('app/bookings/details/[id]/page.tsx', code);
