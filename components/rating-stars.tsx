"use client"

import { useState } from "react"
import { Star } from "lucide-react"

export default function RatingStars({
  initial = 0,
  size = 22,
  onChange,
}: {
  initial?: number
  size?: number
  onChange?: (rating: number) => void
}) {
  const [value, setValue] = useState(initial)
  const [hover, setHover] = useState<number | null>(null)

  const stars = [1, 2, 3, 4, 5]
  return (
    <div className="flex items-center gap-1">
      {stars.map((s) => {
        const active = (hover ?? value) >= s
        return (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(null)}
            onClick={() => { setValue(s); onChange?.(s) }}
            aria-label={`Rate ${s}`}
            className="p-0.5"
          >
            <Star
              style={{ width: size, height: size }}
              className={active ? "text-yellow-500 fill-yellow-400" : "text-gray-300"}
            />
          </button>
        )
      })}
    </div>
  )
}
