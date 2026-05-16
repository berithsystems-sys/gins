/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Printer } from 'lucide-react';
import { exportToExcel, printReport } from '../lib/ReportUtils';

interface Voucher {
  id: string;
  number: string;
  date: string;
  type: string;
  narration: string;
  amount: number;
}

export default function DayBookScreen({ branchId, initialDate }: { branchId?: string; initialDate?: string }) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayDate, setDisplayDate] = useState(initialDate || new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetch(`/api/vouchers${branchId ? `?branchId=${branchId}` : ''}`)
      .then(res => res.json())
      .then(data => {
        let filtered = data;
        if (initialDate) {
          filtered = data.filter((v: any) => v.date === initialDate);
        }
        setVouchers(filtered);
        setLoading(false);
      });
  }, [branchId, initialDate]);

  const handleExport = () => {
    const data = vouchers.map(v => ({
      Date: format(new Date(v.date), 'dd-MMM-yyyy'),
      'Voucher Type': v.type,
      'Voucher No.': v.number || '-',
      Particulars: v.narration || '-',
      Amount: v.amount
    }));
    exportToExcel(data, 'Day_Book');
  };

  const totalAmount = vouchers.reduce((acc, v) => acc + v.amount, 0);

  return (
    <div id="daybook-report" className="p-4 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end border-b-2 border-blue-700 pb-2">
        <div>
          <h2 className="text-xl font-black text-blue-700 uppercase flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Day Book
          </h2>
          <p className="text-[10px] text-gray-500 mt-1">
            {initialDate ? format(new Date(initialDate), 'dd MMMM yyyy') : format(new Date(), 'dd MMMM yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 text-[10px] bg-gray-100 hover:bg-gray-200 px-3 py-1 font-bold uppercase border" onClick={() => printReport('daybook-report')}>
            <Printer className="w-3 h-3" /> Print (Alt+P)
          </button>
          <button className="flex items-center gap-1 text-[10px] bg-blue-700 text-white hover:bg-blue-800 px-3 py-1 font-bold uppercase shadow" onClick={handleExport}>
            <Download className="w-3 h-3" /> Export Excel
          </button>
        </div>
      </div>

      <div className="border border-blue-700/20 overflow-hidden bg-white shadow-lg rounded-lg">
        <table className="w-full text-xs md:text-sm">
          <thead className="bg-gradient-to-r from-blue-700 to-blue-600 text-white font-black uppercase text-[10px] md:text-[11px]">
            <tr>
              <th className="px-3 md:px-4 py-3 text-left">Date</th>
              <th className="px-3 md:px-4 py-3 text-left">Particulars</th>
              <th className="px-3 md:px-4 py-3 text-center">Vch Type</th>
              <th className="px-3 md:px-4 py-3 text-center">Vch No.</th>
              <th className="px-3 md:px-4 py-3 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center italic text-gray-400">Loading vouchers...</td></tr>
            ) : vouchers.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center italic text-gray-400">No vouchers for this date</td></tr>
            ) : vouchers.map((v, idx) => (
              <tr key={v.id} className="hover:bg-blue-50/50 transition-colors">
                <td className="px-3 md:px-4 py-2 font-medium text-gray-700">{format(new Date(v.date), 'dd-MMM-yy')}</td>
                <td className="px-3 md:px-4 py-2 text-gray-600 font-medium">{v.narration || 'No Narration'}</td>
                <td className="px-3 md:px-4 py-2 text-center text-blue-700 font-bold italic text-[10px] md:text-xs bg-blue-50/30">{v.type}</td>
                <td className="px-3 md:px-4 py-2 text-center text-gray-700 font-bold">{v.number || `${idx + 1}`}</td>
                <td className="px-3 md:px-4 py-2 text-right font-mono font-black text-blue-900">
                  {v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-4 border-double border-blue-700 font-black uppercase text-[11px]">
            <tr>
              <td colSpan={4} className="px-3 md:px-4 py-3 text-right text-blue-700">Daily Total</td>
              <td className="px-3 md:px-4 py-3 text-right font-mono text-blue-700 text-base md:text-lg">
                ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex gap-4 text-[10px] uppercase font-bold text-gray-600 bg-gray-50 p-3 border-l-4 border-blue-700 rounded">
        <span className="bg-gray-200 px-2 py-1 rounded">F2: Change Date</span>
        <span className="bg-gray-200 px-2 py-1 rounded">F4: Chg Vch Type</span>
        <span className="bg-gray-200 px-2 py-1 rounded">Alt+P: Print</span>
      </div>
    </div>
  );
}
