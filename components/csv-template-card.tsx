"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Info } from "lucide-react"
import { downloadCSVTemplate, getTemplateByType, getRequiredHeaders, getOptionalHeaders } from "@/lib/csv-templates"
import { toast } from "@/hooks/use-toast"

interface CSVTemplateCardProps {
  entityType: "customers" | "services" | "bookings"
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export function CSVTemplateCard({ entityType, title, description, icon: Icon }: CSVTemplateCardProps) {
  const template = getTemplateByType(entityType)
  const requiredHeaders = getRequiredHeaders(entityType)
  const optionalHeaders = getOptionalHeaders(entityType)

  const handleDownloadEmpty = () => {
    downloadCSVTemplate(template, false)
    toast({
      title: "Template Downloaded",
      description: `Empty ${title.toLowerCase()} template downloaded successfully`,
    })
  }

  const handleDownloadSample = () => {
    downloadCSVTemplate(template, true)
    toast({
      title: "Sample Template Downloaded",
      description: `${title} template with sample data downloaded successfully`,
    })
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Required Fields */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <span className="text-red-500">*</span>
            Required Fields
          </h4>
          <div className="flex flex-wrap gap-1">
            {requiredHeaders.map((header) => (
              <Badge key={header} variant="destructive" className="text-xs">
                {header}
              </Badge>
            ))}
          </div>
        </div>

        {/* Optional Fields */}
        {optionalHeaders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Optional Fields</h4>
            <div className="flex flex-wrap gap-1">
              {optionalHeaders.map((header) => (
                <Badge key={header} variant="secondary" className="text-xs">
                  {header}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Template Info */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Template Information</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Total columns: {template.headers.length}</li>
                <li>• Required fields: {requiredHeaders.length}</li>
                <li>• Optional fields: {optionalHeaders.length}</li>
                <li>• File format: CSV (Comma Separated Values)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleDownloadEmpty} variant="outline" size="sm" className="flex-1 bg-transparent">
            <FileText className="w-4 h-4 mr-2" />
            Empty Template
          </Button>
          <Button onClick={handleDownloadSample} size="sm" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            With Sample Data
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
