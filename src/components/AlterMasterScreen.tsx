import React, { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';

import { useHotkeys } from '../hooks/useHotkeys';

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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
    setDeleteConfirm(false);
  }, [activeType]);

  useEffect(() => {
    setDeleteConfirm(false);
  }, [editingItem?.id]);

  const fetchData = async () => {
    const query = branchId ? `?branchId=${branchId}` : '';
    const [l, g, e, c] = await Promise.all([
      fetch(`/api/ledgers${query}`).then((res) => res.json()),
      fetch(`/api/account-groups${query}`).then((res) => res.json()),
      fetch(`/api/employees${query}`).then((res) => res.json()),
      fetch(`/api/cost-centres${query}`).then((res) => res.json()),
    ]);
    setLedgers(Array.isArray(l) ? l : []);
    setGroups(Array.isArray(g) ? g : []);
    setEmployees(Array.isArray(e) ? e : []);
    setCostCentres(Array.isArray(c) ? c : []);
  };

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const getVisibleItems = () => {
    if (activeType === 'LEDGER') {
      return ledgers.map((l) => ({ type: 'LEDGER', id: l.id, data: l }));
    }
    if (activeType === 'GROUP') {
      return groups.map((g) => ({ type: 'GROUP', id: g.id, data: g }));
    }
    if (activeType === 'COST_CENTRE') {
      return costCentres.map((cc) => ({ type: 'COST_CENTRE', id: cc.id, data: cc }));
    }
    return employees.map((emp) => ({ type: 'EMPLOYEE', id: emp.id, data: emp }));
  };

  const getApiPath = (type: string) => {
    if (type === 'LEDGER') return 'ledgers';
    if (type === 'GROUP') return 'account-groups';
    if (type === 'COST_CENTRE') return 'cost-centres';
    return 'employees';
  };

  const handleDelete = async (id: string, type: string) => {
    const label =
      type === 'LEDGER'
        ? 'ledger'
        : type === 'GROUP'
        ? 'group'
        : type === 'COST_CENTRE'
        ? 'cost centre'
        : 'employee';
    const res = await fetch(`/api/${getApiPath(type)}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setEditingItem(null);
      setDeleteConfirm(false);
      fetchData();
      return;
    }
    const err = await res.json().catch(() => ({}));
    alert((err as { error?: string }).error || `Could not delete this ${label}.`);
  };

  const requestDelete = (id: string, type: string) => {
    if (deleteConfirm) {
      handleDelete(id, type);
      return;
    }
    setDeleteConfirm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = activeType;
    const res = await fetch(`/api/${getApiPath(type)}/${editingItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingItem),
    });
    if (res.ok) {
      setEditingItem(null);
      setDeleteConfirm(false);
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      alert((err as { error?: string }).error || 'Update failed.');
    }
  };

  // ── Hotkeys ────────────────────────────────────────────────────────────────

  useHotkeys(
    'down',
    (e) => {
      if (editingItem) return;
      e.preventDefault();
      const items = getVisibleItems();
      setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
    },
    { enableOnFormTags: true },
    [editingItem, activeType, ledgers, groups, costCentres, employees],
  );

  useHotkeys(
    'up',
    (e) => {
      if (editingItem) return;
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    },
    { enableOnFormTags: true },
    [editingItem],
  );

  useHotkeys(
    'enter',
    (e) => {
      if (editingItem) return;
      e.preventDefault();
      const items = getVisibleItems();
      const item = items[selectedIndex];
      if (!item) return;
      setEditingItem(item.data);
      setDeleteConfirm(false);
    },
    { enableOnFormTags: true },
    [selectedIndex, editingItem, activeType, ledgers, groups, costCentres, employees],
  );

  useHotkeys(
    'esc',
    (e) => {
      e.preventDefault();
      e.stopPropagation(); // prevent parent router/dashboard from catching this
      if (deleteConfirm) {
        setDeleteConfirm(false);
        return;
      }
      if (editingItem) {
        setEditingItem(null);
      }
    },
    { enableOnFormTags: true },
    [deleteConfirm, editingItem],
  );

  useHotkeys(
    'alt+d',
    (e) => {
      e.preventDefault();
      if (editingItem && activeType === 'LEDGER') {
        requestDelete(editingItem.id, 'LEDGER');
        return;
      }
      const items = getVisibleItems();
      const item = items[selectedIndex];
      if (item?.type === 'LEDGER') {
        requestDelete(item.data.id, 'LEDGER');
      }
    },
    { enableOnFormTags: true },
    [editingItem, activeType, selectedIndex, ledgers, deleteConfirm],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-tally-bg">
      {/* Header */}
      <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between sticky top-0 z-10">
        <span>List of Masters</span>
        <span className="text-tally-accent">Alteration Mode</span>
      </div>

      <div className="flex h-full gap-4 p-4 overflow-hidden">
        {/* Sidebar: master type selector */}
        <div className="w-64 bg-white tally-border tally-shadow p-2 space-y-1">
          <h3 className="text-[10px] font-black text-gray-400 uppercase mb-4 px-2">Master Type</h3>
          {(['LEDGER', 'GROUP', 'EMPLOYEE', 'COST_CENTRE'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setActiveType(type);
                setEditingItem(null);
                setDeleteConfirm(false);
              }}
              className={`w-full text-left px-3 py-1 text-xs font-bold uppercase transition-colors ${
                activeType === type
                  ? 'bg-tally-accent text-black'
                  : 'hover:bg-tally-bg text-tally-teal'
              }`}
            >
              {type.replace('_', ' ')}s
            </button>
          ))}
        </div>

        {/* Main panel */}
        <div className="flex-1 overflow-auto bg-white tally-border tally-shadow">
          {editingItem ? (
            /* ── Edit form ── */
            <form onSubmit={handleUpdate} className="p-8 max-w-2xl mx-auto space-y-8">
              <div className="border-b-2 border-tally-teal pb-2 flex justify-between items-start gap-4">
                <h2 className="text-sm font-black text-tally-teal uppercase">
                  Alter {activeType.replace('_', ' ')}: {editingItem.name}
                </h2>
                {activeType === 'LEDGER' && (
                  <button
                    type="button"
                    onClick={() => requestDelete(editingItem.id, 'LEDGER')}
                    className={`flex items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase border-2 shrink-0 ${
                      deleteConfirm
                        ? 'bg-red-600 text-white border-red-700'
                        : 'bg-white text-red-600 border-red-400 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                    {deleteConfirm ? 'Confirm Delete (Enter)' : 'Delete Ledger (Alt+D)'}
                  </button>
                )}
              </div>

              {deleteConfirm && activeType === 'LEDGER' && (
                <div className="bg-red-50 border-2 border-red-300 p-3 text-[11px] font-bold text-red-800 uppercase">
                  Delete &quot;{editingItem.name}&quot;? Ledgers with voucher lines cannot be
                  deleted. Press Delete again or Enter to confirm, Esc to cancel.
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">
                    Name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full border-b-2 border-tally-teal p-1 text-sm font-bold outline-none focus:bg-tally-accent/10 uppercase"
                  />
                </div>

                {activeType === 'LEDGER' && (
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase">
                        Under Group
                      </label>
                      <select
                        value={editingItem.group_name || editingItem.group || ''}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            group_name: e.target.value,
                            group: e.target.value,
                          })
                        }
                        className="w-full border-b-2 border-tally-teal p-1 text-sm outline-none bg-transparent font-bold"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.name}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase">
                        Opening Balance
                      </label>
                      <input
                        type="number"
                        value={editingItem.openingBalance ?? 0}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            openingBalance: Number(e.target.value),
                          })
                        }
                        className="w-full border-b-2 border-tally-teal p-1 text-sm outline-none text-right font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-8">
                <button
                  type="submit"
                  className="bg-tally-teal text-white px-8 py-2 text-xs font-bold uppercase tally-shadow hover:bg-tally-header"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setDeleteConfirm(false);
                  }}
                  className="bg-gray-200 px-8 py-2 text-xs font-bold uppercase tally-shadow hover:bg-gray-300"
                >
                  Quit (Esc)
                </button>
              </div>
            </form>
          ) : (
            /* ── List view ── */
            <div className="flex flex-col h-full">
              <div className="bg-tally-light px-4 py-1 border-b border-tally-teal flex justify-between font-bold text-[10px] uppercase">
                <span>Name of {activeType.replace('_', ' ')}</span>
                <span className="text-gray-500 font-normal normal-case">
                  Enter: Alter · Alt+D: Delete ledger
                </span>
              </div>

              <div className="flex-grow overflow-auto">
                <div className="space-y-0.5">
                  {getVisibleItems().map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedIndex(idx);
                          setEditingItem(item.data);
                          setDeleteConfirm(false);
                        }}
                        className={`flex justify-between items-center py-1 px-4 cursor-pointer group ${
                          isSelected ? 'bg-tally-accent' : 'hover:bg-tally-accent/50'
                        }`}
                      >
                        <span
                          className={`text-xs uppercase font-bold ${
                            isSelected ? 'text-black' : 'text-tally-teal'
                          }`}
                        >
                          {item.data.name}
                        </span>

                        <div
                          className={`flex items-center gap-2 ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item.data);
                              setDeleteConfirm(false);
                            }}
                            className="p-1 hover:text-tally-teal"
                            title="Alter"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  `Delete "${item.data.name}"?${
                                    item.type === 'LEDGER'
                                      ? '\n\nLedgers used in vouchers cannot be deleted until those lines are removed.'
                                      : ''
                                  }`,
                                )
                              ) {
                                handleDelete(item.id, item.type);
                              }
                            }}
                            className="p-1 hover:text-red-600 text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer hotkey bar */}
      <div className="bg-tally-bg border-t border-tally-hotkey px-4 py-1 text-[10px] font-bold text-gray-500 uppercase">
        ↑↓ Navigate · Enter: Alter selected · Alt+D: Delete ledger · Esc: Back
      </div>
    </div>
  );
}
