"use client"

import {
  useAuth,
  SignInButton,
  SignUpButton,
  UserButton,
  OrganizationSwitcher
} from "@clerk/nextjs"

export function AuthHeader() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <header className="flex justify-between items-center p-4 gap-4 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        {isLoaded && isSignedIn && (
          <>
            <OrganizationSwitcher 
              afterSelectOrganizationUrl="/dashboard" 
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "flex gap-2 items-center px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                }
              }}
            />
            {/* 👉 Dashboard Link */}
            <a 
              href="/dashboard/tenants" 
              className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-[#6c47ff] dark:hover:text-[#8c67ff] transition-colors px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Tenant Dashboard
            </a>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {isLoaded && !isSignedIn && (
          <>
            <SignInButton />
            <SignUpButton>
              <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                Sign Up
              </button>
            </SignUpButton>
          </>
        )}
        {isLoaded && isSignedIn && (
          <UserButton afterSignOutUrl="/" />
        )}
      </div>
    </header>
  )
}
