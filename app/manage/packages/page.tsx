"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, Package, Clock, Calendar, DollarSign, Users } from "lucide-react"
import {
  getActivePackages,
  createPackage,
  updatePackage,
  deletePackage,
  type ServicePackage,
} from "@/app/actions/packages"
import { getServices, type Service } from "@/app/actions/services"
import { toast } from "@/hooks/use-toast"

export default function PackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    services: [] as number[],
    package_price: "",
    original_price: "",
    discount_percentage: "",
    duration_minutes: "",
    validity_days: "",
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [packagesData, servicesData] = await Promise.all([getActivePackages(), getServices()])
      const safePackagesData = Array.isArray(packagesData) ? packagesData : []
      const safeServicesData = Array.isArray(servicesData) ? servicesData : []

      setPackages(safePackagesData)
      setServices(safeServicesData)
    } catch (error) {
      console.error("Error loading data:", error)
      setPackages([])
      setServices([])
      toast({
        title: "Error",
        description: "Failed to load packages data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      services: [],
      package_price: "",
      original_price: "",
      discount_percentage: "",
      duration_minutes: "",
      validity_days: "",
      is_active: true,
    })
    setEditingPackage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const packageData = {
        ...formData,
        package_price: Number.parseFloat(formData.package_price),
        original_price: Number.parseFloat(formData.original_price || "0"),
        discount_percentage: Number.parseFloat(formData.discount_percentage || "0"),
        duration_minutes: Number.parseInt(formData.duration_minutes),
        validity_days: Number.parseInt(formData.validity_days),
      }

      if (editingPackage) {
        await updatePackage(editingPackage.id, packageData)
        toast({
          title: "Success",
          description: "Package updated successfully",
        })
      } else {
        await createPackage(packageData)
        toast({
          title: "Success",
          description: "Package created successfully",
        })
      }

      await loadData()
      setIsCreateModalOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving package:", error)
      toast({
        title: "Error",
        description: "Failed to save package",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (pkg: ServicePackage) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description || "",
      services: pkg.services,
      package_price: pkg.package_price.toString(),
      original_price: pkg.original_price.toString(),
      discount_percentage: pkg.discount_percentage.toString(),
      duration_minutes: pkg.duration_minutes.toString(),
      validity_days: pkg.validity_days.toString(),
      is_active: pkg.is_active,
    })
    setIsCreateModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this package?")) return

    try {
      await deletePackage(id)
      toast({
        title: "Success",
        description: "Package deleted successfully",
      })
      await loadData()
    } catch (error) {
      console.error("Error deleting package:", error)
      toast({
        title: "Error",
        description: "Failed to delete package",
        variant: "destructive",
      })
    }
  }

  const handleServiceToggle = (serviceId: number) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter((id) => id !== serviceId)
        : [...prev.services, serviceId],
    }))
  }

  const getServiceNames = (serviceIds: number[]) => {
    if (!Array.isArray(services)) {
      console.warn("[v0] Services is not an array in getServiceNames:", services)
      return []
    }

    return serviceIds
      .map((id) => services.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Packages</h1>
          <p className="text-muted-foreground">Manage your service packages and bundles</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPackage ? "Edit Package" : "Create New Package"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Package Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="package_price">Package Price (₹) *</Label>
                  <Input
                    id="package_price"
                    type="number"
                    step="0.01"
                    value={formData.package_price}
                    onChange={(e) => setFormData({ ...formData, package_price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="original_price">Original Price (₹)</Label>
                  <Input
                    id="original_price"
                    type="number"
                    step="0.01"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_percentage">Discount (%)</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    step="0.01"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validity_days">Validity (days) *</Label>
                <Input
                  id="validity_days"
                  type="number"
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Included Services *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`service-${service.id}`}
                        checked={formData.services.includes(service.id)}
                        onCheckedChange={() => handleServiceToggle(service.id)}
                      />
                      <Label htmlFor={`service-${service.id}`} className="text-sm">
                        {service.name} - {formatCurrency(service.price)}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.services.length === 0 && (
                  <p className="text-sm text-red-500">Please select at least one service</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                />
                <Label htmlFor="is_active">Active Package</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formData.services.length === 0}>
                  {editingPackage ? "Update Package" : "Create Package"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Packages</p>
                <p className="text-3xl font-bold">{packages.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Packages</p>
                <p className="text-3xl font-bold text-green-600">{packages.filter((p) => p.is_active).length}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Package Price</p>
                <p className="text-3xl font-bold text-purple-600">
                  {packages.length > 0
                    ? formatCurrency(packages.reduce((sum, p) => sum + p.package_price, 0) / packages.length)
                    : formatCurrency(0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Savings</p>
                <p className="text-3xl font-bold text-orange-600">
                  {formatCurrency(packages.reduce((sum, p) => sum + (p.original_price - p.package_price), 0))}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages List */}
      <Card>
        <CardHeader>
          <CardTitle>All Packages ({packages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No packages found</h3>
              <p className="text-gray-500 mb-4">Create your first service package to get started.</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Package
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{pkg.name}</h3>
                          <Badge variant={pkg.is_active ? "default" : "secondary"}>
                            {pkg.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {pkg.description && <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Package Price:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(pkg.package_price)}</span>
                      </div>

                      {pkg.original_price > pkg.package_price && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Original Price:</span>
                          <span className="text-sm line-through text-gray-500">
                            {formatCurrency(pkg.original_price)}
                          </span>
                        </div>
                      )}

                      {pkg.discount_percentage > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Discount:</span>
                          <Badge variant="outline" className="text-green-600">
                            {pkg.discount_percentage}% OFF
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Duration:
                        </span>
                        <span className="text-sm">{pkg.duration_minutes} min</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Validity:
                        </span>
                        <span className="text-sm">{pkg.validity_days} days</span>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-600 mb-2">Included Services:</p>
                        <div className="flex flex-wrap gap-1">
                          {getServiceNames(pkg.services)
                            .split(", ")
                            .map((serviceName, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {serviceName}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(pkg)} className="flex-1">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pkg.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
