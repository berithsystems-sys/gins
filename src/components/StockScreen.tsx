/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

export default function StockScreen() {
  const [items, setItems] = useState([
    { id: '1', name: 'Raw Material A', group: 'Primary', quantity: 50, rate: 200, unit: 'kgs' },
    { id: '2', name: 'Finished Good X', group: 'Primary', quantity: 120, rate: 1500, unit: 'pcs' },
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-tally-teal text-white p-2 rounded-t-sm">
        <span className="text-xs font-bold uppercase tracking-wider">Stock Summary</span>
        <span className="text-[10px] opacity-70">ABC TRADING CO.</span>
      </div>
      
      <div className="border-2 border-tally-teal overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-tally-teal/20 text-[10px] font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Particulars</th>
              <th className="px-4 py-2 text-right">Quantity</th>
              <th className="px-4 py-2 text-right">Rate</th>
              <th className="px-4 py-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-tally-bg cursor-pointer transition-colors">
                <td className="px-4 py-2 font-medium">{item.name}</td>
                <td className="px-4 py-2 text-right font-mono">{item.quantity} {item.unit}</td>
                <td className="px-4 py-2 text-right font-mono">{item.rate.toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-mono font-bold">{(item.quantity * item.rate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-tally-teal/5 font-bold border-t-2 border-tally-teal">
            <tr>
              <td className="px-4 py-2 uppercase">Total</td>
              <td className="px-4 py-2 text-right">170 items</td>
              <td className="px-4 py-2" />
              <td className="px-4 py-2 text-right font-mono">
                {items.reduce((acc, curr) => acc + (curr.quantity * curr.rate), 0).toFixed(2)}
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
