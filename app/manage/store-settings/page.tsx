import { StoreSettingsClient } from "./store-settings-client"
import { getBusinessSettings } from "@/app/actions/settings"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/page-header"

export default async function StoreSettingsPage() {
  const settings = await getBusinessSettings()

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <PageHeader
        title="Store Settings"
        subtitle="Manage business information, tax preferences, address, and descriptions"
        showBackButton
        backHref="/manage"
      />
      <Separator />
      <StoreSettingsClient initialSettings={settings} />
    </div>
  )
}
