"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Paperclip,
  Image as ImageIcon,
  MousePointerClick,
} from "lucide-react"
import {
  getWhatsAppMessages,
  getChatConversations,
  sendWhatsAppMessage,
  getCustomerChatSidebarData,
  sendCustomerQuickAction,
  getWindowStatus,
  sendInteractiveChatButtons,
  sendMediaChatAttachment,
  sendReengagementTemplate,
  type WhatsAppMessage,
  type ChatConversation,
  type CustomerChatSidebarInfo,
  type WindowStatus,
} from "@/app/actions/whatsapp"
import { getCustomers, type Customer } from "@/app/actions/customers"

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [sidebarData, setSidebarData] = useState<CustomerChatSidebarInfo | null>(null)
  const [windowStatus, setWindowStatus] = useState<WindowStatus | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [chatFilter, setChatFilter] = useState<"all" | "unread">("all")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)

  // Interactive Buttons Modal state
  const [interactiveModalOpen, setInteractiveModalOpen] = useState(false)
  const [interactivePreset, setInteractivePreset] = useState<"preset1" | "preset2" | "custom">("preset1")
  const [customBodyText, setCustomBodyText] = useState("")
  const [customButtons, setCustomButtons] = useState<string[]>(["", "", ""])
  const [sendingInteractive, setSendingInteractive] = useState(false)

  // Media Attachment Modal state
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [mediaType, setMediaType] = useState<"image" | "document">("image")
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaFilename, setMediaFilename] = useState("")
  const [mediaCaption, setMediaCaption] = useState("")
  const [sendingMedia, setSendingMedia] = useState(false)

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

  // Periodic live inbox sync every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (selectedPhone) {
        getWhatsAppMessages(selectedPhone).then((msgs) => {
          if (msgs) {
            const seen = new Set<number>()
            const unique = msgs.filter((m) => {
              if (seen.has(m.id)) return false
              seen.add(m.id)
              return true
            })
            setMessages(unique)
          }
        }).catch(() => {})

        getWindowStatus(selectedPhone).then((ws) => {
          if (ws) setWindowStatus(ws)
        }).catch(() => {})
      }
      getChatConversations().then((convos) => {
        if (convos && convos.length > 0) {
          setConversations(convos)
        }
      }).catch(() => {})
    }, 4000)

    return () => clearInterval(timer)
  }, [selectedPhone])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const liveWindowRemaining = useMemo(() => {
    // 1. Inspect loaded messages in the current conversation for the latest customer message
    const inboundMsgs = messages.filter((m) => m.direction === "inbound")
    let latestInboundTime: number | null = null

    if (inboundMsgs.length > 0) {
      const lastInbound = inboundMsgs[inboundMsgs.length - 1]
      if (lastInbound.created_at) {
        latestInboundTime = new Date(lastInbound.created_at).getTime()
      }
    }

    // 2. Fall back to windowStatus from server if messages haven't populated yet
    if (!latestInboundTime && windowStatus?.lastInboundAt) {
      latestInboundTime = new Date(windowStatus.lastInboundAt).getTime()
    }

    if (!latestInboundTime) {
      return {
        isWindowActive: false,
        hoursRemaining: 0,
        minutesRemaining: 0,
      }
    }

    const elapsedMin = (Date.now() - latestInboundTime) / 60000

    // If latest customer message was within the last 24 hours (allowing for server clock skew)
    if (elapsedMin < 24 * 60) {
      const safeElapsed = Math.max(0, elapsedMin)
      const rem = 24 * 60 - safeElapsed
      return {
        isWindowActive: true,
        hoursRemaining: Math.floor(rem / 60),
        minutesRemaining: Math.floor(rem % 60),
      }
    }

    return {
      isWindowActive: false,
      hoursRemaining: 0,
      minutesRemaining: 0,
    }
  }, [messages, windowStatus])

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
      if (msgs) {
        // Deduplicate by ID to prevent duplicate display
        const seen = new Set<number>()
        const unique = msgs.filter((m) => {
          if (seen.has(m.id)) return false
          seen.add(m.id)
          return true
        })
        setMessages(unique)
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error("Error fetching messages for phone:", error)
    }
  }

  const loadSidebar = async (phone: string) => {
    try {
      const profile = await getCustomerChatSidebarData(phone)
      setSidebarData(profile)
      if (profile?.windowStatus) {
        setWindowStatus(profile.windowStatus)
      } else {
        const ws = await getWindowStatus(phone)
        setWindowStatus(ws)
      }
    } catch (error) {
      console.error("Error loading sidebar data:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedPhone || !newMessage.trim()) return

    const messageText = newMessage.trim()
    setNewMessage("")
    setSending(true)

    // Optimistic UI: show the message immediately with a temp ID
    const optimisticId = Date.now()
    const optimisticMsg: WhatsAppMessage = {
      id: optimisticId,
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
        // Remove optimistic message, then load canonical messages from DB
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        loadChatMessages(selectedPhone)
        getChatConversations().then((c) => setConversations(c))
      } else {
        // Remove optimistic on failure too
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        if (result.errorCode === "131047") {
          toast.error("The 24-hour customer window has expired. Please send an approved template to re-open the conversation.")
        } else if (result.errorCode === "131026") {
          toast.error("This phone number is not available on WhatsApp.")
        } else {
          toast.error(result.message || "Failed to send message")
        }
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      const errStr = String(error?.message || error || "").toLowerCase()
      if (errStr.includes("131047") || errStr.includes("window")) {
        toast.error("The 24-hour customer window has expired. Please send an approved template to re-open the conversation.")
      } else {
        toast.error(error.message || "Error sending WhatsApp message")
      }
    } finally {
      setSending(false)
    }
  }

  const handleSendReengagementTemplate = async (templateName: string) => {
    if (!selectedPhone) return
    setTemplateLoading(true)
    const toastId = toast.loading(`Dispatching approved template "${templateName}"...`)

    try {
      const res = await sendReengagementTemplate({
        phoneNumber: selectedPhone,
        templateName,
        customerId: sidebarData?.id,
        customerName: sidebarData?.full_name,
      })

      if (res.success) {
        toast.success(res.message, { id: toastId })
        loadChatMessages(selectedPhone)
        loadSidebar(selectedPhone)
        getChatConversations().then((c) => setConversations(c))
      } else {
        toast.error(res.message || "Failed to dispatch template", { id: toastId })
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send template", { id: toastId })
    } finally {
      setTemplateLoading(false)
    }
  }

  const handleSendInteractive = async () => {
    if (!selectedPhone) return

    let bodyText = ""
    let buttons: { id: string; title: string }[] = []

    if (interactivePreset === "preset1") {
      bodyText = "Hi! Please confirm your upcoming appointment with us at " + (sidebarData?.full_name ? "" : "Hanva Salon") + ":"
      buttons = [
        { id: "bkg_confirm", title: "Confirm ✅" },
        { id: "bkg_reschedule", title: "Reschedule 📅" },
        { id: "bkg_cancel", title: "Cancel ❌" },
      ]
    } else if (interactivePreset === "preset2") {
      bodyText = "Thank you for visiting us! How was your salon service experience today?"
      buttons = [
        { id: "feed_loved", title: "Loved it! ⭐" },
        { id: "feed_better", title: "Could be better" },
      ]
    } else {
      if (!customBodyText.trim()) {
        toast.error("Please enter message body text")
        return
      }
      const validBtns = customButtons
        .map((b, i) => ({ id: `custom_btn_${i + 1}`, title: b.trim() }))
        .filter((b) => b.title.length > 0)
      if (validBtns.length === 0) {
        toast.error("Please provide at least one button title")
        return
      }
      bodyText = customBodyText.trim()
      buttons = validBtns
    }

    setSendingInteractive(true)
    try {
      const res = await sendInteractiveChatButtons({
        phoneNumber: selectedPhone,
        bodyText,
        buttons,
        customerId: sidebarData?.id,
      })

      if (res.success) {
        toast.success("Interactive buttons sent!")
        setInteractiveModalOpen(false)
        loadChatMessages(selectedPhone)
        getChatConversations().then((c) => setConversations(c))
      } else {
        if (res.errorCode === "131047") {
          toast.error("The 24-hour customer window has expired. Please send an approved template to re-open the conversation.")
        } else {
          toast.error(res.message || "Failed to send interactive buttons")
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send interactive buttons")
    } finally {
      setSendingInteractive(false)
    }
  }

  const handleSendMedia = async () => {
    if (!selectedPhone || !mediaUrl.trim()) {
      toast.error("Please provide a valid media URL")
      return
    }

    setSendingMedia(true)
    try {
      const res = await sendMediaChatAttachment({
        phoneNumber: selectedPhone,
        mediaType,
        url: mediaUrl.trim(),
        filename: mediaFilename.trim() || (mediaType === "document" ? "document.pdf" : undefined),
        caption: mediaCaption.trim() || undefined,
        customerId: sidebarData?.id,
      })

      if (res.success) {
        toast.success(`${mediaType === "image" ? "Image" : "Document"} sent!`)
        setMediaModalOpen(false)
        setMediaUrl("")
        setMediaFilename("")
        setMediaCaption("")
        loadChatMessages(selectedPhone)
        getChatConversations().then((c) => setConversations(c))
      } else {
        if (res.errorCode === "131047") {
          toast.error("The 24-hour customer window has expired. Please send an approved template to re-open the conversation.")
        } else {
          toast.error(res.message || "Failed to send media attachment")
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send media attachment")
    } finally {
      setSendingMedia(false)
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
          couponCode: inv.coupon_code || "",
        }
      } else if (actionType === "loyalty") {
        metadata = {
          points: sidebarData?.loyalty_points ?? 0,
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
        return (
          <span title="Delivery failed: 24h window closed or delivery error">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </span>
        )
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
              Official Hanva WABA 2-Way Customer Messaging
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
                      {selectedPhone} • Online via Hanva WABA
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
                  const isInteractive = msg.message_type === "interactive" || msg.trigger_type === "interactive"
                  const isInboundButtonReply = !isOutbound && msg.message_content.trim().startsWith("🔘")
                  const isImage = msg.message_type === "image"
                  const isDocument = msg.message_type === "document"
                  const isFailed = isOutbound && msg.status === "failed"

                  // Parse interactive button labels if interactive
                  let interactiveBody = msg.message_content
                  let interactiveButtons: string[] = []
                  if (isInteractive) {
                    const parts = msg.message_content.split("\n\n")
                    if (parts.length > 1) {
                      interactiveBody = parts.slice(0, parts.length - 1).join("\n\n")
                      const lastPart = parts[parts.length - 1]
                      const matches = lastPart.match(/\[(.*?)\]/g)
                      if (matches && matches.length > 0) {
                        interactiveButtons = matches.map((m) => m.slice(1, -1))
                      }
                    }
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? "justify-end" : "justify-start"} animate-in fade-in-50`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md p-3 rounded-2xl shadow-xs text-xs space-y-1.5 relative leading-relaxed ${
                          isOutbound
                            ? isFailed
                              ? "bg-rose-50 border border-rose-200 text-[#111b21] rounded-tr-xs"
                              : "bg-[#d9fdd3] text-[#111b21] rounded-tr-xs"
                            : isInboundButtonReply
                            ? "bg-emerald-50/90 border border-emerald-300 text-[#111b21] rounded-tl-xs"
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

                        {/* Inbound button reply highlighted pill */}
                        {isInboundButtonReply ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/90 px-2 py-0.5 rounded-md">
                              <CheckCheck className="w-3 h-3 text-emerald-600" />
                              <span>Customer Selected Option</span>
                            </div>
                            <div className="p-2 bg-white/90 border border-emerald-200 rounded-xl text-emerald-950 font-bold text-xs flex items-center gap-2">
                              <span className="text-base">🔘</span>
                              <span>{msg.message_content.replace(/^🔘\s*/, "")}</span>
                            </div>
                          </div>
                        ) : isInteractive ? (
                          /* Interactive Button Message */
                          <div className="space-y-2">
                            <p className="whitespace-pre-wrap">{interactiveBody}</p>
                            {interactiveButtons.length > 0 && (
                              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-emerald-300/40">
                                <span className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                                  <MousePointerClick className="w-3 h-3 text-emerald-600" />
                                  Interactive Buttons (Quick Reply):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {interactiveButtons.map((btnTitle, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-emerald-900 font-bold text-[11px] rounded-lg border border-emerald-300 shadow-2xs"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      {btnTitle}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : isImage ? (
                          /* Image attachment message */
                          <div className="space-y-1.5">
                            {(() => {
                              const urlMatch = msg.message_content.match(/https?:\/\/[^\s]+/i);
                              const imgUrl = urlMatch ? urlMatch[0] : (msg.message_content.startsWith("http") ? msg.message_content : null);
                              const rawCaption = imgUrl ? msg.message_content.replace(imgUrl, "").trim() : msg.message_content;
                              const caption = rawCaption !== "📷 Image" && rawCaption !== "📷 Photo" ? rawCaption : "";

                              if (imgUrl) {
                                return (
                                  <div>
                                    <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
                                      <img
                                        src={imgUrl}
                                        alt="WhatsApp Photo"
                                        className="rounded-xl max-h-56 w-full object-cover border border-slate-200 hover:opacity-95 transition-opacity"
                                      />
                                    </a>
                                    {caption && <p className="whitespace-pre-wrap text-xs pt-1.5">{caption}</p>}
                                  </div>
                                );
                              }

                              return (
                                <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2.5 text-slate-700">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-base">
                                    📷
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-xs text-slate-900">WhatsApp Photo</p>
                                    <p className="text-[10px] text-slate-500 truncate">
                                      {caption || "Photo received on WhatsApp"}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : isDocument ? (
                          /* Document attachment message */
                          <div className="space-y-1">
                            {(() => {
                              const urlMatch = msg.message_content.match(/https?:\/\/[^\s]+/i);
                              const docUrl = urlMatch ? urlMatch[0] : (msg.message_content.startsWith("http") ? msg.message_content : null);
                              const label = docUrl ? msg.message_content.replace(docUrl, "").trim() : msg.message_content;

                              return (
                                <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-xs text-slate-900 truncate">
                                        {label || "PDF Document"}
                                      </p>
                                      <p className="text-[10px] text-slate-400">PDF Invoice / File</p>
                                    </div>
                                  </div>
                                  {docUrl && (
                                    <a
                                      href={docUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1 transition-colors"
                                    >
                                      View <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          /* Normal text message */
                          <p className="whitespace-pre-wrap">{msg.message_content}</p>
                        )}

                        {/* Delivery Failure notice if failed */}
                        {isFailed && (
                          <div className="flex items-center gap-1.5 text-[10px] text-rose-600 font-semibold pt-1 border-t border-rose-200/60">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>Delivery Failed — 24h window closed or delivery rejected</span>
                          </div>
                        )}

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
                  onClick={() => setInteractiveModalOpen(true)}
                  className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1 border border-emerald-300"
                >
                  <span className="text-xs">🔘</span>
                  Buttons
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={templateLoading}
                      className="px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1 border border-amber-300"
                    >
                      <Zap className="w-3 h-3 text-amber-600" />
                      Templates ▾
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-60 text-xs">
                    <DropdownMenuItem onClick={() => handleSendReengagementTemplate("booking_created")} className="cursor-pointer gap-2 py-2">
                      <span className="text-sm">📅</span>
                      <div>
                        <p className="font-semibold">Booking Confirmation</p>
                        <p className="text-[10px] text-slate-400">booking_created</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendReengagementTemplate("reminder_24h")} className="cursor-pointer gap-2 py-2">
                      <span className="text-sm">⏰</span>
                      <div>
                        <p className="font-semibold">Appointment Reminder</p>
                        <p className="text-[10px] text-slate-400">reminder_24h</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendReengagementTemplate("review_request")} className="cursor-pointer gap-2 py-2">
                      <span className="text-sm">⭐</span>
                      <div>
                        <p className="font-semibold">Google Review Request</p>
                        <p className="text-[10px] text-slate-400">review_request</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendReengagementTemplate("we_miss_you")} className="cursor-pointer gap-2 py-2">
                      <span className="text-sm">💛</span>
                      <div>
                        <p className="font-semibold">We Miss You Win-back</p>
                        <p className="text-[10px] text-slate-400">we_miss_you</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendReengagementTemplate("invoice_receipt")} className="cursor-pointer gap-2 py-2">
                      <span className="text-sm">🧾</span>
                      <div>
                        <p className="font-semibold">Digital Invoice Link</p>
                        <p className="text-[10px] text-slate-400">invoice_receipt</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

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

              {/* 24-Hour Window Countdown Banner */}
              {liveWindowRemaining.isWindowActive ? (
                <div className="bg-emerald-50 border-t border-emerald-200/90 px-4 py-2 flex items-center justify-between text-xs text-emerald-900 shrink-0 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="font-semibold text-[11px] sm:text-xs">
                      🟢 24h Window Active: {liveWindowRemaining.hoursRemaining}h {liveWindowRemaining.minutesRemaining}m remaining for free-form replies
                    </span>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px] h-5 px-2 font-mono">
                    Session Open
                  </Badge>
                </div>
              ) : (
                <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-950 shrink-0 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">⏳</span>
                    <p className="text-[11px] sm:text-xs font-medium truncate">
                      <strong className="font-bold text-amber-900">24h Window Closed</strong> — Free-form messages cannot be delivered. Send a pre-approved template to re-engage client.
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        disabled={templateLoading}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-2.5 font-bold gap-1 shrink-0 ml-2 shadow-xs"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Send Template ⚡
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60 text-xs">
                      <DropdownMenuItem onClick={() => handleSendReengagementTemplate("booking_created")} className="cursor-pointer gap-2 py-2">
                        <span className="text-sm">📅</span>
                        <div>
                          <p className="font-semibold">Booking Confirmation</p>
                          <p className="text-[10px] text-slate-400">booking_created</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSendReengagementTemplate("reminder_24h")} className="cursor-pointer gap-2 py-2">
                        <span className="text-sm">⏰</span>
                        <div>
                          <p className="font-semibold">Appointment Reminder</p>
                          <p className="text-[10px] text-slate-400">reminder_24h</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSendReengagementTemplate("review_request")} className="cursor-pointer gap-2 py-2">
                        <span className="text-sm">⭐</span>
                        <div>
                          <p className="font-semibold">Google Review Request</p>
                          <p className="text-[10px] text-slate-400">review_request</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSendReengagementTemplate("we_miss_you")} className="cursor-pointer gap-2 py-2">
                        <span className="text-sm">💛</span>
                        <div>
                          <p className="font-semibold">We Miss You Win-back</p>
                          <p className="text-[10px] text-slate-400">we_miss_you</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSendReengagementTemplate("invoice_receipt")} className="cursor-pointer gap-2 py-2">
                        <span className="text-sm">🧾</span>
                        <div>
                          <p className="font-semibold">Digital Invoice Link</p>
                          <p className="text-[10px] text-slate-400">invoice_receipt</p>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Message Composer Footer */}
              <div className="bg-white p-3 border-t border-slate-200 flex items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMediaModalOpen(true)}
                  className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                  title="Send Media Attachment (Image / Document)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <div className="flex-1 relative">
                  <Textarea
                    placeholder={
                      liveWindowRemaining.isWindowActive
                        ? "Type a message or press Enter to send..."
                        : "24h window closed — Send an approved template above to re-engage..."
                    }
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

      {/* ============================================================ */}
      {/* MODAL: INTERACTIVE BUTTONS BUILDER */}
      {/* ============================================================ */}
      <Dialog open={interactiveModalOpen} onOpenChange={setInteractiveModalOpen}>
        <DialogContent className="max-w-lg border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-lg">🔘</span>
              Send Interactive Quick Buttons
            </DialogTitle>
            <DialogDescription className="text-xs">
              Quick-reply buttons allow clients to respond with a single tap directly inside WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Presets selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Choose Preset</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setInteractivePreset("preset1")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    interactivePreset === "preset1"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="font-bold text-xs">Booking Confirmation</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">3 buttons (Confirm/Resched/Cancel)</p>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractivePreset("preset2")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    interactivePreset === "preset2"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="font-bold text-xs">Service Feedback</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">2 buttons (Loved it / Improve)</p>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractivePreset("custom")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    interactivePreset === "custom"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="font-bold text-xs">Custom Buttons</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Enter custom body & up to 3 buttons</p>
                </button>
              </div>
            </div>

            {/* Custom Inputs if custom preset selected */}
            {interactivePreset === "custom" && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Message Body</Label>
                  <Textarea
                    placeholder="Enter message text explaining the options..."
                    value={customBodyText}
                    onChange={(e) => setCustomBodyText(e.target.value)}
                    rows={2}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Buttons (up to 3, max 20 chars each)
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Button 1 (e.g. Yes ✅)"
                      value={customButtons[0]}
                      maxLength={20}
                      onChange={(e) => setCustomButtons([e.target.value, customButtons[1], customButtons[2]])}
                      className="text-xs bg-white"
                    />
                    <Input
                      placeholder="Button 2 (e.g. No ❌)"
                      value={customButtons[1]}
                      maxLength={20}
                      onChange={(e) => setCustomButtons([customButtons[0], e.target.value, customButtons[2]])}
                      className="text-xs bg-white"
                    />
                    <Input
                      placeholder="Button 3 (optional)"
                      value={customButtons[2]}
                      maxLength={20}
                      onChange={(e) => setCustomButtons([customButtons[0], customButtons[1], e.target.value])}
                      className="text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Message Preview */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase">Live Preview</Label>
              <div className="p-3 bg-[#e5ddd5]/60 rounded-xl border border-slate-200">
                <div className="bg-[#d9fdd3] text-[#111b21] max-w-sm ml-auto p-3 rounded-2xl rounded-tr-xs shadow-2xs space-y-2 text-xs">
                  <p className="whitespace-pre-wrap">
                    {interactivePreset === "preset1"
                      ? "Hi! Please confirm your upcoming appointment with us at " + (sidebarData?.full_name ? "" : "Hanva Salon") + ":"
                      : interactivePreset === "preset2"
                      ? "Thank you for visiting us! How was your salon service experience today?"
                      : customBodyText || "Your custom interactive message text will appear here."}
                  </p>
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-emerald-300/40">
                    {(interactivePreset === "preset1"
                      ? ["Confirm ✅", "Reschedule 📅", "Cancel ❌"]
                      : interactivePreset === "preset2"
                      ? ["Loved it! ⭐", "Could be better"]
                      : customButtons.filter((b) => b.trim().length > 0).length > 0
                      ? customButtons.filter((b) => b.trim().length > 0)
                      : ["Button 1", "Button 2"]
                    ).map((title, i) => (
                      <div
                        key={i}
                        className="py-1 px-3 bg-white text-emerald-800 font-bold text-center rounded-lg shadow-2xs text-[11px] border border-emerald-200"
                      >
                        {title}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInteractiveModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendInteractive}
              disabled={sendingInteractive}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
            >
              {sendingInteractive ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Buttons
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL: MEDIA ATTACHMENT SENDER */}
      {/* ============================================================ */}
      <Dialog open={mediaModalOpen} onOpenChange={setMediaModalOpen}>
        <DialogContent className="max-w-md border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-emerald-600" />
              Send Media Attachment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dispatch images, brochures, or PDF invoice documents directly via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMediaType("image")}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  mediaType === "image"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold">Image (JPG/PNG)</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaType("document")}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  mediaType === "document"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold">Document (PDF)</span>
              </button>
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  {mediaType === "image" ? "Image URL" : "Document / PDF URL"}
                </Label>
                <Input
                  placeholder={
                    mediaType === "image"
                      ? "https://example.com/salon-look.jpg"
                      : "https://biz.hanva.in/invoices/INV-101.pdf"
                  }
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="text-xs bg-white font-mono"
                />
              </div>

              {mediaType === "document" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">File Name (optional)</Label>
                  <Input
                    placeholder="e.g. Invoice_INV101.pdf"
                    value={mediaFilename}
                    onChange={(e) => setMediaFilename(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Caption (optional)</Label>
                <Input
                  placeholder="e.g. Here is your service invoice receipt!"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMediaModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendMedia}
              disabled={sendingMedia || !mediaUrl.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
            >
              {sendingMedia ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Attachment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
