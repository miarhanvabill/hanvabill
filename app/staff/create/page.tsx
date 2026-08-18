"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, X, Plus } from "lucide-react"
import Link from "next/link"
import { createStaff, type Staff } from "@/app/actions/staff"
import { useToast } from "@/hooks/use-toast"

const COMMON_SPECIALTIES = [
  "Hair Cutting",
  "Hair Coloring",
  "Hair Styling",
  "Bridal Makeup",
  "Facial Treatment",
  "Massage Therapy",
  "Nail Art",
  "Manicure",
  "Pedicure",
  "Eyebrow Threading",
  "Waxing",
  "Keratin Treatment",
  "Hair Extensions",
  "Beard Trimming",
  "Skin Care",
]

export default function CreateStaffPage() {
  console.log("Rendering CreateStaffPage for /staff/create") // This log should appear!
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    position: "", // Maps to 'role' in DB
    department: "", // Not in DB, client-side only
    salary: "",
    commission_rate: "", // Stored as TEXT in DB
    hire_date: "",
    date_of_birth: "", // Not in DB, client-side only
    specialties: [] as string[], // Maps to 'skills' in DB (TEXT)
    notes: "", // Not in DB, client-side only
    is_active: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customSpecialty, setCustomSpecialty] = useState("")

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }))
  }

  const handleAddCustomSpecialty = () => {
    if (customSpecialty.trim() && !formData.specialties.includes(customSpecialty.trim())) {
      setFormData((prev) => ({
        ...prev,
        specialties: [...prev.specialties, customSpecialty.trim()],
      }))
      setCustomSpecialty("")
    }
  }

  const handleRemoveSpecialty = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((s) => s !== specialty),
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.position.trim()) {
      newErrors.position = "Position is required"
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number"
    }

    if (formData.salary && (isNaN(Number(formData.salary)) || Number(formData.salary) < 0)) {
      newErrors.salary = "Please enter a valid salary amount"
    }

    // Commission rate is TEXT in DB, but form expects number validation
    if (
      formData.commission_rate &&
      (isNaN(Number(formData.commission_rate)) ||
        Number(formData.commission_rate) < 0 ||
        Number(formData.commission_rate) > 100)
    ) {
      newErrors.commission_rate = "Commission rate must be between 0 and 100"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    startTransition(async () => {
      try {
        // Map form data to Staff interface for DB
        const staffData: Omit<Staff, "id" | "created_at" | "updated_at"> = {
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          role: formData.position || null, // Map position to role
          salary: formData.salary ? Number.parseFloat(formData.salary) : null,
          commission_rate: formData.commission_rate || null, // Send as string
          hire_date: formData.hire_date || null,
          is_active: formData.is_active,
          skills: formData.specialties.join(", ") || null, // Map specialties array to skills string
          emergency_contact: null, // Not in form, set to null
          // department, date_of_birth, notes are not sent to DB
        }

        const result = await createStaff(staffData)

        if (result.success && result.data) {
          toast({
            title: "Success",
            description: "Staff member created successfully",
          })
          router.push(`/staff/${result.data.id}`)
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to create staff member. Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error creating staff:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred while creating staff member.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/staff">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Staff
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Staff Member</h1>
              <p className="text-gray-600">Create a new staff member profile</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className={errors.name ? "border-red-500" : ""}
                        placeholder="Enter full name"
                      />
                      {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className={errors.email ? "border-red-500" : ""}
                        placeholder="Enter email address"
                      />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className={errors.phone ? "border-red-500" : ""}
                      placeholder="Enter phone number"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Employment Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="position">Position *</Label>
                      <Select value={formData.position} onValueChange={(value) => handleInputChange("position", value)}>
                        <SelectTrigger className={errors.position ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hair Stylist">Hair Stylist</SelectItem>
                          <SelectItem value="Barber">Barber</SelectItem>
                          <SelectItem value="Nail Technician">Nail Technician</SelectItem>
                          <SelectItem value="Esthetician">Esthetician</SelectItem>
                          <SelectItem value="Massage Therapist">Massage Therapist</SelectItem>
                          <SelectItem value="Receptionist">Receptionist</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Assistant">Assistant</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.position && <p className="text-red-500 text-sm mt-1">{errors.position}</p>}
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Select
                        value={formData.department}
                        onValueChange={(value) => handleInputChange("department", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hair Care">Hair Care</SelectItem>
                          <SelectItem value="Skin Care">Skin Care</SelectItem>
                          <SelectItem value="Nail Care">Nail Care</SelectItem>
                          <SelectItem value="Body Care">Body Care</SelectItem>
                          <SelectItem value="Administration">Administration</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="hire_date">Hire Date</Label>
                      <Input
                        id="hire_date"
                        type="date"
                        value={formData.hire_date}
                        onChange={(e) => handleInputChange("hire_date", e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                      />
                      <Label htmlFor="is_active">Active Employee</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compensation */}
              <Card>
                <CardHeader>
                  <CardTitle>Compensation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="salary">Monthly Salary (₹)</Label>
                      <Input
                        id="salary"
                        type="number"
                        min="0"
                        step="100"
                        value={formData.salary}
                        onChange={(e) => handleInputChange("salary", e.target.value)}
                        className={errors.salary ? "border-red-500" : ""}
                        placeholder="Enter monthly salary"
                      />
                      {errors.salary && <p className="text-red-500 text-sm mt-1">{errors.salary}</p>}
                    </div>
                    <div>
                      <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                      <Input
                        id="commission_rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.commission_rate}
                        onChange={(e) => handleInputChange("commission_rate", e.target.value)}
                        className={errors.commission_rate ? "border-red-500" : ""}
                        placeholder="Enter commission rate"
                      />
                      {errors.commission_rate && <p className="text-red-500 text-sm mt-1">{errors.commission_rate}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Specialties */}
              <Card>
                <CardHeader>
                  <CardTitle>Specialties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Select Specialties</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {COMMON_SPECIALTIES.map((specialty) => (
                        <div
                          key={specialty}
                          onClick={() => handleSpecialtyToggle(specialty)}
                          className={`p-2 border rounded cursor-pointer text-sm text-center transition-colors ${
                            formData.specialties.includes(specialty)
                              ? "bg-blue-100 border-blue-500 text-blue-700"
                              : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {specialty}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Add Custom Specialty</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={customSpecialty}
                        onChange={(e) => setCustomSpecialty(e.target.value)}
                        placeholder="Enter custom specialty"
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomSpecialty())}
                      />
                      <Button type="button" onClick={handleAddCustomSpecialty} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {formData.specialties.length > 0 && (
                    <div>
                      <Label>Selected Specialties</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.specialties.map((specialty) => (
                          <Badge key={specialty} variant="secondary" className="cursor-pointer">
                            {specialty}
                            <X className="h-3 w-3 ml-1" onClick={() => handleRemoveSpecialty(specialty)} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      rows={4}
                      placeholder="Any additional notes about the staff member..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button type="submit" className="w-full" disabled={isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {isPending ? "Creating..." : "Create Staff Member"}
                  </Button>
                  <Link href="/staff" className="w-full">
                    <Button type="button" variant="outline" className="w-full bg-transparent">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Name</span>
                    <span className="font-medium">{formData.name || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Position</span>
                    <span className="font-medium">{formData.position || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Department</span>
                    <span className="font-medium">{formData.department || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`font-medium ${formData.is_active ? "text-green-600" : "text-red-600"}`}>
                      {formData.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {formData.specialties.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-500">Specialties</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.specialties.slice(0, 3).map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                        {formData.specialties.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{formData.specialties.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
