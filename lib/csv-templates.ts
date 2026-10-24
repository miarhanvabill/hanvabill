// CSV template generation utilities for bulk upload

export interface CSVTemplate {
  headers: string[]
  sampleData: string[][]
  filename: string
}

// Customer CSV template
export const customerTemplate: CSVTemplate = {
  headers: [
    "phone_number",
    "full_name",
    "email",
    "gender",
    "sms_number",
    "code",
    "instagram_handle",
    "lead_source",
    "date_of_birth",
    "date_of_anniversary",
    "notes",
  ],
  sampleData: [
    [
      "+1234567890",
      "John Doe",
      "john.doe@example.com",
      "male",
      "+1234567890",
      "CUST001",
      "@johndoe",
      "Website",
      "1990-05-15",
      "2020-06-20",
      "Regular customer, prefers morning appointments",
    ],
    [
      "+1987654321",
      "Jane Smith",
      "jane.smith@example.com",
      "female",
      "+1987654321",
      "CUST002",
      "@janesmith",
      "Referral",
      "1985-12-03",
      "2019-08-10",
      "VIP customer, allergic to certain products",
    ],
    [
      "+1555123456",
      "Alex Johnson",
      "alex.johnson@example.com",
      "others",
      "+1555123456",
      "CUST003",
      "@alexj",
      "Social Media",
      "1992-03-22",
      "",
      "New customer, interested in premium services",
    ],
  ],
  filename: "customers_sample_template.csv",
}

// Services CSV template
export const serviceTemplate: CSVTemplate = {
  headers: ["name", "price", "description", "duration_minutes", "category", "code"],
  sampleData: [
    ["Haircut & Style", "45.00", "Professional haircut with styling", "60", "Hair Services", "HAIR001"],
    [
      "Deep Conditioning Treatment",
      "35.00",
      "Intensive hair conditioning and repair treatment",
      "45",
      "Hair Treatments",
      "TREAT001",
    ],
    ["Manicure", "25.00", "Classic manicure with nail polish", "30", "Nail Services", "NAIL001"],
    ["Facial Cleansing", "65.00", "Deep cleansing facial with moisturizing", "75", "Facial Services", "FACE001"],
  ],
  filename: "services_sample_template.csv",
}

// Bookings CSV template
export const bookingTemplate: CSVTemplate = {
  headers: [
    "booking_number",
    "booking_date",
    "booking_time",
    "customer_phone",
    "staff_name",
    "status",
    "total_amount",
    "notes",
  ],
  sampleData: [
    [
      "BK001-2024-001",
      "2024-01-15",
      "10:00",
      "+1234567890",
      "Sarah Wilson",
      "confirmed",
      "45.00",
      "Regular haircut appointment",
    ],
    [
      "BK001-2024-002",
      "2024-01-15",
      "11:30",
      "+1987654321",
      "Mike Johnson",
      "pending",
      "90.00",
      "Haircut and color treatment",
    ],
    [
      "BK001-2024-003",
      "2024-01-16",
      "14:00",
      "+1555123456",
      "Sarah Wilson",
      "completed",
      "65.00",
      "Facial treatment completed successfully",
    ],
  ],
  filename: "bookings_sample_template.csv",
}

// Products CSV template
export const productTemplate: CSVTemplate = {
  headers: ["name", "price", "cost", "stock_quantity", "category", "sku", "barcode", "description", "min_stock_level"],
  sampleData: [
    ["L'Oreal Pro Shampoo 250ml", "650.00", "420.00", "24", "Hair Care", "SKU-LOR-01", "8901234567890", "Deep nourishing shampoo for treated hair", "5"],
    ["Moroccan Argan Hair Serum 100ml", "1200.00", "780.00", "15", "Styling & Finish", "SKU-MOR-02", "8901234567891", "Frizz control and high shine Moroccan serum", "3"],
    ["Schwarzkopf Hair Clay Wax 85g", "750.00", "490.00", "30", "Men's Styling", "SKU-SCH-03", "8901234567892", "Matte finish strong hold styling clay", "6"],
    ["O3+ Brightening Facial Scrub 200g", "950.00", "600.00", "10", "Skin & Facial", "SKU-O3-04", "8901234567893", "Exfoliating salon scrub with botanical extracts", "2"],
  ],
  filename: "products_sample_template.csv",
}

// Staff CSV template
export const staffTemplate: CSVTemplate = {
  headers: ["name", "phone", "email", "role", "commission_rate"],
  sampleData: [
    ["Anita Sharma", "+919876543210", "anita.sharma@hanva.in", "Senior Hair Stylist", "12"],
    ["Rahul Verma", "+919876543211", "rahul.verma@hanva.in", "Creative Director", "15"],
    ["Pooja Patel", "+919876543212", "pooja.patel@hanva.in", "Skin & Esthetician", "10"],
    ["Vikram Singh", "+919876543213", "vikram.singh@hanva.in", "Salon Manager", "5"],
  ],
  filename: "staff_sample_template.csv",
}

// Invoices CSV template
export const invoiceTemplate: CSVTemplate = {
  headers: ["invoice_number", "invoice_date", "customer_name", "customer_phone", "subtotal", "discount_amount", "gst_amount", "total_amount", "payment_method", "notes"],
  sampleData: [
    ["INV-2026-001", "2026-10-24", "Priya Sen", "+919321501389", "1500.00", "100.00", "252.00", "1652.00", "UPI", "Haircut and Spa treatment"],
    ["INV-2026-002", "2026-10-24", "Amitabh Roy", "+919876543210", "800.00", "0.00", "144.00", "944.00", "Cash", "Beard trim and cleanup"],
  ],
  filename: "invoices_sample_template.csv",
}

// Utility function to generate CSV content from template
export function generateCSVContent(template: CSVTemplate, includeData = true): string {
  let csvContent = template.headers.join(",") + "\n"

  if (includeData) {
    template.sampleData.forEach((row) => {
      // Escape commas and quotes in data
      const escapedRow = row.map((cell) => {
        if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
          return `"${cell.replace(/"/g, '""')}"`
        }
        return cell
      })
      csvContent += escapedRow.join(",") + "\n"
    })
  }

  return csvContent
}

// Function to download CSV template
export function downloadCSVTemplate(template: CSVTemplate, includeData = true): void {
  const csvContent = generateCSVContent(template, includeData)
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = window.URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = template.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.URL.revokeObjectURL(url)
}

export type CSVEntityType = "customers" | "services" | "bookings" | "products" | "staff" | "invoices"

// Get template by entity type
export function getTemplateByType(entityType: CSVEntityType): CSVTemplate {
  switch (entityType) {
    case "customers":
      return customerTemplate
    case "services":
      return serviceTemplate
    case "bookings":
      return bookingTemplate
    case "products":
      return productTemplate
    case "staff":
      return staffTemplate
    case "invoices":
      return invoiceTemplate
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}

// Generate headers-only template (for empty template downloads)
export function generateEmptyTemplate(entityType: CSVEntityType): string {
  const template = getTemplateByType(entityType)
  return generateCSVContent(template, false)
}

// Generate template with sample data
export function generateSampleTemplate(entityType: CSVEntityType): string {
  const template = getTemplateByType(entityType)
  return generateCSVContent(template, true)
}

// Validation helpers for templates
export function validateCSVHeaders(
  csvHeaders: string[],
  entityType: CSVEntityType,
): {
  isValid: boolean
  missingRequired: string[]
  extraHeaders: string[]
} {
  const template = getTemplateByType(entityType)
  const requiredHeaders = getRequiredHeaders(entityType)

  const normalizedCsvHeaders = csvHeaders.map((h) => h.toLowerCase().trim())
  const normalizedTemplateHeaders = template.headers.map((h) => h.toLowerCase())
  const normalizedRequiredHeaders = requiredHeaders.map((h) => h.toLowerCase())

  const missingRequired = normalizedRequiredHeaders.filter((header) => !normalizedCsvHeaders.includes(header))

  const extraHeaders = normalizedCsvHeaders.filter((header) => !normalizedTemplateHeaders.includes(header))

  return {
    isValid: missingRequired.length === 0,
    missingRequired: missingRequired,
    extraHeaders: extraHeaders,
  }
}

// Get required headers for each entity type
export function getRequiredHeaders(entityType: CSVEntityType): string[] {
  switch (entityType) {
    case "customers":
      return ["phone_number", "full_name"]
    case "services":
      return ["name", "price"]
    case "bookings":
      return ["booking_number", "booking_date", "booking_time"]
    case "products":
      return ["name", "price"]
    case "staff":
      return ["name"]
    case "invoices":
      return ["invoice_number", "customer_name", "total_amount"]
    default:
      return []
  }
}

// Get optional headers for each entity type
export function getOptionalHeaders(entityType: CSVEntityType): string[] {
  const template = getTemplateByType(entityType)
  const required = getRequiredHeaders(entityType)
  return template.headers.filter((header) => !required.includes(header))
}
