import Link from "next/link"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UnauthorizedSignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-6">
        
        <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unauthorized Sign-In</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your sign-in attempt was blocked or revoked. This usually happens if you attempt to sign in from an unrecognized device or if your session was terminated for security reasons.
          </p>
        </div>

        <div className="pt-4 flex flex-col space-y-3">
          <Link href="/sign-in" className="w-full">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Return to Login
            </Button>
          </Link>
          
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <p className="text-xs text-gray-400 pt-4 border-t">
          If you believe this is a mistake, please contact <a href="mailto:support@hanva.in" className="text-blue-500 hover:underline">support@hanva.in</a>.
        </p>
      </div>
    </div>
  )
}
