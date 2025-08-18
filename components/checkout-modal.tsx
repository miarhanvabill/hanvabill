"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CreditCard,
  Banknote,
  User,
  Phone,
  Mail,
  Receipt,
  Share2,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { LoyaltyCheckout } from "./loyalty-checkout"
import { getCustomerLoyalty, updateLoyaltyPoints } from "@/app/actions/loyalty"
import { calculatePointsEarned } from "@/lib/loyalty"

interface CheckoutItem {
  id: number
  name: string
  price: number
  quantity: number
}

interface Customer {
  id: number
  full_name: string
  phone_number: string
  email?: string
}

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  customer: Customer | null
  items: CheckoutItem[]
  onCheckoutComplete: (invoiceData: any) => void
}

type CheckoutStep = "review" | "payment" | "confirmation"

export function CheckoutModal({ open, onClose, customer, items, onCheckoutComplete }: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("review")
  const [paymentMode, setPaymentMode] = useState<"cash" | "online">("cash")
  const [notes, setNotes] = useState("")
  const [discount, setDiscount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0)
  const [loyaltyPointsEarned, setLoyaltyPointsEarned] = useState(0)
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0)
  const [loyalty, setLoyalty] = useState<any>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountAmount = (subtotal * discount) / 100 + loyaltyDiscount
  const taxableAmount = subtotal - discountAmount
  const gstAmount = Math.round(taxableAmount * 0.18)
  const totalAmount = taxableAmount + gstAmount

  // Load customer loyalty data when modal opens
  useEffect(() => {
    if (open && customer) {
      loadCustomerLoyalty()
    }
  }, [open, customer])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open])

  const loadCustomerLoyalty = async () => {
    if (!customer) return

    try {
      const loyaltyData = await getCustomerLoyalty(customer.id.toString())
      setLoyalty(loyaltyData)

      if (loyaltyData) {
        const pointsEarned = calculatePointsEarned(subtotal, loyaltyData.tier)
        setLoyaltyPointsEarned(pointsEarned)
      }
    } catch (error) {
      console.error("Error loading loyalty data:", error)
    }
  }

  const resetForm = () => {
    setCurrentStep("review")
    setPaymentMode("cash")
    setNotes("")
    setDiscount(0)
    setIsProcessing(false)
    setInvoiceData(null)
    setLoyaltyPointsToRedeem(0)
    setLoyaltyPointsEarned(0)
    setLoyaltyDiscount(0)
    setLoyalty(null)
    setValidationErrors([])
  }

  const validateStep = (step: CheckoutStep): string[] => {
    const errors: string[] = []

    if (step === "review") {
      if (!customer) {
        errors.push("Please select a customer")
      }
      if (items.length === 0) {
        errors.push("Please add at least one service to the cart")
      }
      if (discount < 0 || discount > 50) {
        errors.push("Discount must be between 0% and 50%")
      }
      if (totalAmount <= 0) {
        errors.push("Total amount must be greater than zero")
      }
    }

    if (step === "payment") {
      if (!paymentMode) {
        errors.push("Please select a payment mode")
      }
    }

    return errors
  }

  const handleNext = () => {
    const errors = validateStep(currentStep)
    setValidationErrors(errors)

    if (errors.length > 0) {
      return
    }

    if (currentStep === "review") {
      setCurrentStep("payment")
    } else if (currentStep === "payment") {
      processPayment()
    }
  }

  const handleBack = () => {
    setValidationErrors([])

    if (currentStep === "payment") {
      setCurrentStep("review")
    } else if (currentStep === "confirmation") {
      setCurrentStep("payment")
    }
  }

  const handleLoyaltyPointsChange = (pointsToRedeem: number, discount: number) => {
    setLoyaltyPointsToRedeem(pointsToRedeem)
    setLoyaltyDiscount(discount)
  }

  const processPayment = async () => {
    if (!customer) return

    setIsProcessing(true)
    setValidationErrors([])

    try {
      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Update loyalty points if customer has loyalty program
      if (loyalty) {
        // Redeem points if used
        if (loyaltyPointsToRedeem > 0) {
          await updateLoyaltyPoints(
            customer.id.toString(),
            -loyaltyPointsToRedeem,
            loyaltyDiscount,
            "redeemed",
            `Points redeemed for discount - Invoice #INV-${Date.now()}`,
          )
        }

        // Award points for purchase
        const pointsEarned = calculatePointsEarned(totalAmount, loyalty.tier)
        await updateLoyaltyPoints(
          customer.id.toString(),
          pointsEarned,
          totalAmount,
          "earned",
          `Purchase - Invoice #INV-${Date.now()}`,
        )

        setLoyaltyPointsEarned(pointsEarned)
      }

      // Generate invoice data
      const invoice = {
        invoiceNumber: `INV-${Date.now()}`,
        invoiceDate: new Date().toISOString(),
        customer,
        items: items.map((item) => ({
          id: item.id,
          description: item.name,
          quantity: item.quantity,
          rate: item.price,
          amount: item.price * item.quantity,
        })),
        subtotal,
        discount: discountAmount,
        loyaltyDiscount,
        loyaltyPointsEarned,
        loyaltyPointsRedeemed: loyaltyPointsToRedeem,
        gstAmount,
        totalAmount,
        paymentMode,
        notes,
        businessName: "Glamour Beauty Salon",
        businessAddress: "456, Brigade Road\nBangalore, Karnataka - 560025",
        businessPhone: "+91 80 1234 5678",
        businessEmail: "info@glamoursalon.com",
        businessGSTIN: "29XYZTE5678G1H9",
      }

      setInvoiceData(invoice)
      setCurrentStep("confirmation")
      onCheckoutComplete(invoice)
    } catch (error) {
      console.error("Payment processing error:", error)
      setValidationErrors(["Payment processing failed. Please try again."])
    } finally {
      setIsProcessing(false)
    }
  }

  const shareViaWhatsApp = () => {
    if (!customer || !invoiceData) return

    const message = `
🧾 *Invoice Details*
━━━━━━━━━━━━━━━━━━━━

📋 Invoice: ${invoiceData.invoiceNumber}
📅 Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString("en-IN")}
👤 Customer: ${customer.full_name}

🛍️ *Services:*
${invoiceData.items
  .map((item: any) => `• ${item.description} (${item.quantity}x) - ${formatCurrency(item.amount)}`)
  .join("\n")}

💰 *Payment Summary:*
Subtotal: ${formatCurrency(subtotal)}
${discountAmount > 0 ? `Discount: -${formatCurrency(discountAmount)}\n` : ""}${loyaltyDiscount > 0 ? `Loyalty Discount: -${formatCurrency(loyaltyDiscount)} (${loyaltyPointsToRedeem} points)\n` : ""}GST (18%): ${formatCurrency(gstAmount)}
*Total: ${formatCurrency(totalAmount)}*

💳 Payment Mode: ${paymentMode === "cash" ? "💵 Cash" : "💳 Online"}
${loyaltyPointsEarned > 0 ? `\n⭐ Points Earned: +${loyaltyPointsEarned}` : ""}

Thank you for choosing Glamour Beauty Salon! ✨
    `.trim()

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${customer.phone_number.replace(/[^0-9]/g, "")}?text=${encodedMessage}`
    window.open(whatsappUrl, "_blank")
  }

  const renderValidationErrors = () => {
    if (validationErrors.length === 0) return null

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    )
  }

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Order Review</h3>

        {renderValidationErrors()}

        {/* Customer Info */}
        {customer && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">{customer.full_name}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {customer.phone_number}
                    </span>
                    {customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {customer.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                  <p className="text-sm text-gray-600">{formatCurrency(item.price)} each</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Discount */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Label htmlFor="discount" className="text-sm font-medium">
                Discount (%)
              </Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="50"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any special notes or instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Loyalty Program */}
        {customer && (
          <LoyaltyCheckout loyalty={loyalty} totalAmount={subtotal} onPointsRedeem={handleLoyaltyPointsChange} />
        )}
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount - loyaltyDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount ({discount}%):</span>
              <span>-{formatCurrency(discountAmount - loyaltyDiscount)}</span>
            </div>
          )}
          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-purple-600">
              <span>Loyalty Discount:</span>
              <span>-{formatCurrency(loyaltyDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>GST (18%):</span>
            <span>{formatCurrency(gstAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total:</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
          {loyaltyPointsEarned > 0 && (
            <div className="flex justify-between text-green-600 text-sm">
              <span>Points to Earn:</span>
              <span>+{loyaltyPointsEarned}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Payment Mode</h3>

        {renderValidationErrors()}

        <RadioGroup value={paymentMode} onValueChange={(value: "cash" | "online") => setPaymentMode(value)}>
          <Card
            className={`cursor-pointer transition-colors ${paymentMode === "cash" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Cash Payment</h4>
                    <p className="text-sm text-gray-600">Pay with cash at the counter</p>
                  </div>
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${paymentMode === "online" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="online" id="online" />
                <Label htmlFor="online" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Online Payment</h4>
                    <p className="text-sm text-gray-600">UPI, Card, or Net Banking</p>
                  </div>
                </Label>
              </div>
            </CardContent>
          </Card>
        </RadioGroup>
      </div>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Amount to Pay:</span>
            <span className="font-semibold text-lg">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Payment Mode:</span>
            <Badge variant="outline">
              {paymentMode === "cash" ? (
                <>
                  <Banknote className="w-3 h-3 mr-1" /> Cash
                </>
              ) : (
                <>
                  <CreditCard className="w-3 h-3 mr-1" /> Online
                </>
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderConfirmationStep = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-green-600 mb-2">Payment Successful!</h3>
        <p className="text-gray-600">Your transaction has been completed successfully.</p>
      </div>

      {invoiceData && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Invoice Generated</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Invoice No:</span>
                <span className="font-mono">{invoiceData.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{customer?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-semibold">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="capitalize">{paymentMode}</span>
              </div>
              {loyaltyPointsEarned > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Points Earned:</span>
                  <span>+{loyaltyPointsEarned}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <Button onClick={shareViaWhatsApp} className="w-full bg-green-600 hover:bg-green-700" disabled={!customer}>
          <Share2 className="w-4 h-4 mr-2" />
          Share Invoice via WhatsApp
        </Button>

        <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
          Close
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Checkout
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-4">
            <div
              className={`flex items-center ${currentStep === "review" ? "text-blue-600" : currentStep === "payment" || currentStep === "confirmation" ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === "review" ? "bg-blue-100" : currentStep === "payment" || currentStep === "confirmation" ? "bg-green-100" : "bg-gray-100"}`}
              >
                1
              </div>
              <span className="ml-2 text-sm font-medium">Review</span>
            </div>

            <div
              className={`w-8 h-0.5 ${currentStep === "payment" || currentStep === "confirmation" ? "bg-green-600" : "bg-gray-300"}`}
            />

            <div
              className={`flex items-center ${currentStep === "payment" ? "text-blue-600" : currentStep === "confirmation" ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === "payment" ? "bg-blue-100" : currentStep === "confirmation" ? "bg-green-100" : "bg-gray-100"}`}
              >
                2
              </div>
              <span className="ml-2 text-sm font-medium">Payment</span>
            </div>

            <div className={`w-8 h-0.5 ${currentStep === "confirmation" ? "bg-green-600" : "bg-gray-300"}`} />

            <div className={`flex items-center ${currentStep === "confirmation" ? "text-green-600" : "text-gray-400"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === "confirmation" ? "bg-green-100" : "bg-gray-100"}`}
              >
                3
              </div>
              <span className="ml-2 text-sm font-medium">Complete</span>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === "review" && renderReviewStep()}
          {currentStep === "payment" && renderPaymentStep()}
          {currentStep === "confirmation" && renderConfirmationStep()}

          {/* Navigation Buttons */}
          {currentStep !== "confirmation" && (
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={currentStep === "review" ? onClose : handleBack}
                disabled={isProcessing}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {currentStep === "review" ? "Cancel" : "Back"}
              </Button>

              <Button onClick={handleNext} disabled={isProcessing} className="min-w-[120px]">
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <>
                    {currentStep === "review" ? "Continue" : "Process Payment"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
