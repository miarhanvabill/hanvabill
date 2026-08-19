const fs = require('fs');
let code = fs.readFileSync('app/bookings/page.tsx', 'utf8');

// 1. Update BookingsPageProps
code = code.replace(
  /date\?: string/,
  'startDate?: string\n    endDate?: string'
);

// 2. Add currentMonthStart and currentMonthEnd to BookingsContent
code = code.replace(
  /const \[loading, setLoading\] = useState\(true\)/,
  `const [loading, setLoading] = useState(true)

  // Default to current month
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA') // YYYY-MM-DD
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA')
  
  const startDate = searchParams.startDate || currentMonthStart
  const endDate = searchParams.endDate || currentMonthEnd`
);

// 3. Update getBookings and getBookingStats calls
code = code.replace(
  /getBookings\(searchParams\.date, searchParams\.status, searchParams\.search\),/,
  'getBookings(startDate, endDate, searchParams.status, searchParams.search),'
);
code = code.replace(
  /getBookingStats\(\)/,
  'getBookingStats(startDate, endDate)'
);

// 4. Update the filter form inputs
const oldInput = /<Input type="date" name="date" defaultValue=\{searchParams\.date \|\| ""\} className="w-full sm:w-auto" \/>/;
const newInput = `
                <div className="flex items-center gap-2">
                  <Input type="date" name="startDate" defaultValue={startDate} className="w-full sm:w-[140px]" title="Start Date" />
                  <span className="text-gray-400 text-sm">to</span>
                  <Input type="date" name="endDate" defaultValue={endDate} className="w-full sm:w-[140px]" title="End Date" />
                </div>
`;
code = code.replace(oldInput, newInput.trim());

fs.writeFileSync('app/bookings/page.tsx', code);
