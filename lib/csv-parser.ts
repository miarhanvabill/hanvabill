// CSV parsing utilities for bulk upload functionality

export interface CSVParseResult<T> {
  success: boolean
  data: T[]
  errors: string[]
  totalRows: number
  validRows: number
}

export interface CSVValidationRule {
  field: string
  required: boolean
  type?: "string" | "number" | "email" | "phone" | "date"
  maxLength?: number
  pattern?: RegExp
  customValidator?: (value: string) => boolean
}

// Common aliases for CSV headers to maximize compatibility with client spreadsheets
const HEADER_ALIASES: Record<string, string> = {
  // Service headers
  service_name: "name",
  service: "name",
  title: "name",
  item_name: "name",
  rate: "price",
  cost: "price",
  amount: "price",
  mrp: "price",
  fee: "price",
  "price_(inr)": "price",
  "price_inr": "price",
  "price(inr)": "price",
  duration: "duration_minutes",
  duration_min: "duration_minutes",
  duration_mins: "duration_minutes",
  "duration_(min)": "duration_minutes",
  "duration_(mins)": "duration_minutes",
  "duration_(minutes)": "duration_minutes",
  "duration(min)": "duration_minutes",
  "duration(mins)": "duration_minutes",
  time_minutes: "duration_minutes",
  time_taken: "duration_minutes",
  category_name: "category",
  service_category: "category",
  department: "category",
  service_code: "code",
  item_code: "code",
  sku: "code",

  // Customer headers
  phone: "phone_number",
  mobile: "phone_number",
  mobile_number: "phone_number",
  contact: "phone_number",
  contact_number: "phone_number",
  cell: "phone_number",
  customer_name: "full_name",
  client_name: "full_name",
  email_address: "email",
  mail: "email",
  dob: "date_of_birth",
  birth_date: "date_of_birth",
  birthday: "date_of_birth",
  anniversary: "date_of_anniversary",
  anniversary_date: "date_of_anniversary",

  // Booking headers
  booking_id: "booking_number",
  appointment_id: "booking_number",
  appointment_number: "booking_number",
  date: "booking_date",
  time: "booking_time",
  staff: "staff_name",
  stylist: "staff_name",
  employee: "staff_name",

  // Product headers
  product_name: "name",
  item: "name",
  product: "name",
  retail_price: "price",
  selling_price: "price",
  cost_price: "cost",
  purchase_price: "cost",
  buy_price: "cost",
  stock: "stock_quantity",
  quantity: "stock_quantity",
  qty: "stock_quantity",
  inventory: "stock_quantity",
  min_stock: "min_stock_level",
  minimum_stock: "min_stock_level",
  reorder_level: "min_stock_level",
  barcode_number: "barcode",
  upc: "barcode",
  ean: "barcode",
  sku_number: "sku",
  product_code: "sku",

  // Staff headers
  employee_name: "name",
  stylist_name: "name",
  member_name: "name",
  staff_phone: "phone",
  staff_email: "email",
  designation: "role",
  position: "role",
  job_title: "role",
  commission: "commission_rate",
  commission_percentage: "commission_rate",
  commission_pct: "commission_rate",
}

export class CSVParser {
  static parseCSV(csvText: string): string[][] {
    // Strip UTF-8 BOM if present and normalize line breaks
    const cleanText = csvText
      .replace(/^\uFEFF/, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")

    const lines = cleanText.split("\n").filter((line) => line.trim() !== "")
    const result: string[][] = []

    for (const line of lines) {
      const row: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          // Handle escaped double quotes ("")
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === "," && !inQuotes) {
          row.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }

      row.push(current.trim())
      result.push(row)
    }

    return result
  }

  static validateAndTransform<T>(
    csvData: string[][],
    validationRules: CSVValidationRule[],
    transformer: (row: Record<string, string>) => T,
  ): CSVParseResult<T> {
    if (csvData.length === 0) {
      return {
        success: false,
        data: [],
        errors: ["CSV file is empty or contains no readable lines."],
        totalRows: 0,
        validRows: 0,
      }
    }

    // Clean and normalize headers (lowercase, trimmed, space -> underscore, BOM stripped)
    const rawHeaders = csvData[0].map((h) =>
      h.toLowerCase().trim().replace(/^\uFEFF/, "").replace(/[\s-]+/g, "_")
    )

    // Map each raw header to its canonical field name if alias exists
    const headers = rawHeaders.map((h) => HEADER_ALIASES[h] || h)
    const dataRows = csvData.slice(1)
    const errors: string[] = []
    const validData: T[] = []

    // Validate required headers
    const requiredFields = validationRules
      .filter((rule) => rule.required)
      .map((rule) => rule.field.toLowerCase())
    const missingHeaders = requiredFields.filter((field) => !headers.includes(field))

    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers: ${missingHeaders.join(", ")}. Found headers: ${rawHeaders.join(", ")}`)
      return {
        success: false,
        data: [],
        errors,
        totalRows: dataRows.length,
        validRows: 0,
      }
    }

    // Process each row
    dataRows.forEach((row, index) => {
      const rowNumber = index + 2 // Row 1 is header
      const rowData: Record<string, string> = {}
      const rowErrors: string[] = []

      // Map row data to canonical headers (and keep raw headers accessible too)
      headers.forEach((header, colIndex) => {
        const val = row[colIndex] || ""
        rowData[header] = val
        if (rawHeaders[colIndex]) {
          rowData[rawHeaders[colIndex]] = val
        }
      })

      // Validate each field
      validationRules.forEach((rule) => {
        const fieldName = rule.field.toLowerCase()
        const value = rowData[fieldName] || ""

        // Required field validation
        if (rule.required && !value.trim()) {
          rowErrors.push(`Row ${rowNumber}: Required field '${rule.field}' is missing or empty.`)
          return
        }

        // Skip validation for empty optional fields
        if (!value.trim() && !rule.required) {
          return
        }

        // Type validation
        if (rule.type) {
          switch (rule.type) {
            case "email":
              if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
                rowErrors.push(`Row ${rowNumber}: '${rule.field}' must be a valid email address (got "${value}").`)
              }
              break
            case "phone":
              if (value && !/^\+?[\d\s\-()]{7,}$/.test(value.trim())) {
                rowErrors.push(`Row ${rowNumber}: '${rule.field}' must be a valid phone number (got "${value}").`)
              }
              break
            case "number": {
              // Strip currency symbols (₹, $, Rs), commas, and whitespace before evaluating
              const cleanedNumber = value.replace(/[^0-9.-]/g, "").trim()
              if (value && (cleanedNumber === "" || isNaN(Number(cleanedNumber)))) {
                rowErrors.push(`Row ${rowNumber}: '${rule.field}' must be a valid number (got "${value}").`)
              }
              break
            }
            case "date":
              if (value && isNaN(Date.parse(value.trim()))) {
                rowErrors.push(`Row ${rowNumber}: '${rule.field}' must be a valid date (got "${value}").`)
              }
              break
          }
        }

        // Length validation
        if (rule.maxLength && value.length > rule.maxLength) {
          rowErrors.push(`Row ${rowNumber}: '${rule.field}' exceeds maximum length of ${rule.maxLength} characters.`)
        }

        // Pattern validation
        if (rule.pattern && value && !rule.pattern.test(value)) {
          rowErrors.push(`Row ${rowNumber}: '${rule.field}' format is invalid (got "${value}").`)
        }

        // Custom validation
        if (rule.customValidator && value && !rule.customValidator(value)) {
          rowErrors.push(`Row ${rowNumber}: '${rule.field}' failed validation criteria (got "${value}").`)
        }
      })

      if (rowErrors.length > 0) {
        errors.push(...rowErrors)
      } else {
        try {
          const transformedData = transformer(rowData)
          validData.push(transformedData)
        } catch (error) {
          errors.push(`Row ${rowNumber}: Failed to transform data - ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    })

    return {
      success: errors.length === 0,
      data: validData,
      errors,
      totalRows: dataRows.length,
      validRows: validData.length,
    }
  }
}

// Predefined validation rules for different entity types
export const customerValidationRules: CSVValidationRule[] = [
  { field: "phone_number", required: true, type: "phone", maxLength: 20 },
  { field: "full_name", required: true, type: "string", maxLength: 255 },
  { field: "email", required: false, type: "email", maxLength: 255 },
  {
    field: "gender",
    required: false,
    type: "string",
    customValidator: (value) => ["male", "female", "others", ""].includes(value.toLowerCase()),
  },
  { field: "sms_number", required: false, type: "phone", maxLength: 20 },
  { field: "code", required: false, type: "string", maxLength: 50 },
  { field: "instagram_handle", required: false, type: "string", maxLength: 100 },
  { field: "lead_source", required: false, type: "string", maxLength: 100 },
  { field: "date_of_birth", required: false, type: "date" },
  { field: "date_of_anniversary", required: false, type: "date" },
  { field: "notes", required: false, type: "string" },
]

export const serviceValidationRules: CSVValidationRule[] = [
  { field: "name", required: true, type: "string", maxLength: 255 },
  { field: "price", required: true, type: "number" },
  { field: "description", required: false, type: "string" },
  { field: "duration_minutes", required: false, type: "number" },
  { field: "category", required: false, type: "string", maxLength: 100 },
  { field: "code", required: false, type: "string", maxLength: 50 },
]

export const bookingValidationRules: CSVValidationRule[] = [
  { field: "booking_number", required: true, type: "string", maxLength: 50 },
  { field: "booking_date", required: true, type: "date" },
  { field: "booking_time", required: true, type: "string", pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
  { field: "customer_phone", required: false, type: "phone" },
  { field: "staff_name", required: false, type: "string" },
  {
    field: "status",
    required: false,
    type: "string",
    customValidator: (value) => ["pending", "confirmed", "completed", "cancelled", ""].includes(value.toLowerCase()),
  },
  { field: "total_amount", required: false, type: "number" },
  { field: "notes", required: false, type: "string" },
]

export const productValidationRules: CSVValidationRule[] = [
  { field: "name", required: true, type: "string", maxLength: 255 },
  { field: "price", required: true, type: "number" },
  { field: "cost", required: false, type: "number" },
  { field: "stock_quantity", required: false, type: "number" },
  { field: "category", required: false, type: "string", maxLength: 100 },
  { field: "sku", required: false, type: "string", maxLength: 100 },
  { field: "barcode", required: false, type: "string", maxLength: 100 },
  { field: "description", required: false, type: "string" },
  { field: "min_stock_level", required: false, type: "number" },
]

export const staffValidationRules: CSVValidationRule[] = [
  { field: "name", required: true, type: "string", maxLength: 255 },
  { field: "phone", required: false, type: "phone", maxLength: 20 },
  { field: "email", required: false, type: "email", maxLength: 255 },
  { field: "role", required: false, type: "string", maxLength: 100 },
  { field: "commission_rate", required: false, type: "number" },
]
