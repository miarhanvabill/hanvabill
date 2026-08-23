"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  MessageSquare,
  Send,
  Phone,
  Search,
  Plus,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Sparkles,
  Award,
  Calendar,
  FileText,
  Star,
  User,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  MoreVertical,
  MapPin,
  Smile,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react"
import {
  getWhatsAppMessages,
  getChatConversations,
  sendWhatsAppMessage,
  getCustomerChatSidebarData,
  sendCustomerQuickAction,
  type WhatsAppMessage,
  type ChatConversation,
  type CustomerChatSidebarInfo,
} from "@/app/actions/whatsapp"
import { getCustomers, type Customer } from "@/app/actions/customers"

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [sidebarData, setSidebarData] = useState<CustomerChatSidebarInfo | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [chatFilter, setChatFilter] = useState<"all" | "unread">("all")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // New Chat Modal state
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [customerList, setCustomerList] = useState<Customer[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  const [customPhoneNumber, setCustomPhoneNumber] = useState("")
  const [customName, setCustomName] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedPhone) {
      loadChatMessages(selectedPhone)
      loadSidebar(selectedPhone)
    }
  }, [selectedPhone])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const convos = await getChatConversations()
      setConversations(convos || [])
      if (convos && convos.length > 0 && !selectedPhone) {
        setSelectedPhone(convos[0].phoneNumber)
      }
    } catch (error) {
      console.error("Error loading chat conversations:", error)
      toast.error("Failed to load conversations")
    } finally {
      setLoading(false)
    }
  }

  const loadChatMessages = async (phone: string) => {
    try {
      const msgs = await getWhatsAppMessages(phone)
      setMessages(msgs || [])
    } catch (error) {
      console.error("Error fetching messages for phone:", error)
    }
  }

  const loadSidebar = async (phone: string) => {
    try {
      const profile = await getCustomerChatSidebarData(phone)
      setSidebarData(profile)
    } catch (error) {
      console.error("Error loading sidebar data:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedPhone || !newMessage.trim()) return

    const messageText = newMessage.trim()
    setNewMessage("")
    setSending(true)

    // Optimistic UI append
    const optimisticMsg: WhatsAppMessage = {
      id: Date.now(),
      phone_number: selectedPhone,
      customer_name: sidebarData?.full_name || "Customer",
      message_content: messageText,
      message_type: "text",
      direction: "outbound",
      status: "sent",
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const result = await sendWhatsAppMessage({
        phoneNumber: selectedPhone,
        message: messageText,
        customerId: sidebarData?.id,
        triggerType: "direct_chat",
      })

      if (result.success) {
        toast.success("Message delivered")
        // Refresh conversations & messages
        loadChatMessages(selectedPhone)
        getChatConversations().then((c) => setConversations(c))
      } else {
        toast.error(result.message || "Failed to send message")
      }
    } catch (error: any) {
      toast.error(error.message || "Error sending WhatsApp message")
    } finally {
      setSending(false)
    }
  }

  const handleQuickAction = async (actionType: "invoice" | "review" | "booking" | "loyalty") => {
    if (!selectedPhone) return
    setActionLoading(actionType)

    try {
      let metadata: any = {}
      if (actionType === "invoice" && sidebarData?.recent_invoices && sidebarData.recent_invoices.length > 0) {
        const inv = sidebarData.recent_invoices[0]
        metadata = {
          invoiceNumber: inv.invoice_number,
          amount: inv.amount,
          shareToken: inv.share_token,
        }
      } else if (actionType === "loyalty") {
        metadata = {
          points: sidebarData?.loyalty_points || 250,
        }
      }

      const res = await sendCustomerQuickAction({
        actionType,
        phoneNumber: selectedPhone,
        customerId: sidebarData?.id,
        metadata,
      })

      if (res.success) {
        toast.success(`Action dispatched: ${actionType.toUpperCase()}`)
        loadChatMessages(selectedPhone)
        getChatConversations().then((c) => setConversations(c))
      } else {
        toast.error(res.message || "Quick action failed")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to dispatch quick action")
    } finally {
      setActionLoading(null)
    }
  }

  const openNewChatDialog = async () => {
    setNewChatOpen(true)
    try {
      const custs = await getCustomers()
      setCustomerList(custs || [])
    } catch (e) {
      console.error("Error fetching customers for new chat:", e)
    }
  }

  const startNewChat = (phone: string, name?: string) => {
    if (!phone) return
    let clean = phone.replace(/[^0-9]/g, "")
    if (clean.length === 10) clean = `91${clean}`
    if (!clean.startsWith("+")) clean = `+${clean}`

    setSelectedPhone(clean)
    setNewChatOpen(false)
    setCustomPhoneNumber("")
    setCustomName("")
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "read":
        return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
      case "delivered":
        return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
      case "sent":
        return <Check className="w-3.5 h-3.5 text-slate-400" />
      case "failed":
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
      default:
        return <Clock className="w-3 h-3 text-slate-400" />
    }
  }

  const filteredConversations = useMemo(() => {
    let list = conversations
    if (chatFilter === "unread") {
      list = list.filter((c) => c.unreadCount > 0)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.phoneNumber.includes(q) ||
          c.lastMessage.toLowerCase().includes(q),
      )
    }
    return list
  }, [conversations, chatFilter, searchQuery])

  const filteredCustomersModal = useMemo(() => {
    if (!customerSearch.trim()) return customerList.slice(0, 8)
    const q = customerSearch.toLowerCase().trim()
    return customerList.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.phone_number?.includes(q) ||
        c.email?.toLowerCase().includes(q),
    ).slice(0, 10)
  }, [customerList, customerSearch])

  const activeConversation = conversations.find((c) => c.phoneNumber === selectedPhone)

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <PageHeader
          title="WhatsApp Business Inbox"
          subtitle="Live customer chat, direct messaging, and instant salon actions"
        />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading WhatsApp Live Inbox...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-slate-100 overflow-hidden">
      {/* Top compact bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">WhatsApp Live Chat Hub</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Official Fonada WABA 2-Way Customer Messaging
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={openNewChatDialog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm h-8"
          >
            <Plus className="w-3.5 h-3.5" />
            Start New Chat
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              loadInitialData()
              if (selectedPhone) {
                loadChatMessages(selectedPhone)
                loadSidebar(selectedPhone)
              }
              toast.success("Inbox refreshed")
            }}
            className="text-xs font-medium h-8 border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main 3-Column Chat Application */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* ============================================================ */}
        {/* COLUMN 1: CONVERSATION LIST (3.5 cols on desktop) */}
        {/* ============================================================ */}
        <div className="md:col-span-4 lg:col-span-3 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
          {/* Search & Filter header */}
          <div className="p-3 border-b border-slate-100 space-y-2.5 shrink-0 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search chats or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-white h-8 text-xs border-slate-200"
              />
            </div>

            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setChatFilter("all")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    chatFilter === "all"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({conversations.length})
                </button>
                <button
                  onClick={() => setChatFilter("unread")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    chatFilter === "unread"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Unread
                </button>
              </div>

              <span className="text-[10px] text-slate-400 font-medium">
                {filteredConversations.length} chats
              </span>
            </div>
          </div>

          {/* Conversation Items list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((convo) => {
                const isSelected = selectedPhone === convo.phoneNumber
                return (
                  <div
                    key={convo.phoneNumber}
                    onClick={() => setSelectedPhone(convo.phoneNumber)}
                    className={`p-3.5 cursor-pointer transition-all duration-150 flex items-start gap-3 relative ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-4 border-emerald-600"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <Avatar className="w-10 h-10 shrink-0 border border-slate-200/80">
                      <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-xs">
                        {convo.avatarInitial}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {convo.customerName}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(convo.lastMessageTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 truncate leading-snug">
                        {convo.lastMessage}
                      </p>

                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {convo.phoneNumber}
                        </span>

                        {convo.unreadCount > 0 ? (
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {convo.unreadCount}
                          </span>
                        ) : (
                          convo.direction === "outbound" && getStatusIcon(convo.lastStatus)
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">No conversations found.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openNewChatDialog}
                  className="text-xs text-emerald-700"
                >
                  Start New Chat
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* COLUMN 2: ACTIVE CHAT WINDOW (Middle) */}
        {/* ============================================================ */}
        <div
          className={`${
            sidebarOpen ? "md:col-span-8 lg:col-span-6" : "md:col-span-8 lg:col-span-9"
          } flex flex-col h-full bg-[#efeae2] border-r border-slate-200 relative overflow-hidden`}
        >
          {selectedPhone ? (
            <>
              {/* WhatsApp Active Chat Header */}
              <div className="bg-[#075e54] text-white px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-9 h-9 border border-white/30">
                    <AvatarFallback className="bg-emerald-200 text-emerald-900 font-bold text-xs">
                      {sidebarData?.full_name?.charAt(0) || activeConversation?.avatarInitial || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm truncate">
                        {sidebarData?.full_name || activeConversation?.customerName || selectedPhone}
                      </h3>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    </div>
                    <p className="text-[11px] text-emerald-100/90 font-mono truncate">
                      {selectedPhone} • Online via Fonada WABA
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${selectedPhone}`}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                    title="Direct Phone Call"
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                    title={sidebarOpen ? "Hide Profile Sidebar" : "Show Profile Sidebar"}
                  >
                    {sidebarOpen ? (
                      <PanelRightClose className="w-4 h-4 text-emerald-200" />
                    ) : (
                      <PanelRightOpen className="w-4 h-4 text-emerald-200" />
                    )}
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#e5ddd5]/60 bg-repeat">
                {/* Date Badge */}
                <div className="flex justify-center my-2">
                  <span className="bg-white/80 backdrop-blur-xs text-[#54656f] text-[10px] font-semibold px-3 py-0.5 rounded-full shadow-2xs">
                    TODAY
                  </span>
                </div>

                {messages.map((msg) => {
                  const isOutbound = msg.direction === "outbound"
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? "justify-end" : "justify-start"} animate-in fade-in-50`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md p-3 rounded-2xl shadow-xs text-xs space-y-1 relative leading-relaxed ${
                          isOutbound
                            ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-xs"
                            : "bg-white text-[#111b21] rounded-tl-xs"
                        }`}
                      >
                        {/* Trigger category badge if automated */}
                        {msg.trigger_type && (
                          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            {msg.trigger_type.replace(/_/g, " ")}
                          </div>
                        )}

                        <p className="whitespace-pre-wrap">{msg.message_content}</p>

                        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 pt-0.5">
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isOutbound && getStatusIcon(msg.status)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Bar */}
              <div className="bg-white/95 backdrop-blur-xs px-3 py-2 border-t border-slate-200 overflow-x-auto shrink-0 flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1 mr-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Quick:
                </span>

                <button
                  type="button"
                  onClick={() => handleQuickAction("invoice")}
                  disabled={!!actionLoading}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1 border border-slate-200"
                >
                  <FileText className="w-3 h-3 text-emerald-600" />
                  Send Invoice
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickAction("review")}
                  disabled={!!actionLoading}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-yellow-100 hover:text-yellow-900 text-slate-700 text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1 border border-slate-200"
                >
                  <Star className="w-3 h-3 text-yellow-500" />
                  Request Review
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickAction("booking")}
                  disabled={!!actionLoading}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-100 hover:text-blue-900 text-slate-700 text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1 border border-slate-200"
                >
                  <Calendar className="w-3 h-3 text-blue-500" />
                  Send Booking Link
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickAction("loyalty")}
                  disabled={!!actionLoading}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-slate-700 text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1 border border-slate-200"
                >
                  <Award className="w-3 h-3 text-purple-600" />
                  Send Rewards Balance
                </button>
              </div>

              {/* Message Composer Footer */}
              <div className="bg-white p-3 border-t border-slate-200 flex items-end gap-2 shrink-0">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Type a message or press Enter to send..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    rows={1}
                    className="min-h-[40px] max-h-28 text-xs sm:text-sm bg-slate-50 border-slate-200 focus:bg-white resize-none rounded-xl pr-10"
                  />
                  <div className="absolute right-2.5 bottom-2.5 text-slate-400">
                    <Smile className="w-4 h-4 cursor-pointer hover:text-slate-600" />
                  </div>
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl h-10 px-4 shrink-0 shadow-sm"
                >
                  {sending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Select a Conversation</h3>
              <p className="text-xs max-w-sm">
                Choose a customer from the left list or start a new chat to communicate directly via WhatsApp Business API.
              </p>
              <Button
                onClick={openNewChatDialog}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Start New Chat
              </Button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* COLUMN 3: CUSTOMER PROFILE & 1-CLICK ACTION SIDEBAR */}
        {/* ============================================================ */}
        {sidebarOpen && (
          <div className="md:col-span-12 lg:col-span-3 bg-white flex flex-col h-full overflow-y-auto border-l border-slate-200 p-4 space-y-4">
            {sidebarData ? (
              <>
                {/* Profile Card Header */}
                <div className="text-center space-y-2 pb-3 border-b border-slate-100">
                  <Avatar className="w-16 h-16 mx-auto border-2 border-emerald-500 shadow-sm">
                    <AvatarFallback className="bg-emerald-100 text-emerald-800 font-black text-lg">
                      {sidebarData.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{sidebarData.full_name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{sidebarData.phone_number}</p>
                    {sidebarData.email && (
                      <p className="text-[11px] text-slate-400 truncate">{sidebarData.email}</p>
                    )}
                  </div>
                </div>

                {/* Key Salon Metrics Banner */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium uppercase">Total Spent</span>
                    <h4 className="text-sm font-black text-slate-900">
                      ₹{sidebarData.total_spent.toLocaleString("en-IN")}
                    </h4>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium uppercase">Total Visits</span>
                    <h4 className="text-sm font-black text-slate-900">
                      {sidebarData.total_bookings} visits
                    </h4>
                  </div>
                </div>

                {/* Loyalty & Rewards Summary */}
                <div className="p-3.5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                      <Award className="w-4 h-4 text-purple-600" />
                      Loyalty Points
                    </div>
                    <Badge className="bg-purple-600 text-white text-[10px]">
                      {sidebarData.loyalty_points} Pts
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-purple-700">
                    <span>Redeemable Value:</span>
                    <span className="font-bold">₹{sidebarData.wallet_balance}</span>
                  </div>
                </div>

                {/* One-Click Instant Action Buttons */}
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    One-Click WhatsApp Actions
                  </Label>

                  <div className="grid grid-cols-1 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction("invoice")}
                      disabled={!!actionLoading}
                      className="w-full justify-start text-xs font-semibold h-8 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      <FileText className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                      Send Latest Invoice
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction("review")}
                      disabled={!!actionLoading}
                      className="w-full justify-start text-xs font-semibold h-8 border-slate-200 hover:bg-yellow-50 hover:text-yellow-900"
                    >
                      <Star className="w-3.5 h-3.5 mr-2 text-yellow-500" />
                      Send Google Review Invite
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction("booking")}
                      disabled={!!actionLoading}
                      className="w-full justify-start text-xs font-semibold h-8 border-slate-200 hover:bg-blue-50 hover:text-blue-800"
                    >
                      <Calendar className="w-3.5 h-3.5 mr-2 text-blue-500" />
                      Send Rebook / Appointment Link
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction("loyalty")}
                      disabled={!!actionLoading}
                      className="w-full justify-start text-xs font-semibold h-8 border-slate-200 hover:bg-purple-50 hover:text-purple-900"
                    >
                      <Award className="w-3.5 h-3.5 mr-2 text-purple-600" />
                      Send Loyalty Balance
                    </Button>
                  </div>
                </div>

                {/* Upcoming / Recent Bookings */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Recent Bookings
                    </Label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {sidebarData.upcoming_bookings.length}
                    </span>
                  </div>

                  {sidebarData.upcoming_bookings.length > 0 ? (
                    <div className="space-y-1.5">
                      {sidebarData.upcoming_bookings.map((b) => (
                        <div
                          key={b.id}
                          className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 truncate max-w-[140px]">
                              {b.service_name}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold">
                              {b.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{b.booking_date} • {b.booking_time}</span>
                            <span className="font-semibold text-slate-800">₹{b.total_amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No recent bookings recorded.</p>
                  )}
                </div>

                {/* Recent Invoices */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      Recent Invoices
                    </Label>
                  </div>

                  {sidebarData.recent_invoices.length > 0 ? (
                    <div className="space-y-1.5">
                      {sidebarData.recent_invoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-xs flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-slate-900">{inv.invoice_number}</span>
                            <p className="text-[10px] text-slate-400">{inv.invoice_date}</p>
                          </div>
                          <span className="font-bold text-emerald-700">₹{inv.amount}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No invoices found for client.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <User className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">Select a contact to view client profile and loyalty metrics.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL: START NEW CHAT / CUSTOMER DIRECTORY */}
      {/* ============================================================ */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Start New WhatsApp Conversation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Search your salon customer database or enter any mobile number directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Direct Number Input */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <Label className="text-xs font-semibold text-slate-700">
                Direct Mobile Number
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 9876543210"
                  value={customPhoneNumber}
                  onChange={(e) => setCustomPhoneNumber(e.target.value)}
                  className="text-xs h-9 bg-white font-mono"
                />
                <Button
                  size="sm"
                  onClick={() => startNewChat(customPhoneNumber, customName)}
                  disabled={!customPhoneNumber.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0"
                >
                  Start Chat
                </Button>
              </div>
            </div>

            {/* Customer Directory Search */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Or Select from Salon Customers
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Search customer name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {filteredCustomersModal.length > 0 ? (
                  filteredCustomersModal.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => startNewChat(c.phone_number, c.full_name)}
                      className="p-2.5 hover:bg-emerald-50/70 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{c.full_name}</h4>
                        <p className="text-[11px] text-slate-500 font-mono">{c.phone_number}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No customers found.
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewChatOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
