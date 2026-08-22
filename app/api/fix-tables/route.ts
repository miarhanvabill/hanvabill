import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const results = [];
    
    // Commission Profiles
    await sql`
      CREATE TABLE IF NOT EXISTS commission_profiles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('percentage', 'fixed', 'tiered')),
          base_rate NUMERIC(10,2) DEFAULT 0,
          min_threshold NUMERIC(10,2) DEFAULT 0,
          max_threshold NUMERIC(10,2) DEFAULT 0,
          applies_to VARCHAR(20) NOT NULL CHECK (applies_to IN ('services', 'products', 'both')),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1
      )
    `;
    results.push("commission_profiles ensured");

    await sql`ALTER TABLE commission_profiles ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1`;

    await sql`
      CREATE TABLE IF NOT EXISTS commission_tiers (
          id SERIAL PRIMARY KEY,
          profile_id INTEGER REFERENCES commission_profiles(id) ON DELETE CASCADE,
          min_amount NUMERIC(10,2) NOT NULL,
          max_amount NUMERIC(10,2) NOT NULL,
          rate NUMERIC(5,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1
      )
    `;
    results.push("commission_tiers ensured");
    
    await sql`ALTER TABLE commission_tiers ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1`;

    // Try adding commission_profile_id to staff
    try {
      await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS commission_profile_id INTEGER REFERENCES commission_profiles(id)`;
    } catch (e: any) {
      results.push("staff commission_profile_id: " + e.message);
    }

    // Auto Consumption Rules
    await sql`
      CREATE TABLE IF NOT EXISTS auto_consumption_rules (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          consumption_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
          unit VARCHAR(50) NOT NULL DEFAULT 'ml',
          is_active BOOLEAN NOT NULL DEFAULT true,
          trigger_type VARCHAR(20) NOT NULL DEFAULT 'automatic',
          conditions JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER REFERENCES staff(id),
          updated_by INTEGER REFERENCES staff(id),
          tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1
      )
    `;
    results.push("auto_consumption_rules ensured");
    
    await sql`ALTER TABLE auto_consumption_rules ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1`;

    // Auto Consumption Logs
    await sql`
      CREATE TABLE IF NOT EXISTS auto_consumption_logs (
          id SERIAL PRIMARY KEY,
          rule_id INTEGER REFERENCES auto_consumption_rules(id) ON DELETE CASCADE,
          service_booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          amount_consumed DECIMAL(10,2) NOT NULL DEFAULT 0,
          unit VARCHAR(50) NOT NULL DEFAULT 'ml',
          cost DECIMAL(10,2) NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'completed',
          triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP,
          error_message TEXT,
          created_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
          tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1
      )
    `;
    results.push("auto_consumption_logs ensured");
    
    await sql`ALTER TABLE auto_consumption_logs ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1`;

    // Auto Consumption Stats
    await sql`
      CREATE TABLE IF NOT EXISTS auto_consumption_stats (
          id SERIAL PRIMARY KEY,
          rule_id INTEGER REFERENCES auto_consumption_rules(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          total_consumptions INTEGER DEFAULT 0,
          total_amount DECIMAL(10,2) DEFAULT 0,
          total_cost DECIMAL(10,2) DEFAULT 0,
          avg_consumption_per_service DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1,
          UNIQUE(rule_id, date)
      )
    `;
    results.push("auto_consumption_stats ensured");

    await sql`ALTER TABLE auto_consumption_stats ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1`;

    // Staff Goals
    await sql`
      CREATE TABLE IF NOT EXISTS staff_goals (
          id SERIAL PRIMARY KEY,
          staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
          goal_type VARCHAR(50) NOT NULL,
          target_value DECIMAL(10,2) NOT NULL,
          current_value DECIMAL(10,2) DEFAULT 0,
          period_type VARCHAR(20) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          reward_amount DECIMAL(10,2) DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          is_achieved BOOLEAN DEFAULT false,
          achievement_date TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1
      )
    `;
    results.push("staff_goals ensured");
    
    await sql`ALTER TABLE staff_goals ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1`;

    // Business Resources
    await sql`
      CREATE TABLE IF NOT EXISTS business_resources (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          description TEXT,
          capacity INTEGER DEFAULT 1,
          status VARCHAR(20) DEFAULT 'available',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1
      )
    `;
    results.push("business_resources ensured");
    await sql`ALTER TABLE business_resources ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1`;

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
