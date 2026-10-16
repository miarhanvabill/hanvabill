"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { Star, Gift, Settings, Users, TrendingUp, Crown, Trash2, Plus, ArrowRight, ExternalLink, Share2 } from "lucide-react"
import { getLoyaltySettings, updateLoyaltySettings, getLoyaltyStats, getLoyaltyTiers, createLoyaltyTier, updateLoyaltyTier, deleteLoyaltyTier, LoyaltyTier } from "@/app/actions/loyalty"
import { getCustomerWallets } from "@/app/actions/wallet"

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
  
  const [tiers, setTiers] = useState<LoyaltyTier[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [isTiersLoading, setIsTiersLoading] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [settingsData, statsData, tiersData, membersData] = await Promise.all([
        getLoyaltySettings(),
        getLoyaltyStats(),
        getLoyaltyTiers(),
        getCustomerWallets(),
      ])
      if (settingsData) setSettings((prev) => ({ ...prev, ...settingsData }))
      setStats(statsData)
      if (tiersData) setTiers(tiersData)
      if (membersData) setMembers(membersData)
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

  
  const handleAddTier = async () => {
    try {
      const newTier = await createLoyaltyTier({
        name: "New Tier",
        min_points: 0,
        earn_multiplier: 1.0,
        badge_color: "#FFD700"
      })
      if (newTier) setTiers([...tiers, newTier])
      toast({ title: "Success", description: "Tier added" })
    } catch (e) {
      toast({ title: "Error", description: "Failed to add tier", variant: "destructive" })
    }
  }

  const handleUpdateTier = async (id: number, field: keyof LoyaltyTier, value: any) => {
    const updatedTiers = tiers.map(t => t.id === id ? { ...t, [field]: value } : t)
    setTiers(updatedTiers)
    
    try {
      await updateLoyaltyTier(id, { [field]: value })
    } catch (e) {
      toast({ title: "Error", description: "Failed to update tier", variant: "destructive" })
      loadData() // rollback
    }
  }

  const handleDeleteTier = async (id: number) => {
    try {
      await deleteLoyaltyTier(id)
      setTiers(tiers.filter(t => t.id !== id))
      toast({ title: "Success", description: "Tier deleted" })
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete tier", variant: "destructive" })
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
        <PageHeader title="Loyalty Program" subtitle="Manage your customer loyalty and rewards program" />
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
      <PageHeader title="Loyalty Program" subtitle="Manage your customer loyalty and rewards program" />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Retention Module Sub-Navigation */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
            <Link
              href="/manage/loyalty"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-white shadow-sm"
            >
              Loyalty Settings & Tiers
            </Link>
            <Link
              href="/manage/loyalty-transactions"
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Loyalty Transactions
            </Link>
            <Link
              href="/manage/referral-program"
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-700 border border-gray-200 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-gray-700" />
              <span>Refer & Earn Program</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-700 font-bold">New</span>
            </Link>
            <Link
              href="/manage/wallet"
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Customer Wallets
            </Link>
          </div>

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
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-amber-600" />
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
              <TabsTrigger value="tiers">VIP Tiers</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="referral" asChild>
                <Link href="/manage/referral-program" className="flex items-center gap-1.5 text-gray-700 hover:text-black">
                  <Share2 className="w-3.5 h-3.5 text-gray-600" />
                  Refer & Earn 🎁
                </Link>
              </TabsTrigger>
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

            <TabsContent value="tiers">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-500" />
                      VIP Tiers
                    </CardTitle>
                    <CardDescription>Reward your best customers with multipliers based on lifetime points</CardDescription>
                  </div>
                  <Button onClick={handleAddTier} size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Add Tier
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tiers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No VIP Tiers configured.</div>
                  ) : (
                    <div className="space-y-4">
                      {tiers.map((tier) => (
                        <div key={tier.id} className="flex flex-wrap items-center gap-4 p-4 border rounded-lg bg-white">
                          <div className="flex-1 min-w-[200px]">
                            <Label className="text-xs text-gray-500">Tier Name</Label>
                            <Input
                              value={tier.name}
                              onChange={(e) => handleUpdateTier(tier.id!, 'name', e.target.value)}
                            />
                          </div>
                          <div className="w-[150px]">
                            <Label className="text-xs text-gray-500">Min Points</Label>
                            <Input
                              type="number"
                              value={tier.min_points}
                              onChange={(e) => handleUpdateTier(tier.id!, 'min_points', Number(e.target.value))}
                            />
                          </div>
                          <div className="w-[150px]">
                            <Label className="text-xs text-gray-500">Earn Multiplier</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={tier.earn_multiplier}
                              onChange={(e) => handleUpdateTier(tier.id!, 'earn_multiplier', Number(e.target.value))}
                            />
                          </div>
                          <div className="w-[100px]">
                            <Label className="text-xs text-gray-500">Color</Label>
                            <Input
                              type="color"
                              className="h-10 p-1"
                              value={tier.badge_color || '#000000'}
                              onChange={(e) => handleUpdateTier(tier.id!, 'badge_color', e.target.value)}
                            />
                          </div>
                          <div className="flex items-end pb-1">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTier(tier.id!)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Loyalty Program Members ({members.length})</CardTitle>
                    <CardDescription>All enrolled salon customers and their current reward points</CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/manage/wallet" className="flex items-center gap-2">
                      Manage Wallets & Balances
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No loyalty members found. Customers are enrolled automatically on first visit.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left p-3 font-medium">Customer</th>
                            <th className="text-left p-3 font-medium">Phone</th>
                            <th className="text-left p-3 font-medium">Tier</th>
                            <th className="text-left p-3 font-medium">Available Points</th>
                            <th className="text-left p-3 font-medium">Lifetime Earned</th>
                            <th className="text-right p-3 font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {members.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50">
                              <td className="p-3 font-medium text-gray-900">{member.customerName}</td>
                              <td className="p-3 text-gray-600">{member.customerPhone}</td>
                              <td className="p-3">
                                <Badge variant="secondary" className="capitalize">
                                  {member.tier || "Bronze"}
                                </Badge>
                              </td>
                              <td className="p-3 font-semibold text-gray-900">{member.totalPoints} pts</td>
                              <td className="p-3 text-gray-600">{member.lifetimeEarned} pts</td>
                              <td className="p-3 text-right">
                                <Button asChild variant="ghost" size="sm">
                                  <Link href={`/customers/${member.customerId}`} className="flex items-center gap-1">
                                    Profile
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Loyalty Transactions Ledger</CardTitle>
                    <CardDescription>Comprehensive audit trail of points earned, redeemed, expired, and bonus awards</CardDescription>
                  </div>
                  <Button asChild size="sm">
                    <Link href="/manage/loyalty-transactions" className="flex items-center gap-2">
                      Open Full Transactions Ledger
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center md:text-left">
                      <h4 className="font-semibold text-gray-900 text-lg">Live Points & Adjustment System</h4>
                      <p className="text-sm text-gray-600">
                        Search transactions by customer, filter by earning type (Earned, Redeemed, Bonus, Refund), and make manual adjustments.
                      </p>
                    </div>
                    <Button asChild className="bg-gray-900 hover:bg-black text-white shrink-0">
                      <Link href="/manage/loyalty-transactions" className="flex items-center gap-2">
                        View & Adjust Transactions
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground font-medium">Total Points Issued</p>
                        <p className="text-xl font-bold text-green-700 mt-1">{stats.total_points_issued.toLocaleString()} pts</p>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground font-medium">Active Enrolled Members</p>
                        <p className="text-xl font-bold text-blue-700 mt-1">{stats.active_members}</p>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground font-medium">Total Cashback Credited</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">₹{stats.total_cashback_given.toLocaleString()}</p>
                      </CardContent>
                    </Card>
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
