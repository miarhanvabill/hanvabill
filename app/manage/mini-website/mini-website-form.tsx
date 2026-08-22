"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"

interface MiniWebsiteFormProps {
  initialData: any
  saveAction: (tenantKey: string, formData: any) => Promise<any>
  tenantKey: string
}

export default function MiniWebsiteForm({ initialData, saveAction, tenantKey }: MiniWebsiteFormProps) {
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState({
    custom_url_slug: initialData?.custom_url_slug || "",
    theme_color: initialData?.theme_color || "#000000",
    show_services: initialData?.show_services ?? true,
    show_products: initialData?.show_products ?? true,
    show_staff: initialData?.show_staff ?? true,
    show_reviews: initialData?.show_reviews ?? true,
    banner_image_url: initialData?.banner_image_url || "",
  })

  const form = useForm({
    defaultValues: previewData,
  })

  const { register, handleSubmit, watch, setValue } = form
  
  // Watch values for preview
  const watchedValues = watch()
  
  const onSubmit = async (data: any) => {
    setLoading(true)
    try {
      const result = await saveAction(tenantKey, data)
      if (result.success) {
        toast.success("Settings saved successfully")
      } else {
        toast.error(result.error || "Failed to save settings")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Manage the appearance and content of your mini website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="custom_url_slug">Custom URL Slug</Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">hanva.in/book/</span>
                <Input 
                  id="custom_url_slug" 
                  placeholder="my-salon" 
                  {...register("custom_url_slug")} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme_color">Theme Color</Label>
              <div className="flex items-center space-x-4">
                <Input 
                  id="theme_color_picker" 
                  type="color" 
                  className="w-16 h-10 p-1"
                  {...register("theme_color")}
                />
                <Input 
                  id="theme_color" 
                  type="text" 
                  placeholder="#000000" 
                  {...register("theme_color")} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner_image_url">Banner Image URL</Label>
              <Input 
                id="banner_image_url" 
                placeholder="https://example.com/banner.jpg" 
                {...register("banner_image_url")} 
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Visibility Toggles</h3>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show_services" className="cursor-pointer">Show Services</Label>
                <Switch 
                  id="show_services" 
                  checked={watchedValues.show_services}
                  onCheckedChange={(val) => setValue("show_services", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_products" className="cursor-pointer">Show Products</Label>
                <Switch 
                  id="show_products" 
                  checked={watchedValues.show_products}
                  onCheckedChange={(val) => setValue("show_products", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_staff" className="cursor-pointer">Show Staff</Label>
                <Switch 
                  id="show_staff" 
                  checked={watchedValues.show_staff}
                  onCheckedChange={(val) => setValue("show_staff", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_reviews" className="cursor-pointer">Show Reviews</Label>
                <Switch 
                  id="show_reviews" 
                  checked={watchedValues.show_reviews}
                  onCheckedChange={(val) => setValue("show_reviews", val)}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <div>
        <Card className="overflow-hidden border-2 shadow-lg sticky top-6">
          <CardHeader className="bg-muted pb-4 border-b">
            <CardTitle className="text-center text-sm font-normal text-muted-foreground flex items-center justify-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
              </div>
              <span>
                hanva.in/book/{watchedValues.custom_url_slug || "your-slug"}
              </span>
            </CardTitle>
          </CardHeader>
          <div className="bg-background min-h-[500px] relative">
            {/* Mock Banner */}
            <div 
              className="h-32 w-full bg-cover bg-center flex items-center justify-center"
              style={{ 
                backgroundColor: watchedValues.banner_image_url ? 'transparent' : watchedValues.theme_color,
                backgroundImage: watchedValues.banner_image_url ? `url(${watchedValues.banner_image_url})` : 'none'
              }}
            >
              {!watchedValues.banner_image_url && (
                <span className="text-white font-medium opacity-80">Store Banner</span>
              )}
            </div>

            {/* Mock Content */}
            <div className="p-4 space-y-6">
              <div className="text-center -mt-10">
                <div className="w-16 h-16 bg-background rounded-full mx-auto border-4 border-background flex items-center justify-center shadow-sm">
                  <span className="font-bold text-xl" style={{ color: watchedValues.theme_color }}>S</span>
                </div>
                <h3 className="font-bold text-lg mt-2">My Salon</h3>
                <p className="text-xs text-muted-foreground">Book your appointment today</p>
                
                <Button 
                  className="mt-4 w-full rounded-full" 
                  style={{ backgroundColor: watchedValues.theme_color }}
                >
                  Book Now
                </Button>
              </div>

              <div className="space-y-4">
                {watchedValues.show_services && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm border-b pb-1">Services</h4>
                    <div className="space-y-2">
                      {[1, 2].map(i => (
                        <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50">
                          <span>Haircut {i}</span>
                          <span className="font-medium">$30</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {watchedValues.show_products && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm border-b pb-1">Products</h4>
                    <div className="flex space-x-2 overflow-hidden">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="min-w-16 h-16 bg-muted/50 rounded flex items-center justify-center text-xs">
                          Prod {i}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {watchedValues.show_staff && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm border-b pb-1">Our Team</h4>
                    <div className="flex space-x-3">
                      {[1, 2].map(i => (
                        <div key={i} className="flex flex-col items-center space-y-1">
                          <div className="w-10 h-10 rounded-full bg-muted/80"></div>
                          <span className="text-[10px]">Stylist {i}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {watchedValues.show_reviews && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm border-b pb-1">Reviews</h4>
                    <div className="p-3 bg-muted/30 rounded text-xs italic">
                      "Best salon experience ever! Highly recommended."
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
