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
  EyeOff,
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
  Plus,
  Play,
  Trash2,
  Users,
  Bot,
  Phone,
  Search,
  Share2,
} from "lucide-react"
import { getBusinessSettings, updateBusinessSettings } from "@/app/actions/settings"
import {
  fetchMetaTemplates,
  syncMetaTemplatesFromFonada,
  checkTemplateApprovalStatus,
  createMetaTemplateSubmission,
  deleteMetaTemplate,
  getAfterHoursSettings,
  updateAfterHoursSettings,
} from "@/app/actions/whatsapp-templates"
import {
  type MetaTemplate,
  type CreateTemplateInput,
  type AfterHoursSettings,
  DEFAULT_AFTER_HOURS_SETTINGS,
} from "@/lib/whatsapp-templates-constants"
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
import {
  getSmartCampaignRules,
  parseCampaignPromptWithAi,
  previewCampaignAudience,
  createSmartCampaignRule,
  toggleSmartCampaignRule,
  deleteSmartCampaignRule,
  runSmartCampaignRuleNow,
  type SmartCampaignRule,
  type AudiencePreviewResult,
} from "@/app/actions/smart-campaigns"
import {
  PRESET_SALON_RECIPES,
  generateMetaTemplateName,
  convertToMetaTemplateFormat,
  type SmartCampaignRuleDraft,
  type CampaignTriggerType,
} from "@/lib/ai-campaign-parser"
import {
  testAiEngineAction,
  generateAiTemplateAction,
  generateAiAfterHoursAction,
} from "@/app/actions/ai"

export default function WhatsAppConfigPage() {
  const [activeTab, setActiveTab] = useState("smart-campaigns")
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
    wabaNumber: "917965373459",
    salonName: "Hanva Salon",
    openaiApiKey: "",
  })
  const [showAiKey, setShowAiKey] = useState(false)

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

  // Smart AI Campaign States
  const [smartRules, setSmartRules] = useState<SmartCampaignRule[]>([])
  const [promptInput, setPromptInput] = useState("")
  const [isAiParsing, setIsAiParsing] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [currentDraft, setCurrentDraft] = useState<SmartCampaignRuleDraft>({
    name: "30-Day Hair Color Touchup",
    prompt_input: "",
    trigger_type: "days_after_service",
    trigger_days: 30,
    service_names: ["Hair Color"],
    message_template:
      "Hi {{customer_name}}! 🌸 It's been 30 days since your {{service_name}} at {{business_name}}. Time for your regular root touch-up? Book your slot: {{booking_link}}",
    coupon_code: "TOUCHUP10",
    send_time: "10:00",
    cooldown_days: 14,
    exclude_active_bookings: true,
    is_enabled: true,
    meta_template_name: "hair_color_touchup_30d",
    meta_template_category: "MARKETING",
    auto_push_to_meta: true,
  })
  const [isSavingRule, setIsSavingRule] = useState(false)
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreviewResult | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null)

  // After-Hours Auto-Responder Settings
  const [afterHoursSettings, setAfterHoursSettings] = useState<AfterHoursSettings>(DEFAULT_AFTER_HOURS_SETTINGS)
  const [savingAfterHours, setSavingAfterHours] = useState(false)

  // Meta Template Studio States
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [syncingTemplates, setSyncingTemplates] = useState(false)
  const [templateStatusFilter, setTemplateStatusFilter] = useState<string>("ALL")
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("ALL")
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>("")
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false)
  const [previewingTemplate, setPreviewingTemplate] = useState<MetaTemplate | null>(null)
  const [checkingStatusName, setCheckingStatusName] = useState<string | null>(null)
  const [deletingTemplateName, setDeletingTemplateName] = useState<string | null>(null)

  // Template Creation Form State
  const [templateForm, setTemplateForm] = useState<CreateTemplateInput>({
    name: "",
    category: "UTILITY",
    language: "en_US",
    headerText: "",
    bodyText: "Hello {{1}}! ✨\n\nYour appointment at {{2}} is confirmed for {{3}} at {{4}}.\n\nWe look forward to seeing you soon! 🌸",
    footerText: "Reply STOP to unsubscribe",
    buttons: [
      { type: "URL", text: "View Details", url: "https://biz.hanva.in" },
    ],
    sampleValues: {
      "1": "Priya",
      "2": "Hanva Luxury Salon",
      "3": "25 Oct 2026",
      "4": "02:30 PM",
    },
  })
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false)

  // Google Gemini AI Engine States
  const [isTestingAi, setIsTestingAi] = useState(false)
  const [aiEngineStatus, setAiEngineStatus] = useState<{
    tested: boolean
    online: boolean
    latencyMs?: number
    model?: string
    error?: string
  }>({ tested: false, online: false })
  const [aiPromptText, setAiPromptText] = useState("")
  const [isGeneratingAiTemplate, setIsGeneratingAiTemplate] = useState(false)
  const [isGeneratingAfterHours, setIsGeneratingAfterHours] = useState(false)

  const webhookUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/webhooks/whatsapp?type=mo` 
    : "https://biz.hanva.in/api/webhooks/whatsapp?type=mo"

  useEffect(() => {
    loadAllData()
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get("tab")
      if (tab && ["smart-campaigns", "automations", "gateway", "analytics", "meta-templates"].includes(tab)) {
        setActiveTab(tab)
      }
    }
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [settings, fetchedRules, fetchedAnalytics, smartRulesRes, fetchedAfterHours, fetchedTemplates] = await Promise.all([
        getBusinessSettings(),
        getAutomationRules(),
        getWhatsAppAnalytics(),
        getSmartCampaignRules(),
        getAfterHoursSettings(),
        fetchMetaTemplates(),
      ])

      if (smartRulesRes?.success && smartRulesRes?.data) {
        setSmartRules(smartRulesRes.data)
      }

      if (fetchedAfterHours) {
        setAfterHoursSettings(fetchedAfterHours)
      }

      if (fetchedTemplates && fetchedTemplates.length > 0) {
        setMetaTemplates(fetchedTemplates)
      }

      if (settings) {
        setGatewayData({
          enabled: settings.whatsapp?.enabled ?? true,
          userid: settings.whatsapp?.userid || "",
          password: settings.whatsapp?.password || "",
          wabaNumber: settings.whatsapp?.wabaNumber || "917965373459",
          salonName: settings.profile?.salonName || "Hanva Luxury Salon",
          openaiApiKey: settings.whatsapp?.openaiApiKey || "",
        })

        if (settings.whatsapp?.userid && settings.whatsapp?.wabaNumber) {
          setConnectionStatus({
            tested: true,
            connected: true,
            message: "Hanva WABA Gateway configured and active",
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

  const handleParsePrompt = async (textToParse?: string) => {
    const text = textToParse || promptInput
    if (!text.trim()) {
      toast.error("Please enter what you want to automate")
      return
    }

    setIsAiParsing(true)
    try {
      const res = await parseCampaignPromptWithAi(text)
      if (res.success && res.draft) {
        setCurrentDraft(res.draft)
        setIsCreateModalOpen(true)
        fetchAudiencePreview(res.draft)
      } else {
        toast.error("Could not parse prompt. Please try again.")
      }
    } catch {
      toast.error("AI parser error")
    } finally {
      setIsAiParsing(false)
    }
  }

  const handleSelectRecipe = (draft: SmartCampaignRuleDraft) => {
    setCurrentDraft(draft)
    setIsCreateModalOpen(true)
    fetchAudiencePreview(draft)
  }

  const fetchAudiencePreview = async (draft: SmartCampaignRuleDraft) => {
    setIsPreviewLoading(true)
    try {
      const res = await previewCampaignAudience(draft)
      if (res.success && res.preview) {
        setAudiencePreview(res.preview)
      } else {
        setAudiencePreview(null)
      }
    } catch {
      setAudiencePreview(null)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleSaveRule = async () => {
    if (!currentDraft.name.trim()) {
      toast.error("Please enter a campaign name")
      return
    }
    if (!currentDraft.message_template.trim()) {
      toast.error("Please enter a WhatsApp message template")
      return
    }

    setIsSavingRule(true)
    try {
      const res = await createSmartCampaignRule(currentDraft)
      if (res.success) {
        toast.success(
          currentDraft.auto_push_to_meta
            ? "Automated campaign created & submitted to Meta Template Studio!"
            : "Automated campaign created & activated!"
        )
        setIsCreateModalOpen(false)
        setPromptInput("")
        const [refreshedRules, refreshedTemplates] = await Promise.all([
          getSmartCampaignRules(),
          fetchMetaTemplates(),
        ])
        if (refreshedRules.success && refreshedRules.data) setSmartRules(refreshedRules.data)
        if (refreshedTemplates) setMetaTemplates(refreshedTemplates)
      } else {
        toast.error(res.error || "Failed to save rule")
      }
    } catch {
      toast.error("Error saving campaign rule")
    } finally {
      setIsSavingRule(false)
    }
  }

  const handleToggleSmartRule = async (rule: SmartCampaignRule) => {
    const nextStatus = !rule.is_enabled
    setSmartRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_enabled: nextStatus } : r))
    )

    try {
      const res = await toggleSmartCampaignRule(rule.id, nextStatus)
      if (res.success) {
        toast.success(nextStatus ? "Automation enabled" : "Automation paused")
      } else {
        toast.error("Failed to update status")
        const refreshed = await getSmartCampaignRules()
        if (refreshed.success && refreshed.data) setSmartRules(refreshed.data)
      }
    } catch {
      toast.error("Error toggling status")
    }
  }

  const handleDeleteSmartRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this automated campaign?")) return

    try {
      const res = await deleteSmartCampaignRule(ruleId)
      if (res.success) {
        toast.success("Campaign deleted")
        setSmartRules((prev) => prev.filter((r) => r.id !== ruleId))
      } else {
        toast.error("Failed to delete campaign")
      }
    } catch {
      toast.error("Error deleting campaign")
    }
  }

  const handleRunSmartRuleNow = async (ruleId: string) => {
    setRunningRuleId(ruleId)
    try {
      const res = await runSmartCampaignRuleNow(ruleId)
      if (res.success) {
        toast.success(`Automation completed! Sent to ${res.sentCount || 0} matching customer(s).`)
        const refreshed = await getSmartCampaignRules()
        if (refreshed.success && refreshed.data) setSmartRules(refreshed.data)
      } else {
        toast.error(res.error || "Failed to trigger campaign")
      }
    } catch {
      toast.error("Error running campaign")
    } finally {
      setRunningRuleId(null)
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
        openaiApiKey: gatewayData.openaiApiKey,
      })
      
      // Also save the salonName to profile so templates pick it up
      await updateBusinessSettings("profile", {
        salonName: gatewayData.salonName,
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

  // After-Hours Auto-Responder Save Handler
  const handleSaveAfterHours = async () => {
    setSavingAfterHours(true)
    try {
      const res = await updateAfterHoursSettings(afterHoursSettings)
      if (res.success) {
        toast.success(res.message || "After-Hours Auto-Responder settings saved!")
      } else {
        toast.error(res.message || "Failed to save after-hours settings")
      }
    } catch (err: any) {
      toast.error(err?.message || "Error saving after-hours settings")
    } finally {
      setSavingAfterHours(false)
    }
  }

  // Google Gemini AI Handlers
  const handleTestAiConnection = async () => {
    setIsTestingAi(true)
    try {
      const res = await testAiEngineAction(gatewayData.openaiApiKey)
      setAiEngineStatus({
        tested: true,
        online: res.success,
        latencyMs: res.latencyMs,
        model: res.model,
        error: res.error,
      })
      if (res.success) {
        toast.success(`✨ Google Gemini AI online! (${res.model}, ${res.latencyMs}ms)`)
      } else {
        toast.error(`Gemini connection check failed: ${res.error || "Failed"}`)
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to test AI connection")
    } finally {
      setIsTestingAi(false)
    }
  }

  const handleGenerateAiTemplate = async (overridePrompt?: string) => {
    const prompt = overridePrompt || aiPromptText
    if (!prompt.trim()) {
      toast.error("Please enter a campaign or template idea")
      return
    }

    setIsGeneratingAiTemplate(true)
    try {
      const res = await generateAiTemplateAction({
        prompt,
        category: templateForm.category,
        salonName: gatewayData.salonName,
        customKey: gatewayData.openaiApiKey,
      })

      if (res.success && res.template) {
        const tpl = res.template
        setTemplateForm({
          name: tpl.name || templateForm.name,
          category: (tpl.category as "UTILITY" | "MARKETING") || templateForm.category,
          language: templateForm.language || "en_US",
          headerText: tpl.headerText || "",
          bodyText: tpl.bodyText || "",
          footerText: tpl.footerText || "",
          buttons: tpl.buttons && tpl.buttons.length > 0 ? (tpl.buttons as any) : templateForm.buttons,
          sampleValues: tpl.sampleValues || templateForm.sampleValues,
        })
        toast.success("✨ Template drafted with Google Gemini 3.5 Flash!")
      } else {
        toast.error(res.error || "Could not generate template copy")
      }
    } catch (err: any) {
      toast.error(err?.message || "AI generator error")
    } finally {
      setIsGeneratingAiTemplate(false)
    }
  }

  const handleGenerateAiAfterHours = async () => {
    setIsGeneratingAfterHours(true)
    try {
      const res = await generateAiAfterHoursAction({
        salonName: gatewayData.salonName,
        workingHours: `${afterHoursSettings.startTime} - ${afterHoursSettings.endTime}`,
        customKey: gatewayData.openaiApiKey,
      })
      if (res.success && res.message) {
        setAfterHoursSettings((prev) => ({
          ...prev,
          customMessage: res.message,
        }))
        toast.success("✨ After-hours message generated with Google Gemini!")
      } else {
        toast.error(res.error || "Could not generate after-hours message")
      }
    } catch (err: any) {
      toast.error(err?.message || "AI error")
    } finally {
      setIsGeneratingAfterHours(false)
    }
  }

  // Meta Template Studio Handlers
  const handleSyncTemplates = async () => {
    setSyncingTemplates(true)
    try {
      const res = await syncMetaTemplatesFromFonada()
      if (res.success) {
        toast.success(res.message)
        const refreshed = await fetchMetaTemplates(templateStatusFilter, templateCategoryFilter)
        setMetaTemplates(refreshed)
      } else {
        toast.error(res.message || "Failed to sync templates from Meta")
      }
    } catch (err: any) {
      toast.error(err?.message || "Error syncing templates")
    } finally {
      setSyncingTemplates(false)
    }
  }

  const handleCheckStatus = async (tpl: MetaTemplate) => {
    setCheckingStatusName(tpl.name)
    try {
      const res = await checkTemplateApprovalStatus(tpl.name)
      if (res.success) {
        toast.success(`Template "${tpl.name}": ${res.status} (Quality: ${res.quality_score || "N/A"})`)
        setMetaTemplates((prev) =>
          prev.map((t) =>
            t.name === tpl.name || t.id === tpl.id
              ? {
                  ...t,
                  status: res.status,
                  quality_score: res.quality_score || t.quality_score,
                  rejection_reason: res.rejection_reason,
                }
              : t
          )
        )
      } else {
        toast.error("Failed to check status: " + (res.rejection_reason || "Unknown error"))
      }
    } catch (err: any) {
      toast.error(err?.message || "Error checking template status")
    } finally {
      setCheckingStatusName(null)
    }
  }

  const handleDeleteTemplate = async (tpl: MetaTemplate) => {
    if (!confirm(`Are you sure you want to permanently delete template "${tpl.name}" from Meta and Fonada?`)) {
      return
    }
    setDeletingTemplateName(tpl.name)
    try {
      const res = await deleteMetaTemplate(tpl.name)
      if (res.success) {
        toast.success(res.message)
        setMetaTemplates((prev) => prev.filter((t) => t.name !== tpl.name && t.id !== tpl.id))
        if (previewingTemplate?.name === tpl.name) {
          setPreviewingTemplate(null)
        }
      } else {
        toast.error(res.message || "Failed to delete template")
      }
    } catch (err: any) {
      toast.error(err?.message || "Error deleting template")
    } finally {
      setDeletingTemplateName(null)
    }
  }

  const handleSubmitTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error("Please enter a template name")
      return
    }
    if (!templateForm.bodyText.trim()) {
      toast.error("Please enter message body text")
      return
    }

    setIsSubmittingTemplate(true)
    try {
      const res = await createMetaTemplateSubmission(templateForm)
      if (res.success) {
        toast.success(res.message || "Template submitted successfully to Meta!")
        setIsCreateTemplateModalOpen(false)
        setTemplateForm({
          name: "",
          category: "UTILITY",
          language: "en_US",
          headerText: "",
          bodyText: "Hello {{1}}! ✨\n\nYour appointment at {{2}} is confirmed for {{3}} at {{4}}.\n\nWe look forward to seeing you soon! 🌸",
          footerText: "Reply STOP to unsubscribe",
          buttons: [{ type: "URL", text: "View Details", url: "https://biz.hanva.in" }],
          sampleValues: {
            "1": "Priya",
            "2": "Hanva Luxury Salon",
            "3": "25 Oct 2026",
            "4": "02:30 PM",
          },
        })
        const refreshed = await fetchMetaTemplates()
        setMetaTemplates(refreshed)
      } else {
        toast.error(res.message || "Failed to create template")
      }
    } catch (err: any) {
      toast.error(err?.message || "Error submitting template to Meta")
    } finally {
      setIsSubmittingTemplate(false)
    }
  }

  // Filtered Templates & Counts
  const templateCounts = useMemo(() => {
    const total = metaTemplates.length
    const approved = metaTemplates.filter((t) => t.status === "APPROVED").length
    const pending = metaTemplates.filter((t) => t.status === "PENDING").length
    const rejected = metaTemplates.filter((t) => t.status === "REJECTED").length
    return { total, approved, pending, rejected }
  }, [metaTemplates])

  const filteredMetaTemplates = useMemo(() => {
    return metaTemplates.filter((t) => {
      if (templateStatusFilter !== "ALL") {
        if (t.status.toUpperCase() !== templateStatusFilter.toUpperCase()) {
          return false
        }
      }
      if (templateCategoryFilter !== "ALL") {
        if (t.category.toUpperCase() !== templateCategoryFilter.toUpperCase()) {
          return false
        }
      }
      if (templateSearchQuery.trim()) {
        const q = templateSearchQuery.toLowerCase()
        const name = (t.name || t.template_name || "").toLowerCase()
        const body = (t.components?.find((c) => c.type === "BODY")?.text || "").toLowerCase()
        if (!name.includes(q) && !body.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [metaTemplates, templateStatusFilter, templateCategoryFilter, templateSearchQuery])

  const extractSampleValuesFromTemplate = (tpl: MetaTemplate): Record<string, string> => {
    const values: Record<string, string> = {}
    const bodyComp = tpl.components?.find((c) => c.type === "BODY")
    const exampleRows = bodyComp?.example?.body_text
    if (Array.isArray(exampleRows) && exampleRows.length > 0 && Array.isArray(exampleRows[0])) {
      exampleRows[0].forEach((val: string, idx: number) => {
        values[String(idx + 1)] = String(val)
      })
    }
    if (!values["1"]) values["1"] = "Priya"
    if (!values["2"]) values["2"] = gatewayData.salonName || "Hanva Luxury Salon"
    if (!values["3"]) values["3"] = "Hair Spa & Styling"
    if (!values["4"]) values["4"] = "25 Oct 2026"
    if (!values["5"]) values["5"] = "02:30 PM"
    if (!values["6"]) values["6"] = "Rahul Sharma"
    return values
  }

  const renderMetaTemplatePreview = (text: string, sampleValues?: Record<string, string>) => {
    if (!text) return null
    const parts = text.split(/(\{\{\d+\}\})/)
    return parts.map((part, idx) => {
      const match = part.match(/^\{\{(\d+)\}\}$/)
      if (match) {
        const varNum = match[1]
        const sampleVal = sampleValues?.[varNum]
        if (sampleVal) {
          return (
            <span
              key={idx}
              className="font-semibold text-emerald-800 bg-emerald-100/90 px-1 py-0.5 rounded border border-emerald-300/60 inline"
            >
              {sampleVal}
            </span>
          )
        }
        return (
          <span
            key={idx}
            className="font-mono text-[11px] font-semibold text-amber-800 bg-amber-100/90 px-1 py-0.5 rounded border border-amber-300 inline"
          >
            {part}
          </span>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  const renderHighlightedBody = (text: string) => {
    if (!text) return null
    const parts = text.split(/(\{\{\d+\}\})/)
    return parts.map((part, idx) => {
      const match = part.match(/^\{\{(\d+)\}\}$/)
      if (match) {
        return (
          <span
            key={idx}
            className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 inline-block mx-0.5"
          >
            {part}
          </span>
        )
      }
      return <span key={idx}>{part}</span>
    })
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
  const renderPreviewText = (rawTemplate?: string, customVars?: Array<{ tag: string; sample: string }>) => {
    let text = String(rawTemplate || "")
    if (!text) return "No message template specified."

    const defaultReplacements: Record<string, string> = {
      "{{customer_name}}": "Priya Sharma",
      "{{salon_name}}": gatewayData.salonName || "Hanva Luxury Salon",
      "{{business_name}}": gatewayData.salonName || "Hanva Luxury Salon",
      "{{service_name}}": "Keratin Hair Spa & Blowdry",
      "{{service_names}}": "Keratin Hair Spa & Blowdry",
      "{{booking_date}}": "24 Aug 2026",
      "{{booking_time}}": "04:30 PM",
      "{{staff_name}}": "Sarah Johnson",
      "{{total_amount}}": "2,499",
      "{{booking_id}}": "BKG-9021",
      "{{invoice_no}}": "INV-2026-0812",
      "{{invoice_url}}": "https://biz.hanva.in/inv/x8k2p9",
      "{{payment_method}}": "UPI / Google Pay",
      "{{gmb_url}}": "https://g.page/r/hanva-salon/review",
      "{{review_url}}": "https://g.page/r/hanva-salon/review",
      "{{discount_percent}}": "25",
      "{{coupon_code}}": "BDAY25",
      "{{validity_days}}": "7",
      "{{booking_url}}": "https://biz.hanva.in/book",
      "{{days_since_visit}}": "45",
      "{{special_offer}}": "Flat ₹500 OFF + Free Hair Spa",
      "{{points}}": "850",
      "{{points_earned}}": "150",
      "{{points_balance}}": "850",
      "{{cash_equivalent}}": "425",
      "{{membership_tier}}": "Gold Club Member",
      "{{expiry_date}}": "31 Dec 2026",
      "{{benefits_summary}}": "20% off all services & free express facials",
      "{{salon_address}}": "100ft Road, Indiranagar",
    }

    if (customVars && Array.isArray(customVars)) {
      customVars.forEach((v) => {
        if (v && v.tag && v.sample) {
          defaultReplacements[v.tag] = v.sample
        }
      })
    }

    Object.entries(defaultReplacements).forEach(([tag, val]) => {
      if (tag && val !== undefined) {
        text = text.split(tag).join(String(val))
      }
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
          (l.phone_number && l.phone_number.includes(q)) ||
          (l.message_content && l.message_content.toLowerCase().includes(q)),
      )
    }

    return logs
  }, [analytics?.recentLogs, logFilter, logSearch])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <PageHeader
          title="WhatsApp Automation Control Center"
          subtitle="Configure Hanva WABA Gateway, dynamic triggers, and delivery intelligence"
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
                Hanva WABA Integration
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
            <TabsList className="bg-slate-200/80 p-1 rounded-xl w-full sm:w-auto grid grid-cols-2 lg:grid-cols-5 h-auto lg:h-11 gap-1">
              <TabsTrigger
                value="smart-campaigns"
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg font-semibold text-xs sm:text-sm gap-2 py-2 sm:py-1.5"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                AI Smart Campaigns ({smartRules.length})
              </TabsTrigger>
              <TabsTrigger
                value="automations"
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg font-semibold text-xs sm:text-sm gap-2 py-2 sm:py-1.5"
              >
                <Clock className="w-4 h-4 text-slate-600" />
                Lifecycle Triggers (9)
              </TabsTrigger>
              <TabsTrigger
                value="meta-templates"
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg font-semibold text-xs sm:text-sm gap-2 py-2 sm:py-1.5"
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                Meta Template Studio ({metaTemplates.length})
              </TabsTrigger>
              <TabsTrigger
                value="gateway"
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg font-semibold text-xs sm:text-sm gap-2 py-2 sm:py-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                Gateway & Settings
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg font-semibold text-xs sm:text-sm gap-2 py-2 sm:py-1.5"
              >
                <Activity className="w-4 h-4 text-slate-600" />
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
                          Hanva WABA Account Credentials
                        </CardTitle>
                        <CardDescription>
                          Connect your official WhatsApp Business API account provided by Hanva.
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
                          Hanva User ID / Username <span className="text-rose-500">*</span>
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
                            placeholder="917965373459"
                            value={gatewayData.wabaNumber}
                            onChange={(e) => setGatewayData({ ...gatewayData, wabaNumber: e.target.value })}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Official Hanva WABA Endpoint: <span className="font-semibold text-emerald-600">+91 79 6537 3459</span> (Default across all salon messages).
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

                    {/* Google Gemini AI Engine Card (Embedded & Zero-Cost for All Tenants) */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white border border-emerald-200/80 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                                Google Gemini AI Engine
                              </h3>
                              <Badge className="bg-emerald-600 text-white text-[10px] font-semibold border-none px-2 py-0.5">
                                Embedded for All Tenants
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              System-wide intelligent automation • Model: <span className="font-mono font-semibold text-emerald-800">gemini-3.5-flash</span> (Free & Unlimited)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isTestingAi}
                            onClick={handleTestAiConnection}
                            className="h-8 text-xs font-semibold border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 gap-1.5 shadow-2xs"
                          >
                            <Zap className={isTestingAi ? "w-3.5 h-3.5 animate-spin text-emerald-600" : "w-3.5 h-3.5 text-emerald-600 fill-emerald-600"} />
                            {isTestingAi ? "Testing Engine..." : "Test AI Engine"}
                          </Button>
                        </div>
                      </div>

                      {/* Capabilities 3-column pill row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-white border border-emerald-100 flex items-start gap-2 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-slate-800 text-[11px]">Smart Campaigns</p>
                            <p className="text-[10px] text-slate-500">Converts salon requests into automated WhatsApp schedules</p>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-emerald-100 flex items-start gap-2 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-slate-800 text-[11px]">Meta Template Studio</p>
                            <p className="text-[10px] text-slate-500">Auto-writes Meta-compliant marketing and transactional copy</p>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-emerald-100 flex items-start gap-2 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-slate-800 text-[11px]">After-Hours Concierge</p>
                            <p className="text-[10px] text-slate-500">Generates friendly off-hours replies with 24/7 booking links</p>
                          </div>
                        </div>
                      </div>

                      {/* AI Status / Connection confirmation box */}
                      {aiEngineStatus.tested && (
                        <div className={`p-3 rounded-xl text-xs flex items-center justify-between border ${aiEngineStatus.online ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                          <div className="flex items-center gap-2">
                            {aiEngineStatus.online ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>
                              {aiEngineStatus.online
                                ? `Google Gemini AI is online & responsive (Latency: ${aiEngineStatus.latencyMs}ms • Model: ${aiEngineStatus.model})`
                                : `Connection check failed: ${aiEngineStatus.error || "Unable to reach Gemini"}`}
                            </span>
                          </div>
                          <Badge variant="outline" className={aiEngineStatus.online ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]" : "bg-rose-100 text-rose-800 border-rose-300 text-[10px]"}>
                            {aiEngineStatus.online ? "Operational" : "Error"}
                          </Badge>
                        </div>
                      )}

                      {/* Optional Custom API Key (Tenant Override) */}
                      <div className="pt-2 border-t border-emerald-100/80">
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="customAiApiKey" className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                            <Key className="w-3.5 h-3.5 text-slate-500" />
                            Optional: Custom API Key Override (Gemini or OpenAI)
                          </Label>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {gatewayData.openaiApiKey ? "Custom Key Set" : "Using Built-in Gemini"}
                          </span>
                        </div>
                        <div className="relative">
                          <Key className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            id="customAiApiKey"
                            type={showAiKey ? "text" : "password"}
                            className="pl-9 pr-10 bg-white font-mono text-xs h-8"
                            placeholder="AQ.Ab8... (Gemini) or sk-... (OpenAI) — Leave blank to use Hanva built-in Gemini"
                            value={gatewayData.openaiApiKey}
                            onChange={(e) => setGatewayData({ ...gatewayData, openaiApiKey: e.target.value })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowAiKey(!showAiKey)}
                            className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 transition-colors"
                            title={showAiKey ? "Hide API key" : "Show API key"}
                          >
                            {showAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          By default, all salons enjoy free built-in Google Gemini 3.5 Flash without entering any key. Enter a custom key only if your organization requires isolated API quotas.
                        </p>
                      </div>
                    </div>

                    {/* Inbound Webhook Configuration */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                          Hanva Inbound Webhook & DLR URL
                        </Label>
                        <Badge variant="outline" className="text-[10px] bg-white border-slate-300">
                          Auto-configured
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        Paste this URL into your Hanva WABA Webhook settings to receive incoming customer messages and live delivery status updates (DLR).
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

                {/* After-Hours Auto-Responder Card */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-4 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                          <Clock className="w-5 h-5 text-indigo-600" />
                          After-Hours Auto-Responder
                        </CardTitle>
                        <CardDescription>
                          Automatically reply to customer WhatsApp messages received outside your salon operating hours.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="after-hours-switch" className="text-xs font-semibold text-slate-700">
                          Auto-Responder Enabled
                        </Label>
                        <Switch
                          id="after-hours-switch"
                          checked={afterHoursSettings.enabled}
                          onCheckedChange={(c) => setAfterHoursSettings({ ...afterHoursSettings, enabled: c })}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="after-hours-start" className="text-xs font-semibold text-slate-700">
                          After-Hours Window Starts (Salon Closes)
                        </Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="after-hours-start"
                            type="time"
                            className="pl-9 bg-white font-mono text-sm"
                            value={afterHoursSettings.startTime}
                            onChange={(e) => setAfterHoursSettings({ ...afterHoursSettings, startTime: e.target.value })}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Default: <span className="font-semibold text-slate-700">20:30</span> (8:30 PM). Auto-responder starts firing at this time.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="after-hours-end" className="text-xs font-semibold text-slate-700">
                          After-Hours Window Ends (Salon Re-Opens)
                        </Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="after-hours-end"
                            type="time"
                            className="pl-9 bg-white font-mono text-sm"
                            value={afterHoursSettings.endTime}
                            onChange={(e) => setAfterHoursSettings({ ...afterHoursSettings, endTime: e.target.value })}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Default: <span className="font-semibold text-slate-700">09:30</span> (9:30 AM). Regular working hours resume.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="after-hours-msg" className="text-xs font-semibold text-slate-700">
                          Auto-Responder Message Template
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isGeneratingAfterHours}
                            onClick={handleGenerateAiAfterHours}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-1 shadow-2xs mr-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            {isGeneratingAfterHours ? "Writing..." : "✨ AI Generate Copy"}
                          </button>
                          <span className="text-[11px] text-slate-400">Insert:</span>
                          <button
                            type="button"
                            onClick={() =>
                              setAfterHoursSettings({
                                ...afterHoursSettings,
                                customMessage: `${afterHoursSettings.customMessage} {salon_name}`,
                              })
                            }
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                          >
                            + {"{salon_name}"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAfterHoursSettings({
                                ...afterHoursSettings,
                                customMessage: `${afterHoursSettings.customMessage} {booking_link}`,
                              })
                            }
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                          >
                            + {"{booking_link}"}
                          </button>
                        </div>
                      </div>
                      <Textarea
                        id="after-hours-msg"
                        rows={4}
                        className="bg-white text-xs sm:text-sm leading-relaxed"
                        value={afterHoursSettings.customMessage}
                        onChange={(e) => setAfterHoursSettings({ ...afterHoursSettings, customMessage: e.target.value })}
                        placeholder="Hello! Thank you for reaching out to {salon_name}..."
                      />
                      <p className="text-[11px] text-slate-500">
                        Use <code className="text-indigo-600 font-mono font-medium">{"{salon_name}"}</code> and{" "}
                        <code className="text-indigo-600 font-mono font-medium">{"{booking_link}"}</code> for dynamic salon branding & 24/7 direct appointment booking.
                      </p>
                    </div>

                    {/* Live Preview Box */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          Live Auto-Reply WhatsApp Bubble Preview
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-white border-slate-300">
                          {afterHoursSettings.enabled ? "Active Out-of-Hours" : "Responder Paused"}
                        </Badge>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs max-w-lg space-y-1">
                        <div className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1 pb-1 border-b border-slate-100">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {gatewayData.salonName || "Hanva Luxury Salon"} • Official WhatsApp
                        </div>
                        <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {afterHoursSettings.customMessage
                            .replace(/\{salon_name\}/g, gatewayData.salonName || "Hanva Luxury Salon")
                            .replace(/\{booking_link\}/g, "https://biz.hanva.in/book")}
                        </p>
                        <div className="text-[10px] text-slate-400 text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
                          <span>{afterHoursSettings.startTime || "20:30"}</span>
                          <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex items-center justify-between pt-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Window: {afterHoursSettings.startTime} — {afterHoursSettings.endTime}
                    </div>
                    <Button
                      onClick={handleSaveAfterHours}
                      disabled={savingAfterHours}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm gap-2"
                    >
                      {savingAfterHours ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save After-Hours Settings
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
                        <h4 className="text-xs font-bold text-emerald-900">Hanva WABA Server</h4>
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
                        <span className="font-semibold text-slate-900">Hanva WABA API</span>
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
          {/* TAB 0: AI SMART CAMPAIGNS (CUSTOM LIFECYCLE FLOWS) */}
          {/* ============================================================ */}
          <TabsContent value="smart-campaigns" className="space-y-6 m-0">
            {/* Dark Slate / Charcoal AI Command Center Hero */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 border border-emerald-500/20">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Natural Language Compiler
                    </span>
                    <span className="text-xs text-slate-400">Recurring Multi-Tenant Cron</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    AI Automated WhatsApp Campaigns
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                    Describe any salon retention flow in plain words (e.g. <em>&quot;Send root touch-up reminder to clients 30 days after Hair Color with 10% coupon&quot;</em>). Hanva Billing scans and dispatches it automatically every morning.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    const defaultDraft: SmartCampaignRuleDraft = {
                      name: "Custom Salon Automation",
                      prompt_input: "",
                      trigger_type: "days_after_service",
                      trigger_days: 30,
                      service_names: [],
                      message_template:
                        "Hi {{customer_name}}! ✨ It has been 30 days since your visit to {{business_name}}. Time for your regular refresh? Book your slot: {{booking_link}}",
                      coupon_code: "REFRESH",
                      send_time: "10:00",
                      cooldown_days: 14,
                      exclude_active_bookings: true,
                      is_enabled: true,
                      meta_template_name: "custom_salon_automation",
                      meta_template_category: "MARKETING",
                      auto_push_to_meta: true,
                    }
                    setCurrentDraft(defaultDraft)
                    setIsCreateModalOpen(true)
                    fetchAudiencePreview(defaultDraft)
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm gap-2 shrink-0 h-10 px-4 rounded-xl shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  New Automation
                </Button>
              </div>

              {/* Prompt Input Box */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="relative flex-1">
                  <Input
                    placeholder="e.g. Send root touch-up template to customers who took Hair Color 30 days ago with 10% coupon..."
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleParsePrompt()
                    }}
                    className="bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-emerald-500 text-xs sm:text-sm h-11 rounded-xl"
                  />
                  <Sparkles className="w-4 h-4 absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                </div>
                <Button
                  onClick={() => handleParsePrompt()}
                  disabled={isAiParsing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 h-11 px-5 rounded-xl font-medium shadow-xs shrink-0"
                >
                  {isAiParsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                  Ask AI
                </Button>
              </div>

              {/* One-Tap Salon Inspiration Recipes */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  ✨ Instant One-Tap Salon Recipes:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SALON_RECIPES.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleSelectRecipe(recipe.draft)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all shadow-2xs"
                    >
                      <span>{recipe.icon}</span>
                      <span>{recipe.title}</span>
                      <span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                        {recipe.draft.trigger_days}d
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Campaign Rules Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Active Custom Automations</h4>
                  <p className="text-xs text-slate-500">
                    Each automation checks your salon appointments daily and sends personalized messages.
                  </p>
                </div>
                <Badge variant="outline" className="border-slate-300 text-slate-700 bg-white">
                  {smartRules.length} Configured
                </Badge>
              </div>

              {smartRules.length === 0 ? (
                <Card className="border-dashed border-2 p-10 text-center bg-white">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-base text-slate-900 mb-1">No AI Campaign Rules Created Yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                    Type a prompt above or tap one of the instant recipes (like 30-Day Hair Color Touchup) to activate your first flow.
                  </p>
                  <Button
                    onClick={() => handleSelectRecipe(PRESET_SALON_RECIPES[0].draft)}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-2"
                  >
                    Try 30-Day Hair Color Followup
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {smartRules.map((rule) => {
                    const isRunning = runningRuleId === rule.id

                    return (
                      <Card
                        key={rule.id}
                        className={`transition-all duration-200 bg-white border flex flex-col justify-between ${
                          rule.is_enabled ? "border-slate-200 shadow-xs hover:border-slate-300" : "border-slate-200/70 bg-slate-50/70 opacity-75"
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-base font-bold text-slate-900">
                                  {rule.name}
                                </CardTitle>
                              </div>
                              <CardDescription className="text-xs text-slate-500 line-clamp-1">
                                {rule.prompt_input || "Recurring automated trigger"}
                              </CardDescription>
                            </div>
                            <Switch
                              checked={rule.is_enabled}
                              onCheckedChange={() => handleToggleSmartRule(rule)}
                            />
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3 pb-3">
                          {/* Parameter Badges */}
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[11px]">
                              ⏰ {rule.trigger_days} Days{" "}
                              {rule.trigger_type === "days_after_service"
                                ? "After Service"
                                : rule.trigger_type === "days_since_last_visit"
                                ? "Inactive"
                                : rule.trigger_type === "days_before_birthday"
                                ? "Before Birthday"
                                : "After Visit"}
                            </Badge>

                            {rule.service_names && rule.service_names.length > 0 && (
                              <Badge variant="outline" className="bg-slate-50 text-slate-800 border-slate-200 text-[11px]">
                                ✂️ {rule.service_names.join(", ")}
                              </Badge>
                            )}

                            {rule.coupon_code && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-mono text-[11px]">
                                🏷️ {rule.coupon_code}
                              </Badge>
                            )}

                            <Badge variant="outline" className="bg-slate-50 text-slate-600 text-[11px]">
                              🕒 {rule.send_time}
                            </Badge>

                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-mono flex items-center gap-1"
                              title="Meta Cloud API Template Linked"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              Meta: {rule.meta_template_name || "we_miss_you"}
                              {rule.meta_template_status && (
                                <span
                                  className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase font-bold tracking-wider ${
                                    rule.meta_template_status === "APPROVED"
                                      ? "bg-emerald-200 text-emerald-900"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {rule.meta_template_status}
                                </span>
                              )}
                            </Badge>
                          </div>

                          {/* Message Preview Box */}
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 font-sans whitespace-pre-wrap line-clamp-3">
                            {rule.message_template}
                          </div>

                          {/* Stats / Audit Bar */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Send className="w-3.5 h-3.5 text-emerald-600" />
                              Total Sent: <strong>{rule.total_sent}</strong>
                            </span>
                            <span className="flex items-center gap-1 text-slate-500">
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                              {rule.cooldown_days}d Anti-Spam
                            </span>
                          </div>
                        </CardContent>

                        <CardFooter className="pt-2 pb-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              fetchAudiencePreview(rule)
                              toast.info("Calculating today's matching clients...")
                            }}
                            className="text-xs h-8 text-slate-700 gap-1.5"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Audience
                          </Button>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRunSmartRuleNow(rule.id)}
                              disabled={isRunning}
                              className="text-xs h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5 font-medium"
                            >
                              {isRunning ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-emerald-700" />
                              )}
                              Run Now
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSmartRule(rule.id)}
                              className="text-xs h-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>
              )}
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
                        {renderPreviewText(rule.template || (rule as any).template_text || "")}
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
          {/* TAB 3: META TEMPLATE STUDIO (OFFICIAL META WABA TEMPLATES) */}
          {/* ============================================================ */}
          <TabsContent value="meta-templates" className="space-y-6 m-0">
            {/* Top Bar with KPI Metrics & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Meta Template Studio
                  </h2>
                  <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                    Official Meta WABA
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 max-w-xl">
                  Design, manage, and synchronize verified WhatsApp Business templates with Meta and Fonada. Messages use pre-approved templates for guaranteed deliverability.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="outline"
                  onClick={handleSyncTemplates}
                  disabled={syncingTemplates}
                  className="gap-2 text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs h-9"
                >
                  <RefreshCw className={syncingTemplates ? "w-3.5 h-3.5 animate-spin text-emerald-600" : "w-3.5 h-3.5 text-slate-500"} />
                  {syncingTemplates ? "Syncing..." : "Sync from Meta"}
                </Button>
                <Button
                  onClick={() => setIsCreateTemplateModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-semibold shadow-xs h-9"
                >
                  <Plus className="w-4 h-4" />
                  + Create Template
                </Button>
              </div>
            </div>

            {/* Quick KPI Stats & Filter Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card
                onClick={() => setTemplateStatusFilter("ALL")}
                className={`border cursor-pointer transition-all ${
                  templateStatusFilter === "ALL"
                    ? "border-emerald-500 bg-emerald-50/30 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-slate-500">Total Templates</p>
                    <p className="text-lg font-bold text-slate-900">{templateCounts.total}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>

              <Card
                onClick={() => setTemplateStatusFilter("APPROVED")}
                className={`border cursor-pointer transition-all ${
                  templateStatusFilter === "APPROVED"
                    ? "border-emerald-500 bg-emerald-50/40 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-emerald-700">Approved by Meta</p>
                    <p className="text-lg font-bold text-emerald-800">{templateCounts.approved}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>

              <Card
                onClick={() => setTemplateStatusFilter("PENDING")}
                className={`border cursor-pointer transition-all ${
                  templateStatusFilter === "PENDING"
                    ? "border-amber-500 bg-amber-50/40 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-amber-700">Under Review</p>
                    <p className="text-lg font-bold text-amber-800">{templateCounts.pending}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>

              <Card
                onClick={() => setTemplateStatusFilter("REJECTED")}
                className={`border cursor-pointer transition-all ${
                  templateStatusFilter === "REJECTED"
                    ? "border-rose-500 bg-rose-50/40 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-rose-700">Rejected</p>
                    <p className="text-lg font-bold text-rose-800">{templateCounts.rejected}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter & Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  className="pl-8 text-xs bg-slate-50 border-slate-200 h-8"
                  placeholder="Filter templates by name or content..."
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {(["ALL", "APPROVED", "PENDING", "REJECTED"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setTemplateStatusFilter(status)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                        templateStatusFilter === status
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                {/* Category Filter Select */}
                <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
                  <SelectTrigger className="h-8 text-xs bg-white w-[130px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Templates Grid */}
            {filteredMetaTemplates.length === 0 ? (
              <Card className="border-slate-200 shadow-xs bg-white text-center py-12">
                <CardContent className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">No matching templates found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try adjusting your status or category filters, or sync the latest templates from your Meta Business Manager.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTemplateStatusFilter("ALL")
                        setTemplateCategoryFilter("ALL")
                        setTemplateSearchQuery("")
                      }}
                      className="text-xs"
                    >
                      Reset Filters
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsCreateTemplateModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredMetaTemplates.map((tpl) => {
                  const headerComp = tpl.components?.find((c) => c.type === "HEADER")
                  const bodyComp = tpl.components?.find((c) => c.type === "BODY")
                  const footerComp = tpl.components?.find((c) => c.type === "FOOTER")
                  const buttonsComp = tpl.components?.find((c) => c.type === "BUTTONS")
                  const buttons = buttonsComp?.buttons || []

                  const isApproved = tpl.status === "APPROVED"
                  const isPending = tpl.status === "PENDING"
                  const isRejected = tpl.status === "REJECTED"

                  return (
                    <Card
                      key={tpl.id || tpl.name}
                      className="border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden bg-white"
                    >
                      {/* Top Header */}
                      <CardHeader className="p-4 pb-3 border-b border-slate-100 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate">
                                {tpl.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {/* Category Badge */}
                              {tpl.category === "UTILITY" ? (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-semibold px-1.5 py-0">
                                  UTILITY
                                </Badge>
                              ) : tpl.category === "MARKETING" ? (
                                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 font-semibold px-1.5 py-0">
                                  MARKETING
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-semibold px-1.5 py-0">
                                  {tpl.category}
                                </Badge>
                              )}

                              {/* Language Badge */}
                              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 font-mono px-1.5 py-0">
                                {tpl.language}
                              </Badge>

                              {/* Quality Score Indicator */}
                              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 ml-auto">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    tpl.quality_score === "GREEN" || tpl.quality_score === "HIGH"
                                      ? "bg-emerald-500"
                                      : tpl.quality_score === "YELLOW" || tpl.quality_score === "MEDIUM"
                                      ? "bg-amber-500"
                                      : tpl.quality_score === "RED" || tpl.quality_score === "LOW"
                                      ? "bg-rose-500"
                                      : "bg-slate-300"
                                  }`}
                                />
                                {tpl.quality_score || "Standard"}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {isApproved ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold gap-1 hover:bg-emerald-50">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Approved
                              </Badge>
                            ) : isPending ? (
                              <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold gap-1 hover:bg-amber-50">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Pending
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold gap-1 hover:bg-rose-50">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                Rejected
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {/* Content Preview */}
                      <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          {headerComp?.text && (
                            <p className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1">
                              {headerComp.text}
                            </p>
                          )}

                          <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                            {renderHighlightedBody(bodyComp?.text || "No body text available")}
                          </div>

                          {footerComp?.text && (
                            <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100">
                              {footerComp.text}
                            </p>
                          )}
                        </div>

                        {/* Buttons Pills */}
                        {buttons.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                              Interactive Buttons ({buttons.length})
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {buttons.map((btn: any, bIdx: number) => (
                                <span
                                  key={bIdx}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"
                                >
                                  {btn.type === "URL" ? (
                                    <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                                  ) : btn.type === "PHONE_NUMBER" ? (
                                    <Phone className="w-2.5 h-2.5 text-slate-500" />
                                  ) : (
                                    <MessageSquare className="w-2.5 h-2.5 text-slate-500" />
                                  )}
                                  {btn.text}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Rejection alert */}
                        {isRejected && tpl.rejection_reason && (
                          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 mt-2">
                            <strong>Meta Feedback:</strong> {tpl.rejection_reason}
                          </div>
                        )}
                      </CardContent>

                      {/* Card Action Footer */}
                      <CardFooter className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckStatus(tpl)}
                          disabled={checkingStatusName === tpl.name}
                          className="h-7 text-[11px] font-semibold gap-1 px-2.5 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 flex-1"
                        >
                          <RefreshCw className={checkingStatusName === tpl.name ? "w-3 h-3 animate-spin text-emerald-600" : "w-3 h-3 text-slate-500"} />
                          Check Status
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewingTemplate(tpl)}
                          className="h-7 text-[11px] font-semibold gap-1 px-2.5 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 flex-1"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          Preview
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(tpl)}
                          disabled={deletingTemplateName === tpl.name}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ============================================================ */}
          {/* TAB 4: OUTBOUND DELIVERY LOGS & ANALYTICS */}
          {/* ============================================================ */}
          <TabsContent value="analytics" className="space-y-6 m-0">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-1">
                  <span className="text-xs font-medium text-slate-500">Messages Sent Today</span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-black text-slate-900">
                      {analytics?.totalSentToday ?? 0}
                    </h3>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      Live
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">Total All Time: {analytics?.totalSentAllTime ?? 0}</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-1">
                  <span className="text-xs font-medium text-slate-500">Delivery Rate</span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-black text-emerald-600">
                      {analytics?.deliveryRate ?? 0}%
                    </h3>
                    <CheckCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {analytics?.deliveredCount ?? 0} delivered / {analytics?.failedCount ?? 0} failed
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-1">
                  <span className="text-xs font-medium text-slate-500">Read / Open Rate</span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-black text-blue-600">
                      {analytics?.readRate ?? 0}%
                    </h3>
                    <CheckCheck className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-[11px] text-slate-400">{analytics?.readCount ?? 0} marked read</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-1">
                  <span className="text-xs font-medium text-slate-500">Click-Through Rate</span>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-black text-purple-600">
                      {analytics?.clickRate ?? 0}%
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
              Dispatches an immediate message through your configured Hanva WABA gateway to your mobile phone.
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
                The message will be transmitted directly via Hanva WABA API and logged in your Outbound Analytics table.
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

      {/* ============================================================ */}
      {/* DIALOG 3: AI SMART CAMPAIGN BUILDER & AUDIENCE PREVIEW */}
      {/* ============================================================ */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Configure Automated WhatsApp Campaign
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Review schedule, target audience, and Meta Template Studio linking. Hanva Billing automatically scans and dispatches via Meta Cloud API daily.
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-5 py-3">
            {/* Left Column: Rule Parameters & Meta Template Studio Settings */}
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="camp-name" className="text-xs font-semibold text-slate-700">Campaign Name</Label>
                <Input
                  id="camp-name"
                  value={currentDraft.name}
                  onChange={(e) => {
                    const newName = e.target.value
                    setCurrentDraft((prev) => ({
                      ...prev,
                      name: newName,
                      meta_template_name:
                        !prev.meta_template_name || prev.meta_template_name === generateMetaTemplateName(prev.name)
                          ? generateMetaTemplateName(newName)
                          : prev.meta_template_name,
                    }))
                  }}
                  placeholder="e.g. 30-Day Hair Color Touchup"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Trigger Event</Label>
                  <Select
                    value={currentDraft.trigger_type}
                    onValueChange={(val: CampaignTriggerType) => {
                      const updated = { ...currentDraft, trigger_type: val }
                      setCurrentDraft(updated)
                      fetchAudiencePreview(updated)
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days_after_service">Days After Service</SelectItem>
                      <SelectItem value="days_since_last_visit">Days Inactive (Winback)</SelectItem>
                      <SelectItem value="days_before_birthday">Before Birthday</SelectItem>
                      <SelectItem value="high_spender_followup">VIP High Spender</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Days Count</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={currentDraft.trigger_days}
                    onChange={(e) => {
                      const updated = { ...currentDraft, trigger_days: parseInt(e.target.value) || 30 }
                      setCurrentDraft(updated)
                      fetchAudiencePreview(updated)
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {currentDraft.trigger_type === "days_after_service" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Service Filter Keywords</Label>
                  <Input
                    placeholder="e.g. Hair Color, Highlights, Balayage"
                    value={currentDraft.service_names.join(", ")}
                    onChange={(e) => {
                      const names = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                      const updated = { ...currentDraft, service_names: names }
                      setCurrentDraft(updated)
                      fetchAudiencePreview(updated)
                    }}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-slate-500">Comma-separated. Leave empty to target all services.</p>
                </div>
              )}

              {currentDraft.trigger_type === "high_spender_followup" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Minimum Bill Amount (₹)</Label>
                  <Input
                    type="number"
                    value={currentDraft.min_spend || 2000}
                    onChange={(e) => {
                      const updated = { ...currentDraft, min_spend: parseInt(e.target.value) || 0 }
                      setCurrentDraft(updated)
                      fetchAudiencePreview(updated)
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Promo / Coupon Code</Label>
                  <Input
                    placeholder="e.g. TOUCHUP10"
                    value={currentDraft.coupon_code || ""}
                    onChange={(e) => setCurrentDraft((prev) => ({ ...prev, coupon_code: e.target.value }))}
                    className="h-9 text-xs uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Send Time (IST)</Label>
                  <Input
                    type="time"
                    value={currentDraft.send_time}
                    onChange={(e) => setCurrentDraft((prev) => ({ ...prev, send_time: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Anti-Spam Protections */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Anti-Spam Frequency Cap
                  </span>
                  <span className="text-[11px] text-slate-500">{currentDraft.cooldown_days} Days Cooldown</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-600 text-[11px]">Exclude clients with active bookings</span>
                  <Switch
                    checked={currentDraft.exclude_active_bookings}
                    onCheckedChange={(val) => setCurrentDraft((prev) => ({ ...prev, exclude_active_bookings: val }))}
                  />
                </div>
              </div>

              {/* Meta Template Studio Delivery Integration */}
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Meta Template Studio Integration
                  </span>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] uppercase font-semibold tracking-wider">
                    Cloud API Ready
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  WhatsApp Cloud API requires approved templates for outbound messages. This campaign will automatically link to and push to <strong>Meta Template Studio</strong>.
                </p>

                <div className="space-y-1">
                  <Label htmlFor="meta-tmpl-name" className="text-[11px] font-semibold text-emerald-900 flex items-center justify-between">
                    <span>Meta Template Identifier</span>
                    <span className="font-mono text-[10px] text-emerald-700">lowercase snake_case</span>
                  </Label>
                  <Input
                    id="meta-tmpl-name"
                    value={currentDraft.meta_template_name || generateMetaTemplateName(currentDraft.name)}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40)
                      setCurrentDraft((prev) => ({ ...prev, meta_template_name: val }))
                    }}
                    placeholder="e.g. hair_color_touchup_30d"
                    className="h-8 text-xs font-mono bg-white border-emerald-300 focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-emerald-900">Meta Category</Label>
                    <Select
                      value={currentDraft.meta_template_category || "MARKETING"}
                      onValueChange={(val: "MARKETING" | "UTILITY") =>
                        setCurrentDraft((prev) => ({ ...prev, meta_template_category: val }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs bg-white border-emerald-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MARKETING">Marketing (Promos)</SelectItem>
                        <SelectItem value="UTILITY">Utility (Reminders)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-emerald-900">Link Existing Template</Label>
                    <Select
                      value={currentDraft.meta_template_name || ""}
                      onValueChange={(val) => {
                        if (val === "__new__") {
                          setCurrentDraft((prev) => ({
                            ...prev,
                            meta_template_name: generateMetaTemplateName(prev.name),
                            auto_push_to_meta: true,
                          }))
                        } else {
                          setCurrentDraft((prev) => ({
                            ...prev,
                            meta_template_name: val,
                            auto_push_to_meta: false,
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white border-emerald-300 truncate">
                        <SelectValue placeholder="Auto-push new or pick..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__new__">✨ Auto-push New to Meta Studio</SelectItem>
                        {metaTemplates.map((t) => (
                          <SelectItem key={t.id || t.name} value={t.name}>
                            {t.name} ({t.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-emerald-200/70">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-emerald-950 block">Auto-push to Meta Template Studio on save</span>
                    <span className="text-[10px] text-emerald-700 block">Submits directly to Meta Cloud API via Fonada WABA</span>
                  </div>
                  <Switch
                    checked={currentDraft.auto_push_to_meta ?? true}
                    onCheckedChange={(val) => setCurrentDraft((prev) => ({ ...prev, auto_push_to_meta: val }))}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: WhatsApp Live Message Preview & Audience Match */}
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="smart-msg-tmpl" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>WhatsApp Message Template</span>
                  <span className="text-[10px] text-emerald-700 font-normal">Use &#123;&#123;customer_name&#125;&#125;, &#123;&#123;service_name&#125;&#125;</span>
                </Label>
                <Textarea
                  id="smart-msg-tmpl"
                  rows={4}
                  value={currentDraft.message_template}
                  onChange={(e) => setCurrentDraft((prev) => ({ ...prev, message_template: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Simulated WhatsApp Phone Bubble */}
              <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Live WhatsApp Chat Bubble Preview
                </span>
                <div className="bg-white rounded-lg p-3 text-xs text-slate-800 shadow-xs border border-slate-200 relative">
                  <p className="whitespace-pre-wrap">
                    {currentDraft.message_template
                      .replace(/\{\{\s*customer_name\s*\}\}/gi, "Priya Sharma")
                      .replace(/\{\{\s*business_name\s*\}\}/gi, gatewayData.salonName || "Hanva Salon")
                      .replace(/\{\{\s*service_name\s*\}\}/gi, currentDraft.service_names[0] || "Hair Color")
                      .replace(/\{\{\s*booking_link\s*\}\}/gi, "https://biz.hanva.in/book/salon")
                      .replace(/\{\{\s*coupon_code\s*\}\}/gi, currentDraft.coupon_code || "SPECIAL")}
                  </p>
                  <div className="text-[9px] text-slate-400 text-right mt-1.5 flex items-center justify-end gap-1">
                    <span>10:02 AM</span>
                    <span className="text-emerald-600 font-bold">✓✓</span>
                  </div>
                </div>
              </div>

              {/* Meta Cloud API Numbered Variables Box */}
              {(() => {
                const metaConv = convertToMetaTemplateFormat(currentDraft.message_template, {
                  customer_name: "Priya Sharma",
                  business_name: gatewayData.salonName || "Hanva Salon",
                  service_name: currentDraft.service_names[0] || "Hair Color",
                  coupon_code: currentDraft.coupon_code || "SPECIAL",
                  booking_link: "https://biz.hanva.in/book/salon",
                })
                return (
                  <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        Meta Studio Template Format
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono text-emerald-300 border-emerald-500/40 bg-emerald-500/10">
                        {currentDraft.meta_template_name || generateMetaTemplateName(currentDraft.name)}
                      </Badge>
                    </div>

                    <div className="bg-slate-950 rounded-lg p-2.5 font-mono text-[11px] text-slate-300 border border-slate-800 whitespace-pre-wrap leading-relaxed">
                      {metaConv.metaBodyText}
                    </div>

                    {metaConv.variableOrder.length > 0 && (
                      <div className="pt-1 border-t border-slate-800 flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium py-0.5">Parameters:</span>
                        {metaConv.variableOrder.map((varKey, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-300 font-mono"
                          >
                            &#123;&#123;{idx + 1}&#125;&#125; → {varKey}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span>Verified Meta Fallback: <strong className="text-slate-200">we_miss_you</strong></span>
                      <span className="text-emerald-400 font-medium">✓ Zero message drops</span>
                    </div>
                  </div>
                )
              })()}

              {/* Live Matching Audience Box in Slate Grey & Emerald */}
              <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Today&apos;s Matching Audience
                  </span>
                  {isPreviewLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">
                      {audiencePreview?.matchingCount || 0} Clients Match Today
                    </Badge>
                  )}
                </div>

                {audiencePreview && audiencePreview.matchingCount > 0 ? (
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <p className="font-medium text-white">Sample clients who will receive this message:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                      {audiencePreview.sampleCustomers.map((c) => (
                        <li key={c.id}>
                          <strong>{c.name}</strong> ({c.phone}) - {c.service_name} on {c.booking_date}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    No clients match today&apos;s date window. As clients reach the {currentDraft.trigger_days}-day mark, they will automatically be messaged every morning!
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={isSavingRule}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
            >
              {isSavingRule && <RefreshCw className="w-4 h-4 animate-spin" />}
              Save & Activate Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL: CREATE META TEMPLATE WITH LIVE REALTIME PREVIEW */}
      {/* ============================================================ */}
      <Dialog open={isCreateTemplateModalOpen} onOpenChange={setIsCreateTemplateModalOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6 border-slate-200">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Create New Meta WhatsApp Template
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Compose a compliant WhatsApp template and submit it directly to Meta for official approval.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left Column: Form Fields */}
            <div className="lg:col-span-7 space-y-4">
              {/* ✨ AI One-Click Template Generator with Google Gemini */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border border-emerald-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    AI Template Copywriter (Google Gemini 3.5 Flash)
                  </span>
                  <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 border-emerald-300">
                    Free • 1-Click
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    className="text-xs bg-white border-slate-200 h-9"
                    placeholder="e.g. 20% festive discount on hair spa & facial valid till Sunday..."
                    value={aiPromptText}
                    onChange={(e) => setAiPromptText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleGenerateAiTemplate()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => handleGenerateAiTemplate()}
                    disabled={isGeneratingAiTemplate || !aiPromptText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 gap-1.5 h-9 px-3.5 shadow-xs"
                  >
                    {isGeneratingAiTemplate ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isGeneratingAiTemplate ? "Drafting..." : "Generate with AI"}
                  </Button>
                </div>
                {/* Quick Idea Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
                  {[
                    "Festive 25% Off Haircare",
                    "Root Touchup 30-Day Check",
                    "Keratin Care Followup",
                    "VIP Guest Thank You",
                    "We Miss You Win-back",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setAiPromptText(chip)
                        handleGenerateAiTemplate(chip)
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Name */}
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name" className="text-xs font-semibold text-slate-700">
                  Template Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="tpl-name"
                  className="font-mono text-xs bg-white"
                  placeholder="e.g. spring_special_offer"
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                    })
                  }
                />
                <p className="text-[11px] text-slate-500">
                  Only lowercase letters, numbers, and underscores (e.g. <code className="text-slate-700 font-mono">booking_created</code>).
                </p>
              </div>

              {/* Category & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Category</Label>
                  <Select
                    value={templateForm.category}
                    onValueChange={(val: "UTILITY" | "MARKETING") =>
                      setTemplateForm({ ...templateForm, category: val })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTILITY">Utility (Transactional & Confirmations)</SelectItem>
                      <SelectItem value="MARKETING">Marketing (Promotions & Re-engagement)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Language</Label>
                  <Select
                    value={templateForm.language}
                    onValueChange={(val) => setTemplateForm({ ...templateForm, language: val })}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_US">English (US) - en_US</SelectItem>
                      <SelectItem value="en">English (UK) - en</SelectItem>
                      <SelectItem value="hi_IN">Hindi (India) - hi_IN</SelectItem>
                      <SelectItem value="hi">Hindi - hi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Header Text (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="tpl-header" className="text-xs font-semibold text-slate-700">
                  Header Text <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="tpl-header"
                  className="text-xs bg-white font-medium"
                  placeholder="e.g. Special Privilege For You ✨"
                  value={templateForm.headerText || ""}
                  onChange={(e) => setTemplateForm({ ...templateForm, headerText: e.target.value })}
                />
              </div>

              {/* Body Text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tpl-body" className="text-xs font-semibold text-slate-700">
                    Message Body Text <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    {templateForm.bodyText.length} characters
                  </span>
                </div>
                <Textarea
                  id="tpl-body"
                  rows={5}
                  className="text-xs sm:text-sm bg-white font-sans leading-relaxed resize-y"
                  placeholder="Hi {{1}}! Your appointment at {{2}} is confirmed..."
                  value={templateForm.bodyText}
                  onChange={(e) => setTemplateForm({ ...templateForm, bodyText: e.target.value })}
                />

                {/* Variable insertion buttons */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-500 mr-1">Insert variable:</span>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setTemplateForm({
                          ...templateForm,
                          bodyText: `${templateForm.bodyText} {{${num}}}`,
                        })
                      }
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      + {"{{"}{num}{"}}"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sample Variable Values */}
              {Array.from(new Set(templateForm.bodyText.match(/\{\{(\d+)\}\}/g) || [])).length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Sample Variable Values (Required by Meta for Review)
                    </Label>
                    <span className="text-[10px] text-slate-500">Live preview below</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Array.from(new Set(templateForm.bodyText.match(/\{\{(\d+)\}\}/g) || []))
                      .sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")))
                      .map((vTag) => {
                        const num = vTag.replace(/[^0-9]/g, "")
                        return (
                          <div key={vTag} className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded border border-emerald-300 shrink-0">
                              {vTag}
                            </span>
                            <Input
                              className="h-8 text-xs bg-white"
                              placeholder={`Sample for ${vTag}`}
                              value={templateForm.sampleValues?.[num] || ""}
                              onChange={(e) => {
                                setTemplateForm({
                                  ...templateForm,
                                  sampleValues: {
                                    ...(templateForm.sampleValues || {}),
                                    [num]: e.target.value,
                                  },
                                })
                              }}
                            />
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Footer Text (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="tpl-footer" className="text-xs font-semibold text-slate-700">
                  Footer Text <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="tpl-footer"
                  className="text-xs bg-white text-slate-500 italic"
                  placeholder="e.g. Reply STOP to opt out"
                  value={templateForm.footerText || ""}
                  onChange={(e) => setTemplateForm({ ...templateForm, footerText: e.target.value })}
                />
              </div>

              {/* Button Configuration (Up to 3) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    Call-to-Action Buttons (Up to 3)
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    {templateForm.buttons?.length || 0} of 3 added
                  </span>
                </div>

                <div className="space-y-2">
                  {templateForm.buttons?.map((btn, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">
                          Button #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTemplateForm({
                              ...templateForm,
                              buttons: templateForm.buttons?.filter((_, i) => i !== idx),
                            })
                          }}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Select
                          value={btn.type}
                          onValueChange={(val: "QUICK_REPLY" | "URL" | "PHONE_NUMBER") => {
                            const next = [...(templateForm.buttons || [])]
                            next[idx] = { ...next[idx], type: val }
                            setTemplateForm({ ...templateForm, buttons: next })
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="QUICK_REPLY">Quick Reply (Text response)</SelectItem>
                            <SelectItem value="URL">Visit Website (URL)</SelectItem>
                            <SelectItem value="PHONE_NUMBER">Call Phone Number</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          className="h-8 text-xs bg-white font-medium"
                          placeholder="Button label text"
                          value={btn.text}
                          onChange={(e) => {
                            const next = [...(templateForm.buttons || [])]
                            next[idx] = { ...next[idx], text: e.target.value }
                            setTemplateForm({ ...templateForm, buttons: next })
                          }}
                        />
                      </div>

                      {btn.type === "URL" && (
                        <Input
                          className="h-8 text-xs bg-white font-mono"
                          placeholder="https://biz.hanva.in"
                          value={btn.url || ""}
                          onChange={(e) => {
                            const next = [...(templateForm.buttons || [])]
                            next[idx] = { ...next[idx], url: e.target.value }
                            setTemplateForm({ ...templateForm, buttons: next })
                          }}
                        />
                      )}

                      {btn.type === "PHONE_NUMBER" && (
                        <Input
                          className="h-8 text-xs bg-white font-mono"
                          placeholder="+917965373459"
                          value={btn.phone_number || ""}
                          onChange={(e) => {
                            const next = [...(templateForm.buttons || [])]
                            next[idx] = { ...next[idx], phone_number: e.target.value }
                            setTemplateForm({ ...templateForm, buttons: next })
                          }}
                        />
                      )}
                    </div>
                  ))}

                  {(!templateForm.buttons || templateForm.buttons.length < 3) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTemplateForm({
                          ...templateForm,
                          buttons: [
                            ...(templateForm.buttons || []),
                            { type: "QUICK_REPLY", text: "Confirm" },
                          ],
                        })
                      }}
                      className="w-full text-xs font-semibold border-dashed border-slate-300 text-slate-600 hover:text-slate-900 gap-1.5 h-8"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Button
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Live WhatsApp Mobile Chat Preview */}
            <div className="lg:col-span-5 bg-slate-900 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span className="text-xs font-bold text-slate-200 tracking-wide">
                      Live WhatsApp Chat Preview
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                    Realtime Render
                  </Badge>
                </div>

                {/* Phone Simulator Frame */}
                <div className="rounded-xl overflow-hidden border border-slate-700/80 shadow-2xl bg-[#ECE5DD]">
                  {/* WhatsApp Chat Top Header Bar */}
                  <div className="bg-[#075E54] px-3.5 py-2.5 flex items-center justify-between text-white shadow-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        H
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-xs text-white truncate">
                            {gatewayData.salonName || "Hanva Luxury Salon"}
                          </span>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 fill-emerald-400 text-slate-900 shrink-0" />
                        </div>
                        <p className="text-[9px] text-emerald-100/80 truncate">Official Business Account</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-white/90">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Chat Messages Area with WhatsApp Chat Wallpaper Pattern */}
                  <div className="p-4 space-y-2.5 min-h-[300px] flex flex-col justify-start">
                    {/* Date Divider Chip */}
                    <div className="text-center">
                      <span className="bg-white/80 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md shadow-2xs">
                        TODAY
                      </span>
                    </div>

                    {/* WhatsApp Message Bubble */}
                    <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm border border-slate-200/80 space-y-2 max-w-[94%] self-start relative">
                      {/* Header Text */}
                      {templateForm.headerText?.trim() && (
                        <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 leading-snug">
                          {templateForm.headerText.trim()}
                        </div>
                      )}

                      {/* Body Text with Live Variable Replacement */}
                      <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {renderMetaTemplatePreview(templateForm.bodyText, templateForm.sampleValues)}
                      </div>

                      {/* Footer Text */}
                      {templateForm.footerText?.trim() && (
                        <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                          {templateForm.footerText.trim()}
                        </div>
                      )}

                      {/* Timestamp and Read Status */}
                      <div className="text-[9px] text-slate-400 text-right flex items-center justify-end gap-1 font-mono pt-0.5">
                        <span>10:45 AM</span>
                        <CheckCheck className="w-3 h-3 text-blue-500 inline" />
                      </div>
                    </div>

                    {/* Interactive Action Buttons Attached Below Bubble */}
                    {templateForm.buttons && templateForm.buttons.length > 0 && (
                      <div className="space-y-1 max-w-[94%] self-start w-full">
                        {templateForm.buttons.map((btn, bIdx) => (
                          <div
                            key={bIdx}
                            className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            {btn.type === "URL" ? (
                              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                            ) : btn.type === "PHONE_NUMBER" ? (
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>{btn.text || "Button Action"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px] leading-relaxed">
                <span className="font-semibold text-emerald-400 flex items-center gap-1 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Meta Approval Review:
                </span>
                Submitted templates are typically reviewed by Meta in <strong>5 to 60 minutes</strong>. Once approved, the template status will switch to <strong>Approved</strong>.
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateTemplateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitTemplate}
              disabled={isSubmittingTemplate}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
            >
              {isSubmittingTemplate ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit Template to Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL: PREVIEW EXISTING META TEMPLATE */}
      {/* ============================================================ */}
      {previewingTemplate && (
        <Dialog open={!!previewingTemplate} onOpenChange={(open) => !open && setPreviewingTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6 border-slate-200">
            <DialogHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Template: {previewingTemplate.name}
                    {previewingTemplate.status === "APPROVED" ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        Approved
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                        {previewingTemplate.status}
                      </Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Inspect template parameters, category, quality score, and view realistic phone render.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left Column: Metadata & Details */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Template Metadata
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Template Name</span>
                      <span className="font-mono font-semibold text-slate-800 select-all">
                        {previewingTemplate.name}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Category</span>
                      <Badge variant="outline" className="text-[10px] bg-white border-slate-300 font-semibold">
                        {previewingTemplate.category}
                      </Badge>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Language</span>
                      <span className="font-mono text-slate-800">{previewingTemplate.language}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Quality Score</span>
                      <span className="font-medium text-emerald-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        {previewingTemplate.quality_score || "GREEN"}
                      </span>
                    </div>

                    {previewingTemplate.template_id && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[11px]">Meta Template ID</span>
                        <span className="font-mono text-[11px] text-slate-700 select-all">
                          {previewingTemplate.template_id}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(previewingTemplate.name)
                        toast.success("Template name copied to clipboard!")
                      }}
                      className="w-full text-xs font-medium gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Template Name
                    </Button>
                  </div>
                </div>

                {/* Raw Body Content */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Template Raw Copy</Label>
                  <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed select-all">
                    {previewingTemplate.components?.find((c) => c.type === "BODY")?.text || "No text"}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Mobile Preview */}
              <div className="lg:col-span-6 bg-slate-900 p-5 rounded-2xl flex flex-col justify-start space-y-3">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  Live Phone Preview
                </span>

                <div className="rounded-xl overflow-hidden border border-slate-700/80 shadow-2xl bg-[#ECE5DD]">
                  {/* WhatsApp Top Header Bar */}
                  <div className="bg-[#075E54] px-3.5 py-2.5 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        H
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-xs text-white truncate">
                            {gatewayData.salonName || "Hanva Luxury Salon"}
                          </span>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 fill-emerald-400 text-slate-900 shrink-0" />
                        </div>
                        <p className="text-[9px] text-emerald-100/80 truncate">Official Business Account</p>
                      </div>
                    </div>
                  </div>

                  {/* Bubble */}
                  <div className="p-4 space-y-2 min-h-[220px] flex flex-col justify-start">
                    <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm border border-slate-200/80 space-y-1.5 max-w-[94%] self-start">
                      {previewingTemplate.components?.find((c) => c.type === "HEADER")?.text && (
                        <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1">
                          {previewingTemplate.components?.find((c) => c.type === "HEADER")?.text}
                        </div>
                      )}

                      <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {renderMetaTemplatePreview(
                          previewingTemplate.components?.find((c) => c.type === "BODY")?.text || "",
                          extractSampleValuesFromTemplate(previewingTemplate)
                        )}
                      </div>

                      {previewingTemplate.components?.find((c) => c.type === "FOOTER")?.text && (
                        <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                          {previewingTemplate.components?.find((c) => c.type === "FOOTER")?.text}
                        </div>
                      )}

                      <div className="text-[9px] text-slate-400 text-right flex items-center justify-end gap-1 font-mono pt-0.5">
                        <span>10:45 AM</span>
                        <CheckCheck className="w-3 h-3 text-blue-500 inline" />
                      </div>
                    </div>

                    {/* Buttons */}
                    {previewingTemplate.components?.find((c) => c.type === "BUTTONS")?.buttons?.map((btn: any, idx: number) => (
                      <div
                        key={idx}
                        className="max-w-[94%] w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        {btn.type === "URL" ? (
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                        ) : btn.type === "PHONE_NUMBER" ? (
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>{btn.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewingTemplate(null)}
              >
                Close Preview
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  handleCheckStatus(previewingTemplate)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Check Approval Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
