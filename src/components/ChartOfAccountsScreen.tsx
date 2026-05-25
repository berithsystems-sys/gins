import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useHotkeys } from '../hooks/useHotkeys';

interface ChartOfAccountsScreenProps {
  branchId?: string;
}

export default function ChartOfAccountsScreen({ branchId }: ChartOfAccountsScreenProps) {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedLedgerData, setSelectedLedgerData] = useState<any>(null);
  const [ledgerVouchers, setLedgerVouchers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const query = branchId ? `?branchId=${branchId}` : '';
      const [l, g, v] = await Promise.all([
        fetch(`/api/ledgers${query}`).then(res => res.json()),
        fetch(`/api/account-groups${query}`).then(res => res.json()),
        fetch(`/api/vouchers${query}`).then(res => res.json())
      ]);
      setLedgers(l);
      setGroups(g);
      
      // Expand all by default for CoA
      const allExpanded = g.reduce((acc: any, curr: any) => ({ ...acc, [curr.id]: true }), {});
      setExpandedGroups(allExpanded);
      setLoading(false);
    };
    fetchData();
  }, [branchId]);

  const calculateBalance = (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    let balance = Number(ledger?.openingBalance || 0);
    const vchEntries: any[] = [];
    
    // We need to fetch vouchers with entries to calculate real balance
    // This is simplified for now assuming vouchers are available with entries
    return balance; 
  };

  const handleLedgerSelect = async (ledger: any) => {
    setSelectedLedgerData(ledger);
    // Fetch vouchers for this specific ledger
    const res = await fetch(`/api/vouchers/ledger/${ledger.id}${branchId ? `?branchId=${branchId}` : ''}`);
    const data = await res.json();
    setLedgerVouchers(data);
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleItems = useMemo(() => {
    const items: any[] = [];
    const traverse = (parentId: string | null = null) => {
      const currentGroups = groups.filter(g => g.parent_id === parentId || (!parentId && !g.parent_id));
      currentGroups.forEach(group => {
        items.push({ type: 'GROUP', id: group.id, data: group });
        if (expandedGroups[group.id]) {
          traverse(group.id);
          const groupLedgers = ledgers.filter(l => l.group_id === group.id || l.group_name === group.name);
          groupLedgers.forEach(l => items.push({ type: 'LEDGER', id: l.id, data: l }));
        }
      });
    };
    traverse();
    return items;
  }, [groups, ledgers, expandedGroups]);

  useHotkeys('down', (e) => {
    e.preventDefault();
    setSelectedIndex(prev => Math.min(visibleItems.length - 1, prev + 1));
  }, { enableOnFormTags: true }, [visibleItems]);

  useHotkeys('up', (e) => {
    e.preventDefault();
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, { enableOnFormTags: true }, [visibleItems]);

  useHotkeys('enter', (e) => {
    e.preventDefault();
    const item = visibleItems[selectedIndex];
    if (item?.type === 'GROUP') {
      toggleGroup(item.id);
    } else if (item?.type === 'LEDGER') {
      handleLedgerSelect(item.data);
    }
  }, { enableOnFormTags: true }, [visibleItems, selectedIndex, expandedGroups]);

  const renderTree = (parentId: string | null = null, level = 0, startIndex = 0) => {
    const currentGroups = groups.filter(g => g.parent_id === parentId || (!parentId && !g.parent_id));
    let globalIdx = startIndex;

    return currentGroups.map(group => {
      const isExpanded = expandedGroups[group.id];
      const childGroups = groups.filter(g => g.parent_id === group.id);
      const groupLedgers = ledgers.filter(l => l.group_id === group.id || l.group_name === group.name);
      
      const isSelected = visibleItems[selectedIndex]?.id === group.id && visibleItems[selectedIndex]?.type === 'GROUP';
      
      return (
        <div key={group.id} className="select-none">
          <div 
            onClick={() => {
              const idx = visibleItems.findIndex(v => v.id === group.id && v.type === 'GROUP');
              setSelectedIndex(idx);
              toggleGroup(group.id);
            }}
            className={`flex items-center gap-2 py-1 px-2 cursor-pointer group ${isSelected ? 'bg-tally-accent' : 'hover:bg-tally-accent/30'}`}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            { (childGroups.length > 0 || groupLedgers.length > 0) ? (
              isExpanded ? <ChevronDown className="w-3 h-3 text-tally-teal" /> : <ChevronRight className="w-3 h-3 text-tally-teal" />
            ) : <div className="w-3" /> }
            <span className={`text-xs font-bold uppercase ${isSelected ? 'text-black' : 'text-tally-teal'}`}>{group.name}</span>
            <span className="text-[9px] text-gray-400 italic opacity-0 group-hover:opacity-100">(Group)</span>
          </div>
          
          {isExpanded && (
            <>
              {renderTree(group.id, level + 1)}
              {groupLedgers.map(ledger => {
                const isLedgerSelected = visibleItems[selectedIndex]?.id === ledger.id && visibleItems[selectedIndex]?.type === 'LEDGER';
                return (
                  <div 
                      key={ledger.id}
                      onClick={() => {
                        const idx = visibleItems.findIndex(v => v.id === ledger.id && v.type === 'LEDGER');
                        setSelectedIndex(idx);
                        handleLedgerSelect(ledger);
                      }}
                      className={`flex items-center gap-2 py-0.5 px-2 cursor-pointer group ${isLedgerSelected ? 'bg-tally-accent' : 'hover:bg-tally-accent/30'}`}
                    style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
                  >
                    <FileText className={`w-3 h-3 ${isLedgerSelected ? 'text-black' : 'text-gray-400'}`} />
                    <span className={`text-xs uppercase ${isLedgerSelected ? 'text-black font-bold' : 'text-gray-700'}`}>{ledger.name}</span>
                    <span className="text-[9px] text-gray-400 italic opacity-0 group-hover:opacity-100">(Ledger)</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-tally-bg">
      <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between">
        <span>Chart of Accounts</span>
        <span className="text-tally-accent">Church Multi-Branch ERP</span>
      </div>

      <div className="flex-grow p-4 overflow-auto">
        <div className="max-w-4xl mx-auto bg-white tally-border tally-shadow p-4 min-h-full">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h2 className="text-sm font-black text-tally-teal uppercase">List of Ledgers</h2>
            <div className="flex gap-2">
               <button onClick={() => setExpandedGroups(groups.reduce((acc: any, g: any) => ({ ...acc, [g.id]: true }), {}))} className="text-[9px] font-bold bg-gray-100 px-2 py-1 uppercase">Expand All</button>
               <button onClick={() => setExpandedGroups({})} className="text-[9px] font-bold bg-gray-100 px-2 py-1 uppercase">Collapse All</button>
            </div>
          </div>

          {loading ? (
            <div className="p-20 text-center italic text-gray-400">Loading hierarchy...</div>
          ) : (
            <div className="flex gap-4 h-[500px]">
              <div className="flex-1 overflow-auto border-r pr-4">
                <div className="space-y-0.5">
                  {renderTree()}
                </div>
              </div>

              {selectedLedgerData && (
                <div className="w-96 overflow-auto bg-gray-50 p-4 tally-border">
                  <div className="flex justify-between items-start border-b border-tally-teal pb-2 mb-4">
                    <div>
                      <h3 className="text-sm font-black text-tally-teal uppercase">{selectedLedgerData.name}</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">{selectedLedgerData.group_name}</p>
                    </div>
                    <button onClick={() => setSelectedLedgerData(null)} className="text-xs font-bold text-red-600 hover:bg-red-50 px-2">X</button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-2 border border-gray-200">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Opening Balance</p>
                        <p className="text-xs font-black text-tally-teal">
                          {selectedLedgerData.openingBalance?.toLocaleString()} {selectedLedgerData.balanceType}
                        </p>
                      </div>
                      <div className="bg-white p-2 border border-gray-200">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Current Balance</p>
                        <p className="text-xs font-black text-blue-700">
                          {/* Real balance calculation would happen here */}
                          {selectedLedgerData.openingBalance?.toLocaleString()} {selectedLedgerData.balanceType}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200">
                      <div className="bg-gray-100 px-2 py-1 text-[9px] font-black uppercase text-gray-600 flex justify-between">
                        <span>Recent Vouchers</span>
                        <span>Amount</span>
                      </div>
                      <div className="divide-y divide-gray-100 max-h-64 overflow-auto">
                        {ledgerVouchers.length > 0 ? ledgerVouchers.map(vch => (
                          <div key={vch.id} className="p-2 text-[10px] flex justify-between hover:bg-tally-accent/10">
                            <div>
                              <div className="font-bold uppercase text-tally-teal">{vch.type}</div>
                              <div className="text-gray-400">{vch.date}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold">₹{vch.amount?.toLocaleString()}</div>
                              <div className={`font-bold text-[8px] ${vch.type === 'Receipt' ? 'text-green-600' : 'text-red-600'}`}>
                                {vch.type === 'Receipt' ? 'Dr' : 'Cr'}
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="p-4 text-center text-[10px] italic text-gray-400 uppercase">No transactions found</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Button Bar */}
      <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white">
        {[
          { label: 'F2: Period', key: 'F2' },
          { label: 'F3: Company', key: 'F3' },
          { label: 'Alt+H: Change View', key: 'Alt+H' },
          { label: 'Alt+P: Print', key: 'Alt+P' },
          { label: 'F12: Configure', key: 'F12' }
        ].map((btn) => (
          <div key={btn.label} className="h-10 bg-tally-hotkey flex items-center px-2 cursor-pointer hover:bg-tally-accent hover:text-black">
            {btn.label}
          </div>
        ))}
      </div>
    </div>
  );
}
