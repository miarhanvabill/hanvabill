"use server";

import { withTenantAuth } from "@/lib/withTenantAuth";
import { revalidatePath } from "next/cache";

export interface MarketingAutomation {
  id: string;
  name: string;
  trigger_type: string;
  channel: string;
  message_template: string;
  is_active: boolean;
  created_at?: string;
}

export async function getAutomations() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT 
          id, 
          name, 
          trigger_type, 
          channel, 
          message_template, 
          is_active,
          created_at
        FROM marketing_automations
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `;

      return { success: true, data: result as MarketingAutomation[] };
    } catch (error) {
      console.error("[v0] Error fetching marketing automations:", error);
      return { success: false, data: [] };
    }
  });
}

export async function createAutomation(
  data: Omit<MarketingAutomation, "id" | "created_at">,
) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        INSERT INTO marketing_automations (
          tenant_id, 
          name, 
          trigger_type, 
          channel, 
          message_template, 
          is_active
        ) VALUES (
          ${tenantId}, 
          ${data.name}, 
          ${data.trigger_type}, 
          ${data.channel}, 
          ${data.message_template}, 
          ${data.is_active}
        )
        RETURNING *
      `;

      revalidatePath("/marketing/automations");
      return { success: true, data: result[0] };
    } catch (error) {
      console.error("[v0] Error creating marketing automation:", error);
      return { success: false, message: "Failed to create automation" };
    }
  });
}

export async function updateAutomation(
  id: string,
  data: Partial<Omit<MarketingAutomation, "id" | "created_at">>,
) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Dynamic update query building
      const updates = [];
      const values = [];
      let i = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${i++}`);
        values.push(data.name);
      }
      if (data.trigger_type !== undefined) {
        updates.push(`trigger_type = $${i++}`);
        values.push(data.trigger_type);
      }
      if (data.channel !== undefined) {
        updates.push(`channel = $${i++}`);
        values.push(data.channel);
      }
      if (data.message_template !== undefined) {
        updates.push(`message_template = $${i++}`);
        values.push(data.message_template);
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${i++}`);
        values.push(data.is_active);
      }

      if (updates.length === 0) return { success: true };

      values.push(id);
      values.push(tenantId);

      // Use raw query for dynamic updates or use a safer approach if possible
      // Let's use simpler explicit approach since fields are few

      if (data.is_active !== undefined && Object.keys(data).length === 1) {
        await sql`
          UPDATE marketing_automations 
          SET is_active = ${data.is_active}
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `;
      } else {
        await sql`
          UPDATE marketing_automations 
          SET 
            name = COALESCE(${data.name ?? null}, name),
            trigger_type = COALESCE(${data.trigger_type ?? null}, trigger_type),
            channel = COALESCE(${data.channel ?? null}, channel),
            message_template = COALESCE(${data.message_template ?? null}, message_template),
            is_active = COALESCE(${data.is_active ?? null}, is_active)
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `;
      }

      revalidatePath("/marketing/automations");
      return { success: true };
    } catch (error) {
      console.error("[v0] Error updating marketing automation:", error);
      return { success: false, message: "Failed to update automation" };
    }
  });
}

export async function deleteAutomation(id: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        DELETE FROM marketing_automations
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      revalidatePath("/marketing/automations");
      return { success: true };
    } catch (error) {
      console.error("[v0] Error deleting marketing automation:", error);
      return { success: false, message: "Failed to delete automation" };
    }
  });
}
