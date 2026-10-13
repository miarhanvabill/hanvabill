"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, Copy, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface BulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  sampleHeaders: string[]
  onUpload: (file: File) => Promise<{
    success: boolean
    message: string
    recordsProcessed?: number
    errors?: string[]
  }>
  entityType: "customers" | "services" | "bookings"
}

interface UploadProgress {
  isUploading: boolean
  progress: number
  status: "idle" | "uploading" | "success" | "error"
  message: string
  recordsProcessed?: number
  errors?: string[]
}

export function BulkUploadModal({
  isOpen,
  onClose,
  title,
  description,
  sampleHeaders,
  onUpload,
  entityType,
}: BulkUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    status: "idle",
    message: "",
  })
  const [isDragOver, setIsDragOver] = useState(false)
  const [copiedErrors, setCopiedErrors] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const validateAndSetFile = (file: File) => {
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file",
        variant: "destructive",
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)
    setUploadProgress({ isUploading: false, progress: 0, status: "idle", message: "" })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      validateAndSetFile(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploadProgress({
      isUploading: true,
      progress: 0,
      status: "uploading",
      message: "Processing file...",
    })

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 20, 90),
        }))
      }, 200)

      const result = await onUpload(selectedFile)

      clearInterval(progressInterval)

      const resultErrors =
        result.errors && result.errors.length > 0
          ? result.errors
          : !result.success
            ? [result.message]
            : undefined

      if (result.success) {
        setUploadProgress({
          isUploading: false,
          progress: 100,
          status: "success",
          message: result.message,
          recordsProcessed: result.recordsProcessed,
          errors: resultErrors,
        })

        toast({
          title: "Upload Successful",
          description: result.message,
        })

        // Auto-close only if there are NO errors to review
        if (!resultErrors || resultErrors.length === 0) {
          setTimeout(() => {
            handleClose()
          }, 2000)
        }
      } else {
        setUploadProgress({
          isUploading: false,
          progress: 0,
          status: "error",
          message: result.message,
          recordsProcessed: result.recordsProcessed,
          errors: resultErrors,
        })

        toast({
          title: "Upload Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : "An unexpected error occurred during upload"
      setUploadProgress({
        isUploading: false,
        progress: 0,
        status: "error",
        message: errMsg,
        errors: [`Fatal upload error: ${errMsg}`],
      })

      toast({
        title: "Upload Error",
        description: errMsg,
        variant: "destructive",
      })
    }
  }

  const downloadErrorLogs = () => {
    if (!uploadProgress.errors || uploadProgress.errors.length === 0) return

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const headerLines = [
      `======================================================================`,
      `HANVA BILLING - BULK UPLOAD ERROR REPORT`,
      `======================================================================`,
      `Entity Type   : ${entityType.toUpperCase()}`,
      `File Name     : ${selectedFile?.name || "uploaded-file.csv"}`,
      `Date & Time   : ${new Date().toLocaleString()}`,
      `Total Errors  : ${uploadProgress.errors.length}`,
      `Processed     : ${uploadProgress.recordsProcessed || 0} successfully`,
      `Summary       : ${uploadProgress.message}`,
      `======================================================================`,
      ``,
      `DETAILED ROW-BY-ROW ERRORS:`,
      `----------------------------------------------------------------------`,
    ]

    const errorLines = uploadProgress.errors.map((err, idx) => `[Error #${idx + 1}] ${err}`)

    const footerLines = [
      ``,
      `----------------------------------------------------------------------`,
      `TROUBLESHOOTING INSTRUCTIONS:`,
      `1. Check required headers: ${sampleHeaders.join(", ")}`,
      `2. Verify that numeric fields (e.g. price, duration_minutes) contain valid numbers.`,
      `3. Verify that required text fields (e.g. name, phone_number) are not blank.`,
      `4. Check for duplicate codes or names if those constraints exist.`,
      `5. Download the sample CSV template from the modal for reference.`,
      `======================================================================`,
    ]

    const fullContent = [...headerLines, ...errorLines, ...footerLines].join("\n")
    const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${entityType}_upload_errors_${timestamp}.txt`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast({
      title: "Error Log Downloaded",
      description: `Downloaded log file containing ${uploadProgress.errors.length} error details.`,
    })
  }

  const copyErrorsToClipboard = () => {
    if (!uploadProgress.errors || uploadProgress.errors.length === 0) return
    const text = uploadProgress.errors.join("\n")
    navigator.clipboard.writeText(text).then(() => {
      setCopiedErrors(true)
      setTimeout(() => setCopiedErrors(false), 2000)
      toast({
        title: "Errors Copied",
        description: "Error log copied to clipboard.",
      })
    })
  }

  const downloadSampleTemplate = () => {
    const csvContent = sampleHeaders.join(",") + "\n"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${entityType}_sample_template.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast({
      title: "Template Downloaded",
      description: `Sample ${entityType} template has been downloaded`,
    })
  }

  const handleClose = () => {
    setSelectedFile(null)
    setUploadProgress({ isUploading: false, progress: 0, status: "idle", message: "" })
    onClose()
  }

  const removeFile = () => {
    setSelectedFile(null)
    setUploadProgress({ isUploading: false, progress: 0, status: "idle", message: "" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getStatusIcon = () => {
    switch (uploadProgress.status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case "uploading":
        return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sample Template Download */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Download Sample Template</h4>
                  <p className="text-sm text-gray-600">Get the correct CSV format with required headers</p>
                </div>
                <Button onClick={downloadSampleTemplate} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File Upload Area */}
          <div className="space-y-4">
            <Label>Upload CSV File</Label>

            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? "border-blue-500 bg-blue-50"
                  : selectedFile
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-green-600" />
                    <Button onClick={removeFile} variant="ghost" size="sm" className="absolute ml-20 -mt-2">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium">Drop your CSV file here</p>
                    <p className="text-sm text-gray-500">or click to browse</p>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden File Input */}
            <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />

            {/* Browse Button */}
            {!selectedFile && (
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
            )}
          </div>

          {/* Upload Progress & Error Details */}
          {uploadProgress.status !== "idle" && (
            <Card
              className={
                uploadProgress.status === "error" ||
                (uploadProgress.errors && uploadProgress.errors.length > 0)
                  ? "border-red-300 bg-red-50/40"
                  : ""
              }
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className="font-medium">
                      {uploadProgress.status === "uploading" && "Uploading..."}
                      {uploadProgress.status === "success" && "Upload Complete"}
                      {uploadProgress.status === "error" && "Upload Failed"}
                    </span>
                  </div>

                  {uploadProgress.isUploading && <Progress value={uploadProgress.progress} className="h-2" />}

                  <p className="text-sm text-gray-700">{uploadProgress.message}</p>

                  {uploadProgress.recordsProcessed !== undefined && uploadProgress.recordsProcessed > 0 && (
                    <p className="text-sm font-medium text-green-600">
                      Successfully processed {uploadProgress.recordsProcessed} records
                    </p>
                  )}

                  {/* Error Log Section */}
                  {uploadProgress.errors && uploadProgress.errors.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-red-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-red-700 font-semibold text-sm">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>
                            {uploadProgress.errors.length} Error{uploadProgress.errors.length > 1 ? "s" : ""} Encountered
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={copyErrorsToClipboard}
                            className="h-8 text-xs border-red-300 text-red-800 hover:bg-red-100 bg-white"
                          >
                            {copiedErrors ? (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 mr-1" />
                                Copy Errors
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={downloadErrorLogs}
                            className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm font-medium"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Download Error Log
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-red-600">
                        Review the detailed row issues below or download the error log to fix your CSV file:
                      </p>

                      {/* Scrollable Error Log Viewer */}
                      <div className="bg-white border border-red-200 rounded-md p-3 text-xs font-mono text-red-900 max-h-48 overflow-y-auto space-y-1">
                        {uploadProgress.errors.slice(0, 100).map((err, idx) => (
                          <div key={idx} className="flex gap-2 items-start py-0.5 border-b border-red-50 last:border-b-0">
                            <span className="text-red-400 font-semibold select-none shrink-0">{idx + 1}.</span>
                            <span className="break-all">{err}</span>
                          </div>
                        ))}
                        {uploadProgress.errors.length > 100 && (
                          <p className="text-xs text-gray-500 pt-1.5 font-sans italic border-t border-red-100">
                            ...and {uploadProgress.errors.length - 100} more errors. Click &quot;Download Error Log&quot; to view the complete log.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Required Headers Info */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Required CSV Headers</h4>
              <div className="flex flex-wrap gap-2">
                {sampleHeaders.map((header, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono">
                    {header}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Required fields must be included. Optional fields can be left empty.
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button onClick={handleClose} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploadProgress.isUploading}>
              {uploadProgress.isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Data
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
