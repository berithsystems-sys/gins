import React, { useState, useEffect } from 'react';
import { Landmark, CreditCard, Receipt, FileStack, Printer, ChevronLeft } from 'lucide-react';

interface ReconciliationItem {
  id: string;
  date: string;
  particulars: string;
  amount: number;
  type: 'Dr' | 'Cr';
  bankDate?: string;
}

export default function BankingScreen({ branchId }: { branchId?: string }) {
  const [activeTab, setActiveTab] = useState<'MENU' | 'RECON' | 'CHEQUE' | 'STATEMENT'>('MENU');
  const [reconItems, setReconItems] = useState<ReconciliationItem[]>([
    { id: '1', date: '2024-05-10', particulars: 'Salary Payment', amount: 50000, type: 'Dr' },
    { id: '2', date: '2024-05-11', particulars: 'Church Offering', amount: 15000, type: 'Cr' },
    { id: '3', date: '2024-05-12', particulars: 'Electricity Bill', amount: 2500, type: 'Dr' },
  ]);

  const options = [
    { id: 'RECON', title: 'Bank Reconciliation', icon: <FileStack />, desc: 'Synchronize your ledger with bank statements.' },
    { id: 'CHEQUE', title: 'Cheque Printing', icon: <Printer />, desc: 'Configure and print cheques for vendors.' },
    { id: 'STATEMENT', title: 'Bank Statement Import', icon: <Landmark />, desc: 'Import .csv or .xlsx bank statements.' },
    { id: 'MENU', title: 'Cheque Register', icon: <Receipt />, desc: 'View status of all issued and received cheques.' },
    { id: 'MENU', title: 'Post-Dated Summary', icon: <CreditCard />, desc: 'Manage PDCs and their automated clearance.' },
  ];

  if (activeTab === 'RECON') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4 bg-tally-teal text-white p-2">
           <button onClick={() => setActiveTab('MENU')} className="hover:bg-white/10 p-1 rounded"><ChevronLeft className="w-4 h-4" /></button>
           <span className="text-xs font-bold uppercase tracking-widest">Bank Reconciliation - SBI HQ A/c</span>
        </div>

        <div className="border border-tally-teal/20 bg-white overflow-x-auto">
          <table className="w-full text-[11px] min-w-[600px]">
             <thead className="bg-gray-100 border-b border-tally-teal/10 font-bold uppercase text-gray-500">
                <tr>
                   <th className="px-4 py-2 text-left">Date</th>
                   <th className="px-4 py-2 text-left">Particulars</th>
                   <th className="px-4 py-2 text-right">Debit</th>
                   <th className="px-4 py-2 text-right">Credit</th>
                   <th className="px-4 py-2 text-center w-40">Bank Date (Reconciled)</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
                {reconItems.map(item => (
                   <tr key={item.id} className="hover:bg-tally-accent/5">
                      <td className="px-4 py-2">{item.date}</td>
                      <td className="px-4 py-2 font-bold text-blue-900">{item.particulars}</td>
                      <td className="px-4 py-2 text-right font-mono">{item.type === 'Dr' ? item.amount.toLocaleString() : ''}</td>
                      <td className="px-4 py-2 text-right font-mono">{item.type === 'Cr' ? item.amount.toLocaleString() : ''}</td>
                      <td className="px-4 py-2 text-center">
                         <input 
                           type="date" 
                           className="border border-gray-200 text-[10px] p-1 focus:border-tally-teal outline-none" 
                           defaultValue={item.bankDate}
                         />
                      </td>
                   </tr>
                ))}
             </tbody>
             <tfoot className="bg-gray-50 border-t-2 border-tally-teal font-bold">
                <tr>
                   <td colSpan={2} className="px-4 py-2 uppercase">Balance as per Company Books</td>
                   <td colSpan={3} className="px-4 py-2 text-right font-mono text-tally-teal">₹ 15,40,250.00 Dr</td>
                </tr>
                <tr>
                   <td colSpan={2} className="px-4 py-2 uppercase text-gray-400">Balance as per Bank</td>
                   <td colSpan={3} className="px-4 py-2 text-right font-mono text-gray-400">₹ 14,80,000.00 Dr</td>
                </tr>
             </tfoot>
          </table>
        </div>
        <div className="flex justify-end gap-2">
           <button className="bg-tally-accent text-black px-6 py-1.5 text-[10px] font-bold border border-black/10">F6: Bank Details</button>
           <button className="bg-tally-teal text-white px-6 py-1.5 text-[10px] font-bold shadow-md">Accept (Enter)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-full overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {options.map((opt, idx) => (
          <div 
            key={idx} 
            onClick={() => setActiveTab(opt.id as any)}
            className="border p-4 md:p-6 bg-white hover:border-tally-teal hover:shadow-xl transition-all group flex flex-col items-center text-center cursor-pointer"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-tally-bg rounded-lg flex items-center justify-center text-tally-teal group-hover:bg-tally-teal group-hover:text-white transition-colors mb-4">
              {React.cloneElement(opt.icon as React.ReactElement, { className: 'w-5 h-5 md:w-6 md:h-6' })}
            </div>
            <h3 className="text-xs md:text-sm font-black uppercase text-gray-800 mb-2">{opt.title}</h3>
            <p className="text-[9px] md:text-[10px] text-gray-400 italic mb-6">{opt.desc}</p>
            <button className="mt-auto w-full py-1.5 md:py-2 bg-gray-50 text-[9px] md:text-[10px] font-bold uppercase hover:bg-tally-teal hover:text-white transition-colors border shadow-sm">
              Open Utility
            </button>
          </div>
        ))}
      </div>

      <div className="bg-blue-50/30 p-4 md:p-6 border-l-4 border-tally-teal overflow-x-auto">
         <h4 className="text-[10px] md:text-xs font-bold text-tally-teal uppercase mb-2">Connected Banking Accounts</h4>
         <div className="space-y-2 min-w-[300px]">
            <div className="flex justify-between items-center text-[11px] md:text-xs bg-white p-3 border shadow-sm">
               <div className="flex items-center gap-3">
                  <Landmark className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                  <span className="font-bold">State Bank of India - HQ A/c</span>
               </div>
               <span className="font-mono text-tally-teal font-black">₹ 12,45,670.00 Dr</span>
            </div>
            <div className="flex justify-between items-center text-[11px] md:text-xs bg-white p-3 border shadow-sm">
               <div className="flex items-center gap-3">
                  <Landmark className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                  <span className="font-bold">HDFC Bank - Operations</span>
               </div>
               <span className="font-mono text-tally-teal font-black">₹ 1,22,340.00 Dr</span>
            </div>
         </div>
      </div>
    </div>
  );
}
