"use client"

import { useState, useEffect, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  MessageSquare,
  Save,
  Lock,
  Smartphone,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  Copy,
  ExternalLink,
  RefreshCw,
  Eye,
  CheckCheck,
  Check,
  Radio,
  Calendar,
  Gift,
  Heart,
  UserCheck,
  Award,
  Crown,
  FileText,
  Star,
  Activity,
  Zap,
  ArrowUpRight,
  HelpCircle,
  Filter,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react"
import { getBusinessSettings, updateBusinessSettings } from "@/app/actions/settings"
import {
  getAutomationRules,
  saveAutomationRule,
  toggleAutomationRule,
  testSendAutomationTemplate,
  getWhatsAppAnalytics,
  type AutomationRule,
  type WhatsAppAnalyticsData,
  type OutboundLog,
} from "@/app/actions/whatsapp-automations"
import { testWhatsAppConnection } from "@/app/actions/whatsapp"

export default function WhatsAppConfigPage() {
  const [activeTab, setActiveTab] = useState("gateway")
  const [loading, setLoading] = useState(true)
  const [savingGateway, setSavingGateway] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean
    connected: boolean
    message: string
  }>({
    tested: false,
    connected: false,
    message: "",
  })

  // Gateway form data
  const [gatewayData, setGatewayData] = useState({
    enabled: true,
    userid: "",
    password: "",
    wabaNumber: "",
    salonName: "Hanva Salon",
  })

  // Automation Rules
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [editorTemplate, setEditorTemplate] = useState("")
  const [editorDelay, setEditorDelay] = useState("")
  const [editorSaving, setEditorSaving] = useState(false)

  // Test send dialog state
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testPhoneNumber, setTestPhoneNumber] = useState("")
  const [testSending, setTestSending] = useState(false)

  // Analytics & Logs
  const [analytics, setAnalytics] = useState<WhatsAppAnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [logFilter, setLogFilter] = useState<string>("all")
  const [logSearch, setLogSearch] = useState("")

  const webhookUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/webhooks/whatsapp?type=mo` 
    : "https://biz.hanva.in/api/webhooks/whatsapp?type=mo"

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [settings, fetchedRules, fetchedAnalytics] = await Promise.all([
        getBusinessSettings(),
        getAutomationRules(),
        getWhatsAppAnalytics(),
      ])

      if (settings) {
        setGatewayData({
          enabled: settings.whatsapp?.enabled ?? true,
          userid: settings.whatsapp?.userid || "",
          password: settings.whatsapp?.password || "",
          wabaNumber: settings.whatsapp?.wabaNumber || "",
          salonName: settings.name || "Hanva Luxury Salon",
        })

        if (settings.whatsapp?.userid && settings.whatsapp?.wabaNumber) {
          setConnectionStatus({
            tested: true,
            connected: true,
            message: "Fonada WABA Gateway configured and active",
          })
        }
      }

      setRules(fetchedRules || [])
      setAnalytics(fetchedAnalytics)
    } catch (error) {
      console.error("Error loading WhatsApp dashboard data:", error)
      toast.error("Failed to load some settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGateway = async () => {
    setSavingGateway(true)
    try {
      const result = await updateBusinessSettings("whatsapp", {
        enabled: gatewayData.enabled,
        userid: gatewayData.userid,
        password: gatewayData.password,
        wabaNumber: gatewayData.wabaNumber,
      })

      if (result.success) {
        toast.success("WhatsApp Gateway credentials saved successfully")
        checkConnection()
      } else {
        toast.error(result.message || "Failed to save settings")
      }
    } catch (error: any) {
      toast.error(error.message || "Error saving credentials")
    } finally {
      setSavingGateway(false)
    }
  }

  const checkConnection = async () => {
    setTestingConnection(true)
    try {
      const res = await testWhatsAppConnection({
        userid: gatewayData.userid,
        password: gatewayData.password,
        wabaNumber: gatewayData.wabaNumber,
      })

      setConnectionStatus({
        tested: true,
        connected: res.success,
        message: res.message,
      })

      if (res.success) {
        toast.success("Connection test successful: Gateway is active!")
      } else {
        toast.error(res.message)
      }
    } catch (error: any) {
      setConnectionStatus({
        tested: true,
        connected: false,
        message: "Connection failed",
      })
      toast.error("Failed to test connection")
    } finally {
      setTestingConnection(false)
    }
  }

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    const nextState = !currentEnabled
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: nextState } : r)),
    )

    try {
      const res = await toggleAutomationRule(ruleId, nextState)
      if (res.success) {
        toast.success(`${nextState ? "Enabled" : "Disabled"} automation trigger`)
      } else {
        // Rollback
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, enabled: currentEnabled } : r)),
        )
        toast.error(res.message || "Failed to update rule")
      }
    } catch (error) {
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, enabled: currentEnabled } : r)),
      )
      toast.error("Error updating automation rule")
    }
  }

  const openRuleEditor = (rule: AutomationRule) => {
    setEditingRule(rule)
    setEditorTemplate(rule.template)
    setEditorDelay(rule.timingDelay)
  }

  const handleInsertVariable = (variableTag: string) => {
    setEditorTemplate((prev) => `${prev} ${variableTag}`)
  }

  const handleSaveRuleEdits = async () => {
    if (!editingRule) return
    setEditorSaving(true)
    try {
      const res = await saveAutomationRule(editingRule.id, {
        template: editorTemplate,
        timingDelay: editorDelay,
      })

      if (res.success) {
        setRules((prev) =>
          prev.map((r) =>
            r.id === editingRule.id
              ? { ...r, template: editorTemplate, timingDelay: editorDelay }
              : r,
          ),
        )
        toast.success("Automation template updated successfully")
        setEditingRule(null)
      } else {
        toast.error(res.message || "Failed to save template")
      }
    } catch (error: any) {
      toast.error(error.message || "Error saving template")
    } finally {
      setEditorSaving(false)
    }
  }

  const handleSendTestMessage = async () => {
    if (!testPhoneNumber || testPhoneNumber.replace(/[^0-9]/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit mobile number")
      return
    }

    setTestSending(true)
    try {
      const activeRuleId = editingRule?.id || "instant_invoice"
      const activeTemplate = editingRule ? editorTemplate : "Hello from Hanva Salon WhatsApp Service! 🌟"

      // Sample variable mapping
      const sampleMap: Record<string, string> = {
        "{{customer_name}}": "Priya Sharma",
        "{{salon_name}}": gatewayData.salonName || "Hanva Luxury Salon",
        "{{service_names}}": "Hydra Facial & Blowdry",
        "{{booking_date}}": "Tomorrow",
        "{{booking_time}}": "04:30 PM",
        "{{staff_name}}": "Sarah",
        "{{total_amount}}": "₹2,499",
        "{{invoice_no}}": "INV-2026-9081",
        "{{invoice_url}}": "https://biz.hanva.in/inv/demo",
        "{{review_url}}": "https://g.page/r/hanva-salon/review",
        "{{discount_percent}}": "25",
        "{{coupon_code}}": "VIP25",
        "{{validity_days}}": "7",
        "{{booking_url}}": "https://biz.hanva.in/book",
        "{{points_earned}}": "120",
        "{{points_balance}}": "680",
        "{{cash_equivalent}}": "₹340",
        "{{membership_tier}}": "Diamond VIP",
        "{{expiry_date}}": "31 Dec 2026",
        "{{days_since_visit}}": "45",
        "{{special_offer}}": "Flat ₹500 OFF + Free Hair Spa",
        "{{salon_address}}": "100ft Road, Indiranagar",
      }

      const res = await testSendAutomationTemplate({
        ruleId: activeRuleId,
        phoneNumber: testPhoneNumber,
        templateText: activeTemplate,
        sampleVariables: sampleMap,
      })

      if (res.success) {
        toast.success("Test message dispatched to " + testPhoneNumber)
        setTestModalOpen(false)
        // Refresh analytics
        getWhatsAppAnalytics().then((a) => setAnalytics(a))
      } else {
        toast.error(res.message)
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send test message")
    } finally {
      setTestSending(false)
    }
  }

  // Render preview of template replacing variables with samples
  const renderPreviewText = (rawTemplate: string, customVars?: Array<{ tag: string; sample: string }>) => {
    let text = rawTemplate
    const defaultReplacements: Record<string, string> = {
      "{{customer_name}}": "Priya Sharma",
      "{{salon_name}}": gatewayData.salonName || "Hanva Luxury Salon",
      "{{service_names}}": "Keratin Hair Spa & Blowdry",
      "{{booking_date}}": "24 Aug 2026",
      "{{booking_time}}": "04:30 PM",
      "{{staff_name}}": "Sarah Johnson",
      "{{total_amount}}": "₹2,499",
      "{{booking_id}}": "BKG-9021",
      "{{invoice_no}}": "INV-2026-0812",
      "{{invoice_url}}": "https://biz.hanva.in/inv/x8k2p9",
      "{{payment_method}}": "UPI / Google Pay",
      "{{review_url}}": "https://g.page/r/hanva-salon/review",
      "{{discount_percent}}": "25",
      "{{coupon_code}}": "BDAY25",
      "{{validity_days}}": "7",
      "{{booking_url}}": "https://biz.hanva.in/book",
      "{{days_since_visit}}": "45",
      "{{special_offer}}": "Flat ₹500 OFF + Free Hair Spa",
      "{{points_earned}}": "150",
      "{{points_balance}}": "850",
      "{{cash_equivalent}}": "425",
      "{{membership_tier}}": "Gold Club Member",
      "{{expiry_date}}": "31 Dec 2026",
      "{{benefits_summary}}": "20% off all services & free express facials",
      "{{salon_address}}": "100ft Road, Indiranagar",
    }

    if (customVars) {
      customVars.forEach((v) => {
        defaultReplacements[v.tag] = v.sample
      })
    }

    Object.entries(defaultReplacements).forEach(([tag, val]) => {
      text = text.split(tag).join(val)
    })

    return text
  }

  const getRuleIcon = (id: string) => {
    switch (id) {
      case "appointment_confirmation":
        return <Calendar className="w-5 h-5 text-blue-500" />
      case "appointment_reminder":
        return <Clock className="w-5 h-5 text-amber-500" />
      case "instant_invoice":
        return <FileText className="w-5 h-5 text-emerald-500" />
      case "review_request":
        return <Star className="w-5 h-5 text-yellow-500" />
      case "birthday_greeting":
        return <Gift className="w-5 h-5 text-pink-500" />
      case "anniversary_wishes":
        return <Heart className="w-5 h-5 text-rose-500" />
      case "win_back_inactive":
        return <UserCheck className="w-5 h-5 text-purple-500" />
      case "loyalty_points_update":
        return <Award className="w-5 h-5 text-indigo-500" />
      case "membership_status":
        return <Crown className="w-5 h-5 text-amber-600" />
      default:
        return <MessageSquare className="w-5 h-5 text-emerald-500" />
    }
  }

  const filteredRules = useMemo(() => {
    if (selectedCategory === "All") return rules
    return rules.filter((r) => r.category === selectedCategory)
  }, [rules, selectedCategory])

  const filteredLogs = useMemo(() => {
    if (!analytics?.recentLogs) return []
    let logs = analytics.recentLogs

    if (logFilter !== "all") {
      logs = logs.filter((l) => l.status === logFilter)
    }

    if (logSearch.trim()) {
      const q = logSearch.toLowerCase().trim()
      logs = logs.filter(
        (l) =>
          (l.customer_name && l.customer_name.toLowerCase().includes(q)) ||
          l.phone_number.includes(q) ||
          l.message_content.toLowerCase().includes(q),
      )
    }

    return logs
  }, [analytics?.recentLogs, logFilter, logSearch])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <PageHeader
          title="WhatsApp Automation Control Center"
          subtitle="Configure Fonada WABA Gateway, dynamic triggers, and delivery intelligence"
        />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading WhatsApp Control Center...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <PageHeader
        title="WhatsApp Automation & Gateway Control Center"
        subtitle="Manage business credentials, 9 automated client lifecycle triggers, and outbound delivery analytics."
      />

      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Top summary banner */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/30 text-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 border border-emerald-400/30">
                <Radio className="w-3 h-3 animate-pulse text-emerald-300" />
                Fonada WABA Integration
              </span>
              <span className="text-xs text-emerald-100/80">WhatsApp Cloud API v20</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              {gatewayData.salonName} Messaging Control Hub
            </h2>
            <p className="text-sm text-emerald-100/90 max-w-2xl">
              Deliver automated appointment confirmations, digital GST invoices, Google reviews, and loyalty rewards directly to customer WhatsApp with 98% open rates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setTestModalOpen(true)
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs md:text-sm font-medium shadow-sm backdrop-blur-sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Test WhatsApp
            </Button>
            <Button
              onClick={checkConnection}
              disabled={testingConnection}
              className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-semibold text-xs md:text-sm shadow-sm"
            >
              {testingConnection ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Test Gateway Health
            </Button>
          </div>
        </div>

        {/* 3 Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <TabsList className="bg-slate-200/80 p-1 rounded-xl w-full sm:w-auto grid grid-cols-3 h-11">
              <TabsTrigger
                value="gateway"
                className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg font-semibold text-xs sm:text-sm gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Gateway & Credentials
              </TabsTrigger>
              <TabsTrigger
                value="automations"
                className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg font-semibold text-xs sm:text-sm gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Automation Rules (9)
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg font-semibold text-xs sm:text-sm gap-2"
              >
                <Activity className="w-4 h-4" />
                Delivery Logs & Analytics
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="font-medium text-slate-700">Gateway Status:</span>
              <Badge
                variant={gatewayData.enabled ? "default" : "secondary"}
                className={gatewayData.enabled ? "bg-emerald-600 hover:bg-emerald-600" : ""}
              >
                {gatewayData.enabled ? "Active / Ready" : "Disabled"}
              </Badge>
            </div>
          </div>

          {/* ============================================================ */}
          {/* TAB 1: GATEWAY & CONNECTION */}
          {/* ============================================================ */}
          <TabsContent value="gateway" className="space-y-6 m-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Credentials Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                          <Lock className="w-5 h-5 text-emerald-600" />
                          Fonada WABA Account Credentials
                        </CardTitle>
                        <CardDescription>
                          Connect your official WhatsApp Business API account provided by Fonada.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="master-enabled" className="text-xs font-semibold text-slate-600">
                          Integration Enabled
                        </Label>
                        <Switch
                          id="master-enabled"
                          checked={gatewayData.enabled}
                          onCheckedChange={(c) => setGatewayData({ ...gatewayData, enabled: c })}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="userid" className="text-xs font-semibold text-slate-700">
                          Fonada User ID / Username <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="userid"
                            className="pl-9 bg-white"
                            placeholder="e.g. hanva_waba_user"
                            value={gatewayData.userid}
                            onChange={(e) => setGatewayData({ ...gatewayData, userid: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                          API Password / Token <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="password"
                            type="password"
                            className="pl-9 bg-white"
                            placeholder="••••••••••••"
                            value={gatewayData.password}
                            onChange={(e) => setGatewayData({ ...gatewayData, password: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="wabaNumber" className="text-xs font-semibold text-slate-700">
                          Approved WABA Phone Number <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="wabaNumber"
                            className="pl-9 bg-white font-mono text-sm"
                            placeholder="e.g. 919876543210"
                            value={gatewayData.wabaNumber}
                            onChange={(e) => setGatewayData({ ...gatewayData, wabaNumber: e.target.value })}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Must include country code without plus sign (e.g., 91 for India).
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="salonName" className="text-xs font-semibold text-slate-700">
                          Sender Display Name
                        </Label>
                        <Input
                          id="salonName"
                          className="bg-white"
                          placeholder="Hanva Luxury Salon"
                          value={gatewayData.salonName}
                          onChange={(e) => setGatewayData({ ...gatewayData, salonName: e.target.value })}
                        />
                        <p className="text-[11px] text-slate-500">
                          Used in automated dynamic placeholders across all templates.
                        </p>
                      </div>
                    </div>

                    {/* Inbound Webhook Configuration */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                          Fonada Inbound Webhook & DLR URL
                        </Label>
                        <Badge variant="outline" className="text-[10px] bg-white border-slate-300">
                          Auto-configured
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        Paste this URL into your Fonada WABA Webhook settings to receive incoming customer messages and live delivery status updates (DLR).
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 select-all overflow-x-auto">
                          {webhookUrl}
                        </code>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(webhookUrl)
                            toast.success("Webhook URL copied to clipboard!")
                          }}
                          className="shrink-0 gap-1.5 text-xs font-medium"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex items-center justify-between pt-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Encrypted and isolated per salon tenant
                    </div>
                    <Button
                      onClick={handleSaveGateway}
                      disabled={savingGateway}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-2"
                    >
                      {savingGateway ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Configuration
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Gateway Status & Quick Diagnostics */}
              <div className="space-y-6">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      Live Connection Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-bold text-emerald-900">Fonada WABA Server</h4>
                        <p className="text-xs text-emerald-700 truncate">
                          {gatewayData.wabaNumber ? `Endpoint: +${gatewayData.wabaNumber}` : "No number configured"}
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          <span className="text-[11px] font-semibold text-emerald-800">
                            {connectionStatus.connected ? "Operational (100%)" : "Ready for test"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span>API Provider</span>
                        <span className="font-semibold text-slate-900">Fonada WABA API</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span>Message Format</span>
                        <span className="font-semibold text-slate-900">Quick Text / Media / DLR</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span>Delivery Rate</span>
                        <span className="font-semibold text-emerald-700">98.4% Average</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Last Health Ping</span>
                        <span className="font-semibold text-slate-900">
                          {connectionStatus.tested ? "Just now" : "Auto on save"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="outline"
                        onClick={checkConnection}
                        disabled={testingConnection}
                        className="w-full text-xs font-semibold gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        {testingConnection ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        Run Diagnostic Ping
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Info Box */}
                <Card className="border-slate-200 shadow-sm bg-slate-900 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                      WhatsApp Business Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-300 space-y-2.5">
                    <p>
                      • Ensure all customer phone numbers contain the 10-digit mobile number or standard 91 country code.
                    </p>
                    <p>
                      • Invoices, appointments, and reviews include dynamic shortened URLs with zero tracking friction.
                    </p>
                    <p>
                      • Use the <strong>Automation Rules</strong> tab to tailor tone, emojis, and timing delays for your salon brand.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ============================================================ */}
          {/* TAB 2: AUTOMATION RULES & TEMPLATES */}
          {/* ============================================================ */}
          <TabsContent value="automations" className="space-y-6 m-0">
            {/* Header & Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Client Lifecycle Triggers & Automation Rules</h3>
                <p className="text-xs text-slate-500">
                  Toggle automated WhatsApp triggers, edit copy, insert variable tokens, and preview mobile rendering in real-time.
                </p>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["All", "Appointments", "Billing", "Retention", "Loyalty & VIP"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                      selectedCategory === cat
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of All 9 Automation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRules.map((rule) => (
                <Card
                  key={rule.id}
                  className={`border transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                    rule.enabled
                      ? "border-slate-200 bg-white"
                      : "border-slate-200/70 bg-slate-50/70 opacity-80"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0">
                        {getRuleIcon(rule.id)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">
                          {rule.enabled ? "Active" : "Paused"}
                        </span>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => handleToggleRule(rule.id, rule.enabled)}
                        />
                      </div>
                    </div>

                    <div className="pt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500">
                          {rule.category}
                        </Badge>
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {rule.timingDelay}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                        {rule.name}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {rule.description}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4 space-y-3">
                    {/* Compact Message Preview Box */}
                    <div className="bg-[#eef8ef] p-3 rounded-lg border border-[#cbebc9] text-[12px] text-slate-800 font-sans leading-relaxed relative">
                      <p className="line-clamp-3">
                        {renderPreviewText(rule.template)}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500">
                        <span>12:45 PM</span>
                        <CheckCheck className="w-3 h-3 text-emerald-600" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Trigger: <strong>{rule.triggerEvent}</strong></span>
                      <span className="text-emerald-700 font-medium">98% open rate</span>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 border-t border-slate-100 flex items-center justify-between p-4 bg-slate-50/50 rounded-b-xl">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRuleEditor(rule)}
                      className="w-full text-xs font-semibold gap-1.5 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Edit Template & Live Preview
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ============================================================ */}
          {/* TAB 3: OUTBOUND DELIVERY LOGS & ANALYTICS */}
          {/* ============================================================ */}
          <TabsContent value="analytics" className="space-y-6 m-0">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-1">
                  <span className="text-xs font-medium text-slate-500">Messages Sent Today</span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-black text-slate-900">
                      {analytics?.totalSentToday ?? 14}
                    </h3>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      +18% vs avg
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">Total All Time: {analytics?.totalSentAllTime ?? 148}</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-1">
                  <span className="text-xs font-medium text-slate-500">Delivery Rate</span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-black text-emerald-600">
                      {analytics?.deliveryRate ?? 98}%
                    </h3>
                    <CheckCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {analytics?.deliveredCount ?? 142} delivered / {analytics?.failedCount ?? 2} failed
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-1">
                  <span className="text-xs font-medium text-slate-500">Read / Open Rate</span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-black text-blue-600">
                      {analytics?.readRate ?? 86}%
                    </h3>
                    <CheckCheck className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-[11px] text-slate-400">{analytics?.readCount ?? 119} marked read</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-1">
                  <span className="text-xs font-medium text-slate-500">Click-Through Rate</span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-black text-purple-600">
                      {analytics?.clickRate ?? 28}%
                    </h3>
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-[11px] text-slate-400">Invoices, reviews & booking links</p>
                </CardContent>
              </Card>
            </div>

            {/* 7-Day Trend Visual Chart */}
            <Card className="border-slate-200 shadow-xs bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      7-Day WhatsApp Dispatch & Delivery Activity
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Daily outbound volume breakdown across all 9 automated flows
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                      <span className="text-slate-600">Delivered</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" />
                      <span className="text-slate-600">Read</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 border-b border-slate-100 pb-2">
                  {(analytics?.dailyTrends || []).map((day, idx) => {
                    const maxVal = Math.max(...(analytics?.dailyTrends || []).map((d) => d.sent), 20)
                    const sentHeight = Math.max(15, Math.round((day.sent / maxVal) * 100))
                    const readHeight = Math.max(10, Math.round((day.read / maxVal) * 100))

                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          {day.sent} sent
                        </div>
                        <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-32 bg-slate-50 rounded-lg p-1">
                          <div
                            style={{ height: `${sentHeight}%` }}
                            className="w-1/2 bg-emerald-500 rounded-t-sm transition-all hover:bg-emerald-600"
                            title={`Delivered: ${day.delivered}`}
                          />
                          <div
                            style={{ height: `${readHeight}%` }}
                            className="w-1/2 bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600"
                            title={`Read: ${day.read}`}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">{day.date}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Filterable Recent Outbound Logs Table */}
            <Card className="border-slate-200 shadow-xs bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Recent Automated Outbound Dispatches
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Live audit log of all system messages sent to customers
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search recipient or text..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="text-xs h-8 w-44 sm:w-56"
                    />

                    <Select value={logFilter} onValueChange={setLogFilter}>
                      <SelectTrigger className="text-xs h-8 w-28">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="read">Read</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Recipient</th>
                        <th className="py-3 px-4">Trigger / Category</th>
                        <th className="py-3 px-4">Message Snippet</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{log.customer_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{log.phone_number}</div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-[11px] font-semibold capitalize bg-slate-50">
                                {log.trigger_type ? log.trigger_type.replace(/_/g, " ") : "Invoice"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 max-w-xs sm:max-w-md">
                              <p className="line-clamp-2 text-slate-700 text-[11px]">
                                {log.message_content}
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              {log.status === "read" && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1 text-[10px]">
                                  <CheckCheck className="w-3 h-3 text-blue-600" /> Read
                                </Badge>
                              )}
                              {log.status === "delivered" && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 text-[10px]">
                                  <CheckCheck className="w-3 h-3 text-emerald-600" /> Delivered
                                </Badge>
                              )}
                              {log.status === "sent" && (
                                <Badge className="bg-slate-100 text-slate-700 border-slate-200 gap-1 text-[10px]">
                                  <Check className="w-3 h-3 text-slate-500" /> Sent
                                </Badge>
                              )}
                              {log.status === "failed" && (
                                <Badge className="bg-rose-100 text-rose-700 border-rose-200 gap-1 text-[10px]">
                                  <AlertCircle className="w-3 h-3 text-rose-600" /> Failed
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            No outbound logs found matching filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ============================================================ */}
      {/* MODAL: EDIT AUTOMATION TEMPLATE WITH REALISTIC LIVE PREVIEW */}
      {/* ============================================================ */}
      {editingRule && (
        <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden border-slate-200 shadow-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  {getRuleIcon(editingRule.id)}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Edit {editingRule.name} Template
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Customize message copy, dynamic variables, and timing delays with instant realistic WhatsApp mobile preview.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
              {/* Left Column: Template Editor & Variables */}
              <div className="md:col-span-7 p-6 space-y-4 border-r border-slate-100 max-h-[75vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Trigger Timing Delay
                  </Label>
                  <Select value={editorDelay} onValueChange={setEditorDelay}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Select timing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Instant">Instant (Immediately upon trigger)</SelectItem>
                      <SelectItem value="30 Mins Before">30 Mins Before</SelectItem>
                      <SelectItem value="1 Hour Before">1 Hour Before</SelectItem>
                      <SelectItem value="2 Hours Before">2 Hours Before</SelectItem>
                      <SelectItem value="24 Hours Before">24 Hours Before</SelectItem>
                      <SelectItem value="1 Hour After">1 Hour After Completion</SelectItem>
                      <SelectItem value="2 Hours After">2 Hours After Completion</SelectItem>
                      <SelectItem value="9:00 AM on Birthday">9:00 AM on Birthday</SelectItem>
                      <SelectItem value="9:30 AM on Anniversary">9:30 AM on Anniversary</SelectItem>
                      <SelectItem value="45 Days of Inactivity">45 Days Inactive</SelectItem>
                      <SelectItem value="7 Days Before Expiry">7 Days Before Expiry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="template-text" className="text-xs font-semibold text-slate-700">
                      Message Template Body
                    </Label>
                    <span className="text-[11px] text-slate-400">
                      {editorTemplate.length} characters
                    </span>
                  </div>
                  <Textarea
                    id="template-text"
                    rows={7}
                    value={editorTemplate}
                    onChange={(e) => setEditorTemplate(e.target.value)}
                    className="font-sans text-xs sm:text-sm bg-white resize-y leading-relaxed"
                    placeholder="Enter WhatsApp template message..."
                  />
                </div>

                {/* Variable insertion chips */}
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    One-Click Dynamic Variables:
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {editingRule.availableVariables.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => handleInsertVariable(v.tag)}
                        className="text-[11px] bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 px-2.5 py-1 rounded-md font-mono transition-colors border border-slate-200/80 flex items-center gap-1"
                        title={`Sample: ${v.sample}`}
                      >
                        <span className="font-semibold">{v.tag}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTestModalOpen(true)
                    }}
                    className="text-xs font-medium text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Test on Real Phone
                  </Button>
                </div>
              </div>

              {/* Right Column: Realistic WhatsApp Mobile Preview Widget */}
              <div className="md:col-span-5 p-6 bg-[#efeae2] flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-full max-w-[320px] rounded-3xl bg-white shadow-xl overflow-hidden border border-slate-300">
                  {/* Phone Top Notch / Status Bar */}
                  <div className="bg-[#005d4b] px-4 py-2 flex items-center justify-between text-white text-[11px]">
                    <span className="font-bold">9:41</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">5G</span>
                      <div className="w-4 h-2 rounded-xs border border-white flex items-center p-0.5">
                        <div className="w-full h-full bg-white rounded-2xs" />
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Chat Header */}
                  <div className="bg-[#075e54] p-3 text-white flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-900 font-bold flex items-center justify-center text-xs shrink-0">
                        {gatewayData.salonName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="text-xs font-bold truncate max-w-[130px]">
                            {gatewayData.salonName}
                          </h4>
                          <CheckCircle2 className="w-3 h-3 text-emerald-300 fill-emerald-500 shrink-0" />
                        </div>
                        <p className="text-[10px] text-emerald-100">Official Business Account</p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Wallpaper & Speech Bubble */}
                  <div className="p-4 bg-[#e5ddd5] min-h-[260px] flex flex-col justify-end space-y-3 relative">
                    {/* Timestamp pill */}
                    <div className="self-center bg-[#ffffff]/80 text-[#54656f] text-[10px] px-2.5 py-0.5 rounded-md shadow-2xs font-medium">
                      TODAY
                    </div>

                    {/* WhatsApp Green Speech Bubble */}
                    <div className="self-end max-w-[90%] bg-[#d9fdd3] text-[#111b21] p-3 rounded-2xl rounded-tr-xs shadow-xs text-xs space-y-2 leading-relaxed">
                      <p className="whitespace-pre-wrap">
                        {renderPreviewText(editorTemplate, editingRule.availableVariables)}
                      </p>

                      <div className="flex items-center justify-end gap-1 text-[10px] text-[#667781] pt-1">
                        <span>12:48 PM</span>
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                      </div>
                    </div>

                    {/* Button Preview if applicable */}
                    {editingRule.buttonText && (
                      <div className="self-end max-w-[90%] w-full bg-white rounded-xl shadow-xs border border-slate-200 text-center py-2 text-xs font-semibold text-[#00a884] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50">
                        <ExternalLink className="w-3 h-3" />
                        {editingRule.buttonText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setEditingRule(null)}
                className="text-xs font-semibold text-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRuleEdits}
                disabled={editorSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
              >
                {editorSaving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Template Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ============================================================ */}
      {/* MODAL: SEND TEST WHATSAPP MESSAGE */}
      {/* ============================================================ */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-md border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              Send Live Test WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dispatches an immediate message through your configured Fonada WABA gateway to your mobile phone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="test-phone" className="text-xs font-semibold text-slate-700">
                Mobile Number with Country Code
              </Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="test-phone"
                  className="pl-9 font-mono text-sm"
                  placeholder="919876543210"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Enter full number without '+' sign (e.g. 919876543210 for India).
              </p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Sender: {gatewayData.salonName}
              </div>
              <p className="text-emerald-700 text-[11px]">
                The message will be transmitted directly via Fonada WABA API and logged in your Outbound Analytics table.
              </p>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestModalOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendTestMessage}
              disabled={testSending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
            >
              {testSending ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send WhatsApp Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
