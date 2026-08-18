"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"
import type { AutoConsumptionRule, ConsumptionLog, ConsumptionStats } from "@/types/auto-consumption"

export const getAutoConsumptionRules = withTenantAuth(async ({ sql, tenantId }): Promise<AutoConsumptionRule[]> => {
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

    return rules.map((rule) => ({
      ...rule,
      id: rule.id.toString(),
      serviceId: rule.serviceId?.toString() || "",
      productId: rule.productId?.toString() || "",
      totalConsumptions: Number.parseInt(rule.totalConsumptions) || 0,
      estimatedCost: Number.parseFloat(rule.estimatedCost) || 0,
      conditions: rule.conditions || [],
    }))
  } catch (error) {
    console.error("Error fetching auto consumption rules:", error)
    return []
  }
})

export const getConsumptionLogs = withTenantAuth(async ({ sql, tenantId }): Promise<ConsumptionLog[]> => {
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

    return logs.map((log) => ({
      ...log,
      id: log.id.toString(),
      ruleId: log.ruleId?.toString() || "",
      serviceBookingId: log.serviceBookingId?.toString() || "",
      customerName: log.customerName || "Unknown Customer",
      staffName: log.staffName || "Unknown Staff",
      productConsumed: log.productConsumed || "Unknown Product",
      amount: Number.parseFloat(log.amount) || 0,
      cost: Number.parseFloat(log.cost) || 0,
    }))
  } catch (error) {
    console.error("Error fetching consumption logs:", error)
    return []
  }
})

export const getConsumptionStats = withTenantAuth(async ({ sql, tenantId }): Promise<ConsumptionStats> => {
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
      topConsumedProducts: topProducts.map((product) => ({
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

export const createAutoConsumptionRule = withTenantAuth(
  async (
    { sql, tenantId },
    ruleData: {
      name: string
      serviceId: string
      productId: string
      consumptionAmount: number
      unit: string
      triggerType: "automatic" | "manual" | "conditional"
      conditions?: string[]
    },
  ): Promise<{ success: boolean; message: string; rule?: AutoConsumptionRule }> => {
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
  },
)

export const updateAutoConsumptionRule = withTenantAuth(
  async (
    { sql, tenantId },
    ruleId: string,
    updates: Partial<AutoConsumptionRule>,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Build dynamic update query using tagged template literals
      const updateFields = []
      const values = []

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
  },
)

export const deleteAutoConsumptionRule = withTenantAuth(
  async ({ sql, tenantId }, ruleId: string): Promise<{ success: boolean; message: string }> => {
    try {
      // First, delete related logs
      await sql`
      DELETE FROM auto_consumption_logs 
      WHERE rule_id = ${Number.parseInt(ruleId)} AND tenant_id = ${tenantId}
    `

      // Then delete the rule
      const result = await sql`
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
  },
)

export const toggleRuleStatus = withTenantAuth(
  async ({ sql, tenantId }, ruleId: string, isActive: boolean): Promise<{ success: boolean; message: string }> => {
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
  },
)

export const triggerConsumption = withTenantAuth(
  async (
    { sql, tenantId },
    ruleId: string,
    serviceBookingId: string,
    staffId: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Get rule details
      const rule = await sql`
      SELECT acr.*, p.cost_per_unit
      FROM auto_consumption_rules acr
      LEFT JOIN products p ON acr.product_id = p.id AND p.tenant_id = ${tenantId}
      WHERE acr.id = ${Number.parseInt(ruleId)} AND acr.is_active = true AND acr.tenant_id = ${tenantId}
    `

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
        ${Number.parseInt(staffId)},
        ${tenantId}
      )
    `

      // Update product inventory if applicable
      await sql`
      UPDATE products 
      SET stock_quantity = stock_quantity - ${ruleData.consumption_amount}
      WHERE id = ${ruleData.product_id} AND track_inventory = true AND tenant_id = ${tenantId}
    `

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
  },
)

export const getAvailableServices = withTenantAuth(
  async ({ sql, tenantId }): Promise<Array<{ id: string; name: string }>> => {
    try {
      const services = await sql`
      SELECT id, name 
      FROM services 
      WHERE is_active = true AND tenant_id = ${tenantId}
      ORDER BY name
    `

      return services.map((service) => ({
        id: service.id.toString(),
        name: service.name,
      }))
    } catch (error) {
      console.error("Error fetching services:", error)
      return []
    }
  },
)

export const getAvailableProducts = withTenantAuth(
  async ({ sql, tenantId }): Promise<Array<{ id: string; name: string; unit: string }>> => {
    try {
      const products = await sql`
      SELECT id, name, unit
      FROM products 
      WHERE is_active = true AND tenant_id = ${tenantId}
      ORDER BY name
    `

      return products.map((product) => ({
        id: product.id.toString(),
        name: product.name,
        unit: product.unit || "ml",
      }))
    } catch (error) {
      console.error("Error fetching products:", error)
      return []
    }
  },
)
