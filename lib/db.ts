import "server-only"
import { Pool } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set. Please add it to your Project Settings.")
}

let connectionString: string
try {
  connectionString = process.env.DATABASE_URL!
  // Basic URL validation
  if (!connectionString.startsWith("postgres://") && !connectionString.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection string")
  }
} catch (error) {
  console.error("Database configuration error:", error instanceof Error ? error.message : "Unknown error")
  throw new Error("Invalid DATABASE_URL configuration")
}

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Add connection retry logic
  maxUses: 7500,
  allowExitOnIdle: false,
})

pool.on("error", (err) => {
  const errorDetails = {
    message: err instanceof Error ? err.message : "Unknown pool error",
    code: (err as any)?.code || "UNKNOWN",
    timestamp: new Date().toISOString(),
  }
  console.error("Database pool error:", errorDetails)

  // Don't throw here as it can crash the application
  // Instead, log and let individual queries handle failures
})

pool.on("connect", () => {
  console.log("Database pool connection established")
})

pool.on("remove", () => {
  console.log("Database pool connection removed")
})

// Optional drizzle export if other parts of the app use it
export const db = drizzle(pool)

export async function sql(strings: TemplateStringsArray, ...values: any[]) {
  const startTime = Date.now()

  try {
    if (!strings || strings.length === 0) {
      throw new Error("Invalid SQL template: empty strings array")
    }

    // Validate and sanitize values
    const sanitizedValues = values.map((value, index) => {
      if (value === undefined) {
        console.warn(`SQL parameter ${index + 1} is undefined, converting to null`)
        return null
      }

      // Handle potential circular references in objects
      if (typeof value === "object" && value !== null) {
        try {
          JSON.stringify(value)
        } catch (circularError) {
          console.warn(`SQL parameter ${index + 1} has circular reference, converting to string`)
          return String(value)
        }
      }

      return value
    })

    const text = strings.reduce((acc, str, i) => acc + str + (i < sanitizedValues.length ? `$${i + 1}` : ""), "")

    if (!text.trim()) {
      throw new Error("Invalid SQL template: empty query")
    }

    // Add query timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Query timeout after 30 seconds")), 30000)
    })

    const queryPromise = pool.query(text, sanitizedValues)
    const result = (await Promise.race([queryPromise, timeoutPromise])) as any

    const duration = Date.now() - startTime

    // Log slow queries in development
    if (process.env.NODE_ENV === "development" && duration > 1000) {
      console.warn(`Slow query detected (${duration}ms):`, {
        query: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        duration,
      })
    }

    return result?.rows || []
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : "Unknown database error"

    const errorDetails = {
      error: errorMessage,
      query: strings.join("?").substring(0, 200),
      paramCount: values.length,
      duration,
      timestamp: new Date().toISOString(),
    }

    console.error("Database query error:", errorDetails)

    // Check for specific error types and provide better error messages
    if (errorMessage.includes("connection")) {
      throw new Error("Database connection failed. Please check your connection settings.")
    } else if (errorMessage.includes("timeout")) {
      throw new Error("Database query timed out. Please try again.")
    } else if (errorMessage.includes("syntax")) {
      throw new Error("Database query syntax error. Please check your query.")
    } else {
      throw new Error(`Database query failed: ${errorMessage}`)
    }
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  let attempts = 0
  const maxAttempts = 3

  while (attempts < maxAttempts) {
    try {
      const result = await pool.query("SELECT 1 as health_check")
      if (result.rows.length > 0) {
        console.log("Database health check passed")
        return true
      }
    } catch (error) {
      attempts++
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.warn(`Database health check failed (attempt ${attempts}/${maxAttempts}):`, errorMessage)

      if (attempts < maxAttempts) {
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts))
      }
    }
  }

  console.error("Database health check failed after all attempts")
  return false
}

export async function closeDatabaseConnection(): Promise<void> {
  try {
    // Remove all listeners to prevent memory leaks
    pool.removeAllListeners()

    // Close the pool
    await pool.end()
    console.log("Database connection pool closed successfully")
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.warn("Error closing database connection:", errorMessage)
  }
}

if (typeof process !== "undefined") {
  process.on("SIGINT", async () => {
    console.log("Received SIGINT, closing database connections...")
    await closeDatabaseConnection()
    process.exit(0)
  })

  process.on("SIGTERM", async () => {
    console.log("Received SIGTERM, closing database connections...")
    await closeDatabaseConnection()
    process.exit(0)
  })
}
