"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Globe, Palette, Image as ImageIcon, Eye } from "lucide-react"

export default function MiniWebsiteForm({ initialData, saveAction }: { initialData: any, saveAction: any }) {
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    custom_url_slug: initialData?.custom_url_slug || "",
    theme_color: initialData?.theme_color || "#000000",
    show_services: initialData?.show_services ?? true,
    show_products: initialData?.show_products ?? true,
    show_staff: initialData?.show_staff ?? true,
    show_reviews: initialData?.show_reviews ?? true,
    banner_image_url: initialData?.banner_image_url || ""
  })

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const result = await saveAction(formData)
      if (result.success) {
        toast({
          title: "Settings Saved",
          description: "Your mini-website settings have been updated.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save settings",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
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
            Customize how your mini-website looks and what it displays.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="custom_url_slug">Custom URL Slug</Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">hanva.in/book/</span>
                <Input 
                  id="custom_url_slug" 
                  placeholder="my-salon" 
                  value={formData.custom_url_slug}
                  onChange={(e) => handleChange("custom_url_slug", e.target.value)}
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
                  value={formData.theme_color}
                  onChange={(e) => handleChange("theme_color", e.target.value)}
                />
                <Input 
                  id="theme_color" 
                  type="text" 
                  placeholder="#000000" 
                  value={formData.theme_color}
                  onChange={(e) => handleChange("theme_color", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner_image_url">Banner Image URL</Label>
              <Input 
                id="banner_image_url" 
                placeholder="https://example.com/banner.jpg" 
                value={formData.banner_image_url}
                onChange={(e) => handleChange("banner_image_url", e.target.value)}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Visibility Toggles</h3>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show_services" className="cursor-pointer">Show Services</Label>
                <Switch 
                  id="show_services" 
                  checked={formData.show_services}
                  onCheckedChange={(val) => handleChange("show_services", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_products" className="cursor-pointer">Show Products</Label>
                <Switch 
                  id="show_products" 
                  checked={formData.show_products}
                  onCheckedChange={(val) => handleChange("show_products", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_staff" className="cursor-pointer">Show Staff</Label>
                <Switch 
                  id="show_staff" 
                  checked={formData.show_staff}
                  onCheckedChange={(val) => handleChange("show_staff", val)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_reviews" className="cursor-pointer">Show Reviews</Label>
                <Switch 
                  id="show_reviews" 
                  checked={formData.show_reviews}
                  onCheckedChange={(val) => handleChange("show_reviews", val)}
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
                hanva.in/book/{formData.custom_url_slug || "your-slug"}
              </span>
            </CardTitle>
          </CardHeader>
          <div className="bg-background min-h-[500px] relative">
            {/* Mock Banner */}
            <div 
              className="h-32 w-full bg-cover bg-center flex items-center justify-center"
              style={{ 
                backgroundColor: formData.banner_image_url ? 'transparent' : formData.theme_color,
                backgroundImage: formData.banner_image_url ? `url(${formData.banner_image_url})` : 'none'
              }}
            >
              {!formData.banner_image_url && (
                <span className="text-white font-medium opacity-80">Store Banner</span>
              )}
            </div>

            {/* Mock Content */}
            <div className="p-4 space-y-6">
              <div className="text-center -mt-10">
                <div className="w-16 h-16 bg-background rounded-full mx-auto border-4 border-background flex items-center justify-center shadow-sm">
                  <span className="font-bold text-xl" style={{ color: formData.theme_color }}>S</span>
                </div>
                <h3 className="font-bold text-lg mt-2">My Salon</h3>
                <p className="text-xs text-muted-foreground">Book your appointment today</p>
                
                <Button 
                  className="mt-4 w-full rounded-full" 
                  style={{ backgroundColor: formData.theme_color }}
                >
                  Book Now
                </Button>
              </div>

              <div className="space-y-4">
                {formData.show_services && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm border-b pb-1">Services</h4>
                    <div className="space-y-2">
                      {[1, 2].map(i => (
                        <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50">
                          <span>Haircut {i}</span>
                          <span className="font-medium">₹30</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.show_products && (
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

                {formData.show_staff && (
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

                {formData.show_reviews && (
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
