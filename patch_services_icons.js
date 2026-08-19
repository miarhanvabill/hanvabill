const fs = require('fs');
let code = fs.readFileSync('app/services/page.tsx', 'utf8');

// 1. Add more icons
if (!code.includes('Wand2')) {
  code = code.replace(
    /Upload,/,
    `Upload,\n  Wand2,\n  Smile,\n  Droplets,\n  Flower2,\n  Activity,\n  Wind,\n  Flame,\n  Leaf,`
  );
}

// 2. Add smart mapping function
const smartMapper = `
function getSmartIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("massage") || n.includes("spa") || n.includes("therapy")) return { icon: Activity, color: "bg-orange-500" };
  if (n.includes("facial") || n.includes("face") || n.includes("cleanse") || n.includes("scrub") || n.includes("glow")) return { icon: Smile, color: "bg-pink-500" };
  if (n.includes("bleach") || n.includes("dtan") || n.includes("whitening")) return { icon: Sparkles, color: "bg-yellow-500" };
  if (n.includes("hair") || n.includes("shave") || n.includes("cut") || n.includes("trim")) return { icon: Scissors, color: "bg-blue-500" };
  if (n.includes("color") || n.includes("dye") || n.includes("highlight")) return { icon: Palette, color: "bg-purple-500" };
  if (n.includes("wax") || n.includes("thread") || n.includes("remove")) return { icon: Flame, color: "bg-red-500" };
  if (n.includes("nail") || n.includes("pedicure") || n.includes("manicure")) return { icon: Flower2, color: "bg-green-500" };
  if (n.includes("wash") || n.includes("shampoo")) return { icon: Droplets, color: "bg-cyan-500" };
  if (n.includes("oil") || n.includes("head") || n.includes("cooling")) return { icon: Wind, color: "bg-teal-500" };
  if (n.includes("herbal") || n.includes("natural")) return { icon: Leaf, color: "bg-emerald-500" };
  
  return { icon: Wand2, color: "bg-indigo-500" };
}
`;

if (!code.includes('getSmartIcon')) {
  code = code.replace(
    /export default function ServicesPage/,
    smartMapper + '\nexport default function ServicesPage'
  );
}

// 3. Update the rendering of the card header
const oldCardHeader = `<div className={\`p-2 rounded-lg \${category?.color || "bg-gray-500"}\`}>
                          {category?.icon && <category.icon className="h-5 w-5 text-white" />}
                        </div>`;

const newCardHeader = `                        <div className={\`p-2 rounded-lg \${getSmartIcon(service.name).color}\`}>
                          {(() => {
                            const SmartIcon = getSmartIcon(service.name).icon;
                            return <SmartIcon className="h-5 w-5 text-white" />;
                          })()}
                        </div>`;

code = code.replace(oldCardHeader, newCardHeader);

fs.writeFileSync('app/services/page.tsx', code);
