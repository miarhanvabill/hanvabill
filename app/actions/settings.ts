"use server"

import { pool } from "@/lib/db" // Using pool directly instead of drizzle db

export interface BusinessSettings {
  profile: {
    salonName: string
    ownerName: string
    email: string
    phone: string
    address: string
    website: string
    description: string
    logo: string
    coverImage: string
    socialMedia: {
      facebook: string
      instagram: string
      twitter: string
      whatsapp: string
    }
  }
  business: {
    openTime: string
    closeTime: string
    workingDays: string[]
    appointmentDuration: number
    advanceBookingDays: number
    cancellationPolicy: string
    taxRate: number
    serviceCharge: number
    currency: string
    timezone: string
    language: string
    dateFormat: string
    timeFormat: string
  }
  notifications: {
    emailNotifications: boolean
    smsNotifications: boolean
    pushNotifications: boolean
    appointmentReminders: boolean
    paymentAlerts: boolean
    lowStockAlerts: boolean
    customerBirthdays: boolean
    marketingEmails: boolean
    staffNotifications: boolean
    reviewAlerts: boolean
    reminderTiming: string
    emailTemplate: string
    smsTemplate: string
  }
  payments: {
    acceptCash: boolean
    acceptCards: boolean
    acceptUPI: boolean
    acceptWallets: boolean
    autoInvoicing: boolean
    paymentTerms: string
    lateFee: number
    discountLimit: number
    taxInclusive: boolean
    roundingRules: string
    receiptTemplate: string
    paymentGateway: string
  }
  security: {
    twoFactorAuth: boolean
    sessionTimeout: number
    passwordExpiry: number
    loginAttempts: number
    dataBackup: boolean
    auditLog: boolean
    ipRestriction: boolean
    encryptData: boolean
    autoLogout: boolean
    securityAlerts: boolean
    dataRetention: number
    backupFrequency: string
  }
  appearance: {
    theme: string
    primaryColor: string
    secondaryColor: string
    accentColor: string
    fontSize: string
    compactMode: boolean
    showAnimations: boolean
    customLogo: string
    brandColors: boolean
    sidebarStyle: string
    headerStyle: string
    cardStyle: string
  }
  integrations: {
    googleCalendar: boolean
    whatsappBusiness: boolean
    emailMarketing: boolean
    smsGateway: boolean
    paymentGateway: boolean
    socialMedia: boolean
    analytics: boolean
    cloudStorage: boolean
    apiAccess: boolean
    webhooks: boolean
  }
  system: {
    autoBackup: boolean
    backupLocation: string
    dataSync: boolean
    offlineMode: boolean
    cacheSize: string
    performanceMode: string
    debugMode: boolean
    maintenanceMode: boolean
    updateChannel: string
    errorReporting: boolean
  }
}

async function ensureStoreSettingsTable() {
  try {
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'store_settings'
      )
    `)

    if (!tableExists.rows[0].exists) {
      // Only create table if it doesn't exist
      await pool.query(`
        CREATE TABLE store_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(100) NOT NULL,
          setting_value TEXT,
          setting_type VARCHAR(20) DEFAULT 'text',
          description TEXT,
          is_public BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT store_settings_setting_key_unique UNIQUE (setting_key)
        )
      `)

      // Create index for better performance
      await pool.query(`
        CREATE INDEX idx_store_settings_key ON store_settings(setting_key)
      `)

      console.log("Created store_settings table with constraints")
    }

    const duplicateCheck = await pool.query(`
      SELECT setting_key, COUNT(*) as count 
      FROM store_settings 
      GROUP BY setting_key 
      HAVING COUNT(*) > 1
    `)

    if (duplicateCheck.rows.length > 0) {
      console.log("Found duplicates, cleaning up...")

      // Remove duplicates, keeping the latest
      await pool.query(`
        DELETE FROM store_settings 
        WHERE id NOT IN (
          SELECT MAX(id) 
          FROM store_settings 
          GROUP BY setting_key
        )
      `)

      // Reset sequence
      await pool.query(`
        SELECT setval('store_settings_id_seq', COALESCE(MAX(id), 0) + 1, false) 
        FROM store_settings
      `)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Error ensuring store_settings table:", {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    })
  }
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  try {
    await ensureStoreSettingsTable()

    const { rows } = await pool.query(`
      SELECT setting_key, setting_value, setting_type
      FROM store_settings
      ORDER BY setting_key
    `)

    // Default settings
    const defaultSettings: BusinessSettings = {
      profile: {
        salonName: "Hanva salon",
        ownerName: "Gaurav",
        email: "gaurav@hanva.com",
        phone: "+919321501389",
        address: "123 Main Street, City, State 12345",
        website: "www.hanva.com",
        description: "Premium salon services with affordable pricing",
        logo: "",
        coverImage: "",
        socialMedia: {
          facebook: "",
          instagram: "",
          twitter: "",
          whatsapp: "+919321501289",
        },
      },
      business: {
        openTime: "09:00",
        closeTime: "20:00",
        workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        appointmentDuration: 30,
        advanceBookingDays: 30,
        cancellationPolicy: "24 hours advance notice required",
        taxRate: 18,
        serviceCharge: 0,
        currency: "INR",
        timezone: "Asia/Kolkata",
        language: "English",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12-hour",
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        appointmentReminders: true,
        paymentAlerts: true,
        lowStockAlerts: true,
        customerBirthdays: true,
        marketingEmails: false,
        staffNotifications: true,
        reviewAlerts: true,
        reminderTiming: "24",
        emailTemplate: "default",
        smsTemplate: "default",
      },
      payments: {
        acceptCash: true,
        acceptCards: true,
        acceptUPI: true,
        acceptWallets: true,
        autoInvoicing: true,
        paymentTerms: "immediate",
        lateFee: 0,
        discountLimit: 20,
        taxInclusive: true,
        roundingRules: "nearest",
        receiptTemplate: "default",
        paymentGateway: "razorpay",
      },
      security: {
        twoFactorAuth: false,
        sessionTimeout: 60,
        passwordExpiry: 90,
        loginAttempts: 5,
        dataBackup: true,
        auditLog: true,
        ipRestriction: false,
        encryptData: true,
        autoLogout: true,
        securityAlerts: true,
        dataRetention: 365,
        backupFrequency: "daily",
      },
      appearance: {
        theme: "light",
        primaryColor: "#3B82F6",
        secondaryColor: "#6B7280",
        accentColor: "#10B981",
        fontSize: "medium",
        compactMode: false,
        showAnimations: true,
        customLogo: "",
        brandColors: true,
        sidebarStyle: "expanded",
        headerStyle: "default",
        cardStyle: "elevated",
      },
      integrations: {
        googleCalendar: false,
        whatsappBusiness: false,
        emailMarketing: false,
        smsGateway: false,
        paymentGateway: false,
        socialMedia: false,
        analytics: false,
        cloudStorage: false,
        apiAccess: false,
        webhooks: false,
      },
      system: {
        autoBackup: true,
        backupLocation: "cloud",
        dataSync: true,
        offlineMode: false,
        cacheSize: "medium",
        performanceMode: "balanced",
        debugMode: false,
        maintenanceMode: false,
        updateChannel: "stable",
        errorReporting: true,
      },
    }

    // Merge database values with defaults
    const settings = { ...defaultSettings }

    if (!Array.isArray(rows)) {
      console.warn("Database returned non-array result, using defaults")
      return settings
    }

    for (const row of rows) {
      try {
        if (!row || typeof row !== "object") {
          console.warn("Invalid row object found:", row)
          continue
        }

        const { setting_key, setting_value, setting_type } = row

        // Validate setting_key
        if (!setting_key || typeof setting_key !== "string" || setting_key.trim() === "") {
          console.warn("Invalid or empty setting_key found:", { setting_key, row_id: row.id })
          continue
        }

        // Validate setting_value - allow empty strings but not null/undefined
        if (setting_value === null || setting_value === undefined) {
          console.warn("Null setting_value found for key:", setting_key)
          continue
        }

        const keys = setting_key.includes(".") ? setting_key.split(".") : []

        // Validate key structure
        if (keys.length < 2 || keys.length > 3) {
          console.warn("Invalid setting key structure:", setting_key)
          continue
        }

        if (keys.length === 2) {
          const [section, key] = keys

          if (!section || !key || !settings[section as keyof BusinessSettings]) {
            console.warn("Unknown settings section or invalid key:", { section, key })
            continue
          }

          let value = setting_value

          // Safe value parsing with error handling
          try {
            if (setting_type === "boolean") {
              value = setting_value === "true" || setting_value === true
            } else if (setting_type === "number") {
              const numValue = Number.parseFloat(setting_value)
              value = isNaN(numValue) ? 0 : numValue
            } else if (setting_type === "json") {
              try {
                value = JSON.parse(setting_value)
              } catch (jsonError) {
                console.warn(`Failed to parse JSON for ${setting_key}:`, jsonError)
                value = setting_value
              }
            }
          } catch (parseError) {
            console.warn(`Error parsing value for ${setting_key}:`, parseError)
            value = setting_value
          }

          const sectionObj = settings[section as keyof BusinessSettings] as any
          if (sectionObj && typeof sectionObj === "object") {
            sectionObj[key] = value
          }
        } else if (keys.length === 3) {
          const [section, subsection, key] = keys

          if (!section || !subsection || !key) {
            console.warn("Invalid nested key structure:", { section, subsection, key })
            continue
          }

          const sectionObj = settings[section as keyof BusinessSettings] as any
          if (!sectionObj || typeof sectionObj !== "object") {
            console.warn("Unknown settings section:", section)
            continue
          }

          if (!sectionObj[subsection] || typeof sectionObj[subsection] !== "object") {
            console.warn("Unknown settings subsection:", { section, subsection })
            continue
          }

          let value = setting_value

          try {
            if (setting_type === "boolean") {
              value = setting_value === "true" || setting_value === true
            } else if (setting_type === "number") {
              const numValue = Number.parseFloat(setting_value)
              value = isNaN(numValue) ? 0 : numValue
            } else if (setting_type === "json") {
              try {
                value = JSON.parse(setting_value)
              } catch (jsonError) {
                console.warn(`Failed to parse JSON for ${setting_key}:`, jsonError)
                value = setting_value
              }
            }
          } catch (parseError) {
            console.warn(`Error parsing value for ${setting_key}:`, parseError)
            value = setting_value
          }

          sectionObj[subsection][key] = value
        }
      } catch (rowError) {
        console.warn("Error processing settings row:", {
          error: rowError instanceof Error ? rowError.message : "Unknown error",
          row: row,
        })
        continue
      }
    }

    return settings
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Error fetching business settings:", {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    })

    return {
      profile: {
        salonName: "Hanva salon",
        ownerName: "Gaurav",
        email: "gaurav@hanva.com",
        phone: "+919321501389",
        address: "123 Main Street, City, State 12345",
        website: "www.hanva.com",
        description: "Premium salon services with affordable pricing",
        logo: "",
        coverImage: "",
        socialMedia: {
          facebook: "",
          instagram: "",
          twitter: "",
          whatsapp: "+919321501289",
        },
      },
      business: {
        openTime: "09:00",
        closeTime: "20:00",
        workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        appointmentDuration: 30,
        advanceBookingDays: 30,
        cancellationPolicy: "24 hours advance notice required",
        taxRate: 18,
        serviceCharge: 0,
        currency: "INR",
        timezone: "Asia/Kolkata",
        language: "English",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12-hour",
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        appointmentReminders: true,
        paymentAlerts: true,
        lowStockAlerts: true,
        customerBirthdays: true,
        marketingEmails: false,
        staffNotifications: true,
        reviewAlerts: true,
        reminderTiming: "24",
        emailTemplate: "default",
        smsTemplate: "default",
      },
      payments: {
        acceptCash: true,
        acceptCards: true,
        acceptUPI: true,
        acceptWallets: true,
        autoInvoicing: true,
        paymentTerms: "immediate",
        lateFee: 0,
        discountLimit: 20,
        taxInclusive: true,
        roundingRules: "nearest",
        receiptTemplate: "default",
        paymentGateway: "razorpay",
      },
      security: {
        twoFactorAuth: false,
        sessionTimeout: 60,
        passwordExpiry: 90,
        loginAttempts: 5,
        dataBackup: true,
        auditLog: true,
        ipRestriction: false,
        encryptData: true,
        autoLogout: true,
        securityAlerts: true,
        dataRetention: 365,
        backupFrequency: "daily",
      },
      appearance: {
        theme: "light",
        primaryColor: "#3B82F6",
        secondaryColor: "#6B7280",
        accentColor: "#10B981",
        fontSize: "medium",
        compactMode: false,
        showAnimations: true,
        customLogo: "",
        brandColors: true,
        sidebarStyle: "expanded",
        headerStyle: "default",
        cardStyle: "elevated",
      },
      integrations: {
        googleCalendar: false,
        whatsappBusiness: false,
        emailMarketing: false,
        smsGateway: false,
        paymentGateway: false,
        socialMedia: false,
        analytics: false,
        cloudStorage: false,
        apiAccess: false,
        webhooks: false,
      },
      system: {
        autoBackup: true,
        backupLocation: "cloud",
        dataSync: true,
        offlineMode: false,
        cacheSize: "medium",
        performanceMode: "balanced",
        debugMode: false,
        maintenanceMode: false,
        updateChannel: "stable",
        errorReporting: true,
      },
    }
  }
}

export async function updateBusinessSettings(
  section: string,
  data: any,
): Promise<{ success: boolean; message: string }> {
  try {
    if (!section || typeof section !== "string" || section.trim() === "") {
      console.warn("Invalid section name provided:", section)
      return { success: false, message: "Invalid section name" }
    }

    if (!data || typeof data !== "object") {
      console.warn("Invalid data provided for section:", section)
      return { success: false, message: "Invalid data provided" }
    }

    await ensureStoreSettingsTable()

    const flattenData = (obj: any, prefix = ""): Array<{ key: string; value: any; type: string }> => {
      const flattened: Array<{ key: string; value: any; type: string }> = []

      try {
        if (!obj || typeof obj !== "object") {
          console.warn("Invalid object provided to flattenData:", obj)
          return flattened
        }

        for (const [key, value] of Object.entries(obj)) {
          if (!key || typeof key !== "string" || key.trim() === "") {
            console.warn("Invalid key found in data:", key)
            continue
          }

          const fullKey = prefix ? `${prefix}.${key}` : key

          if (value === null || value === undefined) {
            // Skip null/undefined values
            continue
          }

          if (typeof value === "object" && !Array.isArray(value)) {
            try {
              const nestedResults = flattenData(value, fullKey)
              flattened.push(...nestedResults)
            } catch (nestedError) {
              console.warn(
                `Error flattening nested object for key ${fullKey}:`,
                nestedError instanceof Error ? nestedError.message : "Unknown error",
              )
            }
          } else {
            let type = "text"
            let stringValue = ""

            try {
              if (typeof value === "boolean") {
                type = "boolean"
                stringValue = value ? "true" : "false"
              } else if (typeof value === "number" && !isNaN(value)) {
                type = "number"
                stringValue = String(value)
              } else if (Array.isArray(value)) {
                type = "json"
                stringValue = JSON.stringify(value)
              } else {
                stringValue = String(value)
              }

              if (stringValue.length > 10000) {
                console.warn(`Value too long for key ${fullKey}, truncating`)
                stringValue = stringValue.substring(0, 10000)
              }

              flattened.push({ key: fullKey, value: stringValue, type })
            } catch (valueError) {
              console.warn(
                `Error processing value for key ${fullKey}:`,
                valueError instanceof Error ? valueError.message : "Unknown error",
              )
            }
          }
        }
      } catch (iterationError) {
        console.error(
          "Error iterating over data object:",
          iterationError instanceof Error ? iterationError.message : "Unknown error",
        )
      }

      return flattened
    }

    const settingsToUpdate = flattenData(data, section)

    if (settingsToUpdate.length === 0) {
      console.warn("No valid settings to update for section:", section)
      return { success: false, message: "No valid settings to update" }
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const setting of settingsToUpdate) {
      try {
        if (!setting.key || typeof setting.key !== "string") {
          console.warn("Invalid setting key:", setting.key)
          errorCount++
          continue
        }

        // First try to update existing record
        const updateResult = await pool.query(
          `UPDATE store_settings 
           SET setting_value = $2, setting_type = $3, updated_at = NOW()
           WHERE setting_key = $1`,
          [setting.key, setting.value, setting.type],
        )

        // If no rows were updated, insert new record
        if (updateResult.rowCount === 0) {
          await pool.query(
            `INSERT INTO store_settings (setting_key, setting_value, setting_type, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())`,
            [setting.key, setting.value, setting.type],
          )
        }

        successCount++
      } catch (settingError) {
        errorCount++
        const errorMessage = settingError instanceof Error ? settingError.message : "Unknown error"
        console.error(`Failed to update setting ${setting.key}:`, errorMessage)
        errors.push(`${setting.key}: ${errorMessage}`)
      }
    }

    if (successCount > 0) {
      const message =
        errorCount > 0
          ? `${section} settings partially updated (${successCount} success, ${errorCount} failed)`
          : `${section} settings updated successfully`

      return { success: true, message }
    } else {
      return {
        success: false,
        message: `Failed to update ${section} settings. Errors: ${errors.slice(0, 3).join(", ")}${errors.length > 3 ? "..." : ""}`,
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Error updating settings:", {
      error: errorMessage,
      section,
      timestamp: new Date().toISOString(),
    })
    return { success: false, message: `Failed to update ${section} settings: ${errorMessage}` }
  }
}

export async function updateAllSettings(settings: BusinessSettings): Promise<{ success: boolean; message: string }> {
  try {
    await ensureStoreSettingsTable()

    // Update each section
    for (const [section, data] of Object.entries(settings)) {
      await updateBusinessSettings(section, data)
    }

    return { success: true, message: "All settings updated successfully" }
  } catch (error) {
    console.error("Error updating all settings:", error)
    return { success: false, message: "Failed to update settings" }
  }
}
