// app/customers/page.tsx
"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Phone, Mail, Calendar, Edit, Trash2, User, Upload, Loader2, X } from "lucide-react"
import { deleteCustomer, bulkUploadCustomers, type Customer } from "@/app/actions/customers"
import { getCustomersPaginated } from "@/app/actions/customers-paginated"
import { formatCurrency } from "@/lib/currency"
import Link from "next/link"
import { BulkUploadModal } from "@/components/bulk-upload-modal"
import { customerTemplate } from "@/lib/csv-templates"
import { toast } from "@/hooks/use-toast"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [initialLoading, setInitialLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [showBulkUpload, setShowBulkUpload] = useState(false)

  // Track overall stats from initial/unfiltered load so top cards remain stable
  const [overallStats, setOverallStats] = useState<{
    total: number
    newThisMonth: number
    active: number
    totalRevenue: number
  } | null>(null)

  // Request ID ref to prevent race conditions from out-of-order responses
  const searchReqId = useRef(0)
  const isFirstRender = useRef(true)

  const loadCustomers = useCallback(
    async (page: number, size: number, query: string, isInitial: boolean = false) => {
      const reqId = ++searchReqId.current

      try {
        if (isInitial) {
          setInitialLoading(true)
        } else {
          setIsSearching(true)
        }

        const offset = (page - 1) * size
        const { data, total } = await getCustomersPaginated(query, offset, size)

        // Ignore stale responses if a newer search/request has already been initiated
        if (reqId !== searchReqId.current) return

        setCustomers(data)
        setTotalCustomers(total)

        // Compute overall business stats when there is no active search filter
        if (!query.trim()) {
          const now = new Date()
          const newMonthCount = data.filter((c) => {
            const created = new Date(c.created_at)
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
          }).length
          const activeCount = data.filter((c) => (c.total_bookings || 0) > 0).length
          const revenue = data.reduce((sum, c) => sum + (c.total_spent || 0), 0)

          setOverallStats({
            total,
            newThisMonth: newMonthCount,
            active: activeCount,
            totalRevenue: revenue,
          })
        }
      } catch (error) {
        if (reqId === searchReqId.current) {
          console.error("Error loading customers:", error)
          toast({
            title: "Error",
            description: "Failed to load customers",
            variant: "destructive",
          })
        }
      } finally {
        if (reqId === searchReqId.current) {
          if (isInitial) {
            setInitialLoading(false)
          }
          setIsSearching(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      loadCustomers(1, pageSize, "", true)
      return
    }

    // Debounce search input (immediate if cleared, 300ms if typing)
    const delay = searchTerm === "" ? 0 : 300
    const timer = setTimeout(() => {
      setCurrentPage(1)
      loadCustomers(1, pageSize, searchTerm, false)
    }, delay)

    return () => clearTimeout(timer)
  }, [searchTerm, pageSize, loadCustomers])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadCustomers(page, pageSize, searchTerm, false)
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer? All their associated records will be cleared.")) return
    try {
      const res = await deleteCustomer(id)
      if (res && !res.success) {
        toast({
          title: "Error",
          description: res.message || "Failed to delete customer",
          variant: "destructive",
        })
        return
      }
      await loadCustomers(currentPage, pageSize, searchTerm, false)
      toast({
        title: "Success",
        description: res?.message || "Customer deleted successfully",
      })
    } catch (error: any) {
      console.error("Error deleting customer:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to delete customer",
        variant: "destructive",
      })
    }
  }

  const handleBulkUpload = async (file: File) => {
    const result = await bulkUploadCustomers(file)
    if (result.success) {
      // Reload customers after successful upload
      await loadCustomers(currentPage, pageSize, searchTerm, false)
      toast({
        title: "Success",
        description: result.message,
      })
    } else {
      toast({
        title: "Upload Failed",
        description: result.message,
        variant: "destructive",
      })
    }
    return result
  }

  const handleClearSearch = () => {
    setSearchTerm("")
    setCurrentPage(1)
  }

  const getInitials = (name?: string | null) => {
    if (!name || typeof name !== "string") return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Not provided"
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return "Invalid date"
    }
  }

  if (initialLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button onClick={() => setShowBulkUpload(true)} variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
        <Link href="/customers/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        title="Bulk Upload Customers"
        description="Upload multiple customers at once using a CSV file. Download the sample template to get started."
        sampleHeaders={customerTemplate.headers}
        onUpload={handleBulkUpload}
        entityType="customers"
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              setCurrentPage(1)
              loadCustomers(1, pageSize, searchTerm, false)
            }
          }}
          className="pl-8 pr-16"
        />
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.total ?? totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats?.newThisMonth ??
                customers.filter((c) => {
                  const created = new Date(c.created_at)
                  const now = new Date()
                  return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats?.active ?? customers.filter((c) => (c.total_bookings || 0) > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                overallStats?.totalRevenue ?? customers.reduce((sum, c) => sum + (c.total_spent || 0), 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-200 ${isSearching ? "opacity-60" : "opacity-100"}`}>
        {customers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${customer.full_name || "Unknown"}`}
                    />
                    <AvatarFallback>{getInitials(customer.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{customer.full_name || "Unknown Name"}</h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-3 w-3 mr-1" />
                      {customer.phone_number || "No phone"}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Link href={`/customers/${customer.id}`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteCustomer(customer.id.toString())}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {customer.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-3 w-3 mr-2" />
                    {customer.email}
                  </div>
                )}

                {customer.date_of_birth && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-2" />
                    {formatDate(customer.date_of_birth)}
                  </div>
                )}

                {customer.gender && (
                  <Badge variant="secondary" className="text-xs">
                    {customer.gender}
                  </Badge>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Visits</p>
                    <p className="font-semibold">{customer.total_bookings || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Spent</p>
                    <p className="font-semibold">{formatCurrency(customer.total_spent || 0)}</p>
                  </div>
                </div>
              </div>

              {customer.notes && (
                <div className="mt-3 p-2 bg-muted rounded text-sm">
                  <p className="text-muted-foreground">Notes:</p>
                  <p>{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {totalCustomers > 0 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t pt-4 text-sm text-muted-foreground">
          <div className="mb-4 sm:mb-0 text-center sm:text-left">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCustomers)} of {totalCustomers} customers
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <select
                className="border rounded px-2 py-1 bg-background text-foreground"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isSearching}
              >
                {"<"}
              </Button>
              <div className="flex items-center gap-1 mx-2 overflow-x-auto max-w-[200px] sm:max-w-none">
                {Array.from({ length: Math.ceil(totalCustomers / pageSize) }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === Math.ceil(totalCustomers / pageSize) || Math.abs(p - currentPage) <= 1)
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2">...</span>}
                      <Button
                        variant={p === currentPage ? "default" : "outline"}
                        size="sm"
                        className={p === currentPage ? "bg-slate-900 text-white hover:bg-slate-800" : ""}
                        onClick={() => handlePageChange(p)}
                        disabled={isSearching}
                      >
                        {p}
                      </Button>
                    </React.Fragment>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalCustomers / pageSize) || isSearching}
              >
                {">"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {customers.length === 0 && !isSearching && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No customers found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first customer"}
          </p>
          <Link href="/customers/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </Link>
        </div>
      )}

      {customers.length === 0 && isSearching && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
          <p className="text-sm">Searching customers...</p>
        </div>
      )}
    </div>
  )
}
