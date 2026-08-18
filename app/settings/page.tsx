"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { useTheme } from "@/contexts/theme-context"
import {
  User,
  Building2,
  Bell,
  CreditCard,
  Shield,
  Palette,
  Plug,
  SettingsIcon,
  Save,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle,
  Clock,
  Mail,
  Smartphone,
  Users,
  MessageSquare,
  DollarSign,
  Lock,
  Database,
  FileText,
  Zap,
  Cloud,
  Monitor,
  Eye,
  Download,
  Upload,
  Trash2,
  Calendar,
  Globe,
  BarChart,
  Wallet,
} from "lucide-react"

export default function SettingsPage() {
  const { appearance, updateAppearance } = useTheme()
  const [settings, setSettings] = useState({
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
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  const fetchSettings = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }

      const response = await fetch("/api/settings")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data || typeof data !== "object") {
        throw new Error("Invalid settings data received")
      }

      const settingsData = data.settings || data

      setSettings((prevSettings) => {
        const mergedSettings = {
          profile: { ...prevSettings.profile, ...(settingsData.profile || {}) },
          business: { ...prevSettings.business, ...(settingsData.business || {}) },
          notifications: { ...prevSettings.notifications, ...(settingsData.notifications || {}) },
          payments: { ...prevSettings.payments, ...(settingsData.payments || {}) },
          security: { ...prevSettings.security, ...(settingsData.security || {}) },
          appearance: { ...prevSettings.appearance, ...(settingsData.appearance || {}) },
          integrations: { ...prevSettings.integrations, ...(settingsData.integrations || {}) },
          system: { ...prevSettings.system, ...(settingsData.system || {}) },
        }

        return mergedSettings
      })

      if (!silent) {
        toast({
          title: "Settings loaded",
          description: "Your settings have been loaded successfully.",
        })
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      if (!silent) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load settings. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchSettings()

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    let interval: NodeJS.Timeout | null = null

    if (autoRefresh) {
      interval = setInterval(() => {
        if (isOnline && !saving) {
          fetchSettings(true) // Silent refresh
        }
      }, 30000) // Refresh every 30 seconds

      setRefreshInterval(interval)
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      if (interval) {
        clearInterval(interval)
      }
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [fetchSettings, autoRefresh, isOnline, saving])

  useEffect(() => {
    if (appearance) {
      setSettings((prev) => ({
        ...prev,
        appearance: { ...prev.appearance, ...appearance },
      }))
    }
  }, [appearance])

  const handleSave = async (section: string) => {
    setSaving(true)
    setLastSaved(null)

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          section,
          data: settings[section as keyof typeof settings],
        }),
      })

      const result = await response.json()

      if (result.success) {
        setLastSaved(new Date())
        toast({
          title: "Settings saved",
          description: `${section} settings have been updated successfully.`,
        })

        if (section === "appearance") {
          updateAppearance(settings.appearance)
        }

        // Refresh settings after save
        await fetchSettings(true)
      } else {
        throw new Error(result.message || "Failed to save settings")
      }
    } catch (error) {
      console.error(`Error saving ${section} settings:`, error)
      toast({
        title: "Error",
        description: `Failed to save ${section} settings. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleManualRefresh = () => {
    fetchSettings()
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading settings...</p>
        </div>
      </div>
    )
  }

  const formatLastSaved = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) {
      return "just now"
    } else if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
    } else {
      return date.toLocaleTimeString()
    }
  }

  const workingDays = [
    { id: "monday", label: "Monday" },
    { id: "tuesday", label: "Tuesday" },
    { id: "wednesday", label: "Wednesday" },
    { id: "thursday", label: "Thursday" },
    { id: "friday", label: "Friday" },
    { id: "saturday", label: "Saturday" },
    { id: "sunday", label: "Sunday" },
  ]

  const themes = [
    { id: "light", name: "Light", preview: "bg-white border-gray-200" },
    { id: "dark", name: "Dark", preview: "bg-gray-900 border-gray-700" },
    { id: "auto", name: "Auto", preview: "bg-gradient-to-r from-white to-gray-900" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your salon settings and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="outline" className="gap-1">
              <Wifi className="w-3 h-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="w-3 h-3" />
              Offline
            </Badge>
          )}
          {lastSaved && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              Saved {formatLastSaved(lastSaved)}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="w-4 h-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Settings
              </CardTitle>
              <CardDescription>Manage your salon's public profile and contact information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo and Cover Image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Business Logo</Label>
                  <div className="flex items-center space-x-4">
                    <div className="space-y-2">
                      <Button variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Logo
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 bg-transparent">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Recommended: 200x200px, PNG or JPG</p>
                </div>

                <div className="space-y-4">
                  <Label>Cover Image</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {settings?.profile?.coverImage ? (
                      <img
                        src={settings.profile.coverImage || "/placeholder.svg"}
                        alt="Cover"
                        className="w-full h-32 object-cover rounded-lg mb-4"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Cover
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Recommended: 1200x400px, PNG or JPG</p>
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salonName">Business Name</Label>
                  <Input
                    id="salonName"
                    value={settings.profile.salonName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, salonName: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="ownerName">Owner Name</Label>
                  <Input
                    id="ownerName"
                    value={settings.profile.ownerName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, ownerName: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, email: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={settings.profile.phone}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, phone: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={settings.profile.website}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: { ...settings.profile, website: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    value={settings.profile.socialMedia.whatsapp}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: {
                          ...settings.profile,
                          socialMedia: { ...settings.profile.socialMedia, whatsapp: e.target.value },
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  value={settings.profile.address}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      profile: { ...settings.profile, address: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={settings.profile.description}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      profile: { ...settings.profile, description: e.target.value },
                    })
                  }
                  placeholder="Describe your salon services and specialties..."
                />
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <Label>Social Media Links</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      placeholder="https://facebook.com/yoursalon"
                      value={settings.profile.socialMedia.facebook}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          profile: {
                            ...settings.profile,
                            socialMedia: { ...settings.profile.socialMedia, facebook: e.target.value },
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      placeholder="https://instagram.com/yoursalon"
                      value={settings.profile.socialMedia.instagram}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          profile: {
                            ...settings.profile,
                            socialMedia: { ...settings.profile.socialMedia, instagram: e.target.value },
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("profile")} className="gap-2" disabled={saving}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Business Operations
              </CardTitle>
              <CardDescription>Configure your salon's operating hours and business policies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Operating Hours */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="openTime">Opening Time</Label>
                  <Input
                    id="openTime"
                    type="time"
                    value={settings.business.openTime}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        business: { ...settings.business, openTime: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="closeTime">Closing Time</Label>
                  <Input
                    id="closeTime"
                    type="time"
                    value={settings.business.closeTime}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        business: { ...settings.business, closeTime: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              {/* Working Days */}
              <div>
                <Label>Working Days</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {workingDays.map((day) => (
                    <div key={day.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={day.id}
                        checked={(settings.business.workingDays || []).includes(day.id)}
                        onChange={(e) => {
                          const currentWorkingDays = settings.business.workingDays || []
                          const updatedDays = e.target.checked
                            ? [...currentWorkingDays, day.id]
                            : currentWorkingDays.filter((d) => d !== day.id)
                          setSettings({
                            ...settings,
                            business: { ...settings.business, workingDays: updatedDays },
                          })
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={day.id} className="text-sm">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="appointmentDuration">Default Appointment Duration (minutes)</Label>
                  <Input
                    id="appointmentDuration"
                    type="number"
                    value={settings.business.appointmentDuration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        business: { ...settings.business, appointmentDuration: Number.parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="advanceBookingDays">Advance Booking Days</Label>
                  <Input
                    id="advanceBookingDays"
                    type="number"
                    value={settings.business.advanceBookingDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        business: { ...settings.business, advanceBookingDays: Number.parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              {/* Financial Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={settings.business.taxRate}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        business: { ...settings.business, taxRate: Number.parseFloat(e.target.value) },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="serviceCharge">Service Charge (%)</Label>
                  <Input
                    id="serviceCharge"
                    type="number"
                    value={settings.business.serviceCharge}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        business: { ...settings.business, serviceCharge: Number.parseFloat(e.target.value) },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={settings.business.currency}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        business: { ...settings.business, currency: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Localization */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.business.timezone}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        business: { ...settings.business, timezone: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={settings.business.language}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        business: { ...settings.business, language: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={settings.business.dateFormat}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        business: { ...settings.business, dateFormat: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                <Textarea
                  id="cancellationPolicy"
                  value={settings.business.cancellationPolicy}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      business: { ...settings.business, cancellationPolicy: e.target.value },
                    })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("business")} className="gap-2" disabled={saving}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Business Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how and when you want to receive notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Communication Channels */}
              <div className="space-y-4">
                <h3 className="font-medium">Communication Channels</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-500" />
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, emailNotifications: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-green-500" />
                      <div>
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates via SMS</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.smsNotifications}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, smsNotifications: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-purple-500" />
                      <div>
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Browser notifications</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.pushNotifications}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, pushNotifications: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-orange-500" />
                      <div>
                        <Label>Staff Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Notify staff members</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.staffNotifications}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, staffNotifications: checked },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Alert Types */}
              <div className="space-y-4">
                <h3 className="font-medium">Alert Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <Label>Appointment Reminders</Label>
                    <Switch
                      checked={settings.notifications.appointmentReminders}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, appointmentReminders: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Payment Alerts</Label>
                    <Switch
                      checked={settings.notifications.paymentAlerts}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, paymentAlerts: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Low Stock Alerts</Label>
                    <Switch
                      checked={settings.notifications.lowStockAlerts}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, lowStockAlerts: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Customer Birthdays</Label>
                    <Switch
                      checked={settings.notifications.customerBirthdays}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, customerBirthdays: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Review Alerts</Label>
                    <Switch
                      checked={settings.notifications.reviewAlerts}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, reviewAlerts: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Marketing Emails</Label>
                    <Switch
                      checked={settings.notifications.marketingEmails}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, marketingEmails: checked },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Timing Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Timing & Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="reminderTiming">Reminder Timing (hours before)</Label>
                    <Select
                      value={settings.notifications.reminderTiming}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, reminderTiming: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">48 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="emailTemplate">Email Template</Label>
                    <Select
                      value={settings.notifications.emailTemplate}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, emailTemplate: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="smsTemplate">SMS Template</Label>
                    <Select
                      value={settings.notifications.smsTemplate}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, smsTemplate: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("notifications")} className="gap-2" disabled={saving}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Settings
              </CardTitle>
              <CardDescription>Configure accepted payment methods and billing preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Methods */}
              <div className="space-y-4">
                <h3 className="font-medium">Accepted Payment Methods</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <Label>Cash</Label>
                    </div>
                    <Switch
                      checked={settings.payments.acceptCash}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          payments: { ...settings.payments, acceptCash: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-blue-500" />
                      <Label>Cards</Label>
                    </div>
                    <Switch
                      checked={settings.payments.acceptCards}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          payments: { ...settings.payments, acceptCards: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-purple-500" />
                      <Label>UPI</Label>
                    </div>
                    <Switch
                      checked={settings.payments.acceptUPI}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          payments: { ...settings.payments, acceptUPI: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-orange-500" />
                      <Label>Wallets</Label>
                    </div>
                    <Switch
                      checked={settings.payments.acceptWallets}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          payments: { ...settings.payments, acceptWallets: checked },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Billing Preferences */}
              <div className="space-y-4">
                <h3 className="font-medium">Billing Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Invoicing</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Generate invoices automatically</p>
                    </div>
                    <Switch
                      checked={settings.payments.autoInvoicing}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          payments: { ...settings.payments, autoInvoicing: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Tax Inclusive Pricing</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Include tax in displayed prices</p>
                    </div>
                    <Switch
                      checked={settings.payments.taxInclusive}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          payments: { ...settings.payments, taxInclusive: checked },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Select
                      value={settings.payments.paymentTerms}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          payments: { ...settings.payments, paymentTerms: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="net-7">Net 7 days</SelectItem>
                        <SelectItem value="net-15">Net 15 days</SelectItem>
                        <SelectItem value="net-30">Net 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="discountLimit">Maximum Discount (%)</Label>
                    <Input
                      id="discountLimit"
                      type="number"
                      value={settings.payments.discountLimit}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          payments: { ...settings.payments, discountLimit: Number.parseFloat(e.target.value) },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentGateway">Payment Gateway</Label>
                    <Select
                      value={settings.payments.paymentGateway}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          payments: { ...settings.payments, paymentGateway: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="payu">PayU</SelectItem>
                        <SelectItem value="paytm">Paytm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("payments")} className="gap-2" disabled={saving}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Payment Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage security features and data protection settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Authentication */}
              <div className="space-y-4">
                <h3 className="font-medium">Authentication & Access</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Add extra security layer</p>
                    </div>
                    <Switch
                      checked={settings.security.twoFactorAuth}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, twoFactorAuth: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Auto Logout</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Logout inactive users</p>
                    </div>
                    <Switch
                      checked={settings.security.autoLogout}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, autoLogout: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Security Alerts</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Notify about security events</p>
                    </div>
                    <Switch
                      checked={settings.security.securityAlerts}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, securityAlerts: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>IP Restriction</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Restrict access by IP</p>
                    </div>
                    <Switch
                      checked={settings.security.ipRestriction}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, ipRestriction: checked },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, sessionTimeout: Number.parseInt(e.target.value) },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="loginAttempts">Max Login Attempts</Label>
                    <Input
                      id="loginAttempts"
                      type="number"
                      value={settings.security.loginAttempts}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, loginAttempts: Number.parseInt(e.target.value) },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                    <Input
                      id="passwordExpiry"
                      type="number"
                      value={settings.security.passwordExpiry}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, passwordExpiry: Number.parseInt(e.target.value) },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Data Protection */}
              <div className="space-y-4">
                <h3 className="font-medium">Data Protection</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-blue-500" />
                      <div>
                        <Label>Automatic Data Backup</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Regular data backups</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.security.dataBackup}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, dataBackup: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-green-500" />
                      <div>
                        <Label>Audit Log</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Track user activities</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.security.auditLog}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, auditLog: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-purple-500" />
                      <div>
                        <Label>Data Encryption</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Encrypt sensitive data</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.security.encryptData}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, encryptData: checked },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dataRetention">Data Retention (days)</Label>
                    <Input
                      id="dataRetention"
                      type="number"
                      value={settings.security.dataRetention}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, dataRetention: Number.parseInt(e.target.value) },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="backupFrequency">Backup Frequency</Label>
                    <Select
                      value={settings.security.backupFrequency}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, backupFrequency: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("security")} className="gap-2" disabled={saving}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance & Branding
              </CardTitle>
              <CardDescription>Customize the look and feel of your salon management system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Selection */}
              <div className="space-y-4">
                <h3 className="font-medium">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  {themes.map((theme) => (
                    <div
                      key={theme.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        settings.appearance.theme === theme.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() => {
                        const newSettings = {
                          ...settings,
                          appearance: { ...settings.appearance, theme: theme.id },
                        }
                        setSettings(newSettings)
                        updateAppearance({ theme: theme.id })
                      }}
                    >
                      <div className={`w-full h-16 rounded ${theme.preview} mb-2`}></div>
                      <p className="text-sm font-medium text-center">{theme.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Customization */}
              <div className="space-y-4">
                <h3 className="font-medium">Brand Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={settings.appearance.primaryColor}
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            appearance: { ...settings.appearance, primaryColor: e.target.value },
                          }
                          setSettings(newSettings)
                          updateAppearance({ primaryColor: e.target.value })
                        }}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={settings.appearance.primaryColor}
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            appearance: { ...settings.appearance, primaryColor: e.target.value },
                          }
                          setSettings(newSettings)
                          updateAppearance({ primaryColor: e.target.value })
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={settings.appearance.secondaryColor}
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            appearance: { ...settings.appearance, secondaryColor: e.target.value },
                          }
                          setSettings(newSettings)
                          updateAppearance({ secondaryColor: e.target.value })
                        }}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={settings.appearance.secondaryColor}
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            appearance: { ...settings.appearance, secondaryColor: e.target.value },
                          }
                          setSettings(newSettings)
                          updateAppearance({ secondaryColor: e.target.value })
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="accentColor"
                        type="color"
                        value={settings.appearance.accentColor}
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            appearance: { ...settings.appearance, accentColor: e.target.value },
                          }
                          setSettings(newSettings)
                          updateAppearance({ accentColor: e.target.value })
                        }}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={settings.appearance.accentColor}
                        onChange={(e) => {
                          const newSettings = {
                            ...settings,
                            appearance: { ...settings.appearance, accentColor: e.target.value },
                          }
                          setSettings(newSettings)
                          updateAppearance({ accentColor: e.target.value })
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Interface Options */}
              <div className="space-y-4">
                <h3 className="font-medium">Interface Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Compact Mode</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Reduce spacing and padding</p>
                    </div>
                    <Switch
                      checked={settings.appearance.compactMode}
                      onCheckedChange={(checked) => {
                        const newSettings = {
                          ...settings,
                          appearance: { ...settings.appearance, compactMode: checked },
                        }
                        setSettings(newSettings)
                        updateAppearance({ compactMode: checked })
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Animations</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Enable smooth transitions</p>
                    </div>
                    <Switch
                      checked={settings.appearance.showAnimations}
                      onCheckedChange={(checked) => {
                        const newSettings = {
                          ...settings,
                          appearance: { ...settings.appearance, showAnimations: checked },
                        }
                        setSettings(newSettings)
                        updateAppearance({ showAnimations: checked })
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Use Brand Colors</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Apply colors throughout UI</p>
                    </div>
                    <Switch
                      checked={settings.appearance.brandColors}
                      onCheckedChange={(checked) => {
                        const newSettings = {
                          ...settings,
                          appearance: { ...settings.appearance, brandColors: checked },
                        }
                        setSettings(newSettings)
                        updateAppearance({ brandColors: checked })
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Select
                      value={settings.appearance.fontSize}
                      onValueChange={(value) => {
                        const newSettings = {
                          ...settings,
                          appearance: { ...settings.appearance, fontSize: value },
                        }
                        setSettings(newSettings)
                        updateAppearance({ fontSize: value })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sidebarStyle">Sidebar Style</Label>
                    <Select
                      value={settings.appearance.sidebarStyle}
                      onValueChange={(value) => {
                        const newSettings = {
                          ...settings,
                          appearance: { ...settings.appearance, sidebarStyle: value },
                        }
                        setSettings(newSettings)
                        updateAppearance({ sidebarStyle: value })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expanded">Expanded</SelectItem>
                        <SelectItem value="collapsed">Collapsed</SelectItem>
                        <SelectItem value="floating">Floating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cardStyle">Card Style</Label>
                    <Select
                      value={settings.appearance.cardStyle}
                      onValueChange={(value) => {
                        const newSettings = {
                          ...settings,
                          appearance: { ...settings.appearance, cardStyle: value },
                        }
                        setSettings(newSettings)
                        updateAppearance({ cardStyle: value })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat</SelectItem>
                        <SelectItem value="elevated">Elevated</SelectItem>
                        <SelectItem value="outlined">Outlined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("appearance")} className="gap-2" disabled={saving}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Appearance Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Integrations & Connections
              </CardTitle>
              <CardDescription>Connect with third-party services to enhance your salon management.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-blue-500" />
                    <div>
                      <Label>Google Calendar</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sync appointments with Google Calendar</p>
                      <Badge variant={settings.integrations.googleCalendar ? "default" : "secondary"} className="mt-1">
                        {settings.integrations.googleCalendar ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={settings.integrations.googleCalendar}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, googleCalendar: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-green-500" />
                    <div>
                      <Label>WhatsApp Business</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Send notifications via WhatsApp</p>
                      <Badge
                        variant={settings.integrations.whatsappBusiness ? "default" : "secondary"}
                        className="mt-1"
                      >
                        {settings.integrations.whatsappBusiness ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={settings.integrations.whatsappBusiness}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, whatsappBusiness: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-8 h-8 text-purple-500" />
                    <div>
                      <Label>Email Marketing</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Automated email campaigns</p>
                      <Badge variant={settings.integrations.emailMarketing ? "default" : "secondary"} className="mt-1">
                        {settings.integrations.emailMarketing ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={settings.integrations.emailMarketing}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, emailMarketing: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-8 h-8 text-orange-500" />
                    <div>
                      <Label>SMS Gateway</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Send SMS notifications</p>
                      <Badge variant={settings.integrations.smsGateway ? "default" : "secondary"} className="mt-1">
                        {settings.integrations.smsGateway ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={settings.integrations.smsGateway}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, smsGateway: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-blue-600" />
                    <div>
                      <Label>Payment Gateway</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Online payment processing</p>
                      <Badge variant={settings.integrations.paymentGateway ? "default" : "secondary"} className="mt-1">
                        {settings.integrations.paymentGateway ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={settings.integrations.paymentGateway}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, paymentGateway: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="w-8 h-8 text-pink-500" />
                    <div>
                      <Label>Social Media</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Social media integration</p>
                      <Badge variant={settings.integrations.socialMedia ? "default" : "secondary"} className="mt-1">
                        {settings.integrations.socialMedia ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={settings.integrations.socialMedia}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, socialMedia: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <BarChart className="w-8 h-8 text-indigo-500" />
                    <div>
                      <Label>Analytics</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Advanced analytics and reporting</p>
                      <Badge variant={settings.integrations.analytics ? "default" : "secondary"} className="mt-1">
                        {settings.integrations.analytics ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={settings.integrations.analytics}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, analytics: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Cloud className="w-8 h-8 text-gray-500" />
                    <div>
                      <Label>Cloud Storage</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cloud backup and storage</p>
                      <Badge variant={settings.integrations.cloudStorage ? "default" : "secondary"} className="mt-1">
                        {settings.integrations.cloudStorage ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={settings.integrations.cloudStorage}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, cloudStorage: checked },
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("integrations")} className="gap-2" disabled={saving}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Integration Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                System Configuration
              </CardTitle>
              <CardDescription>Advanced system settings and maintenance options.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* System Performance */}
              <div className="space-y-4">
                <h3 className="font-medium">Performance & Storage</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Auto Backup</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Automatic system backups</p>
                    </div>
                    <Switch
                      checked={settings.system.autoBackup}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          system: { ...settings.system, autoBackup: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Data Sync</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Real-time data synchronization</p>
                    </div>
                    <Switch
                      checked={settings.system.dataSync}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          system: { ...settings.system, dataSync: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Offline Mode</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Work without internet</p>
                    </div>
                    <Switch
                      checked={settings.system.offlineMode}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          system: { ...settings.system, offlineMode: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Error Reporting</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Send error reports for debugging</p>
                    </div>
                    <Switch
                      checked={settings.system.errorReporting}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          system: { ...settings.system, errorReporting: checked },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="backupLocation">Backup Location</Label>
                    <Select
                      value={settings.system.backupLocation}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          system: { ...settings.system, backupLocation: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local Storage</SelectItem>
                        <SelectItem value="cloud">Cloud Storage</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cacheSize">Cache Size</Label>
                    <Select
                      value={settings.system.cacheSize}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          system: { ...settings.system, cacheSize: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (100MB)</SelectItem>
                        <SelectItem value="medium">Medium (500MB)</SelectItem>
                        <SelectItem value="large">Large (1GB)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="performanceMode">Performance Mode</Label>
                    <Select
                      value={settings.system.performanceMode}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          system: { ...settings.system, performanceMode: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="power-saver">Power Saver</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="performance">High Performance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* System Maintenance */}
              <div className="space-y-4">
                <h3 className="font-medium">System Maintenance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-500" />
                        <Label>Database Optimization</Label>
                      </div>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Optimize
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Clean up and optimize database performance
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-green-500" />
                        <Label>Clear Cache</Label>
                      </div>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Clear system cache to free up space</p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-purple-500" />
                        <Label>Export Data</Label>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Export all system data for backup</p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-orange-500" />
                        <Label>System Logs</Label>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">View system activity and error logs</p>
                  </Card>
                </div>
              </div>

              {/* Developer Options */}
              <div className="space-y-4">
                <h3 className="font-medium">Developer Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Debug Mode</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Enable detailed error logging</p>
                    </div>
                    <Switch
                      checked={settings.system.debugMode}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          system: { ...settings.system, debugMode: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Put system in maintenance mode</p>
                    </div>
                    <Switch
                      checked={settings.system.maintenanceMode}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          system: { ...settings.system, maintenanceMode: checked },
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="updateChannel">Update Channel</Label>
                  <Select
                    value={settings.system.updateChannel}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        system: { ...settings.system, updateChannel: value },
                      })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stable">Stable</SelectItem>
                      <SelectItem value="beta">Beta</SelectItem>
                      <SelectItem value="alpha">Alpha (Developer)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("system")} className="gap-2" disabled={saving}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save System Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
