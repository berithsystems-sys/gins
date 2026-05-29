/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Building2, Plus, Trash2, ChevronRight, KeyRound, TrendingUp, BarChart2, PieChart as PieIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

interface HQDashboardProps {
  onSelectBranch: (id: string) => void;
}

const TEAL  = '#00695C';
const ORANGE = '#FF6F00';
const INDIGO = '#3949AB';
const GREEN  = '#43A047';
const RED    = '#E53935';
const PURPLE = '#8E24AA';

const MONTH_LABELS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

const VOUCHER_COLORS: Record<string, string> = {
  Payment : RED,
  Receipt : GREEN,
  Journal : INDIGO,
  Contra  : ORANGE,
  Sale    : TEAL,
  Purchase: PURPLE,
};
const DONUT_FALLBACK = [TEAL, ORANGE, INDIGO, GREEN, RED, PURPLE];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-tally-teal/30 shadow-lg px-3 py-2 text-[10px]">
      <p className="font-bold text-tally-teal uppercase mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="bold">
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

export default function HQDashboard({ onSelectBranch }: HQDashboardProps) {
  const [branches, setBranches]       = useState<any[]>([]);
  const [showAdd, setShowAdd]         = useState(false);
  const [showEdit, setShowEdit]       = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [newBranch, setNewBranch]     = useState({ name: '', code: '', location: '', email: '', password: '', fy_start: '2026-04-01', books_start: '2026-04-01' });
  const [globalBalance, setGlobalBalance] = useState(0);
  const [vouchers, setVouchers]       = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(setBranches);
    fetch('/api/ledgers').then(r => r.json()).then(ledgers => {
      const total = ledgers.reduce((acc: number, l: any) => {
        const bal = Number(l.openingBalance || 0);
        return l.balanceType === 'Dr' ? acc + bal : acc - bal;
      }, 0);
      setGlobalBalance(total);
    });
    fetch('/api/vouchers').then(r => r.json()).then(data => {
      setVouchers(Array.isArray(data) ? data : []);
    });
  }, []);

  // Monthly voucher count (Apr–Mar fiscal year)
  const monthlyData = useMemo(() => {
    const counts: Record<number, number> = {};
    MONTH_LABELS.forEach((_, i) => (counts[i] = 0));
    vouchers.forEach(v => {
      const m = new Date(v.date).getMonth(); // 0=Jan…11=Dec
      const fiscalIdx = (m - 3 + 12) % 12;   // 0=Apr…11=Mar
      counts[fiscalIdx] = (counts[fiscalIdx] || 0) + 1;
    });
    return MONTH_LABELS.map((label, i) => ({ month: label, Transactions: counts[i] }));
  }, [vouchers]);

  // Voucher type breakdown (donut)
  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    vouchers.forEach(v => {
      const t = v.type || 'Other';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [vouchers]);

  // Cumulative fund flow (area chart) — running count of vouchers over fiscal months
  const fundFlowData = useMemo(() => {
    let running = 0;
    return monthlyData.map(d => {
      running += d.Transactions;
      return { month: d.month, Transactions: d.Transactions, Cumulative: running };
    });
  }, [monthlyData]);

  const totalVouchers = vouchers.length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBranch),
    });
    const data = await res.json();
    if (res.ok) {
      setBranches([...branches, data]);
      setShowAdd(false);
      setNewBranch({ name: '', code: '', location: '', email: '', password: '', fy_start: '2026-04-01', books_start: '2026-04-01' });
    } else {
      alert(data.error || 'Failed to create branch');
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
      setBranches(branches.map(b => b.id === selectedBranch.id ? selectedBranch : b));
      setShowEdit(false); setSelectedBranch(null);
    } else alert('Failed to update branch');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? All data related to this church branch will be deleted.')) return;
    await fetch(`api/branches/${id}`, { method: 'DELETE' });
    setBranches(branches.filter(b => b.id !== id));
  };

  const handleResetPassword = async (id: string) => {
    const newPass = prompt('Enter new password for this church:');
    if (!newPass) return;
    const res = await fetch(`api/branches/${id}/reset-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass }),
    });
    if (res.ok) alert('Password reset successfully');
    else alert('Failed to reset password');
  };

  return (
    <div className="flex flex-col h-full bg-tally-bg">
      {/* Title bar */}
      <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between sticky top-0 z-10">
        <span>HQ Control Centre</span>
        <span className="text-tally-accent">Global Administration</span>
      </div>

      {/* Main content — full width, right-padded to clear button bar */}
      <div className="flex-grow overflow-auto p-4 pr-28">
        <div className="flex gap-4 h-full min-h-0">

          {/* ── LEFT PANEL ── */}
          <div className="w-[340px] flex-shrink-0 flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-end border-b-2 border-tally-teal pb-2">
              <div>
                <h1 className="text-sm font-bold text-tally-teal uppercase tracking-widest">List of Church Branches</h1>
                <p className="text-[9px] text-gray-500 uppercase">Select a branch to manage its data</p>
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-tally-teal text-white px-3 py-1 text-[9px] font-bold uppercase flex items-center gap-1 hover:bg-tally-header transition-colors"
              >
                <Plus className="w-3 h-3" /> Create New Branch (Alt+C)
              </button>
            </div>

            {/* Branch table */}
            <div className="bg-white border border-tally-teal/20 shadow-sm overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-tally-light border-b border-tally-teal text-[9px] font-bold uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Branch Name</th>
                    <th className="px-3 py-2 text-left w-20">Code</th>
                    <th className="px-3 py-2 text-right w-28">Cash &amp; Bank</th>
                    <th className="px-3 py-2 text-right w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(branch => (
                    <tr
                      key={branch.id}
                      className="hover:bg-tally-accent cursor-pointer border-b border-gray-50 group"
                      onClick={() => onSelectBranch(branch.id)}
                    >
                      <td className="px-3 py-2 font-bold text-tally-teal uppercase">{branch.name}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{branch.code}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">
                        ₹ {Math.abs(globalBalance / Math.max(branches.length, 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Dr
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={e => { e.stopPropagation(); setSelectedBranch(branch); setShowEdit(true); }} className="p-1 hover:text-tally-teal text-[9px] font-bold uppercase">Edit</button>
                          <button onClick={e => { e.stopPropagation(); handleResetPassword(branch.id); }} className="p-1 hover:text-tally-teal"><KeyRound className="w-3 h-3" /></button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(branch.id); }} className="p-1 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {branches.length === 0 && (
                <div className="p-8 text-center italic text-gray-400 uppercase text-[9px]">No branches configured.</div>
              )}
            </div>

            {/* Consolidated summary */}
            <div className="bg-white border border-tally-teal/20 shadow-sm p-4 space-y-4">
              <h2 className="text-[9px] font-bold text-gray-400 uppercase border-b pb-2">Consolidated Summary</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-tally-teal/5 border border-tally-teal/20 p-3 rounded-sm">
                  <p className="text-[8px] uppercase text-tally-teal font-bold">Total Branches</p>
                  <p className="text-2xl font-black text-tally-teal">{branches.length}</p>
                </div>
                <div className="bg-tally-teal/5 border border-tally-teal/20 p-3 rounded-sm">
                  <p className="text-[8px] uppercase text-tally-teal font-bold">Total Vouchers</p>
                  <p className="text-2xl font-black text-tally-teal">{totalVouchers}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[8px] uppercase text-tally-teal font-bold mb-1">Global Cash &amp; Bank Balance</p>
                <p className="text-lg font-black text-tally-teal font-mono">
                  ₹ {Math.abs(globalBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}&nbsp;
                  <span className="text-sm">{globalBalance >= 0 ? 'Dr' : 'Cr'}</span>
                </p>
                <p className="text-[8px] text-gray-400 italic mt-0.5">Closing balance (opening + vouchers, voided inclusive)</p>
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL: CHARTS ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Row 1: Bar chart (monthly transactions) */}
            <div className="bg-white border border-tally-teal/20 shadow-sm p-4 flex-1 min-h-0">
              <div className="flex items-center gap-2 mb-3 border-b border-tally-teal/10 pb-2">
                <BarChart2 className="w-3.5 h-3.5 text-tally-teal" />
                <h3 className="text-[10px] font-bold text-tally-teal uppercase tracking-wider">Monthly Transaction Volume (Fiscal Year)</h3>
              </div>
              {totalVouchers === 0 ? (
                <div className="flex items-center justify-center h-[calc(100%-2rem)] text-[10px] text-gray-400 italic">
                  No transactions recorded yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0f0ee" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,105,92,0.06)' }} />
                    <Bar dataKey="Transactions" fill={TEAL} radius={[3, 3, 0, 0]} label={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Row 2: Area chart + Donut side by side */}
            <div className="flex gap-4" style={{ height: '220px' }}>

              {/* Area chart — cumulative fund flow */}
              <div className="bg-white border border-tally-teal/20 shadow-sm p-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 border-b border-tally-teal/10 pb-2">
                  <TrendingUp className="w-3 h-3 text-orange-600" />
                  <h3 className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Cumulative Transaction Flow</h3>
                </div>
                {totalVouchers === 0 ? (
                  <div className="flex items-center justify-center h-[calc(100%-2rem)] text-[10px] text-gray-400 italic">
                    No data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="80%">
                    <AreaChart data={fundFlowData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ORANGE} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={ORANGE} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="Cumulative"
                        stroke={ORANGE}
                        strokeWidth={2}
                        fill="url(#cumGrad)"
                        dot={{ r: 2, fill: ORANGE }}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Donut chart — voucher type breakdown */}
              <div className="bg-white border border-tally-teal/20 shadow-sm p-4 flex-shrink-0 w-[220px]">
                <div className="flex items-center gap-2 mb-2 border-b border-tally-teal/10 pb-2">
                  <PieIcon className="w-3 h-3 text-indigo-600" />
                  <h3 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Voucher Types</h3>
                </div>
                {typeData.length === 0 ? (
                  <div className="flex items-center justify-center h-[calc(100%-2rem)] text-[10px] text-gray-400 italic">
                    No data yet
                  </div>
                ) : (
                  <div className="flex flex-col items-center h-[calc(100%-2rem)]">
                    <ResponsiveContainer width="100%" height={110}>
                      <PieChart>
                        <Pie
                          data={typeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={50}
                          dataKey="value"
                          labelLine={false}
                          label={<CustomPieLabel />}
                        >
                          {typeData.map((entry, i) => (
                            <Cell
                              key={entry.name}
                              fill={VOUCHER_COLORS[entry.name] ?? DONUT_FALLBACK[i % DONUT_FALLBACK.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any, name: any) => [val, name]}
                          contentStyle={{ fontSize: 9, border: '1px solid #ccc', borderRadius: 2 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Legend */}
                    <div className="mt-1 space-y-0.5 w-full">
                      {typeData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between text-[9px]">
                          <div className="flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: VOUCHER_COLORS[d.name] ?? DONUT_FALLBACK[i % DONUT_FALLBACK.length] }}
                            />
                            <span className="text-gray-600">{d.name}</span>
                          </div>
                          <span className="font-bold text-gray-700">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right button bar */}
      <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white z-20">
        {[
          { label: 'F3: Company' },
          { label: 'Alt+C: Create', action: () => setShowAdd(true) },
          { label: 'Alt+G: Go To' },
          { label: 'F11: Features' },
          { label: 'F12: Configure' },
        ].map(btn => (
          <div
            key={btn.label}
            onClick={btn.action}
            className="h-10 bg-tally-hotkey flex items-center px-2 cursor-pointer hover:bg-tally-accent hover:text-black"
          >
            {btn.label}
          </div>
        ))}
      </div>

      {/* ── ADD BRANCH MODAL ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-tally-teal p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold text-tally-teal uppercase mb-6 tracking-widest text-center">New Church Branch</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Church / Branch Name</label>
                <input type="text" placeholder="e.g. St. Peters Main"
                  className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                  value={newBranch.name} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Login Code</label>
                  <input type="text" placeholder="BR01"
                    className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                    value={newBranch.code} onChange={e => setNewBranch({ ...newBranch, code: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Location</label>
                  <input type="text" placeholder="New York"
                    className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                    value={newBranch.location} onChange={e => setNewBranch({ ...newBranch, location: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Admin Email</label>
                <input type="email" placeholder="branch@church.com"
                  className="w-full border-2 p-3 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                  value={newBranch.email} onChange={e => setNewBranch({ ...newBranch, email: e.target.value })} required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Admin Password</label>
                <input type="password" placeholder="••••••••"
                  className="w-full border-2 p-3 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                  value={newBranch.password} onChange={e => setNewBranch({ ...newBranch, password: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">FY Begin</label>
                  <input type="date"
                    className="w-full border-2 p-2 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                    value={newBranch.fy_start} onChange={e => setNewBranch({ ...newBranch, fy_start: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Books From</label>
                  <input type="date"
                    className="w-full border-2 p-2 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                    value={newBranch.books_start} onChange={e => setNewBranch({ ...newBranch, books_start: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="submit" className="flex-1 bg-tally-teal text-white font-bold py-3 uppercase text-xs hover:bg-tally-header">Create Branch</button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 bg-gray-100 font-bold uppercase text-xs hover:bg-gray-200">Cancel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── EDIT BRANCH MODAL ── */}
      {showEdit && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-tally-teal p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold text-tally-teal uppercase mb-6 tracking-widest text-center">Edit Church Branch</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Church / Branch Name</label>
                <input type="text"
                  className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                  value={selectedBranch.name} onChange={e => setSelectedBranch({ ...selectedBranch, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Login Code</label>
                  <input type="text"
                    className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                    value={selectedBranch.code} onChange={e => setSelectedBranch({ ...selectedBranch, code: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Location</label>
                  <input type="text"
                    className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                    value={selectedBranch.location} onChange={e => setSelectedBranch({ ...selectedBranch, location: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">FY Begin</label>
                  <input type="date"
                    className="w-full border-2 p-2 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                    value={selectedBranch.fy_start} onChange={e => setSelectedBranch({ ...selectedBranch, fy_start: e.target.value })} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Books From</label>
                  <input type="date"
                    className="w-full border-2 p-2 outline-none focus:border-tally-teal text-sm font-bold mt-1"
                    value={selectedBranch.books_start} onChange={e => setSelectedBranch({ ...selectedBranch, books_start: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="submit" className="flex-1 bg-tally-teal text-white font-bold py-3 uppercase text-xs hover:bg-tally-header">Save Changes</button>
                <button type="button" onClick={() => { setShowEdit(false); setSelectedBranch(null); }} className="px-6 bg-gray-100 font-bold uppercase text-xs hover:bg-gray-200">Cancel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
