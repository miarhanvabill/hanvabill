"use client"

// Path to the notification audio file
const SOUND_PATH_PRIMARY = "/sounds/notification.mp3"
const SOUND_PATH_FALLBACK = "/notification.mp3"

let cachedAudio: HTMLAudioElement | null = null
let lastPlayTimestamp = 0
const THROTTLE_MS = 180 // Avoid harsh distortion if multiple notifications fire at the exact same millisecond
let isAudioUnlocked = false

/**
 * Prime and unlock HTML5 Audio upon first user interaction (touch/click/key).
 * Mobile Safari and desktop Chrome block unprompted audio autoplay unless primed after user interaction.
 */
function initAudioUnlock() {
  if (typeof window === "undefined" || isAudioUnlocked) return

  const unlock = () => {
    try {
      if (!cachedAudio) {
        cachedAudio = new Audio(SOUND_PATH_PRIMARY)
        cachedAudio.preload = "auto"
      }
      // Brief play attempt with zero volume to grant permission
      cachedAudio.volume = 0.01
      const p = cachedAudio.play()
      if (p !== undefined) {
        p.then(() => {
          cachedAudio?.pause()
          if (cachedAudio) cachedAudio.currentTime = 0
          if (cachedAudio) cachedAudio.volume = 0.75
          isAudioUnlocked = true
        }).catch(() => {
          // Will unlock on next interaction
        })
      }
    } catch {
      // Ignored
    } finally {
      window.removeEventListener("click", unlock)
      window.removeEventListener("keydown", unlock)
      window.removeEventListener("touchstart", unlock)
    }
  }

  window.addEventListener("click", unlock, { once: true, passive: true })
  window.addEventListener("keydown", unlock, { once: true, passive: true })
  window.addEventListener("touchstart", unlock, { once: true, passive: true })
}

if (typeof window !== "undefined") {
  initAudioUnlock()
}

/**
 * Checks if notification sounds are enabled in localStorage.
 */
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true
  try {
    const val = localStorage.getItem("hanva_notification_sound")
    return val !== "false"
  } catch {
    return true
  }
}

/**
 * Toggle or set notification sound preference.
 */
export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("hanva_notification_sound", enabled ? "true" : "false")
  } catch {}
}

/**
 * Play the custom notification sound.
 * Handles rate-limiting, audio cloning (to allow overlapping chimes), volume, and autoplay error suppression.
 */
export function playNotificationSound(volume = 0.75): void {
  if (typeof window === "undefined") return
  if (!isNotificationSoundEnabled()) return

  const now = Date.now()
  if (now - lastPlayTimestamp < THROTTLE_MS) {
    return
  }
  lastPlayTimestamp = now

  try {
    // Using a new Audio instance or cloning allows quick successive triggers without abruptly cutting off
    const sound = new Audio(SOUND_PATH_PRIMARY)
    sound.volume = Math.max(0, Math.min(1, volume))

    // Fallback if primary path fails
    sound.onerror = () => {
      try {
        const fallbackSound = new Audio(SOUND_PATH_FALLBACK)
        fallbackSound.volume = Math.max(0, Math.min(1, volume))
        fallbackSound.play().catch(() => {})
      } catch {}
    }

    const promise = sound.play()
    if (promise !== undefined) {
      promise.catch((error) => {
        // Autoplay restrictions or user hasn't interacted yet
        if (error.name !== "NotAllowedError") {
          console.debug("[NotificationSound] Play blocked:", error.message)
        }
      })
    }
  } catch (err) {
    console.debug("[NotificationSound] Audio play failed:", err)
  }
}

// Global browser window bindings for easy cross-component access
if (typeof window !== "undefined") {
  ;(window as any).__playNotificationSound = playNotificationSound
  window.addEventListener("play-notification-sound", () => playNotificationSound())
}
