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
      try {
        console.log('Fetching Balance Sheet data for branch:', branchId);
        const query = branchId ? `?branchId=${branchId}` : '';
        const [l, v, g, b] = await Promise.all([
          fetch(`/api/ledgers${query}`).then(res => res.json()),
          fetch(`/api/vouchers${query}`).then(res => res.json()),
          fetch(`/api/account-groups${query}`).then(res => res.json()),
          fetch(`/api/branches`).then(res => res.json())
        ]);
        
        console.log('Data received:', { ledgers: l.length, vouchers: v.length, groups: g.length });
        
        setLedgers(Array.isArray(l) ? l : []);
        setVouchers(Array.isArray(v) ? v : []);
        setGroups(Array.isArray(g) ? g : []);
        
        if (branchId && Array.isArray(b)) {
          const currentBranch = b.find((curr: any) => curr.id === branchId);
          if (currentBranch) setCompanyName(currentBranch.name);
        }
      } catch (err) {
        console.error('Balance Sheet Fetch Error:', err);
      }
    };
    fetchData();
  }, [branchId]);

  const calculateBalance = (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return 0;
    
    let balance = Number(ledger.openingBalance || 0);
    
    vouchers.forEach(v => {
      if (v.entries && Array.isArray(v.entries)) {
        v.entries.forEach((e: any) => {
          if (e.ledgerId === ledgerId) {
            const amt = Number(e.amount || 0);
            if (e.type === 'Dr') balance += amt;
            else balance -= amt;
          }
        });
      }
    });
    return balance;
  };

  const getGroupTotal = (groupName: string) => {
    // Find ledgers in this group
    const relevantLedgers = ledgers.filter(l => 
      l.group_name === groupName || l.group === groupName
    );
    
    let total = relevantLedgers.reduce((acc, l) => acc + calculateBalance(l.id), 0);

    // Add sub-groups
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
    const sections = groupNames.map(name => ({
      name,
      balance: getGroupTotal(name)
    }));

    // For Liabilities, Cr (-ve) is positive display
    // For Assets, Dr (+ve) is positive display
    const normalizedSections = sections.map(s => ({
      ...s,
      displayBalance: title === 'Liabilities' ? -s.balance : s.balance
    }));

    const total = normalizedSections.reduce((acc, s) => acc + s.displayBalance, 0);

    return (
      <div className="flex flex-col w-full h-full">
        <div className="flex-1 min-h-[300px] border-b border-tally-teal/30">
          {normalizedSections.map(s => {
            const isExpanded = expandedGroups.includes(s.name);
            return (
              <div key={s.name} className="flex flex-col border-b border-gray-50 last:border-0">
                <div 
                  onClick={() => toggleGroup(s.name)}
                  className="flex justify-between items-center py-1.5 px-2 hover:bg-tally-accent/10 cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-[10px] font-bold text-gray-400">
                      {isExpanded ? '[-]' : '[+]'}
                    </span>
                    <span className="text-[11px] font-bold uppercase text-gray-700">{s.name}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold">
                    {Math.abs(s.displayBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {isExpanded && (
                  <div className="bg-gray-50/50 py-1">
                    {ledgers.filter(l => l.group_name === s.name || l.group === s.name).map(l => {
                      const bal = calculateBalance(l.id);
                      const displayBal = title === 'Liabilities' ? -bal : bal;
                      if (Math.abs(displayBal) < 0.01) return null;
                      return (
                        <div key={l.id} className="flex justify-between px-8 py-0.5 text-[10px] italic text-gray-500">
                          <span>{l.name}</span>
                          <span className="font-mono">{Math.abs(displayBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="bg-tally-light p-2 flex justify-between font-black text-xs text-tally-teal border-t-2 border-tally-teal">
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
