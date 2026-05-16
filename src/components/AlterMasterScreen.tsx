import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, ChevronRight, ChevronDown } from 'lucide-react';

import { useHotkeys } from '../hooks/useHotkeys';

interface AlterMasterScreenProps {
  branchId?: string;
  onSelectLedger?: (id: string) => void;
}

export default function AlterMasterScreen({ branchId, onSelectLedger }: AlterMasterScreenProps) {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [costCentres, setCostCentres] = useState<any[]>([]);
  const [activeType, setActiveType] = useState<'LEDGER' | 'GROUP' | 'EMPLOYEE' | 'COST_CENTRE'>('LEDGER');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [activeType]);

  const fetchData = async () => {
    const query = branchId ? `?branchId=${branchId}` : '';
    const [l, g, e, c] = await Promise.all([
      fetch(`api/ledgers${query}`).then(res => res.json()),
      fetch(`api/account-groups${query}`).then(res => res.json()),
      fetch(`api/employees${query}`).then(res => res.json()),
      fetch(`api/cost-centres${query}`).then(res => res.json()),
    ]);
    setLedgers(l);
    setGroups(g);
    setEmployees(e);
    setCostCentres(c);

    // Expand top groups by default
    const initialExpanded = g.reduce((acc: any, curr: any) => ({ ...acc, [curr.id]: true }), {});
    setExpandedGroups(initialExpanded);
  };

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const handleItemClick = (item: any) => {
    if (onSelectLedger && activeType === 'LEDGER') {
      onSelectLedger(item.id);
    } else {
      setEditingItem(item);
    }
  };

  const handleDelete = async (id: string, type: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    const path = type === 'LEDGER' ? 'ledgers' : 
                 type === 'GROUP' ? 'account-groups' : 
                 type === 'COST_CENTRE' ? 'cost-centres' : 'employees';
    const res = await fetch(`api/${path}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Deleted successfully');
      fetchData();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = activeType;
    const path = type === 'LEDGER' ? 'ledgers' : 
                 type === 'GROUP' ? 'account-groups' : 
                 type === 'COST_CENTRE' ? 'cost-centres' : 'employees';
    const res = await fetch(`api/${path}/${editingItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingItem)
    });
    if (res.ok) {
      alert('Updated successfully');
      setEditingItem(null);
      fetchData();
    }
  };

  const groupedLedgers = groups.map(g => ({
    ...g,
    ledgers: ledgers.filter(l => l.group_name === g.name)
  }));

  const getVisibleItems = () => {
    if (activeType === 'LEDGER') {
      const items: any[] = [];
      groupedLedgers.forEach(group => {
        items.push({ type: 'GROUP', id: group.id, data: group });
        if (expandedGroups[group.id]) {
          group.ledgers.forEach((l: any) => items.push({ type: 'LEDGER', id: l.id, data: l }));
        }
      });
      return items;
    } else if (activeType === 'GROUP') return groups.map(g => ({ type: 'GROUP', id: g.id, data: g }));
    else if (activeType === 'COST_CENTRE') return costCentres.map(cc => ({ type: 'COST_CENTRE', id: cc.id, data: cc }));
    else return employees.map(emp => ({ type: 'EMPLOYEE', id: emp.id, data: emp }));
  };

  useHotkeys('down', (e) => {
    if (editingItem) return;
    e.preventDefault();
    const items = getVisibleItems();
    setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
  }, { enableOnFormTags: true }, [editingItem, activeType, expandedGroups, groups, ledgers, costCentres, employees]);

  useHotkeys('up', (e) => {
    if (editingItem) return;
    e.preventDefault();
    const items = getVisibleItems();
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, { enableOnFormTags: true }, [editingItem, activeType, expandedGroups, groups, ledgers, costCentres, employees]);

  useHotkeys('enter', (e) => {
    if (editingItem) return;
    e.preventDefault();
    const items = getVisibleItems();
    const item = items[selectedIndex];
    if (item) {
      if (item.type === 'GROUP' && activeType === 'LEDGER') {
        toggleGroup(item.data.id);
      } else {
        setEditingItem(item.data);
      }
    }
  }, { enableOnFormTags: true }, [selectedIndex, editingItem, activeType, expandedGroups, groups, ledgers, costCentres, employees]);

  useHotkeys('esc', () => {
    if (editingItem) setEditingItem(null);
  }, { enableOnFormTags: true });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="flex flex-col h-full bg-tally-bg">
      <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between sticky top-0 z-10">
        <span>List of Masters</span>
        <span className="text-tally-accent">Alteration Mode</span>
      </div>

      <div className="flex h-full gap-4 p-4 overflow-hidden">
        {/* Sidebar Selector */}
        <div className="w-64 bg-white tally-border tally-shadow p-2 space-y-1">
          <h3 className="text-[10px] font-black text-gray-400 uppercase mb-4 px-2">Master Type</h3>
          {(['LEDGER', 'GROUP', 'EMPLOYEE', 'COST_CENTRE'] as const).map(type => (
            <button 
              key={type}
              onClick={() => { setActiveType(type); setEditingItem(null); }}
              className={`w-full text-left px-3 py-1 text-xs font-bold uppercase transition-colors ${activeType === type ? 'bg-tally-accent text-black' : 'hover:bg-tally-bg text-tally-teal'}`}
            >
              {type.replace('_', ' ')}s
            </button>
          ))}
        </div>

        {/* List View */}
        <div className="flex-1 overflow-auto bg-white tally-border tally-shadow">
          {editingItem ? (
            <form onSubmit={handleUpdate} className="p-8 max-w-2xl mx-auto space-y-8">
              <div className="border-b-2 border-tally-teal pb-2">
                <h2 className="text-sm font-black text-tally-teal uppercase">Alter {activeType}: {editingItem.name}</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={editingItem.name} 
                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full border-b-2 border-tally-teal p-1 text-sm font-bold outline-none focus:bg-tally-accent/10 uppercase"
                  />
                </div>
                {activeType === 'LEDGER' && (
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase">Under Group</label>
                      <select 
                        value={editingItem.group_name} 
                        onChange={e => setEditingItem({ ...editingItem, group_name: e.target.value })}
                        className="w-full border-b-2 border-tally-teal p-1 text-sm outline-none bg-transparent font-bold"
                      >
                        {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase">Opening Balance</label>
                      <input 
                        type="number" 
                        value={editingItem.openingBalance} 
                        onChange={e => setEditingItem({ ...editingItem, openingBalance: Number(e.target.value) })}
                        className="w-full border-b-2 border-tally-teal p-1 text-sm outline-none text-right font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-4 pt-8">
                <button type="submit" className="bg-tally-teal text-white px-8 py-2 text-xs font-bold uppercase tally-shadow hover:bg-tally-header">Accept (Enter)</button>
                <button type="button" onClick={() => setEditingItem(null)} className="bg-gray-200 px-8 py-2 text-xs font-bold uppercase tally-shadow hover:bg-gray-300">Quit (Esc)</button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col h-full">
              <div className="bg-tally-light px-4 py-1 border-b border-tally-teal flex justify-between font-bold text-[10px] uppercase">
                <span>Name of {activeType}</span>
                <span>Actions</span>
              </div>
              <div className="flex-grow overflow-auto">
                {activeType === 'LEDGER' && (
                  <div className="space-y-0.5">
                    {groupedLedgers.map(group => (
                      <div key={group.id} className="border-b border-gray-50 last:border-0">
                        <div 
                          className="flex items-center justify-between py-1 px-4 bg-gray-50/50 cursor-pointer group"
                          onClick={() => toggleGroup(group.id)}
                        >
                          <div className="flex items-center gap-2">
                            {expandedGroups[group.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <span className="text-[11px] font-black text-gray-500 uppercase">{group.name}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setEditingItem(group); setActiveType('GROUP'); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-tally-teal"><Edit2 className="w-3 h-3" /></button>
                        </div>
                        {expandedGroups[group.id] && (
                          <div className="space-y-0.5">
                            {group.ledgers.map((ledger: any) => (
                              <div 
                                key={ledger.id} 
                                onClick={() => handleItemClick(ledger)}
                                className="flex justify-between items-center py-1 px-8 hover:bg-tally-accent cursor-pointer group"
                              >
                                <span className="text-xs uppercase font-bold text-tally-teal">{ledger.name}</span>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                                   <button onClick={(e) => { e.stopPropagation(); setEditingItem(ledger); }} className="p-1 hover:text-tally-teal"><Edit2 className="w-3 h-3" /></button>
                                   <button onClick={(e) => { e.stopPropagation(); handleDelete(ledger.id, 'LEDGER'); }} className="p-1 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Simplified rendering for other types */}
                {activeType !== 'LEDGER' && (
                  <div className="space-y-0.5">
                    {getVisibleItems().map((item, idx) => (
                      <div 
                        key={item.id} 
                        onClick={() => setEditingItem(item.data)}
                        className={`flex justify-between items-center py-1.5 px-4 cursor-pointer group ${selectedIndex === idx ? 'bg-tally-accent' : 'hover:bg-tally-bg'}`}
                      >
                        <span className="text-xs uppercase font-bold text-tally-teal">{item.data.name}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100">
                           <button onClick={(e) => { e.stopPropagation(); setEditingItem(item.data); }} className="p-1 hover:text-tally-teal"><Edit2 className="w-3 h-3" /></button>
                           <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id, activeType); }} className="p-1 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Button Bar */}
      <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white">
        {[
          { label: 'F3: Company', key: 'F3' },
          { label: 'Alt+G: Go To', key: 'Alt+G' },
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
