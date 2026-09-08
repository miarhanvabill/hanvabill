// lib/permissions-constants.ts
// Pure constants file safe to import in both client ("use client") and server contexts.

export const ALL_SYSTEM_PERMISSIONS = [
  "dashboard.view", "dashboard.analytics", "dashboard.export",
  "customers.view", "customers.create", "customers.edit", "customers.delete", "customers.export", "customers.import",
  "bookings.view", "bookings.create", "bookings.edit", "bookings.cancel", "bookings.reschedule", "bookings.bulk_operations",
  "sales.view", "sales.create", "sales.refund", "sales.discount", "sales.void", "sales.reports",
  "inventory.view", "inventory.manage", "inventory.adjust", "inventory.purchase", "inventory.suppliers",
  "staff.view", "staff.create", "staff.edit", "staff.delete", "staff.schedules", "staff.payroll",
  "reports.view", "reports.advanced", "reports.export", "reports.financial", "reports.custom",
  "settings.view", "settings.edit", "settings.backup", "settings.integrations",
  "users.view", "users.create", "users.edit", "users.delete", "users.roles", "users.permissions",
  "services.view", "services.create", "services.edit", "services.delete",
  "marketing.view", "marketing.manage",
  "reviews.view", "reviews.manage"
]

export const STAFF_DEFAULT_PERMISSIONS = [
  "dashboard.view",
  "bookings.view",
  "bookings.create",
  "bookings.edit",
  "customers.view",
  "customers.create",
  "sales.view",
  "sales.create",
  "services.view",
]

export const MANAGER_DEFAULT_PERMISSIONS = [
  "dashboard.view", "dashboard.analytics",
  "customers.view", "customers.create", "customers.edit", "customers.export",
  "bookings.view", "bookings.create", "bookings.edit", "bookings.cancel", "bookings.reschedule",
  "sales.view", "sales.create", "sales.discount", "sales.reports",
  "inventory.view", "inventory.manage", "inventory.adjust",
  "staff.view", "staff.schedules",
  "services.view",
  "reports.view",
  "reviews.view",
]
