"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateBusinessSettings } from "@/app/actions/settings"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
]

export function StoreSettingsClient({ initialSettings }: { initialSettings: any }) {
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState(initialSettings?.profile || {})
  const [business, setBusiness] = useState(initialSettings?.business || {})

  const handleProfileChange = (field: string, value: string) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleBusinessChange = (field: string, value: any) => {
    setBusiness((prev: any) => ({ ...prev, [field]: value }))
  }

  const toggleWorkingDay = (dayId: string) => {
    setBusiness((prev: any) => {
      const currentDays = prev.workingDays || []
      const newDays = currentDays.includes(dayId)
        ? currentDays.filter((d: string) => d !== dayId)
        : [...currentDays, dayId]
      return { ...prev, workingDays: newDays }
    })
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const res = await updateBusinessSettings("profile", profile)
      if (res.success) {
        toast.success("Profile settings updated successfully")
      } else {
        toast.error(res.message || "Failed to update profile settings")
      }
    } catch (error) {
      toast.error("An error occurred while saving")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveBusiness = async () => {
    setIsSaving(true)
    try {
      const res = await updateBusinessSettings("business", business)
      if (res.success) {
        toast.success("Business settings updated successfully")
      } else {
        toast.error(res.message || "Failed to update business settings")
      }
    } catch (error) {
      toast.error("An error occurred while saving")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Tabs defaultValue="general" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 lg:w-[600px] lg:grid-cols-4">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="location">Location</TabsTrigger>
        <TabsTrigger value="taxes">Taxes</TabsTrigger>
        <TabsTrigger value="availability">Availability</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>
              Manage your salon's core information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salonName">Salon Name</Label>
                <Input
                  id="salonName"
                  value={profile.salonName || ""}
                  onChange={(e) => handleProfileChange("salonName", e.target.value)}
                  placeholder="e.g. Hanva Salon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input
                  id="ownerName"
                  value={profile.ownerName || ""}
                  onChange={(e) => handleProfileChange("ownerName", e.target.value)}
                  placeholder="Owner's Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => handleProfileChange("email", e.target.value)}
                  placeholder="hello@salon.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone || ""}
                  onChange={(e) => handleProfileChange("phone", e.target.value)}
                  placeholder="+91..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Business Description</Label>
              <Textarea
                id="description"
                value={profile.description || ""}
                onChange={(e) => handleProfileChange("description", e.target.value)}
                placeholder="A brief description of your salon services..."
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="location">
        <Card>
          <CardHeader>
            <CardTitle>Address & Location</CardTitle>
            <CardDescription>
              Where is your salon located?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Full Address</Label>
              <Textarea
                id="address"
                value={profile.address || ""}
                onChange={(e) => handleProfileChange("address", e.target.value)}
                placeholder="123 Main Street, City..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={profile.website || ""}
                onChange={(e) => handleProfileChange("website", e.target.value)}
                placeholder="https://www.yoursalon.com"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="taxes">
        <Card>
          <CardHeader>
            <CardTitle>Tax Preferences</CardTitle>
            <CardDescription>
              Manage your default tax rates and tax identifiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / GSTIN</Label>
                <Input
                  id="taxId"
                  value={business.taxId || ""}
                  onChange={(e) => handleBusinessChange("taxId", e.target.value)}
                  placeholder="e.g. 27ABCDE1234F1Z5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={business.taxRate ?? 18}
                  onChange={(e) => handleBusinessChange("taxRate", Number(e.target.value))}
                  placeholder="18"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={business.currency || "INR"}
                  onChange={(e) => handleBusinessChange("currency", e.target.value)}
                  placeholder="INR, USD, etc."
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveBusiness} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="availability">
        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>
              Configure your general availability and working days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="openTime">Opening Time</Label>
                <Input
                  id="openTime"
                  type="time"
                  value={business.openTime || "09:00"}
                  onChange={(e) => handleBusinessChange("openTime", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closeTime">Closing Time</Label>
                <Input
                  id="closeTime"
                  type="time"
                  value={business.closeTime || "20:00"}
                  onChange={(e) => handleBusinessChange("closeTime", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointmentDuration">Default Appt. Duration (mins)</Label>
                <Input
                  id="appointmentDuration"
                  type="number"
                  value={business.appointmentDuration || 30}
                  onChange={(e) => handleBusinessChange("appointmentDuration", Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Working Days</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.id} className="flex items-center space-x-2 border p-3 rounded-md">
                    <Checkbox
                      id={`day-${day.id}`}
                      checked={(business.workingDays || []).includes(day.id)}
                      onCheckedChange={() => toggleWorkingDay(day.id)}
                    />
                    <Label htmlFor={`day-${day.id}`} className="font-normal cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveBusiness} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
