// app/actions/import-export.ts
"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"
import {
  CSVParser,
  customerValidationRules,
  serviceValidationRules,
  bookingValidationRules,
  productValidationRules,
  staffValidationRules,
  type CSVParseResult,
} from "@/lib/csv-parser"

export interface ImportExportHistoryItem {
  id: number | string
  tenant_id: string
  type: "import" | "export"
  data_type: string
  status: "completed" | "failed" | "processing"
  records_processed: number
  total_records: number
  file_name?: string
  error_message?: string
  created_at: string
}

export interface EntityStats {
  customers: number
  services: number
  products: number
  bookings: number
  staff: number
  invoices: number
}

async function ensureHistoryTable(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS import_export_history (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        data_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        records_processed INTEGER DEFAULT 0,
        total_records INTEGER DEFAULT 0,
        file_name VARCHAR(255),
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `.catch(() => {})

    await sql`
      CREATE INDEX IF NOT EXISTS idx_import_export_tenant 
      ON import_export_history(tenant_id, created_at DESC)
    `.catch(() => {})
  } catch (err) {
    console.warn("ensureHistoryTable warning:", err)
  }
}

// 1. Get Live Stats for all entities
export async function getImportExportStats(): Promise<{ success: boolean; data?: EntityStats; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const [
        customersRes,
        servicesRes,
        productsRes,
        bookingsRes,
        staffRes,
        invoicesRes,
      ] = await Promise.all([
        sql`SELECT COUNT(*)::int as count FROM customers WHERE tenant_id = ${tenantId}`.catch(() => [{ count: 0 }]),
        sql`SELECT COUNT(*)::int as count FROM services WHERE tenant_id = ${tenantId}`.catch(() => [{ count: 0 }]),
        sql`SELECT COUNT(*)::int as count FROM products WHERE tenant_id = ${tenantId}`.catch(() => [{ count: 0 }]),
        sql`SELECT COUNT(*)::int as count FROM bookings WHERE tenant_id = ${tenantId}`.catch(() => [{ count: 0 }]),
        sql`SELECT COUNT(*)::int as count FROM staff WHERE tenant_id = ${tenantId} AND is_active = true`.catch(() => [{ count: 0 }]),
        sql`SELECT COUNT(*)::int as count FROM invoices WHERE tenant_id = ${tenantId}`.catch(() => [{ count: 0 }]),
      ])

      return {
        success: true,
        data: {
          customers: customersRes[0]?.count || 0,
          services: servicesRes[0]?.count || 0,
          products: productsRes[0]?.count || 0,
          bookings: bookingsRes[0]?.count || 0,
          staff: staffRes[0]?.count || 0,
          invoices: invoicesRes[0]?.count || 0,
        },
      }
    } catch (err: any) {
      console.error("Error in getImportExportStats:", err)
      return { success: false, error: err?.message || "Failed to fetch entity stats" }
    }
  })
}

// 2. Get Persistent Operations History
export async function getOperationsHistory(): Promise<{ success: boolean; data?: ImportExportHistoryItem[]; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureHistoryTable(sql)

      const rows = await sql`
        SELECT 
          id,
          tenant_id,
          type,
          data_type,
          status,
          records_processed,
          total_records,
          file_name,
          error_message,
          created_at
        FROM import_export_history
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT 25
      `.catch(() => [])

      return {
        success: true,
        data: rows.map((r: any) => ({
          ...r,
          id: String(r.id),
          created_at: new Date(r.created_at).toISOString(),
        })),
      }
    } catch (err: any) {
      console.error("Error fetching operations history:", err)
      return { success: false, error: "Failed to load operations history" }
    }
  })
}

// 3. Log an operation
export async function logOperation(input: {
  type: "import" | "export"
  dataType: string
  status: "completed" | "failed" | "processing"
  recordsProcessed: number
  totalRecords: number
  fileName?: string
  errorMessage?: string
}): Promise<{ success: boolean; id?: number }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureHistoryTable(sql)

      const rows = await sql`
        INSERT INTO import_export_history (
          tenant_id,
          type,
          data_type,
          status,
          records_processed,
          total_records,
          file_name,
          error_message,
          created_at
        ) VALUES (
          ${tenantId},
          ${input.type},
          ${input.dataType},
          ${input.status},
          ${input.recordsProcessed},
          ${input.totalRecords},
          ${input.fileName || null},
          ${input.errorMessage || null},
          NOW()
        ) RETURNING id
      `

      return { success: true, id: rows[0]?.id }
    } catch (err: any) {
      console.warn("Failed to log operation:", err)
      return { success: false }
    }
  })
}

// 4. Bulk Upload Products
export async function bulkUploadProducts(
  csvContent: string,
  duplicateMode: "skip" | "update" = "skip"
): Promise<{ success: boolean; message: string; recordsProcessed?: number; errors?: string[] }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const csvData = CSVParser.parseCSV(csvContent)
      const parseResult = CSVParser.validateAndTransform(csvData, productValidationRules, (row) => ({
        name: row.name?.trim() || "",
        price: Math.max(0, Number(row.price) || 0),
        cost: Math.max(0, Number(row.cost) || 0),
        stock_quantity: Math.max(0, Math.round(Number(row.stock_quantity) || 0)),
        min_stock_level: Math.max(0, Math.round(Number(row.min_stock_level) || 5)),
        category: row.category?.trim() || "General",
        sku: row.sku?.trim() || null,
        barcode: row.barcode?.trim() || null,
        description: row.description?.trim() || null,
      }))

      if (!parseResult.success) {
        return {
          success: false,
          message: `Validation failed: ${parseResult.errors.length} issue(s) detected.`,
          recordsProcessed: 0,
          errors: parseResult.errors,
        }
      }

      if (parseResult.data.length === 0) {
        return { success: false, message: "No product rows found in CSV." }
      }

      let insertedCount = 0
      let updatedCount = 0
      let skippedCount = 0
      const errors: string[] = []

      for (const item of parseResult.data) {
        try {
          // Check for existing product by SKU, Barcode, or exact Name
          const existing = await sql`
            SELECT id, name FROM products 
            WHERE tenant_id = ${tenantId} 
              AND (
                (${item.sku ? sql`sku = ${item.sku}` : sql`FALSE`}) OR
                (${item.barcode ? sql`barcode = ${item.barcode}` : sql`FALSE`}) OR
                LOWER(name) = LOWER(${item.name})
              )
            LIMIT 1
          `.catch(() => [])

          if (existing.length > 0) {
            if (duplicateMode === "update") {
              await sql`
                UPDATE products SET
                  price = ${item.price},
                  cost = ${item.cost},
                  stock_quantity = ${item.stock_quantity},
                  min_stock_level = ${item.min_stock_level},
                  category = ${item.category},
                  sku = COALESCE(${item.sku}, sku),
                  barcode = COALESCE(${item.barcode}, barcode),
                  description = COALESCE(${item.description}, description),
                  updated_at = NOW()
                WHERE id = ${existing[0].id} AND tenant_id = ${tenantId}
              `
              updatedCount++
            } else {
              skippedCount++
            }
            continue
          }

          // Insert new product
          await sql`
            INSERT INTO products (
              tenant_id,
              name,
              price,
              cost,
              stock_quantity,
              min_stock_level,
              category,
              sku,
              barcode,
              description,
              is_active,
              created_at,
              updated_at
            ) VALUES (
              ${tenantId},
              ${item.name},
              ${item.price},
              ${item.cost},
              ${item.stock_quantity},
              ${item.min_stock_level},
              ${item.category},
              ${item.sku},
              ${item.barcode},
              ${item.description},
              true,
              NOW(),
              NOW()
            )
          `
          insertedCount++
        } catch (err: any) {
          errors.push(`Product "${item.name}": ${err?.message || "Insert failed"}`)
        }
      }

      const totalProcessed = insertedCount + updatedCount
      const msg = `Processed ${parseResult.data.length} products: ${insertedCount} added, ${updatedCount} updated, ${skippedCount} skipped.`

      await logOperation({
        type: "import",
        dataType: "products",
        status: totalProcessed > 0 ? "completed" : "failed",
        recordsProcessed: totalProcessed,
        totalRecords: parseResult.data.length,
        fileName: "products_import.csv",
        errorMessage: errors.length > 0 ? errors.slice(0, 3).join("; ") : undefined,
      })

      revalidatePath("/inventory")
      revalidatePath("/manage/products")
      revalidatePath("/manage/import-export")

      return {
        success: true,
        message: msg,
        recordsProcessed: totalProcessed,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (err: any) {
      return { success: false, message: err?.message || "Import products failed" }
    }
  })
}

// 5. Bulk Upload Staff
export async function bulkUploadStaff(
  csvContent: string,
  duplicateMode: "skip" | "update" = "skip"
): Promise<{ success: boolean; message: string; recordsProcessed?: number; errors?: string[] }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const csvData = CSVParser.parseCSV(csvContent)
      const parseResult = CSVParser.validateAndTransform(csvData, staffValidationRules, (row) => ({
        name: row.name?.trim() || "",
        phone: row.phone?.trim() || null,
        email: row.email?.trim() || null,
        role: row.role?.trim() || "Staff",
        commission_rate: Math.max(0, Math.min(100, Number(row.commission_rate) || 0)),
      }))

      if (!parseResult.success) {
        return {
          success: false,
          message: `Validation failed: ${parseResult.errors.length} issue(s) detected.`,
          recordsProcessed: 0,
          errors: parseResult.errors,
        }
      }

      if (parseResult.data.length === 0) {
        return { success: false, message: "No staff rows found in CSV." }
      }

      let insertedCount = 0
      let updatedCount = 0
      let skippedCount = 0
      const errors: string[] = []

      for (const item of parseResult.data) {
        try {
          const existing = await sql`
            SELECT id, name FROM staff 
            WHERE tenant_id = ${tenantId} 
              AND (
                (${item.phone ? sql`phone = ${item.phone}` : sql`FALSE`}) OR
                (${item.email ? sql`email = ${item.email}` : sql`FALSE`}) OR
                LOWER(name) = LOWER(${item.name})
              )
            LIMIT 1
          `.catch(() => [])

          if (existing.length > 0) {
            if (duplicateMode === "update") {
              await sql`
                UPDATE staff SET
                  role = ${item.role},
                  commission_rate = ${item.commission_rate},
                  phone = COALESCE(${item.phone}, phone),
                  email = COALESCE(${item.email}, email),
                  updated_at = NOW()
                WHERE id = ${existing[0].id} AND tenant_id = ${tenantId}
              `
              updatedCount++
            } else {
              skippedCount++
            }
            continue
          }

          await sql`
            INSERT INTO staff (
              tenant_id,
              name,
              phone,
              email,
              role,
              commission_rate,
              is_active,
              created_at,
              updated_at
            ) VALUES (
              ${tenantId},
              ${item.name},
              ${item.phone},
              ${item.email},
              ${item.role},
              ${item.commission_rate},
              true,
              NOW(),
              NOW()
            )
          `
          insertedCount++
        } catch (err: any) {
          errors.push(`Staff "${item.name}": ${err?.message || "Insert failed"}`)
        }
      }

      const totalProcessed = insertedCount + updatedCount
      const msg = `Processed ${parseResult.data.length} staff: ${insertedCount} added, ${updatedCount} updated, ${skippedCount} skipped.`

      await logOperation({
        type: "import",
        dataType: "staff",
        status: totalProcessed > 0 ? "completed" : "failed",
        recordsProcessed: totalProcessed,
        totalRecords: parseResult.data.length,
        fileName: "staff_import.csv",
        errorMessage: errors.length > 0 ? errors.slice(0, 3).join("; ") : undefined,
      })

      revalidatePath("/staff")
      revalidatePath("/manage/staff")
      revalidatePath("/manage/import-export")

      return {
        success: true,
        message: msg,
        recordsProcessed: totalProcessed,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (err: any) {
      return { success: false, message: err?.message || "Import staff failed" }
    }
  })
}

// 6. Unified Import Dispatcher
export async function processEntityImport(
  entityType: "customers" | "services" | "bookings" | "products" | "staff",
  csvText: string,
  fileName: string,
  duplicateMode: "skip" | "update" = "skip"
): Promise<{ success: boolean; message: string; recordsProcessed?: number; errors?: string[] }> {
  try {
    if (!csvText || !csvText.trim()) {
      return { success: false, message: "File is empty" }
    }

    if (entityType === "products") {
      return await bulkUploadProducts(csvText, duplicateMode)
    }

    if (entityType === "staff") {
      return await bulkUploadStaff(csvText, duplicateMode)
    }

    // For customers, services, bookings:
    return await withTenantAuth(async ({ sql, tenantId }) => {
      const csvData = CSVParser.parseCSV(csvText)

      if (entityType === "customers") {
        const parseResult = CSVParser.validateAndTransform(csvData, customerValidationRules, (row) => ({
          phone_number: row.phone_number?.trim() || "",
          full_name: row.full_name?.trim() || "",
          email: row.email?.trim() || null,
          gender: row.gender?.toLowerCase().trim() || null,
          sms_number: row.sms_number?.trim() || null,
          code: row.code?.trim() || null,
          instagram_handle: row.instagram_handle?.trim() || null,
          lead_source: row.lead_source?.trim() || null,
          date_of_birth: row.date_of_birth?.trim() || null,
          date_of_anniversary: row.date_of_anniversary?.trim() || null,
          notes: row.notes?.trim() || null,
        }))

        if (!parseResult.success) {
          return {
            success: false,
            message: `Validation failed: ${parseResult.errors.length} issue(s) detected.`,
            recordsProcessed: 0,
            errors: parseResult.errors,
          }
        }

        let inserted = 0
        let updated = 0
        let skipped = 0
        const errors: string[] = []

        for (const c of parseResult.data) {
          try {
            const existing = await sql`
              SELECT id FROM customers WHERE phone_number = ${c.phone_number} AND tenant_id = ${tenantId} LIMIT 1
            `.catch(() => [])

            if (existing.length > 0) {
              if (duplicateMode === "update") {
                await sql`
                  UPDATE customers SET
                    full_name = ${c.full_name},
                    email = COALESCE(${c.email}, email),
                    gender = COALESCE(${c.gender}, gender),
                    notes = COALESCE(${c.notes}, notes),
                    updated_at = NOW()
                  WHERE id = ${existing[0].id} AND tenant_id = ${tenantId}
                `
                updated++
              } else {
                skipped++
              }
              continue
            }

            await sql`
              INSERT INTO customers (
                full_name, phone_number, email, gender, sms_number, code, instagram_handle, lead_source, date_of_birth, date_of_anniversary, notes, tenant_id, created_at, updated_at
              ) VALUES (
                ${c.full_name}, ${c.phone_number}, ${c.email}, ${c.gender}, ${c.sms_number}, ${c.code}, ${c.instagram_handle}, ${c.lead_source}, ${c.date_of_birth}, ${c.date_of_anniversary}, ${c.notes}, ${tenantId}, NOW(), NOW()
              )
            `
            inserted++
          } catch (e: any) {
            errors.push(`Customer ${c.full_name}: ${e?.message}`)
          }
        }

        const total = inserted + updated
        await logOperation({
          type: "import",
          dataType: "customers",
          status: total > 0 ? "completed" : "failed",
          recordsProcessed: total,
          totalRecords: parseResult.data.length,
          fileName,
          errorMessage: errors.length > 0 ? errors.slice(0, 3).join("; ") : undefined,
        })

        revalidatePath("/customers")
        revalidatePath("/manage/import-export")
        return {
          success: true,
          message: `Processed ${parseResult.data.length} customers: ${inserted} added, ${updated} updated, ${skipped} skipped.`,
          recordsProcessed: total,
          errors: errors.length > 0 ? errors : undefined,
        }
      }

      if (entityType === "services") {
        const parseResult = CSVParser.validateAndTransform(csvData, serviceValidationRules, (row) => ({
          name: row.name?.trim() || "",
          price: Math.max(0, Number(row.price) || 0),
          duration_minutes: Math.max(5, Math.round(Number(row.duration_minutes) || 30)),
          category: row.category?.trim() || "General",
          code: row.code?.trim() || null,
          description: row.description?.trim() || null,
        }))

        if (!parseResult.success) {
          return {
            success: false,
            message: `Validation failed: ${parseResult.errors.length} issue(s) detected.`,
            recordsProcessed: 0,
            errors: parseResult.errors,
          }
        }

        let inserted = 0
        let updated = 0
        let skipped = 0
        const errors: string[] = []

        for (const s of parseResult.data) {
          try {
            const existing = await sql`
              SELECT id FROM services WHERE (LOWER(name) = LOWER(${s.name}) OR (${s.code ? sql`code = ${s.code}` : sql`FALSE`})) AND tenant_id = ${tenantId} LIMIT 1
            `.catch(() => [])

            if (existing.length > 0) {
              if (duplicateMode === "update") {
                await sql`
                  UPDATE services SET
                    price = ${s.price},
                    duration_minutes = ${s.duration_minutes},
                    category = ${s.category},
                    description = COALESCE(${s.description}, description),
                    updated_at = NOW()
                  WHERE id = ${existing[0].id} AND tenant_id = ${tenantId}
                `
                updated++
              } else {
                skipped++
              }
              continue
            }

            await sql`
              INSERT INTO services (
                name, price, duration_minutes, category, code, description, is_active, tenant_id, created_at, updated_at
              ) VALUES (
                ${s.name}, ${s.price}, ${s.duration_minutes}, ${s.category}, ${s.code}, ${s.description}, true, ${tenantId}, NOW(), NOW()
              )
            `
            inserted++
          } catch (e: any) {
            errors.push(`Service ${s.name}: ${e?.message}`)
          }
        }

        const total = inserted + updated
        await logOperation({
          type: "import",
          dataType: "services",
          status: total > 0 ? "completed" : "failed",
          recordsProcessed: total,
          totalRecords: parseResult.data.length,
          fileName,
        })

        revalidatePath("/services")
        revalidatePath("/manage/services")
        revalidatePath("/manage/import-export")
        return {
          success: true,
          message: `Processed ${parseResult.data.length} services: ${inserted} added, ${updated} updated, ${skipped} skipped.`,
          recordsProcessed: total,
          errors: errors.length > 0 ? errors : undefined,
        }
      }

      return { success: false, message: `Unsupported entity type: ${entityType}` }
    })
  } catch (err: any) {
    return { success: false, message: err?.message || "Import execution failed" }
  }
}
