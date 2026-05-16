import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { exportToExcel, printReport } from '../lib/ReportUtils';

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
    const relevantLedgers = ledgers.filter(l => l.group === groupName || l.group_name === groupName);
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
                       {ledgers.filter(l => l.group === s.name || l.group_name === s.name).map(l => {
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
    <div id="pl-report" className="flex flex-col h-full bg-tally-bg">
      {/* Report Header */}
      <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between sticky top-0 z-10">
        <span>Profit & Loss Account</span>
        <span className="text-tally-accent">{companyName}</span>
      </div>

      <div className="flex-grow p-4 overflow-auto">
        <div className="max-w-6xl mx-auto bg-white tally-border tally-shadow">
          {/* Company Title */}
          <div className="text-center py-4 border-b border-gray-200">
            <h1 className="text-lg font-bold uppercase">{companyName}</h1>
            <p className="text-xs font-bold">Profit & Loss A/c</p>
            <p className="text-[10px]">1-Apr-26 to 31-Mar-27</p>
          </div>

          {/* Main Table Structure */}
          <div className="flex divide-x divide-tally-teal border-b border-tally-teal">
            {/* Expenditure Column */}
            <div className="w-1/2 flex flex-col">
              <div className="bg-tally-light px-4 py-1 border-b border-tally-teal flex justify-between font-bold text-xs uppercase">
                <span>Particulars</span>
                <span>For 31-Mar-27</span>
              </div>
              <div className="flex-grow p-2">
                {renderSection('Expenses', ['Purchase Account', 'Direct Expenses', 'Indirect Expenses'])}
              </div>
            </div>

            {/* Income Column */}
            <div className="w-1/2 flex flex-col">
              <div className="bg-tally-light px-4 py-1 border-b border-tally-teal flex justify-between font-bold text-xs uppercase">
                <span>Particulars</span>
                <span>For 31-Mar-27</span>
              </div>
              <div className="flex-grow p-2">
                {renderSection('Income', ['Sales Account', 'Direct Income', 'Indirect Income'])}
              </div>
            </div>
          </div>

          <div className="bg-tally-bg p-4 flex justify-between items-center text-sm font-black uppercase text-tally-teal border-t border-tally-teal">
             <span>Net Profit for the Period</span>
             <span className="text-xl">₹ {(incomeTotal - expenseTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Button Bar */}
      <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white">
        {[
          { label: 'F1: Condensed', key: 'F1' },
          { label: 'F2: Period', key: 'F2' },
          { label: 'F3: Company', key: 'F3' },
          { label: 'Alt+P: Print', action: () => printReport('pl-report') },
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
