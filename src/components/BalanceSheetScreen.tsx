import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { exportToExcel, printReport } from '../lib/ReportUtils';

export default function BalanceSheetScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState('BERITHSYSTEMS');
  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString('en-IN'));

  useEffect(() => {
    const fetchData = async () => {
      const query = branchId ? `?branchId=${branchId}` : '';
      const [l, v, g, b] = await Promise.all([
        fetch(`/api/ledgers${query}`).then(res => res.json()),
        fetch(`/api/vouchers${query}`).then(res => res.json()),
        fetch(`/api/account-groups${query}`).then(res => res.json()),
        fetch(`/api/branches`).then(res => res.json())
      ]);
      setLedgers(l);
      setVouchers(v);
      setGroups(g);
      
      if (branchId) {
        const currentBranch = b.find((curr: any) => curr.id === branchId);
        if (currentBranch) setCompanyName(currentBranch.name);
      }
    };
    fetchData();
  }, [branchId]);

  const calculateBalance = (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return 0;
    
    let balance = Number(ledger.openingBalance || 0);
    const type = ledger.balanceType || 'Dr'; // Default to Dr if not specified

    vouchers.forEach(v => {
      v.entries?.forEach((e: any) => {
        if (e.ledgerId === ledgerId) {
          const amt = Number(e.amount || 0);
          if (e.type === 'Dr') {
            balance += amt;
          } else {
            balance -= amt;
          }
        }
      });
    });
    
    // In Tally, Assets/Expenses are usually Dr (+ve), Liabilities/Income are usually Cr (-ve)
    // For the Balance Sheet, we want to show the magnitude and handle the signs based on the category
    return balance;
  };

  const getGroupTotal = (groupName: string) => {
    // Find all ledgers belonging to this group
    const relevantLedgers = ledgers.filter(l => 
      l.group_name === groupName || 
      l.group === groupName
    );
    
    let total = relevantLedgers.reduce((acc, l) => acc + calculateBalance(l.id), 0);

    // Also include sub-groups (recursive calculation)
    const subGroups = groups.filter(g => g.parent_group === groupName);
    subGroups.forEach(sg => {
      total += getGroupTotal(sg.name);
    });

    return total;
  };

  const toggleGroup = (groupName: string) => {
    if (expandedGroups.includes(groupName)) {
      setExpandedGroups(prev => prev.filter(g => g !== groupName));
    } else {
      setExpandedGroups(prev => [...prev, groupName]);
    }
  };

  const renderSection = (title: string, groupNames: string[]) => {
    const sections = groupNames.map(name => {
      const balance = getGroupTotal(name);
      // For Liabilities, Cr is positive, Dr is negative.
      // For Assets, Dr is positive, Cr is negative.
      const displayBalance = title === 'Liabilities' ? -balance : balance;
      return { name, balance: displayBalance };
    });
    const total = sections.reduce((acc, s) => acc + s.balance, 0);

    return (
      <div className="flex flex-col h-full min-h-[200px]">
        <div className="flex-1 space-y-1">
          {sections.map(s => {
             const isExpanded = expandedGroups.includes(s.name);
             // Always show the main groups even if balance is 0, to show the report structure
             return (
               <div key={s.name} className="flex flex-col">
                  <div 
                    onClick={() => toggleGroup(s.name)}
                    className="flex justify-between items-center text-[11px] md:text-[12px] py-1 px-1 hover:bg-tally-accent/10 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                       <span className={`w-3 h-3 flex items-center justify-center font-mono text-[8px] border ${isExpanded ? 'bg-tally-teal text-white' : 'bg-gray-100'}`}>
                         {isExpanded ? '-' : '+'}
                       </span>
                       <span className="font-bold text-gray-700 uppercase tracking-tight">{s.name}</span>
                    </div>
                    <span className="font-mono font-bold">
                      {Math.abs(s.balance) > 0 ? Math.abs(s.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : "0.00"} 
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="pl-6 mb-1 space-y-0.5 border-l border-gray-100 ml-2">
                       {ledgers.filter(l => l.group === s.name || l.group_name === s.name).map(l => {
                          const bal = calculateBalance(l.id);
                          const displayBal = title === 'Liabilities' ? -bal : bal;
                          return (
                            <div key={l.id} className="flex justify-between text-[10px] text-gray-500 italic px-1">
                               <span>{l.name}</span>
                               <span className="font-mono">{Math.abs(displayBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          );
                       })}
                       {/* Also show sub-groups if any */}
                       {groups.filter(g => g.parent_group === s.name).map(sg => (
                         <div key={sg.id} className="pl-2">
                            <div className="flex justify-between text-[10px] font-bold text-gray-600 uppercase">
                               <span>{sg.name}</span>
                               <span className="font-mono">{Math.abs(getGroupTotal(sg.name)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
             );
          })}
        </div>
        <div className="flex justify-between text-[11px] md:text-sm font-black border-t-2 border-tally-teal pt-1 mt-2 px-1 text-tally-teal bg-teal-50/30">
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
    <div id="balance-sheet-report" className="flex flex-col h-full bg-tally-bg">
      {/* Report Header */}
      <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between sticky top-0 z-10">
        <span>Balance Sheet</span>
        <span className="text-tally-accent">{companyName}</span>
      </div>

      <div className="flex-grow p-4 overflow-auto">
        <div className="max-w-6xl mx-auto bg-white tally-border tally-shadow">
          {/* Company Title */}
          <div className="text-center py-4 border-b border-gray-200">
            <h1 className="text-lg font-bold uppercase">{companyName}</h1>
            <p className="text-xs font-bold">Balance Sheet</p>
            <p className="text-[10px]">1-Apr-26 to 31-Mar-27</p>
          </div>

          {/* Main Table Structure */}
          <div className="flex divide-x divide-tally-teal border-b border-tally-teal">
            {/* Liabilities Column */}
            <div className="w-1/2 flex flex-col">
              <div className="bg-tally-light px-4 py-1 border-b border-tally-teal flex justify-between font-bold text-xs uppercase">
                <span>Liabilities</span>
                <span>as at 31-Mar-27</span>
              </div>
              <div className="flex-grow p-2">
                {renderSection('Liabilities', ['Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Suspense Account'])}
              </div>
            </div>

            {/* Assets Column */}
            <div className="w-1/2 flex flex-col">
              <div className="bg-tally-light px-4 py-1 border-b border-tally-teal flex justify-between font-bold text-xs uppercase">
                <span>Assets</span>
                <span>as at 31-Mar-27</span>
              </div>
              <div className="flex-grow p-2">
                {renderSection('Assets', ['Fixed Assets', 'Investments', 'Current Assets'])}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Button Bar */}
      <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white">
        {[
          { label: 'F1: Condensed', key: 'F1' },
          { label: 'F2: Period', key: 'F2' },
          { label: 'F3: Company', key: 'F3' },
          { label: 'Alt+P: Print', action: () => printReport('balance-sheet-report') },
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
