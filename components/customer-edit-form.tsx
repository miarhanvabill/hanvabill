// components/customer-edit-form.tsx
"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save } from "lucide-react"
import Link from "next/link"

import type { Customer } from "@/app/actions/customers"
import type { UpdateCustomerState } from "@/app/actions/customers"

type BoundUpdateAction = (state: UpdateCustomerState, formData: FormData) => Promise<UpdateCustomerState>

interface CustomerEditFormProps {
  customer: Customer
  action: BoundUpdateAction
  onSaved?: () => void
  onCancel?: () => void
  cancelHref?: string
}

export function CustomerEditForm({ customer, action, onSaved, onCancel, cancelHref }: CustomerEditFormProps) {
  const router = useRouter()
  const [gender, setGender] = useState(customer.gender || "")
  const [leadSource, setLeadSource] = useState(customer.lead_source || "")
  const [state, formAction, pending] = useActionState<UpdateCustomerState, FormData>(action, { success: false })

  useEffect(() => {
    if (state?.success) {
      onSaved?.()
      // Refresh server-rendered data on the page
      router.refresh()
    }
  }, [state?.success, onSaved, router])

  const toInputDate = (value?: string | null) => {
    if (!value) return ""
    // Accept both "YYYY-MM-DD" and ISO strings
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value).split("T")[0] || ""
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }

  return (
    <form action={formAction} className="space-y-6 bg-white p-6 rounded-lg shadow">
      {/* Submit shadcn Select values */}
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="lead_source" value={leadSource} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="full_name">Full Name *</Label>
          <Input id="full_name" name="full_name" defaultValue={customer.full_name || ""} required />
        </div>

        <div>
          <Label htmlFor="phone_number">Phone Number *</Label>
          <Input id="phone_number" name="phone_number" type="tel" defaultValue={customer.phone_number || ""} required />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={customer.email || ""} />
        </div>

        <div>
          <Label>Gender</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={toInputDate(customer.date_of_birth)} />
        </div>

        <div>
          <Label htmlFor="date_of_anniversary">Anniversary Date</Label>
          <Input
            id="date_of_anniversary"
            name="date_of_anniversary"
            type="date"
            defaultValue={toInputDate(customer.date_of_anniversary)}
          />
        </div>

        <div>
          <Label htmlFor="sms_number">SMS Number</Label>
          <Input id="sms_number" name="sms_number" defaultValue={customer.sms_number || ""} placeholder="Same as phone or alternate" />
        </div>

        <div>
          <Label htmlFor="code">Customer Code</Label>
          <Input id="code" name="code" defaultValue={customer.code || ""} placeholder="e.g. CUST-001" />
        </div>

        <div>
          <Label htmlFor="instagram_handle">Instagram Handle</Label>
          <Input id="instagram_handle" name="instagram_handle" defaultValue={customer.instagram_handle || ""} placeholder="@username" />
        </div>

        <div>
          <Label>Lead Source</Label>
          <Select value={leadSource} onValueChange={setLeadSource}>
            <SelectTrigger>
              <SelectValue placeholder="How did they hear about us?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk_in">Walk-in</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="loyalty_program">Loyalty Program</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" name="address" defaultValue={customer.address || ""} rows={3} placeholder="Full address including city and pincode" />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={customer.notes || ""} rows={4} placeholder="Allergies, preferences, special instructions..." />
      </div>

      {state?.message && !state.success && <p className="text-sm text-red-600">{state.message}</p>}

      <div className="flex gap-4">
        <Button type="submit" className="gap-2" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Saving..." : "Save Changes"}
        </Button>
        {cancelHref ? (
          <Button type="button" variant="outline" asChild>
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
