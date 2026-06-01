import React, { useState, useRef, useEffect } from 'react';
import { useHotkeys } from '../../hooks/useHotkeys';
import AccountGroupScreen from './AccountGroupScreen';
import LedgerScreen from '../LedgerScreen';
import CostCentreScreen from './CostCentreScreen';
import EmployeeScreen from './EmployeeScreen';

type MasterTab = 'ACCOUNT_GROUPS' | 'LEDGERS' | 'COST_CENTRES' | 'EMPLOYEES';

export default function MastersDashboard({ branchId }: { branchId?: string }) {
  const [activeTab, setActiveTab] = useState<MasterTab>('LEDGERS');
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: MasterTab; label: string; section: string; keywords: string[] }[] = [
    { id: 'ACCOUNT_GROUPS', label: 'Groups', section: 'Accounts Information', keywords: ['group', 'groups', 'account group'] },
    { id: 'LEDGERS', label: 'Ledgers', section: 'Accounts Information', keywords: ['ledger', 'ledgers'] },
    { id: 'COST_CENTRES', label: 'Cost Centres', section: 'Accounts Information', keywords: ['cost', 'centre', 'cost centre', 'cost center'] },
    { id: 'EMPLOYEES', label: 'Employees', section: 'Payroll Information', keywords: ['employee', 'employees', 'payroll', 'staff'] },
  ];

  const filteredTabs = searchText.trim()
    ? tabs.filter(t =>
        t.label.toLowerCase().includes(searchText.toLowerCase()) ||
        t.keywords.some(k => k.includes(searchText.toLowerCase()))
      )
    : [];

  const currentIdx = tabs.findIndex(t => t.id === activeTab);

  useHotkeys('down', (e) => {
    if (document.activeElement === inputRef.current) return;
    e.preventDefault();
    setActiveTab(tabs[Math.min(tabs.length - 1, currentIdx + 1)].id);
  }, {}, [activeTab, tabs]);

  useHotkeys('up', (e) => {
    if (document.activeElement === inputRef.current) return;
    e.preventDefault();
    setActiveTab(tabs[Math.max(0, currentIdx - 1)].id);
  }, {}, [activeTab, tabs]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredTabs.length > 0) {
      setActiveTab(filteredTabs[0].id);
      setSearchText('');
      setShowDropdown(false);
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setSearchText('');
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (id: MasterTab) => {
    setActiveTab(id);
    setSearchText('');
    setShowDropdown(false);
  };

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar */}
      <div className="w-[200px] border-r border-tally-teal/10 pr-4 space-y-4">

        {/* Search Input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Type to filter..."
            className="w-full px-3 py-1.5 text-xs border border-tally-teal/30 rounded bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none focus:border-tally-teal"
          />

          {/* Dropdown suggestions */}
          {showDropdown && filteredTabs.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-tally-teal/20 rounded shadow-md">
              {filteredTabs.map(tab => (
                <button
                  key={tab.id}
                  onMouseDown={() => handleSelect(tab.id)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-tally-accent hover:text-black transition-colors"
                >
                  <span className="font-bold">{tab.label}</span>
                  <span className="text-gray-400 ml-1">· {tab.section}</span>
                </button>
              ))}
            </div>
          )}

          {/* No match hint */}
          {showDropdown && searchText.trim() && filteredTabs.length === 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-tally-teal/20 rounded shadow-md px-3 py-2 text-xs text-gray-400">
              No match found
            </div>
          )}
        </div>

        {/* Accounts Info group */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest pl-2">Accounts Info</h3>
          {tabs.filter(t => t.section === 'Accounts Information').map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-tally-accent text-black border-l-4 border-tally-teal'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Payroll Info group */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest pl-2">Payroll Info</h3>
          {tabs.filter(t => t.section === 'Payroll Information').map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-tally-accent text-black border-l-4 border-tally-teal'
                  : 'hover:bg-gray-50 text-gray-600'
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
