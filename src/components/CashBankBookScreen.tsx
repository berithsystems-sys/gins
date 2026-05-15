import React, { useState, useEffect } from 'react';
import { Landmark, Wallet, ChevronRight } from 'lucide-react';

interface LedgerSummary {
  id: string;
  name: string;
  group: string;
  balance: number;
}

export default function CashBankBookScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/ledgers${query}`).then(res => res.json()).then(data => {
      // Filter for Cash and Bank groups
      const filtered = data.filter((l: any) => 
        l.group === 'Cash-in-hand' || l.group === 'Bank Accounts'
      ).map((l: any) => ({
        id: l.id,
        name: l.name,
        group: l.group,
        balance: l.openingBalance // In a real app, this would be computed
      }));
      setLedgers(filtered);
      setLoading(false);
    });
  }, [branchId]);

  const total = ledgers.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div className="space-y-4 w-full">
      <div className="bg-tally-teal text-white p-2 text-center text-xs font-bold uppercase tracking-widest">
        Cash / Bank Book
      </div>

      <div className="border border-tally-teal/20 bg-white overflow-x-auto shadow-lg">
        <table className="w-full text-xs min-w-[500px]">
          <thead className="bg-gray-100 border-b border-tally-teal/10 font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Particulars</th>
              <th className="px-4 py-3 text-right w-48">Closing Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={2} className="p-10 text-center animate-pulse uppercase tracking-widest text-gray-400">Loading Balances...</td></tr>
            ) : (
              <>
                <tr className="bg-blue-50/30">
                   <td className="px-4 py-2 font-black text-tally-teal uppercase flex items-center gap-2">
                      <Landmark className="w-3 h-3" /> Bank Accounts
                   </td>
                   <td className="px-4 py-2 text-right font-mono font-bold">
                      {ledgers.filter(l => l.group === 'Bank Accounts').reduce((acc, l) => acc + l.balance, 0).toLocaleString()}
                   </td>
                </tr>
                {ledgers.filter(l => l.group === 'Bank Accounts').map(l => (
                   <tr key={l.id} className="hover:bg-tally-accent/10 cursor-pointer group">
                      <td className="px-8 py-2 flex justify-between items-center pr-10">
                         <span className="group-hover:text-tally-teal transition-colors">{l.name}</span>
                         <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-600">
                         {l.balance.toLocaleString()}
                      </td>
                   </tr>
                ))}

                <tr className="bg-green-50/30">
                   <td className="px-4 py-2 font-black text-tally-teal uppercase flex items-center gap-2">
                      <Wallet className="w-3 h-3" /> Cash-in-Hand
                   </td>
                   <td className="px-4 py-2 text-right font-mono font-bold">
                      {ledgers.filter(l => l.group === 'Cash-in-hand').reduce((acc, l) => acc + l.balance, 0).toLocaleString()}
                   </td>
                </tr>
                {ledgers.filter(l => l.group === 'Cash-in-hand').map(l => (
                   <tr key={l.id} className="hover:bg-tally-accent/10 cursor-pointer group">
                      <td className="px-8 py-2 flex justify-between items-center pr-10">
                         <span className="group-hover:text-tally-teal transition-colors">{l.name}</span>
                         <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-600">
                         {l.balance.toLocaleString()}
                      </td>
                   </tr>
                ))}
              </>
            )}
          </tbody>
          <tfoot className="bg-tally-teal text-white font-black border-t-4 border-tally-teal/20">
            <tr>
              <td className="px-4 py-3 uppercase tracking-wider">Grand Total</td>
              <td className="px-4 py-3 text-right font-mono text-lg tracking-tighter">
                ₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div className="flex gap-4 mt-8 opacity-60">
         <div className="bg-gray-100 border p-2 flex flex-col items-center flex-1">
            <span className="text-[9px] font-bold text-gray-400">Total Inflow</span>
            <span className="text-xs font-black text-green-600">₹ 2,45,000</span>
         </div>
         <div className="bg-gray-100 border p-2 flex flex-col items-center flex-1">
            <span className="text-[9px] font-bold text-gray-400">Total Outflow</span>
            <span className="text-xs font-black text-red-600">₹ 1,12,500</span>
         </div>
         <div className="bg-tally-teal/10 border border-tally-teal p-2 flex flex-col items-center flex-1">
            <span className="text-[9px] font-bold text-tally-teal">Net Cash Flow</span>
            <span className="text-xs font-black text-tally-teal">₹ 1,32,500</span>
         </div>
      </div>
    </div>
  );
}
