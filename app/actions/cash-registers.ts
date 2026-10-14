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
        registers: registers.map((register: any) => ({
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
        transactions: transactions.map((transaction: any) => ({
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

      return transactions.map((transaction: any) => ({
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

export async function openRegister(
  registerId: number,
  openingBalance: number,
  notes?: string,
  denominations?: Record<string, number>
) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const registerCheck = await sql`
        SELECT id, current_shift_id FROM cash_registers 
        WHERE id = ${registerId} AND tenant_id = ${tenantId}
      `
      
      const reg = Array.isArray(registerCheck) ? registerCheck[0] : registerCheck.rows?.[0];
      if (!reg) return { success: false, message: "Register not found" }
      if (reg.current_shift_id) return { success: false, message: "Register is already open" }

      let denominationSummary = ""
      if (denominations && Object.keys(denominations).length > 0) {
        const parts = Object.entries(denominations)
          .filter(([_, count]) => count > 0)
          .map(([denom, count]) => `₹${denom}×${count}`)
        if (parts.length > 0) {
          denominationSummary = `[Opening Denominations: ${parts.join(", ")}]`
        }
      }
      const initialNotes = [notes, denominationSummary].filter(Boolean).join(" | ")

      const shiftResult = await sql`
        INSERT INTO register_shifts (register_id, tenant_id, opening_balance, expected_balance, notes)
        VALUES (${registerId}, ${tenantId}, ${openingBalance}, ${openingBalance}, ${initialNotes || null})
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
    } catch (e: any) {
      console.error(e)
      return { success: false, message: e.message || "Failed to open register" }
    }
  })
}

export async function closeRegister(
  registerId: number,
  actualBalance: number,
  notes?: string,
  denominations?: Record<string, number>
) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const registerCheck = await sql`
        SELECT id, current_shift_id, current_balance FROM cash_registers 
        WHERE id = ${registerId} AND tenant_id = ${tenantId}
      `
      const reg = Array.isArray(registerCheck) ? registerCheck[0] : registerCheck.rows?.[0];
      if (!reg) return { success: false, message: "Register not found" }
      if (!reg.current_shift_id) return { success: false, message: "Register is not open" }
      
      const expectedBalance = Number(reg.current_balance) || 0
      const discrepancy = Number((actualBalance - expectedBalance).toFixed(2))

      let denominationSummary = ""
      if (denominations && Object.keys(denominations).length > 0) {
        const parts = Object.entries(denominations)
          .filter(([_, count]) => count > 0)
          .map(([denom, count]) => `₹${denom}×${count}`)
        if (parts.length > 0) {
          denominationSummary = `[Closing Denominations: ${parts.join(", ")}]`
        }
      }

      const closeNotes = [notes, denominationSummary].filter(Boolean).join(" | ")

      await sql`
        UPDATE register_shifts
        SET closed_at = CURRENT_TIMESTAMP,
            actual_balance = ${actualBalance},
            discrepancy = ${discrepancy},
            notes = CASE 
              WHEN notes IS NOT NULL AND notes != '' AND ${closeNotes} != '' 
                THEN notes || E'\n' || ${closeNotes}
              WHEN ${closeNotes} != '' 
                THEN ${closeNotes}
              ELSE notes
            END
        WHERE id = ${reg.current_shift_id} AND tenant_id = ${tenantId}
      `

      await sql`
        UPDATE cash_registers 
        SET current_shift_id = NULL, current_balance = ${actualBalance}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${registerId} AND tenant_id = ${tenantId}
      `

      revalidatePath("/cash-registers")
      const discrepancyMsg = discrepancy === 0 
        ? "Drawer balanced perfectly (₹0 variance)." 
        : `Discrepancy: ${discrepancy > 0 ? '+' : ''}₹${discrepancy.toFixed(2)}.`
      return { success: true, message: `Register closed successfully. ${discrepancyMsg}` }
    } catch (e: any) {
      console.error(e)
      return { success: false, message: e.message || "Failed to close register" }
    }
  })
}

export async function getShiftHistory(registerId?: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const shiftsResult = registerId
        ? await sql`
            SELECT rs.*, cr.name as register_name
            FROM register_shifts rs
            JOIN cash_registers cr ON rs.register_id = cr.id AND cr.tenant_id = ${tenantId}
            WHERE rs.tenant_id = ${tenantId} AND rs.register_id = ${registerId}
            ORDER BY rs.opened_at DESC
            LIMIT 50
          `
        : await sql`
            SELECT rs.*, cr.name as register_name
            FROM register_shifts rs
            JOIN cash_registers cr ON rs.register_id = cr.id AND cr.tenant_id = ${tenantId}
            WHERE rs.tenant_id = ${tenantId}
            ORDER BY rs.opened_at DESC
            LIMIT 50
          `
      const shifts = Array.isArray(shiftsResult) ? shiftsResult : (shiftsResult as any).rows || []
      return shifts.map((s: any) => ({
        id: Number(s.id),
        register_id: Number(s.register_id),
        register_name: s.register_name,
        opened_at: s.opened_at ? format(new Date(s.opened_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : null,
        closed_at: s.closed_at ? format(new Date(s.closed_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : null,
        opening_balance: Number.parseFloat(s.opening_balance?.toString() || "0"),
        expected_balance: s.expected_balance ? Number.parseFloat(s.expected_balance.toString()) : null,
        actual_balance: s.actual_balance ? Number.parseFloat(s.actual_balance.toString()) : null,
        discrepancy: s.discrepancy ? Number.parseFloat(s.discrepancy.toString()) : 0,
        notes: s.notes || "",
      }))
    } catch (error) {
      console.error("Error fetching shift history:", error)
      return []
    }
  })
}

export async function payIn(registerId: number, amount: number, description: string, category: string, reference?: string) {
  return createCashTransaction({ registerId, type: "cash_in", amount, description, category, reference })
}

export async function payOut(registerId: number, amount: number, description: string, category: string, reference?: string) {
  return createCashTransaction({ registerId, type: "cash_out", amount, description, category, reference })
}
