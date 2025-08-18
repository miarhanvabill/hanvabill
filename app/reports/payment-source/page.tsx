"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, ArrowLeft, CreditCard, Banknote, Smartphone, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRealTimeSync } from "@/lib/websocket"

interface PaymentSourceData {
  method: string
  amount: number
  percentage: number
  transactions: number
  average_transaction: number
  icon: string
  color: string
}

export default function PaymentSourcePage() {
  const [paymentData, setPaymentData] = useState<PaymentSourceData[]>([])
  const [dateRange, setDateRange] = useState("This Month")
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const { isConnected, subscribe } = useRealTimeSync(["payment_completed", "sale_completed"])

  const fetchPaymentData = async () => {
    try {
      const response = await fetch(`/api/reports/payment-source?dateRange=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setPaymentData(data)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error("Error fetching payment data:", error)
      // Fallback data
      const mockData: PaymentSourceData[] = [
        {
          method: "Cash",
          amount: 45000,
          percentage: 36.0,
          transactions: 180,
          average_transaction: 250,
          icon: "banknote",
          color: "bg-green-500",
        },
        {
          method: "Card",
          amount: 38000,
          percentage: 30.4,
          transactions: 152,
          average_transaction: 250,
          icon: "credit-card",
          color: "bg-blue-500",
        },
        {
          method: "UPI",
          amount: 28000,
          percentage: 22.4,
          transactions: 140,
          average_transaction: 200,
          icon: "smartphone",
          color: "bg-purple-500",
        },
        {
          method: "Bank Transfer",
          amount: 14000,
          percentage: 11.2,
          transactions: 35,
          average_transaction: 400,
          icon: "credit-card",
          color: "bg-orange-500",
        },
      ]
      setPaymentData(mockData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentData()
    const interval = setInterval(fetchPaymentData, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [dateRange])

  // Real-time updates
  useEffect(() => {
    subscribe("payment_completed", () => fetchPaymentData())
    subscribe("sale_completed", () => fetchPaymentData())
  }, [subscribe])

  const totalAmount = paymentData.reduce((sum, item) => sum + item.amount, 0)
  const totalTransactions = paymentData.reduce((sum, item) => sum + item.transactions, 0)

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "banknote":
        return <Banknote className="w-6 h-6" />
      case "credit-card":
        return <CreditCard className="w-6 h-6" />
      case "smartphone":
        return <Smartphone className="w-6 h-6" />
      default:
        return <CreditCard className="w-6 h-6" />
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading payment source data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Payment by Source"
        subtitle="Analyze revenue breakdown by payment methods with real-time transaction data."
        showBackButton
        backHref="/reports"
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/reports">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Reports
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                    <span>{isConnected ? "Live Updates" : "Offline"}</span>
                    <span>•</span>
                    <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Today">Today</SelectItem>
                      <SelectItem value="This Week">This Week</SelectItem>
                      <SelectItem value="This Month">This Month</SelectItem>
                      <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchPaymentData} className="gap-2 bg-transparent">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                  <Button className="gap-2 bg-black text-white hover:bg-gray-800">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-blue-600">₹{totalAmount.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-green-600">{totalTransactions}</div>
                <div className="text-sm text-gray-600">Total Transactions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ₹{totalTransactions > 0 ? Math.round(totalAmount / totalTransactions) : 0}
                </div>
                <div className="text-sm text-gray-600">Average Transaction</div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paymentData.map((payment, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-lg ${payment.color} flex items-center justify-center text-white`}
                      >
                        {getIcon(payment.icon)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{payment.method}</CardTitle>
                        <p className="text-sm text-gray-600">{payment.transactions} transactions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">₹{payment.amount.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">{payment.percentage}%</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${payment.color}`}
                        style={{ width: `${payment.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg. Transaction:</span>
                      <span className="font-medium">₹{payment.average_transaction}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Share of Revenue:</span>
                      <span className="font-medium">{payment.percentage}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Payment Method</th>
                      <th className="text-center p-4 font-medium">Transactions</th>
                      <th className="text-center p-4 font-medium">Total Amount</th>
                      <th className="text-center p-4 font-medium">Average</th>
                      <th className="text-center p-4 font-medium">Percentage</th>
                      <th className="text-center p-4 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paymentData.map((payment, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded ${payment.color} flex items-center justify-center text-white`}
                            >
                              {getIcon(payment.icon)}
                            </div>
                            <span className="font-medium">{payment.method}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-medium">{payment.transactions}</td>
                        <td className="p-4 text-center font-medium">₹{payment.amount.toLocaleString()}</td>
                        <td className="p-4 text-center">₹{payment.average_transaction}</td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {payment.percentage}%
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${payment.color}`}
                              style={{ width: `${payment.percentage}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
