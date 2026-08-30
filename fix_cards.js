const fs = require('fs');
let code = fs.readFileSync('components/service-selection-screen.tsx', 'utf8');

// Services
code = code.replace(
  '<Card key={sv.id} className="hover:shadow-md transition-shadow">',
  `<Card key={sv.id} className="hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  {sv.image_url && (
                    <div className="h-40 w-full shrink-0 border-b relative bg-muted">
                      <img src={sv.image_url} alt={sv.name} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  )}`
);
code = code.replace(
  '{itemType === "service" &&\n              filteredServices.map((sv) => (\n                <Card key={sv.id} className="hover:shadow-md transition-shadow overflow-hidden flex flex-col">\n                  {sv.image_url && (\n                    <div className="h-40 w-full shrink-0 border-b relative bg-muted">\n                      <img src={sv.image_url} alt={sv.name} className="absolute inset-0 w-full h-full object-cover" />\n                    </div>\n                  )}\n                  <CardContent className="p-4 space-y-3">',
  `{itemType === "service" &&
              filteredServices.map((sv) => (
                <Card key={sv.id} className="hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  {sv.image_url && (
                    <div className="h-40 w-full shrink-0 border-b relative bg-muted">
                      <img src={sv.image_url} alt={sv.name} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col">`
);


// Products
code = code.replace(
  '<Card key={p.id} className="hover:shadow-md transition-shadow">',
  `<Card key={p.id} className="hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  {p.image_url && (
                    <div className="h-40 w-full shrink-0 border-b relative bg-muted">
                      <img src={p.image_url} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  )}`
);

// Packages
code = code.replace(
  'className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"',
  `className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 overflow-hidden flex flex-col"\n                  >\n                    {pkg.image_url && (\n                      <div className="h-40 w-full shrink-0 border-b relative bg-muted">\n                        <img src={pkg.image_url} alt={pkg.name} className="absolute inset-0 w-full h-full object-cover" />\n                      </div>\n                    )}`
);

// Memberships
code = code.replace(
  'className={`hover:shadow-lg transition-all duration-200 border-2 ${',
  `className={\`hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col border-2 \${`
);
code = code.replace(
  '                  > (m)',
  `                  >\n                    {m.image_url && (\n                      <div className="h-40 w-full shrink-0 border-b relative bg-muted">\n                        <img src={m.image_url} alt={m.name} className="absolute inset-0 w-full h-full object-cover" />\n                      </div>\n                    )}`
);

fs.writeFileSync('components/service-selection-screen.tsx', code);
