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
   const [reconItems, setReconItems] = useState<ReconciliationItem[]>([
      { id: '1', date: '2024-05-10', particulars: 'Salary Payment', amount: 50000, type: 'Dr' },
      { id: '2', date: '2024-05-11', particulars: 'Church Offering', amount: 15000, type: 'Cr' },
      { id: '3', date: '2024-05-12', particulars: 'Electricity Bill', amount: 2500, type: 'Dr' },
   ]);
   const fileInputRef = useRef<HTMLInputElement | null>(null);

   const storageKey = `bank_recon_${branchId || 'global'}`;

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

   const options = [
    { id: 'RECON', title: 'Bank Reconciliation', icon: <FileStack />, desc: 'Synchronize your ledger with bank statements.' },
    { id: 'CHEQUE', title: 'Cheque Printing', icon: <Printer />, desc: 'Configure and print cheques for vendors.' },
    { id: 'STATEMENT', title: 'Bank Statement Import', icon: <Landmark />, desc: 'Import .csv or .xlsx bank statements.' },
    { id: 'MENU', title: 'Cheque Register', icon: <Receipt />, desc: 'View status of all issued and received cheques.' },
    { id: 'MENU', title: 'Post-Dated Summary', icon: <CreditCard />, desc: 'Manage PDCs and their automated clearance.' },
  ];

    const saveRecon = (items: ReconciliationItem[]) => {
         setReconItems(items);
         try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch (e) {}
    };

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

   const importBankRows = async (rows: BankRow[]) => {
      // Attempt auto-match by amount +/- exact, date within 2 days, or particulars substring
      const items = [...reconItems];
      rows.forEach(r => {
         const amt = (r.debit || 0) || (r.credit || 0);
         if (!amt) return;
         // find candidate
         const candidate = items.find(it => {
            const sameAmt = Math.abs(it.amount - amt) < 0.005; // amounts equal
            if (!sameAmt) return false;
            if (r.date && it.date) {
               const d1 = new Date(r.date).getTime();
               const d2 = new Date(it.date).getTime();
               const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
               if (diffDays <= 3) return true;
            }
            if (r.particulars && it.particulars && it.particulars.toLowerCase().includes((r.particulars || '').toLowerCase())) return true;
            return false;
         });
         if (candidate) {
            candidate.bankDate = r.date;
         }
      });
      saveRecon(items);
      // optimistic: do not persist each auto-match now; user can Accept to persist
   };

   const handleFile = (file: File) => {
      const name = file.name.toLowerCase();
      const reader = new FileReader();
      if (name.endsWith('.csv')) {
         reader.onload = async () => {
            const text = reader.result as string;
            const rows = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            const parsed: BankRow[] = rows.slice(1).map(line => {
               const cols = line.split(/,|;|\t/).map(s => s.replace(/^\"|\"$/g, '').trim());
               // naive mapping: date, particulars, debit, credit
               return {
                  date: cols[0],
                  particulars: cols[1],
                              debit: parseFloat(cols[2]) || 0,
                              credit: parseFloat(cols[3]) || 0,
               };
            });
                     // attempt header-based mapping if first row looks like headers
                     const header = rows[0].split(/,|;|\t/).map(h => h.toLowerCase());
                     const hasHeaders = header.some(h => /date|particular|desc|amount|debit|credit|dr|cr/.test(h));
                     if (hasHeaders) {
                        const mapIdx: any = {};
                        header.forEach((h, i) => {
                           if (/date/.test(h)) mapIdx.date = i;
                           if (/particul|desc|narration/.test(h)) mapIdx.particulars = i;
                           if (/debit|withdraw|dr/.test(h)) mapIdx.debit = i;
                           if (/credit|deposit|cr/.test(h)) mapIdx.credit = i;
                           if (/amount/.test(h) && mapIdx.debit === undefined && mapIdx.credit === undefined) mapIdx.amount = i;
                        });
                        const parsed2: BankRow[] = rows.slice(1).map(line => {
                           const cols = line.split(/,|;|\t/).map(s => s.replace(/^\"|\"$/g, '').trim());
                           const debit = mapIdx.debit !== undefined ? parseFloat(cols[mapIdx.debit] || '0') : (mapIdx.amount !== undefined ? parseFloat(cols[mapIdx.amount] || '0') : 0);
                           const credit = mapIdx.credit !== undefined ? parseFloat(cols[mapIdx.credit] || '0') : 0;
                           return {
                              date: cols[mapIdx.date] || '',
                              particulars: cols[mapIdx.particulars] || '',
                              debit: debit || 0,
                              credit: credit || 0,
                           };
                        });
                        // replace parsed with parsed2
                        // @ts-ignore
                        parsed.splice(0, parsed.length, ...parsed2);
                     }
                  // Prefer server-side import: send parsed rows to server and refresh
                  try {
                     const bid = branchId || '101';
                     const resp = await fetch('/api/bank/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branchId: bid, rows: parsed, fileName: file.name }) });
                     const data = await resp.json();
                     if (data && data.rows) {
                        const merged = data.rows.map((r: any) => ({ id: r.id, date: r.date || '', particulars: r.particulars || '', amount: Number(r.amount) || 0, type: (r.txnType === 'DR' || r.txnType === 'Dr') ? 'Dr' : 'Cr', bankDate: r.bankDate || undefined } as ReconciliationItem));
                        setReconItems(merged.concat(reconItems));
                     } else {
                        importBankRows(parsed);
                     }
                  } catch (e) {
                     importBankRows(parsed);
                  }
         };
         reader.readAsText(file);
      } else {
         reader.onload = async () => {
            const data = new Uint8Array(reader.result as ArrayBuffer);
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
            const parsed: BankRow[] = json.map(r => ({
               date: r['Date'] || r['date'] || r['Transaction Date'] || '',
               particulars: r['Particulars'] || r['Description'] || r['Narration'] || '',
               debit: parseFloat((r['Debit'] || r['Amount Dr'] || r['Debit Amount'] || r['Withdrawals'] || 0) as any) || 0,
               credit: parseFloat((r['Credit'] || r['Amount Cr'] || r['Credit Amount'] || r['Deposits'] || 0) as any) || 0,
            }));
                  try {
                     const bid = branchId || '101';
                     const resp = await fetch('/api/bank/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branchId: bid, rows: parsed, fileName: file.name }) });
                     const data = await resp.json();
                     if (data && data.rows) {
                        const merged = data.rows.map((r: any) => ({ id: r.id, date: r.date || '', particulars: r.particulars || '', amount: Number(r.amount) || 0, type: (r.txnType === 'DR' || r.type === 'Dr') ? 'Dr' : 'Cr', bankDate: r.bankDate || undefined } as ReconciliationItem));
                        setReconItems(merged.concat(reconItems));
                     } else {
                        importBankRows(parsed);
                     }
                  } catch (e) {
                     importBankRows(parsed);
                  }
         };
         reader.readAsArrayBuffer(file);
      }
   };

   const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files && e.target.files[0];
      if (f) handleFile(f);
      // reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
   };

   const undoReconciliation = (id: string) => {
      const items = reconItems.map(it => it.id === id ? { ...it, bankDate: undefined } : it);
      saveRecon(items);
      // optimistic server update
      fetch('/api/bank/reconciliations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, bankDate: null }) }).catch(() => {});
   };

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
                         <div className="flex items-center gap-2 justify-center">
                           <input 
                             type="date" 
                             className="border border-gray-200 text-[10px] p-1 focus:border-tally-teal outline-none" 
                             value={item.bankDate || ''}
                             onChange={(e) => {
                               const items = reconItems.map(it => it.id === item.id ? { ...it, bankDate: e.target.value || undefined } : it);
                               saveRecon(items);
                             }}
                           />
                           {item.bankDate && (
                             <button onClick={() => undoReconciliation(item.id)} className="text-red-600 p-1" title="Undo">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           )}
                         </div>
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
            <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                   <input ref={fileInputRef} onChange={handleFileInput} type="file" accept=".csv,.xlsx,.xls" className="hidden" />
                   <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white border p-2 text-[10px] font-bold hover:bg-gray-50">
                      <UploadCloud className="w-4 h-4" /> Import Statement
                   </button>
                   <button onClick={() => {
                      // clear persisted recon
                      if (confirm('Clear saved reconciliations for this branch?')) {
                         localStorage.removeItem(storageKey);
                         setReconItems(reconItems.map(it => ({ ...it, bankDate: undefined })));
                      }
                   }} className="flex items-center gap-2 bg-white border p-2 text-[10px] font-bold hover:bg-gray-50">
                      <Trash2 className="w-4 h-4" /> Clear Reconciliations
                   </button>
                </div>
                <div className="flex justify-end gap-2">
                   <button className="bg-tally-accent text-black px-6 py-1.5 text-[10px] font-bold border border-black/10">F6: Bank Details</button>
                   <button onClick={() => {
                      // Accept: persist (already persisted on change) and show summary
                      const reconciled = reconItems.filter(i => i.bankDate).length;
                      alert(`Accepted reconciliations. ${reconciled} items reconciled.`);
                      saveRecon(reconItems);
                   }} className="bg-tally-teal text-white px-6 py-1.5 text-[10px] font-bold shadow-md">Accept (Enter)</button>
                         </div>
                         <div className="flex justify-end gap-2">
                            <button onClick={() => setActiveTab('CHEQUE')} className="bg-tally-accent text-black px-6 py-1.5 text-[10px] font-bold border border-black/10">F9: Cheque Print</button>
                            <button onClick={() => setActiveTab('PDC')} className="bg-gray-200 text-black px-6 py-1.5 text-[10px] font-bold border">PDC</button>
                </div>
            </div>
      </div>
    );
  }

   if (activeTab === 'CHEQUE') {
      return <ChequePrintScreen onBack={() => setActiveTab('MENU')} />;
   }

   if (activeTab === 'PDC') {
      return <PDCManagementScreen onBack={() => setActiveTab('RECON')} />;
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
