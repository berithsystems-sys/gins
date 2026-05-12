/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

interface AnalyticsProps {
  branches: any[];
  ledgers: any[];
  vouchers: any[];
}

const COLORS = ['#1e1b4b', '#4338ca', '#fbbf24', '#0ea5e9', '#ec4899', '#10b981'];

export default function AnalyticsScreen({ branches, ledgers, vouchers }: AnalyticsProps) {
  
  // Calculate Income vs Expense by Branch
  const branchComparisonData = useMemo(() => {
    return branches.map(branch => {
      const branchVouchers = vouchers.filter(v => v.branchId === branch.id);
      const income = branchVouchers
        .filter(v => v.type === 'Receipt' || v.type === 'Sales')
        .reduce((sum, v) => sum + v.amount, 0);
      const expense = branchVouchers
        .filter(v => v.type === 'Payment' || v.type === 'Purchase')
        .reduce((sum, v) => sum + v.amount, 0);
        
      return {
        name: branch.code,
        Income: income,
        Expense: expense,
      };
    });
  }, [branches, vouchers]);

  // Distribution of Voucher Types
  const voucherDistData = useMemo(() => {
    const counts: Record<string, number> = {};
    vouchers.forEach(v => {
      counts[v.type] = (counts[v.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [vouchers]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 bg-white min-h-screen">
      <div className="bg-white border-2 border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase text-tally-teal mb-4 border-b pb-2">Branch Performance (Income vs Expense)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={branchComparisonData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={10} tick={{ fill: '#6b7280' }} />
              <YAxis fontSize={10} tick={{ fill: '#6b7280' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '0px', border: '2px solid #1e1b4b', fontSize: '12px' }}
                cursor={{ fill: 'rgba(30, 27, 75, 0.05)' }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              <Bar dataKey="Income" fill="#1e1b4b" barSize={30} />
              <Bar dataKey="Expense" fill="#fbbf24" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase text-tally-teal mb-4 border-b pb-2">Transaction Distribution by Type</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={voucherDistData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {voucherDistData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '0px', border: '2px solid #1e1b4b', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white border-2 border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase text-tally-teal mb-4 border-b pb-2">HQ Summary Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-tally-bg/30 p-4 border border-tally-teal/10">
            <p className="text-[10px] uppercase text-gray-500 font-bold">Total Transactions</p>
            <p className="text-2xl font-bold text-tally-teal">{vouchers.length}</p>
          </div>
          <div className="bg-tally-bg/30 p-4 border border-tally-teal/10">
            <p className="text-[10px] uppercase text-gray-500 font-bold">Total Ledgers</p>
            <p className="text-2xl font-bold text-tally-teal">{ledgers.length}</p>
          </div>
          <div className="bg-tally-bg/30 p-4 border border-tally-teal/10">
            <p className="text-[10px] uppercase text-gray-500 font-bold">Top Branch Access</p>
            <p className="text-lg font-bold text-tally-teal truncate uppercase">{branches[0]?.name || 'N/A'}</p>
          </div>
          <div className="bg-tally-bg/30 p-4 border border-tally-teal/10">
            <p className="text-[10px] uppercase text-gray-500 font-bold">System Health</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-green-600 uppercase">Synced & Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
