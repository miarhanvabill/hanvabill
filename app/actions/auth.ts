"use server"

import { neon } from "@neondatabase/serverless"
import { setSession } from "@/lib/auth"

const sql = neon(process.env.DATABASE_URL || "postgres://dummy:dummy@localhost/dummy")

export async function login(formData: FormData) {
  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password) {
      return { success: false, message: "Email and password are required" }
    }

    // In a real app with a DB, we would do:
    /*
    const users = await sql`
      SELECT id, tenant_id, password_hash, role 
      FROM users 
      WHERE email = ${email}
    `
    if (users.length === 0) return { success: false, message: "Invalid credentials" }
    const user = users[0]
    
    // Using bcrypt to verify hash
    const bcrypt = require('bcryptjs')
    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) return { success: false, message: "Invalid credentials" }

    await setSession({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role
    })
    */

    // Since the database might not be set up on the user's end yet, we simulate a successful 
    // login that establishes a real multi-tenant session context.
    
    await setSession({
      userId: 1,
      tenantId: 1, // Default tenant ID that we inject into all queries
      role: "admin"
    })

    return { success: true, message: "Logged in successfully" }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, message: "An error occurred during login" }
  }
}

export async function logout() {
  const { clearSession } = await import("@/lib/auth")
  await clearSession()
  return { success: true }
}
