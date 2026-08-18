export interface BusinessSettings {
  id: string
  name: string
  address: string
  phone: string
  email: string
  logo?: string
  gstin?: string
  pan?: string
  sacCode?: string
  placeOfSupply: string
  gstRate: number
  // Social media links
  instagram?: string
  facebook?: string
  // Appointment booking
  appointmentLink?: string
  // Referral settings
  referralCashbackPercentage: number
  // Other business settings
  currency: string
  timezone: string
  businessHours: {
    [key: string]: {
      open: string
      close: string
      isOpen: boolean
    }
  }
}

export interface NotificationSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  appointmentReminders: boolean
  paymentReminders: boolean
  marketingEmails: boolean
}

export interface AppSettings {
  theme: "light" | "dark" | "system"
  language: string
  dateFormat: string
  timeFormat: "12h" | "24h"
  currency: string
}
