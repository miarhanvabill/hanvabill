"use client"

import { useReactToPrint } from "react-to-print"
import type { RefObject } from "react"

export async function downloadInvoicePDF(invoiceData: any) {
  try {
    console.log("[v0] Starting PDF download with data:", invoiceData)

    const response = await fetch("/api/invoices/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invoiceData }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] API response error:", errorData)
      throw new Error(`Failed to generate invoice data: ${errorData.message}`)
    }

    const { htmlContent, invoiceData: completeData } = await response.json()
    console.log("[v0] Received HTML content length:", htmlContent.length)

    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = htmlContent
    tempDiv.style.position = "absolute"
    tempDiv.style.left = "-9999px"
    tempDiv.style.top = "0"
    tempDiv.style.width = "800px"
    tempDiv.style.backgroundColor = "white"
    tempDiv.style.fontFamily = "Arial, sans-serif"
    tempDiv.style.fontSize = "12px"
    tempDiv.style.lineHeight = "1.4"
    tempDiv.style.color = "#000"
    document.body.appendChild(tempDiv)

    await new Promise((resolve) => setTimeout(resolve, 500))

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `invoice-${completeData.invoiceNumber || invoiceData.invoiceNumber || "unknown"}.pdf`,
      image: {
        type: "jpeg",
        quality: 0.98,
      },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        width: 800,
        height: 1200,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          const clonedDiv = clonedDoc.body.querySelector("div")
          if (clonedDiv) {
            clonedDiv.style.fontFamily = "Arial, sans-serif"
            clonedDiv.style.fontSize = "12px"
            clonedDiv.style.lineHeight = "1.4"
            clonedDiv.style.color = "#000"
          }
        },
      },
      jsPDF: {
        unit: "in",
        format: "a4",
        orientation: "portrait",
        compress: true,
      },
    }

    console.log("[v0] Starting PDF generation with improved settings...")
    // Dynamically import html2pdf to prevent SSR ReferenceError
    const html2pdf = (await import("html2pdf.js")).default
    await html2pdf().from(tempDiv).set(opt).save()
    console.log("[v0] PDF generated successfully")

    document.body.removeChild(tempDiv)
  } catch (error) {
    console.error("[v0] Error downloading PDF:", error)
    throw error
  }
}

// Print invoice
export function useInvoicePrint(ref: RefObject<HTMLDivElement>) {
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
