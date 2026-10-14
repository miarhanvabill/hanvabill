'use server'

import { withTenantAuth } from '@/lib/withTenantAuth'

export interface ExpenseRecord {
  id: number
  date: string
  category: string
  description: string
  amount: number
  payment_method?: string
  vendor?: string
  receipt_url?: string
  status: string
  created_at: string
  updated_at: string
}

export interface ExpenseCategoryRollup {
  category: string
  total: number
  count: number
  percentage: number
}

export interface ExpenseVendorRollup {
  vendor: string
  total: number
  count: number
  percentage: number
}

export async function createExpensesTable() {
  return withTenantAuth(async ({ sql, tenantId }) => {
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          tenant_id VARCHAR(100) NOT NULL,
          date DATE NOT NULL,
          category VARCHAR(100) NOT NULL,
          description TEXT,
          amount DECIMAL(10, 2) NOT NULL,
          payment_method VARCHAR(50),
          vendor VARCHAR(100),
          receipt_url TEXT,
          status VARCHAR(50) DEFAULT 'completed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
    return { success: true }
  })
}

export async function getExpenses(): Promise<ExpenseRecord[]> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const data = await sql`
        SELECT * FROM expenses 
        WHERE tenant_id = ${tenantId}
        ORDER BY date DESC, id DESC
      `
      const rows = Array.isArray(data) ? data : (data as any).rows || []
      return rows.map((e: any) => ({
        ...e,
        id: Number(e.id),
        amount: Number.parseFloat(e.amount?.toString() || '0'),
        date: e.date ? (typeof e.date === 'string' ? e.date.split('T')[0] : new Date(e.date).toISOString().split('T')[0]) : '',
        created_at: e.created_at ? new Date(e.created_at).toISOString() : '',
        updated_at: e.updated_at ? new Date(e.updated_at).toISOString() : '',
      }))
    } catch (error) {
      console.error("Error fetching expenses:", error)
      return []
    }
  })
}

export async function getExpenseRollups(): Promise<{
  categoryRollups: ExpenseCategoryRollup[]
  vendorRollups: ExpenseVendorRollup[]
  totalSpend: number
  monthlySpend: number
}> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Category rollup
      const catResult = await sql`
        SELECT 
          category,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE tenant_id = ${tenantId}
        GROUP BY category
        ORDER BY total DESC
      `
      const catRows = Array.isArray(catResult) ? catResult : (catResult as any).rows || []

      // Vendor rollup
      const vendorResult = await sql`
        SELECT 
          COALESCE(NULLIF(TRIM(vendor), ''), 'Direct / Unspecified') as vendor,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE tenant_id = ${tenantId}
        GROUP BY COALESCE(NULLIF(TRIM(vendor), ''), 'Direct / Unspecified')
        ORDER BY total DESC
        LIMIT 15
      `
      const vendorRows = Array.isArray(vendorResult) ? vendorResult : (vendorResult as any).rows || []

      const totalSpend = catRows.reduce((sum: number, r: any) => sum + Number.parseFloat(r.total || 0), 0)

      const categoryRollups: ExpenseCategoryRollup[] = catRows.map((r: any) => {
        const total = Number.parseFloat(r.total || 0)
        return {
          category: r.category || 'Other',
          total,
          count: Number.parseInt(r.count || 0),
          percentage: totalSpend > 0 ? (total / totalSpend) * 100 : 0,
        }
      })

      const vendorRollups: ExpenseVendorRollup[] = vendorRows.map((r: any) => {
        const total = Number.parseFloat(r.total || 0)
        return {
          vendor: r.vendor,
          total,
          count: Number.parseInt(r.count || 0),
          percentage: totalSpend > 0 ? (total / totalSpend) * 100 : 0,
        }
      })

      // Current month spend
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as month_total
        FROM expenses
        WHERE tenant_id = ${tenantId}
          AND date >= ${startOfMonth}
      `
      const monthlySpend = Number.parseFloat(monthResult[0]?.month_total || 0)

      return {
        categoryRollups,
        vendorRollups,
        totalSpend,
        monthlySpend,
      }
    } catch (error) {
      console.error("Error calculating expense rollups:", error)
      return {
        categoryRollups: [],
        vendorRollups: [],
        totalSpend: 0,
        monthlySpend: 0,
      }
    }
  })
}

export async function addExpense(expenseData: {
  date: string
  category: string
  description: string
  amount: number
  payment_method?: string
  vendor?: string
  receipt_url?: string
  status?: string
}) {
  return withTenantAuth(async ({ sql, tenantId }) => {
    const result = await sql`
      INSERT INTO expenses (
        tenant_id, date, category, description, amount, payment_method, vendor, receipt_url, status
      ) VALUES (
        ${tenantId}, ${expenseData.date}, ${expenseData.category}, ${expenseData.description},
        ${expenseData.amount}, ${expenseData.payment_method || null}, ${expenseData.vendor || null},
        ${expenseData.receipt_url || null}, ${expenseData.status || 'completed'}
      )
      RETURNING *
    `
    const row = result[0] || (result as any).rows?.[0]
    return {
      ...row,
      id: Number(row.id),
      amount: Number.parseFloat(row.amount?.toString() || '0'),
    }
  })
}

export async function updateExpense(
  id: number,
  expenseData: {
    date: string
    category: string
    description: string
    amount: number
    payment_method?: string
    vendor?: string
    status?: string
  }
) {
  return withTenantAuth(async ({ sql, tenantId }) => {
    const result = await sql`
      UPDATE expenses 
      SET 
        date = ${expenseData.date},
        category = ${expenseData.category},
        description = ${expenseData.description},
        amount = ${expenseData.amount},
        payment_method = ${expenseData.payment_method || null},
        vendor = ${expenseData.vendor || null},
        status = ${expenseData.status || 'completed'},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `
    const row = result[0] || (result as any).rows?.[0]
    return {
      ...row,
      id: Number(row.id),
      amount: Number.parseFloat(row.amount?.toString() || '0'),
    }
  })
}

export async function updateExpenseStatus(id: number, status: string) {
  return withTenantAuth(async ({ sql, tenantId }) => {
    const result = await sql`
      UPDATE expenses 
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `
    return result[0]
  })
}

export async function deleteExpense(id: number) {
  return withTenantAuth(async ({ sql, tenantId }) => {
    await sql`
      DELETE FROM expenses 
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `
    return { success: true }
  })
}
