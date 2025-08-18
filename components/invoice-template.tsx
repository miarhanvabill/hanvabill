"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { numberToWords, calculateGST } from "@/lib/currency"

interface InvoiceItem {
  id: number
  description: string
  quantity: number
  rate: number
  amount: number
  gstRate?: number
}

interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  customerName: string
  customerAddress: string
  customerPhone: string
  customerEmail?: string
  customerGSTIN?: string
  items: InvoiceItem[]
  subtotal: number
  discount?: number
  gstRate: number
  isInterState?: boolean
  placeOfSupply: string
  businessName: string
  businessAddress: string
  businessPhone: string
  businessEmail: string
  businessGSTIN: string
  businessPAN: string
  sacCode?: string
}

interface InvoiceTemplateProps {
  data: InvoiceData
  className?: string
}

export function InvoiceTemplate({ data, className = "" }: InvoiceTemplateProps) {
  const gstCalculation = calculateGST(data.subtotal - (data.discount || 0), data.gstRate)
  const finalAmount =
    data.subtotal -
    (data.discount || 0) +
    (data.isInterState ? gstCalculation.igst : gstCalculation.cgst + gstCalculation.sgst)

  return (
    <Card className={`max-w-4xl mx-auto bg-white ${className}`}>
      <CardContent className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{data.businessName}</h1>
          <p className="text-gray-600 mb-1">{data.businessAddress}</p>
          <p className="text-gray-600 mb-1">
            Phone: {data.businessPhone} | Email: {data.businessEmail}
          </p>
          <p className="text-gray-600">
            GSTIN: {data.businessGSTIN} | PAN: {data.businessPAN}
          </p>
        </div>

        <Separator className="mb-6" />

        {/* Invoice Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 bg-gray-100 py-2 px-4 inline-block rounded">TAX INVOICE</h2>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-1">Bill To:</h3>
            <p className="font-semibold text-gray-800">{data.customerName}</p>
            <p className="text-gray-600 whitespace-pre-line">{data.customerAddress}</p>
            <p className="text-gray-600">Phone: {data.customerPhone}</p>
            {data.customerEmail && <p className="text-gray-600">Email: {data.customerEmail}</p>}
            {data.customerGSTIN && <p className="text-gray-600">GSTIN: {data.customerGSTIN}</p>}
            <p className="text-gray-600">Place of Supply: {data.placeOfSupply}</p>
          </div>

          <div className="text-right">
            <div className="bg-gray-50 p-4 rounded">
              <div className="mb-2">
                <span className="font-semibold">Invoice No: </span>
                <span className="text-blue-600 font-mono">{data.invoiceNumber}</span>
              </div>
              <div className="mb-2">
                <span className="font-semibold">Invoice Date: </span>
                <span>{new Date(data.invoiceDate).toLocaleDateString("en-IN")}</span>
              </div>
              {data.dueDate && (
                <div className="mb-2">
                  <span className="font-semibold">Due Date: </span>
                  <span>{new Date(data.dueDate).toLocaleDateString("en-IN")}</span>
                </div>
              )}
              {data.sacCode && (
                <div>
                  <span className="font-semibold">SAC Code: </span>
                  <span>{data.sacCode}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">S.No.</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Description of Services</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Qty</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Rate (₹)</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 text-center">{index + 1}</td>
                  <td className="border border-gray-300 px-4 py-3">{item.description}</td>
                  <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">
                    {item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                    {item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}

              {/* Subtotal Row */}
              <tr className="bg-gray-50">
                <td colSpan={4} className="border border-gray-300 px-4 py-3 text-right font-semibold">
                  Subtotal:
                </td>
                <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                  ₹{data.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Discount Row */}
              {data.discount && data.discount > 0 && (
                <tr>
                  <td colSpan={4} className="border border-gray-300 px-4 py-3 text-right font-semibold">
                    Discount:
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold text-red-600">
                    -₹{data.discount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              {/* Taxable Amount */}
              <tr className="bg-gray-50">
                <td colSpan={4} className="border border-gray-300 px-4 py-3 text-right font-semibold">
                  Taxable Amount:
                </td>
                <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                  ₹
                  {(data.subtotal - (data.discount || 0)).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>

              {/* GST Rows */}
              {data.isInterState ? (
                <tr>
                  <td colSpan={4} className="border border-gray-300 px-4 py-3 text-right font-semibold">
                    IGST ({data.gstRate}%):
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                    ₹
                    {gstCalculation.igst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td colSpan={4} className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      CGST ({data.gstRate / 2}%):
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      ₹
                      {gstCalculation.cgst.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      SGST ({data.gstRate / 2}%):
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      ₹
                      {gstCalculation.sgst.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </>
              )}

              {/* Total Row */}
              <tr className="bg-blue-50 border-2 border-blue-200">
                <td colSpan={4} className="border border-gray-300 px-4 py-4 text-right font-bold text-lg">
                  Total Amount:
                </td>
                <td className="border border-gray-300 px-4 py-4 text-right font-bold text-lg text-blue-600">
                  ₹{finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="mb-8 bg-gray-50 p-4 rounded">
          <p className="font-semibold text-gray-800">
            Amount in Words: <span className="font-normal italic">{numberToWords(Math.round(finalAmount))}</span>
          </p>
        </div>

        {/* Terms and Conditions */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-800 mb-3 border-b pb-1">Terms & Conditions:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Payment is due within 30 days of invoice date</li>
            <li>• Late payment charges may apply after due date</li>
            <li>• All disputes subject to local jurisdiction</li>
            <li>• This is a computer generated invoice and does not require signature</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t">
          <div>
            <p className="text-sm text-gray-600 mb-2">Bank Details:</p>
            <p className="text-sm text-gray-600">Account Name: {data.businessName}</p>
            <p className="text-sm text-gray-600">Account No: XXXX-XXXX-XXXX</p>
            <p className="text-sm text-gray-600">IFSC Code: XXXXXXXX</p>
            <p className="text-sm text-gray-600">Bank: State Bank of India</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-600 mb-8">For {data.businessName}</p>
            <div className="border-t border-gray-300 pt-2 mt-12">
              <p className="text-sm text-gray-600">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Declaration */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            This is a computer generated invoice and is valid without signature and seal.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
