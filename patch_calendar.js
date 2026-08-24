const fs = require('fs');
let file = fs.readFileSync('app/bookings/calendar/page.tsx', 'utf8');

// Fix Tooltip Badge
file = file.replace(
  /<Badge variant="outline" className="mt-1 capitalize">\s*\{booking\.status\}\s*<\/Badge>/,
  '<span className={`mt-1 inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(booking.status)} capitalize`}>{booking.status}</span>'
);

// Fix SheetHeader spacing & overlapping close button
file = file.replace(
  /<SheetHeader className="mb-6">\s*<div className="flex items-center justify-between">\s*<SheetTitle>Booking Details<\/SheetTitle>\s*<Badge className={`\$\{getStatusColor\(selectedBooking\.status\)\} capitalize`}>\s*\{selectedBooking\.status\}\s*<\/Badge>\s*<\/div>/,
  `<SheetHeader className="mb-6 pr-6">
                <div className="flex items-center justify-start gap-3">
                  <SheetTitle>Booking Details</SheetTitle>
                  <span className={\`\${getStatusColor(selectedBooking.status)} px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize\`}>
                    {selectedBooking.status}
                  </span>
                </div>`
);

// Fix Customer profile view
file = file.replace(
  /<div className="flex items-start gap-4">\s*<div className="bg-muted p-3 rounded-full">\s*<User className="h-6 w-6 text-muted-foreground" \/>\s*<\/div>\s*<div>\s*<h3 className="font-semibold text-lg">\{selectedBooking\.customer_name\}<\/h3>\s*<Button variant="link" className="p-0 h-auto text-muted-foreground">View Customer Profile<\/Button>\s*<\/div>\s*<\/div>/,
  `<div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{selectedBooking.customer_name}</h3>
                    <Link href={\`/customers/\${selectedBooking.customer_id}\`}>
                      <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary">View Customer Profile</Button>
                    </Link>
                  </div>
                </div>`
);

// Make the icon slightly bigger/colored in Card
file = file.replace(
  /<FileText className="h-5 w-5 text-muted-foreground mt-0.5" \/>/,
  '<Package className="h-5 w-5 text-muted-foreground mt-0.5" />'
);

fs.writeFileSync('app/bookings/calendar/page.tsx', file);
