// components/customer-profile-display.tsx
"use client"

import Link from "next/link"
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Star,
  Clock,
  User,
  CreditCard,
  Gift,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import type { Customer } from "@/app/actions/customers"
import type { Booking, Invoice } from "@/app/actions/bookings"
import { formatCurrency } from "@/lib/currency"

interface CustomerProfileDisplayProps {
  customer: Customer
  bookings: Booking[]
  invoices: Invoice[]
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "vip":
      return "bg-purple-100 text-purple-800"
    case "active":
      return "bg-green-100 text-green-800"
    case "inactive":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function CustomerProfileDisplay({ customer, bookings, invoices }: CustomerProfileDisplayProps) {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()

  const totalSpent = bookings.reduce(
    (sum, b) => sum + (b.status === "completed" || b.status === "confirmed" ? b.total_amount : 0),
    0,
  )
  const totalVisits = bookings.filter((b) => b.status === "completed" || b.status === "confirmed").length
  const completedBookingsWithRating = bookings.filter((b) => b.status === "completed" && b.rating !== null)
  const averageRating =
    completedBookingsWithRating.length > 0
      ? completedBookingsWithRating.reduce((sum, b) => sum + (b.rating || 0), 0) / completedBookingsWithRating.length
      : 0

  const serviceCounts: { [key: string]: number } = {}
  bookings.forEach((b) => {
    if (b.status === "completed" || b.status === "confirmed") {
      serviceCounts[b.service_name] = (serviceCounts[b.service_name] || 0) + 1
    }
  })
  const sortedServices = Object.entries(serviceCounts).sort(([, countA], [, countB]) => countB - countA)
  const preferredServices = sortedServices.slice(0, 3).map(([service]) => service)

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <Link href="/customers" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
        <Button asChild size="sm">
          <Link href={`/customers/${customer.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Link>
        </Button>
      </div>

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader className="text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${customer.full_name || "Unknown"}`}
                    alt={customer.full_name || "Customer Avatar"}
                  />
                  <AvatarFallback className="text-2xl">
                    {customer.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">{customer.full_name}</CardTitle>
                <Badge className={getStatusColor("active")}>Active</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{customer.email || "Not provided"}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{customer.phone_number}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{customer.address || "Not provided"}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Born: {customer.date_of_birth ? formatDate(customer.date_of_birth) : "Not provided"}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>Joined: {formatDate(customer.created_at)}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Preferred Services</h4>
                  <div className="flex flex-wrap gap-1">
                    {preferredServices.length > 0 ? (
                      preferredServices.map((service, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {service}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600">No preferred services yet.</p>
                    )}
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-gray-600">{customer.notes || "No notes"}</p>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-700 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Total Spent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900">{formatCurrency(totalSpent)}</div>
                  <p className="text-xs text-green-600">Lifetime value</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Total Visits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900">{totalVisits}</div>
                  <p className="text-xs text-blue-600">Service appointments</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
                    <Star className="h-4 w-4 mr-2" />
                    Average Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900">{averageRating.toFixed(1)}</div>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < Math.floor(averageRating) ? "text-yellow-400 fill-current" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700 flex items-center">
                    <Gift className="h-4 w-4 mr-2" />
                    Loyalty Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900">{Math.floor(totalSpent / 100)}</div>
                  <p className="text-xs text-orange-600">Reward points</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <Tabs defaultValue="bookings" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="bookings" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Invoices
                </TabsTrigger>
                <TabsTrigger value="reviews" className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Reviews
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bookings" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Booking History</h3>
                    <Button asChild>
                      <Link href={`/bookings/create?customer=${customer.id}`}>
                        <Calendar className="h-4 w-4 mr-2" />
                        New Booking
                      </Link>
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {bookings.length > 0 ? (
                      bookings.map((booking) => (
                        <Link key={booking.id} href={`/bookings/${booking.id}`}>
                          <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium">{booking.service_name}</h4>
                                    <Badge
                                      variant={
                                        booking.status === "completed"
                                          ? "secondary"
                                          : booking.status === "confirmed"
                                            ? "default"
                                            : "outline"
                                      }
                                    >
                                      {booking.status}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                    <div className="flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {formatDate(booking.booking_date)}
                                    </div>
                                    <div className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {booking.booking_time}
                                    </div>
                                    <div className="flex items-center">
                                      <User className="h-3 w-3 mr-1" />
                                      Customer {booking.customer_id}
                                    </div>
                                    <div className="flex items-center">
                                      <DollarSign className="h-3 w-3 mr-1" />
                                      {formatCurrency(booking.total_amount)}
                                    </div>
                                  </div>
                                  {booking.rating !== null && (
                                    <div className="flex items-center mt-2">
                                      <span className="text-sm text-gray-600 mr-2">Rating:</span>
                                      <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                          <Star
                                            key={i}
                                            className={`h-3 w-3 ${
                                              i < booking.rating! ? "text-yellow-400 fill-current" : "text-gray-300"
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {booking.notes && <p className="text-sm text-gray-600 mt-2">{booking.notes}</p>}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))
                    ) : (
                      <p className="text-center text-gray-500">No bookings found for this customer.</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="invoices" className="mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Invoice History</h3>
                  <div className="overflow-x-auto">
                    {invoices.length > 0 ? (
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left p-4 font-medium">Invoice #</th>
                            <th className="text-left p-4 font-medium">Date</th>
                            <th className="text-left p-4 font-medium">Amount</th>
                            <th className="text-left p-4 font-medium">Method</th>
                            <th className="text-left p-4 font-medium">Status</th>
                            <th className="text-left p-4 font-medium">Booking ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {invoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-gray-50">
                              <td className="p-4">{invoice.invoice_number}</td>
                              <td className="p-4">{formatDate(invoice.invoice_date)}</td>
                              <td className="p-4 font-semibold text-green-600">{formatCurrency(invoice.amount)}</td>
                              <td className="p-4">{invoice.payment_method}</td>
                              <td className="p-4">
                                <Badge variant={invoice.status === "completed" ? "secondary" : "outline"}>
                                  {invoice.status}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/bookings/${invoice.booking_id}`}>{invoice.booking_id}</Link>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-center text-gray-500">No invoices found for this customer.</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Customer Reviews</h3>
                  <div className="space-y-3">
                    {completedBookingsWithRating.length > 0 ? (
                      completedBookingsWithRating.map((booking) => (
                        <Card key={booking.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium">{booking.service_name}</h4>
                                <p className="text-sm text-gray-600">
                                  {formatDate(booking.booking_date)} • {booking.staff_name}
                                </p>
                              </div>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < booking.rating! ? "text-yellow-400 fill-current" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {booking.notes && <p className="text-sm text-gray-700">{booking.notes}</p>}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-center text-gray-500">No reviews found for this customer.</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Customer Analytics</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Spending Pattern</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm">Average per visit</span>
                            <span className="font-medium">
                              {totalVisits > 0 ? formatCurrency(totalSpent / totalVisits) : formatCurrency(0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Last visit</span>
                            <span className="font-medium">
                              {bookings.length > 0 ? formatDate(bookings[0].booking_date) : "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Visit frequency</span>
                            <span className="font-medium">N/A</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Service Preferences</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {sortedServices.length > 0 ? (
                            sortedServices.map(([service, count], index) => {
                              const percentage = (count / totalVisits) * 100
                              return (
                                <div key={index} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>{service}</span>
                                    <span>{count} times</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-500 h-2 rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <p className="text-sm text-gray-600">No service data available.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  )
}
