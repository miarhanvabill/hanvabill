"use client"

import type React from "react"
import { Suspense, useState, useTransition, useEffect } from "react"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, X } from 'lucide-react'
import Link from "next/link"
import { getStaffMember, updateStaff, type Staff } from "@/app/actions/staff"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface EditStaffPageProps {
  params: {
    id: string
  }
}

function EditStaffForm({ staff }: { staff: Staff }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    name: staff.name || "",
    email: staff.email || "",
    phone: staff.phone || "",
    address: staff.address || "",
    position: staff.role || "", // Map DB 'role' to form 'position'
    department: "", // Not in DB, client-side only
    salary: staff.salary?.toString() || "",
    commission_rate: staff.commission_rate || "", // Stored as TEXT in DB
    hire_date: staff.hire_date ? new Date(staff.hire_date).toISOString().split("T")[0] : "",
    date_of_birth: "", // Not in DB, client-side only
    specialties: staff.skills ? staff.skills.split(',').map(s => s.trim()).filter(Boolean) : [], // Map DB 'skills' to form 'specialties' array
    notes: "", // Not in DB, client-side only
    is_active: staff.is_active ?? true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
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
        const updateData: Partial<Omit<Staff, "id" | "created_at" | "updated_at">> = {
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          role: formData.position || null, // Map position to role
          salary: formData.salary ? Number.parseFloat(formData.salary) : null,
          commission_rate: formData.commission_rate || null, // Send as string
          hire_date: formData.hire_date || null,
          is_active: formData.is_active,
          skills: Array.isArray(formData.specialties) ? formData.specialties.join(", ") || null : formData.specialties || null, // Map specialties array to skills string
          emergency_contact: null, // Not in form, set to null
          // department, date_of_birth, notes are not sent to DB
        }

        const result = await updateStaff(staff.id, updateData)

        if (result.success) {
          toast({
            title: "Success",
            description: "Staff member updated successfully",
          })
          router.push(`/staff/${staff.id}`)
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to update staff member. Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error updating staff:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred while updating staff member.",
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
            <Link href={`/staff/${staff.id}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Profile
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Staff Member</h1>
              <p className="text-gray-600">Update {staff.name}'s information</p>
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
                      />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className={errors.phone ? "border-red-500" : ""}
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
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      rows={3}
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
                      />
                      {errors.commission_rate && <p className="text-red-500 text-sm mt-1">{errors.commission_rate}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Specialties & Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="specialties">Specialties</Label>
                    <Input
                      id="specialties"
                      value={Array.isArray(formData.specialties) ? formData.specialties.join(", ") : formData.specialties}
                      onChange={(e) => handleInputChange("specialties", e.target.value)}
                      placeholder="e.g., Hair Coloring, Bridal Makeup, Keratin Treatment"
                    />
                    <p className="text-sm text-gray-500 mt-1">Separate multiple specialties with commas</p>
                  </div>
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
                    {isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Link href={`/staff/${staff.id}`} className="w-full">
                    <Button type="button" variant="outline" className="w-full bg-transparent">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Current Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Employee ID</span>
                    <span className="font-medium">#{staff.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`font-medium ${formData.is_active ? "text-green-600" : "text-red-600"}`}>
                      {formData.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Updated</span>
                    <span className="font-medium">
                      {staff.updated_at ? new Date(staff.updated_at).toLocaleDateString() : "Never"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EditStaffPage({ params }: EditStaffPageProps) {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const parsedId = Number.parseInt(params.id)
        if (isNaN(parsedId)) {
          setError(true)
          return
        }

        const staffData = await getStaffMember(parsedId)
        if (!staffData) {
          setError(true)
          return
        }

        setStaff(staffData)
      } catch (err) {
        console.error("Error fetching staff:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchStaff()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-6">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !staff) {
    notFound()
  }

  return <EditStaffForm staff={staff} />
}
