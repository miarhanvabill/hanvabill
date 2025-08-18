"use client"

import { useState, useEffect } from "react"
import { CustomerSelectionModal } from "@/components/customer-selection-modal"
import { ServiceSelectionScreen } from "@/components/service-selection-screen"
import { CheckoutScreen } from "@/components/checkout-screen"
import { InvoiceScreen } from "@/components/invoice-screen"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, User, ShoppingCart, CreditCard, FileText } from "lucide-react"

interface Customer {
  id: number
  full_name: string
  phone_number: string
  email?: string | null
  address?: string | null
  gender?: string | null
  date_of_birth?: string | null
  created_at: string
  updated_at: string
  total_bookings?: number
  total_spent?: number
}

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  type: "service" | "product" | "package" | "membership"
  staff_id?: number
  staff_name?: string
}

interface Invoice {
  id: number
  customer: Customer
  items: CartItem[]
  subtotal: number
  discount: number
  gst: number
  total: number
  payment_method: string
  notes?: string
  created_at: string
}

type SaleStep = "customer" | "services" | "checkout" | "invoice"

export default function NewSalePage() {
  const [currentStep, setCurrentStep] = useState<SaleStep>("customer")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  // Reset everything when starting new sale
  const handleStartNewSale = () => {
    setCurrentStep("customer")
    setSelectedCustomer(null)
    setCartItems([])
    setInvoice(null)
    setShowCustomerModal(true)
  }

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    console.log("Customer selected in NewSalePage:", customer)
    const mappedCustomer = {
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

  // Auto-open customer modal on mount
  useEffect(() => {
    if (currentStep === "customer" && !selectedCustomer) {
      setShowCustomerModal(true)
    }
  }, [currentStep, selectedCustomer])

  const steps = [
    { key: "customer", label: "Customer", icon: User },
    { key: "services", label: "Services", icon: ShoppingCart },
    { key: "checkout", label: "Checkout", icon: CreditCard },
    { key: "invoice", label: "Invoice", icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
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
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.key === currentStep
              const isCompleted = steps.findIndex((s) => s.key === currentStep) > index

              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : isCompleted
                          ? "bg-green-100 text-green-700"
                          : "text-gray-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-px mx-2 ${isCompleted ? "bg-green-300" : "bg-gray-300"}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Customer Info Bar */}
      {selectedCustomer && currentStep !== "customer" && (
        <div className="bg-blue-50 border-b">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentStep === "customer" && (
          <Card>
            <CardContent className="p-8 text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select Customer</h2>
              <p className="text-gray-600 mb-6">Choose an existing customer or create a new one to start the sale.</p>
              <Button onClick={() => setShowCustomerModal(true)}>Select Customer</Button>
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
            onComplete={handleCheckoutComplete}
            onBack={() => setCurrentStep("services")}
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

// Named export for deployment
export { NewSalePage }
