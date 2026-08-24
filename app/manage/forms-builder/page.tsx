import { getCustomForms } from "@/app/actions/custom-forms"
import FormsBuilderClient from "./forms-builder-client"

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forms Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create custom forms and questionnaires for your customers to fill out.
          </p>
        </div>
      </div>
      
      <FormsBuilderClient initialForms={forms || []} />
    </div>
  )
}
