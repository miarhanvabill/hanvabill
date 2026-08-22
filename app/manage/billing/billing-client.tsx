"use client"

import { useState } from "react"
import { Check, CreditCard, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { upgradePlan, type TenantSubscription, type BillingHistory } from "@/app/actions/tenant-billing"
import { useToast } from "@/components/ui/use-toast"

const PLANS = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started",
    features: ["Up to 50 appointments/mo", "Basic reporting", "Email support"],
  },
  {
    name: "Pro",
    price: "$49",
    description: "Best for growing salons",
    features: ["Unlimited appointments", "Advanced analytics", "Priority support", "SMS reminders"],
  },
  {
    name: "Enterprise",
    price: "$149",
    description: "For large or multi-location salons",
    features: ["Everything in Pro", "Multi-location support", "Dedicated account manager", "Custom integrations"],
  }
]

export function BillingClient({ 
  subscription, 
  history 
}: { 
  subscription: TenantSubscription | null
  history: BillingHistory[] 
}) {
  const { toast } = useToast()
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null)
  
  const currentPlan = subscription?.plan_name || "Free"
  
  const handleUpgrade = async (planName: string) => {
    try {
      setIsUpgrading(planName)
      await upgradePlan(planName)
      toast({
        title: "Plan updated",
        description: `You have successfully switched to the ${planName} plan.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upgrade failed",
        description: "There was an error updating your plan.",
      })
    } finally {
      setIsUpgrading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Plans & Billing</h2>
        <p className="text-muted-foreground">
          Manage your subscription, billing history, and payment methods.
        </p>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="history">Billing History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="plans" className="space-y-6">
          {/* Current Plan Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>
                You are currently on the <strong className="text-foreground">{currentPlan}</strong> plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-8 sm:space-y-0">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1 flex items-center">
                    <Badge variant={subscription?.status === 'active' || !subscription ? "default" : "destructive"}>
                      {subscription?.status || 'active'}
                    </Badge>
                  </div>
                </div>
                {subscription?.current_period_end && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Period Ends</p>
                    <p className="mt-1 text-sm">
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing Tiers */}
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card key={plan.name} className={currentPlan === plan.name ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    {plan.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={currentPlan === plan.name ? "outline" : "default"}
                    disabled={currentPlan === plan.name || isUpgrading !== null}
                    onClick={() => handleUpgrade(plan.name)}
                  >
                    {isUpgrading === plan.name && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {currentPlan === plan.name ? "Current Plan" : "Upgrade"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                View your recent invoices and payment history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-10 text-center">
                  <CreditCard className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No billing history available.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          ${Number(invoice.amount).toFixed(2)} {invoice.currency.toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.invoice_pdf ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={invoice.invoice_pdf} target="_blank" rel="noreferrer">
                                <Download className="h-4 w-4 mr-2" />
                                PDF
                              </a>
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
