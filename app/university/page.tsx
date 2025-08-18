"use client"

import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Play, Clock, Users, Award, Star, ChevronRight, Video, FileText, Headphones } from "lucide-react"

const courses = [
  {
    id: 1,
    title: "Salon Management Fundamentals",
    description: "Learn the basics of running a successful salon business",
    duration: "2 hours",
    lessons: 12,
    progress: 75,
    rating: 4.8,
    students: 1250,
    type: "video",
    level: "Beginner",
    instructor: "Sarah Johnson",
  },
  {
    id: 2,
    title: "Advanced Hair Styling Techniques",
    description: "Master professional hair styling and cutting techniques",
    duration: "3.5 hours",
    lessons: 18,
    progress: 45,
    rating: 4.9,
    students: 890,
    type: "video",
    level: "Advanced",
    instructor: "Michael Chen",
  },
  {
    id: 3,
    title: "Customer Service Excellence",
    description: "Build lasting relationships with your clients",
    duration: "1.5 hours",
    lessons: 8,
    progress: 100,
    rating: 4.7,
    students: 2100,
    type: "audio",
    level: "Intermediate",
    instructor: "Emma Davis",
  },
  {
    id: 4,
    title: "Digital Marketing for Salons",
    description: "Grow your salon business through effective online marketing",
    duration: "4 hours",
    lessons: 24,
    progress: 0,
    rating: 4.6,
    students: 750,
    type: "video",
    level: "Intermediate",
    instructor: "David Rodriguez",
  },
  {
    id: 5,
    title: "Financial Management & Pricing",
    description: "Learn to manage finances and set profitable pricing strategies",
    duration: "2.5 hours",
    lessons: 15,
    progress: 30,
    rating: 4.8,
    students: 650,
    type: "document",
    level: "Advanced",
    instructor: "Lisa Thompson",
  },
]

const achievements = [
  { title: "First Course Completed", icon: Award, earned: true },
  { title: "5 Courses Completed", icon: Star, earned: true },
  { title: "Expert Level Reached", icon: BookOpen, earned: false },
  { title: "Community Helper", icon: Users, earned: true },
]

export default function UniversityPage() {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return Video
      case "audio":
        return Headphones
      case "document":
        return FileText
      default:
        return BookOpen
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-green-100 text-green-800"
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800"
      case "Advanced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Hanva University"
        subtitle="Enhance your skills and grow your salon business with our comprehensive learning platform."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Section */}
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to Hanva University</h2>
                  <p className="text-blue-100 mb-4">
                    Unlock your potential with expert-led courses designed specifically for salon professionals.
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>50+ Courses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>10,000+ Students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span>Certificates</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">3</div>
                <div className="text-sm text-gray-600">Courses Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600">45</div>
                <div className="text-sm text-gray-600">Hours Learned</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-600">12</div>
                <div className="text-sm text-gray-600">Certificates Earned</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-orange-600">85%</div>
                <div className="text-sm text-gray-600">Average Score</div>
              </CardContent>
            </Card>
          </div>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Your Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className={`flex flex-col items-center p-4 rounded-lg border-2 ${
                      achievement.earned ? "border-yellow-300 bg-yellow-50" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <achievement.icon
                      className={`w-8 h-8 mb-2 ${achievement.earned ? "text-yellow-600" : "text-gray-400"}`}
                    />
                    <span className="text-sm font-medium text-center">{achievement.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Available Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Available Courses</CardTitle>
              <CardDescription>Continue your learning journey with these expert-designed courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courses.map((course) => {
                  const TypeIcon = getTypeIcon(course.type)
                  return (
                    <Card key={course.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <TypeIcon className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{course.title}</h3>
                                <p className="text-sm text-gray-600">by {course.instructor}</p>
                              </div>
                            </div>

                            <p className="text-gray-700 mb-4">{course.description}</p>

                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Clock className="w-4 h-4" />
                                {course.duration}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <BookOpen className="w-4 h-4" />
                                {course.lessons} lessons
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Users className="w-4 h-4" />
                                {course.students.toLocaleString()} students
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Star className="w-4 h-4 fill-current text-yellow-400" />
                                {course.rating}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                              <Badge className={getLevelColor(course.level)}>{course.level}</Badge>
                              <Badge variant="outline" className="capitalize">
                                {course.type}
                              </Badge>
                            </div>

                            {course.progress > 0 && (
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Progress</span>
                                  <span className="text-sm text-gray-600">{course.progress}%</span>
                                </div>
                                <Progress value={course.progress} className="h-2" />
                              </div>
                            )}
                          </div>

                          <div className="ml-6">
                            <Button className="gap-2">
                              {course.progress > 0 ? (
                                <>
                                  <Play className="w-4 h-4" />
                                  Continue
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  Start Course
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Learning Path */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended Learning Path</CardTitle>
              <CardDescription>Follow this structured path to maximize your learning experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { step: 1, title: "Salon Management Fundamentals", status: "completed" },
                  { step: 2, title: "Customer Service Excellence", status: "completed" },
                  { step: 3, title: "Advanced Hair Styling Techniques", status: "in-progress" },
                  { step: 4, title: "Digital Marketing for Salons", status: "upcoming" },
                  { step: 5, title: "Financial Management & Pricing", status: "upcoming" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        item.status === "completed"
                          ? "bg-green-100 text-green-600"
                          : item.status === "in-progress"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">{item.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={
                            item.status === "completed"
                              ? "border-green-200 text-green-700"
                              : item.status === "in-progress"
                                ? "border-blue-200 text-blue-700"
                                : "border-gray-200 text-gray-700"
                          }
                        >
                          {item.status === "completed"
                            ? "Completed"
                            : item.status === "in-progress"
                              ? "In Progress"
                              : "Upcoming"}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
