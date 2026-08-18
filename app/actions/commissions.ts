"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import { revalidatePath } from "next/cache"

export interface CommissionProfile {
  id: string
  name: string
  description: string
  commission_type: "percentage" | "fixed" | "tiered"
  base_rate: number
  min_threshold: number
  max_threshold: number
  applies_to: "services" | "products" | "both"
  staff_count: number
  is_active: boolean
  created_at: string
}

export interface CommissionTier {
  id: string
  profile_id: string
  min_amount: number
  max_amount: number
  rate: number
}

export async function getCommissionProfiles(): Promise<CommissionProfile[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Attempting to fetch commission profiles...")

      const connectionTest = await sql`SELECT 1 as test`
      if (!connectionTest.rows || connectionTest.rows.length === 0) {
        throw new Error("Database connection failed")
      }

      const profilesResult = await sql`
        SELECT 
          cp.id::text,
          cp.name,
          cp.description,
          cp.commission_type,
          cp.base_rate::numeric as base_rate,
          cp.min_threshold::numeric as min_threshold,
          cp.max_threshold::numeric as max_threshold,
          cp.applies_to,
          cp.is_active,
          cp.created_at::text,
          COUNT(s.id)::integer as staff_count
        FROM commission_profiles cp
        LEFT JOIN staff s ON s.commission_profile_id = cp.id AND s.is_active = true AND s.tenant_id = ${tenantId}
        WHERE cp.tenant_id = ${tenantId}
        GROUP BY cp.id, cp.name, cp.description, cp.commission_type, cp.base_rate, 
                 cp.min_threshold, cp.max_threshold, cp.applies_to, cp.is_active, cp.created_at
        ORDER BY cp.created_at DESC
      `

      console.log("[v0] Raw commission profiles result:", profilesResult)

      const profiles = profilesResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || "",
        commission_type: row.commission_type,
        base_rate: Number(row.base_rate) || 0,
        min_threshold: Number(row.min_threshold) || 0,
        max_threshold: Number(row.max_threshold) || 0,
        applies_to: row.applies_to,
        staff_count: Number(row.staff_count) || 0,
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
      })) as CommissionProfile[]

      console.log("[v0] Successfully fetched", profiles.length, "commission profiles")
      return profiles
    } catch (error) {
      console.error("[v0] Error fetching commission profiles:", error)
      throw new Error(
        `Failed to fetch commission profiles: ${error instanceof Error ? error.message : "Unknown database error"}`,
      )
    }
  })
}

export async function createCommissionProfile(data: Omit<CommissionProfile, "id" | "staff_count" | "created_at">) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Attempting to create commission profile:", data)

      const result = await sql`
        INSERT INTO commission_profiles (
          tenant_id, name, description, commission_type, base_rate, min_threshold, 
          max_threshold, applies_to, is_active
        )
        VALUES (
          ${tenantId}, ${data.name}, ${data.description}, ${data.commission_type}, 
          ${data.base_rate}, ${data.min_threshold}, ${data.max_threshold},
          ${data.applies_to}, ${data.is_active}
        )
        RETURNING id::text, name, description, commission_type, base_rate::numeric, 
                  min_threshold::numeric, max_threshold::numeric, applies_to, 
                  is_active, created_at::text
      `

      const profile = result.rows[0]
      const formattedProfile = {
        ...profile,
        base_rate: Number(profile.base_rate),
        min_threshold: Number(profile.min_threshold),
        max_threshold: Number(profile.max_threshold),
        staff_count: 0,
      } as CommissionProfile

      revalidatePath("/manage/commissions")
      return { success: true, message: "Commission profile created successfully!", data: formattedProfile }
    } catch (error) {
      console.error("[v0] Error creating commission profile:", error)
      return {
        success: false,
        message: `Failed to create commission profile: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export async function updateCommissionProfile(id: string, data: Partial<CommissionProfile>) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Attempting to update commission profile:", id, data)

      const result = await sql`
        UPDATE commission_profiles 
        SET 
          name = COALESCE(${data.name}, name),
          description = COALESCE(${data.description}, description),
          commission_type = COALESCE(${data.commission_type}, commission_type),
          base_rate = COALESCE(${data.base_rate}, base_rate),
          min_threshold = COALESCE(${data.min_threshold}, min_threshold),
          max_threshold = COALESCE(${data.max_threshold}, max_threshold),
          applies_to = COALESCE(${data.applies_to}, applies_to),
          is_active = COALESCE(${data.is_active}, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id::text, name, description, commission_type, base_rate::numeric,
                  min_threshold::numeric, max_threshold::numeric, applies_to,
                  is_active, created_at::text
      `

      if (result.rows.length === 0) {
        return { success: false, message: "Commission profile not found" }
      }

      const profile = result.rows[0]
      const formattedProfile = {
        ...profile,
        base_rate: Number(profile.base_rate),
        min_threshold: Number(profile.min_threshold),
        max_threshold: Number(profile.max_threshold),
        staff_count: 0, // Will be calculated separately if needed
      } as CommissionProfile

      revalidatePath("/manage/commissions")
      return { success: true, message: "Commission profile updated successfully!", data: formattedProfile }
    } catch (error) {
      console.error("[v0] Error updating commission profile:", error)
      return {
        success: false,
        message: `Failed to update commission profile: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}

export async function deleteCommissionProfile(id: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Attempting to delete commission profile:", id)

      // Check if any staff are using this profile
      const staffCheck = await sql`
        SELECT COUNT(*) as count FROM staff 
        WHERE commission_profile_id = ${id} AND is_active = true AND tenant_id = ${tenantId}
      `

      const staffCount = Number(staffCheck.rows[0]?.count) || 0
      if (staffCount > 0) {
        return {
          success: false,
          message: `Cannot delete commission profile. ${staffCount} active staff members are using this profile.`,
        }
      }

      const result = await sql`
        DELETE FROM commission_profiles 
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id
      `

      if (result.rows.length === 0) {
        return { success: false, message: "Commission profile not found" }
      }

      revalidatePath("/manage/commissions")
      return { success: true, message: "Commission profile deleted successfully!" }
    } catch (error) {
      console.error("[v0] Error deleting commission profile:", error)
      return {
        success: false,
        message: `Failed to delete commission profile: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  })
}
