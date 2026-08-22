"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Edit, Trash2, IndianRupee, Percent, Users, TrendingUp, Search, Filter } from "lucide-react"
import {
  getCommissionProfiles,
  createCommissionProfile,
  updateCommissionProfile,
  deleteCommissionProfile,
  type CommissionProfile,
  type CommissionTier,
} from "@/app/actions/commissions"

export default function CommissionProfilesPage() {
  const [profiles, setProfiles] = useState<CommissionProfile[]>([])
  const [tiers, setTiers] = useState<CommissionTier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<CommissionProfile | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    commission_type: "percentage" as const,
    base_rate: 0,
    min_threshold: 0,
    max_threshold: 0,
    applies_to: "both" as const,
    is_active: true,
  })

  const [tierFormData, setTierFormData] = useState<Omit<CommissionTier, "id" | "profile_id">[]>([
    { min_amount: 0, max_amount: 1000, rate: 5 },
    { min_amount: 1000, max_amount: 5000, rate: 10 },
    { min_amount: 5000, max_amount: 999999, rate: 15 },
  ])

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading commission profiles...")
      const fetchedProfiles = await getCommissionProfiles()
      setProfiles(fetchedProfiles)
      console.log("[v0] Successfully loaded", fetchedProfiles.length, "commission profiles")
    } catch (error) {
      console.error("[v0] Error loading commission profiles:", error)
      toast({
        title: "Error",
        description: "Failed to load commission profiles",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProfile = async () => {
    try {
      console.log("[v0] Creating commission profile with data:", formData)
      const result = await createCommissionProfile(formData)

      if (result.success && result.data) {
        setProfiles([...profiles, result.data])
        setIsCreateDialogOpen(false)
        resetForm()
        toast({
          title: "Success",
          description: result.message,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating commission profile:", error)
      toast({
        title: "Error",
        description: "Failed to create commission profile",
        variant: "destructive",
      })
    }
  }

  const handleUpdateProfile = async () => {
    if (!selectedProfile) return

    try {
      console.log("[v0] Updating commission profile:", selectedProfile.id, formData)
      const result = await updateCommissionProfile(selectedProfile.id, formData)

      if (result.success && result.data) {
        setProfiles(profiles.map((p) => (p.id === selectedProfile.id ? result.data! : p)))
        setIsEditDialogOpen(false)
        setSelectedProfile(null)
        resetForm()
        toast({
          title: "Success",
          description: result.message,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating commission profile:", error)
      toast({
        title: "Error",
        description: "Failed to update commission profile",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProfile = async (id: string) => {
    if (!confirm("Are you sure you want to delete this commission profile?")) return

    try {
      console.log("[v0] Deleting commission profile:", id)
      const result = await deleteCommissionProfile(id)

      if (result.success) {
        setProfiles(profiles.filter((p) => p.id !== id))
        toast({
          title: "Success",
          description: result.message,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting commission profile:", error)
      toast({
        title: "Error",
        description: "Failed to delete commission profile",
        variant: "destructive",
      })
    }
  }

  const handleEditProfile = (profile: CommissionProfile) => {
    setSelectedProfile(profile)
    setFormData({
      name: profile.name,
      description: profile.description,
      commission_type: profile.commission_type,
      base_rate: profile.base_rate,
      min_threshold: profile.min_threshold,
      max_threshold: profile.max_threshold,
      applies_to: profile.applies_to,
      is_active: profile.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      commission_type: "percentage",
      base_rate: 0,
      min_threshold: 0,
      max_threshold: 0,
      applies_to: "both",
      is_active: true,
    })
  }

  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === "all" || profile.commission_type === filterType
    return matchesSearch && matchesFilter
  })

  const addTier = () => {
    setTierFormData([...tierFormData, { min_amount: 0, max_amount: 0, rate: 0 }])
  }

  const removeTier = (index: number) => {
    setTierFormData(tierFormData.filter((_, i) => i !== index))
  }

  const updateTier = (index: number, field: keyof Omit<CommissionTier, "id" | "profile_id">, value: number) => {
    const updated = [...tierFormData]
    updated[index] = { ...updated[index], [field]: value }
    setTierFormData(updated)
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader title="Commission Profiles" subtitle="Manage commission structures and rates for your staff" />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Profiles</p>
                    <p className="text-2xl font-bold">{profiles.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Staff Assigned</p>
                    <p className="text-2xl font-bold">{profiles.reduce((sum, p) => sum + p.staff_count, 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Percent className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Commission</p>
                    <p className="text-2xl font-bold">
                      {profiles.length > 0
                        ? `${(profiles.reduce((sum, p) => sum + p.base_rate, 0) / profiles.length).toFixed(1)}%`
                        : "0%"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Profiles</p>
                    <p className="text-2xl font-bold">{profiles.filter((p) => p.is_active).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search profiles..."
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
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="tiered">Tiered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Commission Profile</DialogTitle>
                      <DialogDescription>Set up a new commission structure for your staff</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Profile Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Senior Stylist Commission"
                          />
                        </div>
                        <div>
                          <Label htmlFor="commission_type">Commission Type</Label>
                          <Select
                            value={formData.commission_type}
                            onValueChange={(value: any) => setFormData({ ...formData, commission_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                              <SelectItem value="tiered">Tiered</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Describe this commission profile..."
                        />
                      </div>

                      {formData.commission_type !== "tiered" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="base_rate">
                              {formData.commission_type === "percentage" ? "Commission Rate (%)" : "Fixed Amount (₹)"}
                            </Label>
                            <Input
                              id="base_rate"
                              type="number"
                              value={formData.base_rate}
                              onChange={(e) =>
                                setFormData({ ...formData, base_rate: Number.parseFloat(e.target.value) || 0 })
                              }
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label htmlFor="min_threshold">Minimum Threshold (₹)</Label>
                            <Input
                              id="min_threshold"
                              type="number"
                              value={formData.min_threshold}
                              onChange={(e) =>
                                setFormData({ ...formData, min_threshold: Number.parseFloat(e.target.value) || 0 })
                              }
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}

                      {formData.commission_type === "tiered" && (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <Label>Commission Tiers</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addTier}>
                              <Plus className="w-4 h-4 mr-2" />
                              Add Tier
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {tierFormData.map((tier, index) => (
                              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                                <div className="flex-1 grid grid-cols-3 gap-3">
                                  <div>
                                    <Label className="text-xs">Min Amount ($)</Label>
                                    <Input
                                      type="number"
                                      value={tier.min_amount}
                                      onChange={(e) =>
                                        updateTier(index, "min_amount", Number.parseFloat(e.target.value) || 0)
                                      }
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Max Amount ($)</Label>
                                    <Input
                                      type="number"
                                      value={tier.max_amount}
                                      onChange={(e) =>
                                        updateTier(index, "max_amount", Number.parseFloat(e.target.value) || 0)
                                      }
                                      placeholder="1000"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Rate (%)</Label>
                                    <Input
                                      type="number"
                                      value={tier.rate}
                                      onChange={(e) =>
                                        updateTier(index, "rate", Number.parseFloat(e.target.value) || 0)
                                      }
                                      placeholder="10"
                                    />
                                  </div>
                                </div>
                                {tierFormData.length > 1 && (
                                  <Button type="button" variant="outline" size="sm" onClick={() => removeTier(index)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="applies_to">Applies To</Label>
                          <Select
                            value={formData.applies_to}
                            onValueChange={(value: any) => setFormData({ ...formData, applies_to: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="services">Services Only</SelectItem>
                              <SelectItem value="products">Products Only</SelectItem>
                              <SelectItem value="both">Services & Products</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                          />
                          <Label htmlFor="is_active">Active</Label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateProfile}>Create Profile</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Profiles Table */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Profiles</CardTitle>
              <CardDescription>
                Manage commission structures for different staff roles and performance levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profile Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Rate/Structure</TableHead>
                      <TableHead>Applies To</TableHead>
                      <TableHead>Staff Count</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{profile.name}</div>
                            <div className="text-sm text-gray-500">{profile.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{profile.commission_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {profile.commission_type === "percentage" && `${profile.base_rate}%`}
                          {profile.commission_type === "fixed" && `₹${profile.base_rate}`}
                          {profile.commission_type === "tiered" && "Tiered Structure"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{profile.applies_to}</Badge>
                        </TableCell>
                        <TableCell>{profile.staff_count}</TableCell>
                        <TableCell>
                          <Badge variant={profile.is_active ? "default" : "secondary"}>
                            {profile.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditProfile(profile)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteProfile(profile.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Commission Profile</DialogTitle>
            <DialogDescription>Update the commission structure settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Profile Name</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Senior Stylist Commission"
                />
              </div>
              <div>
                <Label htmlFor="edit_commission_type">Commission Type</Label>
                <Select
                  value={formData.commission_type}
                  onValueChange={(value: any) => setFormData({ ...formData, commission_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="tiered">Tiered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this commission profile..."
              />
            </div>

            {formData.commission_type !== "tiered" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_base_rate">
                    {formData.commission_type === "percentage" ? "Commission Rate (%)" : "Fixed Amount (₹)"}
                  </Label>
                  <Input
                    id="edit_base_rate"
                    type="number"
                    value={formData.base_rate}
                    onChange={(e) => setFormData({ ...formData, base_rate: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_min_threshold">Minimum Threshold (₹)</Label>
                  <Input
                    id="edit_min_threshold"
                    type="number"
                    value={formData.min_threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, min_threshold: Number.parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_applies_to">Applies To</Label>
                <Select
                  value={formData.applies_to}
                  onValueChange={(value: any) => setFormData({ ...formData, applies_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="services">Services Only</SelectItem>
                    <SelectItem value="products">Products Only</SelectItem>
                    <SelectItem value="both">Services & Products</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="edit_is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="edit_is_active">Active</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProfile}>Update Profile</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
