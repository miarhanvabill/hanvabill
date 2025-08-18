export const mockCustomers = [
  {
    id: "1",
    full_name: "Sarah Johnson",
    phone_number: "+1-555-0123",
    email: "sarah@example.com",
    loyalty_points: 750,
    total_bookings: 8,
    total_spent: 4200,
    last_visit: new Date("2024-01-20"),
    membership_type: "Gold",
  },
  {
    id: "2",
    full_name: "Mike Chen",
    phone_number: "+1-555-0124",
    email: "mike@example.com",
    loyalty_points: 250,
    total_bookings: 3,
    total_spent: 1500,
    last_visit: new Date("2024-01-18"),
    membership_type: null,
  },
]

export const mockServices = [
  {
    id: 1,
    name: "Premium Hair Cut",
    price: 1200,
    duration: 60,
    category: "Hair",
    description: "Professional hair cutting with styling",
  },
  {
    id: 2,
    name: "Hair Coloring",
    price: 2500,
    duration: 120,
    category: "Hair",
    description: "Full hair coloring service",
  },
  {
    id: 3,
    name: "Luxury Facial",
    price: 1800,
    duration: 90,
    category: "Skincare",
    description: "Deep cleansing facial treatment",
  },
]

export const mockProducts = [
  {
    id: 1,
    name: "Hair Serum",
    price: 450,
    stock: 25,
    category: "Hair Care",
  },
  {
    id: 2,
    name: "Face Cream",
    price: 680,
    stock: 15,
    category: "Skincare",
  },
]

export const mockCoupons = [
  {
    id: 1,
    code: "WELCOME10",
    name: "Welcome Offer",
    discount_type: "percentage",
    discount_value: 10,
    min_order_amount: 500,
    max_discount: 200,
    is_active: true,
  },
  {
    id: 2,
    code: "SAVE50",
    name: "Flat ₹50 Off",
    discount_type: "fixed",
    discount_value: 50,
    min_order_amount: 300,
    is_active: true,
  },
]

export const mockStaff = [
  {
    id: "1",
    name: "Sarah Johnson",
    role: "Senior Stylist",
    specialties: ["Hair Cut", "Hair Color"],
    rating: 4.8,
  },
  {
    id: "2",
    name: "Maria Garcia",
    role: "Esthetician",
    specialties: ["Facial", "Skincare"],
    rating: 4.9,
  },
]

export const mockManagers = [
  {
    id: "1",
    name: "Jennifer Smith",
    role: "Salon Manager",
    specialties: ["Operations", "Customer Service"],
    rating: 4.9,
  },
]
