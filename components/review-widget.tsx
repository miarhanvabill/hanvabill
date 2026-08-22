"use client"

import { useState } from "react"
import { Star, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { submitReviewPublic } from "@/app/actions/reviews"
import { toast } from "sonner"

export function ReviewWidget({ tenantId, bookingId, gmbUrl }: { tenantId: string, bookingId: number, gmbUrl?: string }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const isPositive = rating >= 4
  const shouldRedirect = isPositive && gmbUrl

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e && shouldRedirect) {
      // If we are redirecting to GMB, don't prevent default on the anchor tag so it opens the link
    }
    
    if (rating === 0) {
      if (e) e.preventDefault();
      return toast.error("Please select a rating")
    }
    
    setIsSubmitting(true)
    try {
      const result = await submitReviewPublic(tenantId, bookingId, rating, reviewText)
      if (result.success) {
        setIsSubmitted(true)
        if (!shouldRedirect) {
          toast.success("Thank you for your feedback!")
        }
      } else {
        if (e) e.preventDefault();
        toast.error(result.message || "Failed to submit review")
      }
    } catch (error) {
      if (e) e.preventDefault();
      toast.error("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!tenantId || !bookingId) return null;

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center mt-8 print:hidden">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-6 h-6 fill-green-600" />
        </div>
        <h3 className="text-xl font-medium text-slate-800 mb-2">Thank you for your review!</h3>
        <p className="text-slate-500">Your feedback helps us improve our services.</p>
        
        {shouldRedirect && (
          <div className="mt-6">
            <Button asChild className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
              <a href={gmbUrl} target="_blank" rel="noopener noreferrer">
                Leave a Review on Google <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-8 print:hidden">
      <h3 className="text-lg font-medium text-slate-800 mb-4 text-center">How was your experience?</h3>
      
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="p-1 transition-transform hover:scale-110 focus:outline-none"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
          >
            <Star
              className={`w-10 h-10 ${
                star <= (hoverRating || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-200"
              } transition-colors`}
            />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          {!shouldRedirect ? (
            <>
              <p className="text-sm text-center text-slate-500 font-medium">
                {rating <= 3 ? "We're sorry to hear that. How can we improve?" : "Tell us what you liked (Optional)"}
              </p>
              <Textarea
                placeholder="Write your feedback here..."
                className="w-full resize-none bg-slate-50"
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
              <Button 
                className="w-full" 
                onClick={(e) => { e.preventDefault(); handleSubmit(); }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Internal Feedback"}
              </Button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-600 mb-2">
                We're thrilled you had a {rating}-star experience!
              </p>
              <Button 
                asChild 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                onClick={(e) => {
                  if (isSubmitting) e.preventDefault();
                  else handleSubmit(); // We don't prevent default, so the link will open
                }}
              >
                <a href={gmbUrl} target="_blank" rel="noopener noreferrer">
                  {isSubmitting ? "Submitting..." : "Share on Google"}
                  {!isSubmitting && <ExternalLink className="w-4 h-4 ml-2" />}
                </a>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
