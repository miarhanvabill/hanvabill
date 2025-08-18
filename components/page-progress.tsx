"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Section {
  id: string
  title: string
}

interface PageProgressProps {
  sections: Section[]
  className?: string
}

export function PageProgress({ sections, className = "" }: PageProgressProps) {
  const [activeSection, setActiveSection] = useState<string>("")
  const [sectionProgress, setSectionProgress] = useState<Record<string, number>>({})

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const progress = Math.round(entry.intersectionRatio * 100)
        setSectionProgress((prev) => ({
          ...prev,
          [entry.target.id]: progress,
        }))

        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          setActiveSection(entry.target.id)
        }
      })
    }, observerOptions)

    sections.forEach((section) => {
      const element = document.getElementById(section.id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [sections])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <Card className={`fixed left-4 top-1/2 transform -translate-y-1/2 z-40 p-2 shadow-lg ${className}`}>
      <div className="space-y-1">
        {sections.map((section) => {
          const progress = sectionProgress[section.id] || 0
          const isActive = activeSection === section.id

          return (
            <Button
              key={section.id}
              variant="ghost"
              size="sm"
              onClick={() => scrollToSection(section.id)}
              className={`w-full justify-start text-xs relative overflow-hidden ${
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div
                className="absolute left-0 top-0 h-full bg-blue-200 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
              <span className="relative z-10 truncate">{section.title}</span>
            </Button>
          )
        })}
      </div>
    </Card>
  )
}
