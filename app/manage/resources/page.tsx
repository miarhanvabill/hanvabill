"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Edit,
  Trash2,
  Wrench,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Settings,
  Users,
  MapPin,
} from "lucide-react"

interface Resource {
  id: string
  name: string
  type: "equipment" | "room" | "station" | "tool"
  description: string
  location: string
  capacity: number
  is_available: boolean
  maintenance_due?: string
  last_maintenance?: string
  assigned_staff?: string[]
  booking_slots: ResourceBooking[]
  created_at: string
}

interface ResourceBooking {
  id: string
  resource_id: string
  staff_id: string
  staff_name: string
  customer_name: string
  service_name: string
  start_time: string
  end_time: string
  status: "confirmed" | "in_progress" | "completed" | "cancelled"
}

export default function ResourceAvailabilityPage() {
  const [activeTab, setActiveTab] = useState("resources")
  const [resources, setResources] = useState<Resource[]>([])
  const [bookings, setBookings] = useState<ResourceBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isCreateResourceDialogOpen, setIsCreateResourceDialogOpen] = useState(false)
  const [isEditResourceDialogOpen, setIsEditResourceDialogOpen] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)

  // Form state for resources
  const [resourceFormData, setResourceFormData] = useState({
    name: "",
    type: "equipment" as const,
    description: "",
    location: "",
    capacity: 1,
    is_available: true,
    maintenance_due: "",
    last_maintenance: "",
  })

  // Mock staff data
  const staffMembers = [
    { id: "1", name: "Sarah Johnson" },
    { id: "2", name: "Mike Chen" },
    { id: "3", name: "Emma Davis" },
    { id: "4", name: "Alex Rodriguez" },
    { id: "5", name: "Lisa Thompson" },
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Mock resources
      const mockResources: Resource[] = [
        {
          id: "1",
          name: "Hair Washing Station 1",
          type: "station",
          description: "Professional hair washing station with adjustable chair",
          location: "Main Floor - Section A",
          capacity: 1,
          is_available: true,
          maintenance_due: "2024-03-15",
          last_maintenance: "2024-01-15",
          assigned_staff: ["1", "2"],
          booking_slots: [],
          created_at: "2024-01-01T10:00:00Z",
        },
        {
          id: "2",
          name: "Styling Chair 3",
          type: "station",
          description: "Hydraulic styling chair with mirror and lighting",
          location: "Main Floor - Section B",
          capacity: 1,
          is_available: true,
          assigned_staff: ["1", "3"],
          booking_slots: [],
          created_at: "2024-01-01T10:00:00Z",
        },
        {
          id: "3",
          name: "Hair Dryer - Professional",
          type: "equipment",
          description: "High-power professional hair dryer",
          location: "Equipment Room",
          capacity: 1,
          is_available: false,
          maintenance_due: "2024-02-01",
          last_maintenance: "2023-11-01",
          assigned_staff: ["2", "4"],
          booking_slots: [],
          created_at: "2024-01-01T10:00:00Z",
        },
        {
          id: "4",
          name: "Private Room 1",
          type: "room",
          description: "Private treatment room for facials and massages",
          location: "Second Floor",
          capacity: 2,
          is_available: true,
          assigned_staff: ["4", "5"],
          booking_slots: [],
          created_at: "2024-01-01T10:00:00Z",
        },
        {
          id: "5",
          name: "Manicure Table 2",
          type: "station",
          description: "Professional manicure station with UV lamp",
          location: "Nail Section",
          capacity: 1,
          is_available: true,
          maintenance_due: "2024-04-01",
          last_maintenance: "2024-01-01",
          assigned_staff: ["3"],
          booking_slots: [],
          created_at: "2024-01-01T10:00:00Z",
        },
      ]

      // Mock bookings
      const mockBookings: ResourceBooking[] = [
        {
          id: "1",
          resource_id: "1",
          staff_id: "1",
          staff_name: "Sarah Johnson",
          customer_name: "Emily Wilson",
          service_name: "Hair Wash & Blow Dry",
          start_time: "2024-01-25T10:00:00Z",
          end_time: "2024-01-25T11:00:00Z",
          status: "confirmed",
        },
        {
          id: "2",
          resource_id: "2",
          staff_id: "3",
          staff_name: "Emma Davis",
          customer_name: "John Smith",
          service_name: "Hair Cut & Style",
          start_time: "2024-01-25T14:00:00Z",
          end_time: "2024-01-25T15:30:00Z",
          status: "in_progress",
        },
        {
          id: "3",
          resource_id: "4",
          staff_id: "5",
          staff_name: "Lisa Thompson",
          customer_name: "Maria Garcia",
          service_name: "Facial Treatment",
          start_time: "2024-01-25T16:00:00Z",
          end_time: "2024-01-25T17:00:00Z",
          status: "confirmed",
        },
      ]

      setResources(mockResources)
      setBookings(mockBookings)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load resource data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateResource = async () => {
    try {
      const newResource: Resource = {
        id: Date.now().toString(),
        ...resourceFormData,
        assigned_staff: [],
        booking_slots: [],
        created_at: new Date().toISOString(),
      }

      setResources([...resources, newResource])
      setIsCreateResourceDialogOpen(false)
      resetResourceForm()

      toast({
        title: "Success",
        description: "Resource created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create resource",
        variant: "destructive",
      })
    }
  }

  const handleUpdateResource = async () => {
    if (!selectedResource) return

    try {
      const updatedResource = {
        ...selectedResource,
        ...resourceFormData,
      }

      setResources(resources.map((r) => (r.id === selectedResource.id ? updatedResource : r)))
      setIsEditResourceDialogOpen(false)
      setSelectedResource(null)
      resetResourceForm()

      toast({
        title: "Success",
        description: "Resource updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update resource",
        variant: "destructive",
      })
    }
  }

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return

    try {
      setResources(resources.filter((r) => r.id !== id))
      toast({
        title: "Success",
        description: "Resource deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete resource",
        variant: "destructive",
      })
    }
  }

  const handleEditResource = (resource: Resource) => {
    setSelectedResource(resource)
    setResourceFormData({
      name: resource.name,
      type: resource.type,
      description: resource.description,
      location: resource.location,
      capacity: resource.capacity,
      is_available: resource.is_available,
      maintenance_due: resource.maintenance_due || "",
      last_maintenance: resource.last_maintenance || "",
    })
    setIsEditResourceDialogOpen(true)
  }

  const resetResourceForm = () => {
    setResourceFormData({
      name: "",
      type: "equipment",
      description: "",
      location: "",
      capacity: 1,
      is_available: true,
      maintenance_due: "",
      last_maintenance: "",
    })
  }

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case "equipment":
        return <Wrench className="w-4 h-4" />
      case "room":
        return <MapPin className="w-4 h-4" />
      case "station":
        return <Settings className="w-4 h-4" />
      case "tool":
        return <Wrench className="w-4 h-4" />
      default:
        return <Settings className="w-4 h-4" />
    }
  }

  const getMaintenanceStatus = (resource: Resource) => {
    if (!resource.maintenance_due) return null

    const dueDate = new Date(resource.maintenance_due)
    const today = new Date()
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue < 0) {
      return { status: "overdue", color: "bg-red-500", text: `${Math.abs(daysUntilDue)} days overdue` }
    } else if (daysUntilDue <= 7) {
      return { status: "due_soon", color: "bg-yellow-500", text: `Due in ${daysUntilDue} days` }
    } else {
      return { status: "scheduled", color: "bg-green-500", text: `Due in ${daysUntilDue} days` }
    }
  }

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || resource.type === filterType
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "available" && resource.is_available) ||
      (filterStatus === "unavailable" && !resource.is_available)
    return matchesSearch && matchesType && matchesStatus
  })

  const totalResources = resources.length
  const availableResources = resources.filter((r) => r.is_available).length
  const unavailableResources = resources.filter((r) => !r.is_available).length
  const maintenanceDue = resources.filter((r) => {
    if (!r.maintenance_due) return false
    const dueDate = new Date(r.maintenance_due)
    const today = new Date()
    return dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // Due within 7 days
  }).length

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader title="Resource Availability" subtitle="Manage equipment, rooms, and station availability" />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Settings className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Resources</p>
                    <p className="text-2xl font-bold">{totalResources}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Available</p>
                    <p className="text-2xl font-bold">{availableResources}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unavailable</p>
                    <p className="text-2xl font-bold">{unavailableResources}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Maintenance Due</p>
                    <p className="text-2xl font-bold">{maintenanceDue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card>
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="resources">Resources</TabsTrigger>
                  <TabsTrigger value="bookings">Current Bookings</TabsTrigger>
                </TabsList>

                <TabsContent value="resources" className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search resources..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-48">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="room">Room</SelectItem>
                          <SelectItem value="station">Station</SelectItem>
                          <SelectItem value="tool">Tool</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="unavailable">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Dialog open={isCreateResourceDialogOpen} onOpenChange={setIsCreateResourceDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Resource
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Add New Resource</DialogTitle>
                          <DialogDescription>Create a new resource for your salon</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="name">Resource Name</Label>
                              <Input
                                id="name"
                                value={resourceFormData.name}
                                onChange={(e) => setResourceFormData({ ...resourceFormData, name: e.target.value })}
                                placeholder="e.g., Hair Washing Station 1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="type">Resource Type</Label>
                              <Select
                                value={resourceFormData.type}
                                onValueChange={(value: any) =>
                                  setResourceFormData({ ...resourceFormData, type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equipment">Equipment</SelectItem>
                                  <SelectItem value="room">Room</SelectItem>
                                  <SelectItem value="station">Station</SelectItem>
                                  <SelectItem value="tool">Tool</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={resourceFormData.description}
                              onChange={(e) =>
                                setResourceFormData({ ...resourceFormData, description: e.target.value })
                              }
                              placeholder="Describe this resource..."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="location">Location</Label>
                              <Input
                                id="location"
                                value={resourceFormData.location}
                                onChange={(e) => setResourceFormData({ ...resourceFormData, location: e.target.value })}
                                placeholder="e.g., Main Floor - Section A"
                              />
                            </div>
                            <div>
                              <Label htmlFor="capacity">Capacity</Label>
                              <Input
                                id="capacity"
                                type="number"
                                value={resourceFormData.capacity}
                                onChange={(e) =>
                                  setResourceFormData({
                                    ...resourceFormData,
                                    capacity: Number.parseInt(e.target.value) || 1,
                                  })
                                }
                                placeholder="1"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="last_maintenance">Last Maintenance</Label>
                              <Input
                                id="last_maintenance"
                                type="date"
                                value={resourceFormData.last_maintenance}
                                onChange={(e) =>
                                  setResourceFormData({ ...resourceFormData, last_maintenance: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="maintenance_due">Next Maintenance Due</Label>
                              <Input
                                id="maintenance_due"
                                type="date"
                                value={resourceFormData.maintenance_due}
                                onChange={(e) =>
                                  setResourceFormData({ ...resourceFormData, maintenance_due: e.target.value })
                                }
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="is_available"
                              checked={resourceFormData.is_available}
                              onCheckedChange={(checked) =>
                                setResourceFormData({ ...resourceFormData, is_available: checked })
                              }
                            />
                            <Label htmlFor="is_available">Available for booking</Label>
                          </div>

                          <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => setIsCreateResourceDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateResource}>Add Resource</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Resources Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResources.map((resource) => {
                      const maintenanceStatus = getMaintenanceStatus(resource)
                      return (
                        <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {getResourceTypeIcon(resource.type)}
                                <div>
                                  <CardTitle className="text-lg font-semibold">{resource.name}</CardTitle>
                                  <Badge variant="outline" className="mt-1">
                                    {resource.type}
                                  </Badge>
                                </div>
                              </div>
                              <Badge variant={resource.is_available ? "default" : "secondary"}>
                                {resource.is_available ? "Available" : "Unavailable"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-600 mb-4">{resource.description}</p>

                            <div className="space-y-3 mb-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Location:</span>
                                <span className="font-medium">{resource.location}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Capacity:</span>
                                <span className="font-medium">{resource.capacity}</span>
                              </div>
                              {resource.assigned_staff && resource.assigned_staff.length > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Assigned Staff:</span>
                                  <span className="font-medium">{resource.assigned_staff.length}</span>
                                </div>
                              )}
                            </div>

                            {maintenanceStatus && (
                              <div className="mb-4">
                                <Badge variant="outline" className={`${maintenanceStatus.color} text-white border-0`}>
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {maintenanceStatus.text}
                                </Badge>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditResource(resource)}
                                className="flex-1"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteResource(resource.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="bookings" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Current Resource Bookings</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Resource</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map((booking) => {
                          const resource = resources.find((r) => r.id === booking.resource_id)
                          return (
                            <TableRow key={booking.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {resource && getResourceTypeIcon(resource.type)}
                                  <div>
                                    <div className="font-medium">{resource?.name}</div>
                                    <div className="text-sm text-gray-500">{resource?.location}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  {booking.staff_name}
                                </div>
                              </TableCell>
                              <TableCell>{booking.customer_name}</TableCell>
                              <TableCell>{booking.service_name}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(booking.start_time).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                  <div className="text-gray-500">
                                    to{" "}
                                    {new Date(booking.end_time).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    booking.status === "confirmed"
                                      ? "default"
                                      : booking.status === "in_progress"
                                        ? "secondary"
                                        : booking.status === "completed"
                                          ? "outline"
                                          : "destructive"
                                  }
                                >
                                  {booking.status.replace("_", " ")}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>

                    {bookings.length === 0 && (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No active bookings</h3>
                        <p className="text-gray-500">No resources are currently booked.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Resource Dialog */}
      <Dialog open={isEditResourceDialogOpen} onOpenChange={setIsEditResourceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription>Update the resource details and settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Resource Name</Label>
                <Input
                  id="edit_name"
                  value={resourceFormData.name}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, name: e.target.value })}
                  placeholder="e.g., Hair Washing Station 1"
                />
              </div>
              <div>
                <Label htmlFor="edit_type">Resource Type</Label>
                <Select
                  value={resourceFormData.type}
                  onValueChange={(value: any) => setResourceFormData({ ...resourceFormData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="room">Room</SelectItem>
                    <SelectItem value="station">Station</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={resourceFormData.description}
                onChange={(e) => setResourceFormData({ ...resourceFormData, description: e.target.value })}
                placeholder="Describe this resource..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_location">Location</Label>
                <Input
                  id="edit_location"
                  value={resourceFormData.location}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, location: e.target.value })}
                  placeholder="e.g., Main Floor - Section A"
                />
              </div>
              <div>
                <Label htmlFor="edit_capacity">Capacity</Label>
                <Input
                  id="edit_capacity"
                  type="number"
                  value={resourceFormData.capacity}
                  onChange={(e) =>
                    setResourceFormData({ ...resourceFormData, capacity: Number.parseInt(e.target.value) || 1 })
                  }
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_last_maintenance">Last Maintenance</Label>
                <Input
                  id="edit_last_maintenance"
                  type="date"
                  value={resourceFormData.last_maintenance}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, last_maintenance: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_maintenance_due">Next Maintenance Due</Label>
                <Input
                  id="edit_maintenance_due"
                  type="date"
                  value={resourceFormData.maintenance_due}
                  onChange={(e) => setResourceFormData({ ...resourceFormData, maintenance_due: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_available"
                checked={resourceFormData.is_available}
                onCheckedChange={(checked) => setResourceFormData({ ...resourceFormData, is_available: checked })}
              />
              <Label htmlFor="edit_is_available">Available for booking</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditResourceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateResource}>Update Resource</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
