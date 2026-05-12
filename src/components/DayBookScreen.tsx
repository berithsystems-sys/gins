/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Voucher {
  id: string;
  number: string;
  date: string;
  type: string;
  narration: string;
  amount: number;
}

export default function DayBookScreen() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vouchers')
      .then(res => res.json())
      .then(data => {
        setVouchers(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-tally-teal text-white p-2">
        <span className="text-xs font-bold uppercase tracking-widest">Day Book</span>
        <span className="text-[10px] opacity-70">1-Apr-2024 to 31-Mar-2025</span>
      </div>

      <div className="border border-tally-teal/20 overflow-hidden bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-tally-teal/10 font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left w-24">Date</th>
              <th className="px-4 py-2 text-left">Particulars</th>
              <th className="px-4 py-2 text-left w-32">Vch Type</th>
              <th className="px-4 py-2 text-left w-24">Vch No.</th>
              <th className="px-4 py-2 text-right w-32">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center italic text-gray-400">Loading vouchers...</td></tr>
            ) : vouchers.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center italic text-gray-400">No vouchers entered today</td></tr>
            ) : vouchers.map(v => (
              <tr key={v.id} className="hover:bg-tally-accent/10 cursor-pointer transition-colors">
                <td className="px-4 py-2">{format(new Date(v.date), 'dd-MMM-yy')}</td>
                <td className="px-4 py-2 font-medium">{v.narration || 'No Narration'}</td>
                <td className="px-4 py-2 text-tally-teal font-bold italic">{v.type}</td>
                <td className="px-4 py-2">{v.number || idx + 1}</td>
                <td className="px-4 py-2 text-right font-mono font-bold">
                  {v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-tally-teal/5 border-t border-tally-teal/20 font-bold">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right uppercase">Total</td>
              <td className="px-4 py-2 text-right font-mono">
                {vouchers.reduce((acc, v) => acc + v.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex gap-2 text-[10px] uppercase font-bold text-gray-500">
        <span className="bg-gray-100 px-2 py-1 border">F2: Period</span>
        <span className="bg-gray-100 px-2 py-1 border">F4: Chg Vch Type</span>
        <span className="bg-gray-100 px-2 py-1 border">Alt+A: Alt Column</span>
      </div>
    </div>
  );
}
