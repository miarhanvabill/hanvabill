"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Package, PlusCircle, MinusCircle, AlertTriangle } from "lucide-react"
import { adjustInventoryStock, type InventoryItem } from "@/app/actions/inventory"

interface AdjustStockModalProps {
  isOpen: boolean
  onClose: () => void
  item: InventoryItem | null
  onSuccess: () => void
}

export function AdjustStockModal({ isOpen, onClose, item, onSuccess }: AdjustStockModalProps) {
  const [adjustType, setAdjustType] = useState<"add" | "deduct_usage" | "deduct_waste">("add")
  const [quantity, setQuantity] = useState<string>("1")
  const [reason, setReason] = useState<string>("Stock Restocked")
  const [notes, setNotes] = useState<string>("")
  const [loading, setLoading] = useState(false)

  if (!item) return null

  const handleTypeChange = (type: "add" | "deduct_usage" | "deduct_waste") => {
    setAdjustType(type)
    if (type === "add") setReason("Supplier delivery / Stock Restocked")
    else if (type === "deduct_usage") setReason("In-salon service consumption")
    else if (type === "deduct_waste") setReason("Damaged / Expired / Spillage")
  }

  const currentQty = Number(item.quantity) || 0
  const changeQty = Math.max(0, Number(quantity) || 0)
  const resultingQty = adjustType === "add" ? currentQty + changeQty : Math.max(0, currentQty - changeQty)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (changeQty <= 0) {
      toast({ title: "Invalid Quantity", description: "Please enter a quantity greater than zero.", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const res = await adjustInventoryStock({
        id: item.id,
        type: adjustType,
        quantity: changeQty,
        reason,
        notes,
      })

      if (res.success) {
        toast({
          title: "Stock Adjusted Successfully",
          description: res.message,
        })
        onSuccess()
        onClose()
      } else {
        toast({
          title: "Error",
          description: res.message || "Failed to adjust stock",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      toast({
        title: "Adjustment Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Package className="w-5 h-5 text-primary" />
            Quick Stock Adjustment
          </DialogTitle>
          <DialogDescription>
            Update stock count and record transaction history for <strong>{item.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Current Stock Badge */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border flex items-center justify-between text-xs">
            <div>
              <span className="text-muted-foreground block">Current Stock</span>
              <span className="text-base font-bold text-foreground">
                {currentQty} {item.unit || "pcs"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block">Resulting Stock</span>
              <span className="text-base font-bold text-primary">
                {resultingQty} {item.unit || "pcs"}
              </span>
            </div>
          </div>

          {/* Action Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Adjustment Action</Label>
            <RadioGroup
              value={adjustType}
              onValueChange={(val: any) => handleTypeChange(val)}
              className="grid grid-cols-3 gap-2"
            >
              <div
                onClick={() => handleTypeChange("add")}
                className={`p-2.5 rounded-lg border text-center cursor-pointer flex flex-col items-center gap-1 transition ${
                  adjustType === "add" ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700" : "hover:border-slate-300"
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold">+ Add Stock</span>
              </div>

              <div
                onClick={() => handleTypeChange("deduct_usage")}
                className={`p-2.5 rounded-lg border text-center cursor-pointer flex flex-col items-center gap-1 transition ${
                  adjustType === "deduct_usage" ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700" : "hover:border-slate-300"
                }`}
              >
                <MinusCircle className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold">- Salon Use</span>
              </div>

              <div
                onClick={() => handleTypeChange("deduct_waste")}
                className={`p-2.5 rounded-lg border text-center cursor-pointer flex flex-col items-center gap-1 transition ${
                  adjustType === "deduct_waste" ? "border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-700" : "hover:border-slate-300"
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-semibold">- Wastage</span>
              </div>
            </RadioGroup>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <Label htmlFor="adj_qty" className="text-xs">
              Quantity to {adjustType === "add" ? "Add" : "Deduct"} ({item.unit || "pcs"}) *
            </Label>
            <Input
              id="adj_qty"
              type="number"
              step="any"
              min="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="text-base font-bold"
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <Label htmlFor="adj_reason" className="text-xs">
              Reason / Category *
            </Label>
            <Input
              id="adj_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Supplier delivery, backwash usage, expired"
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="adj_notes" className="text-xs">
              Notes (Optional)
            </Label>
            <Textarea
              id="adj_notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or batch reference"
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adjusting..." : "Apply Stock Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
