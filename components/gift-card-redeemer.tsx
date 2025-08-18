"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Gift, Plus, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/currency"

interface AppliedGiftCard {
  id?: number
  code: string
  balance: number
  amount: number
  expires_at?: string | null
}

interface GiftCardRedeemerProps {
  baseDue: number
  onChange: (cards: { code: string; amount: number }[], total: number) => void
}

export default function GiftCardRedeemer({ baseDue, onChange }: GiftCardRedeemerProps) {
  const [code, setCode] = useState("")
  const [applied, setApplied] = useState<AppliedGiftCard[]>([])

  const totalApplied = useMemo(() => applied.reduce((s, c) => s + (Number(c.amount) || 0), 0), [applied])

  // Keep latest onChange in a ref and only call when payload truly changes
  const onChangeRef = useRef(onChange)
  const lastSerializedRef = useRef<string>("")
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    const payload = applied.map((a) => ({ code: a.code, amount: Math.max(0, Math.floor(a.amount)) }))
    const serialized = JSON.stringify(payload)
    if (serialized !== lastSerializedRef.current) {
      lastSerializedRef.current = serialized
      onChangeRef.current?.(payload, totalApplied)
    }
  }, [applied, totalApplied]) // NOTE: onChange not included on purpose

  const handleAdd = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    if (applied.some((a) => a.code.toUpperCase() === trimmed)) {
      toast({ title: "Already added", description: "This gift card is already applied", variant: "destructive" })
      return
    }
    try {
      const res = await fetch(`/api/gift-cards/lookup?code=${encodeURIComponent(trimmed)}`, { cache: "no-store" })
      const data = await res.json()
      if (!data.success || !data.card) throw new Error(data.error || "Invalid gift card")
      const defaultAmount = Math.min(Number(data.card.balance || 0), Math.max(0, baseDue - totalApplied))
      if (defaultAmount <= 0) {
        toast({ title: "Nothing to redeem", description: "No payable amount left to cover", variant: "destructive" })
        return
      }
      setApplied((prev) => [
        ...prev,
        { id: data.card.id, code: data.card.code, balance: Number(data.card.balance), amount: defaultAmount, expires_at: data.card.expires_at },
      ])
      setCode("")
    } catch (e: any) {
      toast({ title: "Gift card error", description: e.message || "Failed to add gift card", variant: "destructive" })
    }
  }

  const adjustAmount = (idx: number, val: string) => {
    const num = Math.max(0, Math.floor(Number(val) || 0))
    setApplied((list) => {
      const next = [...list]
      const card = next[idx]
      const others = next.reduce((s, c, i) => (i === idx ? s : s + c.amount), 0)
      const maxForThis = Math.min(card.balance, Math.max(0, baseDue - others))
      card.amount = Math.min(num, maxForThis)
      return next
    })
  }

  const remove = (idx: number) => setApplied((list) => list.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="gc-code">Gift Card Code</Label>
          <Input id="gc-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter gift card code" />
        </div>
        <Button type="button" onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {applied.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-3">
            {applied.map((c, idx) => (
              <div key={c.code} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.code}</span>
                    <Badge variant="secondary" className="text-xs">Bal: {formatCurrency(c.balance)}</Badge>
                    {c.expires_at && <Badge variant="outline" className="text-xs">Expires: {new Date(c.expires_at).toLocaleDateString()}</Badge>}
                  </div>
                  <div className="mt-2 max-w-xs">
                    <Label className="text-xs">Redeem Amount</Label>
                    <Input type="number" min={0} value={c.amount} onChange={(e) => adjustAmount(idx, e.target.value)} />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(idx)} className="text-red-600">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <div className="flex items-center justify-between text-sm pt-2">
              <span>Total from Gift Cards</span>
              <span className="font-semibold text-purple-700">{formatCurrency(totalApplied)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Remaining payable before loyalty</span>
              <span>{formatCurrency(Math.max(0, baseDue - totalApplied))}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
