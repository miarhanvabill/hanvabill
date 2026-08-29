sed -i '' -e 's/export async function getCustomers(): Promise<Customer\[\]> {/export async function getCustomers(search?: string, offset: number = 0, limit: number = 100): Promise<Customer[]> {/g' app/actions/customers.ts
sed -i '' -e 's/`customers:all:${tenantId}`/`customers:all:${tenantId}:${search || ""}:${offset}:${limit}`/g' app/actions/customers.ts
