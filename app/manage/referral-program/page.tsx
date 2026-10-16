"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import {
  Users,
  UserCheck,
  IndianRupee,
  Gift,
  Share2,
  Copy,
  Check,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  ExternalLink,
} from "lucide-react"
import {
  getReferralSettings,
  updateReferralSettings,
  getReferralStats,
  getReferralRecords,
  ReferralSettings,
  ReferralStats,
  ReferralRecord,
} from "@/app/actions/referrals"

const VALIDITY_PRESETS = [30, 45, 60, 90]

export default function ReferralProgramPage() {
  const [settings, setSettings] = useState<ReferralSettings>({
    is_active: true,
    referrer_reward_type: "wallet",
    referrer_reward_amount: 250,
    referee_discount_type: "fixed",
    referee_discount_amount: 250,
    minimum_order_amount: 700,
    validity_days: 45,
    share_message_template:
      "Hey! 🌸 I love my salon {salon_name}. Use my link to get ₹{discount} off your first visit (Min bill ₹{min_order}): {link}",
    first_time_only: true,
    salon_name: "Hanva Salon",
  })

  const [stats, setStats] = useState<ReferralStats>({
    total_referrals: 0,
    successful_referrals: 0,
    total_revenue: 0,
    rewards_disbursed: 0,
  })

  const [records, setRecords] = useState<ReferralRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending" | "ineligible">("all")
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "history">("overview")

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      const [settingsData, statsData, recordsData] = await Promise.all([
        getReferralSettings(),
        getReferralStats(),
        getReferralRecords({ limit: 100 }),
      ])

      if (settingsData) setSettings(settingsData)
      if (statsData) setStats(statsData)
      if (recordsData?.records) setRecords(recordsData.records)
    } catch (error) {
      console.error("Failed to load referral program data:", error)
      toast({
        title: "Error",
        description: "Failed to load referral program data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const result = await updateReferralSettings(settings)
      if (result?.success) {
        toast({
          title: "Settings Saved",
          description: "Referral program settings have been updated successfully.",
        })
      } else {
        throw new Error("Failed to update settings")
      }
    } catch (error: any) {
      console.error("Failed to save referral settings:", error)
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyCode = (code: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
      toast({
        title: "Copied!",
        description: `Referral code ${code} copied to clipboard`,
      })
    }
  }

  const insertVariableIntoTemplate = (variableToken: string) => {
    setSettings((prev) => ({
      ...prev,
      share_message_template: `${prev.share_message_template} ${variableToken}`,
    }))
  }

  // Filtered referral records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const matchesStatus = statusFilter === "all" || rec.status === statusFilter
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        rec.referrer_name?.toLowerCase().includes(searchLower) ||
        rec.referrer_phone?.includes(searchTerm) ||
        rec.referee_name?.toLowerCase().includes(searchLower) ||
        rec.referee_phone?.includes(searchTerm) ||
        rec.referral_code?.toLowerCase().includes(searchLower)

      return matchesStatus && matchesSearch
    })
  }, [records, statusFilter, searchTerm])

  // Conversion rate computation
  const conversionRate = useMemo(() => {
    if (!stats.total_referrals || stats.total_referrals === 0) return 0
    return ((stats.successful_referrals / stats.total_referrals) * 100).toFixed(1)
  }, [stats])

  // Real-time WhatsApp preview content
  const previewWhatsAppMessage = useMemo(() => {
    let msg = settings.share_message_template || ""
    const salon = settings.salon_name || "Hanva Salon"
    const discount = `₹${settings.referee_discount_amount || 250}`
    const minOrder = `₹${settings.minimum_order_amount || 700}`
    const link = `https://biz.hanva.in/book/salon?ref=REF0123`

    msg = msg.replace(/{salon_name}|{{salon_name}}|{{business_name}}/g, salon)
    msg = msg.replace(/{discount}|{{discount}}/g, discount)
    msg = msg.replace(/{min_order}|{{min_order}}/g, minOrder)
    msg = msg.replace(/{link}|{{link}}|{{booking_url}}/g, link)

    return msg
  }, [settings])

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-screen">
      <div className="px-6 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Refer & Earn Program"
          subtitle="Turn clients into promoters with WhatsApp 1-click referrals for first-time visitors"
          showBackButton={true}
          backHref="/manage"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={isLoading}
            className="gap-2 bg-white border-gray-200"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm gap-2 font-medium"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      <main className="flex-1 px-6 pb-6 pt-2">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Retention Module Sub-Navigation */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
            <Link
              href="/manage/referral-program"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white shadow-sm flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Refer & Earn Program</span>
            </Link>
            <Link
              href="/manage/loyalty"
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Loyalty Settings & Tiers
            </Link>
            <Link
              href="/manage/loyalty-transactions"
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Loyalty Transactions
            </Link>
            <Link
              href="/manage/wallet"
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Customer Wallets
            </Link>
          </div>

          {/* Program Status Banner */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  settings.is_active ? "bg-violet-50 text-violet-600" : "bg-gray-100 text-gray-500"
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-gray-900 text-base">
                    Program Status: {settings.is_active ? "Active & Rewarding" : "Program Paused"}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      settings.is_active
                        ? "bg-violet-50 text-violet-700 border border-violet-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {settings.is_active ? "Live" : "Paused"}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-violet-600" /> Strictly 1st-Time Visitors
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {settings.is_active
                    ? `Friends get ₹${settings.referee_discount_amount} OFF on their 1st visit (min bill ₹${settings.minimum_order_amount}). Referrers get ₹${settings.referrer_reward_amount} in salon wallet!`
                    : "Referral links are temporarily paused. Existing clients will not earn rewards until re-enabled."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <Label htmlFor="program-active-toggle" className="text-sm font-medium text-gray-700 cursor-pointer">
                {settings.is_active ? "Active" : "Paused"}
              </Label>
              <Switch
                id="program-active-toggle"
                checked={settings.is_active}
                onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
              />
            </div>
          </div>

          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-white rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Total Referrals Shared
                    </p>
                    <p className="text-2xl font-bold text-gray-900 truncate">
                      {isLoading ? "..." : stats.total_referrals.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Unique referral links & codes
                    </p>
                  </div>
                  <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                    <Share2 className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2 */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-white rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      First-Time Clients Acquired
                    </p>
                    <p className="text-2xl font-bold text-gray-900 truncate">
                      {isLoading ? "..." : stats.successful_referrals.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <span className="font-semibold text-gray-700">{conversionRate}%</span> conversion rate
                    </p>
                  </div>
                  <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                    <UserCheck className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3 */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-white rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Referral Revenue Generated
                    </p>
                    <p className="text-2xl font-bold text-gray-900 truncate">
                      {isLoading ? "..." : `₹${stats.total_revenue.toLocaleString("en-IN")}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      From first visits meeting min spend
                    </p>
                  </div>
                  <div className="w-11 h-11 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 4 */}
            <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-white rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Total Rewards Paid
                    </p>
                    <p className="text-2xl font-bold text-gray-900 truncate">
                      {isLoading ? "..." : `₹${stats.rewards_disbursed.toLocaleString("en-IN")}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Credited to promoters&#39; salon wallets
                    </p>
                  </div>
                  <div className="w-11 h-11 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                    <Gift className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
            <TabsList className="grid grid-cols-3 max-w-md bg-white border border-gray-200/80 p-1 rounded-xl shadow-2xs">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm">
                Settings & Rewards
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm">
                Referral History ({records.length})
              </TabsTrigger>
            </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: How It Works & Program Health */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-gray-100 shadow-sm bg-white rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                    How First-Time Referrals Work
                  </CardTitle>
                  <CardDescription>
                    Engineered to attract high-paying new clients while protecting against fraud.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-violet-50 text-violet-700 font-bold flex items-center justify-center mb-3">
                        1
                      </div>
                      <h4 className="font-semibold text-sm mb-1 text-gray-900">1-Click WhatsApp Share</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Clients get their personalized referral link on booking confirmation, invoices, and customer portal.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center mb-3">
                        2
                      </div>
                      <h4 className="font-semibold text-sm mb-1 text-gray-900">First-Time Gift Applied</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Friends get ₹{settings.referee_discount_amount} OFF on their very first visit when their bill meets the min ₹{settings.minimum_order_amount} requirement.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 font-bold flex items-center justify-center mb-3">
                        3
                      </div>
                      <h4 className="font-semibold text-sm mb-1 text-gray-900">Instant Promoter Reward</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        As soon as the friend completes checkout, ₹{settings.referrer_reward_amount} is credited to the promoter&#39;s wallet + WhatsApp alert sent!
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-3 text-xs text-gray-700">
                    <ShieldCheck className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Strict First-Time Verification Active:</strong> Repeat visitors, existing phone numbers with previous visits, or orders below ₹{settings.minimum_order_amount} are automatically tagged as &#34;Ineligible&#34; and will not disburse rewards.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card className="border border-gray-100 shadow-sm bg-white rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base text-gray-900">Quick Promotion Tools</CardTitle>
                  <CardDescription>
                    Test the client experience or jump straight to history.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("settings")}
                    className="gap-2 text-xs sm:text-sm bg-white border-gray-200 hover:bg-gray-50"
                  >
                    Customize WhatsApp Message
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("history")}
                    className="gap-2 text-xs sm:text-sm bg-white border-gray-200 hover:bg-gray-50"
                  >
                    View All {records.length} Referral Records
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Col: WhatsApp Live Preview */}
            <div className="space-y-4">
              <Card className="overflow-hidden border border-gray-100 shadow-sm bg-white rounded-xl">
                <CardHeader className="bg-slate-900 text-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-white">
                        WhatsApp Share Preview
                      </CardTitle>
                      <CardDescription className="text-slate-300 text-xs">
                        What friends receive when invited
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 bg-[#EFEAE2] min-h-[260px] flex flex-col justify-center">
                  <div className="bg-[#DCF8C6] text-zinc-900 p-4 rounded-2xl rounded-tl-none shadow-sm text-xs sm:text-sm leading-relaxed border border-[#cbebb5] relative max-w-[95%]">
                    <p className="whitespace-pre-wrap">{previewWhatsAppMessage}</p>
                    <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-zinc-500">
                      <span>10:42 AM</span>
                      <span className="text-blue-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Settings & Rewards */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-gray-100 shadow-sm bg-white rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900">Program Reward Rules</CardTitle>
                  <CardDescription>
                    Define reward amounts, minimum spend threshold, and promotional validity.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-gray-900">Program Active</Label>
                      <p className="text-xs text-gray-500">
                        When enabled, clients can share referral links and earn rewards.
                      </p>
                    </div>
                    <Switch
                      checked={settings.is_active}
                      onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
                    />
                  </div>

                  {/* Rewards Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Referrer Reward Amount */}
                    <div className="space-y-2 p-4 rounded-xl border border-gray-100 bg-white">
                      <Label htmlFor="referrer_reward" className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-violet-600" />
                        Referrer Reward Amount (₹)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                        <Input
                          id="referrer_reward"
                          type="number"
                          min="0"
                          step="10"
                          value={settings.referrer_reward_amount}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              referrer_reward_amount: Number(e.target.value) || 0,
                            })
                          }
                          className="pl-7 font-bold text-base border-gray-200"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Credited to referrer&#39;s salon wallet upon friend&#39;s completed first visit.
                      </p>
                    </div>

                    {/* Friend Discount Amount */}
                    <div className="space-y-2 p-4 rounded-xl border border-gray-100 bg-white">
                      <Label htmlFor="referee_discount" className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-violet-600" />
                        Friend Discount Amount (₹)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                        <Input
                          id="referee_discount"
                          type="number"
                          min="0"
                          step="10"
                          value={settings.referee_discount_amount}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              referee_discount_amount: Number(e.target.value) || 0,
                            })
                          }
                          className="pl-7 font-bold text-base border-gray-200"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Instant discount on friend&#39;s first booking or invoice.
                      </p>
                    </div>

                    {/* Minimum Order Amount */}
                    <div className="space-y-2 p-4 rounded-xl border border-gray-100 bg-white">
                      <Label htmlFor="min_order" className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <IndianRupee className="w-4 h-4 text-blue-600" />
                        Minimum Order Amount (₹)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                        <Input
                          id="min_order"
                          type="number"
                          min="0"
                          step="50"
                          value={settings.minimum_order_amount}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              minimum_order_amount: Number(e.target.value) || 0,
                            })
                          }
                          className="pl-7 font-bold text-base border-gray-200"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Friend&#39;s bill must equal or exceed this amount to qualify for referral reward.
                      </p>
                    </div>

                    {/* Expiry Validity (Days) */}
                    <div className="space-y-2 p-4 rounded-xl border border-gray-100 bg-white">
                      <Label htmlFor="validity_days" className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-500" />
                        Validity (Days)
                      </Label>
                      <Input
                        id="validity_days"
                        type="number"
                        min="7"
                        max="365"
                        value={settings.validity_days}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            validity_days: Number(e.target.value) || 30,
                          })
                        }
                        className="font-bold text-base border-gray-200"
                      />
                      <div className="flex items-center gap-1.5 mt-2">
                        {VALIDITY_PRESETS.map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setSettings({ ...settings, validity_days: days })}
                            className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                              settings.validity_days === days
                                ? "bg-violet-600 text-white font-semibold border-violet-600"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
                            }`}
                          >
                            {days}d
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Share Message Customizer */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="share_template" className="text-sm font-semibold text-gray-800">
                        WhatsApp Share Message Template
                      </Label>
                      <span className="text-xs text-gray-500">Click variable to insert</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "{salon_name}", desc: "Salon Name" },
                        { label: "{discount}", desc: "Discount Amount" },
                        { label: "{min_order}", desc: "Min Bill" },
                        { label: "{link}", desc: "Referral Booking Link" },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => insertVariableIntoTemplate(item.label)}
                          className="text-xs px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-md border border-violet-200 transition-colors font-mono font-medium"
                          title={item.desc}
                        >
                          + {item.label}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      id="share_template"
                      rows={4}
                      value={settings.share_message_template}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          share_message_template: e.target.value,
                        })
                      }
                      className="font-sans leading-relaxed text-sm resize-none border-gray-200"
                      placeholder="Write the message that clients will share with friends on WhatsApp..."
                    />
                    <p className="text-xs text-gray-500">
                      This pre-fills the message when a client taps &#34;Share on WhatsApp&#34; on invoices or the booking site.
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="bg-violet-600 hover:bg-violet-700 text-white min-w-[140px] shadow-sm font-medium"
                    >
                      {isSaving ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Live WhatsApp Preview */}
            <div className="space-y-4">
              <Card className="overflow-hidden border border-gray-100 shadow-sm bg-white rounded-xl sticky top-6">
                <CardHeader className="bg-slate-900 text-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-white">
                        Live Preview
                      </CardTitle>
                      <CardDescription className="text-slate-300 text-xs">
                        Instant preview of customized message
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 bg-[#EFEAE2] min-h-[300px] flex flex-col justify-center">
                  <div className="bg-[#DCF8C6] text-zinc-900 p-4 rounded-2xl rounded-tl-none shadow-sm text-xs sm:text-sm leading-relaxed border border-[#cbebb5] relative">
                    <p className="whitespace-pre-wrap">{previewWhatsAppMessage}</p>
                    <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-zinc-500">
                      <span>10:42 AM</span>
                      <span className="text-blue-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Referral History Table */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border border-gray-100 shadow-sm bg-white rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg text-gray-900">Referral History</CardTitle>
                  <CardDescription>
                    Track all invites, visit completions, and reward disbursements.
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <Input
                      placeholder="Search referrer, friend, code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 text-xs sm:text-sm h-9 border-gray-200"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    {(["all", "completed", "pending", "ineligible"] as const).map((filterKey) => (
                      <button
                        key={filterKey}
                        onClick={() => setStatusFilter(filterKey)}
                        className={`text-xs px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                          statusFilter === filterKey
                            ? "bg-white text-gray-900 shadow-xs"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {filterKey}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecords.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    No referral records found
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    {searchTerm || statusFilter !== "all"
                      ? "No referrals match your current search or status filter."
                      : "When clients share their referral links and friends book appointments, records will appear here in real-time."}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-100 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50/75">
                      <TableRow>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-500">Referrer</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-500">Friend (First-Timer)</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-500">Referral Code</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-500">Status</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-500 text-right">Bill & Reward</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-500 text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((rec) => {
                        return (
                          <TableRow key={rec.id} className="hover:bg-gray-50/50">
                            {/* Referrer */}
                            <TableCell>
                              <div className="font-medium text-sm text-gray-900">
                                {rec.referrer_name || "Unknown Referrer"}
                              </div>
                              <div className="text-xs text-gray-400">
                                {rec.referrer_phone || "—"}
                              </div>
                            </TableCell>

                            {/* Friend */}
                            <TableCell>
                              <div className="font-medium text-sm text-gray-900">
                                {rec.referee_name || "New Visitor"}
                              </div>
                              <div className="text-xs text-gray-400">
                                {rec.referee_phone || "—"}
                              </div>
                            </TableCell>

                            {/* Code */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                                  {rec.referral_code}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-gray-400 hover:text-gray-700"
                                  onClick={() => handleCopyCode(rec.referral_code)}
                                  title="Copy Code"
                                >
                                  {copiedCode === rec.referral_code ? (
                                    <Check className="w-3.5 h-3.5 text-violet-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              {rec.status === "completed" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  First Visit Completed
                                </span>
                              )}
                              {rec.status === "pending" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pending Visit
                                </span>
                              )}
                              {rec.status === "ineligible" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                  <XCircle className="w-3.5 h-3.5 text-gray-400" />
                                  Repeat Client / Under Min Spend
                                </span>
                              )}
                            </TableCell>

                            {/* Bill Amount & Reward Paid */}
                            <TableCell className="text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                {Number(rec.order_amount) > 0
                                  ? `₹${Number(rec.order_amount).toLocaleString("en-IN")}`
                                  : "—"}
                              </div>
                              <div className="text-xs text-violet-600 font-medium">
                                {Number(rec.reward_amount) > 0
                                  ? `+₹${Number(rec.reward_amount)} reward paid`
                                  : "₹0 reward"}
                              </div>
                            </TableCell>

                            {/* Date */}
                            <TableCell className="text-right text-xs text-gray-400 whitespace-nowrap">
                              {rec.created_at
                                ? new Date(rec.created_at).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </main>
    </div>
  )
}
