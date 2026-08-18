// utils/pdfGenerator.ts
"use client"

export async function downloadInvoicePDF(invoiceData: any) {
  try {
    const response = await fetch("/api/invoices/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invoiceData }),
    })

    if (!response.ok) {
      throw new Error("Failed to generate PDF")
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `invoice-${invoiceData.invoiceNumber || invoiceData.id}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error("Error downloading PDF:", error)
    throw error
  }
}
