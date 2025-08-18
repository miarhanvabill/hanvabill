"use client"

import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"

interface RealTimeIndicatorProps {
  isActive?: boolean
  label?: string
  className?: string
}

export function RealTimeIndicator({ isActive = true, label = "Live", className = "" }: RealTimeIndicatorProps) {
  return (
    <Badge variant={isActive ? "default" : "secondary"} className={`flex items-center gap-1 ${className}`}>
      {isActive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {label}
    </Badge>
  )
}
