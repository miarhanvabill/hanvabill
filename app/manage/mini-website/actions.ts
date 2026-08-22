"use server"

import { revalidatePath } from "next/cache"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function getMiniWebsiteSettings() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
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
        WHERE tenant_id = ${tenantId}
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
      const {
        custom_url_slug,
        theme_color,
        show_services,
        show_products,
        show_staff,
        show_reviews,
        banner_image_url
      } = formData
      
      // Check if settings exist
      const existing = await sql`
        SELECT id FROM mini_website_settings WHERE tenant_id = ${tenantId}
      `
      
      // Check slug uniqueness
      if (custom_url_slug) {
        const slugCheck = await sql`
          SELECT id FROM mini_website_settings 
          WHERE custom_url_slug = ${custom_url_slug} AND tenant_id != ${tenantId}
        `
        if (slugCheck.length > 0) {
          return { success: false, error: "Custom URL slug is already taken" }
        }
      }
      
      if (existing.length > 0) {
        // Update
        await sql`
          UPDATE mini_website_settings SET
            custom_url_slug = ${custom_url_slug || null},
            theme_color = ${theme_color || '#000000'},
            show_services = ${show_services ?? true},
            show_products = ${show_products ?? true},
            show_staff = ${show_staff ?? true},
            show_reviews = ${show_reviews ?? true},
            banner_image_url = ${banner_image_url || null},
            updated_at = NOW()
          WHERE tenant_id = ${tenantId}
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
            ${tenantId},
            ${custom_url_slug || null},
            ${theme_color || '#000000'},
            ${show_services ?? true},
            ${show_products ?? true},
            ${show_staff ?? true},
            ${show_reviews ?? true},
            ${banner_image_url || null}
          )
        `
      }
      
      revalidatePath("/manage/mini-website")
      return { success: true }
    } catch (error: any) {
      console.error("Error saving mini website settings:", error)
      return { success: false, error: error.message }
    }
  })
}
