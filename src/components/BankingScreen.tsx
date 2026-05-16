import React, { useState, useEffect, useRef } from 'react';
import { Landmark, CreditCard, Receipt, FileStack, Printer, ChevronLeft, UploadCloud, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import ChequePrintScreen from './ChequePrintScreen';
import PDCManagementScreen from './PDCManagementScreen';

// Simple types for imported bank rows
interface BankRow {
   date?: string;
   particulars?: string;
   debit?: number;
   credit?: number;
}

interface ReconciliationItem {
  id: string;
  date: string;
  particulars: string;
  amount: number;
  type: 'Dr' | 'Cr';
  bankDate?: string;
}

export default function BankingScreen({ branchId }: { branchId?: string }) {
   const [activeTab, setActiveTab] = useState<'MENU' | 'RECON' | 'CHEQUE' | 'STATEMENT' | 'PDC'>('MENU');
   const [selectedIndex, setSelectedIndex] = useState(0);
   const [reconItems, setReconItems] = useState<ReconciliationItem[]>([
      { id: '1', date: '2026-05-10', particulars: 'Salary Payment', amount: 50000, type: 'Dr' },
      { id: '2', date: '2026-05-11', particulars: 'Church Offering', amount: 15000, type: 'Cr' },
      { id: '3', date: '2026-05-12', particulars: 'Electricity Bill', amount: 2500, type: 'Dr' },
   ]);
   const fileInputRef = useRef<HTMLInputElement | null>(null);

   const storageKey = `bank_recon_${branchId || 'global'}`;

   const options = [
    { id: 'RECON', title: 'Bank Reconciliation', icon: <FileStack />, desc: 'Synchronize your ledger with bank statements.', key: 'B' },
    { id: 'CHEQUE', title: 'Cheque Printing', icon: <Printer />, desc: 'Configure and print cheques for vendors.', key: 'P' },
    { id: 'STATEMENT', title: 'Bank Statement Import', icon: <Landmark />, desc: 'Import .csv or .xlsx bank statements.', key: 'I' },
    { id: 'MENU', title: 'Cheque Register', icon: <Receipt />, desc: 'View status of all issued and received cheques.', key: 'R' },
    { id: 'PDC', title: 'Post-Dated Summary', icon: <CreditCard />, desc: 'Manage PDCs and their automated clearance.', key: 'S' },
  ];

   // Navigation hook
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (activeTab !== 'MENU') return;
       if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(0, prev - 1)); }
       if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(options.length - 1, prev + 1)); }
       if (e.key === 'Enter') setActiveTab(options[selectedIndex].id as any);
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, [activeTab, selectedIndex]);

   useEffect(() => {
      // Load reconciliations from server for branch
      const bid = branchId || '101';
      fetch(`/api/bank/reconciliations?branchId=${encodeURIComponent(bid)}`)
        .then(r => r.json())
        .then((rows: any[]) => {
          if (Array.isArray(rows) && rows.length > 0) {
            const mapped = rows.map(r => ({ id: r.id, date: r.date || '', particulars: r.particulars || '', amount: Number(r.amount) || 0, type: (r.txnType === 'DR' || r.type === 'Dr') ? 'Dr' : 'Cr', bankDate: r.bankDate || undefined } as ReconciliationItem));
            setReconItems(mapped);
          }
        }).catch(() => {
          // fallback: keep existing seeded items
        });
   }, [branchId]);

   const persistAll = async () => {
      const bid = branchId || '101';
      try {
         await Promise.all(reconItems.map(item => fetch('/api/bank/reconciliations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, branchId: bid }) } )));
         alert('Reconciliations saved to server.');
      } catch (err) {
         console.error('Failed to persist reconciliations', err);
         alert('Failed to save reconciliations to server');
      }
   };

   if (activeTab === 'RECON') {
    return (
      <div className="flex flex-col h-full bg-tally-bg">
        <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between sticky top-0 z-10">
           <div className="flex items-center gap-4">
              <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-tally-accent" onClick={() => setActiveTab('MENU')} />
              <span>Bank Reconciliation</span>
           </div>
           <span className="text-tally-accent">SBI HQ A/c</span>
        </div>

        <div className="flex-grow p-4 overflow-auto">
          <div className="max-w-6xl mx-auto bg-white tally-border tally-shadow">
            <table className="w-full text-xs">
               <thead className="bg-tally-light border-b border-tally-teal font-bold uppercase text-[10px]">
                  <tr>
                     <th className="px-4 py-1 text-left w-24">Date</th>
                     <th className="px-4 py-1 text-left">Particulars</th>
                     <th className="px-4 py-1 text-right w-32">Debit</th>
                     <th className="px-4 py-1 text-right w-32">Credit</th>
                     <th className="px-4 py-1 text-center w-40">Bank Date</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {reconItems.map(item => (
                     <tr key={item.id} className="hover:bg-tally-accent cursor-pointer">
                        <td className="px-4 py-1">{item.date}</td>
                        <td className="px-4 py-1 font-bold">{item.particulars}</td>
                        <td className="px-4 py-1 text-right">{item.type === 'Dr' ? item.amount.toLocaleString() : ''}</td>
                        <td className="px-4 py-1 text-right">{item.type === 'Cr' ? item.amount.toLocaleString() : ''}</td>
                        <td className="px-4 py-1 text-center">
                           <input 
                             type="text" 
                             placeholder="DD-MMM-YY"
                             className="w-24 border-b border-tally-teal text-[10px] p-0.5 focus:bg-tally-accent/10 outline-none text-center font-bold" 
                             value={item.bankDate || ''}
                             onChange={(e) => {
                               const items = reconItems.map(it => it.id === item.id ? { ...it, bankDate: e.target.value || undefined } : it);
                               setReconItems(items);
                             }}
                           />
                        </td>
                     </tr>
                  ))}
               </tbody>
               <tfoot className="border-t-2 border-tally-teal bg-tally-light font-bold text-[10px] uppercase">
                  <tr>
                     <td colSpan={2} className="px-4 py-1">Balance as per Company Books</td>
                     <td colSpan={3} className="px-4 py-1 text-right font-mono text-tally-teal">₹ 15,40,250.00 Dr</td>
                  </tr>
                  <tr className="text-gray-400">
                     <td colSpan={2} className="px-4 py-1">Balance as per Bank</td>
                     <td colSpan={3} className="px-4 py-1 text-right font-mono">₹ 14,80,000.00 Dr</td>
                  </tr>
               </tfoot>
            </table>
          </div>
        </div>

        {/* Vertical Button Bar */}
        <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white">
          {[
            { label: 'F2: Period', key: 'F2' },
            { label: 'Alt+I: Import', action: () => fileInputRef.current?.click() },
            { label: 'Alt+A: Accept', action: persistAll },
            { label: 'F12: Configure', key: 'F12' }
          ].map((btn) => (
            <div key={btn.label} onClick={btn.action} className="h-10 bg-tally-hotkey flex items-center px-2 cursor-pointer hover:bg-tally-accent hover:text-black">
              {btn.label}
            </div>
          ))}
        </div>
        <input ref={fileInputRef} type="file" className="hidden" />
      </div>
    );
  }

  if (activeTab === 'CHEQUE') return <ChequePrintScreen onBack={() => setActiveTab('MENU')} />;
  if (activeTab === 'PDC') return <PDCManagementScreen onBack={() => setActiveTab('MENU')} />;

  return (
    <div className="flex h-full bg-tally-bg">
      <div className="flex-grow flex items-center justify-center p-8">
        <div className="w-96 bg-white tally-border tally-shadow overflow-hidden">
          <div className="bg-tally-teal text-white text-center py-1 font-bold text-sm uppercase tracking-wider">
            Banking Utilities
          </div>
          <div className="py-2">
            {options.map((opt, idx) => {
              const isSelected = selectedIndex === idx;
              const labelParts = opt.title.split(new RegExp(`(${opt.key})`, 'i'));
              return (
                <div 
                  key={idx} 
                  onClick={() => { setSelectedIndex(idx); setActiveTab(opt.id as any); }}
                  className={`px-4 py-1 flex justify-between cursor-pointer transition-colors ${isSelected ? 'bg-tally-accent text-black font-bold' : 'hover:bg-gray-100'}`}
                >
                  <span className="text-xs">
                    {labelParts.map((part, i) => 
                      part.toLowerCase() === opt.key.toLowerCase() 
                        ? <span key={i} className="text-red-700 font-bold">{part}</span> 
                        : part
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-80 p-4 border-l border-gray-300 space-y-4">
        <div className="bg-white tally-border tally-shadow p-3">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase border-b mb-2 pb-1">Bank Accounts</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-bold text-tally-teal">
               <span>SBI HQ A/C</span>
               <span className="font-mono">12,45,670.00 Dr</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold text-tally-teal">
               <span>HDFC Operations</span>
               <span className="font-mono">1,22,340.00 Dr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
