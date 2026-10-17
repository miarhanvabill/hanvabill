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

export interface ZReportData {
  shiftId: number
  registerName: string
  registerLocation: string
  openedAt: string
  closedAt: string
  openingBalance: number
  expectedBalance: number
  actualBalance: number
  discrepancy: number
  notes: string
  denominations: Record<string, number>
  cashSales: number
  cashPayIns: number
  cashPayOuts: number
  nonCashSales: {
    card: number
    upi: number
    other: number
    total: number
  }
  totalRevenue: number
  transactionsCount: number
  business: {
    name: string
    address: string
    phone: string
    gstin: string
  }
}

export async function ensureCashRegisterSchema(sql: any, tenantId: string) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS cash_registers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        opening_balance DECIMAL(10,2) DEFAULT 0,
        current_balance DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        tenant_id VARCHAR(100) DEFAULT '1',
        current_shift_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
    await sql`
      CREATE TABLE IF NOT EXISTS register_shifts (
        id SERIAL PRIMARY KEY,
        register_id INTEGER,
        tenant_id VARCHAR(100) NOT NULL,
        opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        opening_balance DECIMAL(10,2) NOT NULL,
        expected_balance DECIMAL(10,2),
        actual_balance DECIMAL(10,2),
        discrepancy DECIMAL(10,2),
        notes TEXT
      );
    `
    await sql`
      CREATE TABLE IF NOT EXISTS cash_transactions (
        id SERIAL PRIMARY KEY,
        register_id INTEGER,
        shift_id INTEGER,
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        reference VARCHAR(100),
        tenant_id VARCHAR(100) DEFAULT '1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `

    // Ensure compatible column types
    await sql`ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT '1'`.catch(() => {})
    await sql`ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS current_shift_id INTEGER`.catch(() => {})
    await sql`ALTER TABLE cash_registers ALTER COLUMN tenant_id TYPE VARCHAR(100)`.catch(() => {})

    await sql`ALTER TABLE register_shifts ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100)`.catch(() => {})
    await sql`ALTER TABLE register_shifts ALTER COLUMN tenant_id TYPE VARCHAR(100)`.catch(() => {})

    await sql`ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT '1'`.catch(() => {})
    await sql`ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS shift_id INTEGER`.catch(() => {})
    await sql`ALTER TABLE cash_transactions ALTER COLUMN tenant_id TYPE VARCHAR(100)`.catch(() => {})

    await sql`CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant ON cash_registers(tenant_id)`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_register_shifts_tenant ON register_shifts(tenant_id, register_id)`.catch(() => {})
    await sql`CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant ON cash_transactions(tenant_id, register_id)`.catch(() => {})
  } catch (err) {
    console.error("[Cash Registers] Error ensuring schema:", err)
  }
}

export async function createCashRegister(data: {
  name: string
  location?: string
  openingBalance?: number
}) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureCashRegisterSchema(sql, tenantId)
      const name = data.name?.trim() || "Main Cash Drawer"
      const location = data.location?.trim() || "Front Desk"
      const openingBalance = Math.max(0, Number(data.openingBalance) || 0)

      const rows = await sql`
        INSERT INTO cash_registers (tenant_id, name, location, opening_balance, current_balance, status)
        VALUES (${tenantId}, ${name}, ${location}, ${openingBalance}, ${openingBalance}, 'active')
        RETURNING *
      `
      revalidatePath("/cash-registers")
      return { success: true, register: rows[0] }
    } catch (e: any) {
      console.error("Error creating cash register:", e)
      return { success: false, message: e.message || "Failed to create cash register" }
    }
  })
}

export async function getCashRegisters() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureCashRegisterSchema(sql, tenantId)

      // Fetch registers with tenant_id filter
      let registersResult = await sql`
        SELECT cr.*, rs.opened_at, rs.expected_balance, rs.notes
        FROM cash_registers cr
        LEFT JOIN register_shifts rs ON cr.current_shift_id = rs.id
        WHERE cr.tenant_id = ${tenantId} 
        ORDER BY cr.name
      `

      // AUTO-PROVISION: If no registers exist for this tenant, create default "Main Cash Drawer"
      if (!registersResult || registersResult.length === 0) {
        await sql`
          INSERT INTO cash_registers (tenant_id, name, location, opening_balance, current_balance, status)
          VALUES (${tenantId}, 'Main Cash Drawer', 'Front Desk', 0, 0, 'active')
        `.catch(() => {})

        registersResult = await sql`
          SELECT cr.*, rs.opened_at, rs.expected_balance, rs.notes
          FROM cash_registers cr
          LEFT JOIN register_shifts rs ON cr.current_shift_id = rs.id
          WHERE cr.tenant_id = ${tenantId} 
          ORDER BY cr.name
        `.catch(() => [])
      }

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
      return {
        success: true,
        message: `Register closed successfully. ${discrepancyMsg}`,
        shiftId: Number(reg.current_shift_id),
        discrepancy,
      }
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

export async function getZReportData(shiftId: number): Promise<ZReportData | null> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureCashRegisterSchema(sql, tenantId)

      // 1. Fetch shift record with register info
      const shiftRows = await sql`
        SELECT rs.*, cr.name as register_name, cr.location as register_location
        FROM register_shifts rs
        JOIN cash_registers cr ON rs.register_id = cr.id AND cr.tenant_id = ${tenantId}
        WHERE rs.id = ${shiftId} AND rs.tenant_id = ${tenantId}
        LIMIT 1
      `
      if (!shiftRows || shiftRows.length === 0) return null
      const shift = shiftRows[0]

      // 2. Fetch all cash transactions for this shift
      const txRows = await sql`
        SELECT type, category, amount, description
        FROM cash_transactions
        WHERE shift_id = ${shiftId} AND tenant_id = ${tenantId}
      `.catch(() => [])

      let cashSales = 0
      let cashPayIns = 0
      let cashPayOuts = 0

      for (const tx of txRows) {
        const amt = Number(tx.amount) || 0
        if (tx.type === "cash_in") {
          if (tx.category === "sales") cashSales += amt
          else cashPayIns += amt
        } else if (tx.type === "cash_out") {
          cashPayOuts += amt
        }
      }

      // 3. Fetch invoices during the shift period for non-cash sales
      const openedAt = shift.opened_at
      const closedAt = shift.closed_at || new Date().toISOString()

      const invRows = await sql`
        SELECT payment_method, amount
        FROM invoices
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${openedAt}
          AND created_at <= ${closedAt}
      `.catch(() => [])

      let cardSales = 0
      let upiSales = 0
      let otherSales = 0
      let totalRev = 0

      for (const inv of invRows) {
        const amt = Number(inv.amount) || 0
        totalRev += amt
        const method = (inv.payment_method || "").toLowerCase()
        if (method.includes("card")) cardSales += amt
        else if (method.includes("upi")) upiSales += amt
        else if (!method.includes("cash")) otherSales += amt
      }

      // 4. Parse denominations from notes if saved
      const denominations: Record<string, number> = {}
      if (shift.notes) {
        const match = shift.notes.match(/\[Closing Denominations:\s*([^\]]+)\]/)
        if (match && match[1]) {
          const parts = match[1].split(",")
          for (const p of parts) {
            const m = p.trim().match(/₹?(\d+)×(\d+)/)
            if (m) {
              denominations[m[1]] = parseInt(m[2], 10)
            }
          }
        }
      }

      // 5. Fetch salon store settings
      let salonName = "Hanva Salon"
      let salonAddress = ""
      let salonPhone = ""
      let salonGst = ""

      const settingsRows = await sql`
        SELECT setting_key, setting_value
        FROM store_settings
        WHERE tenant_id = ${tenantId}
      `.catch(() => [])

      for (const row of settingsRows) {
        if (row.setting_key === "profile.salonName" && row.setting_value) salonName = row.setting_value
        if (row.setting_key === "profile.address" && row.setting_value) salonAddress = row.setting_value
        if (row.setting_key === "profile.phone" && row.setting_value) salonPhone = row.setting_value
        if (row.setting_key === "profile.gstNumber" && row.setting_value) salonGst = row.setting_value
      }

      const openingBalance = Number(shift.opening_balance || 0)
      const expectedBalance = shift.expected_balance !== null
        ? Number(shift.expected_balance)
        : Number((openingBalance + cashSales + cashPayIns - cashPayOuts).toFixed(2))

      return {
        shiftId: Number(shift.id),
        registerName: shift.register_name || "Main Cash Drawer",
        registerLocation: shift.register_location || "Front Desk",
        openedAt: shift.opened_at ? format(new Date(shift.opened_at), "yyyy-MM-dd HH:mm:ss") : "",
        closedAt: shift.closed_at ? format(new Date(shift.closed_at), "yyyy-MM-dd HH:mm:ss") : format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        openingBalance,
        expectedBalance,
        actualBalance: Number(shift.actual_balance || 0),
        discrepancy: Number(shift.discrepancy || 0),
        notes: shift.notes || "",
        denominations,
        cashSales,
        cashPayIns,
        cashPayOuts,
        nonCashSales: {
          card: cardSales,
          upi: upiSales,
          other: otherSales,
          total: cardSales + upiSales + otherSales,
        },
        totalRevenue: totalRev,
        transactionsCount: txRows.length,
        business: {
          name: salonName,
          address: salonAddress,
          phone: salonPhone,
          gstin: salonGst,
        },
      }
    } catch (e) {
      console.error("Error generating Z-Report data:", e)
      return null
    }
  })
}
