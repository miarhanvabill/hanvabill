"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Send, Phone, Search, Filter, Plus, Clock, Check, CheckCheck, X } from "lucide-react"
import { getWhatsAppMessages, sendWhatsAppMessage, type WhatsAppMessage } from "@/app/actions/whatsapp"

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    setLoading(true)
    try {
      const data = await getWhatsAppMessages()
      setMessages(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error loading WhatsApp messages:", error)
      setMessages([]) // Ensure it's always an array
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedContact || !newMessage.trim()) {
      alert("Please select a contact and enter a message")
      return
    }

    const result = await sendWhatsAppMessage({
      phoneNumber: selectedContact,
      message: newMessage,
      messageType: "text",
    })

    if (result.success) {
      setNewMessage("")
      loadMessages()
    } else {
      alert(result.message)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Check className="w-3 h-3 text-gray-400" />
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-gray-400" />
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500" />
      case "failed":
        return <X className="w-3 h-3 text-red-500" />
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  // Group messages by phone number
  const groupedMessages = (messages || []).reduce(
    (groups, message) => {
      const key = message.phone_number
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(message)
      return groups
    },
    {} as Record<string, WhatsAppMessage[]>,
  )

  // Get unique contacts
  const contacts = Object.keys(groupedMessages)
    .map((phoneNumber) => {
      const contactMessages = groupedMessages[phoneNumber]
      const lastMessage = contactMessages[contactMessages.length - 1]
      const unreadCount = contactMessages.filter((m) => m.direction === "inbound" && m.status !== "read").length

      return {
        phoneNumber,
        customerName: lastMessage.customer_name || phoneNumber,
        lastMessage: lastMessage.message_content,
        lastMessageTime: lastMessage.created_at,
        unreadCount,
      }
    })
    .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phoneNumber.includes(searchQuery),
  )

  const selectedMessages = selectedContact ? groupedMessages[selectedContact] || [] : []

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading WhatsApp messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="WhatsApp Business"
        subtitle="Communicate with customers, send appointment reminders, and provide instant support via WhatsApp."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Contacts List */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Conversations
                  </CardTitle>
                  <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                    <Plus className="w-3 h-3" />
                    New
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-y-auto">
                <div className="divide-y">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.phoneNumber}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedContact === contact.phoneNumber ? "bg-blue-50 border-r-2 border-blue-500" : ""
                      }`}
                      onClick={() => setSelectedContact(contact.phoneNumber)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-green-100 text-green-600">
                            {contact.customerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate">{contact.customerName}</h3>
                            <div className="flex items-center gap-1">
                              {contact.unreadCount > 0 && (
                                <Badge className="bg-green-500 text-white text-xs px-1.5 py-0.5">
                                  {contact.unreadCount}
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(contact.lastMessageTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{contact.lastMessage}</p>
                          <p className="text-xs text-gray-500">{contact.phoneNumber}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="lg:col-span-2 flex flex-col">
              {selectedContact ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-green-100 text-green-600">
                            {selectedMessages[0]?.customer_name?.charAt(0) || selectedContact.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{selectedMessages[0]?.customer_name || selectedContact}</h3>
                          <p className="text-sm text-gray-500">{selectedContact}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                          <Phone className="w-3 h-3" />
                          Call
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                          <Filter className="w-3 h-3" />
                          Info
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-4">
                      {selectedMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.direction === "outbound" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <p className="text-sm">{message.message_content}</p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 ${
                                message.direction === "outbound" ? "text-green-100" : "text-gray-500"
                              }`}
                            >
                              <span className="text-xs">
                                {new Date(message.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {message.direction === "outbound" && getStatusIcon(message.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <div className="flex items-end gap-2">
                      <Textarea
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 min-h-[40px] max-h-32 resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      <Button onClick={handleSendMessage} className="gap-1">
                        <Send className="w-4 h-4" />
                        Send
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p>Choose a contact from the list to start messaging</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
