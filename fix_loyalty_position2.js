const fs = require('fs');
let code = fs.readFileSync('components/invoice-template.tsx', 'utf8');

code = code.replace(
  /      <\/div>\n\n      \{\/\* Footer \*\/\}/,
  `      </div>
  
      {/* Loyalty section at bottom */}
      {data.loyaltyPointsAvailable !== undefined && data.loyaltyPointsEarned !== undefined && (data.loyaltyPointsAvailable > 0 || data.loyaltyPointsEarned > 0) && (
        <div className="mt-8 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm print:break-inside-avoid">
          <div>
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Loyalty Program
            </span>
            <p className="text-slate-500 mt-1">Points earned on this transaction: <span className="text-emerald-600 font-medium">+{data.loyaltyPointsEarned}</span></p>
          </div>
          <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4 w-full sm:w-auto">
            <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">New Balance</span>
            <span className="font-bold text-slate-800 text-lg">{data.loyaltyPointsAvailable + data.loyaltyPointsEarned}</span>
          </div>
        </div>
      )}

      {/* Footer */}`
);

fs.writeFileSync('components/invoice-template.tsx', code);
