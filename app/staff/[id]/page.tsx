import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Edit, Phone, Mail, MapPin, Clock, Star, Award, TrendingUp } from "lucide-react"
import Link from "next/link"
import { getStaffMember, type Staff } from "@/app/actions/staff"

interface StaffDetailsPageProps {
  params: {
    id: string
  }
}

async function StaffDetailsContent({ staffId }: { staffId: string }) {
  if (staffId === "create") {
    // This indicates a routing misconfiguration - /staff/create should be handled by create/page.tsx
    notFound()
  }

  const parsedId = Number.parseInt(staffId, 10)

  if (isNaN(parsedId) || parsedId <= 0) {
    // Invalid ID format
    notFound()
  }

  const staff: Staff | null = await getStaffMember(parsedId)

  if (!staff) {
    notFound()
  }

  // Map DB 'role' to 'position' for display consistency with forms
  const displayPosition = staff.role || "Not specified"
  // Map DB 'skills' (string) to an array for display
  const displaySpecialties = staff.skills
    ? staff.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  // Handle commission_rate as string
  const displayCommissionRate = staff.commission_rate ? `${staff.commission_rate}%` : "Not applicable"

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
              <h1 className="text-3xl font-bold text-gray-900">{staff.name}</h1>
              <p className="text-gray-600">{displayPosition}</p>
            </div>
          </div>
          <Link href={`/staff/${staff.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Staff
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Staff Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{staff.phone || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{staff.email || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{staff.address || "Not provided"}</p>
                      </div>
                    </div>
                    {/* date_of_birth is not in DB schema, so removed */}
                  </div>
                </div>

                <Separator />

                {/* Employment Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Employment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Position</p>
                      <p className="font-medium">{displayPosition}</p>
                    </div>
                    {/* Department is not in DB schema, so removed */}
                    <div>
                      <p className="text-sm text-gray-500">Hire Date</p>
                      <p className="font-medium">
                        {staff.hire_date ? new Date(staff.hire_date).toLocaleDateString() : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Employment Status</p>
                      <Badge variant={staff.is_active ? "default" : "secondary"}>
                        {staff.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Compensation */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Compensation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Salary</p>
                      <p className="font-medium">
                        {staff.salary ? `₹${staff.salary.toLocaleString()}` : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Commission Rate</p>
                      <p className="font-medium">{displayCommissionRate}</p>
                    </div>
                  </div>
                </div>

                {/* Specialties */}
                {displaySpecialties.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Specialties</h3>
                      <div className="flex flex-wrap gap-2">
                        {displaySpecialties.map((specialty, index) => (
                          <Badge key={index} variant="outline">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Notes is not in DB schema, so removed */}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Bookings</span>
                  <span className="font-semibold">156</span> {/* Placeholder data */}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">This Month</span>
                  <span className="font-semibold">23</span> {/* Placeholder data */}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Revenue Generated</span>
                  <span className="font-semibold">₹45,230</span> {/* Placeholder data */}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Avg. Rating</span>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-semibold ml-1">4.8</span> {/* Placeholder data */}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <div>
                    <p className="font-medium text-sm">Hair Cut</p>
                    <p className="text-xs text-gray-500">John Doe</p>
                  </div>
                  <span className="text-xs font-medium">10:00 AM</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div>
                    <p className="font-medium text-sm">Hair Color</p>
                    <p className="text-xs text-gray-500">Jane Smith</p>
                  </div>
                  <span className="text-xs font-medium">2:00 PM</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                  <div>
                    <p className="font-medium text-sm">Facial</p>
                    <p className="text-xs text-gray-500">Alice Johnson</p>
                  </div>
                  <span className="text-xs font-medium">4:30 PM</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Customer Satisfaction</span>
                    <span>96%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: "96%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Monthly Target</span>
                    <span>78%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "78%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Punctuality</span>
                    <span>92%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "92%" }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StaffDetailsPage({ params }: StaffDetailsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="h-96 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-6">
                  <div className="h-48 bg-gray-200 rounded"></div>
                  <div className="h-48 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <StaffDetailsContent staffId={params.id} />
    </Suspense>
  )
}
