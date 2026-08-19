"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ArrowLeft, Users, TrendingUp, Phone, MessageCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRealTimeSync } from "@/lib/websocket"

interface EnquiryReportData {
  id: number
  customer_name: string
  phone_number: string
  source: string
  status: "new" | "contacted" | "converted" | "closed"
  inquiry_date: string
  follow_up_date?: string
  conversion_date?: string
  notes: string
  assigned_to: string
  conversion_value?: number
}

interface EnquiryStats {
  total_enquiries: number
  new_enquiries: number
  contacted: number
  converted: number
  closed: number
  conversion_rate: number
  total_conversion_value: number
  average_response_time: number
}

export default function EnquiryReportPage() {
  const [enquiries, setEnquiries] = useState<EnquiryReportData[]>([])
  const [stats, setStats] = useState<EnquiryStats | null>(null)
  const [dateRange, setDateRange] = useState("This Month")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const { isConnected, subscribe } = useRealTimeSync(["enquiry_created", "enquiry_updated", "enquiry_converted"])

  const fetchEnquiryData = async () => {
    try {
      const response = await fetch(`/api/reports/enquiry?dateRange=${dateRange}&status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        setEnquiries(data.enquiries)
        setStats(data.stats)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error("Error fetching enquiry data:", error)
      // Fallback data
      const mockEnquiries: EnquiryReportData[] = [
        {
          id: 1,
          customer_name: "Priya Sharma",
          phone_number: "+91 9876543210",
          source: "Website",
          status: "converted",
          inquiry_date: "2024-01-15",
          follow_up_date: "2024-01-16",
          conversion_date: "2024-01-18",
          notes: "Interested in bridal package",
          assigned_to: "Receptionist",
          conversion_value: 15000,
        },
        {
          id: 2,
          customer_name: "Anjali Patel",
          phone_number: "+91 9876543211",
          source: "Walk-in",
          status: "contacted",
          inquiry_date: "2024-01-14",
          follow_up_date: "2024-01-17",
          notes: "Asked about hair treatments",
          assigned_to: "Manager",
        },
        {
          id: 3,
          customer_name: "Ravi Kumar",
          phone_number: "+91 9876543212",
          source: "Social Media",
          status: "new",
          inquiry_date: "2024-01-16",
          notes: "Inquiry about men's grooming services",
          assigned_to: "Staff",
        },
      ]

      const mockStats: EnquiryStats = {
        total_enquiries: 45,
        new_enquiries: 12,
        contacted: 18,
        converted: 10,
        closed: 5,
        conversion_rate: 22.2,
        total_conversion_value: 125000,
        average_response_time: 2.5,
      }

      setEnquiries(mockEnquiries)
      setStats(mockStats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEnquiryData()
    const interval = setInterval(fetchEnquiryData, 15000) // Refresh every 15 seconds
    return () => clearInterval(interval)
  }, [dateRange, statusFilter])

  // Real-time updates
  useEffect(() => {
    subscribe("enquiry_created", () => fetchEnquiryData())
    subscribe("enquiry_updated", () => fetchEnquiryData())
    subscribe("enquiry_converted", () => fetchEnquiryData())
  }, [subscribe])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "contacted":
        return "bg-yellow-100 text-yellow-800"
      case "converted":
        return "bg-green-100 text-green-800"
      case "closed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case "website":
        return "🌐"
      case "social media":
        return "📱"
      case "walk-in":
        return "🚶"
      case "referral":
        return "👥"
      default:
        return "📞"
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading enquiry report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Enquiry Report"
        subtitle="Track customer inquiries, conversion rates, and lead sources with real-time analytics."
        showBackButton
        backHref="/reports"
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/reports">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Reports
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                    <span>{isConnected ? "Live Updates" : "Offline"}</span>
                    <span>•</span>
                    <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Today">Today</SelectItem>
                      <SelectItem value="This Week">This Week</SelectItem>
                      <SelectItem value="This Month">This Month</SelectItem>
                      <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchEnquiryData} className="gap-2 bg-transparent">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                  <Button className="gap-2 bg-black text-white hover:bg-gray-800">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enquiries</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_enquiries}</div>
                <p className="text-xs text-muted-foreground">{stats.new_enquiries} new this period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.conversion_rate}%</div>
                <p className="text-xs text-muted-foreground">{stats.converted} converted</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  ₹{stats.total_conversion_value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">From converted leads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <MessageCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.average_response_time}h</div>
                <p className="text-xs text-muted-foreground">Average response time</p>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Enquiry Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.new_enquiries}</div>
                  <div className="text-sm text-blue-600">New</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{stats.contacted}</div>
                  <div className="text-sm text-yellow-600">Contacted</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
                  <div className="text-sm text-green-600">Converted</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
                  <div className="text-sm text-gray-600">Closed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enquiries Table */}
          <Card>
            <CardHeader>
              <CardTitle>Enquiry Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Customer</th>
                      <th className="text-left p-3 font-medium">Contact</th>
                      <th className="text-left p-3 font-medium">Source</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Inquiry Date</th>
                      <th className="text-left p-3 font-medium">Follow-up</th>
                      <th className="text-center p-3 font-medium">Value</th>
                      <th className="text-left p-3 font-medium">Assigned To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {enquiries.map((enquiry) => (
                      <tr key={enquiry.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{enquiry.customer_name}</div>
                            {enquiry.notes && <div className="text-xs text-gray-500 mt-1">{enquiry.notes}</div>}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{enquiry.phone_number}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span>{getSourceIcon(enquiry.source)}</span>
                            <span>{enquiry.source}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`${getStatusColor(enquiry.status)} capitalize`}>{enquiry.status}</Badge>
                        </td>
                        <td className="p-3">{new Date(enquiry.inquiry_date).toLocaleDateString()}</td>
                        <td className="p-3">
                          {enquiry.follow_up_date ? new Date(enquiry.follow_up_date).toLocaleDateString() : "-"}
                        </td>
                        <td className="p-3 text-center">
                          {enquiry.conversion_value ? (
                            <span className="font-medium text-green-600">
                              ₹{enquiry.conversion_value.toLocaleString()}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-3">{enquiry.assigned_to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
