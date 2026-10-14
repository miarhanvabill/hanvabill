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
  tiers?: CommissionTier[]
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
      // Ensure commission_tiers table exists
      await sql`
        CREATE TABLE IF NOT EXISTS commission_tiers (
          id SERIAL PRIMARY KEY,
          profile_id INTEGER REFERENCES commission_profiles(id) ON DELETE CASCADE,
          min_amount NUMERIC(10,2) NOT NULL,
          max_amount NUMERIC(10,2) NOT NULL,
          rate NUMERIC(5,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `.catch(() => {})

      const connectionTest = await sql`SELECT 1 as test`
      if (!connectionTest || connectionTest.length === 0) {
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

      const profileIds = (profilesResult || []).map((p: any) => Number(p.id)).filter(Boolean)
      const tiersMap = new Map<string, CommissionTier[]>()

      if (profileIds.length > 0) {
        try {
          const tiersResult = await sql`
            SELECT id::text, profile_id::text, min_amount::numeric, max_amount::numeric, rate::numeric
            FROM commission_tiers
            WHERE profile_id = ANY(${profileIds})
            ORDER BY min_amount ASC
          `
          for (const t of tiersResult) {
            const pId = String(t.profile_id)
            if (!tiersMap.has(pId)) tiersMap.set(pId, [])
            tiersMap.get(pId)!.push({
              id: String(t.id),
              profile_id: pId,
              min_amount: Number(t.min_amount) || 0,
              max_amount: Number(t.max_amount) || 0,
              rate: Number(t.rate) || 0
            })
          }
        } catch (tierErr) {
          console.warn("[v0] Error fetching commission tiers:", tierErr)
        }
      }

      const profiles = profilesResult.map((row: any) => ({
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
        tiers: tiersMap.get(String(row.id)) || [],
      })) as CommissionProfile[]

      return profiles
    } catch (error) {
      console.error("[v0] Error fetching commission profiles:", error)
      throw new Error(
        `Failed to fetch commission profiles: ${error instanceof Error ? error.message : "Unknown database error"}`,
      )
    }
  })
}

export async function getCommissionTiers(profileId: string): Promise<CommissionTier[]> {
  return await withTenantAuth(async ({ sql }) => {
    try {
      const tiersResult = await sql`
        SELECT id::text, profile_id::text, min_amount::numeric, max_amount::numeric, rate::numeric
        FROM commission_tiers
        WHERE profile_id = ${Number(profileId)}
        ORDER BY min_amount ASC
      `
      return tiersResult.map((t: any) => ({
        id: String(t.id),
        profile_id: String(t.profile_id),
        min_amount: Number(t.min_amount) || 0,
        max_amount: Number(t.max_amount) || 0,
        rate: Number(t.rate) || 0,
      }))
    } catch (error) {
      console.error("[v0] Error fetching tiers for profile:", profileId, error)
      return []
    }
  })
}

export async function createCommissionProfile(
  data: Omit<CommissionProfile, "id" | "staff_count" | "created_at" | "tiers"> & {
    tiers?: Omit<CommissionTier, "id" | "profile_id">[]
  }
) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
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

      const profile = result[0]
      const createdTiers: CommissionTier[] = []

      // If tiered and tiers provided, insert tiers
      if (data.commission_type === "tiered" && data.tiers && data.tiers.length > 0) {
        for (const tier of data.tiers) {
          const tierRes = await sql`
            INSERT INTO commission_tiers (profile_id, min_amount, max_amount, rate)
            VALUES (${Number(profile.id)}, ${tier.min_amount}, ${tier.max_amount}, ${tier.rate})
            RETURNING id::text, profile_id::text, min_amount::numeric, max_amount::numeric, rate::numeric
          `
          if (tierRes && tierRes[0]) {
            createdTiers.push({
              id: String(tierRes[0].id),
              profile_id: String(tierRes[0].profile_id),
              min_amount: Number(tierRes[0].min_amount) || 0,
              max_amount: Number(tierRes[0].max_amount) || 0,
              rate: Number(tierRes[0].rate) || 0,
            })
          }
        }
      }

      const formattedProfile = {
        ...profile,
        base_rate: Number(profile.base_rate),
        min_threshold: Number(profile.min_threshold),
        max_threshold: Number(profile.max_threshold),
        staff_count: 0,
        tiers: createdTiers,
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

export async function updateCommissionProfile(
  id: string, 
  data: Partial<Omit<CommissionProfile, "tiers">> & {
    tiers?: Omit<CommissionTier, "id" | "profile_id">[]
  }
) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
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

      if (result.length === 0) {
        return { success: false, message: "Commission profile not found" }
      }

      const profile = result[0]
      let currentTiers: CommissionTier[] = []

      // If tiers are explicitly provided
      if (data.tiers !== undefined) {
        // Remove existing tiers
        await sql`DELETE FROM commission_tiers WHERE profile_id = ${Number(id)}`

        if (data.commission_type === "tiered" && data.tiers.length > 0) {
          for (const tier of data.tiers) {
            const tierRes = await sql`
              INSERT INTO commission_tiers (profile_id, min_amount, max_amount, rate)
              VALUES (${Number(id)}, ${tier.min_amount}, ${tier.max_amount}, ${tier.rate})
              RETURNING id::text, profile_id::text, min_amount::numeric, max_amount::numeric, rate::numeric
            `
            if (tierRes && tierRes[0]) {
              currentTiers.push({
                id: String(tierRes[0].id),
                profile_id: String(tierRes[0].profile_id),
                min_amount: Number(tierRes[0].min_amount) || 0,
                max_amount: Number(tierRes[0].max_amount) || 0,
                rate: Number(tierRes[0].rate) || 0,
              })
            }
          }
        }
      } else {
        // Fetch existing tiers
        const tiersResult = await sql`
          SELECT id::text, profile_id::text, min_amount::numeric, max_amount::numeric, rate::numeric
          FROM commission_tiers
          WHERE profile_id = ${Number(id)}
          ORDER BY min_amount ASC
        `
        currentTiers = tiersResult.map((t: any) => ({
          id: String(t.id),
          profile_id: String(t.profile_id),
          min_amount: Number(t.min_amount) || 0,
          max_amount: Number(t.max_amount) || 0,
          rate: Number(t.rate) || 0,
        }))
      }

      const formattedProfile = {
        ...profile,
        base_rate: Number(profile.base_rate),
        min_threshold: Number(profile.min_threshold),
        max_threshold: Number(profile.max_threshold),
        staff_count: 0,
        tiers: currentTiers,
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
      // Check if any staff are using this profile
      const staffCheck = await sql`
        SELECT COUNT(*) as count FROM staff 
        WHERE commission_profile_id = ${id} AND is_active = true AND tenant_id = ${tenantId}
      `

      const staffCount = Number(staffCheck[0]?.count) || 0
      if (staffCount > 0) {
        return {
          success: false,
          message: `Cannot delete commission profile. ${staffCount} active staff members are using this profile.`,
        }
      }

      // Delete tiers first (also handled by ON DELETE CASCADE)
      await sql`DELETE FROM commission_tiers WHERE profile_id = ${Number(id)}`.catch(() => {})

      const result = await sql`
        DELETE FROM commission_profiles 
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id
      `

      if (result.length === 0) {
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
