"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Filter, MoreHorizontal, Phone, User } from "lucide-react"
import { getEnquiries, updateEnquiryStatus, type Enquiry } from "@/app/actions/enquiries"

export default function EnquiryPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [sortBy, setSortBy] = useState("inquired-date")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEnquiries()
  }, [])

  const loadEnquiries = async () => {
    setLoading(true)
    try {
      const data = await getEnquiries()
      setEnquiries(data)
    } catch (error) {
      console.error("Error loading enquiries:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (enquiryId: number, newStatus: string) => {
    const result = await updateEnquiryStatus(enquiryId, newStatus)
    if (result.success) {
      loadEnquiries()
    }
  }

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading enquiries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Enquiry"
        subtitle="Manage customer inquiries in one place, ensuring no questions or service requests go unanswered."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Sort By:</span>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inquired-date">Inquired Date</SelectItem>
                        <SelectItem value="follow-up-date">Follow-up Date</SelectItem>
                        <SelectItem value="customer-name">Customer Name</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button variant="outline" className="gap-2 bg-transparent">
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enquiries List */}
          <div className="space-y-4">
            {enquiries.map((enquiry) => (
              <Card key={enquiry.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-lg">{enquiry.customer_name}</div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{enquiry.phone_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getStatusColor(enquiry.status)} capitalize`}>
                            Status: {enquiry.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div className="text-sm text-gray-600">
                        Inquired on: {new Date(enquiry.inquiry_date).toLocaleDateString()}
                      </div>
                      {enquiry.follow_up_date && (
                        <div className="text-sm text-gray-600">
                          Follow-up on: {new Date(enquiry.follow_up_date).toLocaleDateString()}
                        </div>
                      )}
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {enquiry.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{enquiry.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {enquiries.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No enquiries found</h3>
                    <p>Customer enquiries will appear here when they contact your business.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
