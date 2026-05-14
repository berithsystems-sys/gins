import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, ChevronRight, ChevronDown } from 'lucide-react';

interface AlterMasterScreenProps {
  branchId?: string;
}

export default function AlterMasterScreen({ branchId }: AlterMasterScreenProps) {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [costCentres, setCostCentres] = useState<any[]>([]);
  const [activeType, setActiveType] = useState<'LEDGER' | 'GROUP' | 'EMPLOYEE' | 'COST_CENTRE'>('LEDGER');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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
  };

  useEffect(() => {
    fetchData();
  }, [branchId]);

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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar Selector */}
      <div className="w-64 border-r pr-4 space-y-2">
        <h3 className="text-[10px] font-black text-gray-400 uppercase mb-4">Select Master Type</h3>
        {(['LEDGER', 'GROUP', 'EMPLOYEE', 'COST_CENTRE'] as const).map(type => (
          <button 
            key={type}
            onClick={() => { setActiveType(type); setEditingItem(null); }}
            className={`w-full text-left px-3 py-2 text-xs font-bold uppercase transition-colors ${activeType === type ? 'bg-tally-teal text-white' : 'hover:bg-tally-accent/10 text-tally-teal'}`}
          >
            {type.replace('_', ' ')}s
          </button>
        ))}
      </div>

      {/* List View */}
      <div className="flex-1 overflow-auto pr-4">
        {editingItem ? (
          <form onSubmit={handleUpdate} className="max-w-md space-y-4 border p-6 bg-white shadow-xl">
            <h2 className="text-sm font-black text-tally-teal uppercase border-b pb-2">Alter {activeType}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Name</label>
                <input 
                  autoFocus
                  type="text" 
                  value={editingItem.name} 
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full border-b border-tally-teal p-1 text-sm font-bold outline-none focus:bg-tally-accent/5"
                />
              </div>
              {activeType === 'LEDGER' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase">Under Group</label>
                    <select 
                      value={editingItem.group_name} 
                      onChange={e => setEditingItem({ ...editingItem, group_name: e.target.value })}
                      className="w-full border-b border-tally-teal p-1 text-sm outline-none bg-transparent"
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
                      className="w-full border-b border-tally-teal p-1 text-sm outline-none"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 pt-4">
              <button type="submit" className="flex-1 bg-tally-teal text-white py-2 text-xs font-bold uppercase shadow">Update</button>
              <button type="button" onClick={() => setEditingItem(null)} className="flex-1 bg-gray-100 text-gray-500 py-2 text-xs font-bold uppercase">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-black text-tally-teal uppercase">{activeType} LIST</h3>
              <div className="text-[10px] text-gray-400 italic">Total: {
                activeType === 'LEDGER' ? ledgers.length : 
                activeType === 'GROUP' ? groups.length : 
                activeType === 'COST_CENTRE' ? costCentres.length : employees.length
              }</div>
            </div>

            {activeType === 'LEDGER' && (
              <div className="space-y-2">
                <div className="flex justify-end mb-2">
                  <button onClick={() => setExpandedGroups(groups.reduce((acc, g) => ({ ...acc, [g.id]: true }), {}))} className="text-[9px] font-bold bg-gray-100 px-2 py-1 uppercase mr-2">Expand All</button>
                  <button onClick={() => setExpandedGroups({})} className="text-[9px] font-bold bg-gray-100 px-2 py-1 uppercase">Collapse All</button>
                </div>
                {groupedLedgers.map(group => (
                  <div key={group.id} className="border-b border-gray-100 last:border-0">
                    <div 
                      className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 px-2 group"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedGroups[group.id] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <span className="text-xs font-black text-gray-700 uppercase">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                         <button onClick={(e) => { e.stopPropagation(); setEditingItem(group); setActiveType('GROUP'); }} className="p-1 hover:text-tally-teal"><Edit2 className="w-3 h-3" /></button>
                         <button onClick={(e) => { e.stopPropagation(); handleDelete(group.id, 'GROUP'); }} className="p-1 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    {expandedGroups[group.id] && (
                      <div className="pl-6 space-y-1 pb-2">
                        {group.ledgers.length === 0 && <div className="text-[10px] text-gray-400 italic py-1">No ledgers under this group</div>}
                        {group.ledgers.map((ledger: any) => (
                          <div key={ledger.id} className="flex justify-between items-center py-1.5 hover:bg-tally-accent/10 px-2 rounded group">
                            <span className="text-xs font-medium text-tally-teal uppercase">{ledger.name}</span>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                               <button onClick={() => { setEditingItem(ledger); }} className="p-1 hover:text-tally-teal"><Edit2 className="w-3 h-3" /></button>
                               <button onClick={() => handleDelete(ledger.id, 'LEDGER')} className="p-1 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeType === 'GROUP' && (
              <div className="grid grid-cols-2 gap-2">
                {groups.map(g => (
                  <div key={g.id} className="p-2 border bg-white flex justify-between items-center hover:shadow-md transition-shadow group">
                    <span className="text-xs font-bold uppercase">{g.name}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                       <button onClick={() => { setEditingItem(g); }} className="p-1 hover:text-tally-teal"><Edit2 className="w-4 h-4" /></button>
                       <button onClick={() => handleDelete(g.id, 'GROUP')} className="p-1 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeType === 'COST_CENTRE' && (
              <div className="grid grid-cols-2 gap-2">
                {costCentres.map(cc => (
                  <div key={cc.id} className="p-2 border bg-white flex justify-between items-center hover:shadow-md transition-shadow group">
                    <span className="text-xs font-bold uppercase">{cc.name}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                       <button onClick={() => { setEditingItem(cc); }} className="p-1 hover:text-tally-teal"><Edit2 className="w-4 h-4" /></button>
                       <button onClick={() => handleDelete(cc.id, 'COST_CENTRE')} className="p-1 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeType === 'EMPLOYEE' && (
              <div className="grid grid-cols-2 gap-2">
                {employees.map(emp => (
                  <div key={emp.id} className="p-2 border bg-white flex justify-between items-center hover:shadow-md transition-shadow group">
                    <div>
                      <div className="text-xs font-bold uppercase">{emp.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{emp.code}</div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                       <button onClick={() => { setEditingItem(emp); }} className="p-1 hover:text-tally-teal"><Edit2 className="w-4 h-4" /></button>
                       <button onClick={() => handleDelete(emp.id, 'EMPLOYEE')} className="p-1 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
