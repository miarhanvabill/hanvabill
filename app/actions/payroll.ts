"use server"
import { unstable_noStore as noStore } from "next/cache"
import { withTenantAuth } from '@/lib/withTenantAuth'
import { neon } from "@neondatabase/serverless"

export async function generatePayrollRun(periodStart: string, periodEnd: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // 1. Create payroll_run record
      const [run] = await sql`
        INSERT INTO payroll_runs (tenant_id, period_start, period_end, status)
        VALUES (${tenantId}, ${periodStart}, ${periodEnd}, 'draft')
        RETURNING *
      `;
      
      // 2. Fetch active staff for the tenant
      const staffList = await sql`SELECT * FROM staff WHERE is_active = true AND tenant_id = ${tenantId}`;
      
      // 3. For each staff, calculate pay and create entry
      for (const staff of staffList) {
        // Calculate commissions
        const splits = await sql`
          SELECT SUM(revenue_amount) as total_revenue
          FROM staff_commission_splits s
          JOIN invoices i ON s.invoice_id = i.id
          WHERE s.staff_id = ${staff.id} 
          AND i.invoice_date >= ${periodStart} 
          AND i.invoice_date <= ${periodEnd}
          AND s.tenant_id = ${tenantId}
        `;
        
        const totalRevenue = parseFloat(splits[0]?.total_revenue || "0");
        const commission = totalRevenue * 0.10; // Simple 10% commission
        const basePay = parseFloat(staff.salary || "0");
        const totalPay = basePay + commission;

        await sql`
          INSERT INTO payroll_entries (run_id, staff_id, base_pay, commission_pay, total_pay)
          VALUES (${run.id}, ${staff.id}, ${basePay}, ${commission}, ${totalPay})
        `;
      }
      
      return { success: true, run_id: run.id };
    } catch (err: any) {
      console.error("Generate payroll error:", err);
      return { success: false, message: err.message || "Failed to generate payroll run" };
    }
  });
}

export async function getPayrollRuns() {
  noStore();
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const runs = await sql`
        SELECT * FROM payroll_runs 
        WHERE tenant_id = ${tenantId} 
        ORDER BY period_start DESC
      `;
      return { success: true, runs };
    } catch (err: any) {
      return { success: false, runs: [], message: err.message };
    }
  });
}

export async function getPayrollRunDetails(runId: number) {
  noStore();
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const [run] = await sql`
        SELECT * FROM payroll_runs 
        WHERE id = ${runId} AND tenant_id = ${tenantId}
      `;
      if (!run) return { success: false, message: "Run not found" };

      const entries = await sql`
        SELECT pe.*, s.name as staff_name 
        FROM payroll_entries pe
        JOIN staff s ON pe.staff_id = s.id
        WHERE pe.run_id = ${runId}
      `;
      
      return { success: true, run, entries };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  });
}

export async function updatePayrollEntry(entryId: number, bonuses: number, deductions: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // First, get the current entry to ensure it belongs to the tenant's run
      const [entry] = await sql`
        SELECT pe.* 
        FROM payroll_entries pe
        JOIN payroll_runs pr ON pe.run_id = pr.id
        WHERE pe.id = ${entryId} AND pr.tenant_id = ${tenantId}
      `;

      if (!entry) return { success: false, message: "Entry not found" };

      const totalPay = parseFloat(entry.base_pay) + parseFloat(entry.commission_pay) + bonuses - deductions;

      await sql`
        UPDATE payroll_entries 
        SET bonuses = ${bonuses}, deductions = ${deductions}, total_pay = ${totalPay}
        WHERE id = ${entryId}
      `;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  });
}

export async function finalizePayrollRun(runId: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await sql`
        UPDATE payroll_runs 
        SET status = 'completed'
        WHERE id = ${runId} AND tenant_id = ${tenantId}
      `;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  });
}
