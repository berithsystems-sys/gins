import React, { useState, useEffect } from 'react';
import { Users, Mail, Settings, Shield, Trash2, Key } from 'lucide-react';

interface ChurchUser {
  id: string;
  username: string;
  role: string;
  branchId: string;
  branchName?: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<ChurchUser[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, bRes] = await Promise.all([
          fetch('/api/debug').then(res => res.json()), // Debug endpoint provides all users
          fetch('/api/branches').then(res => res.json())
        ]);
        
        // Map branch names to users
        const branchMap = bRes.reduce((acc: any, b: any) => ({ ...acc, [b.id]: b.name }), {});
        const churchUsers = uRes.users.filter((u: any) => u.role === 'BRANCH').map((u: any) => ({
          ...u,
          branchName: branchMap[u.branchId] || 'Unknown'
        }));
        
        setUsers(churchUsers);
        setBranches(bRes);
      } catch (error) {
        console.error("Failed to fetch admin data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateEmail = async (userId: string, newEmail: string) => {
     if (!newEmail) return;
     const res = await fetch(`/api/users/${userId}/email`, {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email: newEmail })
     });
     if (res.ok) {
       alert('Email updated successfully');
       // Refresh list
       setUsers(prev => prev.map(u => u.id === userId ? { ...u, username: newEmail } : u));
     }
  };

  const resetPassword = async (branchId: string) => {
    const newPass = prompt('Enter new password for this church:');
    if (!newPass) return;
    const res = await fetch(`/api/branches/${branchId}/reset-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass })
    });
    if (res.ok) alert('Password reset successfully');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 border-b-2 border-tally-teal pb-4">
        <Shield className="w-8 h-8 text-tally-teal" />
        <div>
          <h2 className="text-xl font-black text-tally-teal uppercase italic">System Administration</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Global Account Management</p>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center font-bold text-gray-300 animate-pulse uppercase">Syncing Cloud Directory...</div>
      ) : (
        <div className="grid gap-4">
          <div className="bg-gray-50 p-2 border text-[10px] font-bold text-gray-400 uppercase flex justify-between">
            <span>Branch/Church Name</span>
            <div className="flex gap-20 pr-10">
              <span>Login Email (Username)</span>
              <span>Actions</span>
            </div>
          </div>
          
          {users.map(u => (
            <div key={u.id} className="flex justify-between items-center bg-white border p-4 shadow-sm hover:border-tally-teal transition-all group">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-tally-bg rounded flex items-center justify-center text-tally-teal font-black">
                    {u.branchName?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-black text-gray-800 uppercase">{u.branchName}</div>
                    <div className="text-[10px] text-gray-400 font-mono">ID: {u.branchId}</div>
                  </div>
               </div>

               <div className="flex items-center gap-12">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 text-xs font-bold text-tally-teal">
                      <Mail className="w-3 h-3" />
                      {u.username}
                    </div>
                    <button 
                      onClick={() => {
                        const newMail = prompt('Enter new login email:', u.username);
                        if (newMail) handleUpdateEmail(u.id, newMail);
                      }}
                      className="text-[9px] text-blue-500 hover:underline cursor-pointer font-bold uppercase"
                    >
                      Change Email
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => resetPassword(u.branchId)}
                      className="p-2 bg-gray-100 hover:bg-tally-teal hover:text-white rounded transition-colors" 
                      title="Reset Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-gray-100 hover:bg-red-500 hover:text-white rounded transition-colors" title="Deactivate Account">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 p-4 border border-blue-100 rounded text-[11px] italic text-blue-800">
        <h4 className="font-bold flex items-center gap-2 mb-1 uppercase">
          <Settings className="w-3 h-3" />
          Security Protocol
        </h4>
        Changing church credentials will force logout all active sessions for that branch.
      </div>
    </div>
  );
}
