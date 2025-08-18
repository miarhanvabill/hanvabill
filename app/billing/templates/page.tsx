"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { FileText, Plus, Edit, Copy, Trash2, Eye, Save } from "lucide-react"

interface BillingTemplate {
  id: string
  name: string
  description: string
  type: "invoice" | "estimate" | "receipt" | "reminder"
  isDefault: boolean
  isActive: boolean
  createdAt: string
  lastModified: string
  design: {
    primaryColor: string
    secondaryColor: string
    fontFamily: string
    fontSize: string
    logoPosition: "left" | "center" | "right"
    showWatermark: boolean
    headerStyle: "minimal" | "standard" | "detailed"
    footerText: string
  }
  content: {
    header: string
    terms: string
    notes: string
    paymentInstructions: string
  }
}

export default function BillingTemplatesPage() {
  const [templates, setTemplates] = useState<BillingTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<BillingTemplate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for billing templates
    const mockTemplates: BillingTemplate[] = [
      {
        id: "1",
        name: "Professional Invoice",
        description: "Clean and professional invoice template with company branding",
        type: "invoice",
        isDefault: true,
        isActive: true,
        createdAt: "2024-01-15",
        lastModified: "2024-01-20",
        design: {
          primaryColor: "#3B82F6",
          secondaryColor: "#6B7280",
          fontFamily: "Inter",
          fontSize: "14px",
          logoPosition: "left",
          showWatermark: false,
          headerStyle: "standard",
          footerText: "Thank you for your business!",
        },
        content: {
          header: "INVOICE",
          terms: "Payment is due within 30 days of invoice date.",
          notes: "Please include invoice number with payment.",
          paymentInstructions: "Payment can be made via cash, card, or UPI.",
        },
      },
      {
        id: "2",
        name: "Elegant Estimate",
        description: "Sophisticated estimate template for service quotes",
        type: "estimate",
        isDefault: false,
        isActive: true,
        createdAt: "2024-01-10",
        lastModified: "2024-01-18",
        design: {
          primaryColor: "#10B981",
          secondaryColor: "#374151",
          fontFamily: "Roboto",
          fontSize: "13px",
          logoPosition: "center",
          showWatermark: true,
          headerStyle: "detailed",
          footerText: "Estimate valid for 30 days",
        },
        content: {
          header: "SERVICE ESTIMATE",
          terms: "This estimate is valid for 30 days from the date of issue.",
          notes: "Final pricing may vary based on actual services provided.",
          paymentInstructions: "50% advance payment required to confirm booking.",
        },
      },
      {
        id: "3",
        name: "Simple Receipt",
        description: "Minimalist receipt template for quick transactions",
        type: "receipt",
        isDefault: false,
        isActive: true,
        createdAt: "2024-01-12",
        lastModified: "2024-01-22",
        design: {
          primaryColor: "#8B5CF6",
          secondaryColor: "#9CA3AF",
          fontFamily: "Arial",
          fontSize: "12px",
          logoPosition: "right",
          showWatermark: false,
          headerStyle: "minimal",
          footerText: "Visit us again soon!",
        },
        content: {
          header: "RECEIPT",
          terms: "All sales are final.",
          notes: "Thank you for choosing our services.",
          paymentInstructions: "Payment received with thanks.",
        },
      },
    ]

    setTemplates(mockTemplates)
    setLoading(false)
  }, [])

  const handleCreateTemplate = () => {
    const newTemplate: BillingTemplate = {
      id: Date.now().toString(),
      name: "New Template",
      description: "Custom billing template",
      type: "invoice",
      isDefault: false,
      isActive: true,
      createdAt: new Date().toISOString().split("T")[0],
      lastModified: new Date().toISOString().split("T")[0],
      design: {
        primaryColor: "#3B82F6",
        secondaryColor: "#6B7280",
        fontFamily: "Inter",
        fontSize: "14px",
        logoPosition: "left",
        showWatermark: false,
        headerStyle: "standard",
        footerText: "Thank you for your business!",
      },
      content: {
        header: "INVOICE",
        terms: "Payment terms and conditions",
        notes: "Additional notes",
        paymentInstructions: "Payment instructions",
      },
    }

    setTemplates([...templates, newTemplate])
    setSelectedTemplate(newTemplate)
    setIsEditing(true)
  }

  const handleSaveTemplate = () => {
    if (selectedTemplate) {
      const updatedTemplates = templates.map((template) =>
        template.id === selectedTemplate.id
          ? { ...selectedTemplate, lastModified: new Date().toISOString().split("T")[0] }
          : template,
      )
      setTemplates(updatedTemplates)
      setIsEditing(false)
    }
  }

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter((template) => template.id !== templateId))
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null)
      setIsEditing(false)
    }
  }

  const handleDuplicateTemplate = (template: BillingTemplate) => {
    const duplicatedTemplate: BillingTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString().split("T")[0],
      lastModified: new Date().toISOString().split("T")[0],
    }

    setTemplates([...templates, duplicatedTemplate])
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "invoice":
        return "bg-blue-100 text-blue-800"
      case "estimate":
        return "bg-green-100 text-green-800"
      case "receipt":
        return "bg-purple-100 text-purple-800"
      case "reminder":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Billing Templates"
        subtitle="Create and customize professional billing templates for invoices, estimates, and receipts"
        action={
          <Button onClick={handleCreateTemplate} className="gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        }
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Templates List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Templates
                  </CardTitle>
                  <CardDescription>Manage your billing templates</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-2 p-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-sm truncate">{template.name}</h3>
                              {template.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{template.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge className={`${getTypeColor(template.type)} text-xs capitalize`}>
                                {template.type}
                              </Badge>
                              <Switch
                                checked={template.isActive}
                                onCheckedChange={(checked) => {
                                  const updatedTemplates = templates.map((t) =>
                                    t.id === template.id ? { ...t, isActive: checked } : t,
                                  )
                                  setTemplates(updatedTemplates)
                                }}
                                className="scale-75"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Template Editor */}
            <div className="lg:col-span-2">
              {selectedTemplate ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Edit className="w-5 h-5" />
                          {isEditing ? "Edit Template" : selectedTemplate.name}
                        </CardTitle>
                        <CardDescription>
                          {isEditing ? "Customize your template" : "Template details and preview"}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPreview(true)}
                          className="gap-2 bg-transparent"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateTemplate(selectedTemplate)}
                          className="gap-2 bg-transparent"
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </Button>
                        {!selectedTemplate.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                            className="gap-2 text-red-600 bg-transparent"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        )}
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveTemplate} className="gap-2">
                              <Save className="w-4 h-4" />
                              Save
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setIsEditing(true)} className="gap-2">
                            <Edit className="w-4 h-4" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Tabs defaultValue="basic" className="space-y-4">
                        <TabsList>
                          <TabsTrigger value="basic">Basic Info</TabsTrigger>
                          <TabsTrigger value="design">Design</TabsTrigger>
                          <TabsTrigger value="content">Content</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="templateName">Template Name</Label>
                              <Input
                                id="templateName"
                                value={selectedTemplate.name}
                                onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="templateType">Template Type</Label>
                              <Select
                                value={selectedTemplate.type}
                                onValueChange={(value: any) =>
                                  setSelectedTemplate({ ...selectedTemplate, type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="invoice">Invoice</SelectItem>
                                  <SelectItem value="estimate">Estimate</SelectItem>
                                  <SelectItem value="receipt">Receipt</SelectItem>
                                  <SelectItem value="reminder">Payment Reminder</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="templateDescription">Description</Label>
                            <Textarea
                              id="templateDescription"
                              value={selectedTemplate.description}
                              onChange={(e) =>
                                setSelectedTemplate({ ...selectedTemplate, description: e.target.value })
                              }
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="isDefault"
                              checked={selectedTemplate.isDefault}
                              onCheckedChange={(checked) =>
                                setSelectedTemplate({ ...selectedTemplate, isDefault: checked })
                              }
                            />
                            <Label htmlFor="isDefault">Set as default template</Label>
                          </div>
                        </TabsContent>

                        <TabsContent value="design" className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="primaryColor">Primary Color</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  id="primaryColor"
                                  type="color"
                                  value={selectedTemplate.design.primaryColor}
                                  onChange={(e) =>
                                    setSelectedTemplate({
                                      ...selectedTemplate,
                                      design: { ...selectedTemplate.design, primaryColor: e.target.value },
                                    })
                                  }
                                  className="w-16 h-10 p-1"
                                />
                                <Input
                                  value={selectedTemplate.design.primaryColor}
                                  onChange={(e) =>
                                    setSelectedTemplate({
                                      ...selectedTemplate,
                                      design: { ...selectedTemplate.design, primaryColor: e.target.value },
                                    })
                                  }
                                  className="flex-1"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="secondaryColor">Secondary Color</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  id="secondaryColor"
                                  type="color"
                                  value={selectedTemplate.design.secondaryColor}
                                  onChange={(e) =>
                                    setSelectedTemplate({
                                      ...selectedTemplate,
                                      design: { ...selectedTemplate.design, secondaryColor: e.target.value },
                                    })
                                  }
                                  className="w-16 h-10 p-1"
                                />
                                <Input
                                  value={selectedTemplate.design.secondaryColor}
                                  onChange={(e) =>
                                    setSelectedTemplate({
                                      ...selectedTemplate,
                                      design: { ...selectedTemplate.design, secondaryColor: e.target.value },
                                    })
                                  }
                                  className="flex-1"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="fontFamily">Font Family</Label>
                              <Select
                                value={selectedTemplate.design.fontFamily}
                                onValueChange={(value) =>
                                  setSelectedTemplate({
                                    ...selectedTemplate,
                                    design: { ...selectedTemplate.design, fontFamily: value },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Inter">Inter</SelectItem>
                                  <SelectItem value="Roboto">Roboto</SelectItem>
                                  <SelectItem value="Arial">Arial</SelectItem>
                                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="fontSize">Font Size</Label>
                              <Select
                                value={selectedTemplate.design.fontSize}
                                onValueChange={(value) =>
                                  setSelectedTemplate({
                                    ...selectedTemplate,
                                    design: { ...selectedTemplate.design, fontSize: value },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="12px">Small (12px)</SelectItem>
                                  <SelectItem value="14px">Medium (14px)</SelectItem>
                                  <SelectItem value="16px">Large (16px)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="logoPosition">Logo Position</Label>
                              <Select
                                value={selectedTemplate.design.logoPosition}
                                onValueChange={(value: any) =>
                                  setSelectedTemplate({
                                    ...selectedTemplate,
                                    design: { ...selectedTemplate.design, logoPosition: value },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="left">Left</SelectItem>
                                  <SelectItem value="center">Center</SelectItem>
                                  <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="headerStyle">Header Style</Label>
                              <Select
                                value={selectedTemplate.design.headerStyle}
                                onValueChange={(value: any) =>
                                  setSelectedTemplate({
                                    ...selectedTemplate,
                                    design: { ...selectedTemplate.design, headerStyle: value },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="minimal">Minimal</SelectItem>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="detailed">Detailed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                              <Switch
                                id="showWatermark"
                                checked={selectedTemplate.design.showWatermark}
                                onCheckedChange={(checked) =>
                                  setSelectedTemplate({
                                    ...selectedTemplate,
                                    design: { ...selectedTemplate.design, showWatermark: checked },
                                  })
                                }
                              />
                              <Label htmlFor="showWatermark">Show watermark</Label>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="footerText">Footer Text</Label>
                            <Input
                              id="footerText"
                              value={selectedTemplate.design.footerText}
                              onChange={(e) =>
                                setSelectedTemplate({
                                  ...selectedTemplate,
                                  design: { ...selectedTemplate.design, footerText: e.target.value },
                                })
                              }
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="content" className="space-y-4">
                          <div>
                            <Label htmlFor="header">Header Text</Label>
                            <Input
                              id="header"
                              value={selectedTemplate.content.header}
                              onChange={(e) =>
                                setSelectedTemplate({
                                  ...selectedTemplate,
                                  content: { ...selectedTemplate.content, header: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="terms">Terms & Conditions</Label>
                            <Textarea
                              id="terms"
                              value={selectedTemplate.content.terms}
                              onChange={(e) =>
                                setSelectedTemplate({
                                  ...selectedTemplate,
                                  content: { ...selectedTemplate.content, terms: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              value={selectedTemplate.content.notes}
                              onChange={(e) =>
                                setSelectedTemplate({
                                  ...selectedTemplate,
                                  content: { ...selectedTemplate.content, notes: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="paymentInstructions">Payment Instructions</Label>
                            <Textarea
                              id="paymentInstructions"
                              value={selectedTemplate.content.paymentInstructions}
                              onChange={(e) =>
                                setSelectedTemplate({
                                  ...selectedTemplate,
                                  content: { ...selectedTemplate.content, paymentInstructions: e.target.value },
                                })
                              }
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Template Type</Label>
                            <Badge className={`${getTypeColor(selectedTemplate.type)} mt-1 capitalize`}>
                              {selectedTemplate.type}
                            </Badge>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Status</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={selectedTemplate.isActive ? "default" : "secondary"}>
                                {selectedTemplate.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {selectedTemplate.isDefault && <Badge variant="outline">Default</Badge>}
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-500">Description</Label>
                          <p className="mt-1 text-sm">{selectedTemplate.description}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Created</Label>
                            <p className="mt-1 text-sm">{new Date(selectedTemplate.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Last Modified</Label>
                            <p className="mt-1 text-sm">
                              {new Date(selectedTemplate.lastModified).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-500">Design Preview</Label>
                          <div className="mt-2 p-4 border rounded-lg bg-white">
                            <div className="flex items-center gap-4 mb-4">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: selectedTemplate.design.primaryColor }}
                              ></div>
                              <span className="text-sm">Primary: {selectedTemplate.design.primaryColor}</span>
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: selectedTemplate.design.secondaryColor }}
                              ></div>
                              <span className="text-sm">Secondary: {selectedTemplate.design.secondaryColor}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <p>Font: {selectedTemplate.design.fontFamily}</p>
                              <p>Size: {selectedTemplate.design.fontSize}</p>
                              <p>Logo Position: {selectedTemplate.design.logoPosition}</p>
                              <p>Header Style: {selectedTemplate.design.headerStyle}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Template Selected</h3>
                      <p className="text-gray-500 mb-4">Select a template from the list to view or edit it</p>
                      <Button onClick={handleCreateTemplate} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create New Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="p-6 bg-white border rounded-lg">
              <div
                className="text-center mb-6"
                style={{
                  color: selectedTemplate.design.primaryColor,
                  fontFamily: selectedTemplate.design.fontFamily,
                }}
              >
                <h1 className="text-2xl font-bold">{selectedTemplate.content.header}</h1>
              </div>
              <div className="space-y-4 text-sm" style={{ fontFamily: selectedTemplate.design.fontFamily }}>
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2">Sample Content</h3>
                  <p>This is a preview of how your template will look with actual content.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Terms & Conditions:</h4>
                  <p className="text-gray-600">{selectedTemplate.content.terms}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Notes:</h4>
                  <p className="text-gray-600">{selectedTemplate.content.notes}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Payment Instructions:</h4>
                  <p className="text-gray-600">{selectedTemplate.content.paymentInstructions}</p>
                </div>
                <div className="text-center pt-4 border-t">
                  <p style={{ color: selectedTemplate.design.secondaryColor }}>{selectedTemplate.design.footerText}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
