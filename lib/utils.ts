import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBookingTime(time: string | null | undefined): string {
  if (!time) return "--:--"
  const str = String(time).trim()
  if (str.includes("AM") || str.includes("PM") || str.includes("am") || str.includes("pm")) {
    return str
  }
  const parts = str.split(":")
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10)
    const mins = parts[1].padStart(2, "0")
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? "PM" : "AM"
      const h12 = hours % 12 || 12
      return `${h12}:${mins} ${ampm}`
    }
  }
  return str
}

export function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header]
      const stringVal = Array.isArray(val) ? val.join(" | ") : String(val || '');
      return `"${stringVal.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
