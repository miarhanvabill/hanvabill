"use client"

import { useState } from "react"
import { Gift, Share2, Copy, Check, MessageCircle, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface InvoiceReferralGiftCardProps {
  customerName?: string
  customerId?: number | null
  customerPhone?: string | null
  customerReferralCode?: string | null
  salonName: string
  bookingSlug: string
  discountAmount?: number
  rewardAmount?: number
  minOrderAmount?: number
  shareTemplate?: string
}

export function InvoiceReferralGiftCard({
  customerName = "Valued Customer",
  customerId,
  customerPhone,
  customerReferralCode,
  salonName = "our salon",
  bookingSlug,
  discountAmount = 250,
  rewardAmount = 250,
  minOrderAmount = 700,
  shareTemplate,
}: InvoiceReferralGiftCardProps) {
  const [copied, setCopied] = useState(false)

  // Priority: 1. Server-persisted customer referral code, 2. Computed vanity code, 3. Fallback
  const referralCode = customerReferralCode && customerReferralCode.trim()
    ? customerReferralCode.trim().toUpperCase()
    : (customerId
        ? `REF${String(customerId).padStart(4, "0")}${String(customerPhone || "").replace(/\D/g, "").slice(-4)}`
        : "GIFT250")

  const bookingUrl = `https://biz.hanva.in/book/${bookingSlug}?ref=${referralCode}`

  // Compose share text
  const shareText = shareTemplate
    ? shareTemplate
        .replace(/{salon_name}|{{salon_name}}|{{business_name}}/g, salonName)
        .replace(/{discount}|{{discount}}/g, `₹${discountAmount}`)
        .replace(/{min_order}|{{min_order}}/g, `₹${minOrderAmount}`)
        .replace(/{link}|{{link}}|{{booking_url}}/g, bookingUrl)
    : `Hey! 🌸 I just visited ${salonName} and loved it! Here's a special gift of ₹${discountAmount} OFF on your first visit (Min bill ₹${minOrderAmount}): ${bookingUrl} Enjoy!`

  const handleWhatsAppShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(waUrl, "_blank")
  }

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mt-8 print:hidden max-w-4xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-950 to-violet-950 text-white p-6 sm:p-8 shadow-xl border border-violet-900/30">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/15 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left Side: Copy & Benefits */}
          <div className="space-y-3 text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-violet-200">
              <Gift className="w-3.5 h-3.5" />
              <span>Share the Love</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Gift ₹{discountAmount} to a Friend on WhatsApp 🎁
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              Loved your experience at <strong>{salonName}</strong>? Send your friend a special ₹{discountAmount} discount for their first booking (min bill ₹{minOrderAmount}). When they visit, you&#39;ll also receive <strong>₹{rewardAmount}</strong> in your salon wallet!
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              <Badge variant="secondary" className="bg-white/10 text-white border-0 text-xs py-0.5 px-2.5">
                <Sparkles className="w-3 h-3 mr-1 text-violet-300" /> First-Time Visitors Only
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white border-0 text-xs py-0.5 px-2.5 font-mono">
                Your Code: {referralCode}
              </Badge>
            </div>
          </div>

          {/* Right Side: 1-Click WhatsApp & Copy Link Actions */}
          <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
            {/* Primary WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full md:w-64 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white py-3.5 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm sm:text-base cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>Share on WhatsApp 📲</span>
            </button>

            {/* Copy Link Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full md:w-64 bg-white/10 hover:bg-white/20 active:scale-95 text-white py-2.5 px-4 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm border border-white/15 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-violet-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Link Copied!" : "Copy Referral Link"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
