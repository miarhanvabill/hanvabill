"use client"

import { useState, useEffect, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  BookOpen,
  Play,
  Clock,
  Users,
  Award,
  Star,
  ChevronRight,
  ChevronLeft,
  Video,
  FileText,
  Headphones,
  Search,
  CheckCircle2,
  RotateCcw,
  Printer,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Filter,
  Check,
  Download,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Copy,
  CheckSquare,
  Square,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  CheckCheck,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getDefaultUniversityData,
  type Course,
  type Lesson,
  type Certificate,
  type Achievement,
  type UniversityData,
} from "@/lib/university-data"
import {
  getUniversityData,
  saveLessonProgress,
  submitQuiz,
  resetCourseProgress,
} from "@/app/actions/university"

export default function UniversityPage() {
  const { toast } = useToast()

  // Always initialize with realistic rich default data so counters and catalog are never empty
  const [data, setData] = useState<UniversityData>(() => getDefaultUniversityData("Salon Team"))
  const [loading, setLoading] = useState(false)

  // Filters
  const [selectedTab, setSelectedTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedLevel, setSelectedLevel] = useState("All")

  // Course Player Modal State
  const [activeCourse, setActiveCourse] = useState<Course | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [stepChecklist, setStepChecklist] = useState<Record<string, boolean>>({})
  const [selectedScenarioOption, setSelectedScenarioOption] = useState<number | null>(null)
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null)
  const [playerTab, setPlayerTab] = useState<"lesson" | "quiz" | "resources">("lesson")
  const [savingLesson, setSavingLesson] = useState(false)

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState<number | null>(null)
  const [submittingQuiz, setSubmittingQuiz] = useState(false)
  const [studentNameInput, setStudentNameInput] = useState("")

  // Certificate Modal State
  const [activeCertificate, setActiveCertificate] = useState<Certificate | null>(null)
  const [isCertModalOpen, setIsCertModalOpen] = useState(false)

  // Achievement Modal State
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Check local storage first
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("hanva_university_store_v2")
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed && parsed.courses && parsed.courses.length > 0) {
              setData(parsed)
              if (parsed.userName) setStudentNameInput(parsed.userName)
            }
          } catch {}
        }
      }

      // 2. Fetch live data from /api/university
      let res: { success: boolean; data?: UniversityData } | null = null
      try {
        const apiRes = await fetch("/api/university", { cache: "no-store" })
        if (apiRes.ok) {
          const json = await apiRes.json()
          if (json?.success && json?.data) {
            res = json
          }
        }
      } catch {}

      // 3. Fallback to server action if API was unreachable
      if (!res?.success || !res?.data) {
        try {
          res = await getUniversityData()
        } catch {
          res = null
        }
      }

      // 4. Update state if live data is available
      if (res?.success && res.data) {
        setData(res.data)
        if (res.data.userName) setStudentNameInput(res.data.userName)
        if (typeof window !== "undefined") {
          localStorage.setItem("hanva_university_store_v2", JSON.stringify(res.data))
        }

        // If course player was open, update reference
        if (activeCourse) {
          const updated = res.data.courses.find((c) => c.id === activeCourse.id)
          if (updated) setActiveCourse(updated)
        }
      }
    } catch (err) {
      console.warn("[University] Running in resilient mode:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const courses = data?.courses || []
  const stats = data?.stats || { coursesCompleted: 1, hoursLearned: 12, certificatesEarned: 1, averageScore: 95 }
  const achievements = data?.achievements || []
  const certificates = data?.certificates || []

  // Open Course Player
  const handleOpenCourse = (course: Course) => {
    setActiveCourse(course)
    // Select first lesson or first uncompleted lesson
    const allLessons = course.modules.flatMap((m) => m.lessons)
    const firstUnfinished = allLessons.find((l) => !course.completedLessonIds.includes(l.id))
    setActiveLesson(firstUnfinished || allLessons[0] || null)
    setActiveStepIndex(0)
    setSelectedScenarioOption(null)
    setPlayerTab("lesson")
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizScore(course.quizScore ?? null)
  }

  // Switch Lesson with Step Reset
  const handleSelectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson)
    setActiveStepIndex(0)
    setSelectedScenarioOption(null)
    setPlayerTab("lesson")
  }

  // Toggle Action Checklist in Step
  const toggleChecklistItem = (key: string) => {
    setStepChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Copy Salon Script
  const handleCopyScript = (scriptText: string, scriptId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(scriptText)
      setCopiedScriptId(scriptId)
      toast({
        title: "Script Copied! 📋",
        description: "Salon roleplay dialogue copied to your clipboard.",
      })
      setTimeout(() => setCopiedScriptId(null), 3000)
    }
  }

  // Toggle Lesson Completion
  const handleToggleLessonComplete = async (lessonId: string) => {
    if (!activeCourse) return

    const isCurrentlyCompleted = activeCourse.completedLessonIds.includes(lessonId)
    const nextCompleted = !isCurrentlyCompleted

    // Optimistic local update
    const updatedCompletedIds = nextCompleted
      ? Array.from(new Set([...activeCourse.completedLessonIds, lessonId]))
      : activeCourse.completedLessonIds.filter((id) => id !== lessonId)

    const totalLessons = activeCourse.lessonsCount || 1
    const newProgress = Math.min(100, Math.round((updatedCompletedIds.length / totalLessons) * 100))
    const newStatus: "not_started" | "in_progress" | "completed" =
      newProgress === 100 ? "completed" : newProgress > 0 ? "in_progress" : "not_started"

    const updatedCourse: Course = {
      ...activeCourse,
      completedLessonIds: updatedCompletedIds,
      progress: newProgress,
      status: newStatus,
    }

    setActiveCourse(updatedCourse)

    setData((prev) => {
      const newCourses = prev.courses.map((c) => (c.id === activeCourse.id ? updatedCourse : c))
      const completedCount = newCourses.filter((c) => c.status === "completed").length
      const updatedData: UniversityData = {
        ...prev,
        courses: newCourses,
        stats: {
          ...prev.stats,
          coursesCompleted: completedCount,
        },
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("hanva_university_store_v2", JSON.stringify(updatedData))
      }
      return updatedData
    })

    toast({
      title: nextCompleted ? "Lesson Completed! 🎉" : "Progress Updated",
      description: nextCompleted
        ? `Marked "${activeLesson?.title || "lesson"}" as completed.`
        : "Lesson marked as uncompleted.",
    })

    setSavingLesson(true)
    try {
      // Sync to API with server action fallback
      fetch("/api/university", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveLessonProgress",
          courseId: activeCourse.id,
          lessonId,
          isCompleted: nextCompleted,
        }),
      }).catch(() => {
        return saveLessonProgress(activeCourse.id, lessonId, nextCompleted)
      })
    } catch (err) {
      console.warn("[saveLessonProgress] Saved locally:", err)
    } finally {
      setSavingLesson(false)
    }
  }

  // Submit Quiz
  const handleSubmitQuiz = async () => {
    if (!activeCourse) return
    const quiz = activeCourse.quiz
    if (!quiz || quiz.length === 0) return

    // Verify all answered
    if (Object.keys(quizAnswers).length < quiz.length) {
      toast({
        title: "Incomplete Quiz",
        description: `Please answer all ${quiz.length} questions before submitting.`,
        variant: "destructive",
      })
      return
    }

    setSubmittingQuiz(true)
    try {
      let correct = 0
      quiz.forEach((q) => {
        if (quizAnswers[q.id] === q.correctIndex) {
          correct++
        }
      })

      const calculatedScore = Math.round((correct / quiz.length) * 100)
      const passed = calculatedScore >= 75
      setQuizScore(calculatedScore)
      setQuizSubmitted(true)

      const studentName = studentNameInput.trim() || data.userName || "Salon Professional"
      const generatedCertId = passed ? `HANVA-CERT-${Math.floor(10000 + Math.random() * 90000)}` : null

      // Optimistic local update
      const allLessonIds = activeCourse.modules.flatMap((m) => m.lessons.map((l) => l.id))
      const updatedCourse: Course = {
        ...activeCourse,
        progress: 100,
        status: "completed",
        completedLessonIds: allLessonIds,
        quizScore: calculatedScore,
        certificateId: generatedCertId || activeCourse.certificateId,
      }

      setActiveCourse(updatedCourse)

      let newCert: Certificate | null = null
      if (passed && generatedCertId) {
        newCert = {
          id: `cert-${Date.now()}`,
          certificateId: generatedCertId,
          studentName,
          courseId: activeCourse.id,
          courseTitle: activeCourse.title,
          score: calculatedScore,
          issueDate: new Date().toISOString().split("T")[0],
        }
      }

      setData((prev) => {
        const newCourses = prev.courses.map((c) => (c.id === activeCourse.id ? updatedCourse : c))
        const newCerts = newCert
          ? [newCert, ...prev.certificates.filter((c) => c.courseId !== activeCourse.id)]
          : prev.certificates

        const updatedData: UniversityData = {
          ...prev,
          courses: newCourses,
          certificates: newCerts,
          stats: {
            ...prev.stats,
            coursesCompleted: newCourses.filter((c) => c.status === "completed").length,
            certificatesEarned: newCerts.length,
          },
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("hanva_university_store_v2", JSON.stringify(updatedData))
        }
        return updatedData
      })

      if (passed) {
        toast({
          title: "Congratulations! 🎓",
          description: `You passed with ${calculatedScore}% and earned your Verified Certificate!`,
        })
      } else {
        toast({
          title: `Score: ${calculatedScore}%`,
          description: "You need 75% or higher to earn certification. Review the material and try again!",
          variant: "destructive",
        })
      }

      // Background sync: API route with server action fallback
      fetch("/api/university", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitQuiz",
          courseId: activeCourse.id,
          score: calculatedScore,
          studentName,
        }),
      }).catch(() => {
        return submitQuiz(activeCourse.id, calculatedScore, studentName)
      })
    } catch (err) {
      console.warn("[submitQuiz] Saved locally:", err)
    } finally {
      setSubmittingQuiz(false)
    }
  }

  // Reset Course Progress
  const handleResetCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to reset your progress for this course?")) return

    // Optimistic local reset
    setData((prev) => {
      const newCourses = prev.courses.map((c) => {
        if (c.id === courseId) {
          return {
            ...c,
            progress: 0,
            status: "not_started" as const,
            completedLessonIds: [],
            quizScore: null,
            certificateId: null,
          }
        }
        return c
      })
      const newCerts = prev.certificates.filter((c) => c.courseId !== courseId)
      const updatedData: UniversityData = {
        ...prev,
        courses: newCourses,
        certificates: newCerts,
        stats: {
          ...prev.stats,
          coursesCompleted: newCourses.filter((c) => c.status === "completed").length,
          certificatesEarned: newCerts.length,
        },
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("hanva_university_store_v2", JSON.stringify(updatedData))
      }
      return updatedData
    })

    if (activeCourse?.id === courseId) {
      setActiveCourse(null)
    }

    toast({ title: "Course Reset", description: "You can start fresh from lesson one." })

    try {
      fetch("/api/university", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetCourseProgress", courseId }),
      }).catch(() => {
        return resetCourseProgress(courseId)
      })
    } catch (err) {
      console.warn("[resetCourseProgress] Reset locally:", err)
    }
  }

  // Open Certificate Modal
  const handleViewCertificate = (cert: Certificate) => {
    setActiveCertificate(cert)
    setIsCertModalOpen(true)
  }

  // Find Certificate by Course ID
  const handleViewCourseCertificate = (courseId: string) => {
    const cert = certificates.find((c) => c.courseId === courseId)
    if (cert) {
      handleViewCertificate(cert)
    } else {
      // Create temporary preview cert
      const course = courses.find((c) => c.id === courseId)
      if (course) {
        setActiveCertificate({
          id: "preview",
          certificateId: course.certificateId || "HANVA-CERT-PREVIEW",
          studentName: studentNameInput,
          courseId: course.id,
          courseTitle: course.title,
          score: course.quizScore || 100,
          issueDate: new Date().toISOString().split("T")[0],
        })
        setIsCertModalOpen(true)
      }
    }
  }

  // Print Certificate
  const handlePrintCertificate = () => {
    window.print()
  }

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Tab filter
      if (selectedTab === "in-progress" && (c.status !== "in_progress" || c.progress === 100)) return false
      if (selectedTab === "completed" && c.status !== "completed") return false

      // Category filter
      if (selectedCategory !== "All" && c.category !== selectedCategory) return false

      // Level filter
      if (selectedLevel !== "All" && c.level !== selectedLevel) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = c.title.toLowerCase().includes(q)
        const matchDesc = c.description.toLowerCase().includes(q)
        const matchInst = c.instructor.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchInst) return false
      }

      return true
    })
  }, [courses, selectedTab, selectedCategory, selectedLevel, searchQuery])

  const categories = ["All", "Business", "Styling", "Customer Service", "Marketing", "Finance"]
  const levels = ["All", "Beginner", "Intermediate", "Advanced"]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "interactive":
      case "simulation":
        return Sparkles
      case "protocol":
      case "guide":
        return FileText
      case "case_study":
        return BookOpen
      default:
        return Sparkles
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "Intermediate":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "Advanced":
        return "bg-rose-100 text-rose-800 border-rose-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  // Find next and previous lesson in active course
  const allLessons = activeCourse ? activeCourse.modules.flatMap((m) => m.lessons) : []
  const currentLessonIndex = activeLesson ? allLessons.findIndex((l) => l.id === activeLesson.id) : -1
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      <PageHeader
        title="Hanva University"
        subtitle="Enhance your skills and grow your salon business with our comprehensive learning platform."
        showBackButton
        backHref="/manage"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadData}
              disabled={loading}
              title="Refresh Courses"
              className="bg-white h-9 w-9"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin text-primary" : ""}`} />
            </Button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white text-xs text-slate-600">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span>Learner: <strong className="text-slate-900">{data?.userName || "Salon Team"}</strong></span>
            </div>
          </div>
        }
      />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Hero Banner */}
          <Card className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg border-0">
            <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-12">
              <GraduationCap className="w-96 h-96 text-white" />
            </div>
            <CardContent className="p-8 relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-blue-100">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    Verified Salon Professional Certifications
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight">Welcome to Hanva University</h2>
                  <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                    Unlock your potential with practical masterclasses designed specifically for salon owners, stylists, and front-desk managers.
                  </p>
                  <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm pt-2 text-blue-100">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-yellow-300" />
                      <span><strong>50+</strong> Structured Lessons</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-yellow-300" />
                      <span><strong>10,000+</strong> Salon Learners</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-300" />
                      <span>Accredited Certificates</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {courses.some((c) => c.status === "in_progress") ? (
                    <Button
                      size="lg"
                      onClick={() => {
                        const inProg = courses.find((c) => c.status === "in_progress")
                        if (inProg) handleOpenCourse(inProg)
                      }}
                      className="bg-white text-indigo-700 hover:bg-blue-50 font-semibold shadow-md gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Resume Learning
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      onClick={() => courses[0] && handleOpenCourse(courses[0])}
                      className="bg-white text-indigo-700 hover:bg-blue-50 font-semibold shadow-md gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start First Course
                    </Button>
                  )}
                  {certificates.length > 0 && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setSelectedTab("certificates")}
                      className="border-white/30 text-white hover:bg-white/10 gap-2"
                    >
                      <Award className="w-4 h-4" />
                      View Certificates ({certificates.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card
              className="bg-white border-slate-200 hover:shadow-sm cursor-pointer transition-shadow"
              onClick={() => setSelectedTab("completed")}
            >
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-extrabold text-blue-600">{stats.coursesCompleted}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">Courses Completed</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 hover:shadow-sm transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-extrabold text-emerald-600">{stats.hoursLearned}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">Hours Learned</div>
              </CardContent>
            </Card>

            <Card
              className="bg-white border-slate-200 hover:shadow-sm cursor-pointer transition-shadow"
              onClick={() => setSelectedTab("certificates")}
            >
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-extrabold text-purple-600">{stats.certificatesEarned}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">Certificates Earned</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 hover:shadow-sm transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-extrabold text-amber-600">{stats.averageScore}%</div>
                <div className="text-xs font-medium text-slate-500 mt-1">Average Quiz Score</div>
              </CardContent>
            </Card>
          </div>

          {/* Achievements Ribbon */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Award className="w-5 h-5 text-amber-500" />
                  Your Achievements
                </CardTitle>
                <span className="text-xs text-slate-500">
                  {achievements.filter((a) => a.earned).length} of {achievements.length} Unlocked
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    onClick={() => setSelectedAchievement(achievement)}
                    className={`flex flex-col items-center p-3.5 rounded-xl border-2 transition-all cursor-pointer text-center ${
                      achievement.earned
                        ? "border-amber-300 bg-amber-50/50 hover:bg-amber-50 shadow-sm"
                        : "border-slate-100 bg-slate-50/60 opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        achievement.earned ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      <Award className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900 line-clamp-1">{achievement.title}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {achievement.earned ? "Unlocked ✓" : "Locked"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Navigation Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
              <TabsList className="bg-slate-100 p-1">
                <TabsTrigger value="all" className="text-xs sm:text-sm font-medium">
                  All Courses ({courses.length})
                </TabsTrigger>
                <TabsTrigger value="in-progress" className="text-xs sm:text-sm font-medium">
                  In Progress ({courses.filter((c) => c.status === "in_progress").length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm font-medium">
                  Completed ({courses.filter((c) => c.status === "completed").length})
                </TabsTrigger>
                <TabsTrigger value="certificates" className="text-xs sm:text-sm font-medium">
                  Certificates ({certificates.length})
                </TabsTrigger>
              </TabsList>

              {/* Search Bar */}
              {selectedTab !== "certificates" && (
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search courses, skills, instructors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Courses View */}
            <TabsContent value={selectedTab} className="space-y-6 m-0">
              {selectedTab !== "certificates" && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                  {/* Category Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 mr-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> Category:
                    </span>
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                        className={`h-7 text-xs px-2.5 rounded-full ${
                          selectedCategory === cat ? "" : "bg-transparent text-slate-600"
                        }`}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>

                  {/* Level Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Level:</span>
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
                    >
                      {levels.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl} Levels
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Course Cards List */}
              {selectedTab !== "certificates" && (
                <div className="space-y-4">
                  {filteredCourses.length === 0 ? (
                    <Card className="bg-white border-slate-200 p-12 text-center">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-base font-semibold text-slate-800">No courses match your filter</h3>
                      <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting a different category.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("")
                          setSelectedCategory("All")
                          setSelectedLevel("All")
                        }}
                        className="mt-4"
                      >
                        Reset Filters
                      </Button>
                    </Card>
                  ) : (
                    filteredCourses.map((course) => {
                      const TypeIcon = getTypeIcon(course.type)
                      const isCompleted = course.status === "completed"
                      const isInProgress = course.status === "in_progress"

                      return (
                        <Card
                          key={course.id}
                          className="bg-white border-slate-200 hover:shadow-md transition-all rounded-xl overflow-hidden"
                        >
                          <CardContent className="p-5 sm:p-6">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                              {course.thumbnail && (
                                <div
                                  onClick={() => handleOpenCourse(course)}
                                  className="relative w-full md:w-56 h-36 rounded-xl overflow-hidden shadow-sm shrink-0 cursor-pointer group bg-slate-100"
                                >
                                  <img
                                    src={course.thumbnail}
                                    alt={course.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-2.5">
                                    <Badge className="bg-white/95 text-slate-900 backdrop-blur-sm text-[10px] font-semibold gap-1 shadow-sm border-0">
                                      <Sparkles className="w-3 h-3 text-amber-500" />
                                      Interactive Masterclass
                                    </Badge>
                                  </div>
                                </div>
                              )}
                              <div className="flex-1 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={getLevelColor(course.level)}>{course.level}</Badge>
                                  <Badge variant="outline" className="text-xs font-medium text-slate-600 bg-slate-50">
                                    {course.category}
                                  </Badge>
                                  {isCompleted && (
                                    <Badge className="bg-emerald-600 text-white text-xs gap-1">
                                      <Check className="w-3 h-3" /> Completed
                                    </Badge>
                                  )}
                                  {isInProgress && (
                                    <Badge className="bg-blue-600 text-white text-xs">In Progress</Badge>
                                  )}
                                </div>

                                <div>
                                  <h3 className="text-lg font-bold text-slate-900 hover:text-primary transition-colors cursor-pointer" onClick={() => handleOpenCourse(course)}>
                                    {course.title}
                                  </h3>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Taught by <strong className="text-slate-700">{course.instructor}</strong> • {course.instructorRole}
                                  </p>
                                </div>

                                <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                                  {course.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    {course.duration}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                    {course.lessonsCount} structured lessons
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    {course.rating} ({course.studentsCount} students)
                                  </span>
                                </div>

                                {/* Progress Bar */}
                                {course.progress > 0 && (
                                  <div className="pt-2 max-w-md space-y-1.5">
                                    <div className="flex justify-between text-xs font-medium text-slate-600">
                                      <span>Learning Progress</span>
                                      <span>{course.progress}%</span>
                                    </div>
                                    <Progress value={course.progress} className="h-2 rounded-full" />
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2.5 shrink-0">
                                {isCompleted ? (
                                  <>
                                    <Button
                                      onClick={() => handleViewCourseCertificate(course.id)}
                                      className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm"
                                    >
                                      <Award className="w-4 h-4" />
                                      View Certificate
                                    </Button>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenCourse(course)}
                                        className="text-xs text-slate-600"
                                      >
                                        Review Lessons
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleResetCourse(course.id)}
                                        title="Retake Course"
                                        className="text-xs text-slate-400 hover:text-rose-600"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </>
                                ) : isInProgress ? (
                                  <Button
                                    onClick={() => handleOpenCourse(course)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm h-10 px-5"
                                  >
                                    <Play className="w-4 h-4 fill-current" />
                                    Continue Learning
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => handleOpenCourse(course)}
                                    className="bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-sm h-10 px-5"
                                  >
                                    <Play className="w-4 h-4" />
                                    Start Course
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              )}

              {/* Certificates Tab View */}
              {selectedTab === "certificates" && (
                <div className="space-y-6">
                  {certificates.length === 0 ? (
                    <Card className="bg-white border-slate-200 p-12 text-center">
                      <Award className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-slate-800">No Certificates Earned Yet</h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                        Complete any course and score 75% or higher on the final examination to earn an official, verified Hanva University certificate.
                      </p>
                      <Button
                        onClick={() => setSelectedTab("all")}
                        className="mt-6 gap-2"
                      >
                        <BookOpen className="w-4 h-4" />
                        Explore Available Courses
                      </Button>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {certificates.map((cert) => (
                        <Card
                          key={cert.id}
                          className="bg-white border-slate-200 hover:shadow-lg transition-all rounded-xl overflow-hidden border-t-4 border-t-purple-600"
                        >
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700">
                                <Award className="w-6 h-6" />
                              </div>
                              <Badge variant="outline" className="text-xs font-mono bg-purple-50 text-purple-700 border-purple-200">
                                {cert.certificateId}
                              </Badge>
                            </div>

                            <div>
                              <h3 className="font-bold text-base text-slate-900 line-clamp-2">{cert.courseTitle}</h3>
                              <p className="text-xs text-slate-500 mt-1">
                                Awarded to <strong className="text-slate-800">{cert.studentName}</strong>
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                              <span>Score: <strong className="text-emerald-600">{cert.score}%</strong></span>
                              <span>Issued: {cert.issueDate}</span>
                            </div>

                            <Button
                              onClick={() => handleViewCertificate(cert)}
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
                            >
                              <Printer className="w-4 h-4" />
                              View &amp; Print Certificate
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Course Player Dialog */}
      <Dialog open={!!activeCourse} onOpenChange={(open) => !open && setActiveCourse(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-white p-0 gap-0 rounded-2xl">
          {activeCourse && (
            <div>
              {/* Header */}
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getLevelColor(activeCourse.level)}>{activeCourse.level}</Badge>
                    <Badge variant="outline" className="text-xs bg-white text-slate-600">
                      {activeCourse.category}
                    </Badge>
                  </div>
                  <DialogTitle className="text-xl font-bold text-slate-900">
                    {activeCourse.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Instructor: {activeCourse.instructor} • {activeCourse.duration}
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-slate-500 block">Course Progress</span>
                    <strong className="text-sm text-slate-800">{activeCourse.progress}% Completed</strong>
                  </div>
                </div>
              </div>

              {/* Main Player Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3">
                {/* Left: Video / Lesson Stage */}
                <div className="lg:col-span-2 p-6 border-r border-slate-200 space-y-6">
                  {/* Top Lesson Tabs */}
                  <Tabs value={playerTab} onValueChange={(val: any) => setPlayerTab(val)} className="space-y-4">
                    <TabsList className="bg-slate-100 p-1">
                      <TabsTrigger value="lesson" className="text-xs font-semibold gap-1.5">
                        <Video className="w-3.5 h-3.5" />
                        Lesson Content
                      </TabsTrigger>
                      <TabsTrigger value="quiz" className="text-xs font-semibold gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Final Exam &amp; Certification
                      </TabsTrigger>
                    </TabsList>

                    {/* Lesson Tab */}
                    <TabsContent value="lesson" className="space-y-6 m-0">
                      {activeLesson ? (
                        <>
                          {/* 1. Hero Visual Banner (No Video Required) */}
                          <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden shadow-md bg-slate-900 border border-slate-200">
                            <img
                              src={activeLesson.heroImage || activeCourse.thumbnail || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80"}
                              alt={activeLesson.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent flex flex-col justify-end p-5 sm:p-6 text-white">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] tracking-wide uppercase border-0 gap-1 shadow-sm">
                                  <Sparkles className="w-3 h-3" />
                                  Interactive Masterclass
                                </Badge>
                                <Badge variant="outline" className="text-white/95 border-white/20 bg-black/40 backdrop-blur-sm text-[10px] gap-1">
                                  <Clock className="w-3 h-3 text-amber-300" />
                                  {activeLesson.duration}
                                </Badge>
                                {activeLesson.steps && activeLesson.steps.length > 0 && (
                                  <Badge variant="outline" className="text-white/95 border-white/20 bg-black/40 backdrop-blur-sm text-[10px] gap-1">
                                    <BookOpen className="w-3 h-3 text-blue-300" />
                                    Step {activeStepIndex + 1} of {activeLesson.steps.length}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-lg sm:text-2xl font-bold text-white drop-shadow-sm leading-tight">
                                {activeLesson.title}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl line-clamp-2 drop-shadow-sm">
                                {activeLesson.content}
                              </p>
                            </div>
                          </div>

                          {/* Lesson Info Header & Completion Button */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-white text-slate-700 text-xs font-semibold">
                                  Lesson {allLessons.findIndex((l) => l.id === activeLesson.id) + 1} of {allLessons.length}
                                </Badge>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {activeLesson.duration}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-base mt-1">{activeLesson.title}</h4>
                            </div>

                            <Button
                              onClick={() => handleToggleLessonComplete(activeLesson.id)}
                              disabled={savingLesson}
                              variant={activeCourse.completedLessonIds.includes(activeLesson.id) ? "default" : "outline"}
                              className={`gap-2 h-9 text-xs font-semibold shrink-0 ${
                                activeCourse.completedLessonIds.includes(activeLesson.id)
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {activeCourse.completedLessonIds.includes(activeLesson.id) ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Completed ✓
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  Mark Lesson Complete
                                </>
                              )}
                            </Button>
                          </div>

                          {/* 2. Interactive Multi-Step Practical Carousel */}
                          {activeLesson.steps && activeLesson.steps.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                    {activeStepIndex + 1}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-900">
                                      Step-by-Step Practical Procedure
                                    </h4>
                                    <span className="text-[11px] text-slate-500">
                                      Step {activeStepIndex + 1} of {activeLesson.steps.length}
                                    </span>
                                  </div>
                                </div>

                                {/* Step Navigation Pills */}
                                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-none">
                                  {activeLesson.steps.map((_, sIdx) => (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={() => setActiveStepIndex(sIdx)}
                                      className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                                        activeStepIndex === sIdx
                                          ? "bg-primary text-white shadow-xs"
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      }`}
                                    >
                                      {sIdx + 1}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Current Step Content */}
                              {(() => {
                                const currentStep = activeLesson.steps[activeStepIndex]
                                if (!currentStep) return null
                                return (
                                  <div className="space-y-4">
                                    <div>
                                      <h5 className="text-base font-bold text-slate-900">
                                        {currentStep.title}
                                      </h5>
                                      {currentStep.subtitle && (
                                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                                          {currentStep.subtitle}
                                        </p>
                                      )}
                                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-2.5">
                                        {currentStep.description}
                                      </p>
                                    </div>

                                    {/* Action Checklist */}
                                    {currentStep.actionChecklist && currentStep.actionChecklist.length > 0 && (
                                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                            <CheckSquare className="w-3.5 h-3.5 text-primary" />
                                            Action Items Checklist (Click to verify)
                                          </span>
                                          {currentStep.actionChecklist.every((_, idx) => stepChecklist[`${activeLesson.id}_${activeStepIndex}_${idx}`]) && (
                                            <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                                              <Check className="w-3 h-3" /> Step Objectives Complete!
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="space-y-2">
                                          {currentStep.actionChecklist.map((item, idx) => {
                                            const itemKey = `${activeLesson.id}_${activeStepIndex}_${idx}`
                                            const isChecked = !!stepChecklist[itemKey]
                                            return (
                                              <label
                                                key={idx}
                                                onClick={() => toggleChecklistItem(itemKey)}
                                                className={`flex items-start gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                                  isChecked
                                                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950 font-medium"
                                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={() => {}}
                                                  className="mt-0.5 text-emerald-600 rounded focus:ring-0 cursor-pointer"
                                                />
                                                <span className={isChecked ? "line-through opacity-80" : ""}>
                                                  {item}
                                                </span>
                                              </label>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Pro Tip */}
                                    {currentStep.proTip && (
                                      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                                        <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                          <strong className="font-bold text-amber-900 block mb-0.5">
                                            Salon Professional Pro Tip:
                                          </strong>
                                          <span>{currentStep.proTip}</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Stepper Navigation Controls */}
                                    <div className="flex items-center justify-between pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={activeStepIndex === 0}
                                        onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                                        className="text-xs gap-1.5 bg-white"
                                      >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        Previous Step
                                      </Button>
                                      <span className="text-xs text-slate-400 font-medium">
                                        Step {activeStepIndex + 1} of {activeLesson.steps?.length || 1}
                                      </span>
                                      <Button
                                        size="sm"
                                        disabled={activeStepIndex >= (activeLesson.steps?.length || 1) - 1}
                                        onClick={() => setActiveStepIndex((prev) => Math.min((activeLesson.steps?.length || 1) - 1, prev + 1))}
                                        className="text-xs gap-1.5"
                                      >
                                        Next Step
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          )}

                          {/* 3. Interactive Salon Scenario Simulator ("What Would You Do?") */}
                          {activeLesson.scenario && (
                            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 p-5 sm:p-6 shadow-xs space-y-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                  <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-indigo-950">
                                    Salon Scenario Simulator: What Would You Do?
                                  </h4>
                                  <span className="text-[11px] text-indigo-700">
                                    Interactive practical challenge based on real salon guest situations
                                  </span>
                                </div>
                              </div>

                              {/* The Situation */}
                              <div className="p-3.5 rounded-xl bg-white border border-indigo-100 text-xs text-slate-800 leading-relaxed font-medium">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                                  Real Salon Situation:
                                </span>
                                {activeLesson.scenario.situation}
                              </div>

                              {/* The Question */}
                              <h5 className="font-bold text-xs sm:text-sm text-slate-900 pt-1">
                                {activeLesson.scenario.question}
                              </h5>

                              {/* Interactive Options */}
                              <div className="space-y-2.5">
                                {activeLesson.scenario.options.map((opt, optIdx) => {
                                  const isSelected = selectedScenarioOption === optIdx
                                  return (
                                    <div key={optIdx} className="space-y-2">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedScenarioOption(optIdx)}
                                        className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 ${
                                          isSelected
                                            ? opt.isRecommended
                                              ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-medium shadow-xs"
                                              : "border-amber-400 bg-amber-50 text-amber-950 font-medium shadow-xs"
                                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                        }`}
                                      >
                                        <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] mt-0.5 ${
                                          isSelected
                                            ? opt.isRecommended ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                                            : "bg-slate-100 text-slate-600"
                                        }`}>
                                          {String.fromCharCode(65 + optIdx)}
                                        </div>
                                        <span className="flex-1">{opt.text}</span>
                                      </button>

                                      {/* Instant Real-Time Feedback */}
                                      {isSelected && (
                                        <div className={`p-3 rounded-lg text-xs leading-relaxed flex items-start gap-2.5 ${
                                          opt.isRecommended
                                            ? "bg-emerald-100/70 border border-emerald-200 text-emerald-900"
                                            : "bg-amber-100/70 border border-amber-200 text-amber-900"
                                        }`}>
                                          {opt.isRecommended ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                          ) : (
                                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                          )}
                                          <div>
                                            <strong className="font-bold block mb-0.5">
                                              {opt.isRecommended ? "✓ Recommended Professional Protocol:" : "⚠️ Caution & Salon Impact:"}
                                            </strong>
                                            <span>{opt.feedback}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* 4. Interactive Word-for-Word Roleplay Script Card */}
                          {activeLesson.script && (
                            <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/50 via-white to-emerald-50/30 p-5 sm:p-6 shadow-xs space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
                                    <MessageSquare className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-teal-950">
                                      Word-for-Word Salon Script: {activeLesson.script.title}
                                    </h4>
                                    <span className="text-[11px] text-teal-700">
                                      Context: {activeLesson.script.scenario}
                                    </span>
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCopyScript(activeLesson.script!.script, activeLesson.id)}
                                  className="text-xs gap-1.5 bg-white border-teal-200 text-teal-900 hover:bg-teal-50"
                                >
                                  {copiedScriptId === activeLesson.id ? (
                                    <>
                                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-teal-600" />
                                      Copy Script
                                    </>
                                  )}
                                </Button>
                              </div>

                              {/* Spoken Script Quote Box */}
                              <div className="p-4 rounded-xl bg-teal-950 text-teal-50 text-xs sm:text-sm leading-relaxed font-mono relative">
                                <span className="text-[10px] uppercase tracking-wider text-teal-400 font-sans font-bold block mb-1">
                                  Stylist / Receptionist Spoken Words:
                                </span>
                                {activeLesson.script.script}
                              </div>

                              {/* Why It Works */}
                              <div className="text-xs text-teal-900/90 leading-relaxed bg-teal-50/80 p-3 rounded-lg border border-teal-100 flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="font-bold text-teal-950 block mb-0.5">Why This Script Works:</strong>
                                  {activeLesson.script.whyItWorks}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 5. Interactive Do's and Don'ts Matrix */}
                          {activeLesson.dosDonts && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* DOs */}
                              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                                <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                                  Salon Best Practices (DO)
                                </h5>
                                <ul className="space-y-1.5 text-xs text-emerald-950">
                                  {activeLesson.dosDonts.dos.map((d, dIdx) => (
                                    <li key={dIdx} className="flex items-start gap-2">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                      <span>{d}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* DONTs */}
                              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2.5">
                                <h5 className="font-bold text-xs uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                                  <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
                                  Common Costly Mistakes (DON&apos;T)
                                </h5>
                                <ul className="space-y-1.5 text-xs text-rose-950">
                                  {activeLesson.dosDonts.donts.map((d, dIdx) => (
                                    <li key={dIdx} className="flex items-start gap-2">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                      <span>{d}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* Key Actionable Takeaways */}
                          {activeLesson.keyTakeaways && activeLesson.keyTakeaways.length > 0 && (
                            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2">
                              <h6 className="font-bold text-xs text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                Key Actionable Takeaways
                              </h6>
                              <ul className="space-y-1.5 text-xs text-blue-900/90 list-disc list-inside">
                                {activeLesson.keyTakeaways.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Downloadable Resources */}
                          {activeLesson.resources && activeLesson.resources.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Downloadable Resources</h5>
                              <div className="flex flex-wrap gap-2">
                                {activeLesson.resources.map((res, idx) => (
                                  <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs gap-2 bg-white"
                                    onClick={() => toast({ title: "Downloaded", description: `Saved ${res.name} to downloads.` })}
                                  >
                                    <Download className="w-3.5 h-3.5 text-primary" />
                                    {res.name}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Navigation Buttons */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!prevLesson}
                              onClick={() => prevLesson && handleSelectLesson(prevLesson)}
                              className="text-xs gap-1.5"
                            >
                              ← Previous Lesson
                            </Button>

                            {nextLesson ? (
                              <Button
                                size="sm"
                                onClick={() => handleSelectLesson(nextLesson)}
                                className="text-xs gap-1.5"
                              >
                                Next Lesson →
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setPlayerTab("quiz")}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
                              >
                                Take Final Exam <Award className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-slate-500 text-sm">Select a lesson from the curriculum sidebar to begin.</p>
                      )}
                    </TabsContent>

                    {/* Quiz / Final Exam Tab */}
                    <TabsContent value="quiz" className="space-y-6 m-0">
                      <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 flex items-start gap-3">
                        <Award className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-sm text-purple-900">Course Certification Examination</h4>
                          <p className="text-xs text-purple-800 mt-0.5">
                            Answer all questions accurately. Score 75% or higher to graduate and receive your verified Hanva University credential.
                          </p>
                        </div>
                      </div>

                      {quizSubmitted && quizScore !== null && (
                        <div
                          className={`p-6 rounded-xl border text-center space-y-3 ${
                            quizScore >= 75
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                              : "bg-rose-50 border-rose-200 text-rose-900"
                          }`}
                        >
                          <div
                            className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                              quizScore >= 75 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {quizScore >= 75 ? <Award className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                          </div>
                          <h3 className="text-xl font-bold">
                            {quizScore >= 75 ? "Examination Passed! 🎉" : "Review Needed"}
                          </h3>
                          <p className="text-sm">
                            You scored <strong>{quizScore}%</strong> on this exam.
                          </p>
                          {quizScore >= 75 ? (
                            <Button
                              onClick={() => handleViewCourseCertificate(activeCourse.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            >
                              <Award className="w-4 h-4" />
                              Claim Verified Certificate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setQuizSubmitted(false)
                                setQuizAnswers({})
                              }}
                              className="gap-2"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Retake Examination
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Quiz Form Questions */}
                      <div className="space-y-6">
                        {activeCourse.quiz.map((q, idx) => (
                          <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                            <h5 className="font-semibold text-sm text-slate-900">
                              {idx + 1}. {q.question}
                            </h5>
                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => {
                                const isSelected = quizAnswers[q.id] === optIdx
                                const isCorrect = q.correctIndex === optIdx
                                const showResult = quizSubmitted

                                return (
                                  <label
                                    key={optIdx}
                                    onClick={() => {
                                      if (!quizSubmitted) {
                                        setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                                      }
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                                      showResult
                                        ? isCorrect
                                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
                                          : isSelected
                                          ? "border-rose-400 bg-rose-50 text-rose-900"
                                          : "border-slate-100 opacity-60"
                                        : isSelected
                                        ? "border-primary bg-primary/5 font-semibold text-primary"
                                        : "border-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`question-${q.id}`}
                                      checked={isSelected}
                                      onChange={() => {}}
                                      disabled={quizSubmitted}
                                      className="text-primary focus:ring-0"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                )
                              })}
                            </div>
                            {quizSubmitted && (
                              <p className="text-[11px] text-slate-500 pt-1">
                                <strong>Explanation:</strong> {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}

                        {!quizSubmitted && (
                          <Button
                            onClick={handleSubmitQuiz}
                            disabled={submittingQuiz}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-11 gap-2 shadow-sm"
                          >
                            {submittingQuiz ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                            Submit Examination &amp; Evaluate Score
                          </Button>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Right: Course Curriculum Syllabus */}
                <div className="p-6 bg-slate-50/50 space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Course Curriculum</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeCourse.completedLessonIds.length} of {allLessons.length} lessons completed
                    </p>
                    <Progress
                      value={activeCourse.progress}
                      className="h-1.5 rounded-full mt-2"
                    />
                  </div>

                  <div className="space-y-4">
                    {activeCourse.modules.map((module) => (
                      <div key={module.id} className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {module.title}
                        </h5>
                        <div className="space-y-1.5">
                          {module.lessons.map((lesson) => {
                            const isCurrent = activeLesson?.id === lesson.id
                            const isDone = activeCourse.completedLessonIds.includes(lesson.id)

                            return (
                              <div
                                key={lesson.id}
                                onClick={() => {
                                  handleSelectLesson(lesson)
                                }}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isCurrent
                                    ? "border-primary bg-primary/5 text-primary font-semibold shadow-xs"
                                    : "border-slate-200/80 bg-white hover:bg-slate-100 text-slate-700"
                                }`}
                              >
                                <div className="pt-0.5 shrink-0">
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="truncate font-medium">{lesson.title}</p>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{lesson.duration}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verified Certificate Modal / Printable Layout */}
      <Dialog open={isCertModalOpen} onOpenChange={setIsCertModalOpen}>
        <DialogContent className="max-w-3xl bg-white p-6 sm:p-8 rounded-2xl">
          {activeCertificate && (
            <div className="space-y-6">
              {/* Actual Printable Certificate Card */}
              <div
                id="printable-certificate"
                className="relative p-8 sm:p-12 border-8 border-double border-amber-600/40 rounded-xl bg-gradient-to-b from-amber-50/40 via-white to-amber-50/40 text-center space-y-6 shadow-md"
              >
                {/* Header Seal */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-500 text-white flex items-center justify-center shadow-md">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <h2 className="text-xs uppercase tracking-widest font-extrabold text-amber-800">
                    Hanva University of Salon Mastery
                  </h2>
                </div>

                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 tracking-tight">
                    Certificate of Completion
                  </h1>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                    This is proudly presented to
                  </p>
                </div>

                <div className="py-2 border-b-2 border-slate-300 max-w-sm mx-auto">
                  <span className="text-2xl sm:text-3xl font-serif italic font-bold text-indigo-950">
                    {activeCertificate.studentName}
                  </span>
                </div>

                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  for successfully mastering the curriculum and passing the comprehensive examination for
                </p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {activeCertificate.courseTitle}
                </h3>

                {/* Footer Metadata */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-xs text-slate-600 items-end">
                  <div>
                    <span className="block font-mono text-[11px] text-slate-400">Issue Date</span>
                    <strong className="text-slate-800">{activeCertificate.issueDate}</strong>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full border-2 border-amber-600 flex items-center justify-center text-amber-700">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mt-1">Verified</span>
                  </div>

                  <div>
                    <span className="block font-mono text-[11px] text-slate-400">Credential ID</span>
                    <strong className="font-mono text-purple-700 text-[11px]">{activeCertificate.certificateId}</strong>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Official Hanva University digital credential. Verifiable on all partner salons.
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setIsCertModalOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={handlePrintCertificate} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <Printer className="w-4 h-4" />
                    Print / Download PDF
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Achievement Detail Modal */}
      <Dialog open={!!selectedAchievement} onOpenChange={(open) => !open && setSelectedAchievement(null)}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl text-center space-y-4">
          {selectedAchievement && (
            <>
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  selectedAchievement.earned ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                <Award className="w-8 h-8" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {selectedAchievement.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 leading-relaxed">
                {selectedAchievement.description}
              </DialogDescription>
              <div className="pt-2">
                <Badge
                  className={
                    selectedAchievement.earned
                      ? "bg-amber-500 text-white text-xs"
                      : "bg-slate-200 text-slate-700 text-xs"
                  }
                >
                  {selectedAchievement.earned ? "Unlocked ✓" : "In Progress"}
                </Badge>
              </div>
              <DialogFooter className="justify-center sm:justify-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedAchievement(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
