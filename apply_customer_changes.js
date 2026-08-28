const fs = require('fs');

const file = 'app/actions/customers.ts';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  '  notes?: string | null\n  created_at: string',
  '  notes?: string | null\n  tags?: string[] | null\n  preferred_staff_id?: number | null\n  created_at: string'
);

const selectsToReplace = [
  '            c.notes,\n            c.created_at,',
  '            c.notes,\n            c.created_at,'
];

content = content.replaceAll(
  '            c.notes,\n            c.created_at,',
  '            c.notes,\n            c.tags,\n            c.preferred_staff_id,\n            c.created_at,'
);

content = content.replaceAll(
  'c.notes, c.created_at,',
  'c.notes, c.tags, c.preferred_staff_id, c.created_at,'
);

// update customer mapping
content = content.replaceAll(
  'total_spent: Number(customer.total_spent) || 0,',
  'total_spent: Number(customer.total_spent) || 0,\n          tags: typeof customer.tags === "string" ? JSON.parse(customer.tags) : (customer.tags || []),\n          preferred_staff_id: customer.preferred_staff_id ? Number(customer.preferred_staff_id) : null,'
);

// update createCustomer
content = content.replace(
  'const notes = formData.get("notes") as string',
  'const notes = formData.get("notes") as string\n    const tagsStr = formData.get("tags") as string\n    const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()).filter(Boolean) : []\n    const preferredStaffIdStr = formData.get("preferred_staff_id") as string\n    const preferredStaffId = preferredStaffIdStr ? Number(preferredStaffIdStr) : null'
);

content = content.replace(
  '        notes,\n        tenant_id,',
  '        notes,\n        tags,\n        preferred_staff_id,\n        tenant_id,'
);

content = content.replace(
  '        ${notes || null},\n        ${tenantId},',
  '        ${notes || null},\n        ${JSON.stringify(tags)},\n        ${preferredStaffId},\n        ${tenantId},'
);

// update createCustomerData interface
content = content.replace(
  '  notes?: string\n}',
  '  notes?: string\n  tags?: string[]\n  preferred_staff_id?: number | null\n}'
);

content = content.replace(
  '        notes,\n        tenant_id,\n        created_at,',
  '        notes,\n        tags,\n        preferred_staff_id,\n        tenant_id,\n        created_at,'
);

content = content.replace(
  '        ${customerData.notes || null},\n        ${tenantId},\n        NOW(),',
  '        ${customerData.notes || null},\n        ${JSON.stringify(customerData.tags || [])},\n        ${customerData.preferred_staff_id || null},\n        ${tenantId},\n        NOW(),'
);


// updateCustomer
content = content.replace(
  '    notes?: string\n  }',
  '    notes?: string\n    tags?: string[]\n    preferred_staff_id?: number | null\n  }'
);

content = content.replace(
  '        notes = COALESCE(${customerData.notes}, notes),\n        updated_at = NOW()',
  '        notes = COALESCE(${customerData.notes}, notes),\n        tags = COALESCE(${customerData.tags ? JSON.stringify(customerData.tags) : null}::jsonb, tags),\n        preferred_staff_id = COALESCE(${customerData.preferred_staff_id}, preferred_staff_id),\n        updated_at = NOW()'
);


fs.writeFileSync(file, content);
console.log('customers.ts updated successfully');
