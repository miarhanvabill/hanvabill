export interface CustomerLoyalty {
  id: string
  customerId: string
  points: number
  tier: "bronze" | "silver" | "gold" | "platinum"
  lifetimeSpending: number
  joinDate: string
  lastActivity: string
}

export interface LoyaltyTransaction {
  id: string
  customerId: string
  points: number
  amount: number
  type: "earned" | "redeemed"
  description: string
  createdAt: string
}

export interface LoyaltyTier {
  name: string
  minSpending: number
  pointsMultiplier: number
  benefits: string[]
  color: string
  icon: string
}

export const LOYALTY_TIERS: Record<string, LoyaltyTier> = {
  bronze: {
    name: "Bronze",
    minSpending: 0,
    pointsMultiplier: 1,
    benefits: ["1 point per ₹1 spent", "Birthday discount"],
    color: "#CD7F32",
    icon: "🥉",
  },
  silver: {
    name: "Silver",
    minSpending: 25000,
    pointsMultiplier: 1.25,
    benefits: ["1.25 points per ₹1 spent", "Priority booking", "Birthday discount"],
    color: "#C0C0C0",
    icon: "🥈",
  },
  gold: {
    name: "Gold",
    minSpending: 50000,
    pointsMultiplier: 1.5,
    benefits: ["1.5 points per ₹1 spent", "Priority booking", "Free consultation", "Birthday discount"],
    color: "#FFD700",
    icon: "🥇",
  },
  platinum: {
    name: "Platinum",
    minSpending: 100000,
    pointsMultiplier: 2,
    benefits: ["2 points per ₹1 spent", "VIP treatment", "Free consultation", "Exclusive offers", "Birthday discount"],
    color: "#E5E4E2",
    icon: "💎",
  },
}

export function calculateTier(lifetimeSpending: number): "bronze" | "silver" | "gold" | "platinum" {
  if (lifetimeSpending >= 100000) return "platinum"
  if (lifetimeSpending >= 50000) return "gold"
  if (lifetimeSpending >= 25000) return "silver"
  return "bronze"
}

export function calculatePointsEarned(amount: number, tier: "bronze" | "silver" | "gold" | "platinum"): number {
  const tierData = LOYALTY_TIERS[tier]
  return Math.floor(amount * tierData.pointsMultiplier)
}

export function getNextTierRequirement(
  currentTier: "bronze" | "silver" | "gold" | "platinum",
  lifetimeSpending: number,
) {
  const tiers = ["bronze", "silver", "gold", "platinum"]
  const currentIndex = tiers.indexOf(currentTier)

  if (currentIndex === tiers.length - 1) {
    return null // Already at highest tier
  }

  const nextTier = tiers[currentIndex + 1]
  const nextTierData = LOYALTY_TIERS[nextTier]
  const remaining = nextTierData.minSpending - lifetimeSpending

  return {
    tier: nextTier,
    remaining: Math.max(0, remaining),
    progress: Math.min(100, (lifetimeSpending / nextTierData.minSpending) * 100),
  }
}

export function getNextTier(
  currentTier: "bronze" | "silver" | "gold" | "platinum",
): "bronze" | "silver" | "gold" | "platinum" | null {
  const tiers = ["bronze", "silver", "gold", "platinum"]
  const currentIndex = tiers.indexOf(currentTier)

  if (currentIndex === tiers.length - 1) {
    return null // Already at highest tier
  }

  return tiers[currentIndex + 1] as "bronze" | "silver" | "gold" | "platinum"
}

export function calculateProgressToNextTier(
  currentTier: "bronze" | "silver" | "gold" | "platinum",
  lifetimeSpending: number,
): { progress: number; remaining: number; nextTier: string | null } {
  const nextTier = getNextTier(currentTier)

  if (!nextTier) {
    return {
      progress: 100,
      remaining: 0,
      nextTier: null,
    }
  }

  const nextTierData = LOYALTY_TIERS[nextTier]
  const currentTierData = LOYALTY_TIERS[currentTier]

  const spendingInCurrentTier = lifetimeSpending - currentTierData.minSpending
  const spendingNeededForNextTier = nextTierData.minSpending - currentTierData.minSpending

  const progress = Math.min(100, (spendingInCurrentTier / spendingNeededForNextTier) * 100)
  const remaining = Math.max(0, nextTierData.minSpending - lifetimeSpending)

  return {
    progress,
    remaining,
    nextTier: nextTierData.name,
  }
}
