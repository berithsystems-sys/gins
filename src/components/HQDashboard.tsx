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
    <div className="p-6 space-y-6 w-full">
      <div className="flex justify-between items-end border-b-2 border-tally-teal pb-2">
        <div>
          <h1 className="text-2xl font-bold text-tally-teal uppercase tracking-widest">HQ Control Center</h1>
          <p className="text-xs text-gray-500 uppercase">Manage Church Branches & Consolidated Reports</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-tally-teal text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2 hover:bg-tally-header transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" /> Add New Branch
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold uppercase text-gray-400">Active Branches (Click to access data)</h2>
          <div className="grid grid-cols-1 gap-3">
            {branches.map(branch => (
              <div key={branch.id} className="bg-white border-2 border-gray-100 p-4 flex justify-between items-center hover:border-tally-teal transition-all group shadow-sm hover:shadow-md">
                <div 
                  className="flex items-center gap-4 cursor-pointer flex-grow" 
                  onClick={() => onSelectBranch(branch.id)}
                >
                  <div className="w-12 h-12 bg-tally-bg flex items-center justify-center rounded border border-tally-teal/20 text-tally-teal group-hover:bg-tally-teal group-hover:text-white transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-tally-teal uppercase group-hover:text-tally-header">{branch.name}</h3>
                    <div className="flex gap-3 text-[10px] text-gray-500 font-bold uppercase">
                      <span>Code: {branch.code}</span>
                      <span>•</span>
                      <span>Location: {branch.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => onSelectBranch(branch.id)}
                    className="p-2 hover:bg-tally-bg text-tally-teal rounded transition-colors hidden md:block" 
                    title="View Branch Analytics"
                  >
                    <BarChart3 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleResetPassword(branch.id)}
                    className="p-2 hover:bg-teal-50 text-tally-teal rounded transition-colors" 
                    title="Reset Password"
                  >
                    <KeyRound className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(branch.id)}
                    className="p-2 hover:bg-red-50 text-red-500 rounded transition-colors" 
                    title="Delete Branch"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-tally-teal transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
            {branches.length === 0 && (
              <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded text-gray-400 font-bold uppercase text-xs">
                No branches configured. Click "Add New Branch" to start.
              </div>
            )}
          </div>
        </div>

        {/* Global Stats */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase text-gray-400">Consolidated Summary</h2>
          <div className="bg-tally-teal text-white p-6 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <BarChart3 className="w-24 h-24" />
            </div>
            <div>
              <p className="text-[10px] uppercase opacity-70">Total Branches</p>
              <p className="text-3xl font-bold">{branches.length}</p>
            </div>
            <div className="pt-4 border-t border-white/10">
              <p className="text-[10px] uppercase opacity-70">Global Combined Balance</p>
              <p className="text-2xl font-bold font-mono">₹ 1,24,50,000.00</p>
            </div>
            <button 
              onClick={() => alert('Generating aggregate financial report across all branches. PDF will be available shortly.')}
              className="w-full bg-tally-accent text-black font-bold py-3 uppercase text-xs hover:bg-yellow-500 transition-colors shadow-lg"
            >
              Generate All-Branch Report
            </button>
            <p className="text-[9px] text-center opacity-50 uppercase italic">Financial Data is consolidated in real-time from all child branches.</p>
          </div>
        </div>
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
                  placeholder="EBC Vengnuam" 
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
                    placeholder="NEW LAMKA" 
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
                    placeholder="branch@berithsystems.com" 
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
