import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <SignUp
          appearance={{
            layout: {
              logoImageUrl: "/logo-full.png",
              logoPlacement: "inside",
            },
            elements: {
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
              card: "shadow-xl border border-gray-100",
              headerTitle: "text-gray-900 dark:text-white text-xl font-bold",
              headerSubtitle: "text-gray-600 dark:text-gray-400",
              logoImage: "h-20 w-auto object-contain mx-auto",
              logoBox: "mb-4 flex justify-center items-center h-20",
            },
          }}
        />
      </div>
    </div>
  )
}
