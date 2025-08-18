"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  Star,
  ShoppingBag,
  UserPlus,
  Scissors,
  Package,
  BarChart3,
  Settings,
  Crown,
  Bell,
  Search,
  User,
  Menu,
  ChevronRight,
  Phone,
  Mail,
  Edit,
  Trash2,
  Plus,
  Filter,
  Download,
  Eye,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PreviewPage() {
  const [activeView, setActiveView] = useState("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const menuItems = [
    { title: "Dashboard", href: "/", icon: BarChart3, active: activeView === "dashboard" },
    { title: "New Sales", href: "/new-sale", icon: ShoppingBag, active: activeView === "sales" },
    { title: "Customers", href: "/customers", icon: Users, active: activeView === "customers" },
    { title: "Bookings", href: "/bookings", icon: Calendar, active: activeView === "bookings" },
    { title: "Services", href: "/services", icon: Scissors, active: activeView === "services" },
    { title: "Staff", href: "/staff", icon: UserPlus, active: activeView === "staff" },
    { title: "Inventory", href: "/inventory", icon: Package, active: activeView === "inventory" },
    { title: "Settings", href: "/settings", icon: Settings, active: activeView === "settings" },
  ]

  const mockStats = {
    todayRevenue: 15420,
    todayBookings: 28,
    newCustomers: 12,
    monthlyGrowth: 15.2,
  }

  const mockBookings = [
    {
      id: 1,
      customer: "Sarah Johnson",
      service: "Hair Cut & Style",
      time: "10:00 AM",
      amount: 850,
      status: "completed",
    },
    {
      id: 2,
      customer: "Emma Wilson",
      service: "Facial Treatment",
      time: "11:30 AM",
      amount: 1200,
      status: "in-progress",
    },
    { id: 3, customer: "Lisa Brown", service: "Manicure & Pedicure", time: "2:00 PM", amount: 950, status: "upcoming" },
    { id: 4, customer: "Anna Davis", service: "Hair Coloring", time: "3:30 PM", amount: 2500, status: "upcoming" },
  ]

  const mockCustomers = [
    {
      id: 1,
      name: "Sarah Johnson",
      phone: "+91 98765 43210",
      email: "sarah@email.com",
      visits: 15,
      lastVisit: "2024-01-15",
      loyalty: "Gold",
    },
    {
      id: 2,
      name: "Emma Wilson",
      phone: "+91 98765 43211",
      email: "emma@email.com",
      visits: 8,
      lastVisit: "2024-01-14",
      loyalty: "Silver",
    },
    {
      id: 3,
      name: "Lisa Brown",
      phone: "+91 98765 43212",
      email: "lisa@email.com",
      visits: 22,
      lastVisit: "2024-01-13",
      loyalty: "Platinum",
    },
    {
      id: 4,
      name: "Anna Davis",
      phone: "+91 98765 43213",
      email: "anna@email.com",
      visits: 3,
      lastVisit: "2024-01-12",
      loyalty: "Bronze",
    },
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "upcoming":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getLoyaltyColor = (loyalty: string) => {
    switch (loyalty) {
      case "Platinum":
        return "bg-purple-100 text-purple-800"
      case "Gold":
        return "bg-yellow-100 text-yellow-800"
      case "Silver":
        return "bg-gray-100 text-gray-800"
      case "Bronze":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 shadow-lg flex flex-col ${sidebarCollapsed ? "w-16" : "w-64"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-black">Glamour</h1>
                <p className="text-xs text-gray-600">Salon Management</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-black transition-colors"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "" : "rotate-180"}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 bg-white overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <button
                    onClick={() => setActiveView(item.href.slice(1) || "dashboard")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      item.active
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${item.active ? "text-white" : "text-gray-600"}`} />
                    {!sidebarCollapsed && (
                      <div className="flex-1 min-w-0 text-left">
                        <div className={`font-medium text-sm ${item.active ? "text-white" : "text-gray-700"}`}>
                          {item.title}
                        </div>
                      </div>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          {!sidebarCollapsed && (
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-3 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-yellow-300" />
                <span className="font-medium text-sm">Premium Plan</span>
              </div>
              <p className="text-xs text-gray-200 mb-2">Unlock advanced features</p>
              <button className="w-full bg-white/20 hover:bg-white/30 text-white text-xs py-1.5 px-3 rounded transition-colors">
                Upgrade Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "ml-16" : "ml-64"}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input type="search" placeholder="Search customers, bookings..." className="pl-8" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                3
              </Badge>
            </Button>

            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {activeView === "dashboard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Dashboard</h1>
                  <p className="text-muted-foreground">Welcome to Glamour Salon Management</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="font-medium">Monday, January 15, 2024</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700">Today's Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-900">{formatCurrency(mockStats.todayRevenue)}</div>
                    <p className="text-xs text-blue-600">From {mockStats.todayBookings} bookings</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-700">Today's Bookings</CardTitle>
                    <Calendar className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-900">{mockStats.todayBookings}</div>
                    <p className="text-xs text-green-600">15 services completed</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700">New Customers</CardTitle>
                    <UserPlus className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-900">{mockStats.newCustomers}</div>
                    <p className="text-xs text-purple-600">Today</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-orange-700">Monthly Growth</CardTitle>
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-900">+{mockStats.monthlyGrowth}%</div>
                    <p className="text-xs text-orange-600">vs last month</p>
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
                    <Button className="w-full h-20 flex flex-col gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <ShoppingBag className="h-6 w-6" />
                      <span>New Sale</span>
                    </Button>
                    <Button className="w-full h-20 flex flex-col gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700">
                      <Calendar className="h-6 w-6" />
                      <span>Book Appointment</span>
                    </Button>
                    <Button className="w-full h-20 flex flex-col gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      <Users className="h-6 w-6" />
                      <span>Customers</span>
                    </Button>
                    <Button className="w-full h-20 flex flex-col gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
                      <Star className="h-6 w-6" />
                      <span>Services</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                            {booking.customer
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div>
                            <p className="font-medium">{booking.customer}</p>
                            <p className="text-sm text-muted-foreground">{booking.service}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="font-medium">{formatCurrency(booking.amount)}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {booking.time}
                            </p>
                          </div>
                          <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === "customers" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Customers</h1>
                  <p className="text-muted-foreground">Manage your customer database</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Customer List</CardTitle>
                    <div className="flex items-center gap-2">
                      <Input placeholder="Search customers..." className="w-64" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockCustomers.map((customer) => (
                      <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                            {customer.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div>
                            <h3 className="font-medium">{customer.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">{customer.visits} visits</p>
                            <p className="text-sm text-muted-foreground">Last: {customer.lastVisit}</p>
                          </div>
                          <Badge className={getLoyaltyColor(customer.loyalty)}>{customer.loyalty}</Badge>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === "bookings" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Bookings</h1>
                  <p className="text-muted-foreground">Manage appointments and scheduling</p>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
              </div>

              <Tabs defaultValue="today" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="today">Today</TabsTrigger>
                  <TabsTrigger value="week">This Week</TabsTrigger>
                  <TabsTrigger value="month">This Month</TabsTrigger>
                  <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                </TabsList>

                <TabsContent value="today" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Today's Schedule</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {mockBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-sm">{booking.time}</p>
                                <p className="text-sm text-muted-foreground">{booking.customer}</p>
                                <p className="text-xs text-muted-foreground">{booking.service}</p>
                              </div>
                              <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Quick Stats</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Bookings</span>
                            <span className="font-medium">28</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Completed</span>
                            <span className="font-medium text-green-600">15</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">In Progress</span>
                            <span className="font-medium text-blue-600">3</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Upcoming</span>
                            <span className="font-medium text-yellow-600">10</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Revenue Today</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600 mb-2">
                            {formatCurrency(mockStats.todayRevenue)}
                          </div>
                          <p className="text-sm text-muted-foreground">From 15 completed services</p>
                          <div className="mt-4 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-700">
                              <TrendingUp className="h-4 w-4 inline mr-1" />
                              +12% from yesterday
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeView === "sales" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">New Sale</h1>
                  <p className="text-muted-foreground">Create a new sale transaction</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Service Selection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { name: "Hair Cut & Style", price: 850, category: "Hair" },
                          { name: "Hair Coloring", price: 2500, category: "Hair" },
                          { name: "Facial Treatment", price: 1200, category: "Skin" },
                          { name: "Manicure & Pedicure", price: 950, category: "Nails" },
                          { name: "Hair Wash", price: 300, category: "Hair" },
                          { name: "Eyebrow Threading", price: 150, category: "Beauty" },
                        ].map((service, index) => (
                          <div
                            key={index}
                            className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <h3 className="font-medium">{service.name}</h3>
                            <p className="text-sm text-muted-foreground">{service.category}</p>
                            <p className="font-bold text-green-600">{formatCurrency(service.price)}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Cart Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Hair Cut & Style</span>
                            <span className="text-sm font-medium">{formatCurrency(850)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Facial Treatment</span>
                            <span className="text-sm font-medium">{formatCurrency(1200)}</span>
                          </div>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Subtotal</span>
                            <span className="text-sm">{formatCurrency(2050)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Tax (18%)</span>
                            <span className="text-sm">{formatCurrency(369)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>{formatCurrency(2419)}</span>
                          </div>
                        </div>
                        <Button className="w-full">Proceed to Checkout</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
