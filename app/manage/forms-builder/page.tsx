import { getCustomForms } from "@/app/actions/custom-forms"
import FormsBuilderClient from "./forms-builder-client"
import { PageHeader } from "@/components/page-header"

export default async function FormsBuilderPage() {
  const { forms, success, error } = await getCustomForms()

  if (!success) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load forms: {error}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <PageHeader
        title="Forms Builder"
        subtitle="Create custom forms and questionnaires for your customers to fill out."
        showBackButton
        backHref="/manage"
      />
      
      <FormsBuilderClient initialForms={forms || []} />
    </div>
  )
}
