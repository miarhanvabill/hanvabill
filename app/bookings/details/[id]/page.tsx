"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatCurrency } from "@/lib/currency"
import { getBookingById, updateBookingStatus, getBookingServices } from "@/app/actions/bookings"
import { getCustomerById } from "@/app/actions/customers"
import { getStaffById } from "@/app/actions/staff"
import { CheckoutScreen } from "@/components/checkout-screen"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { InvoiceTemplate } from "@/components/invoice-template"
import { getBusinessSettings } from "@/app/actions/settings"
import { Printer as Print, Download } from "lucide-react"
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Calendar,
  Clock,
  User,
  IndianRupee,
  CreditCard,
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface BookingDetails {
  id: number
  booking_number: string
  customer_id: number
  staff_id: number
  service_name: string
  staff_name: string
  booking_date: string
  booking_time: string
  total_amount: number
  status: "completed" | "confirmed" | "cancelled" | "pending"
  rating?: number | null
  notes?: string | null
  created_at: string
}

interface CustomerDetails {
  id: number
  full_name: string
  email?: string
  phone_number: string
  avatar?: string
}

interface StaffDetails {
  id: number
  name: string
  email?: string
  phone?: string
  specialization?: string
  avatar?: string
}

interface BookingService {
  service_id: number
  service_name: string
  price: number
  quantity: number
}

export default function BookingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [customer, setCustomer] = useState<CustomerDetails | null>(null)
  const [staff, setStaff] = useState<StaffDetails | null>(null)
  const [bookingServices, setBookingServices] = useState<BookingService[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [bizSettings, setBizSettings] = useState<any>(null)

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        const bookingId = params.id as string

        console.log("[v0] Fetching booking with ID:", bookingId)
        const bookingData = await getBookingById(bookingId)
        if (!bookingData) {
          toast.error("Booking not found")
          router.push("/bookings")
          return
        }

        setBooking(bookingData)

        // Use server action to get booking services with tenant isolation
        const services = await getBookingServices(bookingId)
        setBookingServices(services)

        const [customerData, staffData] = await Promise.all([
          getCustomerById(bookingData.customer_id.toString()),
          bookingData.staff_id ? getStaffById(bookingData.staff_id.toString()) : null,
        ])

        setCustomer(customerData)
        setStaff(staffData)
      } catch (error) {
        console.error("[v0] Error fetching booking data:", error)
        toast.error("Failed to load booking details")
        router.push("/bookings")
      } finally {
        setLoading(false)
      }
    }

    fetchBookingData()
  }, [params.id, router])

  const handleStatusUpdate = async (newStatus: string) => {
    if (!booking) return

    setUpdating(true)
    try {
      const result = await updateBookingStatus(booking.id, newStatus)
      if (result.success) {
        setBooking({ ...booking, status: newStatus as any })
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to update booking status")
    } finally {
      setUpdating(false)
    }
  }

  const handleCheckout = () => {
    setShowCheckout(true)
  }

  const handleCheckoutComplete = async (invoice: any) => {
    try {
      await handleStatusUpdate("confirmed")
      setShowCheckout(false)
      toast.success("Payment completed successfully!")
    } catch (error) {
      toast.error("Failed to update booking status after payment")
    }
  }

  const handleCheckoutBack = () => {
    setShowCheckout(false)
  }

  const handleSendMessage = () => {
    if (!customer) return
    const message = `Hi ${customer.full_name}, this is regarding your booking ${booking.booking_number} scheduled for ${new Date(booking.booking_date).toLocaleDateString()} at ${booking.booking_time}.`
    const whatsappUrl = `https://wa.me/${customer.phone_number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
    toast.success("Opening WhatsApp...")
  }

  const handleCallCustomer = () => {
    if (!customer) return
    window.open(`tel:${customer.phone_number}`, "_self")
    toast.success("Initiating call...")
  }

  const handleReschedule = () => {
    router.push(`/bookings/details/${booking.id}/edit`)
    toast.info("Redirecting to edit booking...")
  }

  const handleGenerateInvoice = () => {
    const invoiceData = {
      bookingNumber: booking.booking_number,
      customerName: customer?.full_name || "N/A",
      serviceName: booking.service_name,
      date: new Date(booking.booking_date).toLocaleDateString(),
      time: booking.booking_time,
      amount: booking.total_amount,
      tax: Math.round(booking.total_amount * 0.18),
      servicePrice: booking.total_amount - Math.round(booking.total_amount * 0.18),
    }

    console.log("[v0] Generating invoice with data:", invoiceData)
    toast.success("Invoice generated successfully!")

    const invoiceContent = `
HANVA BILLING INVOICE
=====================

Booking Number: ${invoiceData.bookingNumber}
Customer: ${invoiceData.customerName}
Service: ${invoiceData.serviceName}
Date: ${invoiceData.date}
Time: ${invoiceData.time}

Service Price: ${formatCurrency(invoiceData.servicePrice)}
Tax (18%): ${formatCurrency(invoiceData.tax)}
Total Amount: ${formatCurrency(invoiceData.amount)}

Thank you for choosing Hanva Billing!
    `

    const blob = new Blob([invoiceContent], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `invoice-${invoiceData.bookingNumber}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (showCheckout && booking && customer && bookingServices.length > 0) {
    const checkoutCustomer = {
      id: customer.id,
      name: customer.full_name,
      email: customer.email || "",
      phone: customer.phone_number,
      address: "",
    }

    const cartItems = bookingServices.map((service) => ({
      id: service.service_id, // Use actual service ID, not booking ID
      name: service.service_name,
      price: service.price,
      quantity: service.quantity,
      type: "service" as const,
      staff_id: booking.staff_id,
      staff_name: booking.staff_name,
    }))

    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Checkout - Booking {booking.booking_number}</h1>
              <p className="text-gray-600">Complete payment for your booking</p>
            </div>
          </div>
        </div>
        <main className="flex-1 p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <CheckoutScreen
              customer={checkoutCustomer}
              cartItems={cartItems}
              onComplete={handleCheckoutComplete}
              onBack={handleCheckoutBack}
            />
          </div>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Booking not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-orange-100 text-orange-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
        return <AlertCircle className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const tax = Math.round(booking.total_amount * 0.18)
  const servicePrice = booking.total_amount - tax

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Booking {booking.booking_number}</h1>
            <p className="text-gray-600">Complete booking details and service information</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Link href={`/bookings/details/${booking.id}/edit`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Booking
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Booking Status</span>
                  {getStatusIcon(booking.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Badge className={`${getStatusColor(booking.status)} capitalize text-sm px-3 py-1`}>
                    {booking.status.replace("-", " ")}
                  </Badge>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booking ID:</span>
                    <span className="font-medium">{booking.booking_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{new Date(booking.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{booking.service_name}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{booking.booking_time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <IndianRupee className="h-4 w-4 text-gray-400" />
                    <span>{formatCurrency(servicePrice)}</span>
                  </div>
                </div>
                {booking.notes && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Special Notes</h4>
                    <p className="text-sm text-gray-600">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Service Price:</span>
                    <span>{formatCurrency(servicePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (18%):</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(booking.total_amount)}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  {booking.status === "pending" ? (
                    <Button className="w-full" onClick={handleCheckout}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Proceed to Checkout
                    </Button>
                  ) : booking.status === "confirmed" ? (
                    <Button className="w-full bg-transparent" variant="outline" disabled>
                      Payment Completed
                    </Button>
                  ) : (
                    <Button className="w-full bg-transparent" variant="outline" disabled>
                      {booking.status === "completed" ? "Service Completed" : "Booking Cancelled"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customer && (
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={customer.avatar || "/placeholder.svg"} alt={customer.full_name} />
                      <AvatarFallback>
                        {customer.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Link href={`/customers/${customer.id}`}>
                        <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors cursor-pointer">
                          {customer.full_name}
                        </h3>
                      </Link>
                      <div className="space-y-2 mt-2 text-sm">
                        {customer.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{customer.phone_number}</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Link href={`/customers/${customer.id}`}>
                          <Button variant="outline" size="sm">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Assigned Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                {staff ? (
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={staff.avatar || "/placeholder.svg"} alt={staff.name} />
                      <AvatarFallback>
                        {staff.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Link href={`/staff/${staff.id}`}>
                        <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors cursor-pointer">
                          {staff.name}
                        </h3>
                      </Link>
                      {staff.specialization && <p className="text-sm text-gray-600">{staff.specialization}</p>}
                      <div className="mt-4">
                        <Link href={`/staff/${staff.id}`}>
                          <Button variant="outline" size="sm">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No staff assigned</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" onClick={handleSendMessage}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" onClick={handleCallCustomer}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Customer
                </Button>
                <Button variant="outline" onClick={handleReschedule}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
                <Button variant="outline" onClick={handleGenerateInvoice}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>
                {booking.status === "confirmed" && (
                  <Button onClick={() => handleStatusUpdate("completed")} disabled={updating}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Completed
                  </Button>
                )}
                {booking.status !== "cancelled" && (
                  <Button variant="destructive" onClick={() => handleStatusUpdate("cancelled")} disabled={updating}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Booking
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 print:w-full print:max-w-none print:m-0 print:p-0 print:border-none print:shadow-none bg-slate-50">
          <div className="flex justify-end mb-4 print:hidden gap-2">
            <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
            <Button onClick={async () => {
              window.print();
            }} className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Print className="w-4 h-4" />
              Print
            </Button>
          </div>
          {booking && customer && bizSettings && (() => {
            
                  // Parse notes to extract discount breakdown
                  let couponCode = undefined;
                  let couponDiscount = 0;
                  let loyaltyDiscount = 0;
                  let giftCardDiscount = 0;
                  let loyaltyPointsEarned = undefined;
                  let loyaltyPointsAvailable = undefined;
                  
                  if (booking.notes) {
                    const noteParts = booking.notes.split(' | ');
                    for (const part of noteParts) {
                      if (part.startsWith('Coupon: ')) {
                        const match = part.match(/Coupon: (.*) \(-\d+(\.\d+)?\)/);
                        if (match) {
                          couponCode = match[1];
                          couponDiscount = parseFloat(part.match(/\(-(\d+(\.\d+)?)\)/)[1] || '0');
                        } else {
                          couponCode = part.replace('Coupon: ', '');
                        }
                      } else if (part.startsWith('Loyalty Redeemed: ₹')) {
                        loyaltyDiscount = parseFloat(part.replace('Loyalty Redeemed: ₹', ''));
                      } else if (part.startsWith('Gift Card Redeemed: ₹')) {
                        giftCardDiscount = parseFloat(part.replace('Gift Card Redeemed: ₹', ''));
                      } else if (part.startsWith('Points Earned: ')) {
                        loyaltyPointsEarned = parseInt(part.replace('Points Earned: ', ''));
                      } else if (part.startsWith('Points Balance: ')) {
                        loyaltyPointsAvailable = parseInt(part.replace('Points Balance: ', ''));
                      }
                    }
                  }

                  const genericDiscount = Math.max(0, bookingServices.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) - (booking.total_amount / 1.18) - couponDiscount - loyaltyDiscount - giftCardDiscount);

            return (
            <div className="print:block w-full bg-white shadow-xl rounded-xl border border-slate-100 overflow-hidden" id="invoice-template-wrapper-booking">
              <InvoiceTemplate 
                data={{
                  invoiceNumber: booking.booking_number,
                  invoiceDate: booking.created_at,
                  dueDate: booking.created_at,
                  customerName: customer.full_name || "Walk-in Customer",
                  customerPhone: customer.phone_number || "",
                  customerEmail: customer.email || "",
                  items: bookingServices.map((bs, i) => ({
                    id: i + 1,
                    description: bs.service_name,
                    quantity: bs.quantity,
                    rate: bs.price,
                    amount: bs.price * bs.quantity,
                    staffName: staff?.name
                  })),
                  subtotal: bookingServices.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0),
                  discount: genericDiscount,
                  couponCode,
                  couponDiscount,
                  loyaltyDiscount,
                  giftCardDiscount,
                  loyaltyPointsEarned,
                  loyaltyPointsAvailable,
                  gstRate: 18,
                  isInterState: false,
                  placeOfSupply: "Karnataka",
                  businessLogo: bizSettings.profile?.logo || "",
                  businessName: bizSettings.profile?.salonName || "Hanva Salon",
                  businessAddress: bizSettings.profile?.address || "",
                  businessPhone: bizSettings.profile?.phone || "",
                  businessEmail: bizSettings.profile?.email || "",
                  businessGSTIN: bizSettings.profile?.gstNumber || "",
                  businessPAN: "",
                  sacCode: "999599"
                }}
                className="shadow-none border-none rounded-none"
              />
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}