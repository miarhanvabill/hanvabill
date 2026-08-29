"use client"

import type React from "react"
import { useState } from "react"
import { ArrowLeft, User, Phone, Mail, QrCode, Calendar, FileText, Instagram, Globe, Tag, UserSquare, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createCustomer } from "@/app/actions/customers"
import { getStaff, type Staff } from "@/app/actions/staff"
import { CustomerSelectionModal } from "@/components/customer-selection-modal"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/page-header"

export default function CreateCustomer() {
  const router = useRouter()
  const [selectedGender, setSelectedGender] = useState("")
  const [loading, setLoading] = useState(false)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  const [formData, setFormData] = useState({
    phoneNumber: "",
    fullName: "",
    email: "",
    smsNumber: "",
    code: "",
    instagramHandle: "",
    leadSource: "",
    dateOfBirth: "",
    dateOfAnniversary: "",
    notes: "",
    tags: "",
    preferredStaffId: "",
    referredByCustomerId: "",
    referredByCustomerName: "",
  })

  useEffect(() => {
    getStaff().then(setStaffList).catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.phoneNumber || !formData.fullName) {
      toast({
        title: "Validation Error",
        description: "Phone number and Full name are required",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const submitData = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        // Convert camelCase to snake_case for the server action
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
        submitData.append(snakeKey, value)
      })
      submitData.append("gender", selectedGender)
      if (formData.tags) submitData.append("tags", formData.tags)
      if (formData.preferredStaffId && formData.preferredStaffId !== "none") submitData.append("preferred_staff_id", formData.preferredStaffId)
      if (formData.referredByCustomerId) submitData.append("referred_by_customer_id", formData.referredByCustomerId)


      const result = await createCustomer(submitData)

      if (result.success) {
        toast({
          title: "Success",
          description: "Customer created successfully",
        })
        router.push("/customers")
      } else {
        throw new Error(result.error || "Failed to create customer")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="px-6 py-4 border-b bg-white dark:bg-gray-800 flex items-center justify-between sticky top-0 z-10">
        <Link
          href="/customers"
          className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
        <h1 className="text-xl font-bold">Add New Customer</h1>
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Basic & Contact (Takes up 2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Basic Information */}
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="bg-white border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg text-slate-800">Basic Information</CardTitle>
                  <CardDescription>Essential details to identify this customer.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          value={formData.fullName}
                          onChange={(e) => handleInputChange("fullName", e.target.value)}
                          className="pl-10 border-gray-300 focus:ring-slate-500"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          value={formData.phoneNumber}
                          onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                          className="pl-10 border-gray-300 focus:ring-slate-500"
                          placeholder="9876543210"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-sm font-medium text-slate-700">Gender</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "male", label: "Male", icon: "♂" },
                        { value: "female", label: "Female", icon: "♀" },
                        { value: "others", label: "Others", icon: "⚧" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedGender(option.value)}
                          className={`flex flex-col items-center justify-center py-3 rounded-lg border transition-all ${
                            selectedGender === option.value
                              ? "border-slate-800 bg-slate-50 text-slate-900 shadow-sm"
                              : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="text-xl mb-1">{option.icon}</div>
                          <div className="text-xs font-medium">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Details */}
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="bg-white border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg text-slate-800">Contact Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className="pl-10 border-gray-300 focus:ring-slate-500"
                          placeholder="johndoe@example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">SMS Number</Label>
                      <div className="flex">
                        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 border-r-0 rounded-l-md bg-gray-50 text-gray-500">
                          <span className="text-xs font-medium">+91</span>
                        </div>
                        <Input
                          value={formData.smsNumber}
                          onChange={(e) => handleInputChange("smsNumber", e.target.value)}
                          className="rounded-l-none border-gray-300 focus:ring-slate-500"
                          placeholder="Optional alternate"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Instagram Handle</Label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          value={formData.instagramHandle}
                          onChange={(e) => handleInputChange("instagramHandle", e.target.value)}
                          className="pl-10 border-gray-300 focus:ring-slate-500"
                          placeholder="@username"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Lead Source</Label>
                      <Select value={formData.leadSource} onValueChange={(value) => handleInputChange("leadSource", value)}>
                        <SelectTrigger className="border-gray-300 focus:ring-slate-500">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google">Google</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="walk-in">Walk-in</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Column: Additional Details (Takes up 1/3 width) */}
            <div className="space-y-6">
              
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="bg-white border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg text-slate-800">Additional</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 bg-white">
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                        className="pl-10 border-gray-300 focus:ring-slate-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Date of Anniversary</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="date"
                        value={formData.dateOfAnniversary}
                        onChange={(e) => handleInputChange("dateOfAnniversary", e.target.value)}
                        className="pl-10 border-gray-300 focus:ring-slate-500 text-sm"
                      />
                    </div>
                  </div>

                  
                  <div className="space-y-2 pt-2">
                    <Label className="text-sm font-medium text-slate-700">Tags</Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        value={formData.tags}
                        onChange={(e) => handleInputChange("tags", e.target.value)}
                        className="pl-10 border-gray-300 focus:ring-slate-500"
                        placeholder="VIP, Regular, etc. (comma separated)"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-sm font-medium text-slate-700">Preferred Stylist</Label>
                    <Select value={formData.preferredStaffId} onValueChange={(value) => handleInputChange("preferredStaffId", value)}>
                      <SelectTrigger className="border-gray-300 focus:ring-slate-500">
                        <SelectValue placeholder="Select preferred staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {staffList.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>{staff.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-sm font-medium text-slate-700">Referred By</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start border-gray-300 text-gray-700"
                        onClick={() => setShowCustomerModal(true)}
                      >
                        <User className="mr-2 h-4 w-4" />
                        {formData.referredByCustomerName || "Select Referrer"}
                      </Button>
                      {formData.referredByCustomerId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            handleInputChange("referredByCustomerId", "")
                            handleInputChange("referredByCustomerName", "")
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-sm font-medium text-slate-700">Customer Code</Label>
                    <div className="relative">
                      <QrCode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        value={formData.code}
                        onChange={(e) => handleInputChange("code", e.target.value)}
                        className="pl-10 border-gray-300 focus:ring-slate-500"
                        placeholder="Optional internal code"
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>

              <Card className="shadow-sm border-gray-200">
                <CardHeader className="bg-white border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg text-slate-800">Notes</CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      className="pl-10 min-h-[120px] border-gray-300 focus:ring-slate-500 resize-none"
                      placeholder="Add any special requirements, allergies, or preferences here..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
          </div>

          <div className="flex justify-end gap-4 pt-4 pb-10">
            <Link href="/customers">
              <Button type="button" variant="outline" className="px-6 py-2 border-gray-300 text-gray-700 h-11">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              className="px-8 py-2 bg-slate-800 hover:bg-slate-900 text-white shadow-md h-11" 
              disabled={loading}
            >
              {loading ? "Creating Customer..." : "Save Customer"}
            </Button>
          </div>
        </form>
      </div>

      <CustomerSelectionModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={(customer) => {
          handleInputChange("referredByCustomerId", customer.id.toString())
          handleInputChange("referredByCustomerName", customer.full_name)
          setShowCustomerModal(false)
        }}
      />
    </div>
  )
}
