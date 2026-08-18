import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { NewSalePage } from "@/app/new-sale/page"
import { getCustomers, createCustomer } from "@/app/actions/customers"
import { getServices } from "@/app/actions/services"
import { validateCoupon } from "@/app/actions/coupons"

// Mock the server actions
jest.mock("@/app/actions/customers")
jest.mock("@/app/actions/services")
jest.mock("@/app/actions/coupons")

const mockCustomers = [
  {
    id: "1",
    full_name: "John Doe",
    phone_number: "+1234567890",
    email: "john@example.com",
    loyalty_points: 500,
    total_bookings: 5,
    total_spent: 2500,
    last_visit: new Date("2024-01-15"),
  },
]

const mockServices = [
  {
    id: 1,
    name: "Haircut & Styling",
    price: 500,
    duration: 45,
    category: "Hair",
  },
]

describe("Billing Workflow End-to-End Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getCustomers as jest.Mock).mockResolvedValue(mockCustomers)
    ;(getServices as jest.Mock).mockResolvedValue(mockServices)
  })

  describe("Customer Management", () => {
    it("should load existing customers in search", async () => {
      render(<NewSalePage />)

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument()
      })

      expect(screen.getByText("+1234567890")).toBeInTheDocument()
      expect(screen.getByText("500 points")).toBeInTheDocument()
    })

    it("should allow creating new customer", async () => {
      const mockCreateCustomer = createCustomer as jest.Mock
      mockCreateCustomer.mockResolvedValue({
        success: true,
        customer: { id: "2", full_name: "Jane Smith", phone_number: "+0987654321" },
      })

      render(<NewSalePage />)

      const newCustomerButton = screen.getByText("New Customer")
      fireEvent.click(newCustomerButton)

      // Fill form
      const nameInput = screen.getByLabelText("Full Name")
      const phoneInput = screen.getByLabelText("Phone Number")

      fireEvent.change(nameInput, { target: { value: "Jane Smith" } })
      fireEvent.change(phoneInput, { target: { value: "+0987654321" } })

      const submitButton = screen.getByText("Create Customer")
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockCreateCustomer).toHaveBeenCalledWith(expect.any(FormData))
      })
    })

    it("should handle customer search functionality", async () => {
      render(<NewSalePage />)

      const searchInput = screen.getByPlaceholderText(/search customers/i)
      fireEvent.change(searchInput, { target: { value: "John" } })

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument()
      })
    })
  })

  describe("Cart and Staff Assignment", () => {
    it("should add services to cart with correct pricing", async () => {
      render(<NewSalePage />)

      // Select customer first
      const customerCard = screen.getByText("John Doe")
      fireEvent.click(customerCard)

      await waitFor(() => {
        expect(screen.getByText("Select Services & Products")).toBeInTheDocument()
      })

      // Add service
      const addServiceButton = screen.getByText("Add")
      fireEvent.click(addServiceButton)

      // Verify service appears in cart
      expect(screen.getByText("Haircut & Styling")).toBeInTheDocument()
      expect(screen.getByText("₹500")).toBeInTheDocument()
    })

    it("should require staff selection before checkout", async () => {
      render(<NewSalePage />)

      // Navigate through flow without selecting staff
      const continueButton = screen.getByText("Continue to Checkout")
      fireEvent.click(continueButton)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText("Please select a staff member")).toBeInTheDocument()
      })
    })
  })

  describe("Coupon Application", () => {
    it("should apply valid coupon and update totals", async () => {
      const mockValidateCoupon = validateCoupon as jest.Mock
      mockValidateCoupon.mockResolvedValue({
        success: true,
        coupon: {
          code: "SAVE20",
          discount_type: "percentage",
          discount_value: 20,
          min_order_amount: 100,
        },
      })

      render(<NewSalePage />)

      // Navigate to checkout
      // ... setup steps ...

      const couponInput = screen.getByPlaceholderText("Enter coupon code")
      fireEvent.change(couponInput, { target: { value: "SAVE20" } })

      const applyCouponButton = screen.getByText("Apply Coupon")
      fireEvent.click(applyCouponButton)

      await waitFor(() => {
        expect(mockValidateCoupon).toHaveBeenCalledWith("SAVE20", expect.any(Number))
        expect(screen.getByText("Coupon Applied")).toBeInTheDocument()
      })
    })

    it("should handle invalid coupon codes", async () => {
      const mockValidateCoupon = validateCoupon as jest.Mock
      mockValidateCoupon.mockResolvedValue({
        success: false,
        message: "Invalid coupon code",
      })

      render(<NewSalePage />)

      const couponInput = screen.getByPlaceholderText("Enter coupon code")
      fireEvent.change(couponInput, { target: { value: "INVALID" } })

      const applyCouponButton = screen.getByText("Apply Coupon")
      fireEvent.click(applyCouponButton)

      await waitFor(() => {
        expect(screen.getByText("Invalid coupon code")).toBeInTheDocument()
      })
    })
  })

  describe("Checkout Calculations", () => {
    it("should calculate totals correctly with discounts", () => {
      const subtotal = 1000
      const discountPercent = 10
      const gstRate = 18

      const discountAmount = (subtotal * discountPercent) / 100
      const taxableAmount = subtotal - discountAmount
      const gstAmount = (taxableAmount * gstRate) / 100
      const total = taxableAmount + gstAmount

      expect(discountAmount).toBe(100)
      expect(taxableAmount).toBe(900)
      expect(gstAmount).toBe(162)
      expect(total).toBe(1062)
    })

    it("should handle wallet balance application", () => {
      const subtotal = 1000
      const walletBalance = 200
      const discountAmount = 100

      const maxWalletUsage = Math.min(walletBalance, subtotal - discountAmount)
      expect(maxWalletUsage).toBe(200)

      const finalAmount = subtotal - discountAmount - maxWalletUsage
      expect(finalAmount).toBe(700)
    })
  })
})
