import { type NextRequest, NextResponse } from "next/server"
import { updateInventoryItem, deleteInventoryItem } from "@/app/actions/inventory"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 })
    }

    const body = await request.json()
    const name = (body.name || body.item_name || "").trim()
    const category = (body.category || "General").trim()
    const quantity = Number(body.quantity) || 0
    const sellingPrice = Number(body.selling_price || body.unit_price) || 0
    const costPrice = Number(body.cost_price || body.cost) || 0

    if (!name || !category) {
      return NextResponse.json(
        { success: false, message: "Product Name and Category are required" },
        { status: 400 }
      )
    }

    const result = await updateInventoryItem(id, {
      name,
      category,
      brand: body.brand,
      sku: body.sku,
      barcode: body.barcode,
      quantity,
      unit: body.unit || "pcs",
      volume_per_unit: Number(body.volume_per_unit) || 1,
      volume_unit: body.volume_unit || "ml",
      usage_type: body.usage_type || "both",
      cost_price: costPrice,
      selling_price: sellingPrice,
      supplier: body.supplier,
      reorder_level: Number(body.reorder_level || body.min_stock_level) || 5,
      expiry_date: body.expiry_date,
      batch_number: body.batch_number,
      location: body.location,
      description: body.description,
      image_url: body.image_url,
    })

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error: any) {
    console.error("Error updating inventory item:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to update inventory item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 })
    }

    const result = await deleteInventoryItem(id)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error: any) {
    console.error("Error deleting inventory item:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to delete inventory item" }, { status: 500 })
  }
}
