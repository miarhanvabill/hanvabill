"use client"

import { useState, useEffect, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Phone, User, MessageCircle, Plus, Trash2, ArrowUpDown } from "lucide-react"
import { getEnquiries, updateEnquiryStatus, createEnquiry, deleteEnquiry, type Enquiry } from "@/app/actions/enquiries"

export default function EnquiryPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // New enquiry form state
  const [newEnquiryForm, setNewEnquiryForm] = useState({
    customerName: "",
    phoneNumber: "",
    source: "manual",
    notes: "",
  })

  useEffect(() => {
    loadEnquiries()
  }, [])

  const loadEnquiries = async () => {
    setLoading(true)
    try {
      const data = await getEnquiries()
      setEnquiries(data)
    } catch (error) {
      console.error("Error loading enquiries:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (enquiryId: number, newStatus: string) => {
    // Optimistic UI update
    setEnquiries(prev =>
      prev.map(e => (e.id === enquiryId ? { ...e, status: newStatus } : e))
    )
    const result = await updateEnquiryStatus(enquiryId, newStatus)
    if (!result.success) {
      loadEnquiries()
    }
  }

  const handleDelete = async (enquiryId: number) => {
    if (!window.confirm("Are you sure you want to delete this enquiry?")) return
    setEnquiries(prev => prev.filter(e => e.id !== enquiryId))
    const result = await deleteEnquiry(enquiryId)
    if (!result.success) {
      loadEnquiries()
    }
  }

  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEnquiryForm.customerName || !newEnquiryForm.phoneNumber) return
    setCreating(true)
    try {
      const result = await createEnquiry(newEnquiryForm)
      if (result.success) {
        setCreateDialogOpen(false)
        setNewEnquiryForm({ customerName: "", phoneNumber: "", source: "manual", notes: "" })
        loadEnquiries()
      } else {
        alert(result.message || "Failed to create enquiry")
      }
    } catch (err: any) {
      alert(err.message || "Failed to create enquiry")
    } finally {
      setCreating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none capitalize">New</Badge>
      case "contacted":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none capitalize">Contacted</Badge>
      case "converted":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none capitalize">Converted</Badge>
      case "closed":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-none capitalize">Closed</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-none capitalize">{status}</Badge>
    }
  }

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: enquiries.length,
      new: enquiries.filter(e => e.status === "new").length,
      contacted: enquiries.filter(e => e.status === "contacted").length,
      converted: enquiries.filter(e => e.status === "converted").length,
      closed: enquiries.filter(e => e.status === "closed").length,
    }
  }, [enquiries])

  // Filtered & sorted enquiries
  const filteredEnquiries = useMemo(() => {
    let result = [...enquiries]

    if (statusFilter !== "all") {
      result = result.filter(e => e.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        e =>
          e.customer_name?.toLowerCase().includes(q) ||
          e.phone_number?.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q) ||
          e.source?.toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at || b.inquiry_date).getTime() - new Date(a.created_at || a.inquiry_date).getTime()
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at || a.inquiry_date).getTime() - new Date(b.created_at || b.inquiry_date).getTime()
      }
      if (sortBy === "name") {
        return (a.customer_name || "").localeCompare(b.customer_name || "")
      }
      if (sortBy === "status") {
        return (a.status || "").localeCompare(b.status || "")
      }
      return 0
    })

    return result
  }, [enquiries, statusFilter, searchQuery, sortBy])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading enquiries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Enquiries & Leads"
        subtitle="Manage prospective customer inquiries, track follow-ups, and convert leads into bookings."
      >
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black hover:bg-gray-800 text-white gap-2">
              <Plus className="w-4 h-4" />
              Log Enquiry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log New Enquiry</DialogTitle>
              <DialogDescription>
                Record a phone call, walk-in, or social media enquiry.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEnquiry} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="enq-name">Customer Name *</Label>
                <Input
                  id="enq-name"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={newEnquiryForm.customerName}
                  onChange={e => setNewEnquiryForm({ ...newEnquiryForm, customerName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="enq-phone">Phone Number *</Label>
                <Input
                  id="enq-phone"
                  required
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newEnquiryForm.phoneNumber}
                  onChange={e => setNewEnquiryForm({ ...newEnquiryForm, phoneNumber: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="enq-source">Enquiry Source</Label>
                <Select
                  value={newEnquiryForm.source}
                  onValueChange={val => setNewEnquiryForm({ ...newEnquiryForm, source: val })}
                >
                  <SelectTrigger id="enq-source" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Walk-in / In-Person</SelectItem>
                    <SelectItem value="phone_call">Phone Call</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="instagram">Instagram / Social</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="public_portal">Website Portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="enq-notes">Enquiry Details & Notes</Label>
                <Textarea
                  id="enq-notes"
                  placeholder="Interested in bridal packages, hair smoothening, etc."
                  value={newEnquiryForm.notes}
                  onChange={e => setNewEnquiryForm({ ...newEnquiryForm, notes: e.target.value })}
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="bg-black hover:bg-gray-800 text-white">
                  {creating ? "Saving..." : "Save Enquiry"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Status Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
            {[
              { id: "all", label: "All Enquiries", count: counts.all },
              { id: "new", label: "New Leads", count: counts.new },
              { id: "contacted", label: "Contacted", count: counts.contacted },
              { id: "converted", label: "Converted", count: counts.converted },
              { id: "closed", label: "Closed", count: counts.closed },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-black text-white shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    statusFilter === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search name, phone, notes..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Sort:</span>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-44 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="name">Customer Name</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enquiries List */}
          <div className="space-y-4">
            {filteredEnquiries.map(enquiry => (
              <Card key={enquiry.id} className="hover:shadow-md transition-shadow overflow-hidden bg-white">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center shrink-0 text-gray-700 font-bold">
                        <User className="w-6 h-6 text-gray-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-lg text-gray-900">{enquiry.customer_name}</span>
                          {getStatusBadge(enquiry.status)}
                          {enquiry.source && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                              {enquiry.source.replace("_", " ")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {enquiry.phone_number}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>
                            {enquiry.created_at
                              ? new Date(enquiry.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : enquiry.inquiry_date}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Status and Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* WhatsApp Link */}
                      <a
                        href={`https://wa.me/${enquiry.phone_number.replace(/[^0-9]/g, "")}?text=Hi%20${encodeURIComponent(enquiry.customer_name)},%20thank%20you%20for%20contacting%20us!`}
                        target="_blank"
                        rel="noreferrer"
                        title="Chat on WhatsApp"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-9 px-3 gap-1.5"
                        >
                          <MessageCircle className="w-4 h-4 fill-emerald-600/20" />
                          <span className="hidden md:inline">WhatsApp</span>
                        </Button>
                      </a>

                      {/* Call Link */}
                      <a href={`tel:${enquiry.phone_number}`} title="Call Customer">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 h-9 px-3 gap-1.5"
                        >
                          <Phone className="w-4 h-4" />
                          <span className="hidden md:inline">Call</span>
                        </Button>
                      </a>

                      {/* Status Dropdown */}
                      <Select
                        value={enquiry.status}
                        onValueChange={val => handleStatusUpdate(enquiry.id, val)}
                      >
                        <SelectTrigger className="w-32 h-9 text-xs font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Mark New</SelectItem>
                          <SelectItem value="contacted">Mark Contacted</SelectItem>
                          <SelectItem value="converted">Mark Converted</SelectItem>
                          <SelectItem value="closed">Mark Closed</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(enquiry.id)}
                        className="text-gray-400 hover:text-red-600 h-9 w-9 p-0"
                        title="Delete Enquiry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {enquiry.notes && (
                    <div className="mt-4 p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                      <p className="text-sm text-gray-700 whitespace-pre-line">{enquiry.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredEnquiries.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-40" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      {searchQuery || statusFilter !== "all"
                        ? "No matching enquiries found"
                        : "No enquiries yet"}
                    </h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search query or status filter."
                        : "Customer inquiries from your booking portal or recorded by staff will appear here."}
                    </p>
                    {(!searchQuery && statusFilter === "all") && (
                      <Button
                        onClick={() => setCreateDialogOpen(true)}
                        className="bg-black text-white hover:bg-gray-800"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Log First Enquiry
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
