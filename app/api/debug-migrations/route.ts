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
      results.push('auto_consumption_rules ready');
    } catch(e) {
      results.push('auto_consumption_rules error: ' + String(e));
    }
    
    try {
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
      results.push('auto_consumption_logs ready');
    } catch(e) {
      results.push('auto_consumption_logs error: ' + String(e));
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
      
      try {
        await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS commission_profile_id INTEGER REFERENCES commission_profiles(id);`;
        await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS avatar_url TEXT;`;
      } catch (e) {
        results.push('staff alter error (safe to ignore if exists): ' + String(e));
      }
      results.push('commission_profiles ready');
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
      results.push('staff_goals ready');
    } catch(e) {
      results.push('staff_goals error: ' + String(e));
    }

    try {
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';`;
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_staff_id INTEGER REFERENCES staff(id);`;
      results.push('customer tags and preferred_staff_id ready');
    } catch(e) {
      results.push('customer tags error: ' + String(e));
    }

    // Business Resources
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS business_resources (
          id SERIAL PRIMARY KEY,
          tenant_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100) NOT NULL, 
          status VARCHAR(50) DEFAULT 'available', 
          description TEXT,
          capacity INTEGER DEFAULT 1,
          is_bookable BOOLEAN DEFAULT true,
          hourly_rate DECIMAL(10,2),
          maintenance_schedule VARCHAR(100), 
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      results.push('business_resources ready');
    } catch(e) {
      results.push('business_resources error: ' + String(e));
    }

    // Resource Bookings
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS resource_bookings (
          id SERIAL PRIMARY KEY,
          tenant_id UUID NOT NULL,
          resource_id INTEGER NOT NULL,
          booking_id INTEGER,
          staff_id INTEGER,
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE NOT NULL,
          status VARCHAR(50) DEFAULT 'scheduled',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      try {
        await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS resource_id INTEGER REFERENCES business_resources(id);`;
      } catch (e) {
        results.push('bookings alter error: ' + String(e));
      }

      results.push('resource_bookings ready');
    } catch(e) {
      results.push('resource_bookings error: ' + String(e));
    }

    // Staff Availability
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS staff_availability (
          id SERIAL PRIMARY KEY,
          tenant_id UUID NOT NULL,
          staff_id INTEGER NOT NULL,
          day_of_week INTEGER NOT NULL,
          is_available BOOLEAN DEFAULT true,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          break_start TIME,
          break_end TIME,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      results.push('staff_availability ready');
    } catch(e) {
      results.push('staff_availability error: ' + String(e));
    }

    // Notifications
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          tenant_id UUID NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          priority VARCHAR(20) DEFAULT 'medium',
          read BOOLEAN DEFAULT false,
          action_url VARCHAR(500),
          recipient_type VARCHAR(50) DEFAULT 'admin',
          recipient_id INTEGER,
          related_id INTEGER,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      results.push('notifications ready');
    } catch(e) {
      results.push('notifications error: ' + String(e));
    }

    // Attempt to add tenant_id to existing tables if they exist without it
    const tablesToAlter = [
      'business_resources', 'resource_bookings', 'staff_availability', 'notifications',
      'auto_consumption_rules', 'auto_consumption_logs', 'commission_profiles', 'staff_goals'
    ];
    
    for (const table of tablesToAlter) {
      try {
        await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id UUID;`);
      } catch(e) {
        // ignore
      }
    }

    // Custom Forms
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS custom_forms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id TEXT NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            schema_json JSONB NOT NULL DEFAULT '[]',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      results.push('custom_forms ready');
    } catch(e) {
      results.push('custom_forms error: ' + String(e));
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_custom_forms_tenant_id ON custom_forms(tenant_id);`;
    } catch(e) {}

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS form_submissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            form_id UUID NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
            booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
            customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
            data_json JSONB NOT NULL DEFAULT '{}',
            signature_url VARCHAR(1024),
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      results.push('form_submissions ready');
    } catch(e) {
      results.push('form_submissions error: ' + String(e));
    }

    // Phase 2: Memberships
    try {
      await sql`ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS frozen_until DATE`;
      await sql`ALTER TABLE customer_memberships ADD COLUMN IF NOT EXISTS freeze_reason VARCHAR(255)`;
      await sql`ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS is_multi_branch BOOLEAN DEFAULT true`;
      results.push('memberships phase 2 ready');
    } catch(e) {
      results.push('memberships phase 2 error: ' + String(e));
    }

    // Phase 2: Packages
    try {
      await sql`ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS is_transferable BOOLEAN DEFAULT false`;
      await sql`ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS is_multi_branch BOOLEAN DEFAULT true`;
      
      await sql`
        CREATE TABLE IF NOT EXISTS customer_packages (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
            customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
            package_id INTEGER REFERENCES service_packages(id) ON DELETE CASCADE,
            total_services JSONB NOT NULL,
            remaining_services JSONB NOT NULL,
            expires_at DATE,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      results.push('packages phase 2 ready');
    } catch(e) {
      results.push('packages phase 2 error: ' + String(e));
    }

    // Phase 2: Loyalty
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS loyalty_tiers (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            min_points INTEGER NOT NULL DEFAULT 0,
            earn_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00,
            badge_color VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS tier_id INTEGER REFERENCES loyalty_tiers(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_by_customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL`;
      results.push('loyalty phase 2 ready');
    } catch(e) {
      results.push('loyalty phase 2 error: ' + String(e));
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
