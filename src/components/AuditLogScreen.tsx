/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ShieldCheck, Clock, UserIcon, Info } from 'lucide-react';

export default function AuditLogScreen({ branchId, isAdmin }: { branchId?: string; isAdmin?: boolean }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = !isAdmin && branchId ? `?branchId=${branchId}` : '';
    fetch(`api/audit${query}`).then(res => res.json()).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, [branchId, isAdmin]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center border-b-2 border-tally-teal pb-2">
        <div>
          <h1 className="text-xl font-bold text-tally-teal uppercase tracking-widest">User Login Audit Dashboard</h1>
          <p className="text-[10px] text-gray-500 uppercase">Live Security Monitoring & Activity Trails</p>
        </div>
        <ShieldCheck className="w-8 h-8 text-tally-teal opacity-20" />
      </div>

      <div className="bg-white border-2 border-gray-100 shadow-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-tally-bg text-tally-teal font-bold uppercase border-b border-tally-teal/20">
            <tr>
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left w-48">Timestamp</th>
              <th className="px-4 py-3 text-left w-40">Username</th>
              <th className="px-4 py-3 text-left w-32">Action</th>
              <th className="px-4 py-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Reading security rails...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">No activity recorded yet.</td></tr>
            ) : logs.map((log, idx) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-4 py-2 text-gray-300 font-mono">{idx + 1}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>{format(new Date(log.timestamp), 'dd-MMM-yyyy HH:mm:ss')}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-tally-teal/10 flex items-center justify-center text-[10px] font-bold text-tally-teal uppercase">
                      {log.username.charAt(0)}
                    </div>
                    <span className="font-bold">{log.username}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    log.action === 'LOGIN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Info className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{log.details}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase px-2">
        <span>Total Records: {logs.length}</span>
        <span className="italic uppercase">Data access is restricted to HQ Administrators only</span>
      </div>
    </div>
  );
}
