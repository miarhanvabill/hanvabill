const fs = require('fs');
const file = 'components/checkout-screen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  'import { getBusinessSettings } from "@/app/actions/settings"',
  'import { getBusinessSettings } from "@/app/actions/settings"\nimport { getActiveCustomerMembership } from "@/app/actions/memberships"'
);

// Add state
content = content.replace(
  'const [discountPercent, setDiscountPercent] = useState<number>(0)',
  'const [discountPercent, setDiscountPercent] = useState<number>(0)\n  const [activeMembership, setActiveMembership] = useState<any>(null)'
);

// Add fetch
content = content.replace(
  'useEffect(() => {\n    refreshLoyalty()\n  }, [refreshLoyalty])',
  `useEffect(() => {
    refreshLoyalty()
    // Fetch membership
    getActiveCustomerMembership(customer.id).then((mem) => {
      if (mem) {
        setActiveMembership(mem)
        setDiscountPercent(mem.discount_percentage || 0)
      }
    }).catch(console.error)
  }, [refreshLoyalty, customer.id])`
);

// Add UI badge for membership
content = content.replace(
  '<p className="font-semibold">{customer.name}</p>',
  `<p className="font-semibold flex items-center gap-2">
              {customer.name}
              {activeMembership && (
                <Badge className="bg-gold-100 text-gold-800 border-gold-300 hover:bg-gold-200">
                  <Star className="w-3 h-3 mr-1" />
                  {activeMembership.plan_name} Active
                </Badge>
              )}
            </p>`
);

fs.writeFileSync(file, content);
