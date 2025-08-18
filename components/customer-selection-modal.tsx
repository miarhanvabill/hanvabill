"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Plus, User, Phone, Mail } from "lucide-react"
import { getCustomers, createCustomer, type Customer } from "@/app/actions/customers"

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

  useEffect(() => {
    // Filter customers based on search term
    const filtered = customers.filter(
      (customer) =>
        customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone_number.includes(searchTerm) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    setFilteredCustomers(filtered)
  }, [customers, searchTerm])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (error) {
      console.error("Error loading customers:", error)
      // Use mock data as fallback
      setCustomers([
        {
          id: 1,
          full_name: "John Doe",
          phone_number: "+1234567890",
          email: "john@example.com",
          address: "123 Main St",
          gender: "male",
          date_of_birth: "1990-01-01",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_bookings: 5,
          total_spent: 2500,
        },
        {
          id: 2,
          full_name: "Jane Smith",
          phone_number: "+1234567891",
          email: "jane@example.com",
          address: "456 Oak Ave",
          gender: "female",
          date_of_birth: "1985-05-15",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_bookings: 3,
          total_spent: 1800,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)

    try {
      const customer = await createCustomer(newCustomer)
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
      onSelect(customer)
    } catch (error) {
      console.error("Error creating customer:", error)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleSelectCustomer = (customer: Customer) => {
    onSelect(customer)
  }

  const handleClose = () => {
    setSearchTerm("")
    setShowCreateForm(false)
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showCreateForm ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers by name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Create New Customer Button */}
              <Button onClick={() => setShowCreateForm(true)} className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create New Customer
              </Button>

              {/* Customer List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading customers...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "No customers found matching your search." : "No customers found."}
                    </p>
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <Card key={customer.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4" onClick={() => handleSelectCustomer(customer)}>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="font-medium">{customer.full_name}</h3>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Phone className="h-3 w-3 mr-1" />
                              {customer.phone_number}
                            </div>
                            {customer.email && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Mail className="h-3 w-3 mr-1" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                          <Button size="sm">Select</Button>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={newCustomer.full_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    value={newCustomer.phone_number}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone_number: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={newCustomer.gender}
                    onChange={(e) => setNewCustomer({ ...newCustomer, gender: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={newCustomer.date_of_birth}
                    onChange={(e) => setNewCustomer({ ...newCustomer, date_of_birth: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={createLoading} className="flex-1">
                  {createLoading ? "Creating..." : "Create Customer"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
