"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { type CustomerLoyalty, LOYALTY_TIERS, getNextTier, calculateProgressToNextTier } from "@/lib/loyalty"
import { formatCurrency } from "@/lib/currency"
import { Star, Gift, TrendingUp } from "lucide-react"

interface LoyaltyCardProps {
  loyalty: CustomerLoyalty
  customerName: string
}

export function LoyaltyCard({ loyalty, customerName }: LoyaltyCardProps) {
  const tierData = LOYALTY_TIERS[loyalty.tier]
  const nextTier = getNextTier(loyalty.tier)
  const progress = calculateProgressToNextTier(loyalty.lifetimeSpending, loyalty.tier)

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-purple-600" />
            <span>Loyalty Card</span>
          </div>
          <Badge className={`${tierData.color} text-white`}>
            {tierData.icon} {tierData.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div>
          <h3 className="font-semibold text-lg">{customerName}</h3>
          <p className="text-sm text-gray-600">Member since {new Date(loyalty.joinDate).toLocaleDateString("en-IN")}</p>
        </div>

        {/* Points Balance */}
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Available Points</span>
            <Gift className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{loyalty.points.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Worth {formatCurrency(loyalty.points)}</div>
        </div>

        {/* Lifetime Spending */}
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Lifetime Spending</span>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(loyalty.lifetimeSpending)}</div>
        </div>

        {/* Progress to Next Tier */}
        {nextTier && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to {LOYALTY_TIERS[nextTier.tier].name}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-gray-500">
              Spend {formatCurrency(nextTier.spending - loyalty.lifetimeSpending)} more to reach{" "}
              {LOYALTY_TIERS[nextTier.tier].name}
            </div>
          </div>
        )}

        {/* Tier Benefits */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Your Benefits:</h4>
          <div className="space-y-1">
            {tierData.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
