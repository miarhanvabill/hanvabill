const fs = require('fs');

function fix(file, regex, replace) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(regex, replace);
  fs.writeFileSync(file, content);
}

fix('app/manage/products/page.tsx', /barcode: product\.barcode,/, 'barcode: product.barcode || "",\n      image_url: product.image_url || "",');
fix('app/manage/packages/page.tsx', /is_multi_branch: pkg\.is_multi_branch,/, 'is_multi_branch: pkg.is_multi_branch ?? true,\n      image_url: pkg.image_url || "",');
fix('app/manage/memberships/page.tsx', /is_multi_branch: plan\.is_multi_branch,/, 'is_multi_branch: plan.is_multi_branch ?? true,\n      image_url: plan.image_url || "",');
