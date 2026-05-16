/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { exportToExcel } from '../lib/ReportUtils';

interface Ledger {
  id: string;
  name: string;
  group: string;
  openingBalance: number;
}

interface Voucher {
  id: string;
  entries: {
    ledgerId: string;
    amount: number;
    type: 'Dr' | 'Cr';
  }[];
}

export default function TrialBalanceScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [drillDownGroup, setDrillDownGroup] = useState<string | null>(null);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/ledgers${query}`).then(res => res.json()),
      fetch(`/api/vouchers${query}`).then(res => res.json())
    ]).then(([l, v]) => {
      setLedgers(l);
      setVouchers(v);
    });
  }, [branchId]);

  const calculateBalance = (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    let balance = ledger?.openingBalance || 0;
    
    vouchers.forEach(v => {
      v.entries?.forEach(e => {
        if (e.ledgerId === ledgerId) {
          if (e.type === 'Dr') balance += e.amount;
          else balance -= e.amount;
        }
      });
    });
    
    return balance;
  };

  const getGroups = () => {
    const groups: Record<string, { dr: number; cr: number }> = {};
    ledgers.forEach(l => {
      const bal = calculateBalance(l.id);
      if (!groups[l.group]) groups[l.group] = { dr: 0, cr: 0 };
      if (bal > 0) groups[l.group].dr += bal;
      else groups[l.group].cr += Math.abs(bal);
    });
    return groups;
  };

  const groups = getGroups();
  const drTotal = Object.values(groups).reduce((acc, g) => acc + g.dr, 0);
  const crTotal = Object.values(groups).reduce((acc, g) => acc + g.cr, 0);

  const handleExport = () => {
    const data = Object.entries(groups).map(([name, vals]) => ({
      Group: name,
      Debit: vals.dr,
      Credit: vals.cr
    }));
    exportToExcel(data, 'Trial_Balance');
  };

  return (
    <div id="trial-balance-report" className="p-4 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end border-b-2 border-tally-teal pb-2">
        <h2 className="text-xl font-black text-tally-teal uppercase flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Trial Balance {drillDownGroup && `- ${drillDownGroup}`}
        </h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 text-[10px] bg-gray-100 hover:bg-gray-200 px-3 py-1 font-bold uppercase border" onClick={() => window.print()}>
            <Printer className="w-3 h-3" /> Print (Alt+P)
          </button>
          <button className="flex items-center gap-1 text-[10px] bg-tally-teal text-white hover:bg-teal-700 px-3 py-1 font-bold uppercase shadow" onClick={handleExport}>
            <Download className="w-3 h-3" /> Export Excel
          </button>
          {drillDownGroup && (
            <button 
              onClick={() => setDrillDownGroup(null)}
              className="text-[10px] bg-orange-500 text-white hover:bg-orange-600 px-3 py-1 rounded font-bold uppercase"
            >
              Back to Groups
            </button>
          )}
        </div>
      </div>

      <div className="border border-tally-teal/20 bg-white overflow-x-auto shadow-lg">
        <table className="w-full text-xs md:text-sm min-w-[500px]">
          <thead className="bg-gradient-to-r from-tally-teal to-teal-600 text-white font-black uppercase text-[10px] md:text-[11px]">
            <tr>
              <th className="px-4 md:px-6 py-3 text-left">Particulars</th>
              <th className="px-4 md:px-6 py-3 text-right">Debit (₹)</th>
              <th className="px-4 md:px-6 py-3 text-right">Credit (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!drillDownGroup ? (
              // Group View
              Object.entries(groups).map(([groupName, totals], idx) => (
                <tr 
                  key={groupName} 
                  className="hover:bg-teal-50 cursor-pointer transition-colors group"
                  onClick={() => setDrillDownGroup(groupName)}
                >
                  <td className="px-4 md:px-6 py-2 font-bold text-blue-900 group-hover:underline uppercase tracking-tight text-[11px]">
                    {groupName}
                  </td>
                  <td className="px-4 md:px-6 py-2 text-right font-mono text-gray-700 group-hover:font-black">
                    {totals.dr > 0 ? totals.dr.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="px-4 md:px-6 py-2 text-right font-mono text-gray-700 group-hover:font-black">
                    {totals.cr > 0 ? totals.cr.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                </tr>
              ))
            ) : (
              // Ledger View (Drill-down)
              ledgers.filter(l => l.group === drillDownGroup).map(l => {
                const balance = calculateBalance(l.id);
                if (balance === 0) return null;
                return (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-1.5 pl-8 italic text-gray-600">{l.name}</td>
                    <td className="px-4 md:px-6 py-1.5 text-right font-mono text-gray-700">
                      {balance > 0 ? balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="px-4 md:px-6 py-1.5 text-right font-mono text-gray-700">
                      {balance < 0 ? Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-4 border-double border-tally-teal font-black uppercase text-[11px]">
            <tr>
              <td className="px-4 md:px-6 py-3 text-tally-teal">Grand Total</td>
              <td className="px-4 md:px-6 py-3 text-right font-mono text-tally-teal text-base md:text-lg">
                {drTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 md:px-6 py-3 text-right font-mono text-tally-teal text-base md:text-lg">
                {crTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="text-[10px] text-gray-400 italic bg-gray-50 p-2 border-l-2 border-tally-teal">
        💡 Tip: Click on any group name to see breakdown by individual ledgers. Debit and Credit totals should always match for a balanced trial balance.
      </div>
    </div>
  );
}
