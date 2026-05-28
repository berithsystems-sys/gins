/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, KeyRound } from 'lucide-react';

interface HQDashboardProps {
  onSelectBranch: (id: string) => void;
}

interface HqSummary {
  branchCount: number;
  consolidatedCashBank: number;
  consolidatedCashBankAbs: number;
  consolidatedSide: 'Dr' | 'Cr';
  perBranch: Array<{
    id: string;
    code: string;
    name: string;
    location: string;
    cashBankBalance: number;
    cashBankBalanceAbs: number;
    cashBankSide: 'Dr' | 'Cr';
  }>;
}

export default function HQDashboard({ onSelectBranch }: HQDashboardProps) {
  const [branches, setBranches] = useState<any[]>([]);
  const [summary, setSummary] = useState<HqSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [newBranch, setNewBranch] = useState({
    name: '',
    code: '',
    location: '',
    email: '',
    password: '',
    fy_start: '2026-04-01',
    books_start: '2026-04-01',
  });

  const loadData = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const [branchRes, summaryRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/hq/summary'),
      ]);
      if (branchRes.ok) {
        setBranches(await branchRes.json());
      }
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      } else {
        setSummary(null);
      }
    } catch {
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBranch),
    });
    const data = await res.json();
    if (res.ok) {
      setShowAdd(false);
      setNewBranch({
        name: '',
        code: '',
        location: '',
        email: '',
        password: '',
        fy_start: '2026-04-01',
        books_start: '2026-04-01',
      });
      await loadData();
    } else {
      alert(data.error || data.details || 'Failed to create branch');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/branches/${selectedBranch.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedBranch),
    });
    if (res.ok) {
      setShowEdit(false);
      setSelectedBranch(null);
      await loadData();
    } else {
      const data = await res.json().catch(() => ({}));
      alert((data as { error?: string }).error || 'Failed to update branch');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Delete branch "${name}"?\n\nAll ledgers, vouchers, and users for this company will be permanently removed.`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadData();
      return;
    }
    const data = await res.json().catch(() => ({}));
    alert((data as { error?: string; details?: string }).error || (data as { details?: string }).details || 'Failed to delete branch');
  };

  const handleResetPassword = async (id: string) => {
    const newPass = prompt('Enter new password for this church:');
    if (!newPass) return;
    const res = await fetch(`/api/branches/${id}/reset-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass }),
    });
    if (res.ok) alert('Password reset successfully');
    else alert('Failed to reset password');
  };

  const fmt = (n: number) =>
    Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const branchBalanceMap = new Map(
    (summary?.perBranch ?? []).map((b) => [b.id, b]),
  );

  return (
    <div className="flex flex-col h-full bg-tally-bg">
      <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between sticky top-0 z-10">
        <span>HQ Control Centre</span>
        <span className="text-tally-accent">Global Administration</span>
      </div>

      <div className="flex-grow p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-end border-b-2 border-tally-teal pb-2">
            <div>
              <h1 className="text-xl font-bold text-tally-teal uppercase tracking-widest">List of Church Branches</h1>
              <p className="text-[10px] text-gray-500 uppercase">Select a branch to manage its financial data</p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-tally-teal text-white px-4 py-1 text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-tally-header transition-colors tally-shadow"
            >
              <Plus className="w-3 h-3" /> Create New Branch (Alt+C)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <div className="bg-white tally-border tally-shadow overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-tally-light border-b border-tally-teal text-[10px] font-bold uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Branch Name</th>
                      <th className="px-4 py-2 text-left w-24">Code</th>
                      <th className="px-4 py-2 text-right">Cash &amp; Bank</th>
                      <th className="px-4 py-2 text-right w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => {
                      const bal = branchBalanceMap.get(branch.id);
                      return (
                        <tr
                          key={branch.id}
                          className="hover:bg-tally-accent cursor-pointer border-b border-gray-50 group"
                          onClick={() => onSelectBranch(branch.id)}
                        >
                          <td className="px-4 py-2 font-bold text-tally-teal uppercase">{branch.name}</td>
                          <td className="px-4 py-2 font-mono">{branch.code}</td>
                          <td className="px-4 py-2 text-right font-mono text-[11px]">
                            {bal ? (
                              <>
                                ₹ {fmt(bal.cashBankBalance)}{' '}
                                <span className="text-gray-500">{bal.cashBankSide}</span>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBranch(branch);
                                  setShowEdit(true);
                                }}
                                className="p-1 hover:text-tally-teal text-[10px] font-bold uppercase"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResetPassword(branch.id);
                                }}
                                className="p-1 hover:text-tally-teal"
                                title="Reset password"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(branch.id, branch.name);
                                }}
                                className="p-1 hover:text-red-600 text-red-500"
                                title="Delete branch"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {branches.length === 0 && (
                  <div className="p-12 text-center italic text-gray-400 uppercase text-[10px]">
                    No branches configured.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white tally-border tally-shadow p-6 space-y-6">
                <h2 className="text-[10px] font-bold text-gray-400 uppercase border-b pb-2">Consolidated Summary</h2>
                <div>
                  <p className="text-[10px] uppercase text-tally-teal font-bold">Total Branches</p>
                  <p className="text-3xl font-black text-tally-teal">{branches.length}</p>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-[10px] uppercase text-tally-teal font-bold">Global Cash &amp; Bank Balance</p>
                  <p className="text-[9px] text-gray-500 normal-case mt-0.5">
                    Closing balance (opening + vouchers, voided excluded)
                  </p>
                  {loadingSummary ? (
                    <p className="text-sm text-gray-400 mt-2 animate-pulse">Calculating…</p>
                  ) : summary ? (
                    <p className="text-2xl font-black text-tally-teal font-mono mt-2">
                      ₹ {fmt(summary.consolidatedCashBank)}{' '}
                      <span className="text-base">{summary.consolidatedSide}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 mt-2">Could not load summary</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white">
        {[
          { label: 'F3: Company', key: 'F3' },
          { label: 'Alt+C: Create', action: () => setShowAdd(true) },
          { label: 'Alt+G: Go To', key: 'Alt+G' },
          { label: 'F11: Features', key: 'F11' },
          { label: 'F12: Configure', key: 'F12' },
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

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-tally-teal p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold text-tally-teal uppercase mb-6 tracking-widest text-center">
              New Church Branch
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Church / Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. St. Peters Main"
                  className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Login Code</label>
                  <input
                    type="text"
                    placeholder="BR01"
                    className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                    value={newBranch.code}
                    onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Location</label>
                  <input
                    type="text"
                    placeholder="New York"
                    className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                    value={newBranch.location}
                    onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Admin Email</label>
                  <input
                    type="email"
                    placeholder="branch@church.com"
                    className="w-full border-2 p-3 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                    value={newBranch.email}
                    onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Admin Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full border-2 p-3 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                    value={newBranch.password}
                    onChange={(e) => setNewBranch({ ...newBranch, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">FY Begin</label>
                  <input
                    type="date"
                    className="w-full border-2 p-2 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                    value={newBranch.fy_start}
                    onChange={(e) => setNewBranch({ ...newBranch, fy_start: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Books From</label>
                  <input
                    type="date"
                    className="w-full border-2 p-2 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                    value={newBranch.books_start}
                    onChange={(e) => setNewBranch({ ...newBranch, books_start: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-tally-teal text-white font-bold py-3 uppercase text-xs hover:bg-tally-header"
                >
                  Create Branch
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-6 bg-gray-100 font-bold uppercase text-xs hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showEdit && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-tally-teal p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold text-tally-teal uppercase mb-6 tracking-widest text-center">
              Edit Church Branch
            </h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Church / Branch Name</label>
                <input
                  type="text"
                  className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                  value={selectedBranch.name}
                  onChange={(e) => setSelectedBranch({ ...selectedBranch, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Login Code</label>
                  <input
                    type="text"
                    className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                    value={selectedBranch.code}
                    onChange={(e) => setSelectedBranch({ ...selectedBranch, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Location</label>
                  <input
                    type="text"
                    className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                    value={selectedBranch.location}
                    onChange={(e) => setSelectedBranch({ ...selectedBranch, location: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">FY Begin</label>
                  <input
                    type="date"
                    className="w-full border-2 p-2 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                    value={selectedBranch.fy_start}
                    onChange={(e) => setSelectedBranch({ ...selectedBranch, fy_start: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Books From</label>
                  <input
                    type="date"
                    className="w-full border-2 p-2 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                    value={selectedBranch.books_start}
                    onChange={(e) => setSelectedBranch({ ...selectedBranch, books_start: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-tally-teal text-white font-bold py-3 uppercase text-xs hover:bg-tally-header"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEdit(false);
                    setSelectedBranch(null);
                  }}
                  className="px-6 bg-gray-100 font-bold uppercase text-xs hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
