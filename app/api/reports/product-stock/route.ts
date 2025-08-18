import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Fetch product stock data with proper error handling
    const products = await sql`
      SELECT 
        p.id,
        p.name,
        COALESCE(c.name, 'Uncategorized') as category,
        COALESCE(p.stock_quantity, 0) as current_stock,
        COALESCE(p.min_stock_level, 0) as min_stock_level,
        COALESCE(p.max_stock_level, 100) as max_stock_level,
        COALESCE(p.price, 0) as unit_price,
        COALESCE(p.stock_quantity * p.price, 0) as total_value,
        COALESCE(p.barcode, CONCAT('SKU-', p.id)) as sku,
        COALESCE(v.name, 'Unknown') as supplier,
        p.updated_at as last_updated,
        CASE 
          WHEN COALESCE(p.stock_quantity, 0) = 0 THEN 'out_of_stock'
          WHEN COALESCE(p.stock_quantity, 0) <= COALESCE(p.min_stock_level, 0) THEN 'low_stock'
          ELSE 'in_stock'
        END as status
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.is_active = true
      ORDER BY 
        CASE 
          WHEN COALESCE(p.stock_quantity, 0) = 0 THEN 1
          WHEN COALESCE(p.stock_quantity, 0) <= COALESCE(p.min_stock_level, 0) THEN 2
          ELSE 3
        END,
        p.name ASC
    `

    // Calculate statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN COALESCE(p.stock_quantity, 0) > COALESCE(p.min_stock_level, 0) THEN 1 END) as in_stock,
        COUNT(CASE WHEN COALESCE(p.stock_quantity, 0) <= COALESCE(p.min_stock_level, 0) AND COALESCE(p.stock_quantity, 0) > 0 THEN 1 END) as low_stock,
        COUNT(CASE WHEN COALESCE(p.stock_quantity, 0) = 0 THEN 1 END) as out_of_stock,
        COALESCE(SUM(COALESCE(p.stock_quantity, 0) * COALESCE(p.price, 0)), 0) as total_value
      FROM products p
      WHERE p.is_active = true
    `

    const formattedProducts = products.map((product) => ({
      ...product,
      id: Number(product.id),
      current_stock: Number(product.current_stock) || 0,
      min_stock_level: Number(product.min_stock_level) || 0,
      max_stock_level: Number(product.max_stock_level) || 100,
      unit_price: Number(product.unit_price) || 0,
      total_value: Number(product.total_value) || 0,
    }))

    const formattedStats = {
      total_products: Number(stats[0]?.total_products) || 0,
      in_stock: Number(stats[0]?.in_stock) || 0,
      low_stock: Number(stats[0]?.low_stock) || 0,
      out_of_stock: Number(stats[0]?.out_of_stock) || 0,
      total_value: Number(stats[0]?.total_value) || 0,
      last_updated: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      stats: formattedStats,
      message: "Product stock data retrieved successfully",
    })
  } catch (error) {
    console.error("Error fetching product stock data:", error)

    // Return fallback data in case of database error
    const fallbackProducts = [
      {
        id: 1,
        name: "Hair Shampoo 250ml",
        category: "Hair Care",
        current_stock: 15,
        min_stock_level: 10,
        max_stock_level: 100,
        unit_price: 299,
        total_value: 4485,
        sku: "SKU-SHAMP-250",
        supplier: "Beauty Supplies Co.",
        last_updated: new Date().toISOString(),
        status: "in_stock",
      },
      {
        id: 2,
        name: "Face Moisturizer 50ml",
        category: "Skincare",
        current_stock: 3,
        min_stock_level: 5,
        max_stock_level: 50,
        unit_price: 599,
        total_value: 1797,
        sku: "SKU-MOIST-50",
        supplier: "Skincare Plus",
        last_updated: new Date().toISOString(),
        status: "low_stock",
      },
      {
        id: 3,
        name: "Nail Polish Remover",
        category: "Nail Care",
        current_stock: 0,
        min_stock_level: 5,
        max_stock_level: 25,
        unit_price: 149,
        total_value: 0,
        sku: "SKU-NAIL-REM",
        supplier: "Nail Essentials",
        last_updated: new Date().toISOString(),
        status: "out_of_stock",
      },
    ]

    const fallbackStats = {
      total_products: 3,
      in_stock: 1,
      low_stock: 1,
      out_of_stock: 1,
      total_value: 6282,
      last_updated: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      products: fallbackProducts,
      stats: fallbackStats,
      message: "Using fallback data due to database connection issue",
      warning: "Database connection failed, showing sample data",
    })
  }
}

export async function POST(request: Request) {
  try {
    const { productId, adjustment, reason } = await request.json()

    if (!productId || adjustment === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID and adjustment amount are required",
        },
        { status: 400 },
      )
    }

    // Update product stock
    const result = await sql`
      UPDATE products 
      SET 
        stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) + ${adjustment}),
        updated_at = NOW()
      WHERE id = ${productId} AND is_active = true
      RETURNING id, name, stock_quantity
    `

    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found or inactive",
        },
        { status: 404 },
      )
    }

    // Log the adjustment
    await sql`
      INSERT INTO inventory_adjustments (
        product_id, adjustment_type, quantity, reason, created_at
      ) VALUES (
        ${productId},
        ${adjustment > 0 ? "increase" : "decrease"},
        ${Math.abs(adjustment)},
        ${reason || "Manual adjustment"},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Stock adjusted successfully",
      data: {
        productId: Number(result[0].id),
        productName: result[0].name,
        newStock: Number(result[0].stock_quantity),
        adjustment,
      },
    })
  } catch (error) {
    console.error("Error adjusting stock:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to adjust stock",
      },
      { status: 500 },
    )
  }
}
