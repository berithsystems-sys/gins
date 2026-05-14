import React, { useState, useEffect } from 'react';
import { useHotkeys } from '../../hooks/useHotkeys';
import AccountGroupScreen from './AccountGroupScreen';
import LedgerScreen from '../LedgerScreen';
import CostCentreScreen from './CostCentreScreen';
import EmployeeScreen from './EmployeeScreen';

type MasterTab = 'ACCOUNT_GROUPS' | 'LEDGERS' | 'COST_CENTRES' | 'EMPLOYEES';

export default function MastersDashboard({ branchId }: { branchId?: string }) {
  const [activeTab, setActiveTab] = useState<MasterTab>('LEDGERS');

  const tabs: { id: MasterTab; label: string; section: string }[] = [
    { id: 'ACCOUNT_GROUPS', label: 'Groups', section: 'Accounts Information' },
    { id: 'LEDGERS', label: 'Ledgers', section: 'Accounts Information' },
    { id: 'COST_CENTRES', label: 'Cost Centres', section: 'Accounts Information' },
    { id: 'EMPLOYEES', label: 'Employees', section: 'Payroll Information' },
  ];

  const currentIdx = tabs.findIndex(t => t.id === activeTab);

  useHotkeys('down', (e) => {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
    e.preventDefault();
    setActiveTab(tabs[Math.min(tabs.length - 1, currentIdx + 1)].id);
  }, {}, [activeTab, tabs]);

  useHotkeys('up', (e) => {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
    e.preventDefault();
    setActiveTab(tabs[Math.max(0, currentIdx - 1)].id);
  }, {}, [activeTab, tabs]);

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar for Masters */}
      <div className="w-[200px] border-r border-tally-teal/10 pr-4 space-y-6">
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest pl-2">Accounts Info</h3>
          {tabs.filter(t => t.section === 'Accounts Information').map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.id ? 'bg-tally-accent text-black border-l-4 border-tally-teal' : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest pl-2">Payroll Info</h3>
          {tabs.filter(t => t.section === 'Payroll Information').map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.id ? 'bg-tally-accent text-black border-l-4 border-tally-teal' : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto pr-2">
        <h2 className="text-sm font-bold text-tally-teal uppercase mb-4 border-b border-tally-teal/10 pb-2">
          {tabs.find(t => t.id === activeTab)?.label} Creation
        </h2>
        
        {activeTab === 'ACCOUNT_GROUPS' && <AccountGroupScreen branchId={branchId} />}
        {activeTab === 'LEDGERS' && <LedgerScreen branchId={branchId} />}
        {activeTab === 'COST_CENTRES' && <CostCentreScreen branchId={branchId} />}
        {activeTab === 'EMPLOYEES' && <EmployeeScreen branchId={branchId} />}
      </div>
    </div>
  );
}
