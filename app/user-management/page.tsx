"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  Users,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  Settings,
  Lock,
  Unlock,
  Copy,
  CheckCircle2,
  UserPlus,
  Crown,
  Star,
  Briefcase,
  HeadphonesIcon,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  permissions: string[]
  isActive: boolean
  lastLogin?: string
  createdAt: string
  avatar?: string
  department?: string
  employeeId?: string
  customRole?: boolean
}

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  isSystem: boolean
  userCount: number
  color?: string
  icon?: string
  createdAt?: string
  createdBy?: string
}

interface PermissionCategory {
  id: string
  name: string
  description: string
  permissions: Permission[]
}

interface Permission {
  id: string
  name: string
  description: string
  category: string
  level: "basic" | "advanced" | "critical"
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: "dashboard",
    name: "Dashboard & Overview",
    description: "Access to main dashboard and overview screens",
    permissions: [
      {
        id: "dashboard.view",
        name: "View Dashboard",
        description: "Access main dashboard",
        category: "dashboard",
        level: "basic",
      },
      {
        id: "dashboard.analytics",
        name: "View Analytics",
        description: "Access analytics widgets",
        category: "dashboard",
        level: "advanced",
      },
      {
        id: "dashboard.export",
        name: "Export Dashboard Data",
        description: "Export dashboard reports",
        category: "dashboard",
        level: "advanced",
      },
    ],
  },
  {
    id: "customers",
    name: "Customer Management",
    description: "Manage customer information and relationships",
    permissions: [
      {
        id: "customers.view",
        name: "View Customers",
        description: "View customer list and details",
        category: "customers",
        level: "basic",
      },
      {
        id: "customers.create",
        name: "Create Customers",
        description: "Add new customers",
        category: "customers",
        level: "basic",
      },
      {
        id: "customers.edit",
        name: "Edit Customers",
        description: "Modify customer information",
        category: "customers",
        level: "basic",
      },
      {
        id: "customers.delete",
        name: "Delete Customers",
        description: "Remove customers from system",
        category: "customers",
        level: "critical",
      },
      {
        id: "customers.export",
        name: "Export Customer Data",
        description: "Export customer information",
        category: "customers",
        level: "advanced",
      },
      {
        id: "customers.import",
        name: "Import Customer Data",
        description: "Bulk import customers",
        category: "customers",
        level: "advanced",
      },
    ],
  },
  {
    id: "bookings",
    name: "Booking Management",
    description: "Handle appointments and scheduling",
    permissions: [
      {
        id: "bookings.view",
        name: "View Bookings",
        description: "View appointment calendar and bookings",
        category: "bookings",
        level: "basic",
      },
      {
        id: "bookings.create",
        name: "Create Bookings",
        description: "Schedule new appointments",
        category: "bookings",
        level: "basic",
      },
      {
        id: "bookings.edit",
        name: "Edit Bookings",
        description: "Modify existing appointments",
        category: "bookings",
        level: "basic",
      },
      {
        id: "bookings.cancel",
        name: "Cancel Bookings",
        description: "Cancel appointments",
        category: "bookings",
        level: "advanced",
      },
      {
        id: "bookings.reschedule",
        name: "Reschedule Bookings",
        description: "Move appointments to different times",
        category: "bookings",
        level: "basic",
      },
      {
        id: "bookings.bulk_operations",
        name: "Bulk Booking Operations",
        description: "Perform bulk actions on bookings",
        category: "bookings",
        level: "advanced",
      },
    ],
  },
  {
    id: "sales",
    name: "Sales & Billing",
    description: "Process sales and manage billing",
    permissions: [
      {
        id: "sales.view",
        name: "View Sales",
        description: "View sales transactions",
        category: "sales",
        level: "basic",
      },
      { id: "sales.create", name: "Create Sales", description: "Process new sales", category: "sales", level: "basic" },
      {
        id: "sales.refund",
        name: "Process Refunds",
        description: "Issue refunds for sales",
        category: "sales",
        level: "advanced",
      },
      {
        id: "sales.discount",
        name: "Apply Discounts",
        description: "Apply discounts to sales",
        category: "sales",
        level: "advanced",
      },
      {
        id: "sales.void",
        name: "Void Transactions",
        description: "Void sales transactions",
        category: "sales",
        level: "critical",
      },
      {
        id: "sales.reports",
        name: "Sales Reports",
        description: "Access detailed sales reports",
        category: "sales",
        level: "advanced",
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventory Management",
    description: "Manage products and stock levels",
    permissions: [
      {
        id: "inventory.view",
        name: "View Inventory",
        description: "View product inventory",
        category: "inventory",
        level: "basic",
      },
      {
        id: "inventory.manage",
        name: "Manage Inventory",
        description: "Add, edit, and remove products",
        category: "inventory",
        level: "advanced",
      },
      {
        id: "inventory.adjust",
        name: "Adjust Stock",
        description: "Adjust stock levels",
        category: "inventory",
        level: "advanced",
      },
      {
        id: "inventory.purchase",
        name: "Purchase Orders",
        description: "Create and manage purchase orders",
        category: "inventory",
        level: "advanced",
      },
      {
        id: "inventory.suppliers",
        name: "Manage Suppliers",
        description: "Manage supplier information",
        category: "inventory",
        level: "advanced",
      },
    ],
  },
  {
    id: "staff",
    name: "Staff Management",
    description: "Manage staff and team members",
    permissions: [
      {
        id: "staff.view",
        name: "View Staff",
        description: "View staff list and details",
        category: "staff",
        level: "basic",
      },
      {
        id: "staff.create",
        name: "Create Staff",
        description: "Add new staff members",
        category: "staff",
        level: "advanced",
      },
      {
        id: "staff.edit",
        name: "Edit Staff",
        description: "Modify staff information",
        category: "staff",
        level: "advanced",
      },
      {
        id: "staff.delete",
        name: "Delete Staff",
        description: "Remove staff members",
        category: "staff",
        level: "critical",
      },
      {
        id: "staff.schedules",
        name: "Manage Schedules",
        description: "Manage staff schedules",
        category: "staff",
        level: "advanced",
      },
      {
        id: "staff.payroll",
        name: "View Payroll",
        description: "Access payroll information",
        category: "staff",
        level: "critical",
      },
    ],
  },
  {
    id: "reports",
    name: "Reports & Analytics",
    description: "Access reports and business analytics",
    permissions: [
      {
        id: "reports.view",
        name: "View Reports",
        description: "Access basic reports",
        category: "reports",
        level: "basic",
      },
      {
        id: "reports.advanced",
        name: "Advanced Reports",
        description: "Access detailed analytics",
        category: "reports",
        level: "advanced",
      },
      {
        id: "reports.export",
        name: "Export Reports",
        description: "Export reports to various formats",
        category: "reports",
        level: "advanced",
      },
      {
        id: "reports.financial",
        name: "Financial Reports",
        description: "Access financial reports",
        category: "reports",
        level: "critical",
      },
      {
        id: "reports.custom",
        name: "Custom Reports",
        description: "Create custom reports",
        category: "reports",
        level: "advanced",
      },
    ],
  },
  {
    id: "settings",
    name: "System Settings",
    description: "Configure system settings and preferences",
    permissions: [
      {
        id: "settings.view",
        name: "View Settings",
        description: "View system settings",
        category: "settings",
        level: "basic",
      },
      {
        id: "settings.edit",
        name: "Edit Settings",
        description: "Modify system settings",
        category: "settings",
        level: "critical",
      },
      {
        id: "settings.backup",
        name: "Backup & Restore",
        description: "Perform system backups",
        category: "settings",
        level: "critical",
      },
      {
        id: "settings.integrations",
        name: "Manage Integrations",
        description: "Configure third-party integrations",
        category: "settings",
        level: "advanced",
      },
    ],
  },
  {
    id: "users",
    name: "User Management",
    description: "Manage users, roles, and permissions",
    permissions: [
      { id: "users.view", name: "View Users", description: "View user list", category: "users", level: "advanced" },
      { id: "users.create", name: "Create Users", description: "Add new users", category: "users", level: "critical" },
      {
        id: "users.edit",
        name: "Edit Users",
        description: "Modify user information",
        category: "users",
        level: "critical",
      },
      {
        id: "users.delete",
        name: "Delete Users",
        description: "Remove users from system",
        category: "users",
        level: "critical",
      },
      {
        id: "users.roles",
        name: "Manage Roles",
        description: "Create and manage user roles",
        category: "users",
        level: "critical",
      },
      {
        id: "users.permissions",
        name: "Assign Permissions",
        description: "Assign permissions to users",
        category: "users",
        level: "critical",
      },
    ],
  },
]

const ROLE_TEMPLATES = [
  {
    id: "salon_owner",
    name: "Salon Owner",
    description: "Complete access to all salon operations and management",
    color: "bg-purple-100 text-purple-800",
    icon: "Crown",
    permissions: PERMISSION_CATEGORIES.flatMap((cat) => cat.permissions.map((p) => p.id)),
  },
  {
    id: "senior_manager",
    name: "Senior Manager",
    description: "Advanced management access with most permissions",
    color: "bg-blue-100 text-blue-800",
    icon: "Star",
    permissions: PERMISSION_CATEGORIES.flatMap((cat) =>
      cat.permissions.filter((p) => p.level !== "critical" || cat.id === "sales").map((p) => p.id),
    ),
  },
  {
    id: "shift_supervisor",
    name: "Shift Supervisor",
    description: "Supervise daily operations and staff during shifts",
    color: "bg-green-100 text-green-800",
    icon: "Briefcase",
    permissions: [
      "dashboard.view",
      "dashboard.analytics",
      "customers.view",
      "customers.create",
      "customers.edit",
      "bookings.view",
      "bookings.create",
      "bookings.edit",
      "bookings.reschedule",
      "sales.view",
      "sales.create",
      "sales.discount",
      "inventory.view",
      "staff.view",
      "staff.schedules",
      "reports.view",
    ],
  },
  {
    id: "senior_stylist",
    name: "Senior Stylist",
    description: "Experienced stylist with additional responsibilities",
    color: "bg-orange-100 text-orange-800",
    icon: "Star",
    permissions: [
      "dashboard.view",
      "customers.view",
      "customers.create",
      "customers.edit",
      "bookings.view",
      "bookings.create",
      "bookings.edit",
      "bookings.reschedule",
      "sales.view",
      "sales.create",
      "inventory.view",
      "staff.view",
    ],
  },
  {
    id: "customer_service",
    name: "Customer Service",
    description: "Handle customer inquiries and support",
    color: "bg-pink-100 text-pink-800",
    icon: "HeadphonesIcon",
    permissions: [
      "dashboard.view",
      "customers.view",
      "customers.create",
      "customers.edit",
      "bookings.view",
      "bookings.create",
      "bookings.edit",
      "bookings.reschedule",
      "sales.view",
    ],
  },
]

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [isEditingRole, setIsEditingRole] = useState(false)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("users")
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  useEffect(() => {
    // Mock data for users
    const mockUsers: User[] = [
      {
        id: "1",
        name: "Admin User",
        email: "admin@salon.com",
        phone: "+91 98765 43210",
        role: "admin",
        permissions: PERMISSION_CATEGORIES.flatMap((cat) => cat.permissions.map((p) => p.id)),
        isActive: true,
        lastLogin: "2024-01-25T10:30:00Z",
        createdAt: "2024-01-01",
        department: "Management",
        employeeId: "EMP001",
      },
      {
        id: "2",
        name: "Sarah Manager",
        email: "sarah@salon.com",
        phone: "+91 98765 43211",
        role: "senior_manager",
        permissions: [
          "dashboard.view",
          "dashboard.analytics",
          "customers.view",
          "customers.create",
          "customers.edit",
          "customers.export",
          "bookings.view",
          "bookings.create",
          "bookings.edit",
          "bookings.reschedule",
          "sales.view",
          "sales.create",
          "sales.discount",
          "sales.reports",
          "inventory.view",
          "inventory.manage",
          "staff.view",
          "staff.schedules",
          "reports.view",
          "reports.advanced",
          "reports.export",
        ],
        isActive: true,
        lastLogin: "2024-01-24T16:45:00Z",
        createdAt: "2024-01-05",
        department: "Operations",
        employeeId: "EMP002",
        customRole: true,
      },
      {
        id: "3",
        name: "John Stylist",
        email: "john@salon.com",
        phone: "+91 98765 43212",
        role: "senior_stylist",
        permissions: [
          "dashboard.view",
          "customers.view",
          "customers.create",
          "customers.edit",
          "bookings.view",
          "bookings.create",
          "bookings.edit",
          "bookings.reschedule",
          "sales.view",
          "sales.create",
          "inventory.view",
          "staff.view",
        ],
        isActive: true,
        lastLogin: "2024-01-25T09:15:00Z",
        createdAt: "2024-01-10",
        department: "Services",
        employeeId: "EMP003",
        customRole: true,
      },
      {
        id: "4",
        name: "Emma Receptionist",
        email: "emma@salon.com",
        phone: "+91 98765 43213",
        role: "customer_service",
        permissions: [
          "dashboard.view",
          "customers.view",
          "customers.create",
          "customers.edit",
          "bookings.view",
          "bookings.create",
          "bookings.edit",
          "bookings.reschedule",
          "sales.view",
        ],
        isActive: false,
        lastLogin: "2024-01-20T14:20:00Z",
        createdAt: "2024-01-15",
        department: "Front Desk",
        employeeId: "EMP004",
        customRole: true,
      },
    ]

    const mockRoles: Role[] = [
      {
        id: "admin",
        name: "Administrator",
        description: "Full system access with all permissions",
        permissions: PERMISSION_CATEGORIES.flatMap((cat) => cat.permissions.map((p) => p.id)),
        isSystem: true,
        userCount: 1,
        color: "bg-red-100 text-red-800",
        icon: "Crown",
      },
      ...ROLE_TEMPLATES.map((template) => ({
        ...template,
        isSystem: false,
        userCount: mockUsers.filter((u) => u.role === template.id).length,
        createdAt: "2024-01-01",
        createdBy: "Admin User",
      })),
    ]

    setUsers(mockUsers)
    setRoles(mockRoles)
    setLoading(false)
  }, [])

  const handleCreateUser = () => {
    const newUser: User = {
      id: Date.now().toString(),
      name: "",
      email: "",
      phone: "",
      role: "customer_service",
      permissions: [],
      isActive: true,
      createdAt: new Date().toISOString().split("T")[0],
      department: "",
      employeeId: "",
    }

    setSelectedUser(newUser)
    setIsEditingUser(false)
    setShowUserDialog(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsEditingUser(true)
    setShowUserDialog(true)
  }

  const handleSaveUser = () => {
    if (selectedUser) {
      if (users.find((u) => u.id === selectedUser.id)) {
        // Update existing user
        const updatedUsers = users.map((user) => (user.id === selectedUser.id ? selectedUser : user))
        setUsers(updatedUsers)
        toast({
          title: "User Updated",
          description: `${selectedUser.name} has been updated successfully.`,
        })
      } else {
        // Add new user
        setUsers([...users, selectedUser])
        toast({
          title: "User Created",
          description: `${selectedUser.name} has been added to the system.`,
        })
      }
      setShowUserDialog(false)
    }
  }

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    setUsers(users.filter((user) => user.id !== userId))
    if (selectedUser?.id === userId) {
      setSelectedUser(null)
    }
    toast({
      title: "User Deleted",
      description: `${user?.name} has been removed from the system.`,
      variant: "destructive",
    })
  }

  const handleToggleUserStatus = (userId: string) => {
    const updatedUsers = users.map((user) => (user.id === userId ? { ...user, isActive: !user.isActive } : user))
    setUsers(updatedUsers)
    const user = updatedUsers.find((u) => u.id === userId)
    toast({
      title: user?.isActive ? "User Activated" : "User Deactivated",
      description: `${user?.name} is now ${user?.isActive ? "active" : "inactive"}.`,
    })
  }

  const handleCreateRole = () => {
    const newRole: Role = {
      id: Date.now().toString(),
      name: "",
      description: "",
      permissions: [],
      isSystem: false,
      userCount: 0,
      color: "bg-gray-100 text-gray-800",
      createdAt: new Date().toISOString(),
      createdBy: "Current User",
    }

    setSelectedRole(newRole)
    setIsEditingRole(false)
    setShowRoleDialog(true)
  }

  const handleEditRole = (role: Role) => {
    setSelectedRole(role)
    setIsEditingRole(true)
    setShowRoleDialog(true)
  }

  const handleSaveRole = () => {
    if (selectedRole) {
      if (roles.find((r) => r.id === selectedRole.id)) {
        // Update existing role
        const updatedRoles = roles.map((role) => (role.id === selectedRole.id ? selectedRole : role))
        setRoles(updatedRoles)
        toast({
          title: "Role Updated",
          description: `${selectedRole.name} role has been updated successfully.`,
        })
      } else {
        // Add new role
        setRoles([...roles, selectedRole])
        toast({
          title: "Role Created",
          description: `${selectedRole.name} role has been created successfully.`,
        })
      }
      setShowRoleDialog(false)
    }
  }

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId)
    if (role && !role.isSystem) {
      setRoles(roles.filter((role) => role.id !== roleId))
      if (selectedRole?.id === roleId) {
        setSelectedRole(null)
      }
      toast({
        title: "Role Deleted",
        description: `${role.name} role has been deleted.`,
        variant: "destructive",
      })
    }
  }

  const handleUseTemplate = (template: any) => {
    const newRole: Role = {
      id: Date.now().toString(),
      name: template.name,
      description: template.description,
      permissions: [...template.permissions],
      isSystem: false,
      userCount: 0,
      color: template.color,
      icon: template.icon,
      createdAt: new Date().toISOString(),
      createdBy: "Current User",
    }

    setSelectedRole(newRole)
    setIsEditingRole(false)
    setShowTemplateDialog(false)
    setShowRoleDialog(true)
  }

  const handleAssignRole = (userId: string, roleId: string) => {
    const role = roles.find((r) => r.id === roleId)
    if (role) {
      const updatedUsers = users.map((user) =>
        user.id === userId
          ? { ...user, role: roleId, permissions: [...role.permissions], customRole: !role.isSystem }
          : user,
      )
      setUsers(updatedUsers)

      const user = updatedUsers.find((u) => u.id === userId)
      toast({
        title: "Role Assigned",
        description: `${user?.name} has been assigned the ${role.name} role.`,
      })
    }
  }

  const getRoleColor = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId)
    return role?.color || "bg-gray-100 text-gray-800"
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getPermissionLevel = (permissionId: string) => {
    for (const category of PERMISSION_CATEGORIES) {
      const permission = category.permissions.find((p) => p.id === permissionId)
      if (permission) return permission.level
    }
    return "basic"
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "basic":
        return "bg-green-100 text-green-800"
      case "advanced":
        return "bg-yellow-100 text-yellow-800"
      case "critical":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading user management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="User Management"
        subtitle="Manage users, create custom roles, and assign permissions for your salon team"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowTemplateDialog(true)} className="gap-2 bg-transparent">
              <Copy className="w-4 h-4" />
              Role Templates
            </Button>
            <Button variant="outline" onClick={handleCreateRole} className="gap-2 bg-transparent">
              <Shield className="w-4 h-4" />
              New Role
            </Button>
            <Button onClick={handleCreateUser} className="gap-2">
              <UserPlus className="w-4 h-4" />
              New User
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team Members ({users.length})
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Custom Roles ({roles.filter((r) => !r.isSystem).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6">
              {/* Users Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Team Members</p>
                        <p className="text-2xl font-bold">{users.length}</p>
                      </div>
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Members</p>
                        <p className="text-2xl font-bold">{users.filter((u) => u.isActive).length}</p>
                      </div>
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Custom Roles</p>
                        <p className="text-2xl font-bold">{users.filter((u) => u.customRole).length}</p>
                      </div>
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Settings className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Available Roles</p>
                        <p className="text-2xl font-bold">{roles.length}</p>
                      </div>
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <Shield className="w-4 h-4 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filter */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search team members by name, email, or role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Users List */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage your salon team members and their access permissions</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-4 font-medium">Team Member</th>
                          <th className="text-left p-4 font-medium">Role</th>
                          <th className="text-left p-4 font-medium">Department</th>
                          <th className="text-left p-4 font-medium">Permissions</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredUsers.map((user) => {
                          const role = roles.find((r) => r.id === user.role)
                          return (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="p-4">
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar || "/placeholder.svg"} />
                                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                    {user.employeeId && <p className="text-xs text-gray-400">ID: {user.employeeId}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Badge className={`${getRoleColor(user.role)} capitalize`}>
                                    {role?.name || user.role}
                                  </Badge>
                                  {user.customRole && (
                                    <Badge variant="outline" className="text-xs">
                                      Custom
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="text-sm">{user.department || "—"}</span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium">{user.permissions.length}</span>
                                  <span className="text-xs text-gray-500">permissions</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge variant={user.isActive ? "default" : "secondary"}>
                                  {user.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleToggleUserStatus(user.id)}>
                                    {user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="space-y-6">
              {/* Roles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => (
                  <Card key={role.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${role.color}`}>
                            {role.icon === "Crown" && <Crown className="w-5 h-5" />}
                            {role.icon === "Star" && <Star className="w-5 h-5" />}
                            {role.icon === "Briefcase" && <Briefcase className="w-5 h-5" />}
                            {role.icon === "HeadphonesIcon" && <HeadphonesIcon className="w-5 h-5" />}
                            {!role.icon && <Shield className="w-5 h-5" />}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{role.name}</CardTitle>
                            <CardDescription className="text-sm">{role.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {role.isSystem && (
                            <Badge variant="outline" className="text-xs">
                              System
                            </Badge>
                          )}
                          {!role.isSystem && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              Custom
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Team Members:</span>
                            <span className="font-medium">{role.userCount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Permissions:</span>
                            <span className="font-medium">{role.permissions.length}</span>
                          </div>
                        </div>

                        {role.createdAt && !role.isSystem && (
                          <div className="text-xs text-gray-500">
                            Created {new Date(role.createdAt).toLocaleDateString("en-IN")}
                            {role.createdBy && ` by ${role.createdBy}`}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                            className="flex-1 bg-transparent"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {role.isSystem ? "View" : "Edit"}
                          </Button>
                          {!role.isSystem && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRole(role.id)}
                              className="text-red-600 bg-transparent"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              {isEditingUser ? "Edit Team Member" : "Add New Team Member"}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userName">Full Name *</Label>
                  <Input
                    id="userName"
                    value={selectedUser.name}
                    onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="userEmail">Email Address *</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userPhone">Phone Number</Label>
                  <Input
                    id="userPhone"
                    value={selectedUser.phone || ""}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={selectedUser.employeeId || ""}
                    onChange={(e) => setSelectedUser({ ...selectedUser, employeeId: e.target.value })}
                    placeholder="Enter employee ID"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userRole">Role *</Label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(value: any) => {
                      const role = roles.find((r) => r.id === value)
                      setSelectedUser({
                        ...selectedUser,
                        role: value,
                        permissions: role ? [...role.permissions] : [],
                        customRole: role ? !role.isSystem : false,
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <Badge className={`${role.color} text-xs`}>{role.name}</Badge>
                            <span className="text-xs text-gray-500">({role.permissions.length} permissions)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={selectedUser.department || ""}
                    onChange={(e) => setSelectedUser({ ...selectedUser, department: e.target.value })}
                    placeholder="Enter department"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={selectedUser.isActive}
                  onCheckedChange={(checked) => setSelectedUser({ ...selectedUser, isActive: checked })}
                />
                <Label htmlFor="isActive">Active Team Member</Label>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Permissions ({selectedUser.permissions.length})
                </Label>
                <p className="text-sm text-gray-500 mb-4">
                  Permissions are automatically assigned based on the selected role. You can customize them below.
                </p>

                <div className="space-y-6 max-h-80 overflow-y-auto border rounded-lg p-4">
                  {PERMISSION_CATEGORIES.map((category) => (
                    <div key={category.id}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-sm">{category.name}</h4>
                          <p className="text-xs text-gray-500">{category.description}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {category.permissions.filter((p) => selectedUser.permissions.includes(p.id)).length} /{" "}
                          {category.permissions.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                        {category.permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={selectedUser.permissions.includes(permission.id)}
                              onCheckedChange={(checked) => {
                                const updatedPermissions = checked
                                  ? [...selectedUser.permissions, permission.id]
                                  : selectedUser.permissions.filter((p) => p !== permission.id)
                                setSelectedUser({ ...selectedUser, permissions: updatedPermissions })
                              }}
                            />
                            <div className="flex-1">
                              <Label htmlFor={permission.id} className="text-sm font-medium">
                                {permission.name}
                              </Label>
                              <p className="text-xs text-gray-500">{permission.description}</p>
                            </div>
                            <Badge className={`${getLevelColor(permission.level)} text-xs`}>{permission.level}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveUser} disabled={!selectedUser.name || !selectedUser.email}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isEditingUser ? "Update Team Member" : "Add Team Member"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {isEditingRole ? "Edit Custom Role" : "Create Custom Role"}
            </DialogTitle>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="roleName">Role Name *</Label>
                  <Input
                    id="roleName"
                    value={selectedRole.name}
                    onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                    disabled={selectedRole.isSystem}
                    placeholder="Enter role name"
                  />
                </div>
                <div>
                  <Label htmlFor="roleColor">Role Color</Label>
                  <Select
                    value={selectedRole.color}
                    onValueChange={(value) => setSelectedRole({ ...selectedRole, color: value })}
                    disabled={selectedRole.isSystem}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bg-blue-100 text-blue-800">Blue</SelectItem>
                      <SelectItem value="bg-green-100 text-green-800">Green</SelectItem>
                      <SelectItem value="bg-purple-100 text-purple-800">Purple</SelectItem>
                      <SelectItem value="bg-orange-100 text-orange-800">Orange</SelectItem>
                      <SelectItem value="bg-pink-100 text-pink-800">Pink</SelectItem>
                      <SelectItem value="bg-yellow-100 text-yellow-800">Yellow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="roleDescription">Description *</Label>
                <Textarea
                  id="roleDescription"
                  value={selectedRole.description}
                  onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                  placeholder="Describe the role and its responsibilities"
                  rows={3}
                />
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Role Permissions ({selectedRole.permissions.length})
                </Label>
                <p className="text-sm text-gray-500 mb-4">
                  Select the permissions that users with this role should have.
                </p>

                <div className="space-y-6 max-h-80 overflow-y-auto border rounded-lg p-4">
                  {PERMISSION_CATEGORIES.map((category) => (
                    <div key={category.id}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-sm">{category.name}</h4>
                          <p className="text-xs text-gray-500">{category.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {category.permissions.filter((p) => selectedRole.permissions.includes(p.id)).length} /{" "}
                            {category.permissions.length}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const allCategoryPermissions = category.permissions.map((p) => p.id)
                              const hasAll = allCategoryPermissions.every((p) => selectedRole.permissions.includes(p))

                              if (hasAll) {
                                // Remove all category permissions
                                setSelectedRole({
                                  ...selectedRole,
                                  permissions: selectedRole.permissions.filter(
                                    (p) => !allCategoryPermissions.includes(p),
                                  ),
                                })
                              } else {
                                // Add all category permissions
                                const newPermissions = [
                                  ...new Set([...selectedRole.permissions, ...allCategoryPermissions]),
                                ]
                                setSelectedRole({
                                  ...selectedRole,
                                  permissions: newPermissions,
                                })
                              }
                            }}
                            disabled={selectedRole.isSystem}
                            className="text-xs"
                          >
                            {category.permissions.every((p) => selectedRole.permissions.includes(p.id))
                              ? "Unselect All"
                              : "Select All"}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                        {category.permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`role-${permission.id}`}
                              checked={selectedRole.permissions.includes(permission.id)}
                              onCheckedChange={(checked) => {
                                const updatedPermissions = checked
                                  ? [...selectedRole.permissions, permission.id]
                                  : selectedRole.permissions.filter((p) => p !== permission.id)
                                setSelectedRole({ ...selectedRole, permissions: updatedPermissions })
                              }}
                              disabled={selectedRole.isSystem}
                            />
                            <div className="flex-1">
                              <Label htmlFor={`role-${permission.id}`} className="text-sm font-medium">
                                {permission.name}
                              </Label>
                              <p className="text-xs text-gray-500">{permission.description}</p>
                            </div>
                            <Badge className={`${getLevelColor(permission.level)} text-xs`}>{permission.level}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveRole}
                  disabled={selectedRole.isSystem || !selectedRole.name || !selectedRole.description}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isEditingRole ? "Update Role" : "Create Role"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Templates Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Role Templates
            </DialogTitle>
            <p className="text-sm text-gray-500">
              Choose from pre-built role templates to quickly create custom roles for your salon team.
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLE_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleUseTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${template.color}`}>
                      {template.icon === "Crown" && <Crown className="w-5 h-5" />}
                      {template.icon === "Star" && <Star className="w-5 h-5" />}
                      {template.icon === "Briefcase" && <Briefcase className="w-5 h-5" />}
                      {template.icon === "HeadphonesIcon" && <HeadphonesIcon className="w-5 h-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="text-sm">{template.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Permissions:</span>
                      <span className="font-medium">{template.permissions.length}</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {PERMISSION_CATEGORIES.slice(0, 3).map((category) => {
                        const categoryPermissions = category.permissions.filter((p) =>
                          template.permissions.includes(p.id),
                        )
                        if (categoryPermissions.length === 0) return null

                        return (
                          <Badge key={category.id} variant="outline" className="text-xs">
                            {category.name} ({categoryPermissions.length})
                          </Badge>
                        )
                      })}
                      {PERMISSION_CATEGORIES.slice(3).some((category) =>
                        category.permissions.some((p) => template.permissions.includes(p.id)),
                      ) && (
                        <Badge variant="outline" className="text-xs">
                          +more
                        </Badge>
                      )}
                    </div>

                    <Button className="w-full" size="sm">
                      <Copy className="w-4 h-4 mr-2" />
                      Use This Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
