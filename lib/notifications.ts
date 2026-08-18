"use client"

interface NotificationSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  staffNotifications: boolean
}

interface ProfileSettings {
  businessName: string
  email: string
  phone: string
  whatsapp: string
}

export async function sendEmailNotification(
  to: string,
  subject: string,
  message: string,
  profileSettings: ProfileSettings,
) {
  try {
    const response = await fetch("/api/notifications/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        subject,
        message,
        fromEmail: profileSettings.email,
        fromName: profileSettings.businessName,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to send email notification")
    }

    return await response.json()
  } catch (error) {
    console.error("Email notification error:", error)
    throw error
  }
}

export async function sendWhatsAppNotification(to: string, message: string, profileSettings: ProfileSettings) {
  try {
    const response = await fetch("/api/notifications/whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        message,
        fromNumber: profileSettings.whatsapp,
        businessName: profileSettings.businessName,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to send WhatsApp notification")
    }

    return await response.json()
  } catch (error) {
    console.error("WhatsApp notification error:", error)
    throw error
  }
}

export async function sendPushNotification(title: string, message: string, options?: NotificationOptions) {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications")
    return
  }

  if (Notification.permission === "granted") {
    new Notification(title, {
      body: message,
      icon: "/favicon.ico",
      ...options,
    })
  } else if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    if (permission === "granted") {
      new Notification(title, {
        body: message,
        icon: "/favicon.ico",
        ...options,
      })
    }
  }
}

export async function sendStaffNotification(
  staffId: string,
  title: string,
  message: string,
  notificationSettings: NotificationSettings,
  profileSettings: ProfileSettings,
) {
  try {
    const response = await fetch("/api/notifications/staff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        staffId,
        title,
        message,
        emailEnabled: notificationSettings.emailNotifications,
        smsEnabled: notificationSettings.smsNotifications,
        pushEnabled: notificationSettings.pushNotifications,
        profileSettings,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to send staff notification")
    }

    return await response.json()
  } catch (error) {
    console.error("Staff notification error:", error)
    throw error
  }
}
