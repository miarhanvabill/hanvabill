  const mapTenantUserToUser = (tu: TenantUser): User => ({
    id: tu.id,
    name: tu.name,
    email: tu.email || "",
    phone: tu.phone || "",
    role: tu.role_id || "customer_service",
    permissions: [],
    isActive: tu.is_active,
    createdAt: tu.created_at,
    avatar: tu.avatar_url || undefined,
  })

  useEffect(() => {
    async function loadUsers() {
      try {
        const tenantUsers = await getTenantUsers()
        setUsers(tenantUsers.map(mapTenantUserToUser))
      } catch (error) {
        console.error("Failed to load users:", error)
      }
    }
    loadUsers()

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
        userCount: 0,
        createdAt: "2024-01-01",
        createdBy: "Admin User",
      })),
    ]
    setRoles(mockRoles)
    setLoading(false)
  }, [])
