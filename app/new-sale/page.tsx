"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { CustomerSelectionModal } from "@/components/customer-selection-modal"
import { ServiceSelectionScreen } from "@/components/service-selection-screen"
import { CheckoutScreen } from "@/components/checkout-screen"
import { InvoiceScreen, type Invoice, type Customer } from "@/components/invoice-screen"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, User, ShoppingCart, CreditCard, FileText } from "lucide-react"
import { toast } from "sonner"

import type { Customer as DbCustomer } from "@/app/actions/customers"
import { getOrCreateWalkInCustomer } from "@/app/actions/customers"
import { getBookingCheckoutDetails } from "@/app/actions/bookings"

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  type: "service" | "product" | "package" | "membership"
  staff_id?: number
  staff_name?: string
  staff_members?: Array<{ id: number; name: string; split_percentage: number }>
}

type SaleStep = "customer" | "services" | "checkout" | "invoice"

function NewSaleContent() {
  const searchParams = useSearchParams()
  const bookingIdParam = searchParams.get("booking_id")
  const stepParam = searchParams.get("step")

  const [currentStep, setCurrentStep] = useState<SaleStep>("customer")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [bookingId, setBookingId] = useState<number | null>(null)
  const [initialNotes, setInitialNotes] = useState<string>("")
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [isLoadingBooking, setIsLoadingBooking] = useState<boolean>(false)

  // Handle incoming booking link from calendar or appointments
  useEffect(() => {
    if (!bookingIdParam) return
    const bId = Number(bookingIdParam)
    if (!bId || isNaN(bId)) return

    let isMounted = true
    setIsLoadingBooking(true)
    setShowCustomerModal(false)

    getBookingCheckoutDetails(bId)
      .then((res) => {
        if (!isMounted) return
        if (res.success && res.customer && res.cartItems?.length) {
          setSelectedCustomer(res.customer)
          setCartItems(res.cartItems)
          setBookingId(res.bookingId)
          if (res.notes) setInitialNotes(res.notes)
          setShowCustomerModal(false)
          if (stepParam === "services") {
            setCurrentStep("services")
          } else {
            setCurrentStep("checkout")
          }
        } else {
          toast.error(res.message || "Failed to load booking for checkout")
          setShowCustomerModal(true)
        }
      })
      .catch((err) => {
        console.error("Error loading booking for checkout:", err)
        if (isMounted) {
          toast.error("Failed to load booking details")
          setShowCustomerModal(true)
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingBooking(false)
      })

    return () => {
      isMounted = false
    }
  }, [bookingIdParam, stepParam])

  // Reset everything when starting new sale
  const handleStartNewSale = () => {
    setCurrentStep("customer")
    setSelectedCustomer(null)
    setCartItems([])
    setInvoice(null)
    setBookingId(null)
    setInitialNotes("")
    setShowCustomerModal(true)
  }

  // Handle customer selection
  const handleCustomerSelect = (customer: DbCustomer) => {
    console.log("Customer selected in NewSalePage:", customer)
    const mappedCustomer: Customer = {
      id: customer.id,
      name: customer.full_name,
      email: customer.email || "",
      phone: customer.phone_number,
      address: customer.address || "",
    }
    setSelectedCustomer(mappedCustomer)
    setCurrentStep("services")
    setShowCustomerModal(false)
  }

  // Handle Quick Walk-in Selection
  const handleSelectWalkIn = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      handleCustomerSelect({
        id: 0,
        full_name: "Walk In",
        phone_number: "0000000000",
        created_at: new Date().toISOString(),
      } as DbCustomer)
      return
    }
    try {
      const walkIn = await getOrCreateWalkInCustomer()
      handleCustomerSelect(walkIn)
    } catch {
      handleCustomerSelect({
        id: 0,
        full_name: "Walk In",
        phone_number: "0000000000",
        created_at: new Date().toISOString(),
      } as DbCustomer)
    }
  }

  // Handle cart updates
  const handleCartUpdate = (items: CartItem[]) => {
    setCartItems(items)
  }

  // Handle checkout completion
  const handleCheckoutComplete = (invoiceData: Invoice) => {
    setInvoice(invoiceData)
    setCurrentStep("invoice")
  }

  // Handle navigation
  const handleBack = () => {
    switch (currentStep) {
      case "services":
        setCurrentStep("customer")
        setSelectedCustomer(null)
        break
      case "checkout":
        setCurrentStep("services")
        break
      case "invoice":
        setCurrentStep("checkout")
        break
    }
  }

  const handleProceedToCheckout = () => {
    if (cartItems.length > 0) {
      setCurrentStep("checkout")
    }
  }

  // Auto-open customer modal on mount ONLY IF not loading an external booking
  useEffect(() => {
    if (currentStep === "customer" && !selectedCustomer && !bookingIdParam && !isLoadingBooking) {
      setShowCustomerModal(true)
    }
  }, [currentStep, selectedCustomer, bookingIdParam, isLoadingBooking])

  const steps = [
    { key: "customer", label: "Customer", icon: User },
    { key: "services", label: "Services", icon: ShoppingCart },
    { key: "checkout", label: "Checkout", icon: CreditCard },
    { key: "invoice", label: "Invoice", icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white print:min-h-0">
      {/* Header */}
      <div className="bg-white shadow-sm border-b print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {currentStep !== "customer" && (
                <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <h1 className="text-xl font-semibold text-gray-900">New Sale</h1>
            </div>

            <Button onClick={handleStartNewSale} variant="outline" size="sm">
              Start New Sale
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-3 overflow-x-auto">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.key === currentStep
              const isCompleted = steps.findIndex((s) => s.key === currentStep) > index
              const canNavigate =
                step.key === "customer" ||
                (step.key === "services" && !!selectedCustomer) ||
                (step.key === "checkout" && !!selectedCustomer && cartItems.length > 0) ||
                (step.key === "invoice" && !!invoice)

              return (
                <div key={step.key} className="flex items-center shrink-0">
                  <button
                    type="button"
                    disabled={!canNavigate}
                    onClick={() => {
                      if (step.key === "customer") {
                        setShowCustomerModal(true)
                      } else {
                        setCurrentStep(step.key)
                      }
                    }}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs font-semibold"
                        : isCompleted
                          ? "bg-slate-100 text-slate-800 hover:bg-slate-200 cursor-pointer"
                          : canNavigate
                            ? "hover:bg-slate-100 cursor-pointer text-slate-600"
                            : "text-slate-400 cursor-not-allowed opacity-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{step.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`w-6 sm:w-8 h-px mx-1.5 sm:mx-2 ${isCompleted ? "bg-slate-400" : "bg-slate-200"}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Customer Info Bar */}
      {selectedCustomer && currentStep !== "customer" && (
        <div className="bg-blue-50 border-b print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="font-medium text-blue-900">{selectedCustomer.name}</span>
                  <span className="text-blue-700 ml-2">{selectedCustomer.phone}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomerModal(true)}
                className="text-blue-700 hover:text-blue-900"
              >
                Change Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0 print:max-w-none">
        {isLoadingBooking && (
          <Card className="max-w-xl mx-auto shadow-sm mb-6">
            <CardContent className="p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full border-4 border-slate-900 border-t-transparent animate-spin mx-auto" />
              <h2 className="text-lg font-semibold text-slate-800">Preparing POS Checkout...</h2>
              <p className="text-slate-500 text-sm">Loading appointment details, client profile, and booked services.</p>
            </CardContent>
          </Card>
        )}

        {!isLoadingBooking && currentStep === "customer" && (
          <Card className="max-w-xl mx-auto shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-slate-700" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Select Customer to Start Sale</h2>
              <p className="text-slate-600 mb-6 text-sm">
                Choose an existing client by name/phone, register a new client, or proceed quickly with Walk-In.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => setShowCustomerModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white gap-2">
                  <User className="w-4 h-4" />
                  Select / Create Customer
                </Button>
                <Button onClick={handleSelectWalkIn} variant="outline" className="border-slate-300 gap-2 hover:bg-slate-50 text-slate-700">
                  Quick Walk-In Sale
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "services" && selectedCustomer && (
          <ServiceSelectionScreen
            customer={selectedCustomer}
            cartItems={cartItems}
            onCartUpdate={handleCartUpdate}
            onProceedToCheckout={handleProceedToCheckout}
          />
        )}

        {currentStep === "checkout" && selectedCustomer && (
          <CheckoutScreen
            customer={selectedCustomer}
            cartItems={cartItems}
            bookingId={bookingId}
            initialNotes={initialNotes}
            onComplete={handleCheckoutComplete}
            onBack={() => setCurrentStep("services")}
            onChangeCustomer={() => setShowCustomerModal(true)}
          />
        )}

        {currentStep === "invoice" && invoice && (
          <InvoiceScreen invoice={invoice} onStartNewSale={handleStartNewSale} />
        )}
      </div>

      {/* Customer Selection Modal */}
      <CustomerSelectionModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={handleCustomerSelect}
      />
    </div>
  )
}

function NewSalePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      }
    >
      <NewSaleContent />
    </Suspense>
  )
}

export default NewSalePage
export { NewSalePage }
