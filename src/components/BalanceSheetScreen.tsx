import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { exportToExcel } from '../lib/ReportUtils';

export default function BalanceSheetScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/ledgers${query}`).then(res => res.json()),
      fetch(`/api/vouchers${query}`).then(res => res.json()),
      fetch(`/api/account-groups${query}`).then(res => res.json())
    ]).then(([l, v, g]) => {
      setLedgers(l);
      setVouchers(v);
      setGroups(g);
    });
  }, [branchId]);

  const calculateBalance = (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    let balance = ledger?.openingBalance || 0;
    vouchers.forEach(v => {
      v.entries.forEach((e: any) => {
        if (e.ledgerId === ledgerId) {
          if (e.type === 'Dr') balance += e.amount;
          else balance -= e.amount;
        }
      });
    });
    return balance;
  };

  const getGroupTotal = (groupName: string) => {
    const targetGroup = groups.find(g => g.name === groupName);
    if (!targetGroup) return 0;
    const subGroupIds = groups.filter(g => g.under === targetGroup.id).map(g => g.id);
    const relevantGroupIds = [targetGroup.id, ...subGroupIds];
    const relevantLedgers = ledgers.filter(l => relevantGroupIds.includes(l.groupId) || l.group_name === groupName);
    return relevantLedgers.reduce((acc, l) => acc + calculateBalance(l.id), 0);
  };

  const renderSection = (title: string, groupNames: string[]) => {
    const sections = groupNames.map(name => ({ name, balance: getGroupTotal(name) }));
    const total = sections.reduce((acc, s) => acc + s.balance, 0);

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-2">
          {sections.map(s => (
            <div key={s.name} className="flex justify-between text-[13px] py-1 px-1 hover:bg-tally-accent/10 transition-colors border-b border-gray-100 group">
              <span className="font-bold text-gray-700">{s.name}</span>
              <span className="font-mono font-bold text-tally-teal">{Math.abs(s.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {s.balance >= 0 ? 'Dr' : 'Cr'}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm font-black border-t-4 border-double border-tally-teal pt-2 mt-4 px-1 text-tally-teal bg-teal-50/50">
          <span>TOTAL</span>
          <span className="font-mono">₹ {Math.abs(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  };

  const handleExport = () => {
    const data = [
      { Category: 'Liabilities', Group: 'Capital Account', Amount: getGroupTotal('Capital Account') },
      { Category: 'Liabilities', Group: 'Loans (Liability)', Amount: getGroupTotal('Loans (Liability)') },
      { Category: 'Liabilities', Group: 'Current Liabilities', Amount: getGroupTotal('Current Liabilities') },
      { Category: 'Assets', Group: 'Fixed Assets', Amount: getGroupTotal('Fixed Assets') },
      { Category: 'Assets', Group: 'Investments', Amount: getGroupTotal('Investments') },
      { Category: 'Assets', Group: 'Current Assets', Amount: getGroupTotal('Current Assets') },
    ];
    exportToExcel(data, 'Balance_Sheet');
  };

  return (
    <div id="balance-sheet-report" className="p-4 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end border-b-2 border-tally-teal pb-2">
        <h2 className="text-xl font-black text-tally-teal uppercase flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Balance Sheet
        </h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 text-[10px] bg-gray-100 hover:bg-gray-200 px-3 py-1 font-bold uppercase border" onClick={() => window.print()}>
            <Printer className="w-3 h-3" /> Print (Alt+P)
          </button>
          <button className="flex items-center gap-1 text-[10px] bg-tally-teal text-white hover:bg-teal-700 px-3 py-1 font-bold uppercase shadow" onClick={handleExport}>
            <Download className="w-3 h-3" /> Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-tally-teal bg-white shadow-xl p-6">
          <h3 className="text-sm font-black text-red-700 uppercase mb-6 border-b-2 border-red-700 pb-1 italic">Liabilities</h3>
          {renderSection('Liabilities', ['Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Suspense Account'])}
        </div>
        <div className="border border-tally-teal bg-white shadow-xl p-6">
          <h3 className="text-sm font-black text-green-700 uppercase mb-6 border-b-2 border-green-700 pb-1 italic">Assets</h3>
          {renderSection('Assets', ['Fixed Assets', 'Investments', 'Current Assets'])}
        </div>
      </div>
    </div>
  );
}
