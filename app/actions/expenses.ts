'use server'

import { neon } from '@neondatabase/serverless'
import { withTenantAuth } from '@/lib/auth'

export async function createExpensesTable() {
  return withTenantAuth(async ({ tenantId }) => {
    const sql = neon(process.env.DATABASE_URL!)
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

export async function getExpenses() {
  return withTenantAuth(async ({ tenantId }) => {
    const sql = neon(process.env.DATABASE_URL!)
    const data = await sql`
      SELECT * FROM expenses 
      WHERE tenant_id = ${tenantId}
      ORDER BY date DESC
    `
    return data
  })
}

export async function addExpense(expenseData: any) {
  return withTenantAuth(async ({ tenantId }) => {
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`
      INSERT INTO expenses (
        tenant_id, date, category, description, amount, payment_method, vendor, receipt_url, status
      ) VALUES (
        ${tenantId}, ${expenseData.date}, ${expenseData.category}, ${expenseData.description},
        ${expenseData.amount}, ${expenseData.payment_method}, ${expenseData.vendor},
        ${expenseData.receipt_url}, ${expenseData.status || 'completed'}
      )
      RETURNING *
    `
    return result[0]
  })
}

export async function updateExpenseStatus(id: number, status: string) {
  return withTenantAuth(async ({ tenantId }) => {
    const sql = neon(process.env.DATABASE_URL!)
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
  return withTenantAuth(async ({ tenantId }) => {
    const sql = neon(process.env.DATABASE_URL!)
    await sql`
      DELETE FROM expenses 
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `
    return { success: true }
  })
}
