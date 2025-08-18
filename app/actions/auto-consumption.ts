"use server"

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface AutoConsumptionRule {
  id: string
  name: string
  serviceId: string
  serviceName: string
  productId: string
  productName: string
  consumptionAmount: number
  unit: string
  isActive: boolean
  triggerType: "automatic" | "manual" | "conditional"
  conditions?: string[]
  createdAt: string
  updatedAt: string
  lastTriggered?: string
  totalConsumptions: number
  estimatedCost: number
}

export interface ConsumptionLog {
  id: string
  ruleId: string
  ruleName: string
  serviceBookingId: string
  customerName: string
  staffName: string
  productConsumed: string
  amount: number
  unit: string
  cost: number
  timestamp: string
  status: "completed" | "pending" | "failed"
}

export interface ConsumptionStats {
  totalRules: number
  activeRules: number
  totalConsumptions: number
  totalCost: number
  avgConsumptionPerService: number
  topConsumedProducts: Array<{
    productName: string
    totalAmount: number
    totalCost: number
  }>
}

export async function getAutoConsumptionRules(): Promise<AutoConsumptionRule[]> {
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
      LEFT JOIN services s ON acr.service_id = s.id
      LEFT JOIN products p ON acr.product_id = p.id
      LEFT JOIN auto_consumption_logs acl ON acr.id = acl.rule_id
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
}

export async function getConsumptionLogs(): Promise<ConsumptionLog[]> {
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
      LEFT JOIN auto_consumption_rules acr ON acl.rule_id = acr.id
      LEFT JOIN products p ON acl.product_id = p.id
      LEFT JOIN bookings b ON acl.service_booking_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN staff st ON b.staff_id = st.id
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
}

export async function getConsumptionStats(): Promise<ConsumptionStats> {
  try {
    const [rulesStats, consumptionStats, topProducts] = await Promise.all([
      sql`
        SELECT 
          COUNT(*) as total_rules,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_rules
        FROM auto_consumption_rules
      `,
      sql`
        SELECT 
          COUNT(*) as total_consumptions,
          COALESCE(SUM(cost), 0) as total_cost,
          COALESCE(AVG(amount_consumed), 0) as avg_consumption_per_service
        FROM auto_consumption_logs
        WHERE status = 'completed'
      `,
      sql`
        SELECT 
          p.name as product_name,
          SUM(acl.amount_consumed) as total_amount,
          SUM(acl.cost) as total_cost
        FROM auto_consumption_logs acl
        LEFT JOIN products p ON acl.product_id = p.id
        WHERE acl.status = 'completed'
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
}

export async function createAutoConsumptionRule(ruleData: {
  name: string
  serviceId: string
  productId: string
  consumptionAmount: number
  unit: string
  triggerType: "automatic" | "manual" | "conditional"
  conditions?: string[]
}): Promise<{ success: boolean; message: string; rule?: AutoConsumptionRule }> {
  try {
    const result = await sql`
      INSERT INTO auto_consumption_rules (
        name, service_id, product_id, consumption_amount, unit, 
        trigger_type, conditions, is_active
      ) VALUES (
        ${ruleData.name},
        ${Number.parseInt(ruleData.serviceId)},
        ${Number.parseInt(ruleData.productId)},
        ${ruleData.consumptionAmount},
        ${ruleData.unit},
        ${ruleData.triggerType},
        ${JSON.stringify(ruleData.conditions || [])},
        true
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
}

export async function updateAutoConsumptionRule(
  ruleId: string,
  updates: Partial<AutoConsumptionRule>,
): Promise<{ success: boolean; message: string }> {
  try {
    const setClause = []
    const values = []
    let paramIndex = 1

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramIndex}`)
      values.push(updates.name)
      paramIndex++
    }

    if (updates.consumptionAmount !== undefined) {
      setClause.push(`consumption_amount = $${paramIndex}`)
      values.push(updates.consumptionAmount)
      paramIndex++
    }

    if (updates.unit !== undefined) {
      setClause.push(`unit = $${paramIndex}`)
      values.push(updates.unit)
      paramIndex++
    }

    if (updates.triggerType !== undefined) {
      setClause.push(`trigger_type = $${paramIndex}`)
      values.push(updates.triggerType)
      paramIndex++
    }

    if (updates.conditions !== undefined) {
      setClause.push(`conditions = $${paramIndex}`)
      values.push(JSON.stringify(updates.conditions))
      paramIndex++
    }

    if (updates.isActive !== undefined) {
      setClause.push(`is_active = $${paramIndex}`)
      values.push(updates.isActive)
      paramIndex++
    }

    if (setClause.length === 0) {
      return {
        success: false,
        message: "No updates provided",
      }
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(Number.parseInt(ruleId))

    const query = `
      UPDATE auto_consumption_rules 
      SET ${setClause.join(", ")}
      WHERE id = $${paramIndex}
    `

    await sql.unsafe(query, values)

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
}

export async function deleteAutoConsumptionRule(ruleId: string): Promise<{ success: boolean; message: string }> {
  try {
    // First, delete related logs
    await sql`
      DELETE FROM auto_consumption_logs 
      WHERE rule_id = ${Number.parseInt(ruleId)}
    `

    // Then delete the rule
    const result = await sql`
      DELETE FROM auto_consumption_rules 
      WHERE id = ${Number.parseInt(ruleId)}
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
}

export async function toggleRuleStatus(
  ruleId: string,
  isActive: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    await sql`
      UPDATE auto_consumption_rules 
      SET is_active = ${isActive}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${Number.parseInt(ruleId)}
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
}

export async function triggerConsumption(
  ruleId: string,
  serviceBookingId: string,
  staffId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    // Get rule details
    const rule = await sql`
      SELECT acr.*, p.cost_per_unit
      FROM auto_consumption_rules acr
      LEFT JOIN products p ON acr.product_id = p.id
      WHERE acr.id = ${Number.parseInt(ruleId)} AND acr.is_active = true
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
        unit, cost, status, triggered_at, created_by
      ) VALUES (
        ${Number.parseInt(ruleId)},
        ${Number.parseInt(serviceBookingId)},
        ${ruleData.product_id},
        ${ruleData.consumption_amount},
        ${ruleData.unit},
        ${cost},
        'completed',
        CURRENT_TIMESTAMP,
        ${Number.parseInt(staffId)}
      )
    `

    // Update product inventory if applicable
    await sql`
      UPDATE products 
      SET stock_quantity = stock_quantity - ${ruleData.consumption_amount}
      WHERE id = ${ruleData.product_id} AND track_inventory = true
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
}

export async function getAvailableServices(): Promise<Array<{ id: string; name: string }>> {
  try {
    const services = await sql`
      SELECT id, name 
      FROM services 
      WHERE is_active = true
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
}

export async function getAvailableProducts(): Promise<Array<{ id: string; name: string; unit: string }>> {
  try {
    const products = await sql`
      SELECT id, name, unit 
      FROM products 
      WHERE is_active = true
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
}
