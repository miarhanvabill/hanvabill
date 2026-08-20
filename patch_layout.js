const fs = require('fs');
let code = fs.readFileSync('app/layout.tsx', 'utf8');

// Add import
code = code.replace(
  /import ClientLayoutWrapper from "@\/components\/ClientLayoutWrapper"/,
  `import ClientLayoutWrapper from "@/components/ClientLayoutWrapper"\nimport AppShell from "@/components/AppShell"`
);

// Replace the inside of ClientLayoutWrapper with AppShell
const oldInner = `<div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <div className="print:hidden h-full">
              <ErrorBoundary
                fallback={
                  <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sidebar unavailable</p>
                  </div>
                }
              >
                <Sidebar />
              </ErrorBoundary>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="print:hidden w-full">
                <ErrorBoundary
                  fallback={
                    <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Header unavailable</p>
                    </div>
                  }
                >
                  <Header />
                </ErrorBoundary>
                </div>

                <main className="flex-1 overflow-y-auto">
                  <ErrorBoundary
                    fallback={
                      <div className="p-8 text-center">
                        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
                        <p className="text-gray-500">The page content failed to load. Please try refreshing.</p>
                      </div>
                    }
                  >
                    {children}
                  </ErrorBoundary>
                </main>
              </div>
            </div>`;

code = code.replace(oldInner, `<AppShell>{children}</AppShell>`);

// Also remove the Sidebar and Header imports from layout.tsx
code = code.replace(/import Sidebar from "@\/components\/sidebar"\n/, '');
code = code.replace(/import { Header } from "@\/components\/header"\n/, '');

fs.writeFileSync('app/layout.tsx', code);
