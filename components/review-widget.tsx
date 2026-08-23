"use client"

import { useState } from "react"
import { Star, ExternalLink, ThumbsUp, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { submitReviewPublic } from "@/app/actions/reviews"
import { toast } from "sonner"

// Pool of random positive review texts
function getRandomReviewText(businessName: string): string {
  const texts = [
    `Absolutely loved my experience at ${businessName}! The staff was incredibly professional and attentive. Will definitely be coming back again soon! ⭐⭐⭐⭐⭐`,
    `Had an amazing time at ${businessName}. The service quality is top-notch and the team is so friendly. Highly recommend to everyone! 😊`,
    `${businessName} never disappoints! Fantastic service from start to finish. The ambiance is great and the team always makes you feel welcome. 10/10!`,
    `Really impressed with the quality of service at ${businessName}. The staff is skilled, professional and very warm. Best experience I've had in a long time!`,
    `Visited ${businessName} and I am so glad I did! Excellent service, great atmosphere, and very reasonable prices. Definitely my go-to place now. Highly recommended! ✨`,
    `The team at ${businessName} is outstanding! They took their time to make sure I was happy with everything. Will keep coming back for sure. Loved the experience! 💯`,
    `Wonderful experience at ${businessName}! Very professional staff and they go above and beyond to ensure customer satisfaction. Cannot recommend them enough!`,
    `${businessName} provides excellent service every single time! The staff is super talented and the results are always amazing. Five stars, well deserved! 🌟`,
  ]
  return texts[Math.floor(Math.random() * texts.length)]
}

interface ReviewWidgetProps {
  tenantId: string
  bookingId: number
  gmbUrl?: string
  businessName?: string
}

export function ReviewWidget({ tenantId, bookingId, gmbUrl, businessName = "our salon" }: ReviewWidgetProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isNegativeFlow, setIsNegativeFlow] = useState(false)

  if (!tenantId || !bookingId) return null

  const handleStarClick = async (star: number) => {
    if (isSubmitting || isSubmitted) return
    setRating(star)

    // ✅ POSITIVE FLOW (4 or 5 stars)
    if (star >= 4 && gmbUrl) {
      setIsSubmitting(true)

      // 1. Auto-submit internally in background
      submitReviewPublic(tenantId, bookingId, star, getRandomReviewText(businessName))
        .catch(() => {}) // silently swallow errors

      // 2. Auto-copy a random review text to clipboard silently
      try {
        const textToCopy = getRandomReviewText(businessName)
        await navigator.clipboard.writeText(textToCopy)
        toast.success("Review text copied! Just paste it on Google & hit Post 🎉", {
          duration: 5000,
        })
      } catch {
        // Clipboard may be denied on some browsers — fail silently
      }

      // 3. Immediately open Google My Business review page
      window.open(gmbUrl, "_blank", "noopener,noreferrer")

      setIsSubmitted(true)
      setIsSubmitting(false)
      return
    }

    // ✅ NEGATIVE FLOW (1-3 stars) — show internal feedback form
    if (star <= 3) {
      setIsNegativeFlow(true)
    }
  }

  const handleNegativeSubmit = async () => {
    if (!reviewText.trim()) return toast.error("Please share what went wrong so we can improve.")
    setIsSubmitting(true)
    try {
      const result = await submitReviewPublic(tenantId, bookingId, rating, reviewText)
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

  // ✅ Positive submitted state
  if (isSubmitted && rating >= 4) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center mt-8 print:hidden">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ThumbsUp className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Thank you so much! 🎉</h3>
        <p className="text-slate-500 mb-4 text-sm">
          A review has been copied to your clipboard. Google Reviews should be open in a new tab.
          <br />Just <strong>paste</strong> the text and click <strong>Post</strong>!
        </p>
        {gmbUrl && (
          <Button asChild size="sm" variant="outline">
            <a href={gmbUrl} target="_blank" rel="noopener noreferrer">
              Open Google Reviews again <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
        )}
      </div>
    )
  }

  // ✅ Negative submitted state
  if (isSubmitted && rating < 4) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center mt-8 print:hidden">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">We hear you!</h3>
        <p className="text-slate-500 text-sm">Thank you for your honest feedback. Our team will work on improving your experience.</p>
      </div>
    )
  }

  // ✅ Negative feedback form
  if (isNegativeFlow) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-8 print:hidden">
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-8 h-8 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
            />
          ))}
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-1 text-center">We're sorry to hear that 😔</h3>
        <p className="text-sm text-slate-500 text-center mb-4">Your feedback helps us get better. What went wrong?</p>
        <Textarea
          placeholder="Please tell us what we can improve..."
          className="w-full resize-none bg-slate-50 mb-4"
          rows={4}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          autoFocus
        />
        <Button className="w-full" onClick={handleNegativeSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Send Private Feedback"}
        </Button>
      </div>
    )
  }

  // ✅ Default star selection state
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-8 print:hidden">
      <h3 className="text-lg font-medium text-slate-800 mb-2 text-center">How was your experience?</h3>
      <p className="text-xs text-slate-400 text-center mb-5">Tap a star to rate us</p>

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
              className={`w-11 h-11 transition-colors ${
                star <= (hoverRating || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-200"
              }`}
            />
          </button>
        ))}
      </div>

      {isSubmitting && (
        <p className="text-center text-sm text-slate-500 mt-4 animate-pulse">Opening Google Reviews...</p>
      )}
    </div>
  )
}
