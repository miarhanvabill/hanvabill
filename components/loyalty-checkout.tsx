"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Star, Gift, TrendingUp, Award, Sparkles, AlertCircle, CheckCircle, Crown, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { LOYALTY_TIERS, getNextTierRequirement, type CustomerLoyalty } from "@/lib/loyalty"

export interface LoyaltyCheckoutProps {
  customerLoyalty: CustomerLoyalty | null
  redeemEnabled: boolean
  pointsToRedeem: number
  maxRedeemablePoints: number
  finalAmount: number
  pointsEarned: number
  earningRate?: number
  maxRedeemPercent?: number
  minOrderAmount?: number
  expiringSoonPoints?: number
  expiringSoonDays?: number
  onToggleRedeem: (enabled: boolean) => void
  onChangePoints: (points: number) => void
  onEnroll?: () => Promise<void> | void
  step?: number
}

function LoyaltyCheckoutComp({
  customerLoyalty,
  redeemEnabled,
  pointsToRedeem,
  maxRedeemablePoints,
  finalAmount,
  pointsEarned,
  earningRate = 1,
  maxRedeemPercent = 50,
  minOrderAmount = 0,
  expiringSoonPoints = 0,
  expiringSoonDays = 7,
  onToggleRedeem,
  onChangePoints,
  onEnroll,
  step = 10,
}: LoyaltyCheckoutProps) {
  if (!customerLoyalty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Loyalty Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Customer not enrolled in loyalty program.</AlertDescription>
          </Alert>
          {onEnroll && (
            <div className="flex justify-end">
              <Button onClick={() => onEnroll()}>Enroll Now</Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const tierData = LOYALTY_TIERS[customerLoyalty.tier] || LOYALTY_TIERS.bronze
  const nextTierInfo = getNextTierRequirement(customerLoyalty.tier, customerLoyalty.lifetimeSpending)

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "platinum": return <Crown className="w-5 h-5 text-gray-400" />
      case "gold": return <Award className="w-5 h-5 text-yellow-500" />
      case "silver": return <Award className="w-5 h-5 text-gray-400" />
      default: return <Award className="w-5 h-5 text-amber-600" />
    }
  }
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "platinum": return "bg-gray-100 text-gray-800 border-gray-300"
      case "gold": return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "silver": return "bg-gray-100 text-gray-700 border-gray-300"
      default: return "bg-amber-100 text-amber-800 border-amber-300"
    }
  }

  const otherBenefits: string[] = Array.isArray(tierData.benefits)
    ? (tierData.benefits as string[]).filter((b) => typeof b === "string" && !b.toLowerCase().includes("point"))
    : []

  const belowMin = minOrderAmount > 0 && finalAmount < minOrderAmount

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Loyalty Program
        </CardTitle>
        <CardDescription>Earn and redeem loyalty points</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Expiring soon */}
        {expiringSoonPoints > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {expiringSoonPoints} point(s) will expire in the next {expiringSoonDays} day(s).
            </AlertDescription>
          </Alert>
        )}

        {/* Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getTierIcon(customerLoyalty.tier)}
              <Badge className={`${getTierColor(customerLoyalty.tier)} border`}>{tierData.name} Member</Badge>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{customerLoyalty.points} points</p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium mb-2">Your Benefits:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Earn {earningRate} point(s) per ₹1 spent
              </li>
              <li className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Up to {maxRedeemPercent}% of bill can be paid with points
              </li>
              {minOrderAmount > 0 && (
                <li className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Earn only on orders ≥ {formatCurrency(minOrderAmount)}
                </li>
              )}
              {otherBenefits.map((b, i) => (
                <li key={i} className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {nextTierInfo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress to {LOYALTY_TIERS[nextTierInfo.tier].name}</span>
                <span>{Math.round(nextTierInfo.progress)}%</span>
              </div>
              <Progress value={nextTierInfo.progress} className="h-2" />
              <p className="text-xs text-gray-500">
                Spend {formatCurrency(nextTierInfo.remaining)} more to reach {LOYALTY_TIERS[nextTierInfo.tier].name} tier
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Redeem */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-500" />
              <Label htmlFor="redeem-points" className="text-sm font-medium">Redeem Points</Label>
            </div>
            <Switch
              id="redeem-points"
              checked={redeemEnabled}
              onCheckedChange={onToggleRedeem}
              disabled={maxRedeemablePoints === 0}
            />
          </div>

          {redeemEnabled && maxRedeemablePoints > 0 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Points to redeem:</span>
                  <span>{pointsToRedeem} points = {formatCurrency(pointsToRedeem)}</span>
                </div>
                <Slider
                  value={[pointsToRedeem]}
                  onValueChange={(v) => onChangePoints(v?.[0] ?? 0)}
                  max={maxRedeemablePoints}
                  min={0}
                  step={step}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0</span>
                  <span>Max: {maxRedeemablePoints} points</span>
                </div>
              </div>

              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  You can redeem up to {maxRedeemablePoints} points ({maxRedeemPercent}% of bill amount).
                </AlertDescription>
              </Alert>
            </div>
          )}

          {maxRedeemablePoints === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {customerLoyalty.points === 0 ? "No points available for redemption." : "Minimum purchase amount required for point redemption."}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Earn */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Points You'll Earn</span>
          </div>

          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-green-700">+{pointsEarned} points</p>
                <p className="text-xs text-green-600">{earningRate} point(s) per ₹1 spent</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-700">On {formatCurrency(finalAmount)}</p>
                <p className="text-xs text-green-600">Final amount</p>
              </div>
            </div>
            {minOrderAmount > 0 && finalAmount < minOrderAmount && (
              <p className="text-xs text-red-600 mt-1">
                Not eligible to earn points below {formatCurrency(minOrderAmount)}.
              </p>
            )}
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Points are earned on the final amount after discounts</p>
            <p>• Points will be credited after payment confirmation</p>
            <p>• 1 point = ₹1 value for future redemptions</p>
          </div>
        </div>

        {/* Summary */}
        <div className="p-3 bg-blue-50 rounded-lg space-y-2">
          <h4 className="text-sm font-medium text-blue-900">Transaction Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Current Points:</span><span>{customerLoyalty.points}</span></div>
            {redeemEnabled && pointsToRedeem > 0 && (
              <div className="flex justify-between text-red-600"><span>Points Redeemed:</span><span>-{pointsToRedeem}</span></div>
            )}
            <div className="flex justify-between text-green-600"><span>Points Earned:</span><span>+{pointsEarned}</span></div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>New Balance:</span>
              <span>{customerLoyalty.points - (redeemEnabled ? pointsToRedeem : 0) + pointsEarned}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default LoyaltyCheckoutComp
export { LoyaltyCheckoutComp as LoyaltyCheckout }
