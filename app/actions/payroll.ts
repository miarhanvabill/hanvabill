"use server"
import { unstable_noStore as noStore } from "next/cache"
import { withTenantAuth } from '@/lib/withTenantAuth'

export async function generatePayrollRun(periodStart: string, periodEnd: string) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Ensure payroll tables exist
      await sql`
        CREATE TABLE IF NOT EXISTS payroll_runs (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'draft',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `.catch(() => {})

      await sql`
        CREATE TABLE IF NOT EXISTS payroll_entries (
          id SERIAL PRIMARY KEY,
          run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
          staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
          base_pay DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          commission_pay DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          bonuses DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          deductions DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          total_pay DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `.catch(() => {})

      // 1. Create payroll_run record
      const [run] = await sql`
        INSERT INTO payroll_runs (tenant_id, period_start, period_end, status)
        VALUES (${tenantId}, ${periodStart}, ${periodEnd}, 'draft')
        RETURNING *
      `;
      
      // 2. Fetch active staff for the tenant with their commission profiles
      const staffList = await sql`
        SELECT s.*, cp.commission_type, cp.base_rate 
        FROM staff s
        LEFT JOIN commission_profiles cp ON s.commission_profile_id = cp.id
        WHERE s.is_active = true AND s.tenant_id = ${tenantId}
      `;

      // 2.5 Pre-fetch all commission tiers for the relevant profiles
      const profileIds = (staffList as any[])
        .filter((s: any) => s.commission_type === 'tiered' && s.commission_profile_id)
        .map((s: any) => s.commission_profile_id);
      
      const uniqueProfileIds = [...new Set(profileIds)];
      const tiersMap = new Map();
      
      if (uniqueProfileIds.length > 0) {
        const allTiers = await sql`
          SELECT * FROM commission_tiers 
          WHERE profile_id = ANY(${uniqueProfileIds}) 
          ORDER BY min_amount ASC
        `;
        
        for (const tier of allTiers) {
          if (!tiersMap.has(tier.profile_id)) {
            tiersMap.set(tier.profile_id, []);
          }
          tiersMap.get(tier.profile_id).push(tier);
        }
      }
      
      // 3. For each staff, calculate pay and create entry
      for (const staff of staffList) {
        // Calculate commissions
        const splits = await sql`
          SELECT SUM(revenue_amount) as total_revenue, COUNT(s.id) as split_count
          FROM staff_commission_splits s
          JOIN invoices i ON s.invoice_id = i.id
          WHERE s.staff_id = ${staff.id} 
          AND i.invoice_date >= ${periodStart} 
          AND i.invoice_date <= ${periodEnd}
          AND s.tenant_id = ${tenantId}
        `;
        
        const totalRevenue = parseFloat(splits[0]?.total_revenue || "0");
        const splitCount = parseInt(splits[0]?.split_count || "0");
        
        let commission = 0;
        
        if (staff.commission_profile_id && staff.commission_type) {
          const baseRate = parseFloat(staff.base_rate || "0");
          
          if (staff.commission_type === 'percentage') {
            commission = totalRevenue * (baseRate / 100);
          } else if (staff.commission_type === 'fixed') {
            commission = splitCount * baseRate;
          } else if (staff.commission_type === 'tiered') {
            const tiers = tiersMap.get(staff.commission_profile_id) || [];
            
            if (tiers.length > 0) {
              for (const tier of tiers) {
                const min = parseFloat(tier.min_amount);
                const max = parseFloat(tier.max_amount);
                const rate = parseFloat(tier.rate);
                
                if (totalRevenue > min) {
                  const applicableRevenue = Math.min(totalRevenue, max) - min;
                  commission += applicableRevenue * (rate / 100);
                }
              }
            } else {
              commission = totalRevenue * (baseRate / 100);
            }
          }
        } else if (staff.commission_rate && parseFloat(staff.commission_rate) > 0) {
          const staffRate = parseFloat(staff.commission_rate);
          commission = totalRevenue * (staffRate / 100);
        }
        
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
      await sql`
        CREATE TABLE IF NOT EXISTS payroll_runs (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'draft',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `.catch(() => {})

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
        JOIN staff s ON pe.staff_id = s.id AND s.tenant_id = ${tenantId}
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
