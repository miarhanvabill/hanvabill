"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Search, X, Package, Clock, Calendar } from "lucide-react"
import { getActivePackages, type ServicePackage } from "@/app/actions/packages"
import { getServices, type Service } from "@/app/actions/services"

interface PackageSelectionModalProps {
  open: boolean
  onClose: () => void
  onApply: (packages: SelectedPackage[]) => void
  selectedPackages: SelectedPackage[]
}

export interface SelectedPackage {
  id: number
  name: string
  price: number
  quantity: number
  services: number[]
  duration: number
  validityDays: number
}

export function PackageSelectionModal({ open, onClose, onApply, selectedPackages }: PackageSelectionModalProps) {
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [tempSelectedPackages, setTempSelectedPackages] = useState<SelectedPackage[]>(selectedPackages)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadData()
      setTempSelectedPackages(selectedPackages)
    }
  }, [open, selectedPackages])

  const loadData = async () => {
    setLoading(true)
    try {
      const [packagesData, servicesData] = await Promise.all([getActivePackages(), getServices()])
      const safePackagesData = Array.isArray(packagesData) ? packagesData : []
      const safeServicesData = Array.isArray(servicesData) ? servicesData : []

      setPackages(safePackagesData)
      setServices(safeServicesData)
    } catch (error) {
      console.error("Error loading packages and services:", error)
      setPackages([])
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPackages = packages.filter(
    (pkg) =>
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getServiceNames = (serviceIds: number[]) => {
    if (!Array.isArray(services)) {
      console.warn("[v0] Services is not an array in getServiceNames:", services)
      return []
    }

    return serviceIds
      .map((id) => {
        const service = services.find((s) => s.id === id)
        return service?.name || ""
      })
      .filter(Boolean)
  }

  const handlePackageToggle = (pkg: ServicePackage) => {
    const existingIndex = tempSelectedPackages.findIndex((p) => p.id === pkg.id)

    if (existingIndex >= 0) {
      setTempSelectedPackages((prev) => prev.filter((p) => p.id !== pkg.id))
    } else {
      setTempSelectedPackages((prev) => [
        ...prev,
        {
          id: pkg.id,
          name: pkg.name,
          price: pkg.package_price,
          quantity: 1,
          services: pkg.services,
          duration: pkg.duration_minutes,
          validityDays: pkg.validity_days,
        },
      ])
    }
  }

  const handleApply = () => {
    onApply(tempSelectedPackages)
    onClose()
  }

  const handleReset = () => {
    setTempSelectedPackages([])
    setSearchQuery("")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Select Service Packages</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search Packages"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Reset Button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredPackages.length} package{filteredPackages.length !== 1 ? "s" : ""} available
            </p>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset Selection
            </Button>
          </div>

          {/* Packages List */}
          <div className="max-h-96 overflow-y-auto space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading packages...</p>
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No packages found</p>
              </div>
            ) : (
              filteredPackages.map((pkg) => {
                const isSelected = tempSelectedPackages.some((p) => p.id === pkg.id)
                const serviceNames = getServiceNames(pkg.services)

                return (
                  <div key={pkg.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox checked={isSelected} onCheckedChange={() => handlePackageToggle(pkg)} />

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{pkg.name}</h4>
                          <Badge variant="secondary" className="gap-1">
                            <Package className="w-3 h-3" />
                            Package
                          </Badge>
                          {pkg.discount_percentage > 0 && (
                            <Badge variant="outline" className="text-green-600">
                              {pkg.discount_percentage}% OFF
                            </Badge>
                          )}
                        </div>

                        {pkg.description && <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>}

                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Included Services:</p>
                            <div className="flex flex-wrap gap-1">
                              {serviceNames.map((serviceName, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {serviceName}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {pkg.duration_minutes} min
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Valid for {pkg.validity_days} days
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      {pkg.original_price > pkg.package_price && (
                        <div className="text-sm line-through text-gray-500">{formatCurrency(pkg.original_price)}</div>
                      )}
                      <div className="font-semibold text-green-600">{formatCurrency(pkg.package_price)}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Selected Packages Summary */}
          {tempSelectedPackages.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Selected Packages ({tempSelectedPackages.length})</h4>
              <div className="flex flex-wrap gap-2">
                {tempSelectedPackages.map((pkg) => (
                  <Badge key={pkg.id} variant="secondary" className="gap-1">
                    {pkg.name} - {formatCurrency(pkg.price)}
                    <button
                      onClick={() => handlePackageToggle(pkg as any)}
                      className="ml-1 hover:bg-gray-300 rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Total: {formatCurrency(tempSelectedPackages.reduce((sum, pkg) => sum + pkg.price, 0))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="bg-black text-white">
              Apply ({tempSelectedPackages.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
