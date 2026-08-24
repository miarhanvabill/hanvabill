"use client"

import { useState } from "react"
import { WaitlistEntry, addWaitlistEntry, updateWaitlistStatus, deleteWaitlistEntry } from "@/app/actions/waitlist"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, Clock, MoreHorizontal, Plus, Search, Trash } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface WaitlistClientProps {
  initialWaitlist: WaitlistEntry[]
  customers: any[]
  staff: any[]
}

export function WaitlistClient({ initialWaitlist, customers, staff }: WaitlistClientProps) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(initialWaitlist)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Form state
  const [customerId, setCustomerId] = useState<string>("")
  const [preferredStaffId, setPreferredStaffId] = useState<string>("any")
  const [preferredDate, setPreferredDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [timePreference, setTimePreference] = useState<string>("any")
  const [notes, setNotes] = useState<string>("")
  const [customerOpen, setCustomerOpen] = useState(false)

  const filteredWaitlist = waitlist.filter(entry => 
    entry.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.customerPhone.includes(searchQuery)
  )

  const handleAddSubmit = async () => {
    if (!customerId || !preferredDate) {
      toast.error("Please select a customer and preferred date")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await addWaitlistEntry({
        customerId,
        preferredStaffId: preferredStaffId === "any" ? undefined : preferredStaffId,
        preferredDate,
        timePreference,
        notes
      })

      if (result.success) {
        toast.success("Added to waitlist")
        setIsAddOpen(false)
        resetForm()
        // In a real app we might refetch waitlist here, but for now we rely on revalidatePath
        // Actually, since revalidatePath happens on server, we should refresh the page or wait for next.js to update.
        // We can just window.location.reload() for simplicity or use useRouter().refresh()
        window.location.reload()
      } else {
        toast.error(result.error || "Failed to add to waitlist")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setCustomerId("")
    setPreferredStaffId("any")
    setPreferredDate(new Date().toISOString().split('T')[0])
    setTimePreference("any")
    setNotes("")
  }

  const handleStatusChange = async (id: string, status: "waiting" | "notified" | "booked" | "cancelled") => {
    const toastId = toast.loading("Updating status...")
    try {
      const result = await updateWaitlistStatus(id, status)
      if (result.success) {
        setWaitlist(prev => prev.map(entry => entry.id === id ? { ...entry, status } : entry))
        toast.success("Status updated", { id: toastId })
      } else {
        toast.error(result.error || "Failed to update status", { id: toastId })
      }
    } catch (error) {
      toast.error("An error occurred", { id: toastId })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this waitlist entry?")) return
    
    const toastId = toast.loading("Deleting entry...")
    try {
      const result = await deleteWaitlistEntry(id)
      if (result.success) {
        setWaitlist(prev => prev.filter(entry => entry.id !== id))
        toast.success("Entry deleted", { id: toastId })
      } else {
        toast.error(result.error || "Failed to delete entry", { id: toastId })
      }
    } catch (error) {
      toast.error("An error occurred", { id: toastId })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Waiting</Badge>
      case "notified":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Notified</Badge>
      case "booked":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Booked</Badge>
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Waitlist Entries</CardTitle>
            <CardDescription>Manage clients waiting for an appointment</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search waitlist..."
                className="w-full md:w-[250px] pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Waitlist
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add to Waitlist</DialogTitle>
                  <DialogDescription>
                    Add a client to the waitlist for a specific date or time.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customer">Customer</Label>
                    <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={customerOpen}
                          className="justify-between"
                        >
                          {customerId
                            ? customers.find((c) => c.id.toString() === customerId)?.name || customers.find((c) => c.id.toString() === customerId)?.full_name
                            : "Select customer..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search customer..." />
                          <CommandList>
                            <CommandEmpty>No customer found.</CommandEmpty>
                            <CommandGroup>
                              {customers.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={customer.name || customer.full_name}
                                  onSelect={() => {
                                    setCustomerId(customer.id.toString())
                                    setCustomerOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      customerId === customer.id.toString() ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {customer.name || customer.full_name} {customer.phone && `(${customer.phone})`}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Preferred Date</Label>
                      <Input 
                        id="date" 
                        type="date" 
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="time">Time Preference</Label>
                      <Select value={timePreference} onValueChange={setTimePreference}>
                        <SelectTrigger id="time">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Time</SelectItem>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="afternoon">Afternoon</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="staff">Preferred Staff</Label>
                    <Select value={preferredStaffId} onValueChange={setPreferredStaffId}>
                      <SelectTrigger id="staff">
                        <SelectValue placeholder="Select staff (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Staff Member</SelectItem>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input 
                      id="notes" 
                      placeholder="e.g. Needs a quick haircut, flexible with time" 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddSubmit} disabled={isSubmitting || !customerId}>
                    {isSubmitting ? "Adding..." : "Add to Waitlist"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredWaitlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Waitlist is empty</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              There are currently no active waitlist entries. Add clients to the waitlist when you're fully booked.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Pref. Date & Time</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWaitlist.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-medium">{entry.customerName}</div>
                    <div className="text-xs text-muted-foreground">{entry.customerPhone}</div>
                  </TableCell>
                  <TableCell>
                    <div>{new Date(entry.preferredDate).toLocaleDateString()}</div>
                    <div className="text-xs text-muted-foreground capitalize">{entry.timePreference}</div>
                  </TableCell>
                  <TableCell>
                    {entry.preferredStaffName || <span className="text-muted-foreground text-sm italic">Any Staff</span>}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={entry.notes}>
                    {entry.notes || "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(entry.status)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange(entry.id, "waiting")}>
                          Mark as Waiting
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(entry.id, "notified")}>
                          Mark as Notified
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(entry.id, "booked")}>
                          Mark as Booked
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(entry.id)}>
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
