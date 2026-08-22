"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, ThumbsUp, MessageSquare, TrendingUp, Filter, Search, ExternalLink, Reply } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { getReviews, updateReviewStatus, replyToReview, type Review } from "@/app/actions/reviews"

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterRating, setFilterRating] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  // Reply dialog state
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [replyText, setReplyText] = useState("")
  const [submittingReply, setSubmittingReply] = useState(false)

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    setLoading(true)
    try {
      const data = await getReviews()
      setReviews(data)
    } catch (error) {
      console.error("Error loading reviews:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (reviewId: number, status: string) => {
    const result = await updateReviewStatus(reviewId, status)
    if (result.success) {
      loadReviews()
    } else {
      alert(result.message)
    }
  }

  const openReplyDialog = (review: Review) => {
    setSelectedReview(review)
    setReplyText(review.owner_reply || "")
    setReplyDialogOpen(true)
  }

  const handleReplySubmit = async () => {
    if (!selectedReview) return
    setSubmittingReply(true)
    try {
      const result = await replyToReview(selectedReview.id, replyText)
      if (result.success) {
        setReplyDialogOpen(false)
        loadReviews()
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error("Error submitting reply:", error)
    } finally {
      setSubmittingReply(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
    ))
  }

  const filteredReviews = reviews.filter((review) => {
    const matchesStatus = filterStatus === "all" || review.status === filterStatus
    const matchesRating = filterRating === "all" || review.rating.toString() === filterRating
    const matchesSearch =
      review.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.review_text?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesRating && matchesSearch
  })

  const averageRating =
    reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : "0.0"

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter((r) => r.rating === rating).length / reviews.length) * 100 : 0,
  }))

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reviews...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Reviews & Ratings"
        subtitle="Monitor customer feedback, manage reviews, and track your business reputation across platforms."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Review Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="font-medium">Average Rating</span>
                </div>
                <div className="text-3xl font-bold">{averageRating}</div>
                <div className="text-sm text-gray-500">Based on {reviews.length} reviews</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ThumbsUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Positive Reviews</span>
                </div>
                <div className="text-3xl font-bold text-green-600">{reviews.filter((r) => r.rating >= 4).length}</div>
                <div className="text-sm text-gray-500">4+ star reviews</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Pending Reviews</span>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {reviews.filter((r) => r.status === "pending").length}
                </div>
                <div className="text-sm text-gray-500">Need attention</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">This Month</span>
                </div>
                <div className="text-3xl font-bold text-purple-600">
                  {reviews.filter((r) => new Date(r.created_at).getMonth() === new Date().getMonth()).length}
                </div>
                <div className="text-sm text-gray-500">New reviews</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ratingDistribution.map(({ rating, count, percentage }) => (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-12">
                        <span className="text-sm">{rating}</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                      <span className="text-sm text-gray-600 w-8">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search reviews..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterRating} onValueChange={setFilterRating}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="5">5 Stars</SelectItem>
                        <SelectItem value="4">4 Stars</SelectItem>
                        <SelectItem value="3">3 Stars</SelectItem>
                        <SelectItem value="2">2 Stars</SelectItem>
                        <SelectItem value="1">1 Star</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="w-4 h-4" />
                    More Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {review.customer_name?.charAt(0) || "C"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{review.customer_name || "Anonymous"}</h3>
                          <div className="flex items-center gap-1">{renderStars(review.rating)}</div>
                          <Badge className={getStatusColor(review.status)}>{review.status}</Badge>
                          {review.platform && (
                            <Badge variant="outline" className="gap-1">
                              <ExternalLink className="w-3 h-3" />
                              {review.platform}
                            </Badge>
                          )}
                        </div>

                        <p className="text-gray-700">{review.review_text}</p>
                        
                        {review.owner_reply && (
                          <div className="bg-gray-50 border-l-4 border-blue-500 p-4 mt-4 rounded-r-md">
                            <p className="text-sm font-semibold text-gray-900 mb-1">Owner Reply</p>
                            <p className="text-sm text-gray-700">{review.owner_reply}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-sm text-gray-500">
                            {new Date(review.created_at).toLocaleDateString()} at{" "}
                            {new Date(review.created_at).toLocaleTimeString()}
                          </span>

                          <div className="flex items-center gap-2">
                            {review.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(review.id, "approved")}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(review.id, "rejected")}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="gap-1 bg-transparent"
                              onClick={() => openReplyDialog(review)}
                            >
                              <Reply className="w-3 h-3" />
                              {review.owner_reply ? "Edit Reply" : "Reply"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredReviews.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-500">
                    <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No reviews found</h3>
                    <p>Customer reviews will appear here when they leave feedback.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
            <DialogDescription>
              Your reply will be visible to {selectedReview?.customer_name || "the customer"}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
               <div className="flex items-center gap-1 mb-2">{selectedReview && renderStars(selectedReview.rating)}</div>
               <p className="text-sm italic text-gray-700">"{selectedReview?.review_text}"</p>
            </div>
            <div>
              <Textarea
                placeholder="Write your reply here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)} disabled={submittingReply}>
              Cancel
            </Button>
            <Button onClick={handleReplySubmit} disabled={submittingReply || !replyText.trim()}>
              {submittingReply ? "Saving..." : "Save Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
