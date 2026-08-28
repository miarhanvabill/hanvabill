const fs = require('fs');

let content = fs.readFileSync('app/manage/loyalty/page.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  'import { getLoyaltySettings, updateLoyaltySettings, getLoyaltyStats } from "@/app/actions/loyalty"',
  'import { getLoyaltySettings, updateLoyaltySettings, getLoyaltyStats, getLoyaltyTiers, createLoyaltyTier, updateLoyaltyTier, deleteLoyaltyTier, LoyaltyTier } from "@/app/actions/loyalty"'
);
content = content.replace(
  'import { Star, Gift, Settings, Users, TrendingUp } from "lucide-react"',
  'import { Star, Gift, Settings, Users, TrendingUp, Crown, Trash2, Plus } from "lucide-react"'
);

// 2. Add state
const stateToInject = `
  const [tiers, setTiers] = useState<LoyaltyTier[]>([])
  const [isTiersLoading, setIsTiersLoading] = useState(false)
`;
content = content.replace('const [isLoading, setIsLoading] = useState(true)', stateToInject + '\n  const [isLoading, setIsLoading] = useState(true)');

// 3. Update loadData
content = content.replace(
  'const [settingsData, statsData] = await Promise.all([getLoyaltySettings(), getLoyaltyStats()])',
  'const [settingsData, statsData, tiersData] = await Promise.all([getLoyaltySettings(), getLoyaltyStats(), getLoyaltyTiers()])'
);
content = content.replace(
  'setStats(statsData)',
  'setStats(statsData)\n      if (tiersData) setTiers(tiersData)'
);

// 4. Add tiers methods
const tiersMethods = `
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
`;
content = content.replace('const previewAmount = 1000', tiersMethods + '\n  const previewAmount = 1000');

// 5. Add TabsTrigger
content = content.replace(
  '<TabsTrigger value="settings">Settings</TabsTrigger>',
  '<TabsTrigger value="settings">Settings</TabsTrigger>\n              <TabsTrigger value="tiers">VIP Tiers</TabsTrigger>'
);

// 6. Add TabsContent
const tiersTab = `
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
`;
content = content.replace('</TabsContent>\n\n            <TabsContent value="members">', '</TabsContent>\n' + tiersTab + '\n            <TabsContent value="members">');

fs.writeFileSync('app/manage/loyalty/page.tsx', content);
