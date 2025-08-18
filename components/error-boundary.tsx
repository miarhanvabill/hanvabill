"use client"

import type React from "react"
import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: any
  errorId?: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Create safe error details object
    const safeErrorDetails = {
      message: error?.message || "Unknown error occurred",
      name: error?.name || "Error",
      stack: error?.stack || "No stack trace available",
      componentStack: errorInfo?.componentStack || "No component stack available",
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== "undefined" ? window.navigator?.userAgent || "unknown" : "server",
      url: typeof window !== "undefined" ? window.location?.href || "unknown" : "server",
      errorId: this.state.errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    // Safe console logging with fallbacks
    try {
      if (console && typeof console.group === "function") {
        console.group(`🚨 Error Boundary Caught Error [${safeErrorDetails.errorId}]`)
        console.error("Error Message:", safeErrorDetails.message)
        console.error("Component Stack:", safeErrorDetails.componentStack)
        console.error("Full Details:", safeErrorDetails)
        console.groupEnd()
      } else {
        // Fallback for environments without console.group
        console.error(`Error Boundary [${safeErrorDetails.errorId}]:`, safeErrorDetails.message)
        console.error("Error Details:", safeErrorDetails)
      }
    } catch (loggingError) {
      // Ultimate fallback if even basic console.error fails
      try {
        console.log("Error in error logging. Original error:", error?.message || "Unknown")
      } catch {
        // If all console methods fail, fail silently
      }
    }

    // Safely update component state
    try {
      this.setState({
        errorInfo: safeErrorDetails,
        error: error || new Error("Unknown error"),
        hasError: true,
      })
    } catch (stateError) {
      console.warn(
        "Failed to update error boundary state:",
        stateError instanceof Error ? stateError.message : "State error",
      )
    }

    // Safely call custom error handler
    if (this.props.onError && typeof this.props.onError === "function") {
      try {
        this.props.onError(error, errorInfo)
      } catch (handlerError) {
        console.warn(
          "Error in custom error handler:",
          handlerError instanceof Error ? handlerError.message : "Handler error",
        )
      }
    }

    // Safe production error reporting
    if (process.env.NODE_ENV === "production") {
      try {
        const productionError = {
          message: safeErrorDetails.message,
          timestamp: safeErrorDetails.timestamp,
          errorId: safeErrorDetails.errorId,
          url: safeErrorDetails.url,
        }

        // Log for production monitoring
        console.log("Production error logged:", productionError)

        // Here you could integrate with error tracking services like Sentry
      } catch (reportingError) {
        console.warn(
          "Failed to report production error:",
          reportingError instanceof Error ? reportingError.message : "Reporting error",
        )
      }
    }
  }

  handleRetry = () => {
    try {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined,
      })
    } catch (error) {
      console.warn("Error during retry:", error instanceof Error ? error.message : "Unknown retry error")
      // Force page refresh as fallback
      this.handleRefresh()
    }
  }

  handleRefresh = () => {
    try {
      if (typeof window !== "undefined" && window.location) {
        window.location.reload()
      }
    } catch (error) {
      console.warn("Error during refresh:", error instanceof Error ? error.message : "Unknown refresh error")
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-gray-600 mb-4">
                We encountered an error while loading this page. Please try refreshing or contact support if the problem
                persists.
              </p>
              {this.state.error && process.env.NODE_ENV === "development" && (
                <details className="text-left bg-gray-50 p-3 rounded text-sm mb-4">
                  <summary className="cursor-pointer font-medium">Error details (Development)</summary>
                  <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap max-h-40">
                    {this.state.errorInfo?.message || "No error message available"}
                    {this.state.errorInfo?.stack && (
                      <>
                        {"\n\nStack trace:\n"}
                        {this.state.errorInfo.stack}
                      </>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <>
                        {"\n\nComponent stack:"}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                    {this.state.errorInfo?.errorId && (
                      <>
                        {"\n\nError ID: "}
                        {this.state.errorInfo.errorId}
                      </>
                    )}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleRetry} variant="outline" className="gap-2 bg-transparent">
                Try Again
              </Button>
              <Button onClick={this.handleRefresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: any) => void,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  )

  // Set display name for debugging
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || "Component"})`

  return WrappedComponent
}
