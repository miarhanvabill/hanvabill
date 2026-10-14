"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"

async function ensureMiniWebsiteSettingsTable(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS mini_website_settings (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL UNIQUE,
        custom_url_slug VARCHAR(255) UNIQUE,
        theme_color VARCHAR(50) DEFAULT '#000000',
        show_services BOOLEAN DEFAULT TRUE,
        show_products BOOLEAN DEFAULT TRUE,
        show_staff BOOLEAN DEFAULT TRUE,
        show_reviews BOOLEAN DEFAULT TRUE,
        banner_image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    await sql`
      ALTER TABLE mini_website_settings
        ADD COLUMN IF NOT EXISTS custom_url_slug VARCHAR(255),
        ADD COLUMN IF NOT EXISTS theme_color VARCHAR(50) DEFAULT '#000000',
        ADD COLUMN IF NOT EXISTS show_services BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS show_products BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS show_staff BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS show_reviews BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `.catch(() => {});
  } catch (e) {
    console.warn("ensureMiniWebsiteSettingsTable error:", e);
  }
}

export async function getMiniWebsiteSettings() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureMiniWebsiteSettingsTable(sql);
      const settings = await sql`
        SELECT 
          custom_url_slug,
          theme_color,
          show_services,
          show_products,
          show_staff,
          show_reviews,
          banner_image_url
        FROM mini_website_settings
        WHERE tenant_id::text = ${String(tenantId)}
      `
      
      if (settings.length === 0) {
        return { success: true, data: null }
      }
      
      return { success: true, data: settings[0] }
    } catch (error: any) {
      console.error("Error getting mini website settings:", error)
      return { success: false, error: error.message }
    }
  })
}

export async function saveMiniWebsiteSettings(formData: any) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureMiniWebsiteSettingsTable(sql);
      const {
        custom_url_slug,
        theme_color,
        show_services,
        show_products,
        show_staff,
        show_reviews,
        banner_image_url
      } = formData
      
      const cleanSlug = custom_url_slug ? String(custom_url_slug).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-') : null;

      // Check if settings exist
      const existing = await sql`
        SELECT id FROM mini_website_settings WHERE tenant_id::text = ${String(tenantId)}
      `
      
      // Check slug uniqueness
      if (cleanSlug) {
        const slugCheck = await sql`
          SELECT id FROM mini_website_settings 
          WHERE LOWER(custom_url_slug) = LOWER(${cleanSlug}) AND tenant_id::text != ${String(tenantId)}
        `
        if (slugCheck.length > 0) {
          return { success: false, error: "Custom URL slug is already taken by another salon" }
        }
      }
      
      if (existing.length > 0) {
        // Update
        await sql`
          UPDATE mini_website_settings SET
            custom_url_slug = ${cleanSlug},
            theme_color = ${theme_color || '#000000'},
            show_services = ${show_services ?? true},
            show_products = ${show_products ?? true},
            show_staff = ${show_staff ?? true},
            show_reviews = ${show_reviews ?? true},
            banner_image_url = ${banner_image_url || null},
            updated_at = NOW()
          WHERE tenant_id::text = ${String(tenantId)}
        `
      } else {
        // Insert
        await sql`
          INSERT INTO mini_website_settings (
            tenant_id,
            custom_url_slug,
            theme_color,
            show_services,
            show_products,
            show_staff,
            show_reviews,
            banner_image_url
          ) VALUES (
            ${String(tenantId)},
            ${cleanSlug},
            ${theme_color || '#000000'},
            ${show_services ?? true},
            ${show_products ?? true},
            ${show_staff ?? true},
            ${show_reviews ?? true},
            ${banner_image_url || null}
          )
        `
      }

      // Sync custom slug to tenants table if available
      if (cleanSlug) {
        await sql`
          UPDATE tenants 
          SET slug = ${cleanSlug} 
          WHERE (id::text = ${String(tenantId)} OR tenant_key = ${String(tenantId)})
        `.catch(() => {});
      }
      
      revalidatePath("/manage/mini-website")
      if (cleanSlug) revalidatePath(`/book/${cleanSlug}`)
      return { success: true }
    } catch (error: any) {
      console.error("Error saving mini website settings:", error)
      return { success: false, error: error.message }
    }
  })
}
