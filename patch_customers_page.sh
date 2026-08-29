sed -i '' -e 's/const \[filteredCustomers, setFilteredCustomers\] = useState<Customer\[\]>(\[\])//g' app/customers/page.tsx
sed -i '' -e 's/const \[loading, setLoading\] = useState(true)/const \[loading, setLoading\] = useState(true)\
  const [loadingMore, setLoadingMore] = useState(false)\
  const [hasMore, setHasMore] = useState(true)\
  const [offset, setOffset] = useState(0)/g' app/customers/page.tsx
