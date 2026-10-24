import { NextResponse } from "next/server"
import { getUniversityData, saveLessonProgress, submitQuiz, resetCourseProgress } from "@/app/actions/university"
import { getDefaultUniversityData } from "@/lib/university-data"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const res = await getUniversityData()
    if (res?.success && res.data) {
      return NextResponse.json({ success: true, data: res.data })
    }
    return NextResponse.json({ success: true, data: getDefaultUniversityData("Salon Team") })
  } catch (error: any) {
    console.warn("[API /api/university] Fallback:", error?.message || error)
    return NextResponse.json({ success: true, data: getDefaultUniversityData("Salon Team") })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === "saveLessonProgress") {
      const { courseId, lessonId, isCompleted } = body
      const res = await saveLessonProgress(courseId, lessonId, isCompleted)
      return NextResponse.json(res)
    }

    if (action === "submitQuiz") {
      const { courseId, score, studentName } = body
      const res = await submitQuiz(courseId, score, studentName)
      return NextResponse.json(res)
    }

    if (action === "resetCourseProgress") {
      const { courseId } = body
      const res = await resetCourseProgress(courseId)
      return NextResponse.json(res)
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("[API /api/university] POST Error:", error)
    return NextResponse.json({ success: false, error: error?.message || "Operation failed" }, { status: 500 })
  }
}
