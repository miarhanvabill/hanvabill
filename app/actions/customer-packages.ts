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

export async function assignPackageToCustomer(params: {
  customerId: number
  packageId: number
  validityDays?: number
}): Promise<{ success: boolean; data?: any; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const [pkgDetails] = await sql`
        SELECT id, name, services, validity_days 
        FROM service_packages 
        WHERE id = ${params.packageId} AND tenant_id = ${tenantId}
      `

      if (!pkgDetails) {
        return { success: false, error: "Package not found" }
      }

      const servicesArr = Array.isArray(pkgDetails.services)
        ? pkgDetails.services
        : JSON.parse(pkgDetails.services || "[]")

      // Fetch service names
      const servicesData = await sql`
        SELECT id, name FROM services WHERE tenant_id = ${tenantId}
      `
      const serviceNameMap = new Map(servicesData.map((s: any) => [s.id, s.name]))

      const totalServices = servicesArr.map((sId: number) => ({
        service_id: Number(sId),
        name: serviceNameMap.get(Number(sId)) || `Service #${sId}`,
        quantity: 1,
      }))
      const remainingServices = totalServices

      const days = params.validityDays || pkgDetails.validity_days || 30
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      const result = await sql`
        INSERT INTO customer_packages (
          tenant_id, customer_id, package_id, total_services, remaining_services, expires_at, is_active
        ) VALUES (
          ${tenantId}, ${params.customerId}, ${params.packageId},
          ${JSON.stringify(totalServices)}, ${JSON.stringify(remainingServices)}, ${expiresAt}, true
        )
        RETURNING *
      `

      return { success: true, data: result[0] }
    } catch (error: any) {
      console.error("Error assigning package to customer:", error)
      return { success: false, error: error?.message || "Failed to assign package" }
    }
  })
}

export async function deductPackageSession(
  customerPackageId: number,
  serviceId: number,
  quantity: number = 1
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const [cp] = await sql`
        SELECT * FROM customer_packages
        WHERE id = ${customerPackageId} AND tenant_id = ${tenantId}
      `

      if (!cp) {
        return { success: false, error: "Customer package not found" }
      }

      if (!cp.is_active) {
        return { success: false, error: "Package is no longer active" }
      }

      if (cp.expires_at && new Date(cp.expires_at) < new Date(new Date().toDateString())) {
        await sql`
          UPDATE customer_packages SET is_active = false, updated_at = NOW()
          WHERE id = ${customerPackageId} AND tenant_id = ${tenantId}
        `.catch(() => {})
        return { success: false, error: "Package has expired" }
      }

      const remainingServices = Array.isArray(cp.remaining_services)
        ? cp.remaining_services
        : JSON.parse(cp.remaining_services || "[]")

      const targetIdx = remainingServices.findIndex(
        (s: any) => Number(s.service_id) === Number(serviceId)
      )

      if (targetIdx === -1) {
        return { success: false, error: "This service is not part of this package" }
      }

      const currentQty = Number(remainingServices[targetIdx].quantity) || 0
      if (currentQty <= 0) {
        return { success: false, error: "No remaining sessions for this service" }
      }

      const deductAmount = Math.min(currentQty, Math.max(1, quantity))
      remainingServices[targetIdx].quantity = currentQty - deductAmount

      // Check if all sessions across all services are exhausted
      const totalRemaining = remainingServices.reduce(
        (sum: number, s: any) => sum + (Number(s.quantity) || 0),
        0
      )
      const isActive = totalRemaining > 0

      await sql`
        UPDATE customer_packages
        SET remaining_services = ${JSON.stringify(remainingServices)},
            is_active = ${isActive},
            updated_at = NOW()
        WHERE id = ${customerPackageId} AND tenant_id = ${tenantId}
      `

      return {
        success: true,
        remaining: remainingServices[targetIdx].quantity,
      }
    } catch (error: any) {
      console.error("Error deducting package session:", error)
      return { success: false, error: error?.message || "Failed to deduct session" }
    }
  })
}

export async function deductBookingPackageSessions(
  bookingId: number,
  customerId: number
): Promise<{ success: boolean; deducted: Array<{ service_id: number; package_id: number; remaining: number }> }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const bookingServices = await sql`
        SELECT service_id, quantity 
        FROM booking_services 
        WHERE booking_id = ${bookingId} AND tenant_id = ${tenantId}
      `

      if (bookingServices.length === 0) {
        return { success: true, deducted: [] }
      }

      // Fetch active packages for this customer
      const activePackages = await sql`
        SELECT id, remaining_services, expires_at 
        FROM customer_packages 
        WHERE customer_id = ${customerId} 
          AND tenant_id = ${tenantId}
          AND is_active = true
          AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
        ORDER BY expires_at ASC NULLS LAST, created_at ASC
      `

      if (activePackages.length === 0) {
        return { success: true, deducted: [] }
      }

      const deducted: Array<{ service_id: number; package_id: number; remaining: number }> = []

      for (const bs of bookingServices) {
        const sId = Number(bs.service_id)
        let neededQty = Number(bs.quantity) || 1

        for (const pkg of activePackages) {
          if (neededQty <= 0) break

          const remainingServices = Array.isArray(pkg.remaining_services)
            ? pkg.remaining_services
            : JSON.parse(pkg.remaining_services || "[]")

          const sIndex = remainingServices.findIndex(
            (s: any) => Number(s.service_id) === sId && Number(s.quantity) > 0
          )

          if (sIndex !== -1) {
            const available = Number(remainingServices[sIndex].quantity)
            const used = Math.min(available, neededQty)
            remainingServices[sIndex].quantity = available - used
            neededQty -= used

            const totalRemaining = remainingServices.reduce(
              (sum: number, s: any) => sum + (Number(s.quantity) || 0),
              0
            )
            const isActive = totalRemaining > 0

            await sql`
              UPDATE customer_packages
              SET remaining_services = ${JSON.stringify(remainingServices)},
                  is_active = ${isActive},
                  updated_at = NOW()
              WHERE id = ${pkg.id} AND tenant_id = ${tenantId}
            `

            deducted.push({
              service_id: sId,
              package_id: pkg.id,
              remaining: remainingServices[sIndex].quantity,
            })
          }
        }
      }

      return { success: true, deducted }
    } catch (error: any) {
      console.error("Error deducting booking package sessions:", error)
      return { success: false, deducted: [] }
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
