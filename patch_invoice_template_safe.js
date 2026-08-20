const fs = require('fs');
let code = fs.readFileSync('components/invoice-template.tsx', 'utf8');

code = code.replace(/item\.rate\.toFixed\(2\)/g, 'Number(item.rate).toFixed(2)');
code = code.replace(/item\.amount\.toFixed\(2\)/g, 'Number(item.amount).toFixed(2)');
code = code.replace(/data\.subtotal\.toFixed\(2\)/g, 'Number(data.subtotal).toFixed(2)');
code = code.replace(/data\.discount\.toFixed\(2\)/g, 'Number(data.discount).toFixed(2)');
code = code.replace(/data\.couponDiscount!\.toFixed\(2\)/g, 'Number(data.couponDiscount || 0).toFixed(2)');
code = code.replace(/data\.loyaltyDiscount!\.toFixed\(2\)/g, 'Number(data.loyaltyDiscount || 0).toFixed(2)');
code = code.replace(/data\.giftCardDiscount!\.toFixed\(2\)/g, 'Number(data.giftCardDiscount || 0).toFixed(2)');
code = code.replace(/gstAmount\.toFixed\(2\)/g, 'Number(gstAmount).toFixed(2)');
code = code.replace(/totalAmount\.toFixed\(2\)/g, 'Number(totalAmount).toFixed(2)');

fs.writeFileSync('components/invoice-template.tsx', code);
