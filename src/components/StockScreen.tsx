/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

export default function StockScreen({ branchId }: { branchId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/stock-items${query}`).then(res => res.json()),
      fetch(`/api/units${query}`).then(res => res.json())
    ]).then(([si, u]) => {
      setItems(si);
      setUnits(u);
    });
  }, [branchId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-tally-teal text-white p-2 rounded-t-sm">
        <span className="text-xs font-bold uppercase tracking-wider">Stock Summary</span>
        <span className="text-[10px] opacity-70">Church Branch Storage</span>
      </div>
      
      <div className="border-2 border-tally-teal overflow-hidden bg-white shadow-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-tally-teal/20 text-[10px] font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Particulars</th>
              <th className="px-4 py-2 text-right">Quantity</th>
              <th className="px-4 py-2 text-right">Rate</th>
              <th className="px-4 py-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 italic">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-tally-accent/5 cursor-pointer transition-colors">
                <td className="px-4 py-2 font-bold text-tally-teal uppercase">{item.name}</td>
                <td className="px-4 py-2 text-right font-mono">{item.openingBalance} {units.find(u => u.id === item.unitId)?.symbol || ''}</td>
                <td className="px-4 py-2 text-right font-mono">{Number(item.ratePerUnit || 0).toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-mono font-bold">₹{(item.openingBalance * item.ratePerUnit).toLocaleString()}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">No Stock Items Found</td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-tally-teal/5 font-bold border-t-2 border-tally-teal">
            <tr>
              <td className="px-4 py-2 uppercase">Total Inventory Value</td>
              <td className="px-4 py-2 text-right">{items.length} items</td>
              <td className="px-4 py-2" />
              <td className="px-4 py-2 text-right font-mono text-lg text-tally-teal">
                ₹{items.reduce((acc, curr) => acc + (curr.openingBalance * curr.ratePerUnit), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-[10px] font-bold">
        <button className="bg-gray-100 p-1 border hover:bg-gray-200">F4: Item-wise</button>
        <button className="bg-gray-100 p-1 border hover:bg-gray-200">F5: Group-wise</button>
        <button className="bg-gray-100 p-1 border hover:bg-gray-200">F7: Show Profit</button>
        <button className="bg-gray-100 p-1 border hover:bg-gray-200">F12: Configure</button>
      </div>
    </div>
  );
}
