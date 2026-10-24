// lib/staff-auth.ts
import crypto from "crypto"
import { cookies } from "next/headers"
import { getAuthenticatedSql } from "./db"

const STAFF_COOKIE_NAME = "staff_session"
const STAFF_SECRET =
  process.env.STAFF_JWT_SECRET ||
  process.env.CLERK_SECRET_KEY ||
  process.env.DATABASE_URL ||
  "hanva-staff-portal-secure-key-2026"

/**
 * Base64 URL safe encoder
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

/**
 * Base64 URL safe decoder
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  while (base64.length % 4) {
    base64 += "="
  }
  return Buffer.from(base64, "base64").toString("utf8")
}

/**
 * Hash a numeric or alphanumeric PIN using PBKDF2 with a random 16-byte salt
 * Output format: `salt:derivedKey`
 */
export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const derivedKey = crypto.pbkdf2Sync(String(pin).trim(), salt, 100000, 64, "sha512").toString("hex")
  return `${salt}:${derivedKey}`
}

/**
 * Verify a plain PIN against a stored salted PBKDF2 hash (with legacy SHA-256 support)
 */
export function verifyPin(pin: string, storedHash: string): boolean {
  if (!storedHash || !pin) return false
  const cleanPin = String(pin).trim()

  // 1. Salted PBKDF2 format: "salt:derivedKey"
  if (storedHash.includes(":")) {
    const parts = storedHash.split(":")
    if (parts.length === 2) {
      const [salt, expectedKeyHex] = parts
      try {
        const derivedKey = crypto.pbkdf2Sync(cleanPin, salt, 100000, 64, "sha512")
        const expectedKey = Buffer.from(expectedKeyHex, "hex")

        if (derivedKey.length === expectedKey.length && crypto.timingSafeEqual(derivedKey, expectedKey)) {
          return true
        }
      } catch {}
    }
  }

  // 2. Legacy SHA-256 hash fallback (64 hex characters)
  if (storedHash.length === 64) {
    try {
      const sha256 = crypto.createHash("sha256").update(cleanPin).digest("hex")
      const shaBuf = Buffer.from(sha256)
      const storedBuf = Buffer.from(storedHash)
      if (shaBuf.length === storedBuf.length && crypto.timingSafeEqual(shaBuf, storedBuf)) {
        return true
      }
    } catch {}
  }

  // 3. Plain numeric PIN fallback (legacy backward compatibility with timing attack protection)
  try {
    const cleanBuf = Buffer.from(cleanPin)
    const storedPlainBuf = Buffer.from(storedHash)
    if (cleanBuf.length === storedPlainBuf.length && crypto.timingSafeEqual(cleanBuf, storedPlainBuf)) {
      return true
    }
  } catch {}

  return false
}

export interface StaffTokenPayload {
  staffId: number
  tenantId: string
  name: string
  role: string
  phone: string
  exp?: number
}

/**
 * Sign an HMAC-SHA256 signed token for staff portal sessions (valid for 7 days)
 */
export function signStaffToken(payload: {
  staffId: number
  tenantId: string
  name: string
  role: string
  phone: string
}): string {
  const header = { alg: "HS256", typ: "JWT" }
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days expiration
  const tokenPayload: StaffTokenPayload = {
    staffId: Number(payload.staffId),
    tenantId: String(payload.tenantId),
    name: String(payload.name || ""),
    role: String(payload.role || "Staff"),
    phone: String(payload.phone || ""),
    exp,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload))
  const data = `${encodedHeader}.${encodedPayload}`

  const signature = crypto
    .createHmac("sha256", STAFF_SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")

  return `${data}.${signature}`
}

/**
 * Verify HMAC-SHA256 signed staff token and ensure it has not expired
 */
export function verifyStaffToken(token: string): {
  staffId: number
  tenantId: string
  name: string
  role: string
  phone: string
} | null {
  if (!token || typeof token !== "string") return null

  const parts = token.split(".")
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, signature] = parts
  const data = `${encodedHeader}.${encodedPayload}`

  const expectedSig = crypto
    .createHmac("sha256", STAFF_SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")

  try {
    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null
    }
  } catch {
    return null
  }

  try {
    const parsedPayload = JSON.parse(base64UrlDecode(encodedPayload))
    if (!parsedPayload || !parsedPayload.staffId || !parsedPayload.tenantId) {
      return null
    }

    if (parsedPayload.exp && typeof parsedPayload.exp === "number") {
      const now = Math.floor(Date.now() / 1000)
      if (now > parsedPayload.exp) {
        return null // Token expired
      }
    }

    return {
      staffId: Number(parsedPayload.staffId),
      tenantId: String(parsedPayload.tenantId),
      name: String(parsedPayload.name || ""),
      role: String(parsedPayload.role || "Staff"),
      phone: String(parsedPayload.phone || ""),
    }
  } catch {
    return null
  }
}

/**
 * Set the staff session HttpOnly cookie
 */
export async function setStaffSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(STAFF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  })
}

/**
 * Clear the staff session HttpOnly cookie
 */
export async function clearStaffSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.set(STAFF_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })
    cookieStore.delete(STAFF_COOKIE_NAME)
  } catch (error) {
    console.warn("[staff-auth] Warning clearing staff cookie:", error)
  }
}

/**
 * Read and verify active staff session from cookie
 */
export async function getStaffSession(): Promise<{
  staffId: number
  tenantId: string
  name: string
  role: string
  phone: string
} | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(STAFF_COOKIE_NAME)?.value
    if (!token) return null
    return verifyStaffToken(token)
  } catch (error) {
    console.error("[staff-auth] Error reading staff session:", error)
    return null
  }
}

/**
 * Wrapper for staff-authenticated server actions
 * Verifies cookie session, loads tenant SQL context, and guarantees multi-tenant isolation
 */
export async function withStaffAuth<T>(
  handler: (ctx: { staff: any; sql: any; tenantId: string }) => Promise<T>
): Promise<T> {
  const session = await getStaffSession()
  if (!session) {
    throw new Error("Unauthorized: Staff session not found or expired. Please log in.")
  }

  const { sql, tenantId } = await getAuthenticatedSql(session.tenantId)

  // Verify staff exists in database, belongs to this tenant, and is active
  const staffRows = await sql`
    SELECT * 
    FROM staff 
    WHERE id = ${session.staffId} 
      AND (tenant_id = ${tenantId} OR tenant_id::text = ${tenantId}::text)
      AND is_active = true
    LIMIT 1
  `

  if (!staffRows || staffRows.length === 0) {
    await clearStaffSessionCookie()
    throw new Error("Unauthorized: Staff record not found or deactivated.")
  }

  const staff = staffRows[0]

  // If portal access is explicitly disabled by admin, forbid access
  if (staff.portal_enabled === false) {
    await clearStaffSessionCookie()
    throw new Error("Forbidden: Staff portal access has been disabled by your salon administrator.")
  }

  return await handler({ staff, sql, tenantId })
}
