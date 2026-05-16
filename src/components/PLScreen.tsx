import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { exportToExcel } from '../lib/ReportUtils';

export default function PLScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState('BERITHSYSTEMS');
  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString('en-IN'));

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
      v.entries?.forEach((e: any) => {
        if (e.ledgerId === ledgerId) {
          if (e.type === 'Dr') balance += e.amount;
          else balance -= e.amount;
        }
      });
    });
    return balance;
  };

  const getGroupTotal = (groupName: string) => {
    const relevantLedgers = ledgers.filter(l => l.group === groupName);
    return relevantLedgers.reduce((acc, l) => acc + calculateBalance(l.id), 0);
  };

  const toggleGroup = (groupName: string) => {
    if (expandedGroups.includes(groupName)) {
      setExpandedGroups(prev => prev.filter(g => g !== groupName));
    } else {
      setExpandedGroups(prev => [...prev, groupName]);
    }
  };

  const renderSection = (title: string, groupNames: string[]) => {
    const sections = groupNames.map(name => ({ name, balance: getGroupTotal(name) }));
    const total = sections.reduce((acc, s) => acc + s.balance, 0);

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-2">
          {sections.map(s => {
             const isExpanded = expandedGroups.includes(s.name);
             return (
               <div key={s.name} className="flex flex-col border-b border-gray-100 last:border-0">
                  <div 
                    onClick={() => toggleGroup(s.name)}
                    className="flex justify-between items-center text-[11px] md:text-[13px] py-1.5 px-1 hover:bg-tally-accent/10 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                       <span className={`w-3 h-3 flex items-center justify-center font-mono text-[8px] border ${isExpanded ? 'bg-tally-teal text-white' : 'bg-gray-100'}`}>
                         {isExpanded ? '-' : '+'}
                       </span>
                       <span className="font-bold text-gray-700 uppercase tracking-tight">{s.name}</span>
                    </div>
                    <span className="font-mono font-bold text-tally-teal">
                      {Math.abs(s.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} 
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="pl-6 mb-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                       {ledgers.filter(l => l.group === s.name).map(l => {
                          const bal = calculateBalance(l.id);
                          if (bal === 0) return null;
                          return (
                            <div key={l.id} className="flex justify-between text-[11px] text-gray-500 italic">
                               <span>{l.name}</span>
                               <span className="font-mono">{Math.abs(bal).toLocaleString()}</span>
                            </div>
                          );
                       })}
                    </div>
                  )}
               </div>
             );
          })}
        </div>
        <div className="flex justify-between text-[11px] md:text-sm font-black border-t-4 border-double border-red-700 pt-2 mt-4 px-1 text-red-700 bg-red-50/50">
          <span>TOTAL</span>
          <span className="font-mono">₹ {Math.abs(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  };

  const handleExport = () => {
    const data = [
      { Category: 'Expenses', Group: 'Purchase Account', Amount: getGroupTotal('Purchase Account') },
      { Category: 'Expenses', Group: 'Direct Expenses', Amount: getGroupTotal('Direct Expenses') },
      { Category: 'Expenses', Group: 'Indirect Expenses', Amount: getGroupTotal('Indirect Expenses') },
      { Category: 'Income', Group: 'Sales Account', Amount: getGroupTotal('Sales Account') },
      { Category: 'Income', Group: 'Direct Income', Amount: getGroupTotal('Direct Income') },
      { Category: 'Income', Group: 'Indirect Income', Amount: getGroupTotal('Indirect Income') },
    ];
    exportToExcel(data, 'Profit_And_Loss');
  };

  const expenseTotal = ['Purchase Account', 'Direct Expenses', 'Indirect Expenses'].reduce((acc, g) => acc + getGroupTotal(g), 0);
  const incomeTotal = ['Sales Account', 'Direct Income', 'Indirect Income'].reduce((acc, g) => acc + getGroupTotal(g), 0);

  return (
    <div id="pl-report" className="p-4 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end border-b-2 border-red-700 pb-2">
        <h2 className="text-xl font-black text-red-700 uppercase flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Profit & Loss Account
        </h2>
        <div className="flex gap-2">
           <button className="flex items-center gap-1 text-[10px] bg-gray-100 hover:bg-gray-200 px-3 py-1 font-bold uppercase border" onClick={() => window.print()}>
            <Printer className="w-3 h-3" /> Print (Alt+P)
          </button>
          <button className="flex items-center gap-1 text-[10px] bg-red-700 text-white hover:bg-red-800 px-3 py-1 font-bold uppercase shadow" onClick={handleExport}>
            <Download className="w-3 h-3" /> Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-red-700 bg-white shadow-xl p-4 md:p-6">
          <h3 className="text-xs md:text-sm font-black text-red-700 uppercase mb-4 md:mb-6 border-b-2 border-red-700 pb-1 italic">Expenditure</h3>
          {renderSection('Expenses', ['Purchase Account', 'Direct Expenses', 'Indirect Expenses'])}
        </div>
        <div className="border border-red-700 bg-white shadow-xl p-4 md:p-6">
          <h3 className="text-xs md:text-sm font-black text-green-700 uppercase mb-4 md:mb-6 border-b-2 border-green-700 pb-1 italic">Incomes</h3>
          {renderSection('Income', ['Sales Account', 'Direct Income', 'Indirect Income'])}
        </div>
      </div>

      <div className="bg-gray-100 p-4 border flex justify-between items-center text-xs md:text-sm font-black uppercase text-tally-teal">
         <span>Net Profit for the Period</span>
         <span className="text-lg md:text-xl">₹ {(incomeTotal - expenseTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}
