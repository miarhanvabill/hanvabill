const fs = require('fs');
const file = 'app/inventory/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Interface
content = content.replace(
  '  description?: string\n  min_stock_level: number',
  '  description?: string\n  image_url?: string\n  min_stock_level: number'
);

// 2. addFormData state
content = content.replace(
  '    description: "",\n  })',
  '    description: "",\n    image_url: "",\n  })'
);

// 3. handleAddItem payload
content = content.replace(
  '          min_stock_level: minStockLevel,\n          description: addFormData.description?.trim() || null,\n        }),',
  '          min_stock_level: minStockLevel,\n          description: addFormData.description?.trim() || null,\n          image_url: addFormData.image_url?.trim() || null,\n        }),'
);

// 4. reset form inside handleAddItem
content = content.replace(
  '          min_stock_level: "",\n          description: "",\n        })',
  '          min_stock_level: "",\n          description: "",\n          image_url: "",\n        })'
);

// 5. handleEditItem payload
content = content.replace(
  '          min_stock_level: minStockLevel,\n          description: addFormData.description?.trim() || null,\n        }),',
  '          min_stock_level: minStockLevel,\n          description: addFormData.description?.trim() || null,\n          image_url: addFormData.image_url?.trim() || null,\n        }),'
);

// 6. reset form inside handleEditItem and resetForm function
content = content.replace(
  /min_stock_level: "",\s*description: "",\s*}/g,
  'min_stock_level: "",\n          description: "",\n          image_url: "",\n        }'
);

// 7. openEditDialog
content = content.replace(
  '      min_stock_level: item.min_stock_level.toString(),\n      description: item.description || "",\n    })',
  '      min_stock_level: item.min_stock_level.toString(),\n      description: item.description || "",\n      image_url: item.image_url || "",\n    })'
);

// 9. Show image in the table
const imageHtml = `{item.image_url ? (
                                  <div className="h-10 w-10 overflow-hidden rounded bg-gray-100 flex-shrink-0">
                                    <img src={item.image_url} alt={item.item_name} className="h-full w-full object-cover" />
                                  </div>
                                ) : (
                                  <div className={\`p-2 rounded \${getCategoryColor(item.category)}\`}>
                                    <Package className="h-4 w-4 text-white" />
                                  </div>
                                )}`;
                                
content = content.replace(
  '<div className={`p-2 rounded ${getCategoryColor(item.category)}`}>\n                                  <Package className="h-4 w-4 text-white" />\n                                </div>',
  imageHtml
);

fs.writeFileSync(file, content);
