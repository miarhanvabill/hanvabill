sed -i '' -e 's/import { getCustomers, deleteCustomer/import { deleteCustomer/g' app/customers/page.tsx
sed -i '' -e '/import { deleteCustomer/a\
import { getCustomersPaginated } from "@/app/actions/customers-paginated"
' app/customers/page.tsx
