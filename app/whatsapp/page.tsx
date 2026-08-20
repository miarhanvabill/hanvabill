"use client"

import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Send, Phone, Video, MoreVertical, Check, CheckCheck } from "lucide-react"

export default function WhatsAppChatPage() {
  const [activeChat, setActiveChat] = useState<number>(1)
  const [message, setMessage] = useState("")

  const chats = [
    { id: 1, name: "Priya Sharma", phone: "+91 98765 43210", lastMessage: "Yes, I will be there at 5 PM.", time: "10:30 AM", unread: 2 },
    { id: 2, name: "Rahul Verma", phone: "+91 98765 12345", lastMessage: "Thanks for the amazing haircut!", time: "Yesterday", unread: 0 },
    { id: 3, name: "Anita Desai", phone: "+91 98765 67890", lastMessage: "Can I reschedule my appointment?", time: "Monday", unread: 0 },
  ]

  const messages = [
    { id: 1, sender: 'business', text: "Hi Priya, just a reminder for your hair styling appointment at 5 PM today.", time: "09:00 AM", status: "read" },
    { id: 2, sender: 'customer', text: "Thanks for the reminder!", time: "10:15 AM" },
    { id: 3, sender: 'customer', text: "Yes, I will be there at 5 PM.", time: "10:30 AM" },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <PageHeader
        title="WhatsApp Chat"
        description="Communicate directly with your customers via WhatsApp Business."
      />
      
      <Card className="flex-1 flex overflow-hidden mt-4 border-gray-200">
        {/* Sidebar */}
        <div className="w-1/3 border-r flex flex-col bg-gray-50/50">
          <div className="p-4 border-b bg-white">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input placeholder="Search chats..." className="pl-9 bg-gray-50" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {chats.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat.id)}
                className={`flex items-center p-4 border-b cursor-pointer transition-colors hover:bg-gray-100 ${activeChat === chat.id ? 'bg-green-50/50 hover:bg-green-50/50' : ''}`}
              >
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 shrink-0">
                  {chat.name.charAt(0)}
                </div>
                <div className="ml-3 flex-1 overflow-hidden">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-semibold text-gray-900 truncate">{chat.name}</h4>
                    <span className="text-xs text-gray-500">{chat.time}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                    {chat.unread > 0 && (
                      <span className="bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shrink-0">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#efeae2]">
          {/* Chat Header */}
          <div className="h-16 px-6 border-b bg-white flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                {chats.find(c => c.id === activeChat)?.name.charAt(0)}
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">{chats.find(c => c.id === activeChat)?.name}</h3>
                <p className="text-xs text-gray-500">{chats.find(c => c.id === activeChat)?.phone}</p>
              </div>
            </div>
            <div className="flex gap-4 text-gray-500">
              <Phone className="w-5 h-5 cursor-pointer hover:text-gray-700" />
              <Video className="w-5 h-5 cursor-pointer hover:text-gray-700" />
              <MoreVertical className="w-5 h-5 cursor-pointer hover:text-gray-700" />
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'business' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm relative ${
                      msg.sender === 'business' ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <div className="flex justify-end items-center gap-1 mt-1">
                      <span className="text-[10px] text-gray-500">{msg.time}</span>
                      {msg.sender === 'business' && (
                        <CheckCheck className={`w-3 h-3 ${msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'}`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 bg-gray-100 flex gap-2 items-center">
            <Input 
              placeholder="Type a message..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 bg-white border-0 focus-visible:ring-1 focus-visible:ring-green-500 rounded-full px-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setMessage("");
                }
              }}
            />
            <Button size="icon" className="rounded-full bg-green-500 hover:bg-green-600 shrink-0" onClick={() => setMessage("")}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
