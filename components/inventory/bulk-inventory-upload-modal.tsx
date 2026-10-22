"use client"

import React, { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  Sparkles,
  Info,
} from "lucide-react"
import { bulkUploadInventory, type BulkUploadItemInput, type BulkUploadResult } from "@/app/actions/inventory"

interface BulkInventoryUploadModalProps {
  isOpen: boolean
  onClose: () => void
  existingInventory?: Array<{ sku?: string; barcode?: string; name: string; quantity: number }>
  onSuccess: () => void
}

const SAMPLE_CSV_CONTENT = `sku,name,category,brand,quantity,unit,volume_per_unit,volume_unit,usage_type,cost_price,selling_price,reorder_level,supplier,expiry_date,location
LOR-SHA-1500,L'Oreal Serie Expert Shampoo 1500ml,Hair Care,L'Oreal,24,bottles,1500,ml,professional,1200,1800,5,L'Oreal Professional,2026-12-31,Backwash Area
MAJ-5.1,Majirel Hair Color Cream 5.1 (Ash Light Brown),Chemicals & Colors,L'Oreal,36,tubes,50,gm,professional,320,550,8,L'Oreal Professional,2026-08-31,Color Bar
OXY-20V,Oxydant Creme 20 Volume 1000ml,Chemicals & Colors,L'Oreal,15,bottles,1000,ml,professional,450,650,4,L'Oreal Professional,2027-01-31,Color Bar
MOR-TRT-100,Moroccanoil Treatment Original 100ml,Hair Care,Moroccanoil,12,pcs,100,ml,retail,2100,3150,3,Global Beauty Brands,2026-10-31,Retail Display
O3-FAC-KIT,O3+ Diamond Luxury Facial Kit,Skin Care,O3+,8,boxes,1,pcs,professional,1800,3500,2,Derma Direct,2026-06-30,Facial Room 1
STX-SRM-100,Streax Professional Argan Secrets Serum 100ml,Hair Care,Streax,20,bottles,100,ml,both,280,450,5,Streax India,2026-11-30,Styling Station`

export function BulkInventoryUploadModal({
  isOpen,
  onClose,
  existingInventory = [],
  onSuccess,
}: BulkInventoryUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadMode, setUploadMode] = useState<"add_to_existing" | "replace_quantity">("add_to_existing")
  const [parsedRows, setParsedRows] = useState<BulkUploadItemInput[]>([])
  const [parsingError, setParsingError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Download official salon inventory template CSV
  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "hanva_salon_inventory_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({
      title: "Sample Template Downloaded",
      description: "Open in Excel or Google Sheets, add your products, and upload.",
    })
  }

  // Parse CSV / TSV text into structured salon items
  const parseRawText = (rawText: string) => {
    setParsingError(null)
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) {
      setParsingError("CSV must contain at least a header row and 1 product row.")
      setParsedRows([])
      return
    }

    // Detect delimiter (tab or comma or semicolon)
    const firstLine = lines[0]
    let delimiter = ","
    if (firstLine.includes("\t")) delimiter = "\t"
    else if (firstLine.includes(";") && !firstLine.includes(",")) delimiter = ";"

    const splitLine = (str: string): string[] => {
      // Regex handling quoted CSV values
      if (delimiter === ",") {
        const re = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g
        const result: string[] = []
        let match
        while ((match = re.exec(str)) !== null) {
          if (match.index === re.lastIndex) re.lastIndex++
          const val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2]
          if (val !== undefined) result.push(val.trim())
        }
        return result
      }
      return str.split(delimiter).map((s) => s.trim().replace(/^"|"$/g, ""))
    }

    const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, "_"))

    // Map column aliases
    const findIndex = (aliases: string[]) => {
      for (const a of aliases) {
        const idx = headers.findIndex((h) => h === a || h.includes(a))
        if (idx !== -1) return idx
      }
      return -1
    }

    const skuIdx = findIndex(["sku", "code", "barcode", "item_code", "product_code"])
    const nameIdx = findIndex(["name", "item_name", "product_name", "title"])
    const categoryIdx = findIndex(["category", "cat", "category_name"])
    const brandIdx = findIndex(["brand", "make", "manufacturer"])
    const quantityIdx = findIndex(["quantity", "qty", "stock", "current_stock", "count"])
    const unitIdx = findIndex(["unit", "uom", "unit_of_measure"])
    const volumeIdx = findIndex(["volume_per_unit", "volume", "net_volume", "capacity"])
    const volumeUnitIdx = findIndex(["volume_unit", "vol_unit"])
    const usageTypeIdx = findIndex(["usage_type", "usage", "type"])
    const costIdx = findIndex(["cost_price", "cost", "purchase_price", "buy_price"])
    const priceIdx = findIndex(["selling_price", "unit_price", "price", "mrp", "sale_price"])
    const reorderIdx = findIndex(["reorder_level", "min_stock", "min_stock_level", "alert_level"])
    const supplierIdx = findIndex(["supplier", "vendor", "distributor"])
    const expiryIdx = findIndex(["expiry_date", "expiry", "exp_date"])
    const batchIdx = findIndex(["batch_number", "batch", "lot_number"])
    const locationIdx = findIndex(["location", "shelf", "rack"])
    const descIdx = findIndex(["description", "notes", "desc"])

    if (nameIdx === -1 && skuIdx === -1) {
      setParsingError("Could not find a 'name' or 'sku' column in the header row.")
      setParsedRows([])
      return
    }

    const items: BulkUploadItemInput[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i])
      if (cols.length === 0 || cols.every((c) => !c)) continue

      const name = nameIdx !== -1 ? cols[nameIdx] : ""
      const sku = skuIdx !== -1 ? cols[skuIdx] : ""
      if (!name && !sku) continue

      const rawUsage = usageTypeIdx !== -1 ? cols[usageTypeIdx]?.toLowerCase() : "both"
      let usageType: "professional" | "retail" | "both" = "both"
      if (rawUsage.includes("prof") || rawUsage.includes("salon")) usageType = "professional"
      else if (rawUsage.includes("ret")) usageType = "retail"

      items.push({
        name: name || (sku ? `Product ${sku}` : `Product Row ${i}`),
        sku: sku || undefined,
        category: categoryIdx !== -1 ? cols[categoryIdx] : "General",
        brand: brandIdx !== -1 ? cols[brandIdx] : undefined,
        quantity: quantityIdx !== -1 ? Math.max(0, Number(cols[quantityIdx]) || 0) : 0,
        unit: unitIdx !== -1 && cols[unitIdx] ? cols[unitIdx] : "pcs",
        volume_per_unit: volumeIdx !== -1 ? Number(cols[volumeIdx]) || 1 : 1,
        volume_unit: volumeUnitIdx !== -1 && cols[volumeUnitIdx] ? cols[volumeUnitIdx] : "ml",
        usage_type: usageType,
        cost_price: costIdx !== -1 ? Math.max(0, Number(cols[costIdx]) || 0) : 0,
        selling_price: priceIdx !== -1 ? Math.max(0, Number(cols[priceIdx]) || 0) : 0,
        reorder_level: reorderIdx !== -1 ? Math.max(0, Number(cols[reorderIdx]) || 5) : 5,
        supplier: supplierIdx !== -1 ? cols[supplierIdx] : undefined,
        expiry_date: expiryIdx !== -1 ? cols[expiryIdx] : undefined,
        batch_number: batchIdx !== -1 ? cols[batchIdx] : undefined,
        location: locationIdx !== -1 ? cols[locationIdx] : undefined,
        description: descIdx !== -1 ? cols[descIdx] : undefined,
      })
    }

    if (items.length === 0) {
      setParsingError("No valid product data found in the provided content.")
      setParsedRows([])
      return
    }

    setParsedRows(items)
  }

  const handleFileChange = (file: File) => {
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) parseRawText(text)
    }
    reader.readAsText(file)
  }

  const handlePasteChange = (text: string) => {
    setPastedText(text)
    if (text.trim()) parseRawText(text)
    else setParsedRows([])
  }

  // Check if an item matches an existing SKU
  const checkSkuMatch = (itemSku?: string) => {
    if (!itemSku) return null
    return existingInventory.find(
      (e) => (e.sku && e.sku.toUpperCase() === itemSku.toUpperCase()) || (e.barcode && e.barcode === itemSku)
    )
  }

  const handleUploadSubmit = async () => {
    if (parsedRows.length === 0) {
      toast({ title: "Nothing to Upload", description: "Please upload or paste inventory data first.", variant: "destructive" })
      return
    }

    setIsUploading(true)
    setUploadProgress(20)

    try {
      setUploadProgress(50)
      const res = await bulkUploadInventory(parsedRows, { mode: uploadMode })
      setUploadProgress(100)
      setUploadResult(res)

      if (res.success) {
        toast({
          title: "Bulk Inventory Upload Successful",
          description: `${res.summary.created} new items created, ${res.summary.updated} items auto-updated by SKU.`,
        })
        onSuccess()
      } else {
        toast({
          title: "Upload Failed",
          description: res.message || "Failed to process bulk upload.",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      toast({
        title: "Upload Error",
        description: err.message || "An unexpected error occurred during bulk inventory upload.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const resetModal = () => {
    setSelectedFile(null)
    setPastedText("")
    setParsedRows([])
    setParsingError(null)
    setUploadResult(null)
    setUploadProgress(0)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Bulk Inventory Upload &amp; SKU Auto-Sync
          </DialogTitle>
          <DialogDescription>
            Import your full salon product catalog. If an uploaded product SKU already exists, its stock quantity will
            automatically update and details will refresh seamlessly.
          </DialogDescription>
        </DialogHeader>

        {uploadResult ? (
          /* Completion Summary View */
          <div className="space-y-6 py-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 text-base">
                  Inventory Import Completed!
                </h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">{uploadResult.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Rows</p>
                <p className="text-2xl font-bold mt-1">{uploadResult.summary.total}</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-center border border-emerald-200">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-semibold">New Items</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{uploadResult.summary.created}</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-center border border-blue-200">
                <p className="text-xs text-blue-700 dark:text-blue-400 uppercase font-semibold">SKU Auto-Updated</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{uploadResult.summary.updated}</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-center border border-red-200">
                <p className="text-xs text-red-700 dark:text-red-400 uppercase font-semibold">Errors</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{uploadResult.summary.failed}</p>
              </div>
            </div>

            {uploadResult.summary.details.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground font-semibold">Audit Log Details</Label>
                <div className="max-h-56 overflow-y-auto border rounded-lg p-2 bg-slate-50 dark:bg-slate-900 text-xs space-y-1">
                  {uploadResult.summary.details.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800"
                    >
                      <span className="font-mono text-muted-foreground">Row #{item.row}</span>
                      <span className="font-medium truncate max-w-xs">{item.name}</span>
                      <Badge
                        variant={
                          item.action === "created" ? "default" : item.action === "updated" ? "secondary" : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {item.action === "created" ? "Created" : item.action === "updated" ? "Auto-Updated" : "Failed"}
                      </Badge>
                      <span className="text-muted-foreground text-[11px] truncate max-w-sm">{item.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={resetModal} className="w-full sm:w-auto">
                Done &amp; View Inventory
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Upload & Configuration Form */
          <div className="space-y-5 py-2">
            {/* Top Info Bar with Template Download */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Tip:</strong> Need the formatted template? Download the official Salon Inventory sample CSV.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="gap-1.5 h-8 text-xs bg-white dark:bg-slate-900 border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample CSV
              </Button>
            </div>

            {/* SKU Match Mode Options */}
            <div className="p-3.5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                When SKU Matches Existing Product
              </Label>
              <RadioGroup
                value={uploadMode}
                onValueChange={(val: any) => setUploadMode(val)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1"
              >
                <div className="flex items-start space-x-2 p-2.5 rounded-lg border bg-white dark:bg-slate-900 hover:border-primary/50 cursor-pointer">
                  <RadioGroupItem value="add_to_existing" id="mode_add" className="mt-0.5" />
                  <Label htmlFor="mode_add" className="text-xs cursor-pointer space-y-0.5">
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Add to Current Stock (Recommended)
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      e.g., if you have 10 and upload 5, new stock becomes 15. Refreshes product name &amp; details.
                    </span>
                  </Label>
                </div>
                <div className="flex items-start space-x-2 p-2.5 rounded-lg border bg-white dark:bg-slate-900 hover:border-primary/50 cursor-pointer">
                  <RadioGroupItem value="replace_quantity" id="mode_replace" className="mt-0.5" />
                  <Label htmlFor="mode_replace" className="text-xs cursor-pointer space-y-0.5">
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">
                      Replace Current Stock
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Sets stock directly to the uploaded quantity (e.g. after a physical audit).
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Input Method: File Upload or Paste */}
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="file" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload CSV / Excel File
                </TabsTrigger>
                <TabsTrigger value="paste" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Copy &amp; Paste Data
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: File Drop Area */}
              <TabsContent value="file" className="pt-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragOver(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleFileChange(file)
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-slate-300 dark:border-slate-700 hover:border-primary/60 hover:bg-slate-50/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileChange(file)
                    }}
                  />
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {selectedFile ? selectedFile.name : "Click to select or drag & drop CSV file"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports .CSV, .TSV with headers (SKU, Name, Category, Quantity, Unit, Cost, Price, etc.)
                  </p>
                </div>
              </TabsContent>

              {/* Tab 2: Paste Raw Content */}
              <TabsContent value="paste" className="pt-3 space-y-2">
                <Label className="text-xs">Paste CSV or Tab-Separated Data from Excel</Label>
                <Textarea
                  rows={6}
                  placeholder={`sku,name,category,brand,quantity,unit,cost_price,selling_price\nLOR-SHA-1500,L'Oreal Shampoo 1500ml,Hair Care,L'Oreal,24,bottles,1200,1800`}
                  value={pastedText}
                  onChange={(e) => handlePasteChange(e.target.value)}
                  className="font-mono text-xs"
                />
              </TabsContent>
            </Tabs>

            {/* Error Banner */}
            {parsingError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{parsingError}</span>
              </div>
            )}

            {/* Live Parsing Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider">
                      Preview ({parsedRows.length} {parsedRows.length === 1 ? "Product" : "Products"} Detected)
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">Showing first 5 rows</span>
                </div>

                <div className="border rounded-lg overflow-x-auto max-h-56">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Stock Qty</TableHead>
                        <TableHead>Cost (₹)</TableHead>
                        <TableHead>Selling (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 5).map((row, idx) => {
                        const matched = checkSkuMatch(row.sku)
                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              {matched ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]">
                                  SKU Match (Auto-Update)
                                </Badge>
                              ) : (
                                <Badge variant="default" className="bg-emerald-600 text-[10px]">
                                  New Product
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono">{row.sku || "-"}</TableCell>
                            <TableCell className="font-medium">{row.name}</TableCell>
                            <TableCell>{row.category}</TableCell>
                            <TableCell className="font-bold">
                              {row.quantity} {row.unit}
                            </TableCell>
                            <TableCell>₹{row.cost_price || 0}</TableCell>
                            <TableCell>₹{row.selling_price || 0}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2 py-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Importing inventory catalog...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={resetModal} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUploadSubmit}
                disabled={parsedRows.length === 0 || isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Confirm &amp; Import ({parsedRows.length})
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
