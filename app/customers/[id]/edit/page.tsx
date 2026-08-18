import { notFound } from "next/navigation"
import { getCustomer, updateCustomer } from "@/app/actions/customers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { revalidatePath } from "next/cache"

// Server action scoped to this page
async function updateCustomerWithRevalidation(id: string, formData: FormData) {
  "use server"

  const data = {
    full_name: (formData.get("full_name") as string) || undefined,
    phone_number: (formData.get("phone_number") as string) || undefined,
    email: (formData.get("email") as string) || undefined,
    address: (formData.get("address") as string) || undefined,
    gender: (formData.get("gender") as string) || undefined,
    date_of_birth: (formData.get("date_of_birth") as string) || undefined,
    date_of_anniversary: (formData.get("date_of_anniversary") as string) || undefined,
    sms_number: (formData.get("sms_number") as string) || undefined,
    code: (formData.get("code") as string) || undefined,
    instagram_handle: (formData.get("instagram_handle") as string) || undefined,
    lead_source: (formData.get("lead_source") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  }

  const result = await updateCustomer(id, data)

  if (result.success) {
    revalidatePath("/customers")
    revalidatePath(`/customers/${id}`)
    revalidatePath(`/customers/${id}/edit`)
  }

  return result
}

function toInputDate(value?: unknown) {
  if (!value) return ""
  if (typeof value === "string") {
    // Handles "YYYY-MM-DD" and ISO strings
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const part = value.split("T")[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part
  }
  const d = new Date(value as any)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const customerId = params.id
  const customer = await getCustomer(customerId)
  
  if (!customer) notFound()

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <Link
          href={`/customers/${customer.id}`}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>
        <h1 className="text-lg font-semibold">Edit Customer</h1>
        <div />
      </div>

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <form
            action={updateCustomerWithRevalidation.bind(null, customerId)}
            className="space-y-6 bg-white p-6 rounded-lg shadow"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" name="full_name" defaultValue={customer.full_name || ""} required />
              </div>

              <div>
                <Label htmlFor="phone_number">Phone Number *</Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  defaultValue={customer.phone_number || ""}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={customer.email || ""} />
              </div>

              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  name="gender"
                  defaultValue={customer.gender || ""}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  defaultValue={toInputDate(customer.date_of_birth)}
                />
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
                <Input
                  id="sms_number"
                  name="sms_number"
                  defaultValue={customer.sms_number || ""}
                  placeholder="Same as phone or alternate"
                />
              </div>

              <div>
                <Label htmlFor="code">Customer Code</Label>
                <Input id="code" name="code" defaultValue={customer.code || ""} placeholder="e.g. CUST-001" />
              </div>

              <div>
                <Label htmlFor="instagram_handle">Instagram Handle</Label>
                <Input
                  id="instagram_handle"
                  name="instagram_handle"
                  defaultValue={customer.instagram_handle || ""}
                  placeholder="@username"
                />
              </div>

              <div>
                <Label htmlFor="lead_source">Lead Source</Label>
                <select
                  id="lead_source"
                  name="lead_source"
                  defaultValue={customer.lead_source || ""}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select source</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="referral">Referral</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
                  <option value="facebook">Facebook</option>
                  <option value="loyalty_program">Loyalty Program</option>
                  <option value="event">Event</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={customer.address || ""}
                rows={3}
                placeholder="Full address including city and pincode"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={customer.notes || ""}
                rows={4}
                placeholder="Allergies, preferences, special instructions..."
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/customers/${customer.id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
