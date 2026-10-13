"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Sparkles,
  Bot,
  Play,
  Trash2,
  Clock,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Gift,
  HeartHandshake,
  Star,
  Settings2,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Plus,
  ShieldCheck,
  Tag,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

import {
  SmartCampaignRule,
  SmartCampaignLog,
  AudiencePreviewResult,
  getSmartCampaignRules,
  parseCampaignPromptWithAi,
  previewCampaignAudience,
  createSmartCampaignRule,
  toggleSmartCampaignRule,
  deleteSmartCampaignRule,
  runSmartCampaignRuleNow,
  getSmartCampaignLogs,
} from "@/app/actions/smart-campaigns";
import {
  SmartCampaignRuleDraft,
  PRESET_SALON_RECIPES,
  CampaignTriggerType,
} from "@/lib/ai-campaign-parser";
import {
  getAutomations,
  createAutomation,
  updateAutomation,
  MarketingAutomation,
} from "@/app/actions/automations";

const DEFAULT_SYSTEM_AUTOMATIONS = [
  {
    name: "Birthday Greeting",
    trigger_type: "birthday",
    channel: "whatsapp",
    message_template:
      "Hi {customer_name}, wishing you a very Happy Birthday! Enjoy 15% off your next visit with code BDAY15. 🎂🎉",
    icon: Gift,
    color: "text-pink-500",
    bg: "bg-pink-100",
    description: "Sends birthday treat & loyalty points automatically on their birthday morning.",
  },
  {
    name: "Win-back 45 Days",
    trigger_type: "winback",
    channel: "whatsapp",
    message_template:
      "Hi {customer_name}, we miss you at our salon! It has been 45 days since your last visit. Book your next pampering session and enjoy 10% off. 💛",
    icon: HeartHandshake,
    color: "text-blue-500",
    bg: "bg-blue-100",
    description: "Re-engages clients who haven't booked in over 45 days.",
  },
  {
    name: "Post-appointment Review",
    trigger_type: "post_appointment",
    channel: "whatsapp",
    message_template:
      "Hi {customer_name}, thanks for visiting us today! How was your experience? Please take a moment to rate us on Google: https://maps.google.com ⭐",
    icon: Star,
    color: "text-yellow-500",
    bg: "bg-yellow-100",
    description: "Requests a 5-star Google review 30 minutes after checkout.",
  },
];

export default function MarketingAutomationsPage() {
  const [activeTab, setActiveTab] = useState("smart-ai");

  // Smart AI campaigns state
  const [smartRules, setSmartRules] = useState<SmartCampaignRule[]>([]);
  const [smartLogs, setSmartLogs] = useState<SmartCampaignLog[]>([]);
  const [isRulesLoading, setIsRulesLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // AI prompt creator state
  const [promptInput, setPromptInput] = useState("");
  const [isAiParsing, setIsAiParsing] = useState(false);

  // Create / Edit modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<SmartCampaignRuleDraft>({
    name: "",
    prompt_input: "",
    trigger_type: "days_after_service",
    trigger_days: 30,
    service_names: ["Hair Color"],
    message_template: "",
    coupon_code: "",
    send_time: "10:00",
    cooldown_days: 14,
    exclude_active_bookings: true,
    is_enabled: true,
  });
  const [isSavingRule, setIsSavingRule] = useState(false);

  // Audience preview state
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreviewResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Manual run state
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null);

  // System automations state
  const [systemAutomations, setSystemAutomations] = useState<MarketingAutomation[]>([]);
  const [isSystemSaving, setIsSystemSaving] = useState(false);
  const [editingSystem, setEditingSystem] = useState<MarketingAutomation | null>(null);
  const [isSystemDialogOpen, setIsSystemDialogOpen] = useState(false);
  const [systemForm, setSystemForm] = useState({ name: "", channel: "whatsapp", message_template: "" });

  useEffect(() => {
    loadSmartRules();
    loadSystemAutomations();
  }, []);

  const loadSmartRules = async () => {
    setIsRulesLoading(true);
    try {
      const res = await getSmartCampaignRules();
      if (res.success && res.data) {
        setSmartRules(res.data);
      }
    } catch {
      toast.error("Failed to load campaign rules");
    } finally {
      setIsRulesLoading(false);
    }
  };

  const loadLogs = async () => {
    setIsLogsLoading(true);
    try {
      const res = await getSmartCampaignLogs();
      if (res.success && res.data) {
        setSmartLogs(res.data);
      }
    } catch {
      toast.error("Failed to load execution logs");
    } finally {
      setIsLogsLoading(false);
    }
  };

  const loadSystemAutomations = async () => {
    try {
      const res = await getAutomations();
      if (res.success && res.data) {
        setSystemAutomations(res.data);
      }
    } catch {
      // ignore
    }
  };

  // AI Prompt Parser Handler
  const handleParsePrompt = async (textToParse?: string) => {
    const text = textToParse || promptInput;
    if (!text.trim()) {
      toast.error("Please enter what you want to automate");
      return;
    }

    setIsAiParsing(true);
    try {
      const res = await parseCampaignPromptWithAi(text);
      if (res.success && res.draft) {
        setCurrentDraft(res.draft);
        setIsCreateModalOpen(true);
        // Automatically calculate audience preview
        fetchAudiencePreview(res.draft);
      } else {
        toast.error("Could not parse prompt. Please try again.");
      }
    } catch {
      toast.error("AI parser error");
    } finally {
      setIsAiParsing(false);
    }
  };

  // Preset Recipe Click Handler
  const handleSelectRecipe = (draft: SmartCampaignRuleDraft) => {
    setCurrentDraft(draft);
    setIsCreateModalOpen(true);
    fetchAudiencePreview(draft);
  };

  // Live Audience Preview Fetcher
  const fetchAudiencePreview = async (draft: SmartCampaignRuleDraft) => {
    setIsPreviewLoading(true);
    try {
      const res = await previewCampaignAudience(draft);
      if (res.success && res.preview) {
        setAudiencePreview(res.preview);
      } else {
        setAudiencePreview(null);
      }
    } catch {
      setAudiencePreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Save Rule Handler
  const handleSaveRule = async () => {
    if (!currentDraft.name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }
    if (!currentDraft.message_template.trim()) {
      toast.error("Please enter a WhatsApp message template");
      return;
    }

    setIsSavingRule(true);
    try {
      const res = await createSmartCampaignRule(currentDraft);
      if (res.success) {
        toast.success("Automated campaign created & activated!");
        setIsCreateModalOpen(false);
        setPromptInput("");
        loadSmartRules();
      } else {
        toast.error(res.error || "Failed to save rule");
      }
    } catch {
      toast.error("Error saving campaign rule");
    } finally {
      setIsSavingRule(false);
    }
  };

  // Toggle Rule Status
  const handleToggleRule = async (rule: SmartCampaignRule) => {
    const nextStatus = !rule.is_enabled;
    setSmartRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_enabled: nextStatus } : r))
    );

    try {
      const res = await toggleSmartCampaignRule(rule.id, nextStatus);
      if (res.success) {
        toast.success(nextStatus ? "Automation enabled" : "Automation paused");
      } else {
        toast.error("Failed to update status");
        loadSmartRules();
      }
    } catch {
      toast.error("Error toggling status");
      loadSmartRules();
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this automated campaign?")) return;

    try {
      const res = await deleteSmartCampaignRule(ruleId);
      if (res.success) {
        toast.success("Campaign deleted");
        setSmartRules((prev) => prev.filter((r) => r.id !== ruleId));
      } else {
        toast.error("Failed to delete campaign");
      }
    } catch {
      toast.error("Error deleting campaign");
    }
  };

  // Run Test Now
  const handleRunNow = async (ruleId: string) => {
    setRunningRuleId(ruleId);
    try {
      const res = await runSmartCampaignRuleNow(ruleId);
      if (res.success) {
        toast.success(`Automation completed! Sent to ${res.sentCount || 0} matching customer(s).`);
        loadSmartRules();
      } else {
        toast.error(res.error || "Failed to trigger campaign");
      }
    } catch {
      toast.error("Error running campaign");
    } finally {
      setRunningRuleId(null);
    }
  };

  // System Automation Toggle
  const handleToggleSystem = async (def: (typeof DEFAULT_SYSTEM_AUTOMATIONS)[0]) => {
    const current = systemAutomations.find((a) => a.trigger_type === def.trigger_type);
    if (current) {
      const newStatus = !current.is_active;
      setSystemAutomations((prev) =>
        prev.map((a) => (a.id === current.id ? { ...a, is_active: newStatus } : a))
      );
      await updateAutomation(current.id, { is_active: newStatus });
      toast.success(newStatus ? "Trigger enabled" : "Trigger disabled");
    } else {
      const res = await createAutomation({
        name: def.name,
        trigger_type: def.trigger_type,
        channel: def.channel,
        message_template: def.message_template,
        is_active: true,
      });
      if (res.success && res.data) {
        setSystemAutomations((prev) => [res.data, ...prev]);
        toast.success("Trigger enabled");
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 flex-col">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/marketing">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <PageHeader
                title="Automated WhatsApp Flows"
                description="AI-powered campaigns that automatically re-engage clients at the perfect time."
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadSmartRules();
                  if (activeTab === "logs") loadLogs();
                }}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                onClick={() => {
                  setCurrentDraft({
                    name: "Custom Salon Automation",
                    prompt_input: "",
                    trigger_type: "days_after_service",
                    trigger_days: 30,
                    service_names: [],
                    message_template:
                      "Hi {{customer_name}}! ✨ It has been 30 days since your visit to {{business_name}}. Time for your regular refresh? Book your slot: {{booking_link}}",
                    send_time: "10:00",
                    cooldown_days: 14,
                    exclude_active_bookings: true,
                    is_enabled: true,
                  });
                  setIsCreateModalOpen(true);
                  fetchAudiencePreview({
                    name: "Custom Salon Automation",
                    prompt_input: "",
                    trigger_type: "days_after_service",
                    trigger_days: 30,
                    service_names: [],
                    message_template: "",
                    send_time: "10:00",
                    cooldown_days: 14,
                    exclude_active_bookings: true,
                    is_enabled: true,
                  });
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                New Automation
              </Button>
            </div>
          </div>

          {/* AI Command Center Box */}
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 via-white to-pink-50 shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-purple-950 font-bold flex items-center gap-2">
                    AI Campaign Prompt Creator
                    <Badge className="bg-purple-600 text-white text-[10px] uppercase font-semibold">
                      Natural Language
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-purple-800 text-xs">
                    Type what you want to automate in plain English or Hindi. AI configures the schedule, audience criteria, and message template.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="e.g., Send root touch-up template to customers who took Hair Color 30 days ago with 10% coupon..."
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleParsePrompt();
                    }}
                    className="pr-10 bg-white border-purple-200 focus-visible:ring-purple-500 text-sm h-11"
                  />
                  <Sparkles className="w-4 h-4 absolute right-3 top-3.5 text-purple-400 pointer-events-none" />
                </div>
                <Button
                  onClick={() => handleParsePrompt()}
                  disabled={isAiParsing}
                  className="bg-purple-700 hover:bg-purple-800 text-white gap-2 h-11 px-5 shadow-sm"
                >
                  {isAiParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Ask AI
                </Button>
              </div>

              {/* Inspiration Quick Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                  ✨ Instant One-Tap Salon Recipes:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SALON_RECIPES.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleSelectRecipe(recipe.draft)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-purple-100 border border-purple-200 text-purple-900 transition-colors shadow-2xs"
                    >
                      <span>{recipe.icon}</span>
                      <span>{recipe.title}</span>
                      <Badge variant="outline" className="text-[9px] py-0 border-purple-300 text-purple-700 bg-purple-50">
                        {recipe.draft.trigger_days}d
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            if (val === "logs") loadLogs();
          }}>
            <TabsList className="bg-slate-200/80 p-1">
              <TabsTrigger value="smart-ai" className="gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                AI Smart Campaigns ({smartRules.length})
              </TabsTrigger>
              <TabsTrigger value="system-triggers" className="gap-2">
                <Settings2 className="w-4 h-4 text-slate-600" />
                System Triggers
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Delivery Logs
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SMART AI CAMPAIGNS */}
            <TabsContent value="smart-ai" className="space-y-4 mt-4">
              {isRulesLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : smartRules.length === 0 ? (
                <Card className="border-dashed border-2 p-12 text-center bg-white">
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-1">No AI Campaign Rules Yet</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                    Create your first automated flow above by typing a prompt or clicking one of the instant salon recipes!
                  </p>
                  <Button
                    onClick={() => handleSelectRecipe(PRESET_SALON_RECIPES[0].draft)}
                    className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                  >
                    Try 30-Day Hair Color Followup
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {smartRules.map((rule) => {
                    const isRunning = runningRuleId === rule.id;

                    return (
                      <Card
                        key={rule.id}
                        className={`transition-all duration-200 bg-white border ${
                          rule.is_enabled ? "border-purple-200 shadow-xs" : "border-slate-200 opacity-80"
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-base font-bold text-slate-900">
                                  {rule.name}
                                </CardTitle>
                                {rule.is_enabled ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Active</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">Paused</Badge>
                                )}
                              </div>
                              <CardDescription className="text-xs text-slate-500 line-clamp-1">
                                {rule.prompt_input || "Custom recurring trigger"}
                              </CardDescription>
                            </div>
                            <Switch
                              checked={rule.is_enabled}
                              onCheckedChange={() => handleToggleRule(rule)}
                            />
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3 pb-3">
                          {/* Parameter Badges */}
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">
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
                              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                                ✂️ {rule.service_names.join(", ")}
                              </Badge>
                            )}

                            {rule.coupon_code && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                                🏷️ {rule.coupon_code}
                              </Badge>
                            )}

                            <Badge variant="outline" className="bg-slate-50 text-slate-700">
                              🕒 {rule.send_time}
                            </Badge>
                          </div>

                          {/* Message Preview Box */}
                          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-lg p-3 text-xs text-slate-800 font-sans whitespace-pre-wrap line-clamp-3">
                            {rule.message_template}
                          </div>

                          {/* Stats / Audit Bar */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1">
                              <Send className="w-3.5 h-3.5 text-emerald-600" />
                              Total Sent: <strong className="text-slate-800">{rule.total_sent}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                              {rule.cooldown_days}d Anti-Spam Guard
                            </span>
                          </div>
                        </CardContent>

                        <CardFooter className="pt-2 pb-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              fetchAudiencePreview(rule);
                              toast.info("Calculating today's matching clients...");
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
                              onClick={() => handleRunNow(rule.id)}
                              disabled={isRunning}
                              className="text-xs h-8 text-purple-700 border-purple-200 hover:bg-purple-50 gap-1.5"
                            >
                              {isRunning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-purple-700" />
                              )}
                              Run Now
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: SYSTEM TRIGGERS */}
            <TabsContent value="system-triggers" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-3">
                {DEFAULT_SYSTEM_AUTOMATIONS.map((def, idx) => {
                  const current = systemAutomations.find((a) => a.trigger_type === def.trigger_type);
                  const isActive = current?.is_active || false;
                  const Icon = def.icon;

                  return (
                    <Card key={idx} className="bg-white border-slate-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${def.bg}`}>
                              <Icon className={`w-5 h-5 ${def.color}`} />
                            </div>
                            <div>
                              <CardTitle className="text-base font-bold">{def.name}</CardTitle>
                              <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] mt-1">
                                {isActive ? "Active" : "Disabled"}
                              </Badge>
                            </div>
                          </div>
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => handleToggleSystem(def)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pb-3">
                        <p className="text-xs text-slate-500">{def.description}</p>
                        <div className="bg-slate-50 border rounded-lg p-2.5 text-xs text-slate-700 line-clamp-3">
                          {current?.message_template || def.message_template}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 border-t border-slate-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSystem(current || {
                              id: "temp_" + def.trigger_type,
                              name: def.name,
                              trigger_type: def.trigger_type,
                              channel: def.channel,
                              message_template: def.message_template,
                              is_active: false,
                            });
                            setSystemForm({
                              name: def.name,
                              channel: def.channel,
                              message_template: current?.message_template || def.message_template,
                            });
                            setIsSystemDialogOpen(true);
                          }}
                          className="w-full text-xs"
                        >
                          <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                          Edit Message
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 3: DELIVERY LOGS */}
            <TabsContent value="logs" className="space-y-4 mt-4">
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">Recent Automated WhatsApp Messages</CardTitle>
                      <CardDescription className="text-xs">
                        Audit trail of scheduled automated campaign messages sent to clients.
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadLogs} className="gap-1.5 text-xs">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Refresh Logs
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLogsLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    </div>
                  ) : smartLogs.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-500">
                      No automated campaign messages have been sent yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b">
                          <tr>
                            <th className="py-2.5 px-3">Sent At</th>
                            <th className="py-2.5 px-3">Customer</th>
                            <th className="py-2.5 px-3">Phone</th>
                            <th className="py-2.5 px-3">Message Snippet</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {smartLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                                {new Date(log.sent_at).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {log.customer_name || "Valued Client"}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-mono">
                                {log.customer_phone}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                                {log.message_content}
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                  {log.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* CREATE / CUSTOMIZE SMART AUTOMATION MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-950 text-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Configure Automated WhatsApp Campaign
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review the schedule, target criteria, and message template. Hanva Billing will automatically scan and send this every day.
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-5 py-3">
            {/* Left Column: Rule Parameters */}
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="camp-name" className="text-xs font-semibold">Campaign Name</Label>
                <Input
                  id="camp-name"
                  value={currentDraft.name}
                  onChange={(e) => setCurrentDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. 30-Day Hair Color Touchup"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Trigger Event</Label>
                  <Select
                    value={currentDraft.trigger_type}
                    onValueChange={(val: CampaignTriggerType) => {
                      const updated = { ...currentDraft, trigger_type: val };
                      setCurrentDraft(updated);
                      fetchAudiencePreview(updated);
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
                  <Label className="text-xs font-semibold">Days Count</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={currentDraft.trigger_days}
                    onChange={(e) => {
                      const updated = { ...currentDraft, trigger_days: parseInt(e.target.value) || 30 };
                      setCurrentDraft(updated);
                      fetchAudiencePreview(updated);
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {currentDraft.trigger_type === "days_after_service" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Service Filter Keywords</Label>
                  <Input
                    placeholder="e.g. Hair Color, Highlights, Balayage"
                    value={currentDraft.service_names.join(", ")}
                    onChange={(e) => {
                      const names = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const updated = { ...currentDraft, service_names: names };
                      setCurrentDraft(updated);
                      fetchAudiencePreview(updated);
                    }}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-slate-500">Comma-separated. Leave empty to target all services.</p>
                </div>
              )}

              {currentDraft.trigger_type === "high_spender_followup" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Minimum Bill Amount (₹)</Label>
                  <Input
                    type="number"
                    value={currentDraft.min_spend || 2000}
                    onChange={(e) => {
                      const updated = { ...currentDraft, min_spend: parseInt(e.target.value) || 0 };
                      setCurrentDraft(updated);
                      fetchAudiencePreview(updated);
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Promo / Coupon Code</Label>
                  <Input
                    placeholder="e.g. TOUCHUP10"
                    value={currentDraft.coupon_code || ""}
                    onChange={(e) => setCurrentDraft((prev) => ({ ...prev, coupon_code: e.target.value }))}
                    className="h-9 text-xs uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Send Time (IST)</Label>
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
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
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
            </div>

            {/* Right Column: WhatsApp Live Message Preview & Audience Match */}
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="msg-tmpl" className="text-xs font-semibold flex items-center justify-between">
                  <span>WhatsApp Message Template</span>
                  <span className="text-[10px] text-purple-600 font-normal">Use &#123;&#123;customer_name&#125;&#125;, &#123;&#123;service_name&#125;&#125;</span>
                </Label>
                <Textarea
                  id="msg-tmpl"
                  rows={4}
                  value={currentDraft.message_template}
                  onChange={(e) => setCurrentDraft((prev) => ({ ...prev, message_template: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Simulated WhatsApp Phone Bubble */}
              <div className="bg-emerald-900/10 rounded-xl p-3 border border-emerald-600/20 space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Live WhatsApp Chat Bubble Preview
                </span>
                <div className="bg-white rounded-lg p-3 text-xs text-slate-800 shadow-xs border border-emerald-100 relative">
                  <p className="whitespace-pre-wrap">
                    {currentDraft.message_template
                      .replace(/\{\{\s*customer_name\s*\}\}/gi, "Priya Sharma")
                      .replace(/\{\{\s*business_name\s*\}\}/gi, "Hanva Salon")
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

              {/* Live Matching Audience Box */}
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-950 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-700" />
                    Today&apos;s Matching Audience
                  </span>
                  {isPreviewLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-700" />
                  ) : (
                    <Badge className="bg-purple-700 text-white text-xs">
                      {audiencePreview?.matchingCount || 0} Clients Match Today
                    </Badge>
                  )}
                </div>

                {audiencePreview && audiencePreview.matchingCount > 0 ? (
                  <div className="text-[11px] text-purple-900 space-y-1">
                    <p className="font-medium text-purple-950">Sample clients who will receive this message:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                      {audiencePreview.sampleCustomers.map((c) => (
                        <li key={c.id}>
                          <strong>{c.name}</strong> ({c.phone}) - {c.service_name} on {c.booking_date}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    No clients match today&apos;s date window. As clients reach the {currentDraft.trigger_days}-day mark, they will automatically be messaged every morning!
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={isSavingRule}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              {isSavingRule && <Loader2 className="w-4 h-4 animate-spin" />}
              Save & Activate Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SYSTEM TRIGGER EDIT MODAL */}
      <Dialog open={isSystemDialogOpen} onOpenChange={setIsSystemDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Customize System Trigger</DialogTitle>
            <DialogDescription className="text-xs">
              Update the message copy for this built-in trigger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label>Trigger Name</Label>
              <Input
                value={systemForm.name}
                onChange={(e) => setSystemForm((prev) => ({ ...prev, name: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp Template</Label>
              <Textarea
                rows={4}
                value={systemForm.message_template}
                onChange={(e) => setSystemForm((prev) => ({ ...prev, message_template: e.target.value }))}
                className="text-xs"
              />
              <p className="text-[10px] text-slate-500">Variables: &#123;customer_name&#125;</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSystemDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!editingSystem) return;
                setIsSystemSaving(true);
                try {
                  if (editingSystem.id.startsWith("temp_")) {
                    await createAutomation({
                      name: systemForm.name,
                      trigger_type: editingSystem.trigger_type,
                      channel: "whatsapp",
                      message_template: systemForm.message_template,
                      is_active: true,
                    });
                  } else {
                    await updateAutomation(editingSystem.id, {
                      name: systemForm.name,
                      message_template: systemForm.message_template,
                    });
                  }
                  toast.success("Saved");
                  setIsSystemDialogOpen(false);
                  loadSystemAutomations();
                } catch {
                  toast.error("Error saving");
                } finally {
                  setIsSystemSaving(false);
                }
              }}
              disabled={isSystemSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSystemSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
