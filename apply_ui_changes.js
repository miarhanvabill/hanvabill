const fs = require('fs');
let content = fs.readFileSync('app/customers/create/page.tsx', 'utf-8');

// Add imports
if (!content.includes('import { getStaff }')) {
  content = content.replace('import { createCustomer } from "@/app/actions/customers"', 'import { createCustomer } from "@/app/actions/customers"\nimport { getStaff, type Staff } from "@/app/actions/staff"\nimport { useEffect } from "react"');
}

if (!content.includes('import { Tag, UserSquare } from \'lucide-react\'')) {
  content = content.replace('import { ArrowLeft, User, Phone, Mail, QrCode, Calendar, FileText, Instagram, Globe } from \'lucide-react\'', 'import { ArrowLeft, User, Phone, Mail, QrCode, Calendar, FileText, Instagram, Globe, Tag, UserSquare } from \'lucide-react\'');
}

// Add state for staff and tags, preferredStaff
if (!content.includes('const [staffList, setStaffList]')) {
  content = content.replace('const [loading, setLoading] = useState(false)', 'const [loading, setLoading] = useState(false)\n  const [staffList, setStaffList] = useState<Staff[]>([])');
}
if (!content.includes('preferredStaffId: ""')) {
  content = content.replace('notes: "",', 'notes: "",\n    tags: "",\n    preferredStaffId: "",');
}

// Fetch staff on mount
if (!content.includes('useEffect(() => {')) {
  content = content.replace('const handleSubmit = async', 'useEffect(() => {\n    getStaff().then(setStaffList).catch(console.error)\n  }, [])\n\n  const handleSubmit = async');
}

// Update formData append
content = content.replace(
  'submitData.append("gender", selectedGender)',
  'submitData.append("gender", selectedGender)\n      if (formData.tags) submitData.append("tags", formData.tags)\n      if (formData.preferredStaffId && formData.preferredStaffId !== "none") submitData.append("preferred_staff_id", formData.preferredStaffId)'
);

// Add fields to UI. Add them before "Customer Code"
const uiFields = `
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
`;

content = content.replace(
  '<div className="space-y-2 pt-2">\n                    <Label className="text-sm font-medium text-slate-700">Customer Code</Label>',
  uiFields + '\n                  <div className="space-y-2 pt-2">\n                    <Label className="text-sm font-medium text-slate-700">Customer Code</Label>'
);

fs.writeFileSync('app/customers/create/page.tsx', content);
console.log('app/customers/create/page.tsx updated');

// Edit Page
let editContent = fs.readFileSync('app/customers/[id]/edit/page.tsx', 'utf-8');
if (!editContent.includes('import { getStaff }')) {
  editContent = editContent.replace('import { getCustomer, updateCustomer } from "@/app/actions/customers"', 'import { getCustomer, updateCustomer } from "@/app/actions/customers"\nimport { getStaff } from "@/app/actions/staff"');
}
editContent = editContent.replace('const customer = await getCustomer(customerId)', 'const customer = await getCustomer(customerId)\n  const staffList = await getStaff()');

// Update Server action
editContent = editContent.replace(
  'notes: (formData.get("notes") as string) || undefined,',
  'notes: (formData.get("notes") as string) || undefined,\n    tags: formData.get("tags") ? (formData.get("tags") as string).split(",").map(t => t.trim()).filter(Boolean) : undefined,\n    preferred_staff_id: formData.get("preferred_staff_id") && formData.get("preferred_staff_id") !== "none" ? Number(formData.get("preferred_staff_id")) : null,'
);

// Add to UI
const editUiFields = `
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={customer.tags ? customer.tags.join(", ") : ""}
                  placeholder="VIP, Regular (comma separated)"
                />
              </div>

              <div>
                <Label htmlFor="preferred_staff_id">Preferred Stylist</Label>
                <select
                  id="preferred_staff_id"
                  name="preferred_staff_id"
                  defaultValue={customer.preferred_staff_id?.toString() || "none"}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="none">None</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id.toString()}>{staff.name}</option>
                  ))}
                </select>
              </div>
`;

editContent = editContent.replace(
  '<div>\n                <Label htmlFor="lead_source">Lead Source</Label>',
  editUiFields + '\n              <div>\n                <Label htmlFor="lead_source">Lead Source</Label>'
);

fs.writeFileSync('app/customers/[id]/edit/page.tsx', editContent);
console.log('app/customers/[id]/edit/page.tsx updated');

// Profile Display Page
let profileContent = fs.readFileSync('components/customer-profile-display.tsx', 'utf-8');

if (!profileContent.includes('import { type Staff }')) {
  profileContent = profileContent.replace(
    'import type { Booking, Invoice } from "@/app/actions/bookings"',
    'import type { Booking, Invoice } from "@/app/actions/bookings"\nimport type { Staff } from "@/app/actions/staff"'
  );
}

if (!profileContent.includes('staffList?: Staff[]')) {
  profileContent = profileContent.replace(
    'activeMembership?: any',
    'activeMembership?: any\n  staffList?: Staff[]'
  );
}

profileContent = profileContent.replace(
  '{ customer, bookings, invoices, activeMembership }',
  '{ customer, bookings, invoices, activeMembership, staffList = [] }'
);

if (!profileContent.includes('const preferredStaffObj')) {
  profileContent = profileContent.replace(
    'const preferredServices = sortedServices.slice(0, 3).map(([service]) => service)',
    'const preferredServices = sortedServices.slice(0, 3).map(([service]) => service)\n  const preferredStaffObj = staffList.find(s => s.id === customer.preferred_staff_id)'
  );
}

const tagsAndStaffUi = `
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {customer.tags && customer.tags.length > 0 ? (
                        customer.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-gray-600">No tags.</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Preferred Stylist</h4>
                    <p className="text-sm text-gray-600">{preferredStaffObj ? preferredStaffObj.name : "None"}</p>
                  </div>
`;

profileContent = profileContent.replace(
  '<div className="pt-4 border-t">\n                    <h4 className="font-medium mb-2">Notes</h4>',
  tagsAndStaffUi + '\n                  <div className="pt-4 border-t">\n                    <h4 className="font-medium mb-2">Notes</h4>'
);

fs.writeFileSync('components/customer-profile-display.tsx', profileContent);
console.log('components/customer-profile-display.tsx updated');
