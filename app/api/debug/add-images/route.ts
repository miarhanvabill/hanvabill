import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;`
    await sql`ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS image_url TEXT;`
    await sql`ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS image_url TEXT;`
    
    return NextResponse.json({ success: true, message: 'Image columns added successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
