export interface BusinessSettings {
  profile?: any
  business?: any
  notifications?: any
  payments?: any
  whatsapp?: any
  security?: any
  appearance?: any
  integrations?: any
  system?: any
  [key: string]: any
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
