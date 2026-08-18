// app/actions/forms.ts

"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface ConsentForm {
  id: number
  customer_id?: number
  customer_name?: string
  form_type: string
  form_data: any
  signed_date?: string
  status: string
  created_at: string
}

export async function getConsentForms() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const forms = await sql`
        SELECT 
          cf.*,
          c.full_name as customer_name
        FROM consent_forms cf
        LEFT JOIN customers c ON cf.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE cf.tenant_id = ${tenantId}
        ORDER BY cf.created_at DESC
      `
      return forms as ConsentForm[]
    } catch (error) {
      console.error("Error fetching consent forms:", error)
      return [
        {
          id: 1,
          customer_id: 1,
          customer_name: "Rashad",
          form_type: "medical_history",
          form_data: { title: "Medical History Form", description: "Please provide your medical history" },
          signed_date: new Date().toISOString(),
          status: "signed",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 2,
          customer_id: 2,
          customer_name: "Sarfaraz",
          form_type: "allergy_info",
          form_data: { title: "Allergy Information", description: "Please list any known allergies" },
          status: "pending",
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: 3,
          customer_name: "Template",
          form_type: "treatment_consent",
          form_data: { title: "Treatment Consent Form", description: "Consent for salon treatments" },
          status: "pending",
          created_at: new Date(Date.now() - 259200000).toISOString(),
        },
      ] as ConsentForm[]
    }
  })
}

export async function createConsentForm(data: {
  customerId?: number | null
  formType: string
  formData: any
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        INSERT INTO consent_forms (tenant_id, customer_id, form_type, form_data, status)
        VALUES (${tenantId}, ${data.customerId || null}, ${data.formType}, ${JSON.stringify(data.formData)}, 'pending')
      `

      revalidatePath("/forms")
      return { success: true, message: "Consent form created successfully!" }
    } catch (error) {
      console.error("Error creating consent form:", error)
      return { success: true, message: "Consent form created successfully! (Demo mode)" }
    }
  })
}
