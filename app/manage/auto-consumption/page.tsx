"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useRealTimeSync } from "@/lib/websocket"
import { Plus, Search, RefreshCw, Settings, CheckCircle, TrendingUp, Edit, Trash2, Eye, Activity } from "lucide-react"

import {
  getAutoConsumptionRules,
  getConsumptionLogs,
  getConsumptionStats,
  createAutoConsumptionRule,
  updateAutoConsumptionRule,
  deleteAutoConsumptionRule,
  toggleRuleStatus,
  getAvailableServices,
  getAvailableProducts,
  type AutoConsumptionRule,
  type ConsumptionLog,
  type ConsumptionStats,
} from "@/app/actions/auto-consumption"

export default function AutoConsumptionPage() {
  const [rules, setRules] = useState<AutoConsumptionRule[]>([])
  const [logs, setLogs] = useState<ConsumptionLog[]>([])
  const [stats, setStats] = useState<ConsumptionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
  const [filterType, setFilterType] = useState<"all" | "automatic" | "manual" | "conditional">("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AutoConsumptionRule | null>(null)
  const [selectedRule, setSelectedRule] = useState<AutoConsumptionRule | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [availableServices, setAvailableServices] = useState<Array<{ id: string; name: string }>>([])
  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string; name: string; unit: string }>>([])

  const { toast } = useToast()
  const { isConnected, subscribe, broadcast } = useRealTimeSync([
    "auto_consumption_update",
    "consumption_triggered",
    "rule_status_change",
  ])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Loading auto-consumption data...")

      const [rulesData, logsData, statsData, servicesData, productsData] = await Promise.all([
        getAutoConsumptionRules(),
        getConsumptionLogs(),
        getConsumptionStats(),
        getAvailableServices(),
        getAvailableProducts(),
      ])

      console.log("[v0] Loaded rules:", rulesData.length)
      console.log("[v0] Loaded logs:", logsData.length)
      console.log("[v0] Loaded stats:", statsData)

      setRules(rulesData)
      setLogs(logsData)
      setStats(statsData)
      setAvailableServices(servicesData)
      setAvailableProducts(productsData)
    } catch (error) {
      console.error("[v0] Error loading auto-consumption data:", error)
      toast({
        title: "Error",
        description: "Failed to load auto-consumption data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // Real-time refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    toast({
      title: "Data Refreshed",
      description: "Auto-consumption data has been updated",
    })
  }, [loadData, toast])

  // Real-time event handlers
  useEffect(() => {
    subscribe("auto_consumption_update", (event) => {
      const updatedRule = event.data
      setRules((prev) => prev.map((rule) => (rule.id === updatedRule.id ? { ...rule, ...updatedRule } : rule)))
      toast({
        title: "Rule Updated",
        description: `${updatedRule.name} has been updated`,
      })
    })

    subscribe("consumption_triggered", (event) => {
      const newLog = event.data
      setLogs((prev) => [newLog, ...prev])
      toast({
        title: "Consumption Triggered",
        description: `${newLog.productConsumed} consumed for ${newLog.customerName}`,
      })
    })

    subscribe("rule_status_change", (event) => {
      const { ruleId, isActive } = event.data
      setRules((prev) => prev.map((rule) => (rule.id === ruleId ? { ...rule, isActive } : rule)))
    })
  }, [subscribe, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.productName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && rule.isActive) ||
      (filterStatus === "inactive" && !rule.isActive)

    const matchesType = filterType === "all" || rule.triggerType === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  const handleToggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const result = await toggleRuleStatus(ruleId, isActive)

      if (result.success) {
        setRules((prev) => prev.map((rule) => (rule.id === ruleId ? { ...rule, isActive } : rule)))
        broadcast("rule_status_change", { ruleId, isActive })
        toast({
          title: isActive ? "Rule Activated" : "Rule Deactivated",
          description: result.message,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error toggling rule status:", error)
      toast({
        title: "Error",
        description: "Failed to update rule status",
        variant: "destructive",
      })
    }
  }

  const handleCreateRule = async (ruleData: {
    name: string
    serviceId: string
    productId: string
    consumptionAmount: number
    unit: string
    triggerType: "automatic" | "manual" | "conditional"
    conditions?: string[]
  }) => {
    try {
      const result = await createAutoConsumptionRule(ruleData)

      if (result.success && result.rule) {
        setRules((prev) => [result.rule!, ...prev])
        setShowCreateModal(false)
        broadcast("auto_consumption_update", result.rule)
        toast({
          title: "Rule Created",
          description: result.message,
        })
        // Refresh data to get updated stats
        await loadData()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating rule:", error)
      toast({
        title: "Error",
        description: "Failed to create auto-consumption rule",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const result = await deleteAutoConsumptionRule(ruleId)

      if (result.success) {
        setRules((prev) => prev.filter((rule) => rule.id !== ruleId))
        toast({
          title: "Rule Deleted",
          description: result.message,
        })
        // Refresh data to get updated stats
        await loadData()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting rule:", error)
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive",
      })
    }
  }

  const handleUpdateRule = async (ruleId: string, updates: Partial<AutoConsumptionRule>) => {
    try {
      const result = await updateAutoConsumptionRule(ruleId, updates)

      if (result.success) {
        setRules((prev) =>
          prev.map((rule) =>
            rule.id === ruleId ? { ...rule, ...updates, updatedAt: new Date().toISOString() } : rule,
          ),
        )
        setEditingRule(null)
        broadcast("auto_consumption_update", { id: ruleId, ...updates })
        toast({
          title: "Rule Updated",
          description: result.message,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating rule:", error)
      toast({
        title: "Error",
        description: "Failed to update rule",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Auto Consumption</h1>
            <p className="text-muted-foreground">Manage automatic product consumption rules</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Auto Consumption
          </h1>
          <p className="text-muted-foreground">Manage automatic product consumption rules with real-time updates</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
            {isConnected ? "Connected" : "Disconnected"}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRules}</div>
              <p className="text-xs text-muted-foreground">{stats.activeRules} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Consumptions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConsumptions}</div>
              <p className="text-xs text-muted-foreground">
                Avg {stats.avgConsumptionPerService.toFixed(1)} per service
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Product consumption value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRules}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalRules > 0 ? ((stats.activeRules / stats.totalRules) * 100).toFixed(0) : 0}% of total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Consumption Rules</TabsTrigger>
          <TabsTrigger value="logs">Consumption Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Rules</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by rule name, service, or product..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type-filter">Trigger Type</Label>
                  <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="conditional">Conditional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRules.map((rule) => (
              <Card key={rule.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {rule.serviceName || "Unknown Service"} → {rule.productName || "Unknown Product"}
                      </CardDescription>
                    </div>
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(checked) => handleToggleRuleStatus(rule.id, checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Consumption</span>
                    <span className="font-medium">
                      {rule.consumptionAmount} {rule.unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Trigger Type</span>
                    <Badge variant={rule.triggerType === "automatic" ? "default" : "secondary"}>
                      {rule.triggerType}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Uses</span>
                    <span className="font-medium">{rule.totalConsumptions}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Est. Cost</span>
                    <span className="font-medium">${rule.estimatedCost.toFixed(2)}</span>
                  </div>

                  {rule.lastTriggered && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Used</span>
                      <span className="text-sm">{new Date(rule.lastTriggered).toLocaleDateString()}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedRule(rule)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingRule(rule)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRules.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Rules Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterStatus !== "all" || filterType !== "all"
                    ? "No rules match your current filters."
                    : "Create your first auto-consumption rule to get started."}
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Consumption Logs</CardTitle>
              <CardDescription>Real-time log of all product consumptions triggered by rules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{log.ruleName}</h4>
                          <Badge
                            variant={
                              log.status === "completed"
                                ? "default"
                                : log.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {log.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {log.customerName} • {log.staffName} • {log.productConsumed}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {log.amount} {log.unit}
                        </div>
                        <div className="text-sm text-muted-foreground">${log.cost.toFixed(2)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Consumption Logs</h3>
                    <p className="text-muted-foreground">No product consumptions have been logged yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Consumed Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.topConsumedProducts && stats.topConsumedProducts.length > 0 ? (
                    stats.topConsumedProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-sm text-muted-foreground">{product.totalAmount} units consumed</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${product.totalCost.toFixed(2)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No consumption data available yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Consumption Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Rules</span>
                    <span className="font-medium">{stats?.totalRules || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Rules</span>
                    <span className="font-medium">{stats?.activeRules || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Consumptions</span>
                    <span className="font-medium">{stats?.totalConsumptions || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Cost</span>
                    <span className="font-medium">${(stats?.totalCost || 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <CreateRuleModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateRule}
          availableServices={availableServices}
          availableProducts={availableProducts}
        />
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <EditRuleModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSave={(updates) => handleUpdateRule(editingRule.id, updates)}
          availableServices={availableServices}
          availableProducts={availableProducts}
        />
      )}

      {/* Rule Details Modal */}
      {selectedRule && <RuleDetailsModal rule={selectedRule} onClose={() => setSelectedRule(null)} />}
    </div>
  )
}

function CreateRuleModal({
  onClose,
  onSave,
  availableServices,
  availableProducts,
}: {
  onClose: () => void
  onSave: (rule: {
    name: string
    serviceId: string
    productId: string
    consumptionAmount: number
    unit: string
    triggerType: "automatic" | "manual" | "conditional"
    conditions?: string[]
  }) => void
  availableServices: Array<{ id: string; name: string }>
  availableProducts: Array<{ id: string; name: string; unit: string }>
}) {
  const [formData, setFormData] = useState({
    name: "",
    serviceId: "",
    productId: "",
    consumptionAmount: 0,
    unit: "ml",
    triggerType: "automatic" as const,
    conditions: [] as string[],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Create Auto-Consumption Rule</CardTitle>
          <CardDescription>Set up automatic product consumption for services</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Hair Color - Developer Consumption"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="service">Service</Label>
                <Select
                  value={formData.serviceId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, serviceId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="product">Product</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) => {
                    const product = availableProducts.find((p) => p.id === value)
                    setFormData((prev) => ({
                      ...prev,
                      productId: value,
                      unit: product?.unit || "ml",
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Consumption Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.consumptionAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      consumptionAmount: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="units">units</SelectItem>
                    <SelectItem value="drops">drops</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="trigger-type">Trigger Type</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(value: any) => setFormData((prev) => ({ ...prev, triggerType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Create Rule</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function EditRuleModal({
  rule,
  onClose,
  onSave,
  availableServices,
  availableProducts,
}: {
  rule: AutoConsumptionRule
  onClose: () => void
  onSave: (updates: Partial<AutoConsumptionRule>) => void
  availableServices: Array<{ id: string; name: string }>
  availableProducts: Array<{ id: string; name: string; unit: string }>
}) {
  const [formData, setFormData] = useState({
    name: rule.name,
    consumptionAmount: rule.consumptionAmount,
    unit: rule.unit,
    triggerType: rule.triggerType,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit Auto-Consumption Rule</CardTitle>
          <CardDescription>Update the auto-consumption rule settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Consumption Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.consumptionAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      consumptionAmount: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="units">units</SelectItem>
                    <SelectItem value="drops">drops</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="trigger-type">Trigger Type</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(value: any) => setFormData((prev) => ({ ...prev, triggerType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Update Rule</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Rule Details Modal Component
function RuleDetailsModal({
  rule,
  onClose,
}: {
  rule: AutoConsumptionRule
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Rule Details</CardTitle>
          <CardDescription>View auto-consumption rule information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rule Name</Label>
              <p className="font-medium">{rule.name}</p>
            </div>
            <div>
              <Label>Status</Label>
              <Badge variant={rule.isActive ? "default" : "secondary"}>{rule.isActive ? "Active" : "Inactive"}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Service</Label>
              <p className="font-medium">{rule.serviceName || "Unknown Service"}</p>
            </div>
            <div>
              <Label>Product</Label>
              <p className="font-medium">{rule.productName || "Unknown Product"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Consumption Amount</Label>
              <p className="font-medium">
                {rule.consumptionAmount} {rule.unit}
              </p>
            </div>
            <div>
              <Label>Trigger Type</Label>
              <Badge variant={rule.triggerType === "automatic" ? "default" : "secondary"}>{rule.triggerType}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Uses</Label>
              <p className="font-medium">{rule.totalConsumptions}</p>
            </div>
            <div>
              <Label>Estimated Cost</Label>
              <p className="font-medium">${rule.estimatedCost.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Created</Label>
              <p className="text-sm">{new Date(rule.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <Label>Last Updated</Label>
              <p className="text-sm">{new Date(rule.updatedAt).toLocaleString()}</p>
            </div>
          </div>

          {rule.lastTriggered && (
            <div>
              <Label>Last Triggered</Label>
              <p className="text-sm">{new Date(rule.lastTriggered).toLocaleString()}</p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
