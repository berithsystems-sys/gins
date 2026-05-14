import React, { useState } from 'react';
import AccountGroupScreen from './AccountGroupScreen';
import LedgerScreen from '../LedgerScreen';
import StockGroupScreen from './StockGroupScreen';
import StockItemScreen from './StockItemScreen';
import UnitOfMeasureScreen from './UnitOfMeasureScreen';

type MasterTab = 'ACCOUNT_GROUPS' | 'LEDGERS' | 'STOCK_GROUPS' | 'STOCK_ITEMS' | 'UNITS';

export default function MastersDashboard({ branchId }: { branchId?: string }) {
  const [activeTab, setActiveTab] = useState<MasterTab>('LEDGERS');

  const tabs: { id: MasterTab; label: string; section: string }[] = [
    { id: 'ACCOUNT_GROUPS', label: 'Groups', section: 'Accounts Information' },
    { id: 'LEDGERS', label: 'Ledgers', section: 'Accounts Information' },
    { id: 'STOCK_GROUPS', label: 'Stock Groups', section: 'Inventory Information' },
    { id: 'STOCK_ITEMS', label: 'Stock Items', section: 'Inventory Information' },
    { id: 'UNITS', label: 'Units of Measure', section: 'Inventory Information' },
  ];

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
          <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest pl-2">Inventory Info</h3>
          {tabs.filter(t => t.section === 'Inventory Information').map(tab => (
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
        {activeTab === 'STOCK_GROUPS' && <StockGroupScreen branchId={branchId} />}
        {activeTab === 'STOCK_ITEMS' && <StockItemScreen branchId={branchId} />}
        {activeTab === 'UNITS' && <UnitOfMeasureScreen branchId={branchId} />}
      </div>
    </div>
  );
}
