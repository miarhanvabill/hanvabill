// app/page.tsx
import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Calendar, IndianRupee, TrendingUp, Clock, Star, ShoppingBag, UserPlus } from "lucide-react"
import Link from "next/link"
import { getAuthenticatedSql } from "@/lib/db"
import { getDashboardStats } from "@/app/actions/dashboard"
import { getBusinessSettings } from "@/app/actions/settings"
import { auth } from "@clerk/nextjs/server"

async function DashboardStats() {
  const { orgId, orgSlug } = await auth()
  if (!orgId) {
    throw new Error("Organization required")
  }

  const tenantKey = orgSlug ?? orgId
  const { sql, tenantId } = await getAuthenticatedSql(tenantKey)
  
  const stats = await getDashboardStats(sql, tenantId)

  const safeStats = {
    today: {
      revenue: stats?.today?.revenue || 0,
      bookings: stats?.today?.bookings || 0,
      customers: stats?.today?.customers || 0,
      services: stats?.today?.services || 0,
    },
    thisMonth: {
      revenue: stats?.thisMonth?.revenue || 0,
      bookings: stats?.thisMonth?.bookings || 0,
      customers: stats?.thisMonth?.customers || 0,
      growth: stats?.thisMonth?.growth || 0,
    },
    recentBookings: stats?.recentBookings || [],
    topServices: stats?.topServices || [],
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(safeStats.today.revenue)}</div>
            <p className="text-xs text-muted-foreground">From {safeStats.today.bookings} bookings</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.today.bookings}</div>
            <p className="text-xs text-muted-foreground">{safeStats.today.services} services completed</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.today.customers}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeStats.thisMonth.growth > 0 ? "+" : ""}
              {safeStats.thisMonth.growth}%
            </div>
            <p className="text-xs text-muted-foreground">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(safeStats.thisMonth.revenue)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.thisMonth.bookings}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.thisMonth.customers}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/new-sale">
              <Button className="w-full h-20 flex flex-col gap-2 bg-slate-800 hover:bg-slate-900 text-white shadow-sm">
                <ShoppingBag className="h-6 w-6" />
                <span>New Sale</span>
              </Button>
            </Link>
            <Link href="/bookings">
              <Button className="w-full h-20 flex flex-col gap-2 bg-slate-800 hover:bg-slate-900 text-white shadow-sm">
                <Calendar className="h-6 w-6" />
                <span>Book Appointment</span>
              </Button>
            </Link>
            <Link href="/customers">
              <Button className="w-full h-20 flex flex-col gap-2 bg-slate-800 hover:bg-slate-900 text-white shadow-sm">
                <Users className="h-6 w-6" />
                <span>Customers</span>
              </Button>
            </Link>
            <Link href="/services">
              <Button className="w-full h-20 flex flex-col gap-2 bg-slate-800 hover:bg-slate-900 text-white shadow-sm">
                <Star className="h-6 w-6" />
                <span>Services</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {safeStats.recentBookings.length > 0 ? (
                safeStats.recentBookings.map((booking: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{booking.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{booking.service_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(booking.amount || 0)}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {booking.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No recent bookings</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {safeStats.topServices.length > 0 ? (
                safeStats.topServices.map((service: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.bookings} bookings</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(service.revenue || 0)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No service data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const settings = await getBusinessSettings();
  const salonName = settings?.profile?.salonName || "Hanva Billing";
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to {salonName}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="font-medium">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
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
                    <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        }
      >
        <DashboardStats />
      </Suspense>
    </div>
  )
}
