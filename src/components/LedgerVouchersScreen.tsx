import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { printReport, exportToExcel } from '../lib/ReportUtils';

interface LedgerVouchersProps {
  branchId?: string;
  ledgerId?: string;
  onBack: () => void;
}

export default function LedgerVouchersScreen({ branchId, ledgerId, onBack }: LedgerVouchersProps) {
  const [ledger, setLedger] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const query = branchId ? `?branchId=${branchId}` : '';
      const [ledgersRes, vouchersRes] = await Promise.all([
        fetch(`/api/ledgers${query}`).then(res => res.json()),
        fetch(`/api/vouchers${query}`).then(res => res.json())
      ]);

      const selectedLedger = ledgersRes.find((l: any) => l.id === ledgerId);
      setLedger(selectedLedger);

      // Filter vouchers that contain this ledger in their entries
      const relevantVouchers = vouchersRes.filter((v: any) => 
        v.entries?.some((e: any) => e.ledgerId === ledgerId)
      ).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setVouchers(relevantVouchers);
      setLoading(false);
    };
    if (ledgerId) fetchData();
  }, [branchId, ledgerId]);

  const calculateRunningBalance = () => {
    let balance = ledger?.openingBalance || 0;
    const type = ledger?.balanceType || 'Dr';
    if (type === 'Cr') balance = -balance;

    return vouchers.map(v => {
      const entry = v.entries.find((e: any) => e.ledgerId === ledgerId);
      if (entry.type === 'Dr') balance += entry.amount;
      else balance -= entry.amount;
      return { ...v, runningBalance: balance, entry };
    });
  };

  const reportData = calculateRunningBalance();
  const openingBal = ledger?.openingBalance || 0;
  const openingType = ledger?.balanceType || 'Dr';
  const finalBal = reportData.length > 0 ? reportData[reportData.length - 1].runningBalance : (openingType === 'Dr' ? openingBal : -openingBal);

  return (
    <div id="ledger-report" className="flex flex-col h-full bg-tally-bg">
      <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <ArrowLeft className="w-4 h-4 cursor-pointer hover:text-tally-accent" onClick={onBack} />
          <span>Ledger Vouchers</span>
        </div>
        <span className="text-tally-accent">{ledger?.name || 'Loading...'}</span>
      </div>

      <div className="flex-grow p-4 overflow-auto">
        <div className="max-w-6xl mx-auto bg-white tally-border tally-shadow min-h-[500px]">
          <div className="text-center py-4 border-b border-gray-200">
            <h1 className="text-lg font-bold uppercase">{ledger?.name}</h1>
            <p className="text-[10px]">1-Apr-26 to 31-Mar-27</p>
          </div>

          <table className="w-full text-xs">
            <thead className="bg-tally-light border-b border-tally-teal">
              <tr className="font-bold uppercase text-[10px]">
                <th className="px-4 py-1 text-left w-24">Date</th>
                <th className="px-4 py-1 text-left">Particulars</th>
                <th className="px-4 py-1 text-left w-24">Vch Type</th>
                <th className="px-4 py-1 text-center w-20">Vch No.</th>
                <th className="px-4 py-1 text-right w-32">Debit</th>
                <th className="px-4 py-1 text-right w-32">Credit</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening Balance */}
              <tr className="bg-gray-50 italic">
                <td className="px-4 py-1">1-Apr-26</td>
                <td className="px-4 py-1 font-bold">Opening Balance</td>
                <td colSpan={2}></td>
                <td className="px-4 py-1 text-right">{openingType === 'Dr' ? openingBal.toLocaleString() : ''}</td>
                <td className="px-4 py-1 text-right">{openingType === 'Cr' ? openingBal.toLocaleString() : ''}</td>
              </tr>

              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center italic text-gray-400">Loading vouchers...</td></tr>
              ) : reportData.map((row, idx) => (
                <tr key={row.id} className="hover:bg-tally-accent cursor-pointer border-b border-gray-50">
                  <td className="px-4 py-1">{format(new Date(row.date), 'dd-MMM-yy')}</td>
                  <td className="px-4 py-1 font-bold">
                    {row.entries.find((e: any) => e.ledgerId !== ledgerId)?.ledger_name || row.narration || '(Multiple Ledgers)'}
                  </td>
                  <td className="px-4 py-1 italic">{row.type}</td>
                  <td className="px-4 py-1 text-center">{row.number || idx + 1}</td>
                  <td className="px-4 py-1 text-right">{row.entry.type === 'Dr' ? row.entry.amount.toLocaleString() : ''}</td>
                  <td className="px-4 py-1 text-right">{row.entry.type === 'Cr' ? row.entry.amount.toLocaleString() : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-tally-teal bg-tally-light">
              <tr className="font-bold uppercase text-[10px]">
                <td colSpan={4} className="px-4 py-1 text-right">Closing Balance</td>
                <td className="px-4 py-1 text-right border-t border-tally-teal">
                  {finalBal >= 0 ? Math.abs(finalBal).toLocaleString() : ''}
                </td>
                <td className="px-4 py-1 text-right border-t border-tally-teal">
                  {finalBal < 0 ? Math.abs(finalBal).toLocaleString() : ''}
                </td>
              </tr>
              <tr className="font-bold uppercase text-xs bg-tally-sidebar text-white">
                <td colSpan={4} className="px-4 py-1 text-right">Total</td>
                <td className="px-4 py-1 text-right">
                   {finalBal >= 0 ? `₹ ${Math.abs(finalBal).toLocaleString()} Dr` : ''}
                </td>
                <td className="px-4 py-1 text-right">
                   {finalBal < 0 ? `₹ ${Math.abs(finalBal).toLocaleString()} Cr` : ''}
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
          { label: 'F4: Ledger', key: 'F4' },
          { label: 'Alt+P: Print', action: () => printReport('ledger-report') },
          { label: 'Alt+E: Export', action: () => exportToExcel(reportData, 'Ledger_Report') },
          { label: 'F12: Configure', key: 'F12' }
        ].map((btn) => (
          <div key={btn.label} onClick={btn.action} className="h-10 bg-tally-hotkey flex items-center px-2 cursor-pointer hover:bg-tally-accent hover:text-black">
            {btn.label}
          </div>
        ))}
      </div>
    </div>
  );
}
