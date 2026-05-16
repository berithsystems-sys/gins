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
    <div id="daybook-report" className="flex flex-col h-full bg-tally-bg">
      {/* Report Header */}
      <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between sticky top-0 z-10">
        <span>Day Book</span>
        <span className="text-tally-accent">Company Name</span>
      </div>

      <div className="flex-grow p-4 overflow-auto">
        <div className="max-w-6xl mx-auto bg-white tally-border tally-shadow min-h-[500px]">
          <div className="text-center py-4 border-b border-gray-200">
            <h1 className="text-lg font-bold uppercase">Company Name</h1>
            <p className="text-xs font-bold italic">Day Book</p>
            <p className="text-[10px]">1-Apr-26 to 31-Mar-27</p>
          </div>

          <table className="w-full text-xs">
            <thead className="bg-tally-light border-b border-tally-teal">
              <tr className="font-bold uppercase text-[10px]">
                <th className="px-4 py-1 text-left w-24">Date</th>
                <th className="px-4 py-1 text-left">Particulars</th>
                <th className="px-4 py-1 text-left w-32">Vch Type</th>
                <th className="px-4 py-1 text-center w-24">Vch No.</th>
                <th className="px-4 py-1 text-right w-40">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center italic text-gray-400">Loading vouchers...</td></tr>
              ) : vouchers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center italic text-gray-400">No vouchers found</td></tr>
              ) : vouchers.map((v, idx) => (
                <tr key={v.id} className="hover:bg-tally-accent cursor-pointer border-b border-gray-50">
                  <td className="px-4 py-0.5">{format(new Date(v.date), 'dd-MMM-yy')}</td>
                  <td className="px-4 py-0.5 font-bold">{v.narration || '(Blank)'}</td>
                  <td className="px-4 py-0.5 italic">{v.type}</td>
                  <td className="px-4 py-0.5 text-center">{v.number || idx + 1}</td>
                  <td className="px-4 py-0.5 text-right font-bold">{v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-tally-teal bg-tally-light">
              <tr className="font-bold uppercase text-[10px]">
                <td colSpan={4} className="px-4 py-1 text-right">Total</td>
                <td className="px-4 py-1 text-right font-bold text-xs border-t-2 border-double border-tally-teal">
                  ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Button Bar */}
      <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white">
        {[
          { label: 'F2: Period', key: 'F2' },
          { label: 'F3: Company', key: 'F3' },
          { label: 'F4: Vch Type', key: 'F4' },
          { label: 'Alt+P: Print', action: () => printReport('daybook-report') },
          { label: 'Alt+E: Export', action: handleExport },
          { label: 'F12: Configure', key: 'F12' }
        ].map((btn) => (
          <div 
            key={btn.label} 
            onClick={btn.action}
            className="h-10 bg-tally-hotkey flex items-center px-2 cursor-pointer hover:bg-tally-accent hover:text-black"
          >
            {btn.label}
          </div>
        ))}
      </div>
    </div>
  );
}
