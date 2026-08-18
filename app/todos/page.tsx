"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { EyeOff, Search, RefreshCw } from "lucide-react"

export default function TodosPage() {
  const [groupBy, setGroupBy] = useState("status")
  const [groupOrder, setGroupOrder] = useState("descending")
  const [sortBy, setSortBy] = useState("created-at")
  const [sortOrder, setSortOrder] = useState("descending")
  const [hideCompleted, setHideCompleted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Todos" />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Group By</label>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="assigned">Assigned To</SelectItem>
                      <SelectItem value="due-date">Due Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Order</label>
                  <Select value={groupOrder} onValueChange={setGroupOrder}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="descending">Descending</SelectItem>
                      <SelectItem value="ascending">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created-at">Created At</SelectItem>
                      <SelectItem value="due-date">Due Date</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Order</label>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="descending">Descending</SelectItem>
                      <SelectItem value="ascending">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant={hideCompleted ? "default" : "outline"}
                  onClick={() => setHideCompleted(!hideCompleted)}
                  className="gap-2"
                >
                  <EyeOff className="w-4 h-4" />
                  Hide Completed
                </Button>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search T..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-lg font-medium mb-2">No Todos found</h3>
                <p>Create your first todo to get started with task management.</p>
                <Button className="mt-4">Add New Todo</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
