"use client"

import React, { useEffect, useState } from "react"
import { getStaffEarnings } from "@/app/actions/staff-portal"
import {
  IndianRupee,
  TrendingUp,
  Award,
  Sparkles,
  ShoppingBag,
  Scissors,
  HeartHandshake,
  Calendar,
  ChevronRight,
  Flame,
  Loader2,
} from "lucide-react"

export default function StaffEarningsPage() {
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  const loadEarnings = async (range: "today" | "week" | "month") => {
    try {
      setLoading(true)
      const res = await getStaffEarnings(range)
      setData(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEarnings(timeRange)
  }, [timeRange])

  const summary = data?.summary || {}
  const tierInfo = data?.tierInfo || {}
  const completedServices = data?.completedServices || []
  const productSales = data?.productSales || []

  return (
    <div className="p-4 space-y-4">
      {/* Time Range Filter Pills */}
      <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center justify-between">
        {(["today", "week", "month"] as const).map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setTimeRange(range)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${
              timeRange === range
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {range === "today" ? "Today" : range === "week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>

      {/* Main Net Earnings Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Take-Home Pay
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> Active Tier
          </span>
        </div>

        <div className="my-2.5">
          <div className="text-3xl font-black tracking-tight text-white flex items-center">
            <span>₹{summary.netEarnings?.toLocaleString("en-IN") || "0"}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Service Commissions + Retail Incentives + Tips
          </p>
        </div>

        {/* 3-Column Breakdown */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800">
          <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 text-center">
            <span className="block text-[10px] text-slate-400 font-medium truncate">Services</span>
            <span className="text-xs font-extrabold text-white mt-0.5 block font-mono truncate">
              ₹{summary.serviceCommission?.toLocaleString("en-IN") || "0"}
            </span>
          </div>

          <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 text-center">
            <span className="block text-[10px] text-slate-400 font-medium truncate">Retail Sales</span>
            <span className="text-xs font-extrabold text-amber-300 mt-0.5 block font-mono truncate">
              ₹{summary.productCommission?.toLocaleString("en-IN") || "0"}
            </span>
          </div>

          <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 text-center">
            <span className="block text-[10px] text-slate-400 font-medium truncate">Direct Tips</span>
            <span className="text-xs font-extrabold text-emerald-400 mt-0.5 block font-mono truncate">
              ₹{summary.tips?.toLocaleString("en-IN") || "0"}
            </span>
          </div>
        </div>
      </div>

      {/* Commission Tier Progress Indicator */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-amber-50 text-amber-600">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                {tierInfo.currentTier} ({tierInfo.commissionRate})
              </h3>
              <p className="text-[10px] text-slate-500">
                Target: {tierInfo.nextTier} ({tierInfo.nextTierRate})
              </p>
            </div>
          </div>

          <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
            {tierInfo.progressPercent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden my-2 border border-slate-200/50">
          <div
            className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${tierInfo.progressPercent || 80}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mt-1">
          <span>₹{tierInfo.currentSales?.toLocaleString("en-IN")} sales</span>
          <span className="text-amber-700 font-bold flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" /> ₹{tierInfo.remainingToNextTier?.toLocaleString("en-IN")} to next tier!
          </span>
        </div>
      </div>

      {/* Completed Services Commission Breakdown */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-blue-50 text-blue-600">
              <Scissors className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Completed Service Commissions
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {loading ? "..." : `${completedServices.length} logged`}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-500">Loading commission ledger...</p>
          </div>
        ) : completedServices.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Scissors className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-600">No service commissions recorded for this period.</p>
            <p className="text-[11px] text-slate-400">Complete client appointments to build your commission ledger.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {completedServices.map((srv: any) => {
              const serviceName = srv.serviceName || srv.service_name || "Salon Service"
              const clientName = srv.customerName || srv.customer_name || "Guest Client"
              const serviceDate = srv.date || srv.time || ""
              const billAmount = srv.billAmount ?? srv.amount ?? 0
              const commRate = srv.commissionRate || (srv.splitPercentage ? `${srv.splitPercentage}%` : "50%")
              const earnedComm = srv.earnedCommission ?? srv.commissionEarned ?? 0
              const tipAmount = srv.tip ?? 0

              return (
                <div key={`${srv.id}-${srv.invoiceNumber || srv.serviceName}`} className="py-3 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {serviceName}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Client: {clientName} {serviceDate ? `• ${serviceDate}` : ""}
                    </span>
                    <span className="inline-block text-[10px] text-slate-400 mt-0.5 font-mono">
                      Bill ₹{billAmount} @ {commRate}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-emerald-600 block">
                      +₹{earnedComm}
                    </span>
                    {tipAmount > 0 && (
                      <span className="text-[10px] font-semibold text-amber-600 block">
                        Tip: +₹{tipAmount}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Product Retail Incentive Breakdown */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-purple-50 text-purple-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Product Retail Incentives (10%)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {productSales.length} products
          </span>
        </div>

        {productSales.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-600">No retail product sales in this period.</p>
            <p className="text-[11px] text-slate-400">Recommend hair care & skincare products to earn 10% incentives.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {productSales.map((prod: any) => {
              const prodName = prod.productName || prod.service_name || "Product"
              const price = prod.amount ?? prod.price ?? 0
              const comm = prod.commissionEarned ?? prod.earnedCommission ?? 0

              return (
                <div key={prod.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {prodName}
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      Qty: {prod.quantity || 1} • MRP ₹{price}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-purple-600">
                      +₹{comm}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
