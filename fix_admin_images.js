const fs = require('fs');

function patchAction(file, tableName, extraFields) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('image_url?: string')) return; // already patched

  content = content.replace(/barcode: string/g, 'barcode: string\n    image_url?: string');
  content = content.replace(/is_active: boolean\n  }/g, 'is_active: boolean\n    image_url?: string\n  }');
  content = content.replace(/is_multi_branch: boolean\n  }/g, 'is_multi_branch: boolean\n    image_url?: string\n  }');
  content = content.replace(/is_transferable: boolean\n  }/g, 'is_transferable: boolean\n    image_url?: string\n  }');
  content = content.replace(/is_multi_branch: boolean/g, 'is_multi_branch: boolean\n  image_url?: string');
  
  if (tableName === 'products') {
    content = content.replace(/is_active\n      \)/g, 'is_active, image_url\n      )');
    content = content.replace(/\$\{data\.barcode\}, \$\{data\.is_active\}\n      \)/g, '${data.barcode}, ${data.is_active}, ${data.image_url || null}\n      )');
    content = content.replace(/is_active = \$\{data\.is_active\},/g, 'is_active = ${data.is_active},\n        image_url = ${data.image_url || null},');
  } else if (tableName === 'service_packages') {
    content = content.replace(/is_multi_branch\n      \)/g, 'is_multi_branch, image_url\n      )');
    content = content.replace(/\$\{data\.is_multi_branch\}\n      \)/g, '${data.is_multi_branch}, ${data.image_url || null}\n      )');
    content = content.replace(/is_multi_branch = \$\{data\.is_multi_branch\},/g, 'is_multi_branch = ${data.is_multi_branch},\n        image_url = ${data.image_url || null},');
  } else if (tableName === 'membership_plans') {
    content = content.replace(/is_multi_branch\n      \)/g, 'is_multi_branch, image_url\n      )');
    content = content.replace(/\$\{data\.is_multi_branch\}\n      \)/g, '${data.is_multi_branch}, ${data.image_url || null}\n      )');
    content = content.replace(/is_multi_branch = \$\{data\.is_multi_branch\},/g, 'is_multi_branch = ${data.is_multi_branch},\n        image_url = ${data.image_url || null},');
  }

  fs.writeFileSync(file, content);
}

patchAction('app/actions/products.ts', 'products');
patchAction('app/actions/packages.ts', 'service_packages');
patchAction('app/actions/memberships.ts', 'membership_plans');

function patchUI(file, initData) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('image_url: ""')) return;

  // Add to formData state
  content = content.replace(initData, initData + '\n    image_url: "",');

  // Add to editing form init
  if (file.includes('products')) {
    content = content.replace(/barcode: product\.barcode \|\| "",/g, 'barcode: product.barcode || "",\n      image_url: product.image_url || "",');
  } else if (file.includes('packages')) {
    content = content.replace(/is_multi_branch: pkg\.is_multi_branch ?? true,/g, 'is_multi_branch: pkg.is_multi_branch ?? true,\n      image_url: pkg.image_url || "",');
  } else if (file.includes('memberships')) {
    content = content.replace(/is_multi_branch: plan\.is_multi_branch ?? true,/g, 'is_multi_branch: plan.is_multi_branch ?? true,\n      image_url: plan.image_url || "",');
  }

  // Add UI input field before final closing div of form grid
  const inputBlock = `
              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>
`;
  // Just find a good spot, e.g. after description textarea
  content = content.replace(/<Textarea\n([^\/]*)\/>\n              <\/div>/, `<Textarea\n$1/>\n              </div>${inputBlock}`);

  fs.writeFileSync(file, content);
}

patchUI('app/manage/products/page.tsx', 'description: "",');
patchUI('app/manage/packages/page.tsx', 'description: "",');
patchUI('app/manage/memberships/page.tsx', 'description: "",');

console.log('done');
