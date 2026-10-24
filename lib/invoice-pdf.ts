// lib/invoice-pdf.ts
"use client"

export interface InvoicePDFItem {
  id?: number | string
  description: string
  quantity: number
  rate: number
  amount: number
  staffName?: string
}

export interface InvoicePDFData {
  invoiceNumber: string
  bookingNumber?: string
  date?: string
  time?: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
  customerGSTIN?: string
  items: InvoicePDFItem[]
  subtotal: number
  discount?: number
  couponCode?: string
  couponDiscount?: number
  loyaltyDiscount?: number
  giftCardDiscount?: number
  gstRate?: number
  gstAmount?: number
  taxInclusive?: boolean
  totalAmount: number
  paymentMethod?: string
  staffName?: string
  notes?: string
  businessName?: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string
  businessGSTIN?: string
  businessPAN?: string
}

export async function generateAndDownloadInvoicePDF(data: InvoicePDFData): Promise<{ success: boolean; filename: string }> {
  try {
    // Dynamically import jsPDF and autoTable to avoid SSR issues
    const { jsPDF } = await import("jspdf")
    await import("jspdf-autotable")

    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Top primary accent bar
    doc.setFillColor(15, 23, 42) // Slate 900
    doc.rect(0, 0, pageWidth, 5, "F")

    // Business Information (Left)
    const businessName = data.businessName || "Hanva Salon"
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(15, 23, 42)
    doc.text(businessName, 14, 20)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139) // Slate 500
    let currentY = 26

    if (data.businessAddress) {
      // Split address by lines or wrap if long
      const addressLines = doc.splitTextToSize(data.businessAddress, 95)
      doc.text(addressLines, 14, currentY)
      currentY += addressLines.length * 4.5
    }

    const contactParts = [
      data.businessPhone ? `Phone: ${data.businessPhone}` : "",
      data.businessEmail ? `Email: ${data.businessEmail}` : "",
    ].filter(Boolean)

    if (contactParts.length > 0) {
      doc.text(contactParts.join(" | "), 14, currentY)
      currentY += 4.5
    }

    if (data.businessGSTIN) {
      doc.text(`GSTIN: ${data.businessGSTIN}`, 14, currentY)
      currentY += 4.5
    }

    // Invoice Header (Right)
    const invNumber = data.invoiceNumber || data.bookingNumber || "INV-0001"
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(15, 23, 42)
    doc.text("TAX INVOICE", pageWidth - 14, 20, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)

    doc.text(`Invoice No: ${invNumber}`, pageWidth - 14, 26, { align: "right" })

    if (data.date) {
      doc.text(`Date: ${data.date}`, pageWidth - 14, 31, { align: "right" })
    }

    if (data.time) {
      doc.text(`Time: ${data.time}`, pageWidth - 14, 36, { align: "right" })
    }

    if (data.paymentMethod) {
      doc.text(`Payment: ${data.paymentMethod.toUpperCase()}`, pageWidth - 14, 41, { align: "right" })
    }

    // Horizontal Separator
    const dividerY = Math.max(currentY + 2, 45)
    doc.setDrawColor(226, 232, 240)
    doc.line(14, dividerY, pageWidth - 14, dividerY)

    // Bill To Box
    const billBoxY = dividerY + 4
    doc.setFillColor(248, 250, 252) // Slate 50
    doc.roundedRect(14, billBoxY, pageWidth - 28, 22, 2, 2, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text("BILLED TO:", 18, billBoxY + 6)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text(data.customerName || "Walk-in Customer", 18, billBoxY + 12)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)

    const customerContacts = [
      data.customerPhone ? `Phone: ${data.customerPhone}` : "",
      data.customerEmail ? `Email: ${data.customerEmail}` : "",
    ].filter(Boolean)

    if (customerContacts.length > 0) {
      doc.text(customerContacts.join("  |  "), 18, billBoxY + 18)
    }

    // Prepare Items Table
    const tableItems = (data.items && data.items.length > 0) ? data.items : [
      {
        description: "Salon Service",
        quantity: 1,
        rate: data.subtotal || data.totalAmount || 0,
        amount: data.subtotal || data.totalAmount || 0,
        staffName: data.staffName || "",
      }
    ]

    const tableBody = tableItems.map((item, idx) => [
      String(idx + 1),
      item.description || "Service",
      item.staffName || "-",
      String(item.quantity || 1),
      Number(item.rate || 0).toFixed(2),
      Number(item.amount || 0).toFixed(2),
    ])

    // Render Table using autoTable
    // @ts-ignore
    doc.autoTable({
      startY: billBoxY + 26,
      head: [["#", "Item / Service Description", "Staff", "Qty", "Rate (Rs.)", "Amount (Rs.)"]],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 32 },
        3: { halign: "center", cellWidth: 14 },
        4: { halign: "right", cellWidth: 26 },
        5: { halign: "right", cellWidth: 28 },
      },
      margin: { left: 14, right: 14 },
    })

    // @ts-ignore
    const finalTableY = doc.lastAutoTable.finalY || 100

    // Calculations
    const subtotal = data.subtotal || 0
    const totalDiscount = (data.discount || 0) + (data.couponDiscount || 0) + (data.loyaltyDiscount || 0) + (data.giftCardDiscount || 0)
    const netSubtotal = Math.max(0, subtotal - totalDiscount)
    const gstRate = data.gstRate !== undefined ? data.gstRate : 18
    const gstAmount = data.gstAmount !== undefined 
      ? data.gstAmount 
      : (data.taxInclusive 
          ? (gstRate > 0 ? Math.round((netSubtotal - (netSubtotal / (1 + (gstRate / 100)))) * 100) / 100 : 0)
          : Math.round(netSubtotal * (gstRate / 100) * 100) / 100)
    const grandTotal = data.totalAmount !== undefined 
      ? data.totalAmount 
      : (data.taxInclusive ? netSubtotal : (netSubtotal + gstAmount))

    // Summary Section (Right Aligned)
    const summaryX = pageWidth - 85
    let summaryY = finalTableY + 8

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)

    doc.text("Subtotal:", summaryX, summaryY)
    doc.text(`Rs. ${subtotal.toFixed(2)}`, pageWidth - 14, summaryY, { align: "right" })
    summaryY += 6

    if (totalDiscount > 0) {
      doc.text("Discount:", summaryX, summaryY)
      doc.setTextColor(16, 185, 129) // emerald-500
      doc.text(`-Rs. ${totalDiscount.toFixed(2)}`, pageWidth - 14, summaryY, { align: "right" })
      doc.setTextColor(71, 85, 105)
      summaryY += 6
    }

    if (gstAmount > 0) {
      doc.text(`GST (${gstRate}%${data.taxInclusive ? " incl." : ""}):`, summaryX, summaryY)
      doc.text(`Rs. ${gstAmount.toFixed(2)}`, pageWidth - 14, summaryY, { align: "right" })
      summaryY += 6
    }

    // Highlighted Total Box
    doc.setFillColor(15, 23, 42)
    doc.roundedRect(summaryX - 4, summaryY, 85 - 10 + 4, 10, 1.5, 1.5, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text("Total Amount:", summaryX, summaryY + 6.5)
    doc.text(`Rs. ${grandTotal.toFixed(2)}`, pageWidth - 14, summaryY + 6.5, { align: "right" })

    // Footer
    const footerY = pageHeight - 15
    doc.setDrawColor(226, 232, 240)
    doc.line(14, footerY - 5, pageWidth - 14, footerY - 5)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text("This is a computer-generated invoice and requires no physical signature.", pageWidth / 2, footerY, { align: "center" })
    doc.text("Thank you for choosing Hanva Billing!", pageWidth / 2, footerY + 4, { align: "center" })

    // Save PDF
    const filename = `invoice-${invNumber}.pdf`
    doc.save(filename)

    return { success: true, filename }
  } catch (error) {
    console.error("Failed to generate and download PDF invoice:", error)
    throw error
  }
}
