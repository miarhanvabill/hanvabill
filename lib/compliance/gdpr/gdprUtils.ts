import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface ConsentRecord {
  userId: number
  consentType: "marketing" | "analytics" | "essential"
  consentGiven: boolean
  ipAddress: string
  userAgent: string
}

export class GDPRManager {
  static async recordConsent(consent: ConsentRecord) {
    try {
      const result = await sql`
        INSERT INTO user_consent (user_id, consent_type, consent_given, ip_address, user_agent)
        VALUES (${consent.userId}, ${consent.consentType}, ${consent.consentGiven}, ${consent.ipAddress}, ${consent.userAgent})
        RETURNING *
      `
      return result[0]
    } catch (error) {
      throw new Error(`Failed to record consent: ${error}`)
    }
  }

  static async getUserConsent(userId: number, consentType: string) {
    try {
      const result = await sql`
        SELECT * FROM user_consent 
        WHERE user_id = ${userId} AND consent_type = ${consentType}
        ORDER BY consent_date DESC 
        LIMIT 1
      `
      return result[0] || null
    } catch (error) {
      console.error("Failed to get user consent:", error)
      return null
    }
  }

  static async requestDataDeletion(userId: number) {
    try {
      // Mark customer data as deleted and anonymized
      await sql`
        UPDATE customers 
        SET deleted_at = NOW(), 
            anonymized = true,
            email = 'deleted@privacy.local',
            phone = 'DELETED',
            name = 'Deleted User'
        WHERE id = ${userId}
      `

      // Anonymize bookings
      await sql`
        UPDATE bookings 
        SET customer_notes = 'ANONYMIZED',
            special_requests = 'ANONYMIZED'
        WHERE customer_id = ${userId}
      `

      // Log the deletion request
      await sql`
        INSERT INTO data_processing_logs (user_id, action_type, purpose)
        VALUES (${userId}, 'DATA_DELETION', 'GDPR Right to be Forgotten')
      `

      return { success: true }
    } catch (error) {
      throw new Error(`Failed to process data deletion: ${error}`)
    }
  }

  static async logDataAccess(userId: number, actionType: string, dataAccessed: any, purpose: string, staffId?: number) {
    try {
      await sql`
        INSERT INTO data_processing_logs (user_id, action_type, data_accessed, purpose, staff_id)
        VALUES (${userId}, ${actionType}, ${JSON.stringify(dataAccessed)}, ${purpose}, ${staffId || null})
      `
    } catch (error) {
      console.error("Failed to log data access:", error)
    }
  }
}
