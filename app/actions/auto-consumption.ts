"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
export type { AutoConsumptionRule, ConsumptionLog, ConsumptionStats } from "@/types/auto-consumption"
import type { AutoConsumptionRule, ConsumptionLog, ConsumptionStats } from "@/types/auto-consumption"

let autoConsumptionSchemaEnsured = false
async function ensureAutoConsumptionSchema(sql: any) {
  if (autoConsumptionSchemaEnsured) return
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS auto_consumption_rules (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        service_id BIGINT,
        product_id BIGINT,
        consumption_amount NUMERIC NOT NULL DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'ml',
        is_active BOOLEAN DEFAULT true,
        trigger_type VARCHAR(50) DEFAULT 'automatic',
        conditions JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS auto_consumption_logs (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        rule_id BIGINT,
        service_booking_id BIGINT,
        product_id BIGINT,
        amount_consumed NUMERIC NOT NULL DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'ml',
        cost NUMERIC DEFAULT 0,
        status VARCHAR(50) DEFAULT 'completed',
        triggered_at TIMESTAMPTZ DEFAULT NOW(),
        created_by BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS product_consumptions (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        invoice_id BIGINT,
        booking_id BIGINT,
        product_id BIGINT,
        product_name VARCHAR(255),
        sku VARCHAR(100),
        quantity_deducted NUMERIC NOT NULL DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'ml',
        service_name VARCHAR(255),
        staff_name VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
      ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
    `
    autoConsumptionSchemaEnsured = true
  } catch {
    // Non-blocking schema fallback
  }
}

export async function getAutoConsumptionRules(): Promise<AutoConsumptionRule[]> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const rules = await sql`
        SELECT 
          acr.id,
          acr.name,
          acr.service_id as "serviceId",
          s.name as "serviceName",
          acr.product_id as "productId",
          p.name as "productName",
          acr.consumption_amount as "consumptionAmount",
          acr.unit,
          acr.is_active as "isActive",
          acr.trigger_type as "triggerType",
          acr.conditions,
          acr.created_at as "createdAt",
          acr.updated_at as "updatedAt",
          MAX(acl.triggered_at) as "lastTriggered",
          COUNT(acl.id) as "totalConsumptions",
          COALESCE(SUM(acl.cost), 0) as "estimatedCost"
        FROM auto_consumption_rules acr
        LEFT JOIN services s ON acr.service_id = s.id AND s.tenant_id = ${tenantId}
        LEFT JOIN products p ON acr.product_id = p.id AND p.tenant_id = ${tenantId}
        LEFT JOIN auto_consumption_logs acl ON acr.id = acl.rule_id AND acl.tenant_id = ${tenantId}
        WHERE acr.tenant_id = ${tenantId}
        GROUP BY acr.id, s.name, p.name
        ORDER BY acr.created_at DESC
      `

      return rules.map((rule: any) => ({
        ...rule,
        id: rule.id.toString(),
        serviceId: rule.serviceId?.toString() || "",
        serviceName: rule.serviceName || "All Services",
        productId: rule.productId?.toString() || "",
        productName: rule.productName || "Unnamed Product",
        totalConsumptions: Number.parseInt(rule.totalConsumptions) || 0,
        estimatedCost: Number.parseFloat(rule.estimatedCost) || 0,
        conditions: rule.conditions || [],
      }))
    } catch (error) {
      console.error("Error fetching auto consumption rules:", error)
      return []
    }
  })
}

export async function getConsumptionLogs(): Promise<ConsumptionLog[]> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const logs = await sql`
        SELECT 
          acl.id,
          acl.rule_id as "ruleId",
          acr.name as "ruleName",
          acl.service_booking_id as "serviceBookingId",
          c.name as "customerName",
          st.name as "staffName",
          p.name as "productConsumed",
          acl.amount_consumed as amount,
          acl.unit,
          acl.cost,
          acl.triggered_at as timestamp,
          acl.status
        FROM auto_consumption_logs acl
        LEFT JOIN auto_consumption_rules acr ON acl.rule_id = acr.id AND acr.tenant_id = ${tenantId}
        LEFT JOIN products p ON acl.product_id = p.id AND p.tenant_id = ${tenantId}
        LEFT JOIN bookings b ON acl.service_booking_id = b.id AND b.tenant_id = ${tenantId}
        LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
        WHERE acl.tenant_id = ${tenantId}
        ORDER BY acl.triggered_at DESC
        LIMIT 50
      `

      return logs.map((log: any) => ({
        ...log,
        id: log.id.toString(),
        ruleId: log.ruleId?.toString() || "",
        ruleName: log.ruleName || "Standard Usage",
        serviceBookingId: log.serviceBookingId?.toString() || "",
        customerName: log.customerName || "Walk-in Customer",
        staffName: log.staffName || "Staff Member",
        productConsumed: log.productConsumed || "Salon Product",
        amount: Number.parseFloat(log.amount) || 0,
        cost: Number.parseFloat(log.cost) || 0,
        timestamp: log.timestamp ? String(log.timestamp) : new Date().toISOString(),
        status: log.status || "completed",
      }))
    } catch (error) {
      console.error("Error fetching consumption logs:", error)
      return []
    }
  })
}

export async function getConsumptionStats(): Promise<ConsumptionStats> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const [rulesStats, consumptionStats, topProducts] = await Promise.all([
        sql`
          SELECT 
            COUNT(*) as total_rules,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_rules
          FROM auto_consumption_rules
          WHERE tenant_id = ${tenantId}
        `,
        sql`
          SELECT 
            COUNT(*) as total_consumptions,
            COALESCE(SUM(cost), 0) as total_cost,
            COALESCE(AVG(amount_consumed), 0) as avg_consumption_per_service
          FROM auto_consumption_logs
          WHERE status = 'completed' AND tenant_id = ${tenantId}
        `,
        sql`
          SELECT 
            p.name as product_name,
            SUM(acl.amount_consumed) as total_amount,
            SUM(acl.cost) as total_cost
          FROM auto_consumption_logs acl
          LEFT JOIN products p ON acl.product_id = p.id AND p.tenant_id = ${tenantId}
          WHERE acl.status = 'completed' AND acl.tenant_id = ${tenantId}
          GROUP BY p.name
          ORDER BY total_cost DESC
          LIMIT 5
        `,
      ])

      const rules = rulesStats[0] || { total_rules: 0, active_rules: 0 }
      const consumption = consumptionStats[0] || { total_consumptions: 0, total_cost: 0, avg_consumption_per_service: 0 }

      return {
        totalRules: Number.parseInt(rules.total_rules) || 0,
        activeRules: Number.parseInt(rules.active_rules) || 0,
        totalConsumptions: Number.parseInt(consumption.total_consumptions) || 0,
        totalCost: Number.parseFloat(consumption.total_cost) || 0,
        avgConsumptionPerService: Number.parseFloat(consumption.avg_consumption_per_service) || 0,
        topConsumedProducts: topProducts.map((product: any) => ({
          productName: product.product_name || "Unknown Product",
          totalAmount: Number.parseFloat(product.total_amount) || 0,
          totalCost: Number.parseFloat(product.total_cost) || 0,
        })),
      }
    } catch (error) {
      console.error("Error fetching consumption stats:", error)
      return {
        totalRules: 0,
        activeRules: 0,
        totalConsumptions: 0,
        totalCost: 0,
        avgConsumptionPerService: 0,
        topConsumedProducts: [],
      }
    }
  })
}

export async function createAutoConsumptionRule(
  ruleData: {
    name: string
    serviceId: string
    productId: string
    consumptionAmount: number
    unit: string
    triggerType: "automatic" | "manual" | "conditional"
    conditions?: string[]
  },
): Promise<{ success: boolean; message: string; rule?: AutoConsumptionRule }> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        INSERT INTO auto_consumption_rules (
          name, service_id, product_id, consumption_amount, unit, 
          trigger_type, conditions, is_active, tenant_id
        ) VALUES (
          ${ruleData.name},
          ${Number.parseInt(ruleData.serviceId)},
          ${Number.parseInt(ruleData.productId)},
          ${ruleData.consumptionAmount},
          ${ruleData.unit},
          ${ruleData.triggerType},
          ${JSON.stringify(ruleData.conditions || [])},
          true,
          ${tenantId}
        )
        RETURNING id, name, created_at
      `

      if (result.length > 0) {
        return {
          success: true,
          message: "Auto-consumption rule created successfully",
          rule: {
            id: result[0].id.toString(),
            name: result[0].name,
            serviceId: ruleData.serviceId,
            serviceName: "",
            productId: ruleData.productId,
            productName: "",
            consumptionAmount: ruleData.consumptionAmount,
            unit: ruleData.unit,
            isActive: true,
            triggerType: ruleData.triggerType,
            conditions: ruleData.conditions || [],
            createdAt: result[0].created_at,
            updatedAt: result[0].created_at,
            totalConsumptions: 0,
            estimatedCost: 0,
          },
        }
      }

      return {
        success: false,
        message: "Failed to create auto-consumption rule",
      }
    } catch (error) {
      console.error("Error creating auto consumption rule:", error)
      return {
        success: false,
        message: "Failed to create auto-consumption rule",
      }
    }
  })
}

export async function updateAutoConsumptionRule(
  ruleId: string,
  updates: Partial<AutoConsumptionRule>,
): Promise<{ success: boolean; message: string }> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Build dynamic update query using tagged template literals
      const updateFields = []

      if (updates.name !== undefined) {
        updateFields.push(sql`name = ${updates.name}`)
      }

      if (updates.consumptionAmount !== undefined) {
        updateFields.push(sql`consumption_amount = ${updates.consumptionAmount}`)
      }

      if (updates.unit !== undefined) {
        updateFields.push(sql`unit = ${updates.unit}`)
      }

      if (updates.triggerType !== undefined) {
        updateFields.push(sql`trigger_type = ${updates.triggerType}`)
      }

      if (updates.conditions !== undefined) {
        updateFields.push(sql`conditions = ${JSON.stringify(updates.conditions)}`)
      }

      if (updates.isActive !== undefined) {
        updateFields.push(sql`is_active = ${updates.isActive}`)
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          message: "No updates provided",
        }
      }

      // Add updated_at field
      updateFields.push(sql`updated_at = CURRENT_TIMESTAMP`)

      // Build the final query
      const query = sql`
        UPDATE auto_consumption_rules 
        SET ${sql.join(updateFields, sql`, `)}
        WHERE id = ${Number.parseInt(ruleId)} AND tenant_id = ${tenantId}
      `

      await query

      return {
        success: true,
        message: "Auto-consumption rule updated successfully",
      }
    } catch (error) {
      console.error("Error updating auto consumption rule:", error)
      return {
        success: false,
        message: "Failed to update auto-consumption rule",
      }
    }
  })
}

export async function deleteAutoConsumptionRule(ruleId: string): Promise<{ success: boolean; message: string }> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // First, delete related logs
      await sql`
        DELETE FROM auto_consumption_logs 
        WHERE rule_id = ${Number.parseInt(ruleId)} AND tenant_id = ${tenantId}
      `

      // Then delete the rule
      await sql`
        DELETE FROM auto_consumption_rules 
        WHERE id = ${Number.parseInt(ruleId)} AND tenant_id = ${tenantId}
      `

      return {
        success: true,
        message: "Auto-consumption rule deleted successfully",
      }
    } catch (error) {
      console.error("Error deleting auto consumption rule:", error)
      return {
        success: false,
        message: "Failed to delete auto-consumption rule",
      }
    }
  })
}

export async function toggleRuleStatus(
  ruleId: string,
  isActive: boolean,
): Promise<{ success: boolean; message: string }> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        UPDATE auto_consumption_rules 
        SET is_active = ${isActive}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${Number.parseInt(ruleId)} AND tenant_id = ${tenantId}
      `

      return {
        success: true,
        message: `Rule ${isActive ? "activated" : "deactivated"} successfully`,
      }
    } catch (error) {
      console.error("Error toggling rule status:", error)
      return {
        success: false,
        message: "Failed to update rule status",
      }
    }
  })
}

export async function triggerConsumption(
  ruleId: string,
  serviceBookingId: string,
  staffId: string,
): Promise<{ success: boolean; message: string }> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureAutoConsumptionSchema(sql)

      // Get rule details - safely retrieve cost_per_unit from products
      let rule: any[] = []
      try {
        rule = await sql`
          SELECT acr.*, COALESCE(p.cost, p.cost_price, 0) as cost_per_unit, COALESCE(p.name, inv.name, 'Product') as product_name, p.sku
          FROM auto_consumption_rules acr
          LEFT JOIN products p ON acr.product_id = p.id AND p.tenant_id = ${tenantId}
          LEFT JOIN inventory inv ON (acr.product_id = inv.id OR LOWER(p.name) = LOWER(inv.name)) AND inv.tenant_id = ${tenantId}
          WHERE acr.id = ${Number.parseInt(ruleId)} AND acr.is_active = true AND acr.tenant_id = ${tenantId}
        `
      } catch {
        rule = await sql`
          SELECT acr.*, COALESCE(p.cost, p.cost_price, 0) as cost_per_unit, COALESCE(p.name, 'Product') as product_name, p.sku
          FROM auto_consumption_rules acr
          LEFT JOIN products p ON acr.product_id = p.id AND p.tenant_id = ${tenantId}
          WHERE acr.id = ${Number.parseInt(ruleId)} AND acr.is_active = true AND acr.tenant_id = ${tenantId}
        `.catch(() => [])
      }

      if (rule.length === 0) {
        return {
          success: false,
          message: "Rule not found or inactive",
        }
      }

      const ruleData = rule[0]
      const cost = ruleData.consumption_amount * (ruleData.cost_per_unit || 0)

      // Log the consumption
      await sql`
        INSERT INTO auto_consumption_logs (
          rule_id, service_booking_id, product_id, amount_consumed, 
          unit, cost, status, triggered_at, created_by, tenant_id
        ) VALUES (
          ${Number.parseInt(ruleId)},
          ${Number.parseInt(serviceBookingId)},
          ${ruleData.product_id},
          ${ruleData.consumption_amount},
          ${ruleData.unit},
          ${cost},
          'completed',
          CURRENT_TIMESTAMP,
          ${staffId ? Number.parseInt(staffId) : null},
          ${tenantId}
        )
      `

      // Deduct from products table
      await sql`
        UPDATE products 
        SET stock_quantity = GREATEST(0, stock_quantity - ${ruleData.consumption_amount}),
            updated_at = NOW()
        WHERE id = ${ruleData.product_id} AND tenant_id = ${tenantId}
      `.catch(() => {})

      // Deduct from inventory table
      await sql`
        UPDATE inventory 
        SET quantity = GREATEST(0, quantity - ${ruleData.consumption_amount}),
            status = CASE 
              WHEN GREATEST(0, quantity - ${ruleData.consumption_amount}) = 0 THEN 'out_of_stock'
              WHEN GREATEST(0, quantity - ${ruleData.consumption_amount}) <= COALESCE(reorder_level, min_stock_level, 5) THEN 'low_stock'
              ELSE 'active'
            END,
            updated_at = NOW()
        WHERE (id = ${ruleData.product_id} OR LOWER(name) = LOWER(${ruleData.product_name})) AND tenant_id = ${tenantId}
      `.catch(() => {})

      // Audit entry in inventory_adjustments
      await sql`
        INSERT INTO inventory_adjustments (
          tenant_id, product_id, adjustment_type, quantity, reason, notes, created_at
        ) VALUES (
          ${tenantId}, ${ruleData.product_id}, 'decrease', ${ruleData.consumption_amount},
          ${'Auto-consumption: ' + (ruleData.name || 'Service Usage')},
          ${'Triggered for booking #' + serviceBookingId}, NOW()
        )
      `.catch(() => {})

      return {
        success: true,
        message: "Consumption triggered successfully",
      }
    } catch (error) {
      console.error("Error triggering consumption:", error)
      return {
        success: false,
        message: "Failed to trigger consumption",
      }
    }
  })
}

/**
 * Automatically evaluates and executes active auto-consumption rules
 * when a salon service is completed or billed.
 */
export async function processServiceAutoConsumption(params: {
  tenantId: string
  sql: any
  serviceId: number | string
  serviceName?: string
  bookingId?: number | string
  invoiceId?: number | string
  staffId?: number | string
  staffName?: string
}) {
  const { tenantId, sql, serviceId, serviceName, bookingId, invoiceId, staffId, staffName } = params
  try {
    await ensureAutoConsumptionSchema(sql)

    let rules: any[] = []
    try {
      rules = await sql`
        SELECT acr.*, COALESCE(p.cost, p.cost_price, 0) as cost_per_unit, COALESCE(p.name, inv.name, 'Product') as product_name, p.sku
        FROM auto_consumption_rules acr
        LEFT JOIN products p ON acr.product_id = p.id AND p.tenant_id = ${tenantId}
        LEFT JOIN inventory inv ON (acr.product_id = inv.id OR LOWER(p.name) = LOWER(inv.name)) AND inv.tenant_id = ${tenantId}
        WHERE acr.service_id = ${Number(serviceId)} AND acr.is_active = true AND acr.trigger_type = 'automatic' AND acr.tenant_id = ${tenantId}
      `
    } catch {
      rules = await sql`
        SELECT acr.*, COALESCE(p.cost, p.cost_price, 0) as cost_per_unit, COALESCE(p.name, 'Product') as product_name, p.sku
        FROM auto_consumption_rules acr
        LEFT JOIN products p ON acr.product_id = p.id AND p.tenant_id = ${tenantId}
        WHERE acr.service_id = ${Number(serviceId)} AND acr.is_active = true AND acr.trigger_type = 'automatic' AND acr.tenant_id = ${tenantId}
      `.catch(() => [])
    }

    if (!rules || rules.length === 0) return

    for (const rule of rules) {
      const amount = Number(rule.consumption_amount) || 0
      const cost = amount * (Number(rule.cost_per_unit) || 0)
      
      // Log consumption
      await sql`
        INSERT INTO auto_consumption_logs (
          rule_id, service_booking_id, product_id, amount_consumed,
          unit, cost, status, triggered_at, created_by, tenant_id
        ) VALUES (
          ${rule.id}, ${bookingId ? Number(bookingId) : 0}, ${rule.product_id},
          ${amount}, ${rule.unit || 'ml'}, ${cost}, 'completed',
          NOW(), ${staffId ? Number(staffId) : null}, ${tenantId}
        )
      `.catch(() => {})

      // Record in product_consumptions table for checkout audit
      await sql`
        INSERT INTO product_consumptions (
          tenant_id, invoice_id, booking_id, product_id, product_name, sku,
          quantity_deducted, unit, service_name, staff_name, notes, created_at
        ) VALUES (
          ${tenantId}, ${invoiceId ? Number(invoiceId) : null}, ${bookingId ? Number(bookingId) : null},
          ${rule.product_id}, ${rule.product_name}, ${rule.sku || null},
          ${amount}, ${rule.unit || 'ml'}, ${serviceName || null}, ${staffName || null},
          ${'Auto-consumed via rule: ' + rule.name}, NOW()
        )
      `.catch(() => {})

      // Deduct from products
      await sql`
        UPDATE products 
        SET stock_quantity = GREATEST(0, stock_quantity - ${amount}), updated_at = NOW()
        WHERE id = ${rule.product_id} AND tenant_id = ${tenantId}
      `.catch(() => {})

      // Deduct from inventory
      await sql`
        UPDATE inventory 
        SET quantity = GREATEST(0, quantity - ${amount}),
            status = CASE 
              WHEN GREATEST(0, quantity - ${amount}) = 0 THEN 'out_of_stock'
              WHEN GREATEST(0, quantity - ${amount}) <= COALESCE(reorder_level, min_stock_level, 5) THEN 'low_stock'
              ELSE 'active'
            END,
            updated_at = NOW()
        WHERE (id = ${rule.product_id} OR LOWER(name) = LOWER(${rule.product_name})) AND tenant_id = ${tenantId}
      `.catch(() => {})

      // Record in inventory_adjustments
      await sql`
        INSERT INTO inventory_adjustments (
          tenant_id, product_id, adjustment_type, quantity, reason, notes, created_at
        ) VALUES (
          ${tenantId}, ${rule.product_id}, 'decrease', ${amount},
          ${'Auto-consumption: ' + (rule.name || 'Service Usage')},
          ${'Auto-deducted for service: ' + (serviceName || 'Service #' + serviceId)}, NOW()
        )
      `.catch(() => {})
    }
  } catch (err) {
    console.error("Error in processServiceAutoConsumption:", err)
  }
}

export async function getAvailableServices(): Promise<Array<{ id: string; name: string }>> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const services = await sql`
        SELECT id, name 
        FROM services 
        WHERE (is_active = true OR is_active IS NULL) AND tenant_id = ${tenantId}
        ORDER BY name
      `

      return services.map((service: any) => ({
        id: service.id.toString(),
        name: service.name,
      }))
    } catch (error) {
      console.error("Error fetching services:", error)
      return []
    }
  })
}

export async function getAvailableProducts(): Promise<Array<{ id: string; name: string; unit: string }>> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const products = await sql`
        SELECT id, name, unit
        FROM products 
        WHERE (is_active = true OR is_active IS NULL) AND tenant_id = ${tenantId}
        ORDER BY name
      `

      return products.map((product: any) => ({
        id: product.id.toString(),
        name: product.name,
        unit: product.unit || "ml",
      }))
    } catch (error) {
      console.error("Error fetching products:", error)
      return []
    }
  })
}

