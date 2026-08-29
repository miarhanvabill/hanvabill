const fs = require('fs');
let content = fs.readFileSync('app/customers/page.tsx', 'utf8');

// Replace state
content = content.replace(
  /const \[customers, setCustomers\] = useState<Customer\[\]>\(\[\]\)([\s\S]*?)const \[showBulkUpload, setShowBulkUpload\] = useState\(false\)/m,
  `const [customers, setCustomers] = useState<Customer[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [showBulkUpload, setShowBulkUpload] = useState(false)`
);

// Replace useEffect
content = content.replace(
  /useEffect\(\(\) => \{[\s\S]*?\}, \[searchTerm\]\)/m,
  `useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      loadCustomers(1, pageSize)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, pageSize])`
);

// Replace loadCustomers
content = content.replace(
  /const loadCustomers = async \([\s\S]*?const handleLoadMore = \(\) => \{[\s\S]*?\}/m,
  `const loadCustomers = async (page: number, size: number) => {
    try {
      setLoading(true)
      const offset = (page - 1) * size
      const { data, total } = await getCustomersPaginated(searchTerm, offset, size)
      setCustomers(data)
      setTotalCustomers(total)
    } catch (error) {
      console.error("Error loading customers:", error)
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadCustomers(page, pageSize)
  }`
);

fs.writeFileSync('app/customers/page.tsx', content);
