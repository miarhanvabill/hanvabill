"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Download, Printer, Send } from "lucide-react"
import { downloadInvoicePDF, useInvoicePrint, getInvoiceShareUrl } from "@/lib/invoice-actions"
import { useRef, useState } from "react"

interface InvoiceActionsProps {
  invoiceId: string
  shareToken: string
  invoiceData: any // Added invoiceData prop to pass actual invoice data
  children: React.ReactNode
}

export function InvoiceActions({ invoiceId, shareToken, invoiceData, children }: InvoiceActionsProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const handlePrint = useInvoicePrint(invoiceRef)
  const [downloading, setDownloading] = useState(false) // Added loading state for download

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadInvoicePDF(invoiceData)
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert("Failed to download PDF. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Hidden Invoice Template for Print */}
      <div className="hidden">
        <div ref={invoiceRef} id={`print-${invoiceId}`}>
          {children}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <Button onClick={handleDownload} disabled={downloading} className="gap-2">
          <Download className="w-4 h-4" />
          {downloading ? "Generating PDF..." : "Download PDF"}
        </Button>

        <Button onClick={handlePrint} variant="outline" className="gap-2 bg-transparent">
          <Printer className="w-4 h-4" /> Print Invoice
        </Button>

        <Button asChild variant="secondary" className="gap-2">
          <a href={getInvoiceShareUrl(shareToken)} target="_blank" rel="noopener noreferrer">
            <Send className="w-4 h-4" /> Share Invoice
          </a>
        </Button>
      </div>
    </div>
  )
}
