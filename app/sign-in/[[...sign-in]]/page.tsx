import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><img src="/logo-full.png" alt="Hanva Technologies Pvt. Ltd." className="h-16 object-contain" /></div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Sign in to your Hanva Billing dashboard</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
              card: "shadow-lg",
              headerTitle: "text-gray-900 dark:text-white",
              headerSubtitle: "text-gray-600 dark:text-gray-400",
            },
          }}
        />
      </div>
    </div>
  )
}
