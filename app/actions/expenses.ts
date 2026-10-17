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

function normalizeDate(rawDate?: string): string {
  if (!rawDate) return new Date().toISOString().split("T")[0]
  const str = rawDate.trim()
  // Match DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\-]/)
    const day = parts[0].padStart(2, "0")
    const month = parts[1].padStart(2, "0")
    const year = parts[2]
    return `${year}-${month}-${day}`
  }
  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split("T")[0]
  }
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0]
  }
  return new Date().toISOString().split("T")[0]
}

export async function ensureExpensesTable(sql: any) {
  try {
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
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS date DATE`.catch(() => {})
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT`.catch(() => {})
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2)`.catch(() => {})
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`.catch(() => {})
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT`.catch(() => {})
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed'`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses(tenant_id, date)`.catch(() => {})
  } catch (err) {
    console.error("[Expenses] Error ensuring schema:", err)
  }
}

export async function createExpensesTable() {
  return withTenantAuth(async ({ sql }) => {
    await ensureExpensesTable(sql)
    return { success: true }
  })
}

export async function getExpenses(): Promise<ExpenseRecord[]> {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureExpensesTable(sql)
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
      await ensureExpensesTable(sql)
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
    await ensureExpensesTable(sql)

    const normalizedDate = normalizeDate(expenseData.date)
    const numAmount = Math.max(0, Number(expenseData.amount) || 0)
    const paymentMethod = expenseData.payment_method || "Cash"

    const result = await sql`
      INSERT INTO expenses (
        tenant_id, date, category, description, amount, payment_method, vendor, receipt_url, status
      ) VALUES (
        ${tenantId}, ${normalizedDate}, ${expenseData.category}, ${expenseData.description},
        ${numAmount}, ${paymentMethod}, ${expenseData.vendor || null},
        ${expenseData.receipt_url || null}, ${expenseData.status || 'completed'}
      )
      RETURNING *
    `
    const row = result[0] || (result as any).rows?.[0]

    // If paid by Cash, synchronize with Cash Register drawer!
    if (paymentMethod.toLowerCase() === "cash" && numAmount > 0) {
      try {
        const regRows = await sql`
          SELECT id, current_shift_id FROM cash_registers
          WHERE tenant_id = ${tenantId} AND current_shift_id IS NOT NULL
          LIMIT 1
        `.catch(() => [])

        if (regRows.length > 0) {
          const reg = regRows[0]
          await sql`
            INSERT INTO cash_transactions (
              register_id, shift_id, type, amount, description, category, reference, tenant_id, created_at
            ) VALUES (
              ${reg.id}, ${reg.current_shift_id}, 'cash_out', ${numAmount},
              ${'Expense: ' + expenseData.category + ' - ' + expenseData.description}, 'expense',
              ${'EXP-' + row.id}, ${tenantId}, NOW()
            )
          `.catch(() => {})

          await sql`
            UPDATE cash_registers
            SET current_balance = current_balance - ${numAmount}, updated_at = NOW()
            WHERE id = ${reg.id} AND tenant_id = ${tenantId}
          `.catch(() => {})

          await sql`
            UPDATE register_shifts
            SET expected_balance = expected_balance - ${numAmount}
            WHERE id = ${reg.current_shift_id} AND tenant_id = ${tenantId}
          `.catch(() => {})
        }
      } catch (cashErr) {
        console.warn("Failed to sync cash expense to register:", cashErr)
      }
    }

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
    await ensureExpensesTable(sql)
    const normalizedDate = normalizeDate(expenseData.date)
    const numAmount = Math.max(0, Number(expenseData.amount) || 0)

    const result = await sql`
      UPDATE expenses 
      SET 
        date = ${normalizedDate},
        category = ${expenseData.category},
        description = ${expenseData.description},
        amount = ${numAmount},
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
