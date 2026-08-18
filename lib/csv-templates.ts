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

// Get template by entity type
export function getTemplateByType(entityType: "customers" | "services" | "bookings"): CSVTemplate {
  switch (entityType) {
    case "customers":
      return customerTemplate
    case "services":
      return serviceTemplate
    case "bookings":
      return bookingTemplate
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}

// Generate headers-only template (for empty template downloads)
export function generateEmptyTemplate(entityType: "customers" | "services" | "bookings"): string {
  const template = getTemplateByType(entityType)
  return generateCSVContent(template, false)
}

// Generate template with sample data
export function generateSampleTemplate(entityType: "customers" | "services" | "bookings"): string {
  const template = getTemplateByType(entityType)
  return generateCSVContent(template, true)
}

// Validation helpers for templates
export function validateCSVHeaders(
  csvHeaders: string[],
  entityType: "customers" | "services" | "bookings",
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
export function getRequiredHeaders(entityType: "customers" | "services" | "bookings"): string[] {
  switch (entityType) {
    case "customers":
      return ["phone_number", "full_name"]
    case "services":
      return ["name", "price"]
    case "bookings":
      return ["booking_number", "booking_date", "booking_time"]
    default:
      return []
  }
}

// Get optional headers for each entity type
export function getOptionalHeaders(entityType: "customers" | "services" | "bookings"): string[] {
  const template = getTemplateByType(entityType)
  const required = getRequiredHeaders(entityType)
  return template.headers.filter((header) => !required.includes(header))
}
