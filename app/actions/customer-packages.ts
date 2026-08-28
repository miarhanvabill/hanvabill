"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"

export interface CustomerPackage {
  id: number
  tenant_id: string
  customer_id: number
  package_id: number
  total_services: any
  remaining_services: any
  expires_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  package_name?: string
  is_transferable?: boolean
}

export async function getCustomerPackages(customerId: number): Promise<CustomerPackage[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const packages = await sql`
        SELECT 
          cp.*, 
          sp.name as package_name, 
          sp.is_transferable 
        FROM customer_packages cp
        JOIN service_packages sp ON cp.package_id = sp.id
        WHERE cp.customer_id = ${customerId} 
        AND cp.tenant_id = ${tenantId}
        ORDER BY cp.created_at DESC
      `
      return packages as CustomerPackage[]
    } catch (error) {
      console.error("Error fetching customer packages:", error)
      return []
    }
  })
}

export async function transferPackage(customerPackageId: number, toCustomerId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // First verify the package exists and belongs to the tenant
      const [pkg] = await sql`
        SELECT cp.id, sp.is_transferable 
        FROM customer_packages cp
        JOIN service_packages sp ON cp.package_id = sp.id
        WHERE cp.id = ${customerPackageId} 
        AND cp.tenant_id = ${tenantId}
      `

      if (!pkg) {
        return { success: false, error: "Package not found" }
      }

      if (!pkg.is_transferable) {
        return { success: false, error: "This package is not transferable" }
      }

      const result = await sql`
        UPDATE customer_packages
        SET customer_id = ${toCustomerId}, updated_at = NOW()
        WHERE id = ${customerPackageId} 
        AND tenant_id = ${tenantId}
        RETURNING *
      `

      return { success: true, data: result[0] }
    } catch (error) {
      console.error("Error transferring package:", error)
      return { success: false, error: "Failed to transfer package" }
    }
  })
}
