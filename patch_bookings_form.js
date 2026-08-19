const fs = require('fs');
let code = fs.readFileSync('app/bookings/page.tsx', 'utf8');

const oldFormStart = /<form className="flex flex-col sm:flex-row gap-4 mb-6">/;
const newFormStart = `
              <form className="flex flex-col sm:flex-row gap-4 mb-6">
                {searchParams.status && searchParams.status !== 'all' && (
                  <input type="hidden" name="status" value={searchParams.status} />
                )}
`;

code = code.replace(oldFormStart, newFormStart.trim());
fs.writeFileSync('app/bookings/page.tsx', code);
