"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import {
  Settings,
  Package,
  ShoppingBag,
  Upload,
  Download,
  Tags,
  Truck,
  BarChart3,
  Search,
  Users,
  IndianRupee,
  Shield,
  TrendingUp,
  Calendar,
  Star,
  Bell,
  Zap,
  CreditCard,
  MessageSquare,
  Ticket,
  Gift,
  Crown,
  History,
  Wallet,
  FileText,
  Store,
  Globe,
} from "lucide-react"

const catalogSections = [
  {
    title: "Services",
    description:
      "Add, edit, and update the services you offer, which will display in your online menu and reflect in billing, ensuring easy management and organization.",
    icon: Settings,
    href: "/services",
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Packages",
    description: "Create and manage service bundles to provide clients with great value and options.",
    icon: ShoppingBag,
    href: "/manage/packages",
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Import and Export",
    description: "Quickly import and export customer, service, product, and booking data for efficient management.",
    icon: Upload,
    href: "/manage/import-export",
    color: "bg-purple-50 text-purple-600",
  },
]

const inventorySections = [
  {
    title: "Products",
    description:
      "Keep track of your products and stock, ensuring everything is well-stocked and organized. You can also add, edit, and update products available for sale both online and in-store.",
    icon: Package,
    href: "/manage/products",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Product Category",
    description: "Helps you monitor and manage all stock details, ensuring proper organization and availability.",
    icon: Tags,
    href: "/manage/categories",
    color: "bg-pink-50 text-pink-600",
  },
  {
    title: "Inventory Receipts",
    description:
      "Track incoming stock with product details, quantities, suppliers, and dates to keep your inventory updated and organized.",
    icon: Download,
    href: "/manage/receipts",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    title: "Inventory Adjustments",
    description:
      "Easily update stock levels to account for damages, losses, or corrections, ensuring accurate inventory management.",
    icon: BarChart3,
    href: "/manage/adjustments",
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    title: "Vendors",
    description:
      "Easily update stock levels to account for damages, losses, or corrections, ensuring accurate inventory management.",
    icon: Truck,
    href: "/manage/vendors",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Auto Product Consumption",
    description:
      "Automatically deduct products from inventory based on bookings or services rendered for real-time stock updates and preventing shortages.",
    icon: Settings,
    href: "/manage/auto-consumption",
    color: "bg-red-50 text-red-600",
  },
]

const staffSections = [
  {
    title: "Staff Management",
    description:
      "Track employee details, schedules, and salary information. You can also manage app access, edit their data, assign roles, and reorder employees as needed.",
    icon: Users,
    href: "/manage/staff",
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Commission Profiles",
    description: "Define and manage commission structures for your team based on sales and performance.",
    icon: IndianRupee,
    href: "/manage/commissions",
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Roles & Permissions",
    description: "Set different access levels for staff, ensuring everyone has the right permissions for their roles.",
    icon: Shield,
    href: "/user-management",
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Attendance & Time Tracking",
    description: "Mark daily staff check-ins, check-outs, and monitor attendance history to track working hours.",
    icon: Calendar,
    href: "/attendance",
    color: "bg-teal-50 text-teal-600",
    badge: true,
  },
  {
    title: "Staff Revenue Goals",
    description: "Set clear revenue targets for staff to encourage performance and growth.",
    icon: TrendingUp,
    href: "/manage/goals",
    color: "bg-orange-50 text-orange-600",
    badge: true,
  },
  {
    title: "Staff Availability",
    description: "Easily set and manage staff availability to optimize scheduling.",
    icon: Calendar,
    href: "/manage/availability",
    color: "bg-pink-50 text-pink-600",
  },
]

const retentionSections = [
  {
    title: "Coupons",
    description: "Create and manage discount coupons to boost sales and attract more clients.",
    icon: Ticket,
    href: "/manage/coupons",
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    title: "Loyalty Program",
    description: "Reward loyal customers with points and cashback, encouraging repeat visits.",
    icon: Star,
    href: "/manage/loyalty",
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Gift Cards",
    description:
      "Offer gift cards as a great gifting option for customers, helping to market your business and provide a convenient gift choice.",
    icon: Gift,
    href: "/manage/gift-cards",
    color: "bg-green-50 text-green-600",
    badge: true,
  },
  {
    title: "Membership",
    description: "Offer membership plans with exclusive benefits for returning clients.",
    icon: Crown,
    href: "/manage/memberships",
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Loyalty Transactions",
    description: "Track all transactions made using loyalty points for accurate customer rewards.",
    icon: History,
    href: "/manage/loyalty-transactions",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Wallets",
    description: "Track customer wallet balances and transactions, with options to easily add or deduct amounts.",
    icon: Wallet,
    href: "/manage/wallet",
    color: "bg-pink-50 text-pink-600",
  },
]

const miscellaneousSections = [
  {
    title: "Resource Availability",
    description:
      "Check the availability of staff, rooms, and equipment in real-time to optimize scheduling and ensure seamless operations.",
    icon: Zap,
    href: "/manage/resources",
    color: "bg-cyan-50 text-cyan-600",
    badge: true,
  },
  {
    title: "Cash Registers",
    description:
      "Manage and track your salon's point-of-sale (POS) systems. View transactions, monitor cash flow, and ensure accurate financial records for smooth operations.",
    icon: CreditCard,
    href: "/cash-registers",
    color: "bg-indigo-50 text-indigo-600",
    badge: true,
  },
  {
    title: "Digital Forms Builder",
    description:
      "Create custom digital forms, questionnaires, and consent agreements using a drag-and-drop builder to collect structured data from your customers.",
    icon: FileText,
    href: "/manage/forms-builder",
    color: "bg-emerald-50 text-emerald-600",
    badge: true,
  },
  {
    title: "Consent Forms",
    description:
      "Securely stores customer consents for services, policies, and marketing, ensuring compliance and trust.",
    icon: FileText,
    href: "/forms",
    color: "bg-red-50 text-red-600",
    badge: true,
  },
]

const integrationSections = [
  {
    title: "WhatsApp Configuration",
    description:
      "Configure your entire Meta WhatsApp integration directly from Zylu, and manage details about your WhatsApp setup, plan, and billing.",
    icon: MessageSquare,
    href: "/manage/whatsapp-config",
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Payment Configuration",
    description: "Connect your preferred payment gateway to accept online payments with ease.",
    icon: CreditCard,
    href: "/manage/payment-config",
    color: "bg-blue-50 text-blue-600",
    badge: true,
  },
]

const reportsSections = [
  {
    title: "Store Performance",
    description: "Comprehensive analytics and performance metrics for the store, including revenue growth, leaderboards, and quarterly results.",
    icon: BarChart3,
    href: "/manage/store-performance",
    color: "bg-indigo-50 text-indigo-600",
    badge: true,
  }
]

const storeOnlineSections = [
  {
    title: "Plans & Billing",
    description:
      "View your subscription plan details, track payments, see what's included in your plan, and upgrade as needed for smooth billing.",
    icon: FileText,
    href: "/manage/billing",
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Store Settings",
    description:
      "Add business details, set tax preferences, manage availability, update your address, and include descriptions and review links. This ensures your online and offline presence is fully customized.",
    icon: Store,
    href: "/manage/store-settings",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Mini Website",
    description:
      "Create and manage your smart link, which acts like your own website. Showcase services, products, and packages, allowing customers to book directly online and enhancing availability across platforms.",
    icon: Globe,
    href: "/manage/mini-website",
    color: "bg-cyan-50 text-cyan-600",
  },
]

const additionalSections = [
  {
    title: "Review Questions",
    description: "View customer feedback to improve services and attract new clients.",
    icon: Star,
    href: "/reviews",
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    title: "Notification Center",
    description:
      "Manage your notifications effortlessly. View the history of all notifications, check their delivery status, and enable or disable notification channels to control how updates are received.",
    icon: Bell,
    href: "/notifications",
    color: "bg-red-50 text-red-600",
  },
]

export default function ManagePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const handleCardClick = (section: any) => {
    // Show loading toast
    toast({
      title: "Loading...",
      description: `Opening ${section.title}`,
    })

    // Navigate to the appropriate route
    if (section.href) {
      router.push(section.href)
    } else {
      // For sections without specific routes, show a coming soon message
      toast({
        title: "Coming Soon",
        description: `${section.title} functionality will be available soon.`,
        variant: "default",
      })
    }
  }

  const allSections = [
    ...catalogSections,
    ...inventorySections,
    ...staffSections,
    ...retentionSections,
    ...miscellaneousSections,
    ...integrationSections,
    ...storeOnlineSections,
    ...reportsSections,
    ...additionalSections,
  ]

  const filteredSections = allSections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Manage"
        subtitle="Comprehensive management tools for your salon operations, inventory, and services."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Search */}
          <Card>
            <CardContent className="p-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search menus..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {searchQuery ? (
            /* Search Results */
            <div>
              <h2 className="text-xl font-semibold mb-4">Search Results ({filteredSections.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSections.map((section) => (
                  <Card
                    key={section.title}
                    className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105"
                    onClick={() => handleCardClick(section)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                          <section.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{section.title}</CardTitle>
                            {section.badge && (
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Update all section cards with onClick handlers */}
              {/* Catalogue Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Catalogue</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catalogSections.map((section) => (
                    <Card
                      key={section.title}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105"
                      onClick={() => handleCardClick(section)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                            <section.icon className="w-6 h-6" />
                          </div>
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Inventory Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Inventory</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inventorySections.map((section) => (
                    <Card
                      key={section.title}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105"
                      onClick={() => handleCardClick(section)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                            <section.icon className="w-6 h-6" />
                          </div>
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Staff Management Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Staff Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {staffSections.map((section) => (
                    <Card
                      key={section.title}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105"
                      onClick={() => handleCardClick(section)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                            <section.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{section.title}</CardTitle>
                              {section.badge && (
                                <Badge variant="secondary" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Retention Tools Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Retention Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {retentionSections.map((section) => (
                    <Card
                      key={section.title}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105"
                      onClick={() => handleCardClick(section)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                            <section.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{section.title}</CardTitle>
                              {section.badge && (
                                <Badge variant="secondary" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Miscellaneous Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Miscellaneous</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {miscellaneousSections.map((section) => (
                    <Card
                      key={section.title}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105"
                      onClick={() => handleCardClick(section)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                            <section.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{section.title}</CardTitle>
                              {section.badge && (
                                <Badge variant="secondary" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Integrations Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Integrations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {integrationSections.map((section) => (
                    <Card
                      key={section.title}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105"
                      onClick={() => handleCardClick(section)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                            <section.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{section.title}</CardTitle>
                              {section.badge && (
                                <Badge variant="secondary" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Store & Online Presence Section */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Store & Online Presence</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {storeOnlineSections.map((section) => (
                    <Card
                      key={section.title}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105"
                      onClick={() => handleCardClick(section)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                            <section.icon className="w-6 h-6" />
                          </div>
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Reports & Analytics */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Reports & Analytics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {reportsSections.map((section) => (
                    <Card
                      key={section.title}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105"
                      onClick={() => handleCardClick(section)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                            <section.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{section.title}</CardTitle>
                              {section.badge && (
                                <Badge variant="secondary" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Additional Features */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Additional Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {additionalSections.map((section) => (
                  <Card
                    key={section.title}
                    className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105"
                    onClick={() => handleCardClick(section)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                          <section.icon className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
