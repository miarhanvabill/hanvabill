// lib/customer-jwt.ts
// Lightweight JWT implementation using Node.js built-in crypto (no extra deps needed)
import { createHmac } from 'crypto'

const SECRET = process.env.CUSTOMER_JWT_SECRET
if (!SECRET) {
  console.error("CRITICAL: CUSTOMER_JWT_SECRET is missing. Cannot sign/verify tokens securely.")
}

export interface CustomerTokenPayload {
  customerId: number
  tenantId: number
  phone: string
  name: string
  exp?: number
  iat?: number
}

function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Buffer.from(str, 'base64').toString()
}

export function signCustomerToken(payload: CustomerTokenPayload): string {
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const claims = base64urlEncode(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 days
  }))
  const signature = createHmac('sha256', SECRET || "uninitialized_secret")
    .update(`${header}.${claims}`)
    .digest('base64url')
  return `${header}.${claims}.${signature}`
}

export function verifyCustomerToken(token: string): CustomerTokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [header, claims, signature] = parts
    const expectedSig = createHmac('sha256', SECRET || "uninitialized_secret")
      .update(`${header}.${claims}`)
      .digest('base64url')

    if (signature !== expectedSig) return null

    const payload: CustomerTokenPayload = JSON.parse(base64urlDecode(claims))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return null // expired

    return payload
  } catch {
    return null
  }
}
