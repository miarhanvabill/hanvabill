const fs = require('fs');
const path = require('path');

const apiReportsDir = path.join(__dirname, 'app/api/reports');
const folders = fs.readdirSync(apiReportsDir).filter(f => fs.statSync(path.join(apiReportsDir, f)).isDirectory());

for (const folder of folders) {
  const routePath = path.join(apiReportsDir, folder, 'route.ts');
  if (fs.existsSync(routePath)) {
    let content = fs.readFileSync(routePath, 'utf8');

    // Replace the standard days calculation
    content = content.replace(
      /const days = dateRange === "Last 7 Days" \? 7 : dateRange === "Last 30 Days" \? 30 : 90/,
      `let days = 30;
      if (dateRange === "Today") days = 0;
      else if (dateRange === "Yesterday") days = 1;
      else if (dateRange === "Last 7 Days" || dateRange === "This Week") days = 7;
      else if (dateRange === "Last 30 Days" || dateRange === "This Month") days = 30;
      else if (dateRange === "Last 90 Days" || dateRange === "Last 3 Months") days = 90;
      else if (dateRange === "Last 6 Months") days = 180;
      else if (dateRange === "Last 12 Months" || dateRange === "This Year") days = 365;`
    );

    // Some use switch statement (like sales and summary)
    content = content.replace(
      /switch \(dateRange\) {\n\s*case "Today":\n\s*startDate.setHours\(0, 0, 0, 0\)\n\s*break/,
      `switch (dateRange) {
        case "Today":
          startDate.setHours(0, 0, 0, 0)
          break
        case "Yesterday":
          startDate.setDate(startDate.getDate() - 1)
          startDate.setHours(0, 0, 0, 0)
          break`
    );

    fs.writeFileSync(routePath, content);
  }
}
