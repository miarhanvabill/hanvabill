"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Gift, Plus, CreditCard, TrendingUp, Users } from "lucide-react"
import { getGiftCards, createGiftCard, getGiftCardStats } from "@/app/actions/gift-cards"

interface GiftCard {
  id: number
  code: string
  amount: number
  balance: number
  status: "active" | "used" | "expired"
  created_at: string
  expires_at?: string
  customer_name?: string
  customer_phone?: string
}

interface GiftCardStats {
  total_cards: number
  total_value: number
  redeemed_value: number
  active_cards: number
}

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [stats, setStats] = useState<GiftCardStats>({
    total_cards: 0,
    total_value: 0,
    redeemed_value: 0,
    active_cards: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [cardsData, statsData] = await Promise.all([getGiftCards(), getGiftCardStats()])

      setGiftCards(cardsData)
      setStats(statsData)
    } catch (error) {
      console.error("Failed to load gift cards:", error)
      toast({
        title: "Error",
        description: "Failed to load gift cards data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateGiftCard = async (formData: FormData) => {
    setIsCreating(true)
    try {
      const result = await createGiftCard(formData)
      if (result.success) {
        toast({
          title: "Success",
          description: "Gift card created successfully",
        })
        setIsCreateModalOpen(false)
        loadData()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Failed to create gift card:", error)
      toast({
        title: "Error",
        description: "Failed to create gift card",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "used":
        return "bg-gray-100 text-gray-800"
      case "expired":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Gift Cards" subtitle="Loading gift cards data..." />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
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
      <Header title="Gift Cards" subtitle="Manage gift cards and track redemptions" />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Cards</p>
                    <p className="text-xl font-semibold">{stats.total_cards}</p>
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
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-xl font-semibold">₹{stats.total_value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Redeemed</p>
                    <p className="text-xl font-semibold">₹{stats.redeemed_value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Cards</p>
                    <p className="text-xl font-semibold">{stats.active_cards}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gift Cards</CardTitle>
                  <CardDescription>Manage and track all gift cards</CardDescription>
                </div>
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Gift Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Gift Card</DialogTitle>
                    </DialogHeader>
                    <form action={handleCreateGiftCard} className="space-y-4">
                      <div>
                        <Label htmlFor="amount">Amount *</Label>
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          min="1"
                          required
                          placeholder="Enter gift card amount"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customerName">Customer Name</Label>
                        <Input id="customerName" name="customerName" placeholder="Enter customer name (optional)" />
                      </div>
                      <div>
                        <Label htmlFor="customerPhone">Customer Phone</Label>
                        <Input id="customerPhone" name="customerPhone" placeholder="Enter customer phone (optional)" />
                      </div>
                      <div>
                        <Label htmlFor="expiryDays">Expires in (days)</Label>
                        <Input
                          id="expiryDays"
                          name="expiryDays"
                          type="number"
                          min="1"
                          placeholder="365"
                          defaultValue="365"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateModalOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isCreating} className="flex-1">
                          {isCreating ? "Creating..." : "Create"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {giftCards.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No gift cards created yet</p>
                  <p className="text-sm text-gray-500">Create your first gift card to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {giftCards.map((card) => (
                    <div key={card.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Gift className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">#{card.code}</p>
                            <p className="text-sm text-gray-600">
                              Balance: ₹{card.balance} / ₹{card.amount}
                            </p>
                            {card.customer_name && <p className="text-sm text-gray-500">{card.customer_name}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(card.status)}>
                            {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            Created: {new Date(card.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
