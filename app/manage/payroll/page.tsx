"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Play, Eye, Edit2 } from "lucide-react"
import { generatePayrollRun, getPayrollRuns, getPayrollRunDetails, updatePayrollEntry, finalizePayrollRun } from "@/app/actions/payroll"
import { formatCurrency } from "@/lib/currency"

export default function PayrollPage() {
  const [runs, setRuns] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  
  // New Run State
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isNewRunOpen, setIsNewRunOpen] = useState(false)

  // Detail State
  const [runDetails, setRunDetails] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  
  // Edit Entry State
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [bonuses, setBonuses] = useState("0")
  const [deductions, setDeductions] = useState("0")

  useEffect(() => {
    fetchRuns()
  }, [])

  useEffect(() => {
    if (selectedRunId) {
      fetchRunDetails(selectedRunId)
    }
  }, [selectedRunId])

  const fetchRuns = async () => {
    setIsLoading(true)
    const res = await getPayrollRuns()
    if (res.success) {
      setRuns(res.runs)
    } else {
      toast({ title: "Error fetching runs", description: res.message, variant: "destructive" })
    }
    setIsLoading(false)
  }

  const fetchRunDetails = async (id: number) => {
    const res = await getPayrollRunDetails(id)
    if (res.success) {
      setRunDetails(res.run)
      setEntries(res.entries)
    } else {
      toast({ title: "Error fetching details", description: res.message, variant: "destructive" })
    }
  }

  const handleGenerateRun = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Validation Error", description: "Start and end dates are required", variant: "destructive" })
      return
    }
    setIsGenerating(true)
    const res = await generatePayrollRun(startDate, endDate)
    setIsGenerating(false)
    if (res.success) {
      toast({ title: "Success", description: "Payroll run generated successfully" })
      setIsNewRunOpen(false)
      fetchRuns()
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" })
    }
  }

  const handleUpdateEntry = async () => {
    if (!editingEntry) return
    const res = await updatePayrollEntry(editingEntry.id, parseFloat(bonuses) || 0, parseFloat(deductions) || 0)
    if (res.success) {
      toast({ title: "Success", description: "Entry updated" })
      setEditingEntry(null)
      fetchRunDetails(selectedRunId!)
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" })
    }
  }

  const handleFinalize = async () => {
    if (!selectedRunId) return
    const res = await finalizePayrollRun(selectedRunId)
    if (res.success) {
      toast({ title: "Success", description: "Payroll run finalized" })
      fetchRunDetails(selectedRunId)
      fetchRuns()
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" })
    }
  }

  if (selectedRunId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setSelectedRunId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Payroll Run Details</h1>
          </div>
          {runDetails?.status === "draft" && (
            <Button onClick={handleFinalize}>Finalize Run</Button>
          )}
        </div>

        {runDetails && (
          <Card>
            <CardHeader>
              <CardTitle>
                Period: {new Date(runDetails.period_start).toLocaleDateString()} to {new Date(runDetails.period_end).toLocaleDateString()}
              </CardTitle>
              <Badge variant={runDetails.status === "completed" ? "default" : "secondary"} className="w-fit">
                {runDetails.status.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Base Pay</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Bonuses</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Total Pay</TableHead>
                    {runDetails.status === "draft" && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center">No entries found.</TableCell></TableRow>
                  ) : (
                    entries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.staff_name}</TableCell>
                        <TableCell>{formatCurrency(entry.base_pay)}</TableCell>
                        <TableCell>{formatCurrency(entry.commission_pay)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(entry.bonuses)}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(entry.deductions)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(entry.total_pay)}</TableCell>
                        {runDetails.status === "draft" && (
                          <TableCell>
                            <Dialog open={editingEntry?.id === entry.id} onOpenChange={(open) => {
                              if (open) {
                                setEditingEntry(entry)
                                setBonuses(entry.bonuses)
                                setDeductions(entry.deductions)
                              } else {
                                setEditingEntry(null)
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm"><Edit2 className="h-4 w-4 mr-2"/> Edit</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Adjust Pay: {entry.staff_name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Bonuses</Label>
                                    <Input type="number" value={bonuses} onChange={e => setBonuses(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Deductions</Label>
                                    <Input type="number" value={deductions} onChange={e => setDeductions(e.target.value)} />
                                  </div>
                                  <Button onClick={handleUpdateEntry} className="w-full">Save Changes</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Payroll Processing</h1>
        <Dialog open={isNewRunOpen} onOpenChange={setIsNewRunOpen}>
          <DialogTrigger asChild>
            <Button><Play className="mr-2 h-4 w-4" /> Run Payroll</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New Payroll Run</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <Button onClick={handleGenerateRun} className="w-full" disabled={isGenerating}>
                {isGenerating ? "Processing..." : "Generate Run"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Period Start</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                      No payroll runs generated yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map(run => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">#{run.id}</TableCell>
                      <TableCell>{new Date(run.period_start).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(run.period_end).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={run.status === "completed" ? "default" : "secondary"}>
                          {run.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedRunId(run.id)}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
