"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Clock, DollarSign, Users, Search } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  category: string
  isActive: boolean
  staffRequired: number
  createdAt: string
}

const serviceCategories = [
  "Hair Services",
  "Facial & Skincare",
  "Nail Care",
  "Body Treatments",
  "Massage Therapy",
  "Makeup Services",
]

export default function ServicesManagePage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
    category: "",
    staffRequired: "1",
    isActive: true,
  })

  useEffect(() => {
    // Mock data loading
    setTimeout(() => {
      const mockServices: Service[] = [
        {
          id: "1",
          name: "Premium Hair Cut & Styling",
          description: "Professional hair cutting and styling with premium products",
          price: 1200,
          duration: 60,
          category: "Hair Services",
          isActive: true,
          staffRequired: 1,
          createdAt: "2024-01-15",
        },
        {
          id: "2",
          name: "Luxury Facial Treatment",
          description: "Deep cleansing facial with anti-aging treatment",
          price: 2500,
          duration: 90,
          category: "Facial & Skincare",
          isActive: true,
          staffRequired: 1,
          createdAt: "2024-01-10",
        },
        {
          id: "3",
          name: "Gel Manicure & Pedicure",
          description: "Long-lasting gel polish with nail art options",
          price: 800,
          duration: 45,
          category: "Nail Care",
          isActive: true,
          staffRequired: 1,
          createdAt: "2024-01-12",
        },
      ]
      setServices(mockServices)
      setLoading(false)
    }, 1000)
  }, [])

  const handleAddService = () => {
    if (!formData.name || !formData.price || !formData.duration || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const newService: Service = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      price: Number.parseFloat(formData.price),
      duration: Number.parseInt(formData.duration),
      category: formData.category,
      isActive: formData.isActive,
      staffRequired: Number.parseInt(formData.staffRequired),
      createdAt: new Date().toISOString().split("T")[0],
    }

    setServices([...services, newService])
    setFormData({
      name: "",
      description: "",
      price: "",
      duration: "",
      category: "",
      staffRequired: "1",
      isActive: true,
    })
    setIsAddDialogOpen(false)

    toast({
      title: "Success",
      description: "Service added successfully!",
    })
  }

  const handleEditService = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration.toString(),
      category: service.category,
      staffRequired: service.staffRequired.toString(),
      isActive: service.isActive,
    })
    setIsAddDialogOpen(true)
  }

  const handleUpdateService = () => {
    if (!editingService) return

    const updatedService: Service = {
      ...editingService,
      name: formData.name,
      description: formData.description,
      price: Number.parseFloat(formData.price),
      duration: Number.parseInt(formData.duration),
      category: formData.category,
      isActive: formData.isActive,
      staffRequired: Number.parseInt(formData.staffRequired),
    }

    setServices(services.map((s) => (s.id === editingService.id ? updatedService : s)))
    setEditingService(null)
    setFormData({
      name: "",
      description: "",
      price: "",
      duration: "",
      category: "",
      staffRequired: "1",
      isActive: true,
    })
    setIsAddDialogOpen(false)

    toast({
      title: "Success",
      description: "Service updated successfully!",
    })
  }

  const handleDeleteService = (serviceId: string) => {
    setServices(services.filter((s) => s.id !== serviceId))
    toast({
      title: "Success",
      description: "Service deleted successfully!",
    })
  }

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || service.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Services Management"
        subtitle="Add, edit, and update the services you offer"
        action={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Service Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter service name"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (min) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="60"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="staffRequired">Staff Required</Label>
                  <Select
                    value={formData.staffRequired}
                    onValueChange={(value) => setFormData({ ...formData, staffRequired: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Staff Member</SelectItem>
                      <SelectItem value="2">2 Staff Members</SelectItem>
                      <SelectItem value="3">3 Staff Members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Service description"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="active">Active Service</Label>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false)
                      setEditingService(null)
                      setFormData({
                        name: "",
                        description: "",
                        price: "",
                        duration: "",
                        category: "",
                        staffRequired: "1",
                        isActive: true,
                      })
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={editingService ? handleUpdateService : handleAddService} className="flex-1">
                    {editingService ? "Update" : "Add"} Service
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Services</p>
                    <p className="text-2xl font-bold">{services.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Services</p>
                    <p className="text-2xl font-bold">{services.filter((s) => s.isActive).length}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Badge className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg. Price</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(services.reduce((sum, s) => sum + s.price, 0) / services.length || 0)}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg. Duration</p>
                    <p className="text-2xl font-bold">
                      {Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length || 0)} min
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {serviceCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">{service.name}</CardTitle>
                      <Badge variant={service.isActive ? "default" : "secondary"} className="mt-1">
                        {service.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditService(service)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteService(service.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{service.description}</p>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Price</span>
                      <span className="font-semibold text-green-600">{formatCurrency(service.price)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Duration</span>
                      <span className="text-sm font-medium">{service.duration} min</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Category</span>
                      <span className="text-sm font-medium">{service.category}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Staff Required</span>
                      <span className="text-sm font-medium">{service.staffRequired}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No services found matching your criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
