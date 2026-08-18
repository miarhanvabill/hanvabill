import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getAuthenticatedSql } from "@/lib/db"
import { getBusinessSettings } from "@/app/actions/settings"

export async function POST(request: NextRequest) {
  try {
    // Get authentication details
    const { userId, orgId, orgSlug } = await auth()

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    if (!orgId) {
      return NextResponse.json({ success: false, message: "Organization required" }, { status: 401 })
    }

    const tenantKey = orgSlug ?? orgId
    const { sql, tenantId } = await getAuthenticatedSql(tenantKey)

    const { invoiceData } = await request.json()

    // Validate input data
    if (!invoiceData || !invoiceData.items || !Array.isArray(invoiceData.items)) {
      return NextResponse.json({ success: false, message: "Invalid invoice data" }, { status: 400 })
    }

    let businessSettings
    try {
      businessSettings = await getBusinessSettings()
    } catch (error) {
      console.error("Error fetching business settings:", error)
      // Fallback to default values if business settings can't be fetched
      businessSettings = {
        profile: {
          salonName: "Your Business",
          address: "Business Address",
          phone: "Phone Number",
          email: "email@business.com",
        },
        business: {
          taxRate: 18,
          currency: "INR",
        },
      }
    }

    const completeInvoiceData = {
      ...invoiceData,
      businessName: businessSettings.profile.salonName,
      businessAddress: businessSettings.profile.address,
      businessPhone: businessSettings.profile.phone,
      businessEmail: businessSettings.profile.email,
      businessGSTIN: businessSettings.business?.gstin || "29ABCDE1234F1Z5",
      businessPAN: businessSettings.business?.pan || "ABCDE1234F",
      gstRate: businessSettings.business?.taxRate || 18,
      currency: businessSettings.business?.currency || "INR",
    }

    // Generate HTML content with proper error handling
    let htmlContent
    try {
      htmlContent = generateInvoiceHTML(completeInvoiceData)
    } catch (error) {
      console.error("Error generating HTML:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Failed to generate invoice HTML",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      htmlContent,
      invoiceData: completeInvoiceData,
    })
  } catch (error) {
    console.error("Error generating invoice data:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate invoice data",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function generateInvoiceHTML(data: any): string {
  // Calculate amounts safely
  const subtotal = data.subtotal || 0
  const discount = data.discount || 0
  const gstRate = data.gstRate || 18

  const taxableAmount = subtotal - discount
  const gstAmount = taxableAmount * (gstRate / 100)
  const totalAmount = taxableAmount + gstAmount

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${data.invoiceNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        
        body { 
          font-family: 'Inter', Arial, sans-serif; 
          font-size: 12px;
          line-height: 1.5;
          color: #000;
          background: white;
          padding: 20px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .invoice-container { 
          width: 100%; 
          max-width: 800px; 
          margin: 0 auto;
          background: white;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
        }
        
        .header-table td {
          padding: 12px;
          vertical-align: top;
        }
        
        .business-name { 
          font-size: 22px; 
          font-weight: 700; 
          margin-bottom: 8px;
          color: #1a1a1a;
        }
        
        .invoice-title {
          font-size: 20px;
          font-weight: 700;
          text-align: right;
          color: #1a1a1a;
        }
        
        .items-table { 
          margin: 20px 0;
          border: 2px solid #000;
        }
        
        .items-table th, .items-table td { 
          border: 1px solid #000; 
          padding: 10px; 
          text-align: left; 
        }
        
        .items-table th { 
          background-color: #f8f9fa; 
          font-weight: 600; 
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .totals-table {
          margin: 20px 0;
          width: 350px;
          margin-left: auto;
        }
        
        .totals-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 13px;
        }
        
        .total-row {
          font-weight: 700;
          border-top: 2px solid #000 !important;
          font-size: 14px;
        }
        
        .footer {
          text-align: center;
          margin-top: 40px;
          font-size: 10px;
          color: #666;
        }
        
        .customer-info {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          margin: 15px 0;
        }
        
        .amount-text {
          font-family: 'Inter', Arial, sans-serif;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <table class="header-table">
          <tr>
            <td style="width: 60%;">
              <div class="business-name">${escapeHtml(data.businessName)}</div>
              <div style="font-size: 11px; line-height: 1.4; color: #555;">
                ${escapeHtml(data.businessAddress)}<br>
                Phone: ${escapeHtml(data.businessPhone)}<br>
                Email: ${escapeHtml(data.businessEmail)}
                ${data.businessGSTIN ? `<br>GSTIN: ${escapeHtml(data.businessGSTIN)}` : ""}
                ${data.businessPAN ? `<br>PAN: ${escapeHtml(data.businessPAN)}` : ""}
              </div>
            </td>
            <td style="width: 40%; text-align: right;">
              <div class="invoice-title">TAX INVOICE</div>
              <div style="margin-top: 10px; font-size: 11px; line-height: 1.6;">
                <strong>Invoice No:</strong> ${escapeHtml(data.invoiceNumber)}<br>
                <strong>Date:</strong> ${formatDate(data.invoiceDate)}<br>
                <strong>Due Date:</strong> ${formatDate(data.dueDate)}<br>
                <strong>Place of Supply:</strong> ${data.placeOfSupply || "Karnataka"}
              </div>
            </td>
          </tr>
        </table>

        <!-- Customer Info -->
        <div class="customer-info">
          <strong style="font-size: 13px;">Bill To:</strong><br>
          <div style="margin-top: 5px; font-size: 12px; line-height: 1.4;">
            <strong>${escapeHtml(data.customerName)}</strong><br>
            ${data.customerAddress ? escapeHtml(data.customerAddress) + "<br>" : ""}
            ${data.customerPhone ? escapeHtml(data.customerPhone) + "<br>" : ""}
            ${data.customerEmail ? escapeHtml(data.customerEmail) : ""}
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 45%;">Description</th>
              <th style="width: 15%;" class="text-right">Qty</th>
              <th style="width: 15%;" class="text-right">Rate</th>
              <th style="width: 20%;" class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.items
              .map(
                (item: any, index: number) => `
              <tr>
                <td class="text-center" style="font-weight: 500;">${index + 1}</td>
                <td style="font-weight: 500;">${escapeHtml(item.description || "")}</td>
                <td class="text-right amount-text">${formatNumber(item.quantity || 0)}</td>
                <td class="text-right amount-text">₹${formatNumber(item.rate || 0)}</td>
                <td class="text-right amount-text">₹${formatNumber(item.amount || 0)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <!-- Totals -->
        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td class="text-right amount-text">₹${formatNumber(subtotal)}</td>
          </tr>
          ${
            discount > 0
              ? `
          <tr>
            <td>Discount:</td>
            <td class="text-right amount-text">-₹${formatNumber(discount)}</td>
          </tr>
          `
              : ""
          }
          <tr>
            <td>GST (${gstRate}%):</td>
            <td class="text-right amount-text">₹${formatNumber(gstAmount)}</td>
          </tr>
          <tr class="total-row">
            <td><strong>Total Amount:</strong></td>
            <td class="text-right amount-text"><strong>₹${formatNumber(totalAmount)}</strong></td>
          </tr>
        </table>

        <!-- Footer -->
        <div class="footer">
          <p><strong>SAC Code:</strong> 999599</p>
          <p style="margin-top: 5px;">This is a system generated invoice. No signature required.</p>
          <p style="margin-top: 10px; font-weight: 500;">Thank you for your business!</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  if (!text) return ""
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// Helper function to format dates
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return new Date().toLocaleDateString("en-IN")
  }
}

// Helper function to format numbers with 2 decimal places
function formatNumber(num: number): string {
  return Number.parseFloat(num.toString()).toFixed(2)
}

// Add this to handle OPTIONS requests for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}

// Test endpoint for debugging
export async function GET() {
  // Test with minimal HTML without symbols
  const testHTML = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body>
      <h1>Test Invoice</h1>
      <p>Amount: 10.00 INR</p>
      <p>Simple HTML test without special characters</p>
    </body>
    </html>
  `

  return NextResponse.json({
    success: true,
    htmlContent: testHTML,
    message: "Test HTML without special characters",
  })
}
