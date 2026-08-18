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

export class CSVParser {
  static parseCSV(csvText: string): string[][] {
    const lines = csvText.split("\n").filter((line) => line.trim() !== "")
    const result: string[][] = []

    for (const line of lines) {
      const row: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          inQuotes = !inQuotes
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
        errors: ["CSV file is empty"],
        totalRows: 0,
        validRows: 0,
      }
    }

    const headers = csvData[0].map((h) => h.toLowerCase().trim())
    const dataRows = csvData.slice(1)
    const errors: string[] = []
    const validData: T[] = []

    // Validate headers
    const requiredFields = validationRules.filter((rule) => rule.required).map((rule) => rule.field.toLowerCase())
    const missingHeaders = requiredFields.filter((field) => !headers.includes(field))

    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers: ${missingHeaders.join(", ")}`)
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
      const rowNumber = index + 2 // +2 because we start from row 2 (after header)
      const rowData: Record<string, string> = {}
      const rowErrors: string[] = []

      // Map row data to headers
      headers.forEach((header, colIndex) => {
        rowData[header] = row[colIndex] || ""
      })

      // Validate each field
      validationRules.forEach((rule) => {
        const fieldName = rule.field.toLowerCase()
        const value = rowData[fieldName] || ""

        // Required field validation
        if (rule.required && !value.trim()) {
          rowErrors.push(`Row ${rowNumber}: ${rule.field} is required`)
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
              if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                rowErrors.push(`Row ${rowNumber}: ${rule.field} must be a valid email`)
              }
              break
            case "phone":
              if (value && !/^\+?[\d\s\-$$$$]{10,}$/.test(value)) {
                rowErrors.push(`Row ${rowNumber}: ${rule.field} must be a valid phone number`)
              }
              break
            case "number":
              if (value && isNaN(Number(value))) {
                rowErrors.push(`Row ${rowNumber}: ${rule.field} must be a number`)
              }
              break
            case "date":
              if (value && isNaN(Date.parse(value))) {
                rowErrors.push(`Row ${rowNumber}: ${rule.field} must be a valid date`)
              }
              break
          }
        }

        // Length validation
        if (rule.maxLength && value.length > rule.maxLength) {
          rowErrors.push(`Row ${rowNumber}: ${rule.field} must be less than ${rule.maxLength} characters`)
        }

        // Pattern validation
        if (rule.pattern && value && !rule.pattern.test(value)) {
          rowErrors.push(`Row ${rowNumber}: ${rule.field} format is invalid`)
        }

        // Custom validation
        if (rule.customValidator && value && !rule.customValidator(value)) {
          rowErrors.push(`Row ${rowNumber}: ${rule.field} failed custom validation`)
        }
      })

      if (rowErrors.length > 0) {
        errors.push(...rowErrors)
      } else {
        try {
          const transformedData = transformer(rowData)
          validData.push(transformedData)
        } catch (error) {
          errors.push(`Row ${rowNumber}: Failed to transform data - ${error}`)
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
