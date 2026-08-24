"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { formatCurrency } from "@/lib/currency"
import { toast } from "@/hooks/use-toast"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Clock,
  Users,
  TrendingUp,
  Scissors,
  Sparkles,
  Palette,
  Heart,
  MoreVertical,
  BarChart3,
  RefreshCw,
  Upload,
  Wand2,
  Smile,
  Droplets,
  Flower2,
  Activity,
  Wind,
  Flame,
  Leaf,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getServices,
  getServiceStats,
  getServiceCategories,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  bulkUploadServices,
  type Service,
} from "@/app/actions/services"
import { BulkUploadModal } from "@/components/bulk-upload-modal"
import { serviceTemplate } from "@/lib/csv-templates"

const serviceCategories = [
  { id: "Hair Services", name: "Hair Services", icon: Scissors, color: "bg-blue-500" },
  { id: "Facial & Skincare", name: "Facial & Skincare", icon: Sparkles, color: "bg-pink-500" },
  { id: "Nail Care", name: "Nail Care", icon: Palette, color: "bg-purple-500" },
  { id: "Body Treatments", name: "Body Treatments", icon: Heart, color: "bg-green-500" },
  { id: "Massage Therapy", name: "Massage Therapy", icon: Heart, color: "bg-orange-500" },
  { id: "Makeup Services", name: "Makeup Services", icon: Sparkles, color: "bg-red-500" },
]


function getSmartIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("massage") || n.includes("spa") || n.includes("therapy")) return { icon: Activity, color: "bg-orange-500" };
  if (n.includes("facial") || n.includes("face") || n.includes("cleanse") || n.includes("scrub") || n.includes("glow")) return { icon: Smile, color: "bg-pink-500" };
  if (n.includes("bleach") || n.includes("dtan") || n.includes("whitening")) return { icon: Sparkles, color: "bg-yellow-500" };
  if (n.includes("hair") || n.includes("shave") || n.includes("cut") || n.includes("trim")) return { icon: Scissors, color: "bg-blue-500" };
  if (n.includes("color") || n.includes("dye") || n.includes("highlight")) return { icon: Palette, color: "bg-purple-500" };
  if (n.includes("wax") || n.includes("thread") || n.includes("remove")) return { icon: Flame, color: "bg-red-500" };
  if (n.includes("nail") || n.includes("pedicure") || n.includes("manicure")) return { icon: Flower2, color: "bg-green-500" };
  if (n.includes("wash") || n.includes("shampoo")) return { icon: Droplets, color: "bg-cyan-500" };
  if (n.includes("oil") || n.includes("head") || n.includes("cooling")) return { icon: Wind, color: "bg-teal-500" };
  if (n.includes("herbal") || n.includes("natural")) return { icon: Leaf, color: "bg-emerald-500" };
  
  return { icon: Wand2, color: "bg-indigo-500" };
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, categories: 0, avgPrice: 0 })
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration: "",
    category: "",
    description: "",
    code: "",
    image_url: "",
    isActive: true,
  })

  const fetchData = async () => {
    try {
      const [servicesData, statsData, categoriesData] = await Promise.all([
        getServices(),
        getServiceStats(),
        getServiceCategories(),
      ])

      const safeServicesData = Array.isArray(servicesData) ? servicesData : []
      const safeCategoriesData = Array.isArray(categoriesData) ? categoriesData : []

      setServices(safeServicesData)
      setStats(statsData)
      setCategories(safeCategoriesData)
    } catch (error) {
      console.error("Error fetching data:", error)
      setServices([])
      setCategories([])
      setStats({ total: 0, active: 0, categories: 0, avgPrice: 0 })
      toast({
        title: "Error",
        description: "Failed to fetch services data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
  }

  const handleBulkUpload = async (file: File) => {
    const result = await bulkUploadServices(file)

    if (result.success) {
      // Reload services after successful upload
      await fetchData()
    }

    return result
  }

  useEffect(() => {
    fetchData()

    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      duration: "",
      category: "",
      description: "",
      code: "",
      image_url: "",
      isActive: true,
    })
    setEditingService(null)
  }

  const handleAddService = async () => {
    if (!formData.name || !formData.price || !formData.duration || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const form = new FormData()
    form.append("name", formData.name)
    form.append("price", formData.price)
    form.append("duration", formData.duration)
    form.append("category", formData.category)
    form.append("description", formData.description)
    form.append("code", formData.code || `SRV${Date.now()}`)
    form.append("image_url", formData.image_url)
    form.append("isActive", formData.isActive.toString())

    const result = await createService(form)

    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      })
      setIsAddDialogOpen(false)
      resetForm()
      await fetchData()
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const handleEditService = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration_minutes.toString(),
      category: service.category,
      description: service.description || "",
      code: service.code || "",
      image_url: service.image_url || "",
      isActive: service.is_active,
    })
    setIsAddDialogOpen(true)
  }

  const handleUpdateService = async () => {
    if (!editingService) return

    const form = new FormData()
    form.append("name", formData.name)
    form.append("price", formData.price)
    form.append("duration", formData.duration)
    form.append("category", formData.category)
    form.append("description", formData.description)
    form.append("image_url", formData.image_url)
    form.append("isActive", formData.isActive.toString())

    const result = await updateService(editingService.id, form)

    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      })
      setIsAddDialogOpen(false)
      resetForm()
      await fetchData()
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm("Are you sure you want to delete this service?")) return

    const result = await deleteService(serviceId)

    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      })
      await fetchData()
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const handleToggleStatus = async (serviceId: number, currentStatus: boolean) => {
    const result = await toggleServiceStatus(serviceId, !currentStatus)

    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      })
      await fetchData()
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || service.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="content-wrapper">
        <PageHeader title="Services" subtitle="Manage your salon services and pricing" />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="content-wrapper">
      <PageHeader title="Services" subtitle="Manage your salon services and pricing" />
      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        title="Bulk Upload Services"
        description="Upload multiple services at once using a CSV file. Download the sample template to get started."
        sampleHeaders={serviceTemplate.headers}
        onUpload={handleBulkUpload}
        entityType="services"
      />

      <div className="p-6 space-y-8">
        {/* Service Overview */}
        <section id="overview" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Service Overview</h2>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={() => setShowBulkUpload(true)} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-800 hover:bg-slate-900 text-white shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
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
                        placeholder="Enter service name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
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
                          placeholder="0"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="duration">Duration (min) *</Label>
                        <Input
                          id="duration"
                          type="number"
                          placeholder="60"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="code">Service Code</Label>
                      <Input
                        id="code"
                        placeholder="Auto-generated if empty"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="image_url">Image URL</Label>
                      <Input
                        id="image_url"
                        placeholder="https://example.com/image.jpg"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Service description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                          resetForm()
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={editingService ? handleUpdateService : handleAddService}
                        className="flex-1 bg-slate-800 hover:bg-slate-900 text-white shadow-sm"
                      >
                        {editingService ? "Update" : "Add"} Service
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">{stats.active} active</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.categories}</div>
                <p className="text-xs text-muted-foreground">Service types</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.avgPrice)}</div>
                <p className="text-xs text-muted-foreground">Per service</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{refreshing ? "Updating..." : "Live"}</div>
                <p className="text-xs text-muted-foreground">Real-time data</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="space-y-6">
          <div className="flex items-center space-x-2">
            <Scissors className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Service Categories</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {serviceCategories.map((category) => {
              const categoryServices = services.filter((s) => s.category === category.id)

              return (
                <Card key={category.id} className="hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`p-3 rounded-full ${category.color}`}>
                        <category.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-600">{categoryServices.length} services</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Active</span>
                        <span className="font-medium">{categoryServices.filter((s) => s.is_active).length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Price</span>
                        <span className="font-medium">
                          {formatCurrency(
                            categoryServices.length > 0
                              ? categoryServices.reduce((sum, s) => sum + s.price, 0) / categoryServices.length
                              : 0,
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Services List */}
        <section id="services-list" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">All Services</h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              const category = serviceCategories.find((c) => c.id === service.category)

              return (
                <Card key={service.id} className="hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {service.image_url ? (
                          <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-100 flex-shrink-0">
                            <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className={`p-2 rounded-lg ${getSmartIcon(service.name).color}`}>
                            {(() => {
                              const SmartIcon = getSmartIcon(service.name).icon;
                              return <SmartIcon className="h-5 w-5 text-white" />;
                            })()}
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg font-semibold">{service.name}</CardTitle>
                          <Badge variant={service.is_active ? "default" : "secondary"}>
                            {service.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditService(service)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(service.id, service.is_active)}>
                            <Switch className="h-4 w-4 mr-2" />
                            {service.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteService(service.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{service.description}</p>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Price</span>
                        <span className="text-lg font-bold text-green-600">{formatCurrency(service.price)}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Duration</span>
                        <span className="text-sm font-medium flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {service.duration_minutes} min
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Code</span>
                        <span className="text-sm font-medium">{service.code || "N/A"}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Category</span>
                        <span className="text-sm font-medium">{service.category}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredServices.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No services found matching your criteria.</p>
                <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Service
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Service Analytics */}
        <section id="analytics" className="space-y-6 pb-8">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Service Analytics</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Services by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories.map((category) => {
                    const categoryServices = services.filter((s) => s.category === category)
                    const percentage = services.length > 0 ? (categoryServices.length / services.length) * 100 : 0

                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{category}</span>
                          <span className="text-gray-600">{categoryServices.length} services</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-slate-800 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Price Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { range: "Under ₹500", min: 0, max: 500 },
                    { range: "₹500 - ₹1000", min: 500, max: 1000 },
                    { range: "₹1000 - ₹2000", min: 1000, max: 2000 },
                    { range: "Above ₹2000", min: 2000, max: Number.POSITIVE_INFINITY },
                  ].map((priceRange) => {
                    const rangeServices = services.filter((s) => s.price >= priceRange.min && s.price < priceRange.max)
                    const percentage = services.length > 0 ? (rangeServices.length / services.length) * 100 : 0

                    return (
                      <div key={priceRange.range} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{priceRange.range}</span>
                          <span className="text-gray-600">{rangeServices.length} services</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-slate-800 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
