// app/customers/create/page.tsx
"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, User, QrCode, Calendar, FileText } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { createCustomer } from "@/app/actions/customers"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { Header } from "@/components/header"

export default function CreateCustomer() {
  const router = useRouter()
  const [selectedGender, setSelectedGender] = useState("")
  const [loading, setLoading] = useState(false)
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
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.phoneNumber || !formData.fullName) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields (Phone Number and Full Name)",
        variant: "destructive",
      })
      return
    }

    if (!selectedGender) {
      toast({
        title: "Validation Error",
        description: "Please select a gender",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append("phoneNumber", formData.phoneNumber)
      formDataObj.append("fullName", formData.fullName)
      formDataObj.append("email", formData.email)
      formDataObj.append("gender", selectedGender)
      formDataObj.append("smsNumber", formData.smsNumber)
      formDataObj.append("code", formData.code)
      formDataObj.append("instagramHandle", formData.instagramHandle)
      formDataObj.append("leadSource", formData.leadSource)
      formDataObj.append("dateOfBirth", formData.dateOfBirth)
      formDataObj.append("dateOfAnniversary", formData.dateOfAnniversary)
      formDataObj.append("notes", formData.notes)

      console.log("Submitting customer data:", {
        phoneNumber: formData.phoneNumber,
        fullName: formData.fullName,
        email: formData.email,
        gender: selectedGender,
        smsNumber: formData.smsNumber,
        code: formData.code,
        instagramHandle: formData.instagramHandle,
        leadSource: formData.leadSource,
        dateOfBirth: formData.dateOfBirth,
        dateOfAnniversary: formData.dateOfAnniversary,
        notes: formData.notes,
      })

      const result = await createCustomer(formDataObj)

      console.log("Create customer result:", result)

      if (result.success) {
        toast({
          title: "Success",
          description: "Customer created successfully!",
        })
        router.push("/customers")
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create customer",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating customer:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the customer",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <Header
          title="Create Customer"
          subtitle="Add a new customer to your database"
          action={
            <Link href="/customers">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Customers
              </Button>
            </Link>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Phone Number */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-medium text-red-600">* Phone Number</Label>
              <div className="mt-2 flex">
                <div className="flex items-center gap-2 px-3 py-2 border border-r-0 rounded-l-md bg-gray-50">
                  <div className="w-6 h-4 bg-orange-500 rounded-sm"></div>
                  <div className="w-6 h-4 bg-green-500 rounded-sm"></div>
                  <span className="text-sm">+91</span>
                </div>
                <Input
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  className="rounded-l-none"
                  placeholder="223 665 7896"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Full Name */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-medium text-red-600">* Full Name</Label>
              <div className="mt-2 relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  className="pl-10"
                  placeholder="John Doe"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Gender Selection */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-medium text-red-600">* Select Gender</Label>
              <div className="mt-4 grid grid-cols-3 gap-4">
                {[
                  { value: "male", label: "Male", icon: "♂" },
                  { value: "female", label: "Female", icon: "♀" },
                  { value: "others", label: "Others", icon: "⚧" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedGender(option.value)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedGender === option.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="text-sm font-medium">{option.label}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Email Address */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-medium">Email Address</Label>
              <div className="mt-2 relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="pl-8"
                  placeholder="johndoe@example.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* SMS Number */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-medium">SMS Number</Label>
              <div className="mt-2 flex">
                <div className="flex items-center gap-2 px-3 py-2 border border-r-0 rounded-l-md bg-gray-50">
                  <div className="w-6 h-4 bg-orange-500 rounded-sm"></div>
                  <div className="w-6 h-4 bg-green-500 rounded-sm"></div>
                  <span className="text-sm">+91</span>
                </div>
                <Input
                  value={formData.smsNumber}
                  onChange={(e) => handleInputChange("smsNumber", e.target.value)}
                  className="rounded-l-none"
                  placeholder=""
                />
              </div>
            </CardContent>
          </Card>

          {/* Code */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-medium">Code</Label>
              <div className="mt-2 relative">
                <QrCode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  className="pl-10"
                  placeholder="Enter code"
                />
              </div>
            </CardContent>
          </Card>

          {/* Instagram Handle */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-medium">Instagram Handle</Label>
              <Input
                value={formData.instagramHandle}
                onChange={(e) => handleInputChange("instagramHandle", e.target.value)}
                className="mt-2"
                placeholder="Enter your Instagram handle"
              />
            </CardContent>
          </Card>

          {/* Lead Source */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-medium">Lead Source</Label>
              <Select value={formData.leadSource} onValueChange={(value) => handleInputChange("leadSource", value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a lead source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Date of Birth */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-medium">Date of Birth</Label>
              <div className="mt-2 relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  className="pl-10"
                />
                {!formData.dateOfBirth && (
                  <span className="absolute left-10 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                    No date chosen
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Date of Anniversary */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-medium">Date of Anniversary</Label>
              <div className="mt-2 relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={formData.dateOfAnniversary}
                  onChange={(e) => handleInputChange("dateOfAnniversary", e.target.value)}
                  className="pl-10"
                />
                {!formData.dateOfAnniversary && (
                  <span className="absolute left-10 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                    No date chosen
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-medium">Notes</Label>
              <div className="mt-2 relative">
                <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  className="pl-10 min-h-[100px]"
                  placeholder="Notes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white py-3" disabled={loading}>
            {loading ? "Creating Customer..." : "Add Customer"}
          </Button>
        </form>
      </div>
    </div>
  )
}
