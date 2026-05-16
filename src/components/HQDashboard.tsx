/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Building2, Plus, Trash2, ChevronRight, BarChart3, KeyRound } from 'lucide-react';

interface HQDashboardProps {
  onSelectBranch: (id: string) => void;
}

export default function HQDashboard({ onSelectBranch }: HQDashboardProps) {
  const [branches, setBranches] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', code: '', location: '', email: '', password: '' });

  useEffect(() => {
    fetch('api/branches').then(res => res.json()).then(data => setBranches(data));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBranch)
    });
    const data = await res.json();
    if (res.ok) {
      setBranches([...branches, data]);
      setShowAdd(false);
      setNewBranch({ name: '', code: '', location: '', email: '', password: '' });
    } else {
      alert(data.error || 'Failed to create branch');
    }
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
      body: JSON.stringify({ password: newPass })
    });
    if (res.ok) alert('Password reset successfully');
    else alert('Failed to reset password');
  };

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
            {/* Branch List */}
            <div className="lg:col-span-2 space-y-2">
              <div className="bg-white tally-border tally-shadow overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-tally-light border-b border-tally-teal text-[10px] font-bold uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Branch Name</th>
                      <th className="px-4 py-2 text-left w-24">Code</th>
                      <th className="px-4 py-2 text-left">Location</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map(branch => (
                      <tr 
                        key={branch.id} 
                        className="hover:bg-tally-accent cursor-pointer border-b border-gray-50 group"
                        onClick={() => onSelectBranch(branch.id)}
                      >
                        <td className="px-4 py-2 font-bold text-tally-teal uppercase">{branch.name}</td>
                        <td className="px-4 py-2 font-mono">{branch.code}</td>
                        <td className="px-4 py-2 italic">{branch.location}</td>
                        <td className="px-4 py-2 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                           <button onClick={(e) => { e.stopPropagation(); handleResetPassword(branch.id); }} className="p-1 hover:text-tally-teal"><KeyRound className="w-4 h-4" /></button>
                           <button onClick={(e) => { e.stopPropagation(); handleDelete(branch.id); }} className="p-1 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {branches.length === 0 && (
                  <div className="p-12 text-center italic text-gray-400 uppercase text-[10px]">
                    No branches configured.
                  </div>
                )}
              </div>
            </div>

            {/* Global Stats */}
            <div className="space-y-4">
              <div className="bg-white tally-border tally-shadow p-6 space-y-6">
                <h2 className="text-[10px] font-bold text-gray-400 uppercase border-b pb-2">Consolidated Summary</h2>
                <div>
                  <p className="text-[10px] uppercase text-tally-teal font-bold">Total Branches</p>
                  <p className="text-3xl font-black text-tally-teal">{branches.length}</p>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-[10px] uppercase text-tally-teal font-bold">Global Combined Balance</p>
                  <p className="text-2xl font-black text-tally-teal font-mono">₹ 1,24,50,000.00</p>
                </div>
                <button 
                  onClick={() => alert('Consolidating data...')}
                  className="w-full bg-tally-teal text-white font-bold py-2 uppercase text-[10px] hover:bg-tally-header transition-colors tally-shadow"
                >
                  View All-Branch Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Button Bar */}
      <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white">
        {[
          { label: 'F3: Company', key: 'F3' },
          { label: 'Alt+C: Create', action: () => setShowAdd(true) },
          { label: 'Alt+G: Go To', key: 'Alt+G' },
          { label: 'F11: Features', key: 'F11' },
          { label: 'F12: Configure', key: 'F12' }
        ].map((btn) => (
          <div key={btn.label} onClick={btn.action} className="h-10 bg-tally-hotkey flex items-center px-2 cursor-pointer hover:bg-tally-accent hover:text-black">
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
            <h2 className="text-xl font-bold text-tally-teal uppercase mb-6 tracking-widest text-center">New Church Branch</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Church / Branch Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. St. Peters Main" 
                  className="w-full border-2 p-3 outline-none focus:border-tally-teal uppercase text-sm font-bold mt-1"
                  value={newBranch.name}
                  onChange={e => setNewBranch({...newBranch, name: e.target.value})}
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
                    onChange={e => setNewBranch({...newBranch, code: e.target.value})}
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
                    onChange={e => setNewBranch({...newBranch, location: e.target.value})}
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
                    onChange={e => setNewBranch({...newBranch, email: e.target.value})}
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
                    onChange={e => setNewBranch({...newBranch, password: e.target.value})}
                    required
                  />
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
    </div>
  );
}
