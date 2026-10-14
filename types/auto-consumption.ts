// types/auto-consumption.ts

export interface AutoConsumptionRule {
  id: string
  name: string
  serviceId: string
  serviceName: string
  productId: string
  productName: string
  consumptionAmount: number
  unit: string
  isActive: boolean
  triggerType: "automatic" | "manual" | "conditional"
  conditions?: string[]
  createdAt: string
  updatedAt: string
  lastTriggered?: string | null
  totalConsumptions: number
  estimatedCost: number
}

export interface ConsumptionLog {
  id: string
  ruleId: string
  ruleName?: string
  serviceBookingId: string
  customerName: string
  staffName: string
  productConsumed: string
  amount: number
  unit: string
  cost: number
  timestamp: string
  status: "completed" | "pending" | "failed"
}

export interface ConsumptionStats {
  totalRules: number
  activeRules: number
  totalConsumptions: number
  totalCost: number
  avgConsumptionPerService: number
  topConsumedProducts: Array<{
    productName: string
    totalAmount: number
    totalCost: number
  }>
}
