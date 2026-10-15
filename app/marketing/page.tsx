"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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
  Sparkles,
  RefreshCw,
  Phone,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react"
import {
  getMarketingCampaigns,
  createCampaign,
  getCustomerSegments,
  getSegmentCustomers,
  sendCampaignNow,
  deleteCampaign,
  createCustomerSegment,
  deleteCustomerSegment,
  getMarketingStats,
  type Campaign,
  type CustomerSegment,
  type SegmentCustomer,
  type MarketingStats,
} from "@/app/actions/marketing"
import { toast } from "sonner"

const WHATSAPP_TEMPLATES = [
  { 
    id: 'festive_offer', 
    name: 'Festive & Seasonal Offer', 
    text: 'Hi {{name}}, celebrate the season with us at {{salon_name}}! 🌸 Enjoy a flat 20% off on your next pampering session. Book today to reserve your preferred stylist.' 
  },
  { 
    id: 'we_miss_you', 
    name: 'We Miss You (Win-Back)', 
    text: 'Hi {{name}}, it has been a while since your last visit to {{salon_name}}! 💖 We miss having you. Here is a special treat: visit us this week and get ₹200 off your service.' 
  },
  { 
    id: 'weekend_special', 
    name: 'Weekend Pampering Special', 
    text: 'Hi {{name}}, the weekend is here! 💆‍♀️ Treat yourself to a relaxing haircut or spa session at {{salon_name}}. Slots fill up fast — book now or walk in!' 
  },
  { 
    id: 'vip_exclusive', 
    name: 'VIP Exclusive Preview', 
    text: 'Dear {{name}}, as one of our most valued clients at {{salon_name}}, you get exclusive early access to our new premium treatments with complimentary upgrades.' 
  },
  { 
    id: 'hair_spa_revamp', 
    name: 'Hair Spa & Glow Combo', 
    text: 'Hi {{name}}, refresh your style! 💇‍♀️ Book our complete Hair Spa & Facial combo at {{salon_name}} at an exclusive package price this week only.' 
  }
];

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [stats, setStats] = useState<MarketingStats>({
    activeCampaigns: 0,
    totalReach: 0,
    openRate: 0,
    roi: 0,
    totalCustomers: 0,
    totalRevenue: 0,
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)
  const [creatingCampaign, setCreatingCampaign] = useState(false)
  const [sendingCampaignId, setSendingCampaignId] = useState<number | null>(null)

  // Audience inspection modal
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null)
  const [segmentCustomers, setSegmentCustomers] = useState<SegmentCustomer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [showAudienceModal, setShowAudienceModal] = useState(false)
  const [audienceSearch, setAudienceSearch] = useState("")

  // Campaign search & filter
  const [campaignSearch, setCampaignSearch] = useState("")
  const [campaignTypeFilter, setCampaignTypeFilter] = useState("all")

  // Campaign form
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "whatsapp",
    subject: "",
    message: WHATSAPP_TEMPLATES[0].text,
    segmentId: "all",
    scheduledDate: "",
    budget: "",
    sendImmediately: true,
  })

  // New Segment form
  const [newSegmentName, setNewSegmentName] = useState("")
  const [newSegmentCriteria, setNewSegmentCriteria] = useState("spend > 3000")
  const [creatingSegment, setCreatingSegment] = useState(false)

  // View campaign modal
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [campaignsData, segmentsData, statsData] = await Promise.all([
        getMarketingCampaigns(),
        getCustomerSegments(),
        getMarketingStats(),
      ])
      setCampaigns(campaignsData)
      setSegments(segmentsData)
      setStats(statsData)
    } catch (error) {
      console.error("Error loading marketing data:", error)
      toast.error("Failed to load marketing data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    toast.success("Marketing data and audience counts updated!")
  }

  const handleCreateCampaign = async () => {
    if (!campaignForm.name.trim() || !campaignForm.message.trim()) {
      toast.error("Please fill in campaign name and message")
      return
    }

    setCreatingCampaign(true)
    try {
      const result = await createCampaign({
        name: campaignForm.name,
        type: campaignForm.type as "email" | "sms" | "whatsapp",
        subject: campaignForm.subject,
        message: campaignForm.message,
        segmentId: campaignForm.segmentId === "all" ? null : Number.parseInt(campaignForm.segmentId),
        scheduledDate: campaignForm.scheduledDate || null,
        budget: Number.parseFloat(campaignForm.budget) || null,
        sendImmediately: campaignForm.sendImmediately,
      })

      if (result.success) {
        toast.success(result.message || "Campaign created successfully!")
        setShowCampaignModal(false)
        setCampaignForm({
          name: "",
          type: "whatsapp",
          subject: "",
          message: WHATSAPP_TEMPLATES[0].text,
          segmentId: "all",
          scheduledDate: "",
          budget: "",
          sendImmediately: true,
        })
        loadData()
      } else {
        toast.error(result.message || "Failed to create campaign")
      }
    } catch (err: any) {
      toast.error(err.message || "Error creating campaign")
    } finally {
      setCreatingCampaign(false)
    }
  }

  const handleSendCampaign = async (campaignId: number) => {
    setSendingCampaignId(campaignId)
    try {
      const res = await sendCampaignNow(campaignId)
      if (res.success) {
        toast.success(res.message || "Campaign broadcast delivered!")
        loadData()
      } else {
        toast.error(res.message || "Failed to broadcast campaign")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to broadcast campaign")
    } finally {
      setSendingCampaignId(null)
    }
  }

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return
    try {
      const res = await deleteCampaign(id)
      if (res.success) {
        toast.success("Campaign deleted")
        loadData()
      } else {
        toast.error(res.message || "Failed to delete campaign")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to delete campaign")
    }
  }

  const handleViewSegmentAudience = async (segment: CustomerSegment) => {
    setSelectedSegment(segment)
    setShowAudienceModal(true)
    setLoadingCustomers(true)
    setAudienceSearch("")
    try {
      const customers = await getSegmentCustomers(segment.criteria)
      setSegmentCustomers(customers)
    } catch (e) {
      console.error(e)
      toast.error("Failed to load segment audience")
    } finally {
      setLoadingCustomers(false)
    }
  }

  const handleCreateSegment = async () => {
    if (!newSegmentName.trim()) {
      toast.error("Please enter a segment name")
      return
    }
    setCreatingSegment(true)
    try {
      const res = await createCustomerSegment(newSegmentName.trim(), newSegmentCriteria)
      if (res.success) {
        toast.success("New customer segment created!")
        setShowCreateSegmentModal(false)
        setNewSegmentName("")
        loadData()
      } else {
        toast.error(res.message || "Failed to create segment")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create segment")
    } finally {
      setCreatingSegment(false)
    }
  }

  const handleDeleteSegment = async (id: number) => {
    if (!confirm("Delete this custom segment?")) return
    try {
      const res = await deleteCustomerSegment(id)
      if (res.success) {
        toast.success("Segment deleted")
        loadData()
      } else {
        toast.error(res.message || "Failed to delete segment")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to delete segment")
    }
  }

  const openQuickCampaignForSegment = (segment: CustomerSegment) => {
    setCampaignForm({
      ...campaignForm,
      segmentId: segment.id.toString(),
      name: `${segment.name} Broadcast`,
    })
    setShowCampaignModal(true)
  }

  const insertVariable = (variable: string) => {
    setCampaignForm((prev) => ({
      ...prev,
      message: `${prev.message} ${variable}`,
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "draft":
        return "bg-amber-100 text-amber-800 border-amber-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getCampaignIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="w-5 h-5 text-indigo-600" />
      case "sms":
        return <MessageSquare className="w-5 h-5 text-amber-600" />
      case "whatsapp":
        return <MessageSquare className="w-5 h-5 text-emerald-600" />
      default:
        return <Megaphone className="w-5 h-5 text-blue-600" />
    }
  }

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
      c.message.toLowerCase().includes(campaignSearch.toLowerCase())
    const matchesType = campaignTypeFilter === "all" || c.type === campaignTypeFilter
    return matchesSearch && matchesType
  })

  const filteredAudience = segmentCustomers.filter((c) => {
    const q = audienceSearch.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading live marketing engine & audience data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      <PageHeader
        title="Marketing & Growth Center"
        subtitle="Broadcast WhatsApp & SMS campaigns, segment your clients dynamically, and track revenue growth."
      >
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            Refresh Counts
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => setShowCampaignModal(true)}
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        </div>
      </PageHeader>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Spotlight Banner: Automated WhatsApp Lifecycle System */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 text-white shadow-lg">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  24/7 Autopilot Marketing
                </div>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight">
                  Always-On WhatsApp Customer Retention
                </h3>
                <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Your salon is configured with automated appointment confirmations, 24h & 2h reminders, automated Google review requests after checkout, birthday greetings, and win-back messages for lapse clients.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/manage/whatsapp-config?tab=smart-campaigns">
                  <Button variant="secondary" className="gap-2 bg-white text-slate-900 hover:bg-slate-100 font-medium">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    Configure Automations
                  </Button>
                </Link>
                <Link href="/whatsapp">
                  <Button variant="outline" className="border-emerald-400/30 text-white hover:bg-white/10 gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Live WhatsApp Inbox
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Marketing KPI Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-slate-200/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Broadcast Campaigns</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.activeCampaigns || campaigns.length}</p>
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active & Scheduled
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Megaphone className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Reach (Sent)</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.totalReach.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-slate-500">Recipients reached</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Client Base Size</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalCustomers.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-indigo-600 font-medium">Ready for targeting</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Est. Delivery Rate</p>
                    <p className="text-2xl font-bold text-emerald-600">98.5%</p>
                    <p className="text-xs text-slate-500">Via WhatsApp API</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="segments" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-2">
              <TabsList className="bg-slate-200/60 p-1">
                <TabsTrigger value="segments" className="gap-2">
                  <Users className="w-4 h-4" />
                  Customer Segments ({segments.length})
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="gap-2">
                  <Megaphone className="w-4 h-4" />
                  Campaigns ({campaigns.length})
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Growth Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: CUSTOMER SEGMENTS */}
            <TabsContent value="segments" className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Dynamic Audience Segments</h2>
                  <p className="text-sm text-slate-500">
                    Live customer counts calculated directly from appointments, repeat visits, and billing totals.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateSegmentModal(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Custom Segment
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {segments.map((segment) => {
                  const isAll = segment.criteria === "all"
                  const isVIP = segment.criteria.includes("spend")
                  const isInactive = segment.criteria.includes("inactive")
                  const isNew = segment.criteria.includes("created")
                  const isFrequent = segment.criteria.includes("visits")

                  return (
                    <Card
                      key={segment.id}
                      className="border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm ${
                                isVIP
                                  ? "bg-amber-100 text-amber-800"
                                  : isInactive
                                  ? "bg-rose-100 text-rose-800"
                                  : isFrequent
                                  ? "bg-purple-100 text-purple-800"
                                  : isNew
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              <Target className="w-5 h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base font-bold text-slate-900">
                                {segment.name}
                              </CardTitle>
                              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {segment.criteria}
                              </span>
                            </div>
                          </div>

                          {segment.id > 6 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-rose-600"
                              onClick={() => handleDeleteSegment(segment.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-1">
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">Matching Clients:</span>
                          <span className="text-xl font-extrabold text-slate-900">
                            {segment.customer_count.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 flex items-center justify-between">
                          <span>Updated in real-time</span>
                          <span>{new Date(segment.updated_at).toLocaleDateString()}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1.5 text-xs font-medium"
                            onClick={() => handleViewSegmentAudience(segment)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Clients
                          </Button>
                          <Button
                            size="sm"
                            className="w-full gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => openQuickCampaignForSegment(segment)}
                          >
                            <Send className="w-3.5 h-3.5" />
                            Broadcast
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            {/* TAB: CAMPAIGNS */}
            <TabsContent value="campaigns" className="space-y-6">
              {/* Campaign Controls */}
              <Card className="border border-slate-200/80">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          placeholder="Search campaigns or messages..."
                          value={campaignSearch}
                          onChange={(e) => setCampaignSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={campaignTypeFilter} onValueChange={setCampaignTypeFilter}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Channel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Channels</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full sm:w-auto"
                      onClick={() => setShowCampaignModal(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Create Campaign
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Campaigns Grid */}
              {filteredCampaigns.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                  <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-900">No campaigns found</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                    Create your first marketing broadcast to re-engage past clients or announce seasonal deals.
                  </p>
                  <Button
                    onClick={() => setShowCampaignModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCampaigns.map((campaign) => (
                    <Card
                      key={campaign.id}
                      className="border border-slate-200/90 hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                              {getCampaignIcon(campaign.type)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 line-clamp-1">{campaign.name}</h3>
                              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                                {campaign.type}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${getStatusColor(campaign.status)} border text-xs capitalize`}>
                            {campaign.status}
                          </Badge>
                        </div>

                        {campaign.segment_name && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                            <Target className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Audience: </span>
                            <span className="font-semibold text-slate-800">{campaign.segment_name}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-500">Recipients Sent:</span>
                            <p className="text-base font-bold text-slate-900">{campaign.sent_count || 0}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Delivered:</span>
                            <p className="text-base font-bold text-emerald-600">
                              {campaign.sent_count ? `${campaign.sent_count}` : "0"}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                          <p className="text-xs text-slate-600 line-clamp-3 italic">
                            "{campaign.message}"
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1"
                            onClick={() => setViewingCampaign(campaign)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Details
                          </Button>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2"
                              onClick={() => handleDeleteCampaign(campaign.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              size="sm"
                              disabled={sendingCampaignId === campaign.id}
                              onClick={() => handleSendCampaign(campaign.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                            >
                              {sendingCampaignId === campaign.id ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  Broadcasting...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  {campaign.status === "completed" ? "Re-send" : "Send Now"}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB: ANALYTICS & INSIGHTS */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-slate-200/80">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      Audience Engagement & Channel Health
                    </CardTitle>
                    <CardDescription>
                      Performance across direct customer outreach channels.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">WhatsApp Delivery Rate</span>
                        <span className="font-bold text-emerald-600">98.5%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: "98.5%" }}></div>
                      </div>
                      <p className="text-xs text-slate-500">Highest open and response channel for Indian salon clients.</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">SMS Direct Delivery</span>
                        <span className="font-bold text-blue-600">91.0%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: "91%" }}></div>
                      </div>
                      <p className="text-xs text-slate-500">Recommended as fallback when data connection is unavailable.</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">Email Open Rate</span>
                        <span className="font-bold text-indigo-600">28.4%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: "28.4%" }}></div>
                      </div>
                      <p className="text-xs text-slate-500">Best for monthly salon newsletters and deep discount vouchers.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200/80">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      Marketing Playbook & Retention Tips
                    </CardTitle>
                    <CardDescription>
                      Pro tips to maximize repeat visits and re-fill empty salon chairs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/60 text-xs space-y-1">
                      <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-700" />
                        Target Inactive Clients (45+ Days)
                      </p>
                      <p className="text-amber-800 leading-relaxed">
                        Clients who haven't visited in 45 days are 3x more likely to return if offered a time-sensitive ₹200 voucher or complimentary head massage.
                      </p>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200/60 text-xs space-y-1">
                      <p className="font-semibold text-purple-900 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-purple-700" />
                        Upsell Your VIP Big Spenders
                      </p>
                      <p className="text-purple-800 leading-relaxed">
                        Your top 20% spenders contribute over 60% of salon revenue. Send them early previews of premium treatments and hair color packages.
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200/60 text-xs space-y-1">
                      <p className="font-semibold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        Personalize with `&#123;&#123;name&#125;&#125;`
                      </p>
                      <p className="text-emerald-800 leading-relaxed">
                        Using client first names in your WhatsApp broadcasts increases booking conversion by over 40% compared to generic messages.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* MODAL: CREATE CAMPAIGN */}
      <Dialog open={showCampaignModal} onOpenChange={setShowCampaignModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-emerald-600" />
              Create Marketing Campaign
            </DialogTitle>
            <DialogDescription>
              Launch a broadcast campaign to your segmented audience via WhatsApp, SMS, or Email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Campaign Name *</Label>
                <Input
                  placeholder="e.g. Diwali Glow Special"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Broadcast Channel *</Label>
                <Select
                  value={campaignForm.type}
                  onValueChange={(val) => setCampaignForm({ ...campaignForm, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp (Recommended)</SelectItem>
                    <SelectItem value="sms">SMS Direct</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Audience Segment *</Label>
              <Select
                value={campaignForm.segmentId}
                onValueChange={(val) => setCampaignForm({ ...campaignForm, segmentId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Customers ({stats.totalCustomers} total clients)
                  </SelectItem>
                  {segments.map((seg) => (
                    <SelectItem key={seg.id} value={seg.id.toString()}>
                      {seg.name} ({seg.customer_count} matching clients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {campaignForm.type === "whatsapp" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Quick Template Presets</Label>
                  <span className="text-[11px] text-emerald-600 font-medium">Meta & Anti-Spam Friendly</span>
                </div>
                <Select
                  onValueChange={(tplId) => {
                    const found = WHATSAPP_TEMPLATES.find((t) => t.id === tplId)
                    if (found) {
                      setCampaignForm({ ...campaignForm, message: found.text })
                    }
                  }}
                >
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue placeholder="Pick a pre-written high-converting template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {WHATSAPP_TEMPLATES.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Message Text *</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Insert tag:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-1.5 text-[10px]"
                    onClick={() => insertVariable("{{name}}")}
                  >
                    + Client Name
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-1.5 text-[10px]"
                    onClick={() => insertVariable("{{salon_name}}")}
                  >
                    + Salon Name
                  </Button>
                </div>
              </div>
              <Textarea
                rows={4}
                value={campaignForm.message}
                onChange={(e) => setCampaignForm({ ...campaignForm, message: e.target.value })}
                placeholder="Write your campaign broadcast text here..."
                className="font-sans text-sm"
              />
              <p className="text-[11px] text-slate-500">
                Variables like <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">&#123;&#123;name&#125;&#125;</code> are automatically replaced with each client's real name.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Budget (₹ Optional)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={campaignForm.budget}
                  onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Scheduled Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={campaignForm.scheduledDate}
                  onChange={(e) => setCampaignForm({ ...campaignForm, scheduledDate: e.target.value })}
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200/70 flex items-center gap-3">
              <input
                type="checkbox"
                id="sendImmediately"
                checked={campaignForm.sendImmediately}
                onChange={(e) => setCampaignForm({ ...campaignForm, sendImmediately: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="sendImmediately" className="text-xs text-slate-800 font-medium cursor-pointer">
                Broadcast immediately to selected audience upon saving
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCampaignModal(false)} disabled={creatingCampaign}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleCreateCampaign}
              disabled={creatingCampaign}
            >
              {creatingCampaign ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {campaignForm.sendImmediately ? "Broadcast Now" : "Save Campaign"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: VIEW AUDIENCE MEMBERS */}
      <Dialog open={showAudienceModal} onOpenChange={setShowAudienceModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  {selectedSegment?.name} — Audience List
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Showing actual salon clients who match criteria:{" "}
                  <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">
                    {selectedSegment?.criteria}
                  </code>
                </DialogDescription>
              </div>

              {selectedSegment && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                  onClick={() => {
                    setShowAudienceModal(false)
                    openQuickCampaignForSegment(selectedSegment)
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                  Broadcast to Segment
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="relative my-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by client name, phone number, or email..."
              value={audienceSearch}
              onChange={(e) => setAudienceSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loadingCustomers ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                Calculating matching clients...
              </div>
            ) : filteredAudience.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No matching clients found for this segment yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b sticky top-0 text-slate-700">
                  <tr>
                    <th className="p-3 font-semibold">Client</th>
                    <th className="p-3 font-semibold">Phone / WhatsApp</th>
                    <th className="p-3 font-semibold">Total Spent</th>
                    <th className="p-3 font-semibold">Visits</th>
                    <th className="p-3 font-semibold">Last Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAudience.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-medium text-slate-900">{cust.name}</td>
                      <td className="p-3">
                        {cust.phone ? (
                          <a
                            href={`https://wa.me/91${cust.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {cust.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        ₹{cust.total_spent.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-slate-600">{cust.total_bookings}</td>
                      <td className="p-3 text-slate-500">{cust.last_booking_date || "Never"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <DialogFooter className="mt-4 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-slate-500">
              Total {filteredAudience.length} customer(s) displayed
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowAudienceModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CREATE CUSTOM SEGMENT */}
      <Dialog open={showCreateSegmentModal} onOpenChange={setShowCreateSegmentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              Create Custom Customer Segment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define a dynamic audience rule to automatically group clients for targeted marketing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Segment Name *</Label>
              <Input
                placeholder="e.g. VIP Festival Spenders"
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Targeting Criteria *</Label>
              <Select value={newSegmentCriteria} onValueChange={setNewSegmentCriteria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spend > 3000">Big Spenders (Total billing ₹3,000+)</SelectItem>
                  <SelectItem value="spend > 5000">Super VIPs (Total billing ₹5,000+)</SelectItem>
                  <SelectItem value="inactive > 45d">Lapse / Inactive (No visits in 45 days)</SelectItem>
                  <SelectItem value="inactive > 90d">At-Risk / Lost (No visits in 90 days)</SelectItem>
                  <SelectItem value="created < 30d">New Clients (Joined in last 30 days)</SelectItem>
                  <SelectItem value="visits >= 3">Frequent Loyalists (3+ Visits)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSegmentModal(false)} disabled={creatingSegment}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreateSegment}
              disabled={creatingSegment}
            >
              {creatingSegment ? "Creating..." : "Save Segment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: VIEW CAMPAIGN DETAILS */}
      <Dialog open={!!viewingCampaign} onOpenChange={() => setViewingCampaign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Campaign Details</DialogTitle>
          </DialogHeader>
          {viewingCampaign && (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Name:</span>
                <p className="text-sm font-bold text-slate-900">{viewingCampaign.name}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="text-slate-500">Channel:</span>
                  <p className="font-semibold uppercase">{viewingCampaign.type}</p>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>
                  <p className="font-semibold capitalize">{viewingCampaign.status}</p>
                </div>
                <div>
                  <span className="text-slate-500">Sent Count:</span>
                  <p className="font-semibold text-emerald-600">{viewingCampaign.sent_count || 0}</p>
                </div>
              </div>
              <div>
                <span className="text-slate-500">Message Text:</span>
                <div className="bg-slate-50 p-3 rounded border mt-1 text-slate-700 font-sans">
                  {viewingCampaign.message}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setViewingCampaign(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
