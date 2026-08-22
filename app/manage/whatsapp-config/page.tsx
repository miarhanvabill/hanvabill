"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { MessageSquare, Save, Lock, Smartphone, Key } from "lucide-react"
import { getBusinessSettings, updateBusinessSettings } from "@/app/actions/settings"

export default function WhatsAppConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    enabled: false,
    userid: "",
    password: "",
    wabaNumber: "",
    autoInvoice: false,
    autoReminders: false,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const settings = await getBusinessSettings()
      if (settings?.whatsapp) {
        setFormData({
          enabled: settings.whatsapp.enabled ?? false,
          userid: settings.whatsapp.userid || "",
          password: settings.whatsapp.password || "",
          wabaNumber: settings.whatsapp.wabaNumber || "",
          autoInvoice: settings.whatsapp.autoInvoice ?? false,
          autoReminders: settings.whatsapp.autoReminders ?? false,
        })
      }
    } catch (error) {
      console.error("Failed to load WhatsApp settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateBusinessSettings("whatsapp", formData)
      if (result.success) {
        toast.success("WhatsApp configuration saved successfully")
        router.refresh()
      } else {
        toast.error(result.message || "Failed to save configuration")
      }
    } catch (error) {
      console.error("Failed to save WhatsApp settings:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <PageHeader title="WhatsApp Configuration" />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="WhatsApp Configuration"
        subtitle="Connect your WhatsApp Business API via Fonada to send invoices, reminders, and updates."
      />

      <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                WhatsApp Integration
              </CardTitle>
              <CardDescription>
                Enable or disable WhatsApp integration for your salon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable WhatsApp Features</Label>
                  <p className="text-sm text-gray-500">
                    Allow sending messages, invoices and reminders via WhatsApp
                  </p>
                </div>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {formData.enabled && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Fonada Credentials</CardTitle>
                  <CardDescription>
                    Enter your Fonada API credentials. These details are used to authenticate with the WhatsApp sending service.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="userid">User ID / Username</Label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="userid"
                        className="pl-9"
                        placeholder="Enter your Fonada user ID"
                        value={formData.userid}
                        onChange={(e) => setFormData({ ...formData, userid: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">API Password</Label>
                    <div className="relative">
                      <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="password"
                        type="password"
                        className="pl-9"
                        placeholder="Enter your API password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="wabaNumber">WABA Number</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="wabaNumber"
                        className="pl-9"
                        placeholder="e.g. 919876543210"
                        value={formData.wabaNumber}
                        onChange={(e) => setFormData({ ...formData, wabaNumber: e.target.value })}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Your approved WhatsApp Business API number with country code</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Automation Preferences</CardTitle>
                  <CardDescription>Configure which messages are sent automatically</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Automatic Invoices</Label>
                      <p className="text-sm text-gray-500">Send an invoice link via WhatsApp upon checkout</p>
                    </div>
                    <Switch
                      checked={formData.autoInvoice}
                      onCheckedChange={(checked) => setFormData({ ...formData, autoInvoice: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Appointment Reminders</Label>
                      <p className="text-sm text-gray-500">Send automatic reminders for upcoming appointments</p>
                    </div>
                    <Switch
                      checked={formData.autoReminders}
                      onCheckedChange={(checked) => setFormData({ ...formData, autoReminders: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Configuration
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
