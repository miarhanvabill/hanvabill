import { StoreSettingsClient } from "./store-settings-client"
import { getBusinessSettings } from "@/app/actions/settings"
import { Separator } from "@/components/ui/separator"

export default async function StoreSettingsPage() {
  const settings = await getBusinessSettings()

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Store Settings</h2>
      </div>
      <Separator />
      <StoreSettingsClient initialSettings={settings} />
    </div>
  )
}
