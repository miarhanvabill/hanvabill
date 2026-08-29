sed -i '' -e 's/import { getBookings, getBookingStats, createBooking, bulkUploadBookings/import { getBookingStats, createBooking, bulkUploadBookings/g' app/bookings/page.tsx
sed -i '' -e '/import { getBookingStats/a\
import { getBookingsPaginated } from "@/app/actions/bookings-paginated"
' app/bookings/page.tsx
sed -i '' -e 's/import { Suspense, useState, useEffect } from "react"/import React, { Suspense, useState, useEffect } from "react"/g' app/bookings/page.tsx
