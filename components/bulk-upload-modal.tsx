"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface BulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  sampleHeaders: string[]
  onUpload: (file: File) => Promise<{ success: boolean; message: string; recordsProcessed?: number }>
  entityType: "customers" | "services" | "bookings"
}

interface UploadProgress {
  isUploading: boolean
  progress: number
  status: "idle" | "uploading" | "success" | "error"
  message: string
  recordsProcessed?: number
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

      if (result.success) {
        setUploadProgress({
          isUploading: false,
          progress: 100,
          status: "success",
          message: result.message,
          recordsProcessed: result.recordsProcessed,
        })

        toast({
          title: "Upload Successful",
          description: result.message,
        })

        // Auto-close after success
        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        setUploadProgress({
          isUploading: false,
          progress: 0,
          status: "error",
          message: result.message,
        })

        toast({
          title: "Upload Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      setUploadProgress({
        isUploading: false,
        progress: 0,
        status: "error",
        message: "An unexpected error occurred during upload",
      })

      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      })
    }
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
      <DialogContent className="max-w-2xl">
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

          {/* Upload Progress */}
          {uploadProgress.status !== "idle" && (
            <Card>
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

                  <p className="text-sm text-gray-600">{uploadProgress.message}</p>

                  {uploadProgress.recordsProcessed && (
                    <p className="text-sm font-medium text-green-600">
                      Successfully processed {uploadProgress.recordsProcessed} records
                    </p>
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
