"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Truck, Plus, Phone, Mail, MapPin, Building, Edit, Trash2, User, Search } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getVendors, createVendor, updateVendor, deleteVendor, type Vendor } from "@/app/actions/vendors"

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadVendors()
  }, [])

  const loadVendors = async () => {
    try {
      const data = await getVendors()
      setVendors(data)
    } catch (error) {
      console.error("Failed to load vendors:", error)
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateVendor = async (formData: FormData) => {
    setIsCreating(true)
    try {
      const result = await createVendor(formData)
      if (result.success) {
        toast({
          title: "Success",
          description: "Vendor created successfully",
        })
        setIsCreateModalOpen(false)
        loadVendors()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Failed to create vendor:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to create vendor",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateVendor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingVendor) return

    setIsUpdating(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await updateVendor(editingVendor.id, formData)
      if (result.success) {
        toast({
          title: "Success",
          description: "Vendor updated successfully",
        })
        setEditingVendor(null)
        loadVendors()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error("Failed to update vendor:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to update vendor",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteVendor = async (id: number) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      try {
        const result = await deleteVendor(id)
        if (result.success) {
          toast({
            title: "Success",
            description: "Vendor deleted successfully",
          })
          loadVendors()
        } else {
          throw new Error(result.error)
        }
      } catch (error: any) {
        console.error("Failed to delete vendor:", error)
        toast({
          title: "Error",
          description: error?.message || "Failed to delete vendor",
          variant: "destructive",
        })
      }
    }
  }

  const filteredVendors = vendors.filter((v) => {
    const q = searchTerm.toLowerCase()
    return (
      (v.name || "").toLowerCase().includes(q) ||
      (v.contact_person || "").toLowerCase().includes(q) ||
      (v.phone || "").toLowerCase().includes(q) ||
      (v.email || "").toLowerCase().includes(q)
    )
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 pt-6 bg-white border-b">
        <PageHeader
          title="Vendors & Suppliers"
          subtitle="Manage your product suppliers, order contacts, and procurement"
          showBackButton
          backHref="/manage"
        />
      </div>
      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold">Vendors & Suppliers</CardTitle>
                  <CardDescription>Manage your product suppliers, order contacts, and procurement</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vendors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-white"
                    />
                  </div>
                  <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Vendor
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Vendor</DialogTitle>
                      </DialogHeader>
                      <form action={handleCreateVendor} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Vendor / Supplier Name *</Label>
                          <Input id="name" name="name" required placeholder="e.g. L'Oreal Professional India" />
                        </div>
                        <div>
                          <Label htmlFor="contactPerson">Contact Person *</Label>
                          <Input
                            id="contactPerson"
                            name="contactPerson"
                            required
                            placeholder="e.g. Rahul Sharma (Sales Manager)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input id="phone" name="phone" required placeholder="e.g. +91 98765 43210" />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" placeholder="e.g. orders@loreal.com" />
                        </div>
                        <div>
                          <Label htmlFor="address">Warehouse / Office Address</Label>
                          <Input id="address" name="address" placeholder="e.g. Sector 18, Gurugram, Haryana" />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isCreating} className="flex-1">
                            {isCreating ? "Creating..." : "Save Vendor"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredVendors.length === 0 ? (
                <div className="text-center py-12">
                  <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium">No vendors found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {searchTerm ? "Try searching with a different term." : "Add your first vendor to track supply deliveries."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVendors.map((vendor) => (
                    <Card key={vendor.id} className="hover:shadow-md transition-shadow relative group">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Building className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-base">{vendor.name}</h3>
                              <Badge variant={vendor.status === "active" ? "default" : "secondary"}>
                                {vendor.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setEditingVendor(vendor)}
                            >
                              <Edit className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteVendor(vendor.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm pt-1">
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span>{vendor.contact_person || "Contact Person"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span>{vendor.phone || "No phone listed"}</span>
                          </div>
                          {vendor.email && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{vendor.email}</span>
                            </div>
                          )}
                          {vendor.address && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{vendor.address}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t text-xs text-gray-500 flex justify-between items-center">
                          <span>Added: {new Date(vendor.created_at).toLocaleDateString()}</span>
                          <span className="text-primary font-medium">ID #{vendor.id}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Vendor Dialog */}
      {editingVendor && (
        <Dialog open={!!editingVendor} onOpenChange={(open) => !open && setEditingVendor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Vendor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateVendor} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Vendor Name *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingVendor.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-contactPerson">Contact Person *</Label>
                <Input
                  id="edit-contactPerson"
                  name="contactPerson"
                  defaultValue={editingVendor.contact_person}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone Number *</Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  defaultValue={editingVendor.phone}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={editingVendor.email || ""}
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  name="address"
                  defaultValue={editingVendor.address || ""}
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select name="status" defaultValue={editingVendor.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingVendor(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
