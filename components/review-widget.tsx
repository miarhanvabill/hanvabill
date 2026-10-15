"use client"

import { useState } from "react"
import { Star, ExternalLink, ThumbsUp, MessageSquare, RefreshCw, Copy, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { submitReviewPublic } from "@/app/actions/reviews"
import { generateSmartReview, SMART_REVIEW_CHIPS, type ReviewChip } from "@/lib/review-generator"
import { toast } from "sonner"

interface ReviewWidgetProps {
  tenantId: string
  bookingId?: number | null
  gmbUrl?: string
  businessName?: string
  serviceName?: string
  staffName?: string
}

export function ReviewWidget({
  tenantId,
  bookingId = null,
  gmbUrl,
  businessName = "our salon",
  serviceName,
  staffName,
}: ReviewWidgetProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewDraft, setReviewDraft] = useState("")
  const [activeChipIds, setActiveChipIds] = useState<string[]>([])
  const [negativeText, setNegativeText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isNegativeFlow, setIsNegativeFlow] = useState(false)
  const [showPositiveHelper, setShowPositiveHelper] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)

  if (!tenantId) return null

  const handleStarClick = async (star: number) => {
    if (isSubmitting || isSubmitted) return
    setRating(star)

    // ✅ POSITIVE FLOW (4 or 5 stars)
    if (star >= 4) {
      if (!gmbUrl) {
        // No Google link configured: auto-submit internally and show thank you
        setIsSubmitting(true)
        try {
          await submitReviewPublic(tenantId, bookingId || null, star, "Positive rating")
          setIsSubmitted(true)
        } catch {
          setIsSubmitted(true)
        } finally {
          setIsSubmitting(false)
        }
        return
      }

      // Generate a fresh unique combinatorial review tailored to service & staff
      const initialText = generateSmartReview({
        businessName,
        serviceName,
        staffName,
      })
      setReviewDraft(initialText)
      setActiveChipIds([])
      setShowPositiveHelper(true)

      // Submit rating internally in background
      submitReviewPublic(tenantId, bookingId || null, star, initialText).catch(() => {})
      return
    }

    // ✅ NEGATIVE FLOW (1-3 stars) — route to private feedback
    if (star <= 3) {
      setIsNegativeFlow(true)
    }
  }

  // Handle regenerating another unique review draft
  const handleShuffle = () => {
    const nextText = generateSmartReview({
      businessName,
      serviceName,
      staffName,
    })
    setReviewDraft(nextText)
    setActiveChipIds([])
    toast.success("Generated another unique review draft!")
  }

  // Handle clicking a Smart Chip
  const handleChipClick = (chip: ReviewChip) => {
    const isAlreadyActive = activeChipIds.includes(chip.id)

    if (isAlreadyActive) {
      // Remove phrase from draft
      const updated = reviewDraft.replace(chip.phrase, "").replace(/\s\s+/g, " ").trim()
      setReviewDraft(updated)
      setActiveChipIds((prev) => prev.filter((id) => id !== chip.id))
    } else {
      // Append phrase
      const updated = reviewDraft.trim() ? `${reviewDraft.trim()} ${chip.phrase}` : chip.phrase
      setReviewDraft(updated)
      setActiveChipIds((prev) => [...prev, chip.id])
    }
  }

  // Handle copying and opening Google
  const handleCopyAndOpenGoogle = async () => {
    if (!gmbUrl) return

    try {
      if (reviewDraft.trim()) {
        await navigator.clipboard.writeText(reviewDraft.trim())
        setHasCopied(true)
        toast.success("Review copied! Opening Google Reviews...")
      }
    } catch (e) {
      console.warn("Clipboard access denied, proceeding to open Google:", e)
    }

    // Open GMB in new tab
    window.open(gmbUrl, "_blank", "noopener,noreferrer")
    setIsSubmitted(true)
  }

  const handleNegativeSubmit = async () => {
    if (!negativeText.trim()) return toast.error("Please share what went wrong so we can improve.")
    setIsSubmitting(true)
    try {
      const result = await submitReviewPublic(tenantId, bookingId || null, rating, negativeText)
      if (result.success) {
        setIsSubmitted(true)
        toast.success("Thank you for your feedback. We'll work on it!")
      } else {
        toast.error(result.message || "Failed to submit feedback")
      }
    } catch {
      toast.error("Something went wrong, please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ✅ Positive Final Success State (after user copied/opened Google)
  if (isSubmitted && rating >= 4) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center mt-8 print:hidden animate-in fade-in-50 duration-300">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ThumbsUp className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Thank you so much! 🎉</h3>
        <p className="text-slate-600 mb-4 text-sm max-w-md mx-auto">
          {hasCopied ? (
            <>
              Your personalized review has been copied. Google Reviews is open in a new tab.
              <br />Just <strong>Paste</strong> and tap <strong>Post</strong>!
            </>
          ) : (
            <>Your feedback means the world to us!</>
          )}
        </p>
        {gmbUrl && (
          <div className="flex justify-center gap-3">
            <Button asChild size="sm" variant="outline" className="gap-2">
              <a href={gmbUrl} target="_blank" rel="noopener noreferrer">
                Open Google Reviews again <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ✅ Negative Final Success State
  if (isSubmitted && rating < 4) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center mt-8 print:hidden">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">We hear you!</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Thank you for your honest feedback. Our management team has received your note and will work on improving your experience.
        </p>
      </div>
    )
  }

  // ✅ Positive Helper View (Rating 4 or 5 stars selected, with live template & smart chips)
  if (showPositiveHelper && rating >= 4) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 md:p-8 mt-8 print:hidden animate-in fade-in-50 duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex text-amber-400">
              {[...Array(rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {rating === 5 ? "Loved it!" : "Great experience!"}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleShuffle}
            className="text-xs text-slate-600 hover:text-slate-900 gap-1.5 h-8"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try another draft
          </Button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Suggested Review Draft (Editable):
            </label>
            <span className="text-[11px] text-slate-400">You can edit or add words</span>
          </div>
          <Textarea
            rows={3}
            value={reviewDraft}
            onChange={(e) => setReviewDraft(e.target.value)}
            placeholder="Type your review here..."
            className="w-full text-slate-800 text-sm bg-slate-50/70 border-slate-300 focus:bg-white resize-none"
          />
        </div>

        {/* Smart Keyword Suggestion Chips */}
        <div className="mb-6">
          <p className="text-xs text-slate-500 mb-2 font-medium">Tap to add highlights to your review:</p>
          <div className="flex flex-wrap gap-2">
            {SMART_REVIEW_CHIPS.map((chip) => {
              const isActive = activeChipIds.includes(chip.id)
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900 font-medium shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {chip.label} {isActive && "✓"}
                </button>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <Button
            type="button"
            size="lg"
            onClick={handleCopyAndOpenGoogle}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2 font-medium shadow-sm py-5"
          >
            <Copy className="w-4 h-4" />
            Copy Review & Open Google
            <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-1" />
          </Button>

          <div className="text-center">
            <a
              href={gmbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline inline-flex items-center gap-1"
            >
              Or write your own review directly on Google <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Negative feedback form (1-3 stars)
  if (isNegativeFlow) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 mt-8 print:hidden animate-in fade-in-50 duration-300">
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-7 h-7 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
            />
          ))}
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1 text-center">We're sorry to hear that 😔</h3>
        <p className="text-xs text-slate-500 text-center mb-4">Your feedback goes directly to our management team. What went wrong?</p>
        <Textarea
          placeholder="Please tell us what we can improve..."
          className="w-full resize-none bg-slate-50 mb-4 text-sm"
          rows={4}
          value={negativeText}
          onChange={(e) => setNegativeText(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <Button variant="outline" className="w-1/3" onClick={() => setIsNegativeFlow(false)}>
            Back
          </Button>
          <Button className="w-2/3" onClick={handleNegativeSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Send Private Feedback"}
          </Button>
        </div>
      </div>
    )
  }

  // ✅ Default Star Selection State
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-8 print:hidden">
      <h3 className="text-lg font-semibold text-slate-800 mb-1 text-center">How was your experience today?</h3>
      <p className="text-xs text-slate-500 text-center mb-5">Tap a star to rate us</p>

      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={isSubmitting}
            className="p-1 transition-transform hover:scale-125 focus:outline-none disabled:opacity-50"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => handleStarClick(star)}
          >
            <Star
              className={`w-10 h-10 md:w-11 md:h-11 transition-colors ${
                star <= (hoverRating || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-200 hover:text-amber-200"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
