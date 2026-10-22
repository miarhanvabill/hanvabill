import { Suspense } from "react"
import { getMiniWebsiteSettings, saveMiniWebsiteSettings } from "./actions"
import MiniWebsiteForm from "./mini-website-form"
import { PageHeader } from "@/components/page-header"

export default async function MiniWebsitePage() {
  const settingsResult = await getMiniWebsiteSettings()
  // @ts-ignore
  const initialData = settingsResult?.success ? settingsResult.data : null

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Mini Website"
        subtitle="Configure your public-facing booking and information page."
        showBackButton
        backHref="/manage"
      />

      <Suspense fallback={<div>Loading...</div>}>
        <MiniWebsiteForm 
          initialData={initialData} 
          saveAction={saveMiniWebsiteSettings}
        />
      </Suspense>
    </div>
  )
}
