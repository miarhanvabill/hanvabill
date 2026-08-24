"use client"

import { useState } from "react"
import { CustomForm, createCustomForm, updateCustomForm, deleteCustomForm } from "@/app/actions/custom-forms"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash, Edit, ArrowLeft, ArrowUp, ArrowDown, Save, Copy, FileText, CheckSquare, List, PenTool } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

type FieldType = "text" | "textarea" | "select" | "checkbox" | "signature"

interface FormField {
  id: string
  type: FieldType
  label: string
  required: boolean
  options?: string[] // For select fields
}

interface FormsBuilderClientProps {
  initialForms: CustomForm[]
}

const FIELD_ICONS = {
  text: <FileText className="h-4 w-4" />,
  textarea: <FileText className="h-4 w-4" />,
  select: <List className="h-4 w-4" />,
  checkbox: <CheckSquare className="h-4 w-4" />,
  signature: <PenTool className="h-4 w-4" />
}

export default function FormsBuilderClient({ initialForms }: FormsBuilderClientProps) {
  const [forms, setForms] = useState<CustomForm[]>(initialForms)
  const [view, setView] = useState<"list" | "edit">("list")
  const [currentFormId, setCurrentFormId] = useState<string | null>(null)
  
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [fields, setFields] = useState<FormField[]>([])
  
  const [isSaving, setIsSaving] = useState(false)
  
  const handleCreateNew = () => {
    setCurrentFormId(null)
    setFormName("")
    setFormDescription("")
    setFields([
      { id: crypto.randomUUID(), type: "text", label: "Full Name", required: true }
    ])
    setView("edit")
  }
  
  const handleEdit = (form: CustomForm) => {
    setCurrentFormId(form.id)
    setFormName(form.name)
    setFormDescription(form.description || "")
    setFields(form.schema_json || [])
    setView("edit")
  }
  
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this form?")) return
    
    try {
      const result = await deleteCustomForm(id)
      if (result.success) {
        setForms(forms.filter(f => f.id !== id))
        toast.success("Form deleted")
      } else {
        toast.error(result.error || "Failed to delete form")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to delete form")
    }
  }
  
  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Form name is required")
      return
    }
    
    if (fields.length === 0) {
      toast.error("Form must have at least one field")
      return
    }
    
    // Validate fields
    for (const field of fields) {
      if (!field.label.trim()) {
        toast.error("All fields must have a label")
        return
      }
      if (field.type === "select" && (!field.options || field.options.length === 0)) {
        toast.error(`Select field "${field.label}" must have at least one option`)
        return
      }
    }
    
    setIsSaving(true)
    try {
      const data = {
        name: formName,
        description: formDescription,
        schema_json: fields
      }
      
      let result;
      if (currentFormId) {
        result = await updateCustomForm(currentFormId, data)
      } else {
        result = await createCustomForm(data)
      }
      
      if (result.success) {
        toast.success(currentFormId ? "Form updated" : "Form created")
        if (currentFormId) {
          setForms(forms.map(f => f.id === currentFormId ? result.form : f))
        } else {
          setForms([result.form, ...forms])
        }
        setView("list")
      } else {
        toast.error(result.error || "Failed to save form")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save form")
    } finally {
      setIsSaving(false)
    }
  }
  
  const addField = (type: FieldType) => {
    setFields([
      ...fields,
      {
        id: crypto.randomUUID(),
        type,
        label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
        required: false,
        ...(type === "select" ? { options: ["Option 1"] } : {})
      }
    ])
  }
  
  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
  }
  
  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
  }
  
  const moveField = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      const newFields = [...fields]
      const temp = newFields[index - 1]
      newFields[index - 1] = newFields[index]
      newFields[index] = temp
      setFields(newFields)
    } else if (direction === "down" && index < fields.length - 1) {
      const newFields = [...fields]
      const temp = newFields[index + 1]
      newFields[index + 1] = newFields[index]
      newFields[index] = temp
      setFields(newFields)
    }
  }
  
  if (view === "list") {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" /> Create Form
          </Button>
        </div>
        
        {forms.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No forms created yet</h3>
            <p className="text-muted-foreground mb-6">Create your first custom form to collect data from customers.</p>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" /> Create Form
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {forms.map(form => (
              <Card key={form.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{form.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {form.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-sm text-muted-foreground flex justify-between items-center">
                    <span>{form.schema_json?.length || 0} fields</span>
                    <span>{format(new Date(form.created_at), "MMM d, yyyy")}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(form)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(form.id)}>
                    <Trash className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setView("list")} className="px-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Forms
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Form</>}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Details</CardTitle>
              <CardDescription>Basic information about this form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Form Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="name" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  placeholder="e.g. Consent Form, Consultation Questionnaire"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={formDescription} 
                  onChange={(e) => setFormDescription(e.target.value)} 
                  placeholder="Instructions or details for the customer"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Form Fields</h3>
              <Badge variant="secondary">{fields.length} fields</Badge>
            </div>
            
            {fields.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <p className="text-muted-foreground">No fields added yet. Add fields from the right panel.</p>
              </Card>
            ) : (
              fields.map((field, index) => (
                <Card key={field.id} className="relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary/20 group-hover:bg-primary transition-colors" />
                  <CardHeader className="py-4 flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      {FIELD_ICONS[field.type]}
                      <span className="font-semibold capitalize text-sm">{field.type} Field</span>
                      {field.required && <Badge variant="outline" className="text-[10px] uppercase h-5">Required</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveField(index, "up")} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveField(index, "down")} disabled={index === fields.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeField(field.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3 space-y-2">
                          <Label>Field Label</Label>
                          <Input 
                            value={field.label} 
                            onChange={(e) => updateField(field.id, { label: e.target.value })} 
                            placeholder="Question or field label"
                          />
                        </div>
                        <div className="flex flex-col justify-end space-y-2">
                          <div className="flex items-center space-x-2 h-10">
                            <Switch 
                              id={`req-${field.id}`}
                              checked={field.required}
                              onCheckedChange={(c) => updateField(field.id, { required: c })}
                            />
                            <Label htmlFor={`req-${field.id}`}>Required</Label>
                          </div>
                        </div>
                      </div>
                      
                      {field.type === "select" && (
                        <div className="space-y-2 pt-2 border-t">
                          <Label>Options</Label>
                          <div className="space-y-2">
                            {field.options?.map((opt, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <Input 
                                  value={opt} 
                                  onChange={(e) => {
                                    const newOpts = [...(field.options || [])]
                                    newOpts[optIndex] = e.target.value
                                    updateField(field.id, { options: newOpts })
                                  }}
                                  className="h-8"
                                />
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground"
                                  onClick={() => {
                                    const newOpts = (field.options || []).filter((_, i) => i !== optIndex)
                                    updateField(field.id, { options: newOpts })
                                  }}
                                  disabled={(field.options || []).length <= 1}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full text-xs"
                              onClick={() => {
                                updateField(field.id, { options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] })
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Option
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Add Field</CardTitle>
              <CardDescription>Click to add elements to your form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start h-12" onClick={() => addField("text")}>
                <FileText className="mr-3 h-5 w-5 text-blue-500" /> 
                <div className="flex flex-col items-start">
                  <span>Short Text</span>
                  <span className="text-[10px] text-muted-foreground">Single line input</span>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" onClick={() => addField("textarea")}>
                <FileText className="mr-3 h-5 w-5 text-green-500" /> 
                <div className="flex flex-col items-start">
                  <span>Long Text</span>
                  <span className="text-[10px] text-muted-foreground">Multi-line input</span>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" onClick={() => addField("select")}>
                <List className="mr-3 h-5 w-5 text-purple-500" /> 
                <div className="flex flex-col items-start">
                  <span>Dropdown</span>
                  <span className="text-[10px] text-muted-foreground">Select one option</span>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" onClick={() => addField("checkbox")}>
                <CheckSquare className="mr-3 h-5 w-5 text-orange-500" /> 
                <div className="flex flex-col items-start">
                  <span>Checkbox</span>
                  <span className="text-[10px] text-muted-foreground">Yes/No or agreements</span>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" onClick={() => addField("signature")}>
                <PenTool className="mr-3 h-5 w-5 text-pink-500" /> 
                <div className="flex flex-col items-start">
                  <span>Signature</span>
                  <span className="text-[10px] text-muted-foreground">Digital signature pad</span>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
