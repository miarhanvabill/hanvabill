import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Phone, DollarSign, Filter, Plus, Search } from "lucide-react"
import Link from "next/link"
import { getBookings, getBookingStats } from "@/app/actions/bookings"
import { getStaff } from "@/app/actions/staff"
import { QuickBookModal, AppointmentsSection, StatusFilterButtons } from "./client-components"

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function BookingsContent({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const bookings = await getBookings(searchParams.date, searchParams.status, searchParams.search)
  const stats = await getBookingStats()
  const staff = await getStaff()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatTime = (time: string) => {
    if (!time) return "Not set"
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return time
    }
  }

  const formatDate = (date: string) => {
    if (!date) return "Not set"
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return date
    }
  }

  const handleStatusUpdate = async (id: number, status: string) => {
    "use server"
    // This would be implemented as a server action
    console.log(`Updating booking ${id} to status ${status}`)
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">Bookings for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Confirmations</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenue)}</div>
            <p className="text-xs text-muted-foreground">From completed bookings</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={searchParams.tab || "overview"} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <Link href="/bookings/calendar" className="flex-1">
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-muted w-full">
              Image Gallery
            </div>
          </Link>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Original booking list content */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Bookings</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage your salon bookings</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Status Filter Buttons */}
              <StatusFilterButtons currentStatus={searchParams.status || "all"} />

              <form className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search customers, phone numbers..."
                      className="pl-10"
                      name="search"
                      defaultValue={searchParams.search || ""}
                    />
                  </div>
                </div>
                <Input type="date" name="date" defaultValue={searchParams.date || ""} className="w-full sm:w-auto" />
                <Button type="submit">Apply Filters</Button>
              </form>

              {/* Bookings List */}
              <div className="space-y-4">
                {bookings.length > 0 ? (
                  bookings.map((booking) => (
                    <Card key={booking.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{booking.customer_name}</h3>
                              <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {booking.customer_phone}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(booking.booking_date)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(booking.booking_time)}
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(booking.total_amount)}
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm">
                                <strong>Services:</strong> {booking.service_names}
                              </p>
                              <p className="text-sm">
                                <strong>Staff:</strong> {booking.staff_names}
                              </p>
                              {booking.notes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  <strong>Notes:</strong> {booking.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/bookings/details/${booking.id}`}>
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                            </Link>
                            <Link href={`/bookings/details/${booking.id}/edit`}>
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchParams.search || searchParams.date || searchParams.status !== "all"
                        ? "Try adjusting your filters to see more results."
                        : "Get started by creating your first booking."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <AppointmentsSection bookings={bookings} onStatusUpdate={handleStatusUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default async function BookingsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  
  // Safe cast for search params
  const resolvedSearchParams: { [key: string]: string | undefined } = {}
  Object.keys(searchParams).forEach((key) => {
    const val = searchParams[key]
    if (typeof val === "string") {
      resolvedSearchParams[key] = val
    } else if (Array.isArray(val) && val.length > 0) {
      resolvedSearchParams[key] = val[0]
    }
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage your salon bookings</p>
        </div>
        <Link href="/bookings/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Booking
          </Button>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="space-y-0 pb-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        }
      >
        <BookingsContent searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  )
}
