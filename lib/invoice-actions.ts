"use client"

import { useReactToPrint } from "react-to-print"
import type { RefObject } from "react"
import { generateAndDownloadInvoicePDF } from "./invoice-pdf"

export async function downloadInvoicePDF(invoiceData: any) {
  try {
    console.log("[v0] Generating PDF invoice with jsPDF vector engine:", invoiceData)

    const items = (invoiceData.items || []).map((item: any, idx: number) => ({
      id: item.id || idx + 1,
      description: item.description || item.name || "Service",
      quantity: Number(item.quantity) || 1,
      rate: Number(item.rate) || Number(item.price) || 0,
      amount: Number(item.amount) || ((Number(item.rate) || Number(item.price) || 0) * (Number(item.quantity) || 1)),
      staffName: item.staffName,
    }))

    const subtotal = invoiceData.subtotal !== undefined
      ? Number(invoiceData.subtotal)
      : items.reduce((sum: number, it: any) => sum + it.amount, 0)

    const totalAmount = invoiceData.totalAmount !== undefined
      ? Number(invoiceData.totalAmount)
      : (invoiceData.amount !== undefined ? Number(invoiceData.amount) : subtotal)

    await generateAndDownloadInvoicePDF({
      invoiceNumber: invoiceData.invoiceNumber || invoiceData.bookingNumber || `INV-${Date.now()}`,
      bookingNumber: invoiceData.bookingNumber,
      date: invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (invoiceData.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })),
      time: invoiceData.time,
      customerName: invoiceData.customerName || "Customer",
      customerPhone: invoiceData.customerPhone,
      customerEmail: invoiceData.customerEmail,
      customerAddress: invoiceData.customerAddress,
      customerGSTIN: invoiceData.customerGSTIN,
      items: items.length > 0 ? items : [{
        description: invoiceData.serviceName || "Service",
        quantity: 1,
        rate: totalAmount,
        amount: totalAmount,
        staffName: invoiceData.staffName,
      }],
      subtotal: subtotal,
      discount: Number(invoiceData.discount) || 0,
      couponCode: invoiceData.couponCode,
      couponDiscount: Number(invoiceData.couponDiscount) || 0,
      loyaltyDiscount: Number(invoiceData.loyaltyDiscount) || 0,
      giftCardDiscount: Number(invoiceData.giftCardDiscount) || 0,
      gstRate: invoiceData.gstRate !== undefined ? Number(invoiceData.gstRate) : 18,
      gstAmount: invoiceData.gstAmount !== undefined ? Number(invoiceData.gstAmount) : undefined,
      totalAmount: totalAmount,
      paymentMethod: invoiceData.paymentMethod || "Cash",
      staffName: invoiceData.staffName,
      notes: invoiceData.notes,
      businessName: invoiceData.businessName || "Hanva Salon",
      businessAddress: invoiceData.businessAddress || "",
      businessPhone: invoiceData.businessPhone || "",
      businessEmail: invoiceData.businessEmail || "",
      businessGSTIN: invoiceData.businessGSTIN || "",
      businessPAN: invoiceData.businessPAN || "",
    })

    console.log("[v0] PDF generated successfully via jsPDF")
    return { success: true }
  } catch (error) {
    console.error("[v0] Error downloading PDF via vector engine, attempting fallback:", error)
    
    // Fallback to legacy API if jsPDF failed for any unexpected reason
    try {
      const response = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceData }),
      })
      if (!response.ok) throw new Error("Fallback generation failed")
      const { htmlContent, invoiceData: completeData } = await response.json()
      // @ts-ignore
      const html2pdfModule = await import("html2pdf.js")
      const html2pdf = html2pdfModule.default || html2pdfModule
      await html2pdf().from(htmlContent).save(`invoice-${completeData.invoiceNumber || "invoice"}.pdf`)
    } catch (fallbackError) {
      console.error("[v0] Fallback also failed:", fallbackError)
      throw error
    }
  }
}

// Print invoice
export function useInvoicePrint(ref: RefObject<HTMLDivElement | null>) {
  return useReactToPrint({
    content: () => ref.current,
    documentTitle: "Invoice",
  })
}

// Generate shareable link
export function getInvoiceShareUrl(token: string) {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/inv/${token}`
}
