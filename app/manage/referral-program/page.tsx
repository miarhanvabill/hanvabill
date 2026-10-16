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
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Page Header */}
      <PageHeader
        title="Refer & Earn Program"
        subtitle="Turn clients into promoters with WhatsApp 1-click referrals for first-time visitors"
        showBackButton={true}
        backHref="/manage"
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllData}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        }
      />

      {/* Program Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
          settings.is_active
            ? "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
            : "bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              settings.is_active
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-300 dark:shadow-none"
                : "bg-amber-500 text-white shadow-sm shadow-amber-300 dark:shadow-none"
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                Program Status: {settings.is_active ? "Active & Rewarding" : "Program Paused"}
              </h2>
              <Badge
                className={
                  settings.is_active
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200"
                    : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200"
                }
              >
                {settings.is_active ? "Live" : "Paused"}
              </Badge>
              <Badge variant="outline" className="text-xs bg-white/70 dark:bg-black/30 border-gray-300">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" /> Strictly 1st-Time Visitors
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {settings.is_active
                ? `Friends get ₹${settings.referee_discount_amount} OFF on their 1st visit (min bill ₹${settings.minimum_order_amount}). Referrers get ₹${settings.referrer_reward_amount} in salon wallet!`
                : "Referral links are temporarily paused. Existing clients will not earn rewards until re-enabled."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Label htmlFor="program-active-toggle" className="text-sm font-medium cursor-pointer">
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
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Referrals Shared
            </CardTitle>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? "..." : stats.total_referrals.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>Unique referral links & codes generated</span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              First-Time Clients Acquired
            </CardTitle>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {isLoading ? "..." : stats.successful_referrals.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {conversionRate}%
              </span>
              <span>visit completion conversion</span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Referral Revenue Generated
            </CardTitle>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? "..." : `₹${stats.total_revenue.toLocaleString("en-IN")}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>From first visits meeting min spend</span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rewards Paid
            </CardTitle>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              {isLoading ? "..." : `₹${stats.rewards_disbursed.toLocaleString("en-IN")}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>Credited to promoters&#39; salon wallets</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md bg-muted/60 p-1">
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    How First-Time Referrals Work
                  </CardTitle>
                  <CardDescription>
                    Engineered to attract high-paying new clients while protecting against fraud.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 font-bold flex items-center justify-center mb-3">
                        1
                      </div>
                      <h4 className="font-semibold text-sm mb-1">1-Click WhatsApp Share</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Clients get their personalized referral link on booking confirmation, invoices, and customer portal.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-bold flex items-center justify-center mb-3">
                        2
                      </div>
                      <h4 className="font-semibold text-sm mb-1">First-Time Gift Applied</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Friends get ₹{settings.referee_discount_amount} OFF on their very first visit when their bill meets the min ₹{settings.minimum_order_amount} requirement.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-bold flex items-center justify-center mb-3">
                        3
                      </div>
                      <h4 className="font-semibold text-sm mb-1">Instant Promoter Reward</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        As soon as the friend completes checkout, ₹{settings.referrer_reward_amount} is credited to the promoter&#39;s wallet + WhatsApp alert sent!
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 rounded-lg flex items-start gap-3 text-xs text-blue-900 dark:text-blue-300">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Strict First-Time Verification Active:</strong> Repeat visitors, existing phone numbers with previous visits, or orders below ₹{settings.minimum_order_amount} are automatically tagged as &#34;Ineligible&#34; and will not disburse rewards.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Promotion Tools</CardTitle>
                  <CardDescription>
                    Test the client experience or jump straight to history.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("settings")}
                    className="gap-2 text-xs sm:text-sm"
                  >
                    Customize WhatsApp Message
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("history")}
                    className="gap-2 text-xs sm:text-sm"
                  >
                    View All {records.length} Referral Records
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Col: WhatsApp Live Preview */}
            <div className="space-y-4">
              <Card className="overflow-hidden border shadow-sm">
                <CardHeader className="bg-emerald-700 text-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-white">
                        WhatsApp Share Preview
                      </CardTitle>
                      <CardDescription className="text-emerald-100 text-xs">
                        What friends receive when invited
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 bg-[#EFEAE2] dark:bg-zinc-900 min-h-[260px] flex flex-col justify-center">
                  <div className="bg-[#DCF8C6] dark:bg-emerald-950/80 text-zinc-900 dark:text-zinc-100 p-4 rounded-2xl rounded-tl-none shadow-sm text-xs sm:text-sm leading-relaxed border border-emerald-200/50 dark:border-emerald-800 relative max-w-[95%]">
                    <p className="whitespace-pre-wrap">{previewWhatsAppMessage}</p>
                    <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Program Reward Rules</CardTitle>
                  <CardDescription>
                    Define reward amounts, minimum spend threshold, and promotional validity.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Program Active</Label>
                      <p className="text-xs text-muted-foreground">
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
                    <div className="space-y-2 p-4 rounded-xl border bg-card">
                      <Label htmlFor="referrer_reward" className="text-sm font-semibold flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-purple-600" />
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
                          className="pl-7 font-bold text-base"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Credited to referrer&#39;s salon wallet upon friend&#39;s completed first visit.
                      </p>
                    </div>

                    {/* Friend Discount Amount */}
                    <div className="space-y-2 p-4 rounded-xl border bg-card">
                      <Label htmlFor="referee_discount" className="text-sm font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
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
                          className="pl-7 font-bold text-base"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Instant discount on friend&#39;s first booking or invoice.
                      </p>
                    </div>

                    {/* Minimum Order Amount */}
                    <div className="space-y-2 p-4 rounded-xl border bg-card">
                      <Label htmlFor="min_order" className="text-sm font-semibold flex items-center gap-1.5">
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
                          className="pl-7 font-bold text-base"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Friend&#39;s bill must equal or exceed this amount to qualify for referral reward.
                      </p>
                    </div>

                    {/* Expiry Validity (Days) */}
                    <div className="space-y-2 p-4 rounded-xl border bg-card">
                      <Label htmlFor="validity_days" className="text-sm font-semibold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
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
                        className="font-bold text-base"
                      />
                      <div className="flex items-center gap-1.5 mt-2">
                        {VALIDITY_PRESETS.map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setSettings({ ...settings, validity_days: days })}
                            className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                              settings.validity_days === days
                                ? "bg-black text-white dark:bg-white dark:text-black font-semibold border-transparent"
                                : "bg-muted/50 hover:bg-muted text-muted-foreground"
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
                      <Label htmlFor="share_template" className="text-sm font-semibold">
                        WhatsApp Share Message Template
                      </Label>
                      <span className="text-xs text-muted-foreground">Click variable to insert</span>
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
                          className="text-xs px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800 transition-colors font-mono"
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
                      className="font-sans leading-relaxed text-sm resize-none"
                      placeholder="Write the message that clients will share with friends on WhatsApp..."
                    />
                    <p className="text-xs text-muted-foreground">
                      This pre-fills the message when a client taps &#34;Share on WhatsApp&#34; on invoices or the booking site.
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                    >
                      {isSaving ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Live WhatsApp Preview */}
            <div className="space-y-4">
              <Card className="overflow-hidden border shadow-sm sticky top-6">
                <CardHeader className="bg-emerald-700 text-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-white">
                        Live Preview
                      </CardTitle>
                      <CardDescription className="text-emerald-100 text-xs">
                        Instant preview of customized message
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 bg-[#EFEAE2] dark:bg-zinc-900 min-h-[300px] flex flex-col justify-center">
                  <div className="bg-[#DCF8C6] dark:bg-emerald-950/80 text-zinc-900 dark:text-zinc-100 p-4 rounded-2xl rounded-tl-none shadow-sm text-xs sm:text-sm leading-relaxed border border-emerald-200/50 dark:border-emerald-800 relative">
                    <p className="whitespace-pre-wrap">{previewWhatsAppMessage}</p>
                    <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
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
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Referral History</CardTitle>
                  <CardDescription>
                    Track all invites, visit completions, and reward disbursements.
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Search referrer, friend, code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 text-xs sm:text-sm h-9"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                    {(["all", "completed", "pending", "ineligible"] as const).map((filterKey) => (
                      <button
                        key={filterKey}
                        onClick={() => setStatusFilter(filterKey)}
                        className={`text-xs px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                          statusFilter === filterKey
                            ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
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
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                    No referral records found
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {searchTerm || statusFilter !== "all"
                      ? "No referrals match your current search or status filter."
                      : "When clients share their referral links and friends book appointments, records will appear here in real-time."}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold">Referrer</TableHead>
                        <TableHead className="font-semibold">Friend (First-Timer)</TableHead>
                        <TableHead className="font-semibold">Referral Code</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">Bill & Reward</TableHead>
                        <TableHead className="font-semibold text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((rec) => {
                        return (
                          <TableRow key={rec.id} className="hover:bg-muted/30">
                            {/* Referrer */}
                            <TableCell>
                              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {rec.referrer_name || "Unknown Referrer"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {rec.referrer_phone || "—"}
                              </div>
                            </TableCell>

                            {/* Friend */}
                            <TableCell>
                              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {rec.referee_name || "New Visitor"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {rec.referee_phone || "—"}
                              </div>
                            </TableCell>

                            {/* Code */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted">
                                  {rec.referral_code}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleCopyCode(rec.referral_code)}
                                  title="Copy Code"
                                >
                                  {copiedCode === rec.referral_code ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              {rec.status === "completed" && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5 w-fit">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  First Visit Completed
                                </Badge>
                              )}
                              {rec.status === "pending" && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1.5 w-fit">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pending Visit
                                </Badge>
                              )}
                              {rec.status === "ineligible" && (
                                <Badge
                                  variant="secondary"
                                  className="bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 flex items-center gap-1.5 w-fit"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-gray-500" />
                                  Repeat Client / Under Min Spend
                                </Badge>
                              )}
                            </TableCell>

                            {/* Bill Amount & Reward Paid */}
                            <TableCell className="text-right">
                              <div className="text-sm font-semibold">
                                {Number(rec.order_amount) > 0
                                  ? `₹${Number(rec.order_amount).toLocaleString("en-IN")}`
                                  : "—"}
                              </div>
                              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                {Number(rec.reward_amount) > 0
                                  ? `+₹${Number(rec.reward_amount)} reward paid`
                                  : "₹0 reward"}
                              </div>
                            </TableCell>

                            {/* Date */}
                            <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
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
  )
}
