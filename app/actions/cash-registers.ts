"use server"
import { revalidatePath } from "next/cache"
import { format } from "date-fns"
import { withTenantAuth } from "@/lib/withTenantAuth"

export interface CashRegister {
  id: number
  name: string
  location: string
  opening_balance: number
  current_balance: number
  status: string
  current_shift_id?: number | null
  opened_at?: string | null
  expected_balance?: number | null
  created_at: string
  updated_at: string
}

export interface CashTransaction {
  id: number
  register_id: number
  shift_id?: number | null
  register_name?: string
  type: "cash_in" | "cash_out"
  amount: number
  description?: string
  category: string
  reference?: string
  created_at: string
}

export async function getCashRegisters() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Fetching cash registers from database for tenant:", tenantId)

      // Fetch registers with tenant_id filter
      const registersResult = await sql`
        SELECT cr.*, rs.opened_at, rs.expected_balance, rs.notes
        FROM cash_registers cr
        LEFT JOIN register_shifts rs ON cr.current_shift_id = rs.id
        WHERE cr.tenant_id = ${tenantId} 
        ORDER BY cr.name
      `

      // Fetch transactions with proper tenant filtering on both tables
      const transactionsResult = await sql`
        SELECT 
          ct.*,
          cr.name as register_name
        FROM cash_transactions ct
        JOIN cash_registers cr ON ct.register_id = cr.id 
        WHERE ct.tenant_id = ${tenantId} 
          AND cr.tenant_id = ${tenantId}
        ORDER BY ct.created_at DESC
        LIMIT 100
      `

      const registers = Array.isArray(registersResult) ? registersResult : registersResult.rows || []
      const transactions = Array.isArray(transactionsResult) ? transactionsResult : transactionsResult.rows || []

      return {
        registers: registers.map((register) => ({
          ...register,
          id: Number(register.id),
          current_shift_id: register.current_shift_id ? Number(register.current_shift_id) : null,
          opening_balance: Number.parseFloat(register.opening_balance?.toString() || "0"),
          current_balance: Number.parseFloat(register.current_balance?.toString() || "0"),
          expected_balance: register.expected_balance ? Number.parseFloat(register.expected_balance.toString()) : null,
          created_at: register.created_at ? format(new Date(register.created_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
          updated_at: register.updated_at ? format(new Date(register.updated_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
          opened_at: register.opened_at ? format(new Date(register.opened_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : null,
        })) as CashRegister[],
        transactions: transactions.map((transaction) => ({
          ...transaction,
          id: Number(transaction.id),
          register_id: Number(transaction.register_id),
          shift_id: transaction.shift_id ? Number(transaction.shift_id) : null,
          amount: Number.parseFloat(transaction.amount?.toString() || "0"),
          created_at: transaction.created_at ? format(new Date(transaction.created_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        })) as CashTransaction[],
      }
    } catch (error) {
      console.error("[v0] Error fetching cash registers:", error)
      throw new Error("Failed to fetch cash registers")
    }
  })
}

export async function createCashTransaction(data: {
  registerId: number
  type: "cash_in" | "cash_out"
  amount: number
  description?: string
  category: string
  reference?: string
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      console.log("[v0] Creating cash transaction for tenant:", tenantId, "Data:", data)

      // First verify the register belongs to this tenant and get shift
      const registerCheck = await sql`
        SELECT id, current_shift_id FROM cash_registers 
        WHERE id = ${data.registerId} AND tenant_id = ${tenantId}
      `

      if (!registerCheck || registerCheck.length === 0) {
        return { 
          success: false, 
          message: "Cash register not found or access denied" 
        }
      }

      const current_shift_id = registerCheck[0].current_shift_id || registerCheck.rows?.[0]?.current_shift_id || null;

      // Insert transaction with tenant_id and shift_id
      const transactionResult = await sql`
        INSERT INTO cash_transactions 
          (register_id, type, amount, description, category, reference, tenant_id, shift_id, created_at)
        VALUES 
          (${data.registerId}, ${data.type}, ${data.amount}, ${data.description || null}, 
           ${data.category}, ${data.reference || null}, ${tenantId}, ${current_shift_id}, CURRENT_TIMESTAMP)
        RETURNING id
      `

      // Update register balance
      const balanceChange = data.type === "cash_in" ? data.amount : -data.amount
      const updateResult = await sql`
        UPDATE cash_registers 
        SET current_balance = current_balance + ${balanceChange},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${data.registerId} AND tenant_id = ${tenantId}
        RETURNING current_balance
      `
      
      if (current_shift_id) {
         // Also update expected_balance in shift
         await sql`
           UPDATE register_shifts
           SET expected_balance = expected_balance + ${balanceChange}
           WHERE id = ${current_shift_id} AND tenant_id = ${tenantId}
         `
      }

      revalidatePath("/cash-registers")
      return { 
        success: true, 
        message: "Transaction recorded successfully!",
        transactionId: transactionResult[0]?.id || transactionResult.rows?.[0]?.id,
        newBalance: updateResult[0]?.current_balance || updateResult.rows?.[0]?.current_balance
      }
    } catch (error) {
      console.error("[v0] Error creating cash transaction:", error)
      return { 
        success: false, 
        message: "Failed to record transaction. Please try again." 
      }
    }
  })
}

export async function getCashRegisterById(registerId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const [register] = await sql`
        SELECT * FROM cash_registers 
        WHERE id = ${registerId} AND tenant_id = ${tenantId}
      `

      if (!register) {
        return null
      }

      return {
        ...register,
        id: Number(register.id),
        opening_balance: Number.parseFloat(register.opening_balance?.toString() || "0"),
        current_balance: Number.parseFloat(register.current_balance?.toString() || "0"),
        created_at: register.created_at ? format(new Date(register.created_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        updated_at: register.updated_at ? format(new Date(register.updated_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      } as CashRegister
    } catch (error) {
      console.error("[v0] Error fetching cash register:", error)
      return null
    }
  })
}

export async function getRegisterTransactions(registerId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const transactions = await sql`
        SELECT 
          ct.*,
          cr.name as register_name
        FROM cash_transactions ct
        JOIN cash_registers cr ON ct.register_id = cr.id 
        WHERE ct.register_id = ${registerId} 
          AND ct.tenant_id = ${tenantId}
          AND cr.tenant_id = ${tenantId}
        ORDER BY ct.created_at DESC
        LIMIT 50
      `

      return transactions.map((transaction) => ({
        ...transaction,
        id: Number(transaction.id),
        register_id: Number(transaction.register_id),
        amount: Number.parseFloat(transaction.amount?.toString() || "0"),
        created_at: transaction.created_at ? format(new Date(transaction.created_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      })) as CashTransaction[]
    } catch (error) {
      console.error("[v0] Error fetching register transactions:", error)
      return []
    }
  })
}

export async function openRegister(registerId: number, openingBalance: number, notes?: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const registerCheck = await sql`
        SELECT id, current_shift_id FROM cash_registers 
        WHERE id = ${registerId} AND tenant_id = ${tenantId}
      `
      
      const reg = Array.isArray(registerCheck) ? registerCheck[0] : registerCheck.rows?.[0];
      if (!reg) return { success: false, message: "Register not found" }
      if (reg.current_shift_id) return { success: false, message: "Register is already open" }

      const shiftResult = await sql`
        INSERT INTO register_shifts (register_id, tenant_id, opening_balance, expected_balance, notes)
        VALUES (${registerId}, ${tenantId}, ${openingBalance}, ${openingBalance}, ${notes || null})
        RETURNING id
      `
      const shiftId = Array.isArray(shiftResult) ? shiftResult[0]?.id : shiftResult.rows?.[0]?.id;

      await sql`
        UPDATE cash_registers 
        SET current_shift_id = ${shiftId}, current_balance = ${openingBalance}, opening_balance = ${openingBalance}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${registerId} AND tenant_id = ${tenantId}
      `
      
      revalidatePath("/cash-registers")
      return { success: true, message: "Register opened successfully" }
    } catch (e) {
      console.error(e)
      throw new Error("Failed to open register")
    }
  })
}

export async function closeRegister(registerId: number, actualBalance: number, notes?: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const registerCheck = await sql`
        SELECT id, current_shift_id, current_balance FROM cash_registers 
        WHERE id = ${registerId} AND tenant_id = ${tenantId}
      `
      const reg = Array.isArray(registerCheck) ? registerCheck[0] : registerCheck.rows?.[0];
      if (!reg) return { success: false, message: "Register not found" }
      if (!reg.current_shift_id) return { success: false, message: "Register is not open" }
      
      const expectedBalance = Number(reg.current_balance)
      const discrepancy = actualBalance - expectedBalance

      await sql`
        UPDATE register_shifts
        SET closed_at = CURRENT_TIMESTAMP, actual_balance = ${actualBalance}, discrepancy = ${discrepancy}, notes = COALESCE(notes || '\n', '') || ${notes || ''}
        WHERE id = ${reg.current_shift_id} AND tenant_id = ${tenantId}
      `

      await sql`
        UPDATE cash_registers 
        SET current_shift_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${registerId} AND tenant_id = ${tenantId}
      `

      revalidatePath("/cash-registers")
      return { success: true, message: "Register closed successfully" }
    } catch (e) {
      console.error(e)
      throw new Error("Failed to close register")
    }
  })
}

export async function payIn(registerId: number, amount: number, description: string, category: string, reference?: string) {
  return createCashTransaction({ registerId, type: "cash_in", amount, description, category, reference })
}

export async function payOut(registerId: number, amount: number, description: string, category: string, reference?: string) {
  return createCashTransaction({ registerId, type: "cash_out", amount, description, category, reference })
}
