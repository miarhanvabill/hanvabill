const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, 'app/reports');
const folders = fs.readdirSync(reportsDir).filter(f => fs.statSync(path.join(reportsDir, f)).isDirectory());

for (const folder of folders) {
  const pagePath = path.join(reportsDir, folder, 'page.tsx');
  if (fs.existsSync(pagePath)) {
    let content = fs.readFileSync(pagePath, 'utf8');

    // 1. Add import for downloadCSV if not exists
    if (!content.includes('downloadCSV')) {
      content = content.replace(
        /import \{ Download,/,
        `import { downloadCSV } from "@/lib/utils"\nimport { Download,`
      );
      if (!content.includes('downloadCSV')) {
         content = content.replace(
           /import \{ Download/,
           `import { downloadCSV } from "@/lib/utils"\nimport { Download`
         );
      }
    }

    // 2. Find the state variable for the report data to download
    // Examples: setBookings, setInventory, setSalesData, setAnalytics, setAdjustments, setPaymentData, setStaffData
    let dataVarMatch = content.match(/const \[(\w+), set\w+\] = useState<.*?\[\]>\(\[\]\)/) || 
                       content.match(/const \[(\w+), set\w+\] = useState<.*?Data \| null>\(null\)/);
    
    // For summary report
    if (folder === 'summary') dataVarMatch = content.match(/const \[(\w+), set\w+\] = useState<SummaryData \| null>\(null\)/);
    
    let dataVar = dataVarMatch ? dataVarMatch[1] : null;

    if (!dataVar && folder === 'revenue-analysis') dataVar = 'revenueData';
    if (!dataVar && folder === 'customer-analytics') dataVar = 'analytics';

    // 3. Add onClick to Download button
    if (dataVar) {
      // If it's an object like analytics or summaryData, we might need to handle it specially, but usually we just want to download the main array.
      let arrayToDownload = dataVar;
      if (folder === 'customer-analytics') arrayToDownload = `${dataVar} ? ${dataVar}.topCustomers : []`;
      if (folder === 'summary') arrayToDownload = `${dataVar} ? [${dataVar}.revenue, ${dataVar}.bookings, ${dataVar}.customers, ${dataVar}.inventory, ${dataVar}.profit] : []`;
      if (folder === 'staff-performance' || folder === 'staff-productivity') arrayToDownload = 'staffData';
      
      content = content.replace(
        /<Button( className="gap-2 bg-black text-white hover:bg-gray-800")?>\s*<Download className="w-4 h-4" \/>\s*(Download|Export)\s*<\/Button>/g,
        `<Button className="gap-2 bg-black text-white hover:bg-gray-800" onClick={() => downloadCSV(${arrayToDownload}, '${folder}-report.csv')}>
                    <Download className="w-4 h-4" />
                    $2
                  </Button>`
      );
    }

    // 4. Add Today and Yesterday to Select options
    // Find the date Range select content
    const selectContentMatch = /<SelectContent>([\s\S]*?)<\/SelectContent>/;
    if (selectContentMatch.test(content) && content.includes('setDateRange')) {
      content = content.replace(
        /<SelectContent>/,
        `<SelectContent>\n                      <SelectItem value="Today">Today</SelectItem>\n                      <SelectItem value="Yesterday">Yesterday</SelectItem>`
      );
    }

    fs.writeFileSync(pagePath, content);
    console.log(`Patched ${folder}/page.tsx`);
  }
}
