const fs = require('fs');
let code = fs.readFileSync('app/settings/page.tsx', 'utf8');

// 1. Remove Cover Image section
const coverImageRegex = /<div className="space-y-4">\s*<Label>Cover Image<\/Label>[\s\S]*?<\/div>\s*<\/div>/;
code = code.replace(
  coverImageRegex,
  `</div>` // We just keep the closing div for the grid
);

code = code.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 gap-6">\s*<div className="space-y-4">\s*<Label>Business Logo<\/Label>\s*<div className="flex items-center space-x-4">\s*<div className="space-y-2">\s*<Button variant="outline" size="sm">\s*<Upload className="w-4 h-4 mr-2" \/>\s*Upload Logo\s*<\/Button>\s*<Button variant="outline" size="sm" className="text-red-600 bg-transparent">\s*<Trash2 className="w-4 h-4 mr-2" \/>\s*Remove\s*<\/Button>\s*<\/div>\s*<\/div>\s*<p className="text-xs text-gray-500">Recommended: 200x200px, PNG or JPG<\/p>\s*<\/div>/,
  `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Business Logo</Label>
                  <div className="flex items-center space-x-4">
                    {settings?.profile?.logo && (
                      <img 
                        src={settings.profile.logo} 
                        alt="Business Logo" 
                        className="w-16 h-16 object-contain border border-slate-200 rounded p-1" 
                      />
                    )}
                    <div className="space-y-2">
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (e) => {
                                setSettings({
                                  ...settings,
                                  profile: { ...settings.profile, logo: e.target?.result as string }
                                })
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                        <Button variant="outline" size="sm" className="pointer-events-none">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </Button>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 bg-transparent"
                        onClick={() => {
                          setSettings({
                            ...settings,
                            profile: { ...settings.profile, logo: "" }
                          })
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Recommended: 200x200px, PNG or JPG</p>
                </div>`
);

fs.writeFileSync('app/settings/page.tsx', code);
