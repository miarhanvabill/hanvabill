"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"
import { getServicesByCategory, type Service } from "@/app/actions/services"

interface ServiceSelectionModalProps {
  open: boolean
  onClose: () => void
  onApply: (services: SelectedService[]) => void
  selectedServices: SelectedService[]
}

export interface SelectedService {
  id: number
  name: string
  price: number
  quantity: number
}

const categories = ["All", "Favorite", "Haircut", "Hair Styling", "Manicure / Pedicure"]

export function ServiceSelectionModal({ open, onClose, onApply, selectedServices }: ServiceSelectionModalProps) {
  const [services, setServices] = useState<Record<string, Service[]>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [tempSelectedServices, setTempSelectedServices] = useState<SelectedService[]>(selectedServices)

  useEffect(() => {
    if (open) {
      loadServices()
      setTempSelectedServices(selectedServices)
    }
  }, [open, selectedServices])

  const loadServices = async () => {
    const servicesData = await getServicesByCategory()
    const servicesArray = Array.isArray(servicesData) ? servicesData : []

    const servicesByCategory: Record<string, Service[]> = {}
    servicesArray.forEach((service) => {
      if (!servicesByCategory[service.category]) {
        servicesByCategory[service.category] = []
      }
      servicesByCategory[service.category].push(service)
    })

    setServices(servicesByCategory)
  }

  const filteredServices = () => {
    let allServices: Service[] = []

    if (selectedCategory === "All") {
      allServices = Object.values(services).flat()
    } else {
      allServices = services[selectedCategory] || []
    }

    if (searchQuery) {
      allServices = Array.isArray(allServices)
        ? allServices.filter((service) => service.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : []
    }

    return allServices
  }

  const handleServiceToggle = (service: Service) => {
    const existingIndex = tempSelectedServices.findIndex((s) => s.id === service.id)

    if (existingIndex >= 0) {
      setTempSelectedServices((prev) => prev.filter((s) => s.id !== service.id))
    } else {
      setTempSelectedServices((prev) => [
        ...prev,
        {
          id: service.id,
          name: service.name,
          price: service.price,
          quantity: 1,
        },
      ])
    }
  }

  const handleApply = () => {
    onApply(tempSelectedServices)
    onClose()
  }

  const handleCancel = () => {
    setTempSelectedServices(selectedServices)
    setSearchQuery("")
    onClose()
  }

  const handleReset = () => {
    setTempSelectedServices([])
    setSearchQuery("")
    setSelectedCategory("All")
  }

  const totalPrice = tempSelectedServices.reduce((sum, service) => sum + service.price * service.quantity, 0)

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Select Services</DialogTitle>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search Services"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category ? "bg-black text-white hover:bg-gray-800" : "hover:bg-gray-100"
                }
              >
                {category}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="hover:bg-gray-100 bg-transparent"
              disabled={tempSelectedServices.length === 0 && searchQuery === "" && selectedCategory === "All"}
            >
              Reset
            </Button>
          </div>

          {/* Services List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredServices().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? `No services found for "${searchQuery}"` : "No services available in this category"}
              </div>
            ) : (
              filteredServices().map((service) => {
                const isSelected = tempSelectedServices.some((s) => s.id === service.id)
                return (
                  <div
                    key={service.id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      isSelected ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isSelected} onCheckedChange={() => handleServiceToggle(service)} />
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">{service.name.charAt(0)}</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{service.name}</h4>
                        <p className="text-sm text-gray-500">Code: {service.code || "--"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ₹{service.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {service.duration_minutes && (
                        <div className="text-sm text-gray-500">{service.duration_minutes} min</div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Selected Services Summary */}
          {tempSelectedServices.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Selected Services ({tempSelectedServices.length})</h4>
                <div className="font-semibold text-lg">
                  Total: ₹{totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {tempSelectedServices.map((service) => (
                  <Badge key={service.id} variant="secondary" className="gap-1">
                    {service.name} - ₹
                    {service.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <button
                      onClick={() => handleServiceToggle(service as Service)}
                      className="ml-1 hover:bg-gray-300 rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t bg-white sticky bottom-0">
            <div className="text-sm text-gray-500">
              {tempSelectedServices.length > 0
                ? `${tempSelectedServices.length} service${tempSelectedServices.length > 1 ? "s" : ""} selected`
                : "No services selected"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="hover:bg-gray-100 bg-transparent">
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                className="bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={tempSelectedServices.length === 0}
              >
                Apply {tempSelectedServices.length > 0 && `(${tempSelectedServices.length})`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
