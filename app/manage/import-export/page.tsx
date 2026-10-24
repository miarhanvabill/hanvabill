"use client"

import { useState, useEffect, useTransition, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  Download,
  FileText,
  Database,
  Users,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileSpreadsheet,
  Receipt,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Filter,
  FileCheck,
  AlertTriangle,
  History,
  Info,
  Clock,
  Layers,
} from "lucide-react"
import { toast } from "sonner"
import {
  getImportExportStats,
  getOperationsHistory,
  logOperation,
  processEntityImport,
  type EntityStats,
  type ImportExportHistoryItem,
} from "@/app/actions/import-export"
import {
  getTemplateByType,
  downloadCSVTemplate,
  type CSVEntityType,
} from "@/lib/csv-templates"
import { CSVParser } from "@/lib/csv-parser"

interface ExportEntityConfig {
  id: string
  name: string
  icon: any
  description: string
  countKey: keyof EntityStats
  endpoint: string
  hasDateFilter?: boolean
}

const EXPORT_ENTITIES: ExportEntityConfig[] = [
  {
    id: "customers",
    name: "Customers & Clients",
    icon: Users,
    description: "Contact details, birthdays, notes, total spend, and visit history",
    countKey: "customers",
    endpoint: "/api/export/customers",
  },
  {
    id: "services",
    name: "Services & Treatments",
    icon: Layers,
    description: "Service menu with pricing, duration minutes, categories, and codes",
    countKey: "services",
    endpoint: "/api/export/services",
  },
  {
    id: "products",
    name: "Products & Retail Inventory",
    icon: Package,
    description: "Retail stock, SKU barcodes, cost price, selling price, and stock levels",
    countKey: "products",
    endpoint: "/api/export/products",
  },
  {
    id: "invoices",
    name: "Sales & GST Invoices Ledger",
    icon: Receipt,
    description: "Comprehensive billing ledger with taxes, discounts, payment modes, and client info",
    countKey: "invoices",
    endpoint: "/api/export/invoices",
    hasDateFilter: true,
  },
  {
    id: "bookings",
    name: "Appointments & Bookings",
    icon: Calendar,
    description: "Historical bookings, schedule dates, assigned stylists, and statuses",
    countKey: "bookings",
    endpoint: "/api/export/bookings",
  },
  {
    id: "staff",
    name: "Staff & Team Members",
    icon: Users,
    description: "Stylist roster, contact info, job roles, and commission percentages",
    countKey: "staff",
    endpoint: "/api/export/staff",
  },
]

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<string>("export")
  const [stats, setStats] = useState<EntityStats>({
    customers: 0,
    services: 0,
    products: 0,
    bookings: 0,
    staff: 0,
    invoices: 0,
  })
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Export State
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [invoiceDateRange, setInvoiceDateRange] = useState<string>("all")

  // Import State
  const [importEntity, setImportEntity] = useState<"customers" | "services" | "products" | "staff">("customers")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string>("")
  const [parsedRows, setParsedRows] = useState<string[][]>([])
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip")
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    recordsProcessed?: number
    errors?: string[]
  } | null>(null)

  // History State
  const [history, setHistory] = useState<ImportExportHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Load stats and history on mount
  useEffect(() => {
    loadLiveStats()
    loadHistory()
  }, [])

  async function loadLiveStats() {
    setIsLoadingStats(true)
    try {
      const res = await getImportExportStats()
      if (res.success && res.data) {
        setStats(res.data)
      }
    } catch (err) {
      console.warn("Could not load import/export stats:", err)
    } finally {
      setIsLoadingStats(false)
    }
  }

  async function loadHistory() {
    setIsLoadingHistory(true)
    try {
      const res = await getOperationsHistory()
      if (res.success && res.data) {
        setHistory(res.data)
      }
    } catch (err) {
      console.warn("Could not load history:", err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Handle Export Action
  async function handleExport(entity: ExportEntityConfig) {
    setExportingId(entity.id)
    try {
      let url = entity.endpoint
      if (entity.id === "invoices" && invoiceDateRange !== "all") {
        url += `?range=${invoiceDateRange}`
      }

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`)
      }

      const blob = await res.blob()
      const recordCount = Number.parseInt(res.headers.get("X-Record-Count") || "0", 10)
      const fileName = `${entity.id}_export_${new Date().toISOString().split("T")[0]}.csv`

      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      toast.success(`Successfully exported ${recordCount} ${entity.name} records to CSV`)

      // Log export operation
      await logOperation({
        type: "export",
        dataType: entity.id,
        status: "completed",
        recordsProcessed: recordCount,
        totalRecords: recordCount,
        fileName,
      })

      loadHistory()
    } catch (err: any) {
      console.error("Export error:", err)
      toast.error(err?.message || `Failed to export ${entity.name}`)
    } finally {
      setExportingId(null)
    }
  }

  // Handle File Selection for Import
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setImportResult(null)
    if (!file) {
      setSelectedFile(null)
      setFileContent("")
      setParsedRows([])
      return
    }

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please upload a standard CSV (.csv) file.")
      e.target.value = ""
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB limit. Please upload a smaller CSV file.")
      e.target.value = ""
      return
    }

    setSelectedFile(file)

    // Read and preview file content
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = (event.target?.result as string) || ""
      setFileContent(text)
      try {
        const rows = CSVParser.parseCSV(text)
        setParsedRows(rows)
        toast.info(`CSV parsed: detected ${Math.max(0, rows.length - 1)} data rows`)
      } catch (err) {
        console.warn("CSV parse preview warning:", err)
      }
    }
    reader.readAsText(file)
  }

  // Handle Template Download
  function handleDownloadTemplate(entity: CSVEntityType) {
    try {
      const template = getTemplateByType(entity)
      downloadCSVTemplate(template, true)
      toast.success(`${template.filename} downloaded with sample data!`)
    } catch (err: any) {
      toast.error(err?.message || "Failed to download CSV template")
    }
  }

  // Execute Import
  async function handleExecuteImport() {
    if (!selectedFile || !fileContent.trim()) {
      toast.error("Please select a valid CSV file first")
      return
    }

    setIsImporting(true)
    setImportProgress(25)
    setImportResult(null)

    try {
      setImportProgress(50)
      const res = await processEntityImport(
        importEntity,
        fileContent,
        selectedFile.name,
        duplicateMode
      )

      setImportProgress(100)
      setImportResult(res)

      if (res.success) {
        toast.success(res.message || "Import completed successfully!")
        loadLiveStats()
        loadHistory()
      } else {
        toast.error(res.message || "Import encountered issues")
      }
    } catch (err: any) {
      const errMsg = err?.message || "Unexpected error occurred during import"
      toast.error(errMsg)
      setImportResult({
        success: false,
        message: errMsg,
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Reset file input
  function handleResetImport() {
    setSelectedFile(null)
    setFileContent("")
    setParsedRows([])
    setImportResult(null)
    setImportProgress(0)
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <PageHeader
        title="Data Import & Export Center"
        subtitle="Live multi-tenant backup, bulk customer onboarding, inventory replenishment, and financial ledger exports."
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-12 max-w-7xl mx-auto w-full space-y-6">
        {/* Live Entity Counts Header Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Customers</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {isLoadingStats ? "..." : stats.customers.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Live Database</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Services</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {isLoadingStats ? "..." : stats.services.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Active Menu</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Products</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {isLoadingStats ? "..." : stats.products.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Retail & Stock</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Sales Invoices</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {isLoadingStats ? "..." : stats.invoices.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">GST Ledger</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Bookings</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {isLoadingStats ? "..." : stats.bookings.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Appointments</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Staff Stylists</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {isLoadingStats ? "..." : stats.staff.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Active Team</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
            <TabsList className="bg-white border p-1 rounded-xl shadow-2xs h-auto flex flex-wrap gap-1">
              <TabsTrigger
                value="export"
                className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white font-medium text-xs sm:text-sm"
              >
                <Download className="w-4 h-4" />
                Export Data
              </TabsTrigger>
              <TabsTrigger
                value="import"
                className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white font-medium text-xs sm:text-sm"
              >
                <Upload className="w-4 h-4" />
                Import Data & Migrations
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white font-medium text-xs sm:text-sm"
              >
                <History className="w-4 h-4" />
                Operations History
                {history.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800">
                    {history.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="templates"
                className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white font-medium text-xs sm:text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Sample Templates
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadLiveStats()
                loadHistory()
                toast.success("Refreshed latest database stats")
              }}
              className="gap-1.5 text-xs self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Counts
            </Button>
          </div>

          {/* TAB 1: EXPORT DATA */}
          <TabsContent value="export" className="space-y-6 m-0">
            <Card className="border shadow-2xs bg-white">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Download className="w-5 h-5 text-primary" />
                      Live Data Export Hub
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      Download clean, formatted CSV spreadsheets with all active tenant records for CA filing, offline backup, or Excel analysis.
                    </CardDescription>
                  </div>

                  {/* Date range filter for invoices */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 whitespace-nowrap">Invoice Range:</span>
                    <Select value={invoiceDateRange} onValueChange={setInvoiceDateRange}>
                      <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Invoices</SelectItem>
                        <SelectItem value="today">Today Only</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="last30">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {EXPORT_ENTITIES.map((entity) => {
                    const count = stats[entity.countKey] || 0
                    const isBusy = exportingId === entity.id

                    return (
                      <Card key={entity.id} className="border shadow-2xs flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <entity.icon className="w-5 h-5" />
                            </div>
                            <Badge variant="secondary" className="text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {count.toLocaleString()} Records
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-semibold text-slate-900 mt-3">
                            {entity.name}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500 leading-relaxed min-h-[34px]">
                            {entity.description}
                          </CardDescription>
                        </CardHeader>

                        <CardFooter className="p-4 pt-2 border-t bg-slate-50/50">
                          <Button
                            onClick={() => handleExport(entity)}
                            disabled={isBusy}
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 text-xs font-medium hover:bg-primary hover:text-white transition-colors"
                          >
                            {isBusy ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Exporting CSV...
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                Export {entity.name.split(" ")[0]} CSV
                              </>
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: IMPORT DATA */}
          <TabsContent value="import" className="space-y-6 m-0">
            <Card className="border shadow-2xs bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Bulk CSV Import & Data Migration
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Easily migrate your existing client lists, price lists, or retail stock from Zenoti, Fresha, Excel, or other salon software.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Step 1: Select Entity & Duplicate Strategy */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/70 border">
                  <div>
                    <Label htmlFor="import-entity" className="text-xs font-semibold text-slate-800">
                      1. Select What You Are Importing <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={importEntity}
                      onValueChange={(val: any) => {
                        setImportEntity(val)
                        setImportResult(null)
                      }}
                    >
                      <SelectTrigger id="import-entity" className="mt-1.5 bg-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customers">👥 Customers & Clients</SelectItem>
                        <SelectItem value="services">💇‍♀️ Services & Menu Prices</SelectItem>
                        <SelectItem value="products">📦 Retail Products & Stock</SelectItem>
                        <SelectItem value="staff">✂️ Staff & Stylists</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dup-mode" className="text-xs font-semibold text-slate-800">
                      2. Duplicate Record Strategy
                    </Label>
                    <Select
                      value={duplicateMode}
                      onValueChange={(val: any) => setDuplicateMode(val)}
                    >
                      <SelectTrigger id="dup-mode" className="mt-1.5 bg-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip existing records (Keep original)</SelectItem>
                        <SelectItem value="update">Update existing records with new values</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Step 2: Download Template Callout */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900">
                        Need the pre-formatted CSV template?
                      </h4>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Download the official template with sample salon data and required column headers.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate(importEntity as CSVEntityType)}
                    className="bg-white hover:bg-blue-100 text-blue-700 border-blue-300 text-xs shrink-0 gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download {importEntity.toUpperCase()} Template
                  </Button>
                </div>

                {/* Step 3: File Dropzone */}
                <div>
                  <Label htmlFor="csv-file-input" className="text-xs font-semibold text-slate-800">
                    3. Upload CSV File (.csv)
                  </Label>
                  <div className="mt-1.5 border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/50 transition-colors bg-white">
                    <Input
                      id="csv-file-input"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileSelect}
                      disabled={isImporting}
                      className="hidden"
                    />
                    <label
                      htmlFor="csv-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-medium text-slate-800">
                        {selectedFile ? (
                          <span className="text-primary font-bold">{selectedFile.name}</span>
                        ) : (
                          "Click to browse or drop your CSV file here"
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {selectedFile
                          ? `${(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file`
                          : "Supports .csv up to 10MB • UTF-8 encoding"}
                      </p>
                    </label>
                  </div>
                </div>

                {/* Step 4: Preview Table (if file loaded) */}
                {parsedRows.length > 0 && (
                  <div className="space-y-3 p-4 rounded-xl border bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-sm font-semibold text-slate-900">
                          Data Preview ({parsedRows.length - 1} records detected)
                        </h4>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleResetImport} className="text-xs h-7 text-red-600 hover:text-red-700">
                        Remove File
                      </Button>
                    </div>

                    <div className="overflow-x-auto border rounded-lg bg-white max-h-56">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b">
                          <tr>
                            <th className="px-3 py-2 font-semibold">#</th>
                            {parsedRows[0]?.map((header, idx) => (
                              <th key={idx} className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {parsedRows.slice(1, 6).map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 text-slate-400 text-[11px]">{rIdx + 1}</td>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-3 py-1.5 text-slate-700 truncate max-w-[160px]">
                                  {cell || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {parsedRows.length > 6 && (
                      <p className="text-[11px] text-slate-500 italic">
                        Showing first 5 rows of {parsedRows.length - 1} records.
                      </p>
                    )}
                  </div>
                )}

                {/* Step 5: Import Progress Bar */}
                {isImporting && (
                  <div className="space-y-2 p-4 rounded-xl border bg-blue-50/40">
                    <div className="flex justify-between text-xs font-medium text-blue-900">
                      <span>Importing records into PostgreSQL database...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2 bg-blue-100" />
                  </div>
                )}

                {/* Step 6: Import Result Callout */}
                {importResult && (
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      importResult.success
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                        : "bg-red-50/70 border-red-300 text-red-900"
                    }`}
                  >
                    {importResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <div className="space-y-1 text-xs">
                      <h4 className="font-bold text-sm">
                        {importResult.success ? "Import Succeeded" : "Import Failed"}
                      </h4>
                      <p>{importResult.message}</p>
                      {importResult.errors && importResult.errors.length > 0 && (
                        <div className="mt-2 p-2 bg-white/80 rounded border max-h-32 overflow-y-auto space-y-1 font-mono text-[11px] text-red-700">
                          {importResult.errors.map((err, i) => (
                            <div key={i}>• {err}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Import Button */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  {selectedFile && (
                    <Button variant="outline" size="sm" onClick={handleResetImport} disabled={isImporting}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={handleExecuteImport}
                    disabled={!selectedFile || isImporting}
                    className="gap-2 px-6"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing Import...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Execute {importEntity.toUpperCase()} Import
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: OPERATIONS HISTORY */}
          <TabsContent value="history" className="space-y-6 m-0">
            <Card className="border shadow-2xs bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Persistent Operations Audit Trail
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Real-time log of previous import and export events for your salon account.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadHistory} disabled={isLoadingHistory} className="gap-1.5 text-xs">
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardHeader>

              <CardContent>
                {isLoadingHistory ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading operations audit trail...
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-12 text-center border rounded-xl bg-slate-50">
                    <Database className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-slate-800">No operations recorded yet</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Whenever you export data or import new records, an audit entry will be safely logged here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((op) => {
                      const isExport = op.type === "export"
                      const isCompleted = op.status === "completed"

                      return (
                        <div
                          key={op.id}
                          className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                isExport ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                              }`}
                            >
                              {isExport ? <Download className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold capitalize text-slate-900">
                                  {op.type}: {op.data_type}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={
                                    isCompleted
                                      ? "border-emerald-400 text-emerald-700 bg-emerald-50 text-[10px]"
                                      : "border-red-400 text-red-700 bg-red-50 text-[10px]"
                                  }
                                >
                                  {op.status}
                                </Badge>
                              </div>

                              <p className="text-xs text-slate-500">
                                {op.file_name ? `File: ${op.file_name}` : "Direct database stream"} •{" "}
                                <span className="font-semibold text-slate-700">
                                  {op.records_processed} records processed
                                </span>
                              </p>

                              {op.error_message && (
                                <p className="text-xs text-red-600 font-mono mt-1">
                                  Error: {op.error_message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-xs text-slate-400 sm:text-right shrink-0">
                            <div>{new Date(op.created_at).toLocaleDateString()}</div>
                            <div className="text-[11px]">
                              {new Date(op.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: TEMPLATES & GUIDELINES */}
          <TabsContent value="templates" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quick Downloads */}
              <Card className="border shadow-2xs bg-white">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    Downloadable CSV Templates
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pre-configured templates with sample salon data and correct headers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { id: "customers", label: "Customers & Clients Template", desc: "Includes phone_number, full_name, email, gender, dob, notes" },
                    { id: "services", label: "Services & Treatments Template", desc: "Includes name, price, duration_minutes, category, code" },
                    { id: "products", label: "Retail Products & Inventory Template", desc: "Includes name, price, cost, stock_quantity, category, sku, barcode" },
                    { id: "staff", label: "Staff Stylists Template", desc: "Includes name, phone, email, role, commission_rate" },
                  ].map((tpl) => (
                    <div key={tpl.id} className="p-3 rounded-lg border flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{tpl.label}</div>
                        <div className="text-xs text-slate-500">{tpl.desc}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadTemplate(tpl.id as CSVEntityType)}
                        className="gap-1.5 text-xs shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Migration Guide */}
              <Card className="border shadow-2xs bg-white">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Import & Migration Rules
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Best practices for seamless data migration into Hanva POS.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-slate-600">
                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      Customer Phone Numbers
                    </div>
                    <p>
                      Phone number is the unique primary identifier for customers in Hanva. Ensure each row has a valid 10-digit Indian mobile number (e.g. <code>9321501389</code> or <code>+919321501389</code>).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      Products & Inventory
                    </div>
                    <p>
                      Products must contain a product name and price. If you provide a SKU or Barcode, Hanva will automatically map it to thermal barcode scanners during POS checkout.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      Duplicate Protection
                    </div>
                    <p>
                      You can select "Skip existing records" to avoid overwriting current salon entries, or choose "Update existing records" to perform a bulk price or contact refresh.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      File Format & Encodings
                    </div>
                    <p>
                      Ensure files are saved in standard comma-separated format (.csv) with UTF-8 encoding. Maximum file upload limit is 10MB per batch.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
