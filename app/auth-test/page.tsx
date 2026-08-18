import { AuthTest } from "@/components/auth-test"

export default function AuthTestPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Authentication Test</h1>
        <p className="text-gray-600 dark:text-gray-400">Test the Clerk authentication and tenant system</p>
      </div>
      <AuthTest />
    </div>
  )
}
