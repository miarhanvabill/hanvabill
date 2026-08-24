"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"

export interface CustomForm {
  id: string
  name: string
  description?: string
  schema_json: any
  created_at: string
}

export async function getCustomForms() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT * FROM custom_forms
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
      return { success: true, forms: result as any[] }
    } catch (error: any) {
      console.error("Error fetching custom forms:", error)
      return { success: false, error: error.message }
    }
  })
}

export async function getCustomForm(id: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT * FROM custom_forms
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `
      if (result.length === 0) {
        return { success: false, error: "Form not found" }
      }
      return { success: true, form: result[0] as any }
    } catch (error: any) {
      console.error("Error fetching custom form:", error)
      return { success: false, error: error.message }
    }
  })
}

export async function createCustomForm(data: { name: string; description?: string; schema_json: any }) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        INSERT INTO custom_forms (
          tenant_id,
          name,
          description,
          schema_json
        ) VALUES (
          ${tenantId},
          ${data.name},
          ${data.description || null},
          ${sql.json(data.schema_json)}
        )
        RETURNING *
      `
      
      revalidatePath("/manage/forms-builder")
      return { success: true, form: result[0] }
    } catch (error: any) {
      console.error("Error creating custom form:", error)
      return { success: false, error: error.message }
    }
  })
}

export async function updateCustomForm(id: string, data: { name: string; description?: string; schema_json: any }) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        UPDATE custom_forms SET
          name = ${data.name},
          description = ${data.description || null},
          schema_json = ${sql.json(data.schema_json)}
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      
      if (result.length === 0) {
        return { success: false, error: "Form not found" }
      }
      
      revalidatePath("/manage/forms-builder")
      return { success: true, form: result[0] }
    } catch (error: any) {
      console.error("Error updating custom form:", error)
      return { success: false, error: error.message }
    }
  })
}

export async function deleteCustomForm(id: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        DELETE FROM custom_forms
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `
      revalidatePath("/manage/forms-builder")
      return { success: true }
    } catch (error: any) {
      console.error("Error deleting custom form:", error)
      return { success: false, error: error.message }
    }
  })
}
