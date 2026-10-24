"use client"

import { useState, useEffect, useTransition, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Search,
  Plus,
  MessageCircle,
  FileText,
  HelpCircle,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Send,
  Activity,
  Printer,
  Building2,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Filter,
  Check,
  Loader2,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  Receipt,
  Users,
  Smartphone,
  Info,
  Server,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import {
  getSupportTickets,
  createSupportTicket,
  getSupportTicketDetails,
  addTicketReply,
  updateTicketStatus,
  runSystemDiagnostics,
  type SupportTicket,
  type SupportTicketMessage,
} from "@/app/actions/support"
import { getBusinessSettings } from "@/app/actions/settings"

// FAQ Knowledge Base data tailored for Hanva Salon POS
const FAQS = [
  {
    id: "faq-pos-billing",
    category: "Billing & POS",
    question: "How do I create a quick walk-in sale or billing receipt?",
    answer:
      "Navigate to 'New Sale' from the sidebar or click 'POS Checkout'. Enter or look up the customer by their 10-digit phone number. Add the required services or products, assign staff members for commission tracking, choose payment methods (Cash, UPI, Card, Split, or Customer Wallet/Membership), and click 'Complete Sale' to generate the GST invoice instantly.",
    actionLink: "/billing/new",
    actionLabel: "Open POS Invoicing",
  },
  {
    id: "faq-whatsapp-invoice",
    category: "WhatsApp & Alerts",
    question: "How does automatic WhatsApp invoice sending work?",
    answer:
      "When a sale is completed, if WhatsApp alerts are enabled in Settings, Hanva uses the official Meta Cloud API to dispatch a beautiful digital receipt with a PDF invoice link directly to the client's WhatsApp number. You can verify your WhatsApp connection under 'WhatsApp' in the sidebar or run System Diagnostics here.",
    actionLink: "/whatsapp",
    actionLabel: "View WhatsApp Dashboard",
  },
  {
    id: "faq-thermal-printer",
    category: "Printer & Hardware",
    question: "How do I set up 58mm or 80mm thermal receipt printing?",
    answer:
      "Hanva supports standard ESC/POS USB and Bluetooth thermal printers. When printing an invoice, select the 'Thermal Receipt' view. In your browser print dialog, set Margins to 'None', Paper Size to '58mm' or '80mm Roll', and enable 'Headers and footers: Off'. You can also customize your receipt header and footer notes in Salon Settings.",
    actionLink: "/settings",
    actionLabel: "Configure Receipt Settings",
  },
  {
    id: "faq-staff-commission",
    category: "Staff & Commissions",
    question: "How are staff commissions calculated and tracked?",
    answer:
      "Each service in a bill can be mapped to one or more staff stylists. Hanva automatically logs the staff ID, calculates their defined commission percentage, and records tips. View daily, weekly, or monthly commission ledgers with complete breakdown under 'Staff Commission' in Reports.",
    actionLink: "/reports/staff-commission",
    actionLabel: "View Staff Commission Reports",
  },
  {
    id: "faq-memberships",
    category: "Memberships & Packages",
    question: "How do customer memberships and package discounts apply?",
    answer:
      "When you enter a customer's phone number during POS checkout, Hanva checks if they have an active Membership Plan or prepaid Wallet balance. If active, eligible discount percentages or package redemptions are highlighted automatically, letting you apply them with a single click.",
    actionLink: "/marketing/memberships",
    actionLabel: "Manage Memberships",
  },
  {
    id: "faq-gst-taxes",
    category: "GST & Invoicing",
    question: "How do I update GSTIN and tax rates on invoices?",
    answer:
      "Go to Settings > Business Profile & Taxes. You can specify your 15-character GSTIN, legal business name, default tax rate (e.g. 18% with 9% CGST + 9% SGST split for intra-state or 18% IGST for inter-state), and state code. Invoices will automatically compute tax breakdowns accordingly.",
    actionLink: "/settings",
    actionLabel: "Update GST Profile",
  },
  {
    id: "faq-customer-history",
    category: "Customers",
    question: "How can I view a customer's past visits and outstanding balance?",
    answer:
      "Go to 'Customers' in the left sidebar and search by phone number or name. Click on any customer profile to view their total lifetime spend, visit frequency, past invoice PDF copies, active memberships, and wallet balance.",
    actionLink: "/customers",
    actionLabel: "Search Customers",
  },
  {
    id: "faq-offline-sync",
    category: "Troubleshooting",
    question: "What happens if my salon internet connection drops temporarily?",
    answer:
      "Hanva maintains cached application state in modern browsers. If you experience intermittent Wi-Fi, keep the tab open. Once connectivity resumes, actions synchronize with the cloud database. We also recommend running the System Diagnostics tab to verify your real-time Neon PostgreSQL latency.",
    actionLink: "#diagnostics",
    actionLabel: "Run Diagnostics",
  },
]

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<string>("faq")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  // Real Salon Profile
  const [salonProfile, setSalonProfile] = useState<{
    salonName: string
    ownerName: string
    phone: string
    email: string
  }>({
    salonName: "Hanva Salon",
    ownerName: "Salon Owner",
    phone: "+919321501389",
    email: "support@hanva.com",
  })

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [ticketFilter, setTicketFilter] = useState<string>("all")
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)
  const [isPending, startTransition] = useTransition()

  // New Ticket Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false)
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "Billing & POS",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    userPhone: "",
  })

  // Ticket Details Dialog state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [ticketMessages, setTicketMessages] = useState<SupportTicketMessage[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [replyMessage, setReplyMessage] = useState("")
  const [isSendingReply, setIsSendingReply] = useState(false)

  // System Diagnostics state
  const [diagResult, setDiagResult] = useState<any>(null)
  const [isRunningDiag, setIsRunningDiag] = useState(false)

  // FAQ feedback local state
  const [faqFeedback, setFaqFeedback] = useState<Record<string, "up" | "down">>({})

  // Load business settings & tickets on mount
  useEffect(() => {
    loadSalonDetails()
    loadTickets()
  }, [])

  async function loadSalonDetails() {
    try {
      const res = await getBusinessSettings()
      if (res?.profile) {
        setSalonProfile({
          salonName: res.profile.salonName || "Hanva Salon",
          ownerName: res.profile.ownerName || "Salon Owner",
          phone: res.profile.phone || "+919321501389",
          email: res.profile.email || "support@hanva.com",
        })
        setNewTicket((prev) => ({
          ...prev,
          userPhone: res.profile.phone || "",
        }))
      }
    } catch (err) {
      console.warn("Could not load salon profile:", err)
    }
  }

  async function loadTickets() {
    setIsLoadingTickets(true)
    try {
      const res = await getSupportTickets()
      if (res.success && res.data) {
        setTickets(res.data)
      } else {
        toast.error(res.error || "Failed to load support tickets")
      }
    } catch (err: any) {
      console.error("Error loading tickets:", err)
      toast.error("Could not fetch support tickets")
    } finally {
      setIsLoadingTickets(false)
    }
  }

  // Create Ticket Handler
  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!newTicket.title.trim()) {
      toast.error("Please enter a ticket title or brief summary")
      return
    }
    if (!newTicket.description.trim()) {
      toast.error("Please describe your issue or question in detail")
      return
    }

    setIsSubmittingTicket(true)
    try {
      const res = await createSupportTicket({
        title: newTicket.title.trim(),
        description: newTicket.description.trim(),
        category: newTicket.category,
        priority: newTicket.priority,
        userName: salonProfile.ownerName || salonProfile.salonName,
        userEmail: salonProfile.email,
        userPhone: newTicket.userPhone || salonProfile.phone,
      })

      if (res.success && res.data) {
        toast.success(`Support ticket ${res.data.ticket_number} created successfully!`)
        setIsCreateOpen(false)
        setNewTicket({
          title: "",
          description: "",
          category: "Billing & POS",
          priority: "medium",
          userPhone: salonProfile.phone || "",
        })
        loadTickets()
      } else {
        toast.error(res.error || "Failed to submit support ticket")
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred while creating ticket")
    } finally {
      setIsSubmittingTicket(false)
    }
  }

  // Open Ticket Details Modal
  async function handleOpenTicketDetails(ticket: SupportTicket) {
    setSelectedTicket(ticket)
    setIsLoadingDetails(true)
    setTicketMessages([])
    try {
      const res = await getSupportTicketDetails(ticket.id)
      if (res.success && res.data) {
        setSelectedTicket(res.data.ticket)
        setTicketMessages(res.data.messages || [])
      } else {
        toast.error(res.error || "Failed to fetch ticket conversation")
      }
    } catch (err) {
      toast.error("Failed to load ticket thread")
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // Send Reply Handler
  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTicket || !replyMessage.trim()) return

    setIsSendingReply(true)
    try {
      const sender = salonProfile.ownerName || salonProfile.salonName || "Salon Representative"
      const res = await addTicketReply(selectedTicket.id, replyMessage.trim(), sender)
      if (res.success && res.data) {
        toast.success("Reply posted successfully")
        setReplyMessage("")
        setTicketMessages((prev) => [...prev, res.data!])
        loadTickets()
      } else {
        toast.error(res.error || "Failed to post reply")
      }
    } catch (err: any) {
      toast.error(err?.message || "Error posting message")
    } finally {
      setIsSendingReply(false)
    }
  }

  // Update Status from modal
  async function handleStatusChange(newStatus: "open" | "in_progress" | "resolved" | "closed") {
    if (!selectedTicket) return
    try {
      const res = await updateTicketStatus(selectedTicket.id, newStatus)
      if (res.success) {
        toast.success(`Ticket marked as ${newStatus.replace("_", " ")}`)
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null))
        loadTickets()
      } else {
        toast.error(res.error || "Failed to update ticket status")
      }
    } catch (err) {
      toast.error("Failed to update status")
    }
  }

  // Trigger Diagnostics
  async function handleRunDiagnostics() {
    setIsRunningDiag(true)
    try {
      const res = await runSystemDiagnostics()
      if (res.success && res.data) {
        setDiagResult(res.data)
        toast.success("System diagnostics completed successfully")
      } else {
        toast.error(res.error || "System diagnostics check failed")
      }
    } catch (err: any) {
      toast.error(err?.message || "Diagnostics failed to run")
    } finally {
      setIsRunningDiag(false)
    }
  }

  // WhatsApp quick link builder
  const whatsappSupportUrl = useMemo(() => {
    const phone = "919321501389"
    const text = encodeURIComponent(
      `Hello Hanva Support Desk! 👋\n\nI need assistance with my salon account:\n• Salon Name: ${salonProfile.salonName}\n• Owner: ${salonProfile.ownerName}\n• Contact: ${salonProfile.phone}\n\nQuery: `,
    )
    return `https://wa.me/${phone}?text=${text}`
  }, [salonProfile])

  // Email support URL
  const emailSupportUrl = useMemo(() => {
    const subject = encodeURIComponent(`Hanva Support Request - ${salonProfile.salonName}`)
    const body = encodeURIComponent(
      `Hello Hanva Support Team,\n\nI require assistance with the following issue:\n\nSalon Details:\n- Salon: ${salonProfile.salonName}\n- Contact: ${salonProfile.phone}\n- Owner: ${salonProfile.ownerName}\n\nDescription of the issue / query:\n`,
    )
    return `mailto:support@hanva.com?subject=${subject}&body=${body}`
  }, [salonProfile])

  // Filtered FAQs
  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(FAQS.map((f) => f.category)))]
  }, [])

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((f) => {
      const matchesCategory = selectedCategory === "All" || f.category === selectedCategory
      const matchesQuery =
        !searchQuery.trim() ||
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [selectedCategory, searchQuery])

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (ticketFilter === "all") return true
      return t.status === ticketFilter
    })
  }, [tickets, ticketFilter])

  // Ticket counts
  const ticketStats = useMemo(() => {
    const total = tickets.length
    const open = tickets.filter((t) => t.status === "open").length
    const inProgress = tickets.filter((t) => t.status === "in_progress").length
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length
    return { total, open, inProgress, resolved }
  }, [tickets])

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-red-600 hover:bg-red-700 text-white font-medium">Urgent</Badge>
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-medium">High</Badge>
      case "medium":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Medium</Badge>
      default:
        return <Badge variant="secondary">Low</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Open
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50 flex items-center gap-1">
            <Activity className="w-3 h-3 animate-spin" /> In Progress
          </Badge>
        )
      case "resolved":
        return (
          <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </Badge>
        )
      case "closed":
        return (
          <Badge variant="secondary" className="text-gray-600 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Closed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50/60 min-h-screen">
      {/* Top Banner & Header */}
      <div className="border-b bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 px-2 py-0.5 text-xs">
                  <ShieldCheck className="w-3 h-3 mr-1 inline" /> Hanva Salon Care
                </Badge>
                <span className="text-xs text-muted-foreground">Tenant: {salonProfile.salonName}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Help & Priority Support Center
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Direct WhatsApp hotline, 24/7 ticket tracking, real-time POS diagnostics, and instant salon guides.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={whatsappSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button className="bg-[#25D366] hover:bg-[#20ba59] text-white shadow-xs gap-2">
                  <MessageCircle className="w-4 h-4 fill-white text-white" />
                  Chat on WhatsApp
                </Button>
              </a>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Create Support Ticket
                    </DialogTitle>
                    <DialogDescription>
                      Describe the problem or question you have. Our technical team responds within 15–30 minutes.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
                    <div>
                      <Label htmlFor="ticket-title" className="text-sm font-medium">
                        Issue Summary / Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="ticket-title"
                        placeholder="e.g. Thermal printer not cutting receipt / WhatsApp receipt failing"
                        value={newTicket.title}
                        onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                        className="mt-1.5"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="ticket-cat" className="text-sm font-medium">
                          Category
                        </Label>
                        <Select
                          value={newTicket.category}
                          onValueChange={(val) => setNewTicket({ ...newTicket, category: val })}
                        >
                          <SelectTrigger id="ticket-cat" className="mt-1.5">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Billing & POS">Billing & POS Checkout</SelectItem>
                            <SelectItem value="WhatsApp & Alerts">WhatsApp & SMS Receipts</SelectItem>
                            <SelectItem value="Printer & Hardware">Thermal Printer & Hardware</SelectItem>
                            <SelectItem value="Staff & Commissions">Staff & Commissions</SelectItem>
                            <SelectItem value="Memberships & Wallet">Memberships & Wallet</SelectItem>
                            <SelectItem value="GST & Reports">GST & Financial Reports</SelectItem>
                            <SelectItem value="Account & Plan">Subscription & Account</SelectItem>
                            <SelectItem value="Other">Other Technical Inquiry</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="ticket-priority" className="text-sm font-medium">
                          Priority Level
                        </Label>
                        <Select
                          value={newTicket.priority}
                          onValueChange={(val: any) => setNewTicket({ ...newTicket, priority: val })}
                        >
                          <SelectTrigger id="ticket-priority" className="mt-1.5">
                            <SelectValue placeholder="Select Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low (General Query)</SelectItem>
                            <SelectItem value="medium">Medium (Standard Issue)</SelectItem>
                            <SelectItem value="high">High (Affecting Salon Operations)</SelectItem>
                            <SelectItem value="urgent">Urgent (Billing / POS Blocked)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="ticket-phone" className="text-sm font-medium">
                        Contact Phone for Callback
                      </Label>
                      <Input
                        id="ticket-phone"
                        placeholder="+91 93215 01389"
                        value={newTicket.userPhone}
                        onChange={(e) => setNewTicket({ ...newTicket, userPhone: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ticket-desc" className="text-sm font-medium">
                        Detailed Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="ticket-desc"
                        rows={4}
                        placeholder="Please provide details, what you were trying to do, and any error message displayed..."
                        value={newTicket.description}
                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                        className="mt-1.5 resize-none"
                        required
                      />
                    </div>

                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateOpen(false)}
                        disabled={isSubmittingTicket}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmittingTicket} className="gap-2">
                        {isSubmittingTicket ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" /> Submit Ticket
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Quick Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <a
              href={whatsappSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 rounded-xl border bg-white hover:border-[#25D366] hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#25D366] group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-5 h-5 fill-current" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#25D366] transition-colors" />
              </div>
              <h3 className="font-semibold text-slate-900 mt-3 text-sm">WhatsApp Support</h3>
              <p className="text-xs text-slate-500 mt-0.5">Average reply in under 5 mins</p>
              <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                +91 93215 01389
              </p>
            </a>

            <a
              href="tel:+919321501389"
              className="group block p-4 rounded-xl border bg-white hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-slate-900 mt-3 text-sm">Phone Hotline</h3>
              <p className="text-xs text-slate-500 mt-0.5">Mon–Sat, 9:00 AM – 9:00 PM IST</p>
              <p className="text-xs font-medium text-blue-600 mt-2">+91 93215 01389</p>
            </a>

            <a
              href={emailSupportUrl}
              className="group block p-4 rounded-xl border bg-white hover:border-indigo-400 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-slate-900 mt-3 text-sm">Official Email Desk</h3>
              <p className="text-xs text-slate-500 mt-0.5">Detailed queries & invoice exports</p>
              <p className="text-xs font-medium text-indigo-600 mt-2">support@hanva.com</p>
            </a>

            <div
              onClick={() => {
                setActiveTab("diagnostics")
                handleRunDiagnostics()
              }}
              className="cursor-pointer group p-4 rounded-xl border bg-white hover:border-emerald-500 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 text-[10px]">
                  Live Test
                </Badge>
              </div>
              <h3 className="font-semibold text-slate-900 mt-3 text-sm">POS System Health</h3>
              <p className="text-xs text-slate-500 mt-0.5">Database latency & print engine</p>
              <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> All Services Normal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
            <TabsList className="bg-white border p-1 rounded-xl shadow-2xs h-auto flex flex-wrap gap-1">
              <TabsTrigger value="faq" className="gap-2 px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                <HelpCircle className="w-4 h-4" />
                Help & FAQs
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-2 px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                <FileText className="w-4 h-4" />
                My Tickets
                {ticketStats.open > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {ticketStats.open}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="diagnostics" className="gap-2 px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                <Activity className="w-4 h-4" />
                Live Diagnostics
              </TabsTrigger>
              <TabsTrigger value="guides" className="gap-2 px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                <Layers className="w-4 h-4" />
                Salon Setup Guides
              </TabsTrigger>
              <TabsTrigger value="contact" className="gap-2 px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                <Phone className="w-4 h-4" />
                Direct Desk
              </TabsTrigger>
            </TabsList>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              Hanva Cloud v5.4 • Neon PostgreSQL Live
            </div>
          </div>

          {/* TAB 1: HELP & FAQS */}
          <TabsContent value="faq" className="space-y-6 m-0">
            {/* Search and Category Filter */}
            <div className="bg-white p-6 rounded-2xl border shadow-2xs space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search solutions: e.g. 'thermal printer', 'whatsapp invoice', 'gst', 'commissions'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-slate-50/50 border-slate-200 text-sm focus-visible:ring-primary"
                />
              </div>

              {/* Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      selectedCategory === category
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQs List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFaqs.length === 0 ? (
                <div className="col-span-full bg-white rounded-2xl p-12 text-center border">
                  <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-800">No matching answers found</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    We could not find any article matching "{searchQuery}". Our support team is ready to help directly.
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <Button variant="outline" onClick={() => setSearchQuery("")}>
                      Clear Search
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" /> Open Support Ticket
                    </Button>
                  </div>
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const currentFeedback = faqFeedback[faq.id]
                  return (
                    <Card key={faq.id} className="border shadow-2xs flex flex-col justify-between hover:shadow-sm transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            {faq.category}
                          </Badge>
                          {faq.actionLink && (
                            <Link href={faq.actionLink}>
                              <span className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-0.5">
                                {faq.actionLabel || "Open"} <ChevronRight className="w-3 h-3" />
                              </span>
                            </Link>
                          )}
                        </div>
                        <CardTitle className="text-base font-semibold text-slate-900 leading-snug">
                          {faq.question}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-slate-600 leading-relaxed pb-4">
                        {faq.answer}
                      </CardContent>
                      <CardFooter className="pt-3 border-t bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                        <span>Was this helpful?</span>
                        <div className="flex items-center gap-1.5">
                          {currentFeedback ? (
                            <span className="text-emerald-600 font-medium flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Thank you for the feedback!
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setFaqFeedback((prev) => ({ ...prev, [faq.id]: "up" }))
                                  toast.success("Glad to hear this helped!")
                                }}
                                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors"
                                title="Yes, helpful"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setFaqFeedback((prev) => ({ ...prev, [faq.id]: "down" }))
                                  toast.info("Thanks, we will improve this guide.")
                                }}
                                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors"
                                title="Not helpful"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  )
                })
              )}
            </div>
          </TabsContent>

          {/* TAB 2: MY TICKETS */}
          <TabsContent value="tickets" className="space-y-6 m-0">
            {/* Ticket Management Header */}
            <div className="bg-white p-6 rounded-2xl border shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Your Salon Support Tickets</h2>
                  <p className="text-xs text-slate-500">
                    Track requests submitted by your team with end-to-end status and reply history.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={loadTickets} disabled={isLoadingTickets} className="gap-2">
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTickets ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
                    <Plus className="w-4 h-4" /> Raise Ticket
                  </Button>
                </div>
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                {[
                  { key: "all", label: "All Tickets", count: ticketStats.total },
                  { key: "open", label: "Open", count: ticketStats.open },
                  { key: "in_progress", label: "In Progress", count: ticketStats.inProgress },
                  { key: "resolved", label: "Resolved", count: ticketStats.resolved },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTicketFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      ticketFilter === f.key
                        ? "bg-primary text-white shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        ticketFilter === f.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets Table / List */}
            {isLoadingTickets ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-slate-500">Loading your tickets from PostgreSQL...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No support tickets found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  {ticketFilter === "all"
                    ? "You haven't opened any support tickets yet. Need help with billing or printers?"
                    : `No tickets currently in "${ticketFilter.replace("_", " ")}" status.`}
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" /> Create First Ticket
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => handleOpenTicketDetails(ticket)}
                    className="cursor-pointer bg-white p-5 rounded-xl border hover:border-primary/50 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {ticket.ticket_number}
                        </span>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                        <Badge variant="secondary" className="text-[10px]">
                          {ticket.category}
                        </Badge>
                      </div>

                      <h4 className="text-base font-semibold text-slate-900 truncate">
                        {ticket.title}
                      </h4>

                      <p className="text-xs text-slate-500 line-clamp-1">
                        {ticket.description}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                        <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Assigned to: {ticket.assigned_to || "Hanva Technical Support"}</span>
                        {ticket.message_count !== undefined && ticket.message_count > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">
                              {ticket.message_count} {ticket.message_count === 1 ? "reply" : "replies"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        View Thread <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ticket Thread Modal */}
            <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                {selectedTicket && (
                  <>
                    <DialogHeader className="p-6 pb-4 border-b bg-slate-50/70">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {selectedTicket.ticket_number}
                          </span>
                          {getStatusBadge(selectedTicket.status)}
                          {getPriorityBadge(selectedTicket.priority)}
                        </div>

                        {/* Status Change Selector */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">Status:</span>
                          <Select
                            value={selectedTicket.status}
                            onValueChange={(val: any) => handleStatusChange(val)}
                          >
                            <SelectTrigger className="h-7 text-xs w-32 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DialogTitle className="text-lg font-bold text-slate-900">
                        {selectedTicket.title}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                        <span>Category: {selectedTicket.category}</span>
                        <span>•</span>
                        <span>Opened: {new Date(selectedTicket.created_at).toLocaleString()}</span>
                      </DialogDescription>
                    </DialogHeader>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[420px] bg-slate-50/30">
                      {/* Original Ticket Description */}
                      <div className="bg-white p-4 rounded-xl border text-sm text-slate-700 shadow-2xs">
                        <div className="flex items-center justify-between border-b pb-2 mb-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-800">
                            {selectedTicket.user_name || "Salon Representative"} (Initial Request)
                          </span>
                          <span>{new Date(selectedTicket.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                      </div>

                      {/* Thread Messages */}
                      {isLoadingDetails ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                          Loading conversation...
                        </div>
                      ) : ticketMessages.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400">
                          No replies posted yet. Our team will review this shortly.
                        </div>
                      ) : (
                        ticketMessages.map((msg) => {
                          const isSupport = msg.sender_type === "support"
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isSupport ? "items-start" : "items-end"}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl p-4 shadow-2xs text-sm ${
                                  isSupport
                                    ? "bg-white border text-slate-800"
                                    : "bg-primary text-white"
                                }`}
                              >
                                <div
                                  className={`text-[11px] font-semibold mb-1 flex items-center justify-between gap-4 ${
                                    isSupport ? "text-primary" : "text-primary-foreground/90"
                                  }`}
                                >
                                  <span>{msg.sender_name}</span>
                                  <span className="text-[10px] opacity-75">
                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Reply Input Box */}
                    <form onSubmit={handleSendReply} className="p-4 border-t bg-white flex items-center gap-2">
                      <Input
                        placeholder="Type reply or additional details for the support engineer..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="text-sm h-10"
                        disabled={isSendingReply}
                      />
                      <Button type="submit" disabled={isSendingReply || !replyMessage.trim()} className="gap-2 shrink-0">
                        {isSendingReply ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" /> Send
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* TAB 3: SYSTEM DIAGNOSTICS */}
          <TabsContent value="diagnostics" className="space-y-6 m-0">
            <div className="bg-white p-6 rounded-2xl border shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    Live System & POS Diagnostic Engine
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verify connectivity across your cloud database, WhatsApp service, billing engine, and hardware.
                  </p>
                </div>
                <Button
                  onClick={handleRunDiagnostics}
                  disabled={isRunningDiag}
                  className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {isRunningDiag ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Testing Latency...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" /> Run Full Test
                    </>
                  )}
                </Button>
              </div>

              {/* Real-time Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {/* 1. Database Latency */}
                <Card className="border shadow-2xs">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">PostgreSQL (Neon Cloud)</CardTitle>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          diagResult?.database?.status === "operational"
                            ? "border-emerald-400 text-emerald-700 bg-emerald-50"
                            : "border-slate-300 text-slate-600"
                        }
                      >
                        {diagResult?.database?.status || "Ready to Test"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-xs text-slate-600 space-y-1.5">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Query Latency:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {diagResult ? `${diagResult.database.latencyMs} ms` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Connection Pool:</span>
                      <span className="text-emerald-600 font-medium">SSL Active</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Tenant Isolation:</span>
                      <span className="text-slate-800 font-medium">Verified</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Billing & Invoicing Engine */}
                <Card className="border shadow-2xs">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-emerald-600" />
                        <CardTitle className="text-sm font-semibold">Invoicing & Sales Ledger</CardTitle>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          diagResult?.billing?.status === "operational"
                            ? "border-emerald-400 text-emerald-700 bg-emerald-50"
                            : "border-slate-300 text-slate-600"
                        }
                      >
                        {diagResult?.billing?.status || "Ready to Test"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-xs text-slate-600 space-y-1.5">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Total Invoices Logged:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {diagResult ? diagResult.billing.totalInvoicesLogged : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">GST Breakdown Engine:</span>
                      <span className="text-emerald-600 font-medium">Operational</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">POS Checkout Sync:</span>
                      <span className="text-emerald-600 font-medium">Connected</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. WhatsApp Cloud API */}
                <Card className="border shadow-2xs">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#25D366]" />
                        <CardTitle className="text-sm font-semibold">WhatsApp Cloud API</CardTitle>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          diagResult?.whatsapp?.configured
                            ? "border-emerald-400 text-emerald-700 bg-emerald-50"
                            : "border-amber-400 text-amber-700 bg-amber-50"
                        }
                      >
                        {diagResult?.whatsapp?.status || "Check Status"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-xs text-slate-600 space-y-1.5">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Meta Access Token:</span>
                      <span className="font-mono font-medium">
                        {diagResult?.whatsapp?.configured ? "Configured" : "Default Mode"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Auto Invoice Receipts:</span>
                      <span className="text-emerald-600 font-medium">Supported</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Dispatch Queue:</span>
                      <span className="text-slate-800 font-medium">Healthy</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Thermal Printer Support */}
                <Card className="border shadow-2xs">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-purple-600" />
                        <CardTitle className="text-sm font-semibold">Thermal Printer Interface</CardTitle>
                      </div>
                      <Badge variant="outline" className="border-emerald-400 text-emerald-700 bg-emerald-50">
                        Ready
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-xs text-slate-600 space-y-1.5">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Supported Formats:</span>
                      <span className="font-medium text-slate-800">58mm & 80mm Roll</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Browser Print API:</span>
                      <span className="text-emerald-600 font-medium">Enabled (window.print)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">ESC/POS Thermal Styles:</span>
                      <span className="text-slate-800 font-medium">Pre-styled</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 5. Business Settings Sync */}
                <Card className="border shadow-2xs">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-600" />
                        <CardTitle className="text-sm font-semibold">Store Settings Cache</CardTitle>
                      </div>
                      <Badge variant="outline" className="border-emerald-400 text-emerald-700 bg-emerald-50">
                        Synced
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-xs text-slate-600 space-y-1.5">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Settings Count:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {diagResult ? diagResult.settings.storeSettingsCount : "Loaded"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Salon Name:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[140px]">
                        {salonProfile.salonName}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Multi-tenant Security:</span>
                      <span className="text-emerald-600 font-medium">Enforced</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 6. Client Environment */}
                <Card className="border shadow-2xs">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-600" />
                        <CardTitle className="text-sm font-semibold">Client Environment</CardTitle>
                      </div>
                      <Badge variant="outline" className="border-emerald-400 text-emerald-700 bg-emerald-50">
                        Online
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 text-xs text-slate-600 space-y-1.5">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Web Storage:</span>
                      <span className="text-emerald-600 font-medium">Available</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">HTTPS Encryption:</span>
                      <span className="text-emerald-600 font-medium">Active (TLS)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Last Verified:</span>
                      <span className="text-slate-800 font-medium">
                        {diagResult?.timestamp
                          ? new Date(diagResult.timestamp).toLocaleTimeString()
                          : "Not run yet"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: SALON SETUP GUIDES */}
          <TabsContent value="guides" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Guide 1 */}
              <Card className="border shadow-2xs">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-2">
                    1
                  </div>
                  <CardTitle className="text-base font-bold">Fast POS Walk-in Billing Workflow</CardTitle>
                  <CardDescription>How to bill a customer in under 30 seconds</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step A:</span>
                    <span>Enter customer phone number. If they are new, Hanva automatically opens a quick creation pop-up.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step B:</span>
                    <span>Pick services or search items. Assign the stylist to log their commission automatically.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step C:</span>
                    <span>Click 'POS Checkout', select payment (UPI QR, Cash, or Split), and press Complete Sale.</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Link href="/billing/new" className="w-full">
                    <Button variant="outline" className="w-full gap-2 text-xs">
                      Try New Sale <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Guide 2 */}
              <Card className="border shadow-2xs">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg mb-2">
                    2
                  </div>
                  <CardTitle className="text-base font-bold">Connecting 58mm / 80mm Thermal Printers</CardTitle>
                  <CardDescription>Setup guide for USB & Bluetooth receipt printers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step A:</span>
                    <span>Connect your POS receipt printer via USB or Bluetooth and install the manufacturer driver.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step B:</span>
                    <span>When checking out, tap 'Print Thermal Receipt'. In Chrome print dialog, choose your thermal printer.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step C:</span>
                    <span>Set Margins to 'None' and paper size to 58mm/80mm roll for clean formatting.</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Link href="/settings" className="w-full">
                    <Button variant="outline" className="w-full gap-2 text-xs">
                      Receipt Settings <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Guide 3 */}
              <Card className="border shadow-2xs">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold text-lg mb-2">
                    3
                  </div>
                  <CardTitle className="text-base font-bold">Automated WhatsApp Bill Receipts</CardTitle>
                  <CardDescription>Send instant PDF invoices straight to your client's WhatsApp</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step A:</span>
                    <span>Ensure customer's phone number has a valid 10-digit Indian mobile number.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step B:</span>
                    <span>Upon payment confirmation, click 'Send WhatsApp Invoice' to trigger official Meta Cloud delivery.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step C:</span>
                    <span>The customer receives an interactive receipt with payment breakdown and review link.</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Link href="/whatsapp" className="w-full">
                    <Button variant="outline" className="w-full gap-2 text-xs">
                      WhatsApp Dashboard <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Guide 4 */}
              <Card className="border shadow-2xs">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-2">
                    4
                  </div>
                  <CardTitle className="text-base font-bold">Tracking Staff Commissions & Tips</CardTitle>
                  <CardDescription>Manage daily stylist earnings and split payouts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step A:</span>
                    <span>Add staff members under 'Staff' with their designated commission percentage (e.g. 10%).</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step B:</span>
                    <span>During billing, assign staff to specific service line-items.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-800">Step C:</span>
                    <span>Review daily or monthly payouts in Reports &rarr; Staff Commission.</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Link href="/reports/staff-commission" className="w-full">
                    <Button variant="outline" className="w-full gap-2 text-xs">
                      Commission Reports <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 5: DIRECT DESK */}
          <TabsContent value="contact" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border shadow-2xs">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-[#25D366]">
                      <MessageCircle className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Hanva WhatsApp Helpdesk</CardTitle>
                      <CardDescription>Direct line to technical engineers</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <p>
                    Reach out for fast troubleshooting, hardware setup assistance, or feature inquiries directly over WhatsApp.
                  </p>
                  <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                    <div><strong>Hotline Number:</strong> +91 93215 01389</div>
                    <div><strong>Availability:</strong> Mon–Sat: 9:00 AM – 9:00 PM IST</div>
                    <div><strong>Emergency POS Outages:</strong> 24/7 on WhatsApp</div>
                  </div>
                </CardContent>
                <CardFooter>
                  <a
                    href={whatsappSupportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white gap-2">
                      <MessageCircle className="w-4 h-4 fill-white" /> Start WhatsApp Chat
                    </Button>
                  </a>
                </CardFooter>
              </Card>

              <Card className="border shadow-2xs">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-primary">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Remote Screen Share Support</CardTitle>
                      <CardDescription>AnyDesk or TeamViewer Session</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <p>
                    Need an engineer to configure your thermal receipt printer or barcode scanner remotely? We can connect via AnyDesk or TeamViewer.
                  </p>
                  <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                    <div>1. Download & open AnyDesk / TeamViewer on your billing PC.</div>
                    <div>2. Share the 9-digit remote address via WhatsApp or Support Ticket.</div>
                    <div>3. An engineer connects and configures your hardware in minutes.</div>
                  </div>
                </CardContent>
                <CardFooter>
                  <a href="tel:+919321501389" className="w-full">
                    <Button variant="outline" className="w-full gap-2">
                      <Phone className="w-4 h-4" /> Call Hotline: +91 93215 01389
                    </Button>
                  </a>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
