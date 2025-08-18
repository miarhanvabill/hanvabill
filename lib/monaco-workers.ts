// Monaco Editor Web Workers Configuration
// This file configures Monaco Editor for web environments only

export function configureMonacoWorkers() {
  if (typeof window !== "undefined") {
    // Only run in browser environment
    ;(window as any).MonacoEnvironment = {
      getWorkerUrl: (moduleId: string, label: string) => {
        if (label === "json") {
          return "/monaco-editor/min/vs/language/json/json.worker.js"
        }
        if (label === "css" || label === "scss" || label === "less") {
          return "/monaco-editor/min/vs/language/css/css.worker.js"
        }
        if (label === "html" || label === "handlebars" || label === "razor") {
          return "/monaco-editor/min/vs/language/html/html.worker.js"
        }
        if (label === "typescript" || label === "javascript") {
          return "/monaco-editor/min/vs/language/typescript/ts.worker.js"
        }
        return "/monaco-editor/min/vs/editor/editor.worker.js"
      },
    }
  }
}

// Web-only utility functions
export function isWebEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined"
}

export function getWebWorkerSupport(): boolean {
  return isWebEnvironment() && typeof Worker !== "undefined"
}
