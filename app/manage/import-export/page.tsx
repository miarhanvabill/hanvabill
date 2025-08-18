"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { Upload, Download, FileText, Database, Users, Calendar, Package, AlertCircle, CheckCircle } from "lucide-react"

interface ImportExportOperation {
  id: string
  type: "import" | "export"
  dataType: string
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  recordsProcessed: number
  totalRecords: number
  createdAt: string
  fileName?: string
  errorMessage?: string
}

const dataTypes = [
  { id: "customers", name: "Customers", icon: Users, description: "Customer information and contact details" },
  { id: "services", name: "Services", icon: Package, description: "Service catalog with pricing and duration" },
  { id: "bookings", name: "Bookings", icon: Calendar, description: "Appointment and booking data" },
  { id: "products", name: "Products", icon: Package, description: "Product inventory and stock information" },
  { id: "staff", name: "Staff", icon: Users, description: "Employee information and roles" },
]

export default function ImportExportPage() {
  const [operations, setOperations] = useState<ImportExportOperation[]>([])
  const [selectedDataType, setSelectedDataType] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive",
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleImport = async () => {
    if (!selectedFile || !selectedDataType) {
      toast({
        title: "Missing Information",
        description: "Please select a file and data type",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    const newOperation: ImportExportOperation = {
      id: Date.now().toString(),
      type: "import",
      dataType: selectedDataType,
      status: "processing",
      progress: 0,
      recordsProcessed: 0,
      totalRecords: 100, // Mock total
      createdAt: new Date().toISOString(),
      fileName: selectedFile.name,
    }

    setOperations([newOperation, ...operations])

    // Simulate import process
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 20
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)

        const completedOperation = {
          ...newOperation,
          status: "completed" as const,
          progress: 100,
          recordsProcessed: 100,
        }

        setOperations((prev) => prev.map((op) => (op.id === newOperation.id ? completedOperation : op)))

        setIsProcessing(false)
        setSelectedFile(null)
        setSelectedDataType("")

        toast({
          title: "Import Completed",
          description: `Successfully imported ${completedOperation.recordsProcessed} records`,
        })
      } else {
        setOperations((prev) =>
          prev.map((op) =>
            op.id === newOperation.id ? { ...op, progress, recordsProcessed: Math.floor((progress / 100) * 100) } : op,
          ),
        )
      }
    }, 500)
  }

  const handleExport = async (dataType: string) => {
    setIsProcessing(true)

    const newOperation: ImportExportOperation = {
      id: Date.now().toString(),
      type: "export",
      dataType,
      status: "processing",
      progress: 0,
      recordsProcessed: 0,
      totalRecords: 150, // Mock total
      createdAt: new Date().toISOString(),
      fileName: `${dataType}_export_${new Date().toISOString().split("T")[0]}.csv`,
    }

    setOperations([newOperation, ...operations])

    // Simulate export process
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 25
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)

        const completedOperation = {
          ...newOperation,
          status: "completed" as const,
          progress: 100,
          recordsProcessed: 150,
        }

        setOperations((prev) => prev.map((op) => (op.id === newOperation.id ? completedOperation : op)))

        setIsProcessing(false)

        // Simulate file download
        const blob = new Blob([`Sample ${dataType} data`], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = completedOperation.fileName || `${dataType}_export.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Export Completed",
          description: `Successfully exported ${completedOperation.recordsProcessed} records`,
        })
      } else {
        setOperations((prev) =>
          prev.map((op) =>
            op.id === newOperation.id ? { ...op, progress, recordsProcessed: Math.floor((progress / 100) * 150) } : op,
          ),
        )
      }
    }, 400)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case "processing":
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Import and Export"
        subtitle="Quickly import and export customer, service, product, and booking data for efficient management"
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Data
              </CardTitle>
              <CardDescription>Upload CSV files to import data into your system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataType">Data Type</Label>
                  <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select data type to import" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="file">CSV File</Label>
                  <Input id="file" type="file" accept=".csv" onChange={handleFileSelect} disabled={isProcessing} />
                </div>
              </div>

              {selectedFile && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!selectedFile || !selectedDataType || isProcessing}
                className="w-full md:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isProcessing ? "Importing..." : "Import Data"}
              </Button>
            </CardContent>
          </Card>

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Data
              </CardTitle>
              <CardDescription>Download your data as CSV files for backup or analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataTypes.map((type) => (
                  <Card key={type.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <type.icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{type.name}</h3>
                          <p className="text-xs text-gray-500">{type.description}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleExport(type.id)}
                        disabled={isProcessing}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Operations History */}
          {operations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Recent Operations
                </CardTitle>
                <CardDescription>Track the progress of your import and export operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {operations.slice(0, 10).map((operation) => {
                    const dataType = dataTypes.find((t) => t.id === operation.dataType)

                    return (
                      <div key={operation.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(operation.status)}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">
                                  {operation.type} {dataType?.name}
                                </span>
                                <Badge className={getStatusColor(operation.status)}>{operation.status}</Badge>
                              </div>
                              {operation.fileName && <p className="text-sm text-gray-500">{operation.fileName}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {operation.recordsProcessed} / {operation.totalRecords}
                            </p>
                            <p className="text-xs text-gray-500">{new Date(operation.createdAt).toLocaleString()}</p>
                          </div>
                        </div>

                        {operation.status === "processing" && (
                          <div className="space-y-2">
                            <Progress value={operation.progress} className="h-2" />
                            <p className="text-xs text-gray-500">{Math.round(operation.progress)}% complete</p>
                          </div>
                        )}

                        {operation.errorMessage && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-600">
                            {operation.errorMessage}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <Card>
            <CardHeader>
              <CardTitle>Import/Export Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Import Requirements</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Files must be in CSV format</li>
                    <li>• First row should contain column headers</li>
                    <li>• Maximum file size: 10MB</li>
                    <li>• Ensure data matches the expected format</li>
                    <li>• Duplicate entries will be skipped</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Export Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• All data exported in CSV format</li>
                    <li>• Includes all active records</li>
                    <li>• Files are automatically downloaded</li>
                    <li>• Export history is maintained</li>
                    <li>• Data is formatted for easy import</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
