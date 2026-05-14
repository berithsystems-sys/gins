import React from 'react';
import { Landmark, CreditCard, Receipt, FileStack, Printer } from 'lucide-react';

export default function BankingScreen({ branchId }: { branchId?: string }) {
  const options = [
    { title: 'Bank Reconciliation', icon: <FileStack />, desc: 'Synchronize your ledger with bank statements.' },
    { title: 'Cheque Printing', icon: <Printer />, desc: 'Configure and print cheques for vendors.' },
    { title: 'Cheque Register', icon: <Receipt />, desc: 'View status of all issued and received cheques.' },
    { title: 'Post-Dated Summary', icon: <CreditCard />, desc: 'Manage PDCs and their automated clearance.' },
    { title: 'Bank Statement Import', icon: <Landmark />, desc: 'Import .csv or .xlsx bank statements.' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {options.map((opt, idx) => (
          <div key={idx} className="border p-6 bg-white hover:border-tally-teal hover:shadow-xl transition-all group flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-tally-bg rounded-lg flex items-center justify-center text-tally-teal group-hover:bg-tally-teal group-hover:text-white transition-colors mb-4">
              {React.cloneElement(opt.icon as React.ReactElement, { className: 'w-6 h-6' })}
            </div>
            <h3 className="text-sm font-black uppercase text-gray-800 mb-2">{opt.title}</h3>
            <p className="text-[10px] text-gray-400 italic mb-6">{opt.desc}</p>
            <button className="mt-auto w-full py-2 bg-gray-50 text-[10px] font-bold uppercase hover:bg-tally-teal hover:text-white transition-colors border shadow-sm">
              Open Utility
            </button>
          </div>
        ))}
      </div>

      <div className="bg-blue-50/30 p-6 border-l-4 border-tally-teal">
         <h4 className="text-xs font-bold text-tally-teal uppercase mb-2">Connected Banking Accounts</h4>
         <div className="space-y-2">
            <div className="flex justify-between items-center text-xs bg-white p-3 border shadow-sm">
               <div className="flex items-center gap-3">
                  <Landmark className="w-4 h-4 text-gray-400" />
                  <span className="font-bold">State Bank of India - HQ A/c</span>
               </div>
               <span className="font-mono text-tally-teal font-black">₹ 12,45,670.00 Dr</span>
            </div>
            <div className="flex justify-between items-center text-xs bg-white p-3 border shadow-sm">
               <div className="flex items-center gap-3">
                  <Landmark className="w-4 h-4 text-gray-400" />
                  <span className="font-bold">HDFC Bank - Operations</span>
               </div>
               <span className="font-mono text-tally-teal font-black">₹ 1,22,340.00 Dr</span>
            </div>
         </div>
      </div>
    </div>
  );
}
