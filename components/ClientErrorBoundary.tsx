"use client"

import React, { useEffect } from "react"

export function ClientErrorBoundary({ children }) {
  const handleGlobalError = (error, info) => {
    console.error("Caught a client-side error:", error, info)
  }

  useEffect(() => {
    window.onerror = (message, source, lineno, colno, error) => {
      handleGlobalError(error, {})
      return true
    }
    return () => {
      window.onerror = null
    }
  }, [])

  return (
    <React.ErrorBoundary fallback={<div>Something went wrong!</div>} onError={handleGlobalError}>
      {children}
    </React.ErrorBoundary>
  )
}
