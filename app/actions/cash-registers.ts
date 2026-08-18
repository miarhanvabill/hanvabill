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
  created_at: string
  updated_at: string
}

export interface CashTransaction {
  id: number
  register_id: number
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
    // Return sample data when database is not available (fallback-first approach)
    const fallbackData = {
      registers: [
        {
          id: 1,
          name: "Main Counter",
          location: "Front Desk",
          opening_balance: 50000.0,
          current_balance: 125000.0,
          status: "active",
          created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
          updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        },
        {
          id: 2,
          name: "Service Counter",
          location: "Service Area",
          opening_balance: 20000.0,
          current_balance: 37500.0,
          status: "active",
          created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
          updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        },
      ] as CashRegister[],
      transactions: [
        {
          id: 1,
          register_id: 1,
          register_name: "Main Counter",
          type: "cash_in" as const,
          amount: 5000.0,
          description: "Hair cut service",
          category: "sales",
          reference: "#13642260",
          created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        },
        {
          id: 2,
          register_id: 1,
          register_name: "Main Counter",
          type: "cash_out" as const,
          amount: 1500.0,
          description: "Office supplies",
          category: "expense",
          reference: "EXP001",
          created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        },
        {
          id: 3,
          register_id: 2,
          register_name: "Service Counter",
          type: "cash_in" as const,
          amount: 3000.0,
          description: "Massage service",
          category: "sales",
          reference: "#13642261",
          created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        },
      ] as CashTransaction[],
    }

    try {
      console.log("[v0] Fetching cash registers from database for tenant:", tenantId)
      
      // Fetch registers with tenant_id filter
      const registersResult = await sql`
        SELECT * FROM cash_registers 
        WHERE tenant_id = ${tenantId} 
        ORDER BY name
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

      console.log("[v0] Raw registers result:", registersResult)
      console.log("[v0] Raw transactions result:", transactionsResult)

      // Handle different result formats from Neon
      const registers = Array.isArray(registersResult) ? registersResult : registersResult.rows || []
      const transactions = Array.isArray(transactionsResult) ? transactionsResult : transactionsResult.rows || []

      console.log("[v0] Processed registers:", registers.length)
      console.log("[v0] Processed transactions:", transactions.length)

      // If no data found in database, return fallback data
      if (registers.length === 0 && transactions.length === 0) {
        console.log("[v0] No data found in database, using fallback data")
        return fallbackData
      }

      return {
        registers: registers.map((register) => ({
          ...register,
          id: Number(register.id),
          opening_balance: Number.parseFloat(register.opening_balance?.toString() || "0"),
          current_balance: Number.parseFloat(register.current_balance?.toString() || "0"),
          created_at: register.created_at ? format(new Date(register.created_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
          updated_at: register.updated_at ? format(new Date(register.updated_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        })) as CashRegister[],
        transactions: transactions.map((transaction) => ({
          ...transaction,
          id: Number(transaction.id),
          register_id: Number(transaction.register_id),
          amount: Number.parseFloat(transaction.amount?.toString() || "0"),
          created_at: transaction.created_at ? format(new Date(transaction.created_at), "yyyy-MM-dd'T'HH:mm:ssxxx") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        })) as CashTransaction[],
      }
    } catch (error) {
      console.error("[v0] Error fetching cash registers:", error)
      return fallbackData
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

      // First verify the register belongs to this tenant
      const registerCheck = await sql`
        SELECT id FROM cash_registers 
        WHERE id = ${data.registerId} AND tenant_id = ${tenantId}
      `

      if (!registerCheck || registerCheck.length === 0) {
        console.error("[v0] Register not found or access denied for tenant:", tenantId)
        return { 
          success: false, 
          message: "Cash register not found or access denied" 
        }
      }

      // Insert transaction with tenant_id
      const transactionResult = await sql`
        INSERT INTO cash_transactions 
          (register_id, type, amount, description, category, reference, tenant_id, created_at)
        VALUES 
          (${data.registerId}, ${data.type}, ${data.amount}, ${data.description || null}, 
           ${data.category}, ${data.reference || null}, ${tenantId}, CURRENT_TIMESTAMP)
        RETURNING id
      `

      // Update register balance with tenant filtering
      const balanceChange = data.type === "cash_in" ? data.amount : -data.amount
      const updateResult = await sql`
        UPDATE cash_registers 
        SET current_balance = current_balance + ${balanceChange},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${data.registerId} AND tenant_id = ${tenantId}
        RETURNING current_balance
      `

      console.log("[v0] Transaction created successfully. ID:", transactionResult[0]?.id)
      console.log("[v0] New register balance:", updateResult[0]?.current_balance)

      revalidatePath("/cash-registers")
      return { 
        success: true, 
        message: "Transaction recorded successfully!",
        transactionId: transactionResult[0]?.id,
        newBalance: updateResult[0]?.current_balance
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
