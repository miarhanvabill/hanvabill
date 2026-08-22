import { Suspense } from "react"
import { getMiniWebsiteSettings, saveMiniWebsiteSettings } from "./actions"
import MiniWebsiteForm from "./mini-website-form"

export default async function MiniWebsitePage() {
  const settingsResult = await getMiniWebsiteSettings()
  // @ts-ignore
  const initialData = settingsResult?.success ? settingsResult.data : null

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Mini Website</h2>
      </div>
      
      <p className="text-muted-foreground">
        Configure your public-facing booking and information page.
      </p>

      <Suspense fallback={<div>Loading...</div>}>
        <MiniWebsiteForm 
          initialData={initialData} 
          saveAction={saveMiniWebsiteSettings}
        />
      </Suspense>
    </div>
  )
}
