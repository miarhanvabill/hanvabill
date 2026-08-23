"use client"

import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Package,
  IndianRupee,
  TrendingUp,
  Users,
  MessageCircle,
  UserCheck,
  BarChart3,
  PieChart,
  LineChart,
  HelpCircle,
  FileText,
  CreditCard,
  ShoppingCart,
} from "lucide-react"
import Link from "next/link"

const reportCategories = [
  { name: "All Reports", active: true },
  { name: "Booking", active: false },
  { name: "Inventory", active: false },
  { name: "Financial Overview", active: false },
  { name: "Sales Performance", active: false },
  { name: "Staff Performance", active: false },
  { name: "Enquiry", active: false },
  { name: "Customer Engagement", active: false },
]

const reports = [
  {
    title: "Booking",
    description: "Records details of each booking, including the customer, services, and total sales.",
    icon: Calendar,
    href: "/reports/booking",
    color: "bg-blue-50 text-blue-600",
    category: "Booking",
  },
  {
    title: "Product Stock Summary",
    description:
      "An overview of current inventory, stock movements, and availability to ensure timely restocking and efficient management.",
    icon: Package,
    href: "/reports/product-stock",
    color: "bg-green-50 text-green-600",
    category: "Inventory",
  },
  {
    title: "Inventory",
    description:
      "Get detailed insights into your stock levels, including received, used, and adjusted inventory, to monitor and manage your resources effectively.",
    icon: BarChart3,
    href: "/reports/inventory",
    color: "bg-purple-50 text-purple-600",
    category: "Inventory",
  },
  {
    title: "Inventory Adjustments",
    description: "Tracks stock changes, ensuring accuracy and reducing losses.",
    icon: TrendingUp,
    href: "/reports/inventory-adjustments",
    color: "bg-orange-50 text-orange-600",
    category: "Inventory",
  },
  {
    title: "Summary",
    description:
      "A concise snapshot of the business's financial health, showing key metrics like revenue, expenses, and profit.",
    icon: PieChart,
    href: "/reports/summary",
    color: "bg-pink-50 text-pink-600",
    category: "Financial Overview",
  },
  {
    title: "Daily Revenue",
    description: "Daily revenue totals, including tips, outstanding balances, and collected payments.",
    icon: IndianRupee,
    href: "/reports/daily-revenue",
    color: "bg-cyan-50 text-cyan-600",
    category: "Financial Overview",
  },
  {
    title: "Payment By Source",
    description: "Breakdown of income by payment methods (e.g. cash, card, online payments).",
    icon: LineChart,
    href: "/reports/payment-source",
    color: "bg-yellow-50 text-yellow-600",
    category: "Financial Overview",
  },
  {
    title: "Sales Report",
    description: "Comprehensive analysis of sales performance, trends, and product popularity.",
    icon: ShoppingCart,
    href: "/reports/sales",
    color: "bg-emerald-50 text-emerald-600",
    category: "Sales Performance",
  },
  {
    title: "Revenue Analysis",
    description: "Detailed breakdown of revenue streams and performance metrics over time.",
    icon: CreditCard,
    href: "/reports/revenue-analysis",
    color: "bg-violet-50 text-violet-600",
    category: "Sales Performance",
  },
  {
    title: "Staff Performance",
    description:
      "Individual staff metrics including bookings handled, revenue generated, and customer satisfaction ratings.",
    icon: UserCheck,
    href: "/reports/staff-performance",
    color: "bg-indigo-50 text-indigo-600",
    category: "Staff Performance",
  },
  {
    title: "Staff Productivity",
    description: "Track staff efficiency, working hours, and performance indicators.",
    icon: Users,
    href: "/reports/staff-productivity",
    color: "bg-rose-50 text-rose-600",
    category: "Staff Performance",
  },
  {
    title: "Staff Commissions",
    description: "Calculate and track commission payouts based on daily, weekly, or monthly sales.",
    icon: Users,
    href: "/reports/staff-commission",
    color: "bg-cyan-50 text-cyan-600",
    category: "Staff Performance",
  },
  {
    title: "Customer Analytics",
    description: "Detailed customer insights including demographics, visit frequency, and spending patterns.",
    icon: Users,
    href: "/reports/customer-analytics",
    color: "bg-red-50 text-red-600",
    category: "Customer Engagement",
  },
  {
    title: "Customer Retention",
    description: "Analysis of customer loyalty, repeat visits, and retention strategies effectiveness.",
    icon: TrendingUp,
    href: "/reports/customer-retention",
    color: "bg-teal-50 text-teal-600",
    category: "Customer Engagement",
  },
  {
    title: "Enquiry Report",
    description: "Track and analyze customer enquiries, conversion rates, and lead sources.",
    icon: MessageCircle,
    href: "/reports/enquiry",
    color: "bg-amber-50 text-amber-600",
    category: "Enquiry",
  },
  {
    title: "Lead Conversion",
    description: "Monitor lead generation sources and conversion effectiveness across channels.",
    icon: FileText,
    href: "/reports/lead-conversion",
    color: "bg-lime-50 text-lime-600",
    category: "Enquiry",
  },
]

export default function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState("All Reports")

  // Filter reports based on active category
  const filteredReports =
    activeCategory === "All Reports" ? reports : reports.filter((report) => report.category === activeCategory)

  // Get category counts for display
  const getCategoryCount = (categoryName: string) => {
    if (categoryName === "All Reports") return reports.length
    return reports.filter((report) => report.category === categoryName).length
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Reports"
        subtitle="View detailed reports to track progress and make informed decisions that help grow your salon."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              View detailed reports to track progress and make informed decisions that help grow your salon.
            </p>
            <Button variant="outline" className="gap-2 bg-transparent">
              <HelpCircle className="w-4 h-4" />
              Need Help?
            </Button>
          </div>

          {/* Report Categories */}
          <div className="flex flex-wrap gap-2">
            {reportCategories.map((category) => (
              <Button
                key={category.name}
                variant={category.name === activeCategory ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category.name)}
                className={`${
                  category.name === activeCategory ? "bg-black text-white" : "bg-white hover:bg-gray-50"
                } transition-colors duration-200`}
              >
                {category.name}
                <span className="ml-2 text-xs opacity-75">({getCategoryCount(category.name)})</span>
              </Button>
            ))}
          </div>

          {/* Category Description */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{activeCategory}</h3>
                <p className="text-gray-600 text-sm mt-1">
                  {activeCategory === "All Reports" &&
                    "Complete overview of all available reports across all categories"}
                  {activeCategory === "Booking" &&
                    "Track appointment schedules, booking patterns, and service utilization"}
                  {activeCategory === "Inventory" &&
                    "Monitor stock levels, inventory movements, and supply chain management"}
                  {activeCategory === "Financial Overview" &&
                    "Comprehensive financial analysis including revenue, expenses, and profitability"}
                  {activeCategory === "Sales Performance" &&
                    "Analyze sales trends, product performance, and revenue optimization"}
                  {activeCategory === "Staff Performance" &&
                    "Evaluate staff productivity, performance metrics, and team efficiency"}
                  {activeCategory === "Enquiry" &&
                    "Track customer inquiries, lead generation, and conversion analytics"}
                  {activeCategory === "Customer Engagement" &&
                    "Understand customer behavior, loyalty, and engagement patterns"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{filteredReports.length}</div>
                <div className="text-sm text-gray-500">{filteredReports.length === 1 ? "Report" : "Reports"}</div>
              </div>
            </div>
          </div>

          {/* Reports Grid */}
          {filteredReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map((report) => (
                <Link key={report.title} href={report.href}>
                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer h-full group">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center ${report.color} group-hover:scale-110 transition-transform duration-200`}
                        >
                          <report.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg group-hover:text-blue-600 transition-colors duration-200">
                            {report.title}
                          </CardTitle>
                          <div className="text-xs text-gray-500 mt-1 px-2 py-1 bg-gray-100 rounded-full w-fit">
                            {report.category}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">{report.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Found</h3>
              <p className="text-gray-600 mb-4">
                There are no reports available in the "{activeCategory}" category at the moment.
              </p>
              <Button variant="outline" onClick={() => setActiveCategory("All Reports")}>
                View All Reports
              </Button>
            </div>
          )}

          {/* Quick Stats */}
          {activeCategory === "All Reports" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {reports.filter((r) => r.category === "Booking").length}
                </div>
                <div className="text-sm text-gray-600">Booking Reports</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-green-600">
                  {reports.filter((r) => r.category === "Inventory").length}
                </div>
                <div className="text-sm text-gray-600">Inventory Reports</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {reports.filter((r) => r.category === "Financial Overview").length}
                </div>
                <div className="text-sm text-gray-600">Financial Reports</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {reports.filter((r) => r.category === "Staff Performance").length}
                </div>
                <div className="text-sm text-gray-600">Staff Reports</div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
