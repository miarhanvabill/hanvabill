export async function getActiveCustomerMembership(customerId: number): Promise<any | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const result = await sql`
        SELECT 
          cm.id,
          cm.customer_id,
          cm.membership_plan_id as plan_id,
          mp.name as plan_name,
          mp.discount_percentage,
          mp.benefits,
          cm.start_date,
          cm.end_date,
          cm.status,
          cm.bookings_used
        FROM customer_memberships cm
        JOIN membership_plans mp ON cm.membership_plan_id = mp.id AND mp.tenant_id = ${tenantId}
        WHERE cm.customer_id = ${customerId} 
        AND cm.tenant_id = ${tenantId}
        AND cm.status = 'active'
        AND cm.end_date > CURRENT_DATE
        ORDER BY cm.created_at DESC
        LIMIT 1
      `
      const rows = result.rows || result
      if (!rows || rows.length === 0) return null
      
      const row = rows[0]
      return {
        ...row,
        discount_percentage: Number(row.discount_percentage) || 0,
        benefits: typeof row.benefits === 'string' ? JSON.parse(row.benefits) : row.benefits
      }
    } catch (error) {
      console.error("Error fetching active customer membership:", error)
      return null
    }
  })
}
