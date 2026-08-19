const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

const downloadLogic = `
      // Capture the invoice template DOM element
      const element = document.getElementById('invoice-template-wrapper');
      if (!element) {
        throw new Error('Invoice template not found');
      }
      
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: \`invoice-\${invoice.id}.pdf\`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().from(element).set(opt).save();
`;

code = code.replace(
  /      \/\/ Force window\.print\(\) for download as well to get the perfect Tailwind layout\n\s*window\.print\(\)/,
  downloadLogic
);

// Add ID to InvoiceTemplate wrapper
code = code.replace(
  /<div className="w-full">\n\s*<InvoiceTemplate/,
  `<div className="w-full" id="invoice-template-wrapper">
            <InvoiceTemplate`
);

fs.writeFileSync('components/invoice-screen.tsx', code);
