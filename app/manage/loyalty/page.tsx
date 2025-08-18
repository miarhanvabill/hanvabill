"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { Star, Gift, Settings, Users, TrendingUp } from "lucide-react"
import { getLoyaltySettings, updateLoyaltySettings, getLoyaltyStats } from "@/app/actions/loyalty"

interface LoyaltySettings {
  id?: number
  // earning
  earn_on_purchase_enabled: boolean
  points_per_rupee: number
  // redemption/caps
  max_redemption_percent: number
  minimum_order_amount: number
  // general/legacy
  cashback_percentage: number
  is_active: boolean
  welcome_bonus: number
  referral_bonus: number
  // expiry
  points_validity_days: number
}

interface LoyaltyStats {
  total_members: number
  total_points_issued: number
  total_cashback_given: number
  active_members: number
}

const VALIDITY_PRESETS = [30, 45, 90, 180, 365]

export default function LoyaltyPage() {
  const [settings, setSettings] = useState<LoyaltySettings>({
    earn_on_purchase_enabled: true,
    points_per_rupee: 1,
    max_redemption_percent: 50,
    minimum_order_amount: 100,
    cashback_percentage: 0,
    is_active: true,
    welcome_bonus: 100,
    referral_bonus: 50,
    points_validity_days: 45,
  })
  const [stats, setStats] = useState<LoyaltyStats>({
    total_members: 0,
    total_points_issued: 0,
    total_cashback_given: 0,
    active_members: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [settingsData, statsData] = await Promise.all([getLoyaltySettings(), getLoyaltyStats()])
      if (settingsData) setSettings((prev) => ({ ...prev, ...settingsData }))
      setStats(statsData)
    } catch (error) {
      console.error("Failed to load loyalty data:", error)
      toast({
        title: "Error",
        description: "Failed to load loyalty program data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      await updateLoyaltySettings(settings)
      toast({
        title: "Success",
        description: "Loyalty program settings updated successfully",
      })
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast({
        title: "Error",
        description: "Failed to save loyalty program settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const previewAmount = 1000
  const previewPoints = useMemo(() => {
    if (!settings.earn_on_purchase_enabled || !settings.is_active) return 0
    return Math.max(0, Math.floor(previewAmount * (Number(settings.points_per_rupee) || 0)))
  }, [settings])

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Loyalty Program" subtitle="Manage your customer loyalty and rewards program" />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Loyalty Program" subtitle="Manage your customer loyalty and rewards program" />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Members</p>
                    <p className="text-xl font-semibold">{stats.total_members}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Members</p>
                    <p className="text-xl font-semibold">{stats.active_members}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Points Issued</p>
                    <p className="text-xl font-semibold">{stats.total_points_issued}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cashback Given</p>
                    <p className="text-xl font-semibold">₹{stats.total_cashback_given}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="settings" className="space-y-6">
            <TabsList>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Loyalty Program Settings
                  </CardTitle>
                  <CardDescription>Configure earning, redemption, and expiry rules</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Enable Loyalty Program</Label>
                      <p className="text-sm text-gray-600">Turn on/off the entire loyalty program</p>
                    </div>
                    <Switch
                      checked={settings.is_active}
                      onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
                    />
                  </div>

                  {/* Earning */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Earn Points on Purchase</Label>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Give points when customers pay</p>
                        <Switch
                          checked={settings.earn_on_purchase_enabled}
                          onCheckedChange={(checked) => setSettings({ ...settings, earn_on_purchase_enabled: checked })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="pointsPerRupee">Points per Rupee</Label>
                      <Input
                        id="pointsPerRupee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.points_per_rupee}
                        onChange={(e) =>
                          setSettings({ ...settings, points_per_rupee: Number.parseFloat(e.target.value) || 0 })
                        }
                        disabled={!settings.earn_on_purchase_enabled}
                      />
                      <p className="text-xs text-gray-500 mt-1">How many points customers earn per rupee spent</p>
                    </div>
                  </div>

                  {/* Redemption */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="maxRedemption">Max Redemption Per Order (%)</Label>
                      <Input
                        id="maxRedemption"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={settings.max_redemption_percent}
                        onChange={(e) =>
                          setSettings({ ...settings, max_redemption_percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum portion of the bill that can be paid with points
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="minimumOrder">Minimum Order Amount</Label>
                      <Input
                        id="minimumOrder"
                        type="number"
                        min="0"
                        value={settings.minimum_order_amount}
                        onChange={(e) =>
                          setSettings({ ...settings, minimum_order_amount: Number.parseInt(e.target.value) || 0 })
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum order amount to earn points</p>
                    </div>
                  </div>

                  {/* Expiry */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="pointsValidity">Points Validity (days)</Label>
                      <Input
                        id="pointsValidity"
                        type="number"
                        min="1"
                        value={settings.points_validity_days}
                        onChange={(e) =>
                          setSettings({ ...settings, points_validity_days: Math.max(1, Number.parseInt(e.target.value) || 45) })
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">How long earned points remain valid</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {VALIDITY_PRESETS.map((d) => (
                          <Button key={d} size="sm" variant={settings.points_validity_days === d ? "default" : "secondary"} onClick={() => setSettings({ ...settings, points_validity_days: d })}>
                            {d} days
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cashbackPercentage">Cashback Percentage (optional)</Label>
                      <Input
                        id="cashbackPercentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.cashback_percentage}
                        onChange={(e) =>
                          setSettings({ ...settings, cashback_percentage: Number.parseFloat(e.target.value) || 0 })
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">Purely informational if you also use points</p>
                    </div>
                  </div>

                  {/* Bonuses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="welcomeBonus">Welcome Bonus Points</Label>
                      <Input
                        id="welcomeBonus"
                        type="number"
                        min="0"
                        value={settings.welcome_bonus}
                        onChange={(e) =>
                          setSettings({ ...settings, welcome_bonus: Number.parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="referralBonus">Referral Bonus Points</Label>
                      <Input
                        id="referralBonus"
                        type="number"
                        min="0"
                        value={settings.referral_bonus}
                        onChange={(e) =>
                          setSettings({ ...settings, referral_bonus: Number.parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Preview (₹{previewAmount} purchase)</CardTitle>
                        <CardDescription>Based on current settings</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm"><span>Earn on purchase:</span><span>{settings.earn_on_purchase_enabled ? "Yes" : "No"}</span></div>
                        <div className="flex justify-between text-sm"><span>Points per rupee:</span><span>{settings.points_per_rupee}</span></div>
                        <div className="flex justify-between text-sm"><span>Max redemption per order:</span><span>{settings.max_redemption_percent}%</span></div>
                        <div className="flex justify-between text-sm"><span>Points validity:</span><span>{settings.points_validity_days} days</span></div>
                        <div className="flex justify-between text-sm font-medium"><span>Points earned on ₹{previewAmount}:</span><span>+{previewPoints}</span></div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSettings} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle>Loyalty Members</CardTitle>
                  <CardDescription>Manage your loyalty program members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Member management coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Loyalty Transactions</CardTitle>
                  <CardDescription>View all loyalty points and cashback transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Transaction history coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
