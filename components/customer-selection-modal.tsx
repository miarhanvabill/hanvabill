"use client"

import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Plus, User, Phone, Mail, ArrowLeft, Sparkles } from "lucide-react"
import { getCustomers, createCustomerData, getOrCreateWalkInCustomer, type Customer } from "@/app/actions/customers"
import { toast } from "sonner"

interface CustomerSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (customer: Customer) => void
}

export function CustomerSelectionModal({ isOpen, onClose, onSelect }: CustomerSelectionModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  // Auto-open guard ref to prevent repeated auto-open loops for the same phone
  const autoOpenedPhoneRef = useRef<string>("")
  const isSearchingServerRef = useRef<boolean>(false)
  const fullNameInputRef = useRef<HTMLInputElement>(null)

  // New customer form state
  const [newCustomer, setNewCustomer] = useState({
    full_name: "",
    phone_number: "",
    email: "",
    address: "",
    gender: "",
    date_of_birth: "",
  })

  useEffect(() => {
    if (isOpen) {
      loadCustomers()
    }
  }, [isOpen])

  // Focus the name field when create form opens
  useEffect(() => {
    if (showCreateForm) {
      const timer = setTimeout(() => {
        fullNameInputRef.current?.focus()
      }, 120)
      return () => clearTimeout(timer)
    }
  }, [showCreateForm])

  // Filter customers based on search term
  useEffect(() => {
    const cleanSearchDigits = searchTerm.replace(/\D/g, "")
    const lowerSearch = searchTerm.toLowerCase().trim()

    if (!lowerSearch) {
      setFilteredCustomers(customers)
      return
    }

    const filtered = customers.filter((customer) => {
      const matchName = customer.full_name?.toLowerCase().includes(lowerSearch)
      const matchEmail = customer.email?.toLowerCase().includes(lowerSearch)
      const custDigits = (customer.phone_number || "").replace(/\D/g, "")
      const matchPhoneExact = customer.phone_number?.includes(searchTerm)
      const matchPhoneDigits = cleanSearchDigits.length >= 3 && custDigits.includes(cleanSearchDigits)

      return matchName || matchPhoneExact || matchPhoneDigits || matchEmail
    })
    setFilteredCustomers(filtered)
  }, [customers, searchTerm])

  // 10-digit phone detection: auto-open create customer popup if not found
  useEffect(() => {
    if (!isOpen || showCreateForm) return

    const cleanDigits = searchTerm.replace(/\D/g, "")
    // Normalize to standard 10-digit Indian phone (strip 91 country code or leading 0)
    let tenDigitPhone = ""
    if (cleanDigits.length === 10) {
      tenDigitPhone = cleanDigits
    } else if (cleanDigits.length === 12 && cleanDigits.startsWith("91")) {
      tenDigitPhone = cleanDigits.slice(2)
    } else if (cleanDigits.length === 11 && cleanDigits.startsWith("0")) {
      tenDigitPhone = cleanDigits.slice(1)
    }

    // Reset auto-open guard if user deletes or edits away from the previous phone
    if (autoOpenedPhoneRef.current && autoOpenedPhoneRef.current !== tenDigitPhone) {
      autoOpenedPhoneRef.current = ""
    }

    // Check when exactly 10 digits are present and hasn't auto-opened for this number yet
    if (tenDigitPhone.length === 10) {
      if (autoOpenedPhoneRef.current === tenDigitPhone) return

      const timer = setTimeout(async () => {
        // 1. Check local list first
        const matchInMemory = customers.some((c) => {
          const custDigits = (c.phone_number || "").replace(/\D/g, "")
          return custDigits.endsWith(tenDigitPhone)
        })

        if (matchInMemory) {
          return
        }

        // 2. Query database to verify customer really doesn't exist (in case not in initial 100)
        try {
          isSearchingServerRef.current = true
          const serverCustomers = await getCustomers(tenDigitPhone)
          if (serverCustomers && serverCustomers.length > 0) {
            setCustomers((prev) => {
              const existingIds = new Set(prev.map((c) => c.id))
              const newMatches = serverCustomers.filter((c) => !existingIds.has(c.id))
              return [...newMatches, ...prev]
            })
            return
          }
        } catch (err) {
          console.warn("[CustomerModal] Server search warning:", err)
        } finally {
          isSearchingServerRef.current = false
        }

        // 3. Customer truly not found -> Auto-open create customer form with pre-filled phone number
        autoOpenedPhoneRef.current = tenDigitPhone
        setNewCustomer((prev) => ({
          ...prev,
          phone_number: tenDigitPhone,
        }))
        setShowCreateForm(true)
        toast.info(`No customer found with ${tenDigitPhone}. Enter customer name to create:`, {
          duration: 3500,
        })
      }, 350)

      return () => clearTimeout(timer)
    }
  }, [searchTerm, customers, showCreateForm, isOpen])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (error) {
      console.error("Error loading customers:", error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (val: string) => {
    // If input contains no alphabetic letters and has content,
    // treat as phone/number input and restrict strictly to max 10 digits
    const hasLetters = /[a-zA-Z]/.test(val)
    if (!hasLetters && val.trim().length > 0) {
      let digits = val.replace(/\D/g, "")
      // Strip country code if pasted (e.g. 91xxxxxxxxxx or 0xxxxxxxxxx)
      if (digits.startsWith("91") && digits.length > 10) {
        digits = digits.slice(2)
      } else if (digits.startsWith("0") && digits.length > 10) {
        digits = digits.slice(1)
      }
      // Strictly enforce max 10 digits for mobile number search
      if (digits.length > 10) {
        digits = digits.slice(0, 10)
      }
      setSearchTerm(digits)
      return
    }
    setSearchTerm(val)
  }

  const handleOpenCreateForm = () => {
    const cleanDigits = searchTerm.replace(/\D/g, "")
    let phoneToFill = ""
    if (cleanDigits.length === 10) {
      phoneToFill = cleanDigits
    } else if (cleanDigits.length === 12 && cleanDigits.startsWith("91")) {
      phoneToFill = cleanDigits.slice(2, 12)
    } else if (cleanDigits.length === 11 && cleanDigits.startsWith("0")) {
      phoneToFill = cleanDigits.slice(1, 11)
    } else if (cleanDigits.length > 10) {
      phoneToFill = cleanDigits.slice(0, 10)
    } else if (cleanDigits.length >= 7) {
      phoneToFill = cleanDigits
    }

    const nameToFill = !cleanDigits && searchTerm.trim() ? searchTerm.trim() : ""

    setNewCustomer((prev) => ({
      ...prev,
      phone_number: phoneToFill || prev.phone_number,
      full_name: nameToFill || prev.full_name,
    }))
    setShowCreateForm(true)
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomer.full_name.trim()) {
      toast.error("Please enter the customer's full name")
      return
    }
    const cleanPhone = newCustomer.phone_number.replace(/\D/g, "")
    if (!cleanPhone || cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number")
      return
    }

    setCreateLoading(true)
    try {
      const customer = await createCustomerData(newCustomer)
      setCustomers([customer, ...customers])
      setNewCustomer({
        full_name: "",
        phone_number: "",
        email: "",
        address: "",
        gender: "",
        date_of_birth: "",
      })
      setShowCreateForm(false)
      toast.success(`Customer "${customer.full_name}" created & selected!`)
      onSelect(customer)
    } catch (error: any) {
      console.error("Error creating customer:", error)
      toast.error(error?.message || "Failed to create customer")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleSelectCustomer = (customer: Customer) => {
    onSelect(customer)
  }

  const handleSelectWalkIn = async () => {
    try {
      const walkIn = await getOrCreateWalkInCustomer()
      onSelect(walkIn)
      onClose()
    } catch (err) {
      console.warn("Walk-in fallback:", err)
      onSelect({
        id: 0,
        full_name: "Walk In",
        phone_number: "0000000000",
        created_at: new Date().toISOString(),
      } as Customer)
      onClose()
    }
  }

  const handleClose = () => {
    setSearchTerm("")
    setShowCreateForm(false)
    autoOpenedPhoneRef.current = ""
    setNewCustomer({
      full_name: "",
      phone_number: "",
      email: "",
      address: "",
      gender: "",
      date_of_birth: "",
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              {showCreateForm ? (
                <>
                  <User className="h-5 w-5 text-slate-900" />
                  Create New Customer
                </>
              ) : (
                "Select Customer"
              )}
            </DialogTitle>
            {showCreateForm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(false)}
                className="text-xs text-slate-500 hover:text-slate-900 gap-1 h-8"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Search
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!showCreateForm ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers by name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              {/* Create New Customer & Walk-in Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleOpenCreateForm} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white gap-2 text-xs sm:text-sm">
                  <Plus className="h-4 w-4" />
                  Create New Customer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectWalkIn}
                  className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm shrink-0"
                >
                  <User className="h-4 w-4 text-slate-500" />
                  Walk-In
                </Button>
              </div>

              {/* Customer List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground text-xs">Loading customers...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <User className="h-12 w-12 text-muted-foreground mx-auto text-slate-400" />
                    <p className="text-slate-500 text-sm">
                      {searchTerm ? "No customers found matching your search." : "No customers found."}
                    </p>
                    {searchTerm && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenCreateForm}
                        className="text-xs gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create customer with &quot;{searchTerm}&quot;
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <Card key={customer.id} className="cursor-pointer hover:bg-slate-50 border-slate-200 transition-colors">
                      <CardContent className="p-3.5" onClick={() => handleSelectCustomer(customer)}>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="font-semibold text-sm text-slate-900">{customer.full_name}</h3>
                            <div className="flex items-center text-xs text-slate-600">
                              <Phone className="h-3 w-3 mr-1 text-slate-400" />
                              {customer.phone_number}
                            </div>
                            {customer.email && (
                              <div className="flex items-center text-xs text-slate-500">
                                <Mail className="h-3 w-3 mr-1 text-slate-400" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="outline" className="text-xs">
                            Select
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          ) : (
            /* Create Customer Form */
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              {newCustomer.phone_number && (
                <div className="bg-slate-50 text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                    Phone number <strong>{newCustomer.phone_number}</strong> auto-filled from search
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">
                    New Client
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-xs font-semibold text-slate-700">Full Name *</Label>
                  <Input
                    id="full_name"
                    ref={fullNameInputRef}
                    value={newCustomer.full_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                    placeholder="Enter customer name"
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone_number" className="text-xs font-semibold text-slate-700">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    value={newCustomer.phone_number}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 10)
                      setNewCustomer((prev) => ({ ...prev, phone_number: clean }))
                    }}
                    placeholder="10-digit mobile number"
                    className="text-xs font-mono"
                    maxLength={10}
                    inputMode="numeric"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="customer@example.com (optional)"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-semibold text-slate-700">Address</Label>
                <Input
                  id="address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Customer address (optional)"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-xs font-semibold text-slate-700">Gender</Label>
                  <select
                    id="gender"
                    value={newCustomer.gender}
                    onChange={(e) => setNewCustomer({ ...newCustomer, gender: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select Gender (optional)</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date_of_birth" className="text-xs font-semibold text-slate-700">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={newCustomer.date_of_birth}
                    onChange={(e) => setNewCustomer({ ...newCustomer, date_of_birth: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={createLoading} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium">
                  {createLoading ? "Creating..." : "Save & Select Customer"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
