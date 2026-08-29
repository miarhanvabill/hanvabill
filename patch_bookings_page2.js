const fs = require('fs');
let content = fs.readFileSync('app/bookings/page.tsx', 'utf8');

// Replace state
content = content.replace(
  /const \[bookings, setBookings\] = useState<any\[\]>\(\[\]\)([\s\S]*?)const \[offset, setOffset\] = useState\(0\)/m,
  `const [bookings, setBookings] = useState<any[]>([])
  const [totalBookings, setTotalBookings] = useState(0)
  const [stats, setStats] = useState({ total: 0, today: 0, pending: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)`
);

// Replace useEffect
content = content.replace(
  /useEffect\(\(\) => \{\s*setOffset\(0\)\s*fetchData\(true, 0\)\s*\}, \[startDate, endDate, searchParams\.status, searchParams\.search\]\)/m,
  `useEffect(() => {
    setCurrentPage(1)
    fetchData(1, pageSize)
  }, [startDate, endDate, searchParams.status, searchParams.search, pageSize])`
);

// Replace fetchData
content = content.replace(
  /const fetchData = async \([\s\S]*?const handleLoadMore = \(\) => \{[\s\S]*?\}/m,
  `const fetchData = async (page: number, size: number) => {
    try {
      setLoading(true)
      const offset = (page - 1) * size

      const [bookingsResponse, statsData] = await Promise.all([
        getBookingsPaginated(startDate, endDate, searchParams.status, searchParams.search, offset, size),
        getBookingStats(startDate, endDate)
      ])
      
      setBookings(bookingsResponse.data)
      setTotalBookings(bookingsResponse.total)
      setStats(statsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load bookings data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchData(page, pageSize)
  }`
);

fs.writeFileSync('app/bookings/page.tsx', content);
