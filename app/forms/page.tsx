"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import { getConsentForms, createConsentForm, type ConsentForm } from "@/app/actions/forms"

export default function FormsPage() {
  const [forms, setForms] = useState<ConsentForm[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    customerId: "",
    formType: "medical_history",
    title: "",
    description: "",
    fields: [] as Array<{ name: string; type: string; required: boolean }>,
  })

  useEffect(() => {
    loadForms()
  }, [])

  const loadForms = async () => {
    setLoading(true)
    try {
      const data = await getConsentForms()
      setForms(data)
    } catch (error) {
      console.error("Error loading forms:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateForm = async () => {
    if (!formData.title || !formData.formType) {
      alert("Please fill all required fields")
      return
    }

    const result = await createConsentForm({
      customerId: formData.customerId ? Number.parseInt(formData.customerId) : null,
      formType: formData.formType,
      formData: {
        title: formData.title,
        description: formData.description,
        fields: formData.fields,
      },
    })

    if (result.success) {
      setShowCreateModal(false)
      setFormData({
        customerId: "",
        formType: "medical_history",
        title: "",
        description: "",
        fields: [],
      })
      loadForms()
    } else {
      alert(result.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "signed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "expired":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "signed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "expired":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const filteredForms = forms.filter((form) => {
    const matchesSearch =
      form.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.form_type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || form.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const formStats = {
    total: forms.length,
    signed: forms.filter((f) => f.status === "signed").length,
    pending: forms.filter((f) => f.status === "pending").length,
    expired: forms.filter((f) => f.status === "expired").length,
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading consent forms...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="User Consent Forms"
        subtitle="Manage customer consent forms, medical history, and legal documentation for compliance."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Total Forms</span>
                </div>
                <div className="text-3xl font-bold">{formStats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Signed</span>
                </div>
                <div className="text-3xl font-bold text-green-600">{formStats.signed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium">Pending</span>
                </div>
                <div className="text-3xl font-bold text-yellow-600">{formStats.pending}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium">Expired</span>
                </div>
                <div className="text-3xl font-bold text-red-600">{formStats.expired}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="forms" className="space-y-6">
            <TabsList>
              <TabsTrigger value="forms">Consent Forms</TabsTrigger>
              <TabsTrigger value="templates">Form Templates</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            <TabsContent value="forms" className="space-y-6">
              {/* Controls */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search forms..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>

                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="signed">Signed</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button variant="outline" className="gap-2 bg-transparent">
                        <Filter className="w-4 h-4" />
                        Filter
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="gap-2 bg-transparent">
                        <Download className="w-4 h-4" />
                        Export
                      </Button>

                      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                        <DialogTrigger asChild>
                          <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Create Form
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Create Consent Form</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Form Type</Label>
                                <Select
                                  value={formData.formType}
                                  onValueChange={(value) => setFormData({ ...formData, formType: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="medical_history">Medical History</SelectItem>
                                    <SelectItem value="allergy_info">Allergy Information</SelectItem>
                                    <SelectItem value="treatment_consent">Treatment Consent</SelectItem>
                                    <SelectItem value="photo_consent">Photo Consent</SelectItem>
                                    <SelectItem value="privacy_policy">Privacy Policy</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Customer ID (Optional)</Label>
                                <Input
                                  placeholder="Leave empty for template"
                                  value={formData.customerId}
                                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Form Title</Label>
                              <Input
                                placeholder="Medical History Form"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              />
                            </div>

                            <div>
                              <Label>Description</Label>
                              <Textarea
                                placeholder="Please fill out this form with your medical history..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="min-h-[100px]"
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleCreateForm}>Create Form</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Forms List */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-4 font-medium">Form Type</th>
                          <th className="text-left p-4 font-medium">Customer</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Created Date</th>
                          <th className="text-left p-4 font-medium">Signed Date</th>
                          <th className="text-left p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredForms.map((form) => (
                          <tr key={form.id} className="hover:bg-gray-50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium capitalize">{form.form_type.replace("_", " ")}</div>
                                  <div className="text-sm text-gray-500">ID: {form.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-sm">{form.customer_name || "Template"}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(form.status)}
                                <Badge className={`${getStatusColor(form.status)} capitalize`}>{form.status}</Badge>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-sm">{new Date(form.created_at).toLocaleDateString()}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-sm">
                                {form.signed_date ? new Date(form.signed_date).toLocaleDateString() : "--"}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                                  <Eye className="w-3 h-3" />
                                  View
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-red-600 hover:text-red-700 bg-transparent"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-6">
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Form Templates</h3>
                    <p>Create and manage reusable form templates for different types of consent forms.</p>
                    <Button className="mt-4">Create Template</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">GDPR Compliance</span>
                        <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Medical Records</span>
                        <Badge className="bg-green-100 text-green-800">Up to Date</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Photo Consent</span>
                        <Badge className="bg-yellow-100 text-yellow-800">Needs Review</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Data Retention</span>
                        <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <div className="font-medium">Medical History Form signed</div>
                        <div className="text-gray-500">by Rashad - 2 hours ago</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Photo Consent Form created</div>
                        <div className="text-gray-500">for Sarfaraz - 1 day ago</div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Allergy Information updated</div>
                        <div className="text-gray-500">by Shamshuddin - 2 days ago</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
