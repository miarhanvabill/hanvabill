// app/actions/invoices.ts
"use server"

import { withTenantAuth } from '@/lib/withTenantAuth';

export interface InvoiceData {
  customer_id: number
  amount: number
  subtotal: number
  discount_amount: number
  gst_amount: number
  payment_method: string
  service_details: any[]
  product_details: any[]
  invoice_date: string
  due_date: string
  notes?: string | null
  metadata?: any | null
}

export interface Invoice {
  id: string
  invoice_number: string
  customer_id: number
  amount: number
  subtotal: number
  discount_amount: number
  gst_amount: number
  payment_method: string
  service_details: any[]
  product_details: any[]
  invoice_date: string
  due_date: string
  notes?: string | null
  created_at: string
  updated_at: string
  share_token?: string | null
  metadata?: any | null
}

function genInvoiceNumber() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const n = Math.floor(Math.random() * 9000 + 1000)
  return `INV-${y}${m}${d}-${n}`
}

function genShareToken() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
}

export async function createInvoice(data: InvoiceData) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      if (!data.customer_id || !data.amount || !data.invoice_date || !data.due_date) {
        return { success: false, message: "Customer ID, amount, invoice date, and due date are required" }
      }

      const invoiceNumber = genInvoiceNumber()
      const shareToken = genShareToken()

      try {
        const rows = await sql`
          INSERT INTO invoices (
            tenant_id, invoice_number, customer_id, amount, subtotal, discount_amount, gst_amount,
            payment_method, service_details, product_details, invoice_date, due_date,
            notes, metadata, share_token, created_at, updated_at
          ) VALUES (
            ${tenantId}, ${invoiceNumber}, ${data.customer_id}, ${data.amount}, ${data.subtotal}, ${data.discount_amount}, ${data.gst_amount},
            ${data.payment_method}, ${JSON.stringify(data.service_details)}, ${JSON.stringify(data.product_details)},
            ${data.invoice_date}, ${data.due_date}, ${data.notes || null}, ${JSON.stringify(data.metadata || null)},
            ${shareToken}, NOW(), NOW()
          )
          RETURNING *
        `
        return { success: true, invoice: rows[0], message: "Invoice created successfully" }
      } catch {
        // Fallback if table doesn't have metadata/share_token
        const rows = await sql`
          INSERT INTO invoices (
            tenant_id, invoice_number, customer_id, amount, subtotal, discount_amount, gst_amount,
            payment_method, service_details, product_details, invoice_date, due_date,
            notes, created_at, updated_at
          ) VALUES (
            ${tenantId}, ${invoiceNumber}, ${data.customer_id}, ${data.amount}, ${data.subtotal}, ${data.discount_amount}, ${data.gst_amount},
            ${data.payment_method}, ${JSON.stringify(data.service_details)}, ${JSON.stringify(data.product_details)},
            ${data.invoice_date}, ${data.due_date}, ${data.notes || null}, NOW(), NOW()
          )
          RETURNING *
        `
        return { success: true, invoice: rows[0], message: "Invoice created successfully (fallback)" }
      }
    } catch (error) {
      console.error("Error creating invoice:", error)
      return { success: false, message: "Failed to create invoice", error: error instanceof Error ? error.message : "Unknown error" }
    }
  });
}

export async function ensureShareToken(id: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rows = await sql`SELECT share_token FROM invoices WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`
      const existing = rows?.[0]?.share_token
      if (existing) return { success: true, share_token: existing }

      const token = genShareToken()
      try {
        const u = await sql`UPDATE invoices SET share_token = ${token}, updated_at = NOW() WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING share_token`
        return { success: true, share_token: u[0]?.share_token || token }
      } catch {
        // Column may not exist
        return { success: true, share_token: null }
      }
    } catch (e) {
      console.error("ensureShareToken error:", e)
      return { success: false, share_token: null }
    }
  });
}

export async function getInvoices() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT i.*, c.full_name as customer_name, c.phone_number as customer_phone
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE i.tenant_id = ${tenantId}
        ORDER BY i.created_at DESC
        LIMIT 50
      `
      return { success: true, invoices: result }
    } catch (error) {
      console.error("Error fetching invoices:", error)
      return { success: false, message: "Failed to fetch invoices", invoices: [] }
    }
  });
}

export async function getInvoiceById(id: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT i.*, c.full_name as customer_name, c.phone_number as customer_phone, c.email as customer_email
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE i.id = ${id} AND i.tenant_id = ${tenantId}
      `
      if (result.length === 0) return { success: false, message: "Invoice not found" }
      return { success: true, invoice: result[0] }
    } catch (error) {
      console.error("Error fetching invoice:", error)
      return { success: false, message: "Failed to fetch invoice" }
    }
  });
}

export async function getInvoiceByShareToken(token: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT i.*, c.full_name as customer_name, c.phone_number as customer_phone, c.email as customer_email
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE i.share_token = ${token} AND i.tenant_id = ${tenantId}
        LIMIT 1
      `
      if (result.length === 0) return { success: false, message: "Invoice not found" }
      return { success: true, invoice: result[0] }
    } catch (error) {
      console.error("Error fetching invoice by token:", error)
      return { success: false, message: "Failed to fetch invoice" }
    }
  });
}

export async function updateInvoice(id: string, data: Partial<InvoiceData>) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rows = await sql`
        UPDATE invoices
        SET
          amount = COALESCE(${data.amount}, amount),
          subtotal = COALESCE(${data.subtotal}, subtotal),
          discount_amount = COALESCE(${data.discount_amount}, discount_amount),
          gst_amount = COALESCE(${data.gst_amount}, gst_amount),
          payment_method = COALESCE(${data.payment_method}, payment_method),
          service_details = COALESCE(${JSON.stringify(data.service_details)}, service_details),
          product_details = COALESCE(${JSON.stringify(data.product_details)}, product_details),
          invoice_date = COALESCE(${data.invoice_date}, invoice_date),
          due_date = COALESCE(${data.due_date}, due_date),
          notes = COALESCE(${data.notes}, notes),
          metadata = COALESCE(${JSON.stringify(data.metadata || null)}::jsonb, metadata),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      if (rows.length === 0) return { success: false, message: "Invoice not found" }
      return { success: true, invoice: rows[0], message: "Invoice updated successfully" }
    } catch (error) {
      console.error("Error updating invoice:", error)
      return { success: false, message: "Failed to update invoice" }
    }
  });
}

export async function deleteInvoice(id: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rows = await sql`DELETE FROM invoices WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING id`
      if (rows.length === 0) return { success: false, message: "Invoice not found" }
      return { success: true, message: "Invoice deleted successfully" }
    } catch (error) {
      console.error("Error deleting invoice:", error)
      return { success: false, message: "Failed to delete invoice" }
    }
  });
}
