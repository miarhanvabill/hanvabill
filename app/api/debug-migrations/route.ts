import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const results = [];
    
    // Auto-consumption
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS auto_consumption_rules (
          id SERIAL PRIMARY KEY,
          tenant_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          service_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          consumption_amount DECIMAL(10,2) NOT NULL,
          unit VARCHAR(50) NOT NULL,
          trigger_type VARCHAR(50) DEFAULT 'automatic',
          conditions JSONB,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      await sql`
        CREATE TABLE IF NOT EXISTS auto_consumption_logs (
          id SERIAL PRIMARY KEY,
          tenant_id UUID NOT NULL,
          rule_id INTEGER NOT NULL,
          service_booking_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          amount_consumed DECIMAL(10,2) NOT NULL,
          unit VARCHAR(50) NOT NULL,
          cost DECIMAL(10,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'completed',
          triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER
        );
      `;
      results.push('auto_consumption_rules created');
    } catch(e) {
      results.push('auto_consumption_rules error: ' + String(e));
    }
    
    // Commission Profiles
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS commission_profiles (
          id SERIAL PRIMARY KEY,
          tenant_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          commission_type VARCHAR(50) NOT NULL,
          base_rate DECIMAL(10,2) NOT NULL,
          min_threshold DECIMAL(10,2) DEFAULT 0,
          max_threshold DECIMAL(10,2),
          applies_to VARCHAR(50) DEFAULT 'both',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      // Ensure staff table has commission_profile_id
      try {
        await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS commission_profile_id INTEGER REFERENCES commission_profiles(id);`;
      } catch (e) {
        results.push('staff alter error (safe to ignore if exists): ' + String(e));
      }
      
      results.push('commission_profiles created');
    } catch(e) {
      results.push('commission_profiles error: ' + String(e));
    }
    
    // Goals
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS staff_goals (
          id SERIAL PRIMARY KEY,
          tenant_id UUID NOT NULL,
          staff_id INTEGER NOT NULL,
          goal_type VARCHAR(50) NOT NULL,
          target_value DECIMAL(10,2) NOT NULL,
          current_value DECIMAL(10,2) DEFAULT 0,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          reward_amount DECIMAL(10,2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      results.push('staff_goals created');
    } catch(e) {
      results.push('staff_goals error: ' + String(e));
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
