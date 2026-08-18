"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Megaphone,
  Users,
  Mail,
  MessageSquare,
  TrendingUp,
  Target,
  Send,
  Eye,
  Plus,
  Filter,
  Search,
} from "lucide-react"
import {
  getMarketingCampaigns,
  createCampaign,
  getCustomerSegments,
  type Campaign,
  type CustomerSegment,
} from "@/app/actions/marketing"

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "email",
    subject: "",
    message: "",
    segmentId: "all", // Updated default value to 'all'
    scheduledDate: "",
    budget: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [campaignsData, segmentsData] = await Promise.all([getMarketingCampaigns(), getCustomerSegments()])
      setCampaigns(campaignsData)
      setSegments(segmentsData)
    } catch (error) {
      console.error("Error loading marketing data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.message) {
      alert("Please fill all required fields")
      return
    }

    const result = await createCampaign({
      name: campaignForm.name,
      type: campaignForm.type as "email" | "sms" | "whatsapp",
      subject: campaignForm.subject,
      message: campaignForm.message,
      segmentId: campaignForm.segmentId === "all" ? null : Number.parseInt(campaignForm.segmentId),
      scheduledDate: campaignForm.scheduledDate || null,
      budget: Number.parseFloat(campaignForm.budget) || null,
    })

    if (result.success) {
      setShowCampaignModal(false)
      setCampaignForm({
        name: "",
        type: "email",
        subject: "",
        message: "",
        segmentId: "all",
        scheduledDate: "",
        budget: "",
      })
      loadData()
    } else {
      alert(result.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getCampaignIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="w-4 h-4" />
      case "sms":
        return <MessageSquare className="w-4 h-4" />
      case "whatsapp":
        return <MessageSquare className="w-4 h-4" />
      default:
        return <Megaphone className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading marketing data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Marketing"
        subtitle="Create targeted campaigns, manage customer segments, and track marketing performance."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Marketing Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                    <p className="text-2xl font-bold">{campaigns.filter((c) => c.status === "active").length}</p>
                  </div>
                  <Megaphone className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Reach</p>
                    <p className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Open Rate</p>
                    <p className="text-2xl font-bold">
                      {campaigns.length > 0
                        ? (
                            (campaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0) /
                              campaigns.reduce((sum, c) => sum + (c.sent_count || 1), 0)) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                  <Eye className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">ROI</p>
                    <p className="text-2xl font-bold">
                      {campaigns.length > 0
                        ? (
                            (campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0) /
                              campaigns.reduce((sum, c) => sum + (c.budget || 1), 0)) *
                            100
                          ).toFixed(0)
                        : 0}
                      %
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="campaigns" className="space-y-6">
            <TabsList>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="segments">Customer Segments</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns" className="space-y-6">
              {/* Campaign Controls */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input placeholder="Search campaigns..." className="pl-10 w-64" />
                      </div>
                      <Button variant="outline" className="gap-2 bg-transparent">
                        <Filter className="w-4 h-4" />
                        Filter
                      </Button>
                    </div>

                    <Dialog open={showCampaignModal} onOpenChange={setShowCampaignModal}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="w-4 h-4" />
                          Create Campaign
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Create Marketing Campaign</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Campaign Name</Label>
                              <Input
                                placeholder="Summer Sale 2024"
                                value={campaignForm.name}
                                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Campaign Type</Label>
                              <Select
                                value={campaignForm.type}
                                onValueChange={(value) => setCampaignForm({ ...campaignForm, type: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="sms">SMS</SelectItem>
                                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label>Subject Line</Label>
                            <Input
                              placeholder="Get 20% off on all services!"
                              value={campaignForm.subject}
                              onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label>Message</Label>
                            <Textarea
                              placeholder="Write your campaign message here..."
                              value={campaignForm.message}
                              onChange={(e) => setCampaignForm({ ...campaignForm, message: e.target.value })}
                              className="min-h-[120px]"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Target Segment</Label>
                              <Select
                                value={campaignForm.segmentId}
                                onValueChange={(value) => setCampaignForm({ ...campaignForm, segmentId: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="All customers" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Customers</SelectItem>
                                  {segments.map((segment) => (
                                    <SelectItem key={segment.id} value={segment.id.toString()}>
                                      {segment.name} ({segment.customer_count} customers)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Budget</Label>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={campaignForm.budget}
                                onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Schedule Date (Optional)</Label>
                            <Input
                              type="datetime-local"
                              value={campaignForm.scheduledDate}
                              onChange={(e) => setCampaignForm({ ...campaignForm, scheduledDate: e.target.value })}
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCampaignModal(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateCampaign}>Create Campaign</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* Campaigns List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            {getCampaignIcon(campaign.type)}
                          </div>
                          <div>
                            <h3 className="font-semibold">{campaign.name}</h3>
                            <p className="text-sm text-gray-500 capitalize">{campaign.type}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Sent:</span>
                            <span className="ml-2 font-medium">{campaign.sent_count || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Opened:</span>
                            <span className="ml-2 font-medium">{campaign.opened_count || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Clicked:</span>
                            <span className="ml-2 font-medium">{campaign.clicked_count || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Revenue:</span>
                            <span className="ml-2 font-medium">₹{(campaign.revenue || 0).toFixed(0)}</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t">
                          <p className="text-sm text-gray-600 line-clamp-2">{campaign.message}</p>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                          <span className="text-xs text-gray-500">
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                            {campaign.status === "scheduled" && (
                              <Button size="sm">
                                <Send className="w-3 h-3 mr-1" />
                                Send Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="segments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Segments</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-4 font-medium">Segment Name</th>
                          <th className="text-left p-4 font-medium">Criteria</th>
                          <th className="text-left p-4 font-medium">Customers</th>
                          <th className="text-left p-4 font-medium">Last Updated</th>
                          <th className="text-left p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {segments.map((segment) => (
                          <tr key={segment.id} className="hover:bg-gray-50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                  <Target className="w-4 h-4 text-purple-600" />
                                </div>
                                <span className="font-medium">{segment.name}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-gray-600">{segment.criteria}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-medium">{segment.customer_count}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-gray-500">
                                {new Date(segment.updated_at).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="p-4">
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Email Open Rate</span>
                        <span className="font-semibold">24.5%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: "24.5%" }}></div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Click Through Rate</span>
                        <span className="font-semibold">3.2%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: "3.2%" }}></div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Conversion Rate</span>
                        <span className="font-semibold">1.8%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: "1.8%" }}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Attribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Email Campaigns</span>
                        <span className="font-semibold">₹45,230</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">SMS Campaigns</span>
                        <span className="font-semibold">₹12,450</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">WhatsApp Campaigns</span>
                        <span className="font-semibold">₹8,920</span>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Revenue</span>
                          <span>₹66,600</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
