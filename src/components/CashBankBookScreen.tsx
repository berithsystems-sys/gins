import React, { useState, useEffect, useMemo } from 'react';
import { Landmark, Wallet, ChevronRight } from 'lucide-react';
import { activeVouchers } from '../lib/voucherUtils';

interface LedgerSummary {
  id: string;
  name: string;
  group: string;
  balance: number;
}

const CASH_BANK_GROUPS = ['Cash-in-hand', 'Bank Accounts'];

function entryType(e: { type?: string; entry_type?: string }): 'Dr' | 'Cr' {
  const t = e.type || e.entry_type;
  return t === 'Cr' ? 'Cr' : 'Dr';
}

function entryAmount(e: { amount?: number; entry_amount?: number }): number {
  return Number(e.amount ?? e.entry_amount ?? 0);
}

export default function CashBankBookScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([]);
  const [inflow, setInflow] = useState(0);
  const [outflow, setOutflow] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    setLoading(true);

    Promise.all([
      fetch(`/api/ledgers${query}`).then((res) => res.json()),
      fetch(`/api/vouchers${query}`).then((res) => res.json()),
    ])
      .then(([ledgerData, voucherData]) => {
        const cashBankLedgers = (Array.isArray(ledgerData) ? ledgerData : []).filter(
          (l: { group?: string }) => l.group && CASH_BANK_GROUPS.includes(l.group),
        );

        const ledgerIds = new Set(cashBankLedgers.map((l: { id: string }) => l.id));
        const balances: Record<string, number> = {};

        cashBankLedgers.forEach((l: { id: string; openingBalance?: number; balanceType?: string }) => {
          const ob = Number(l.openingBalance || 0);
          balances[l.id] = l.balanceType === 'Cr' ? -ob : ob;
        });

        let totalIn = 0;
        let totalOut = 0;

        activeVouchers(voucherData).forEach((v: { entries?: unknown[] }) => {
          const entries = Array.isArray(v.entries) ? v.entries : [];
          entries.forEach((raw) => {
            const e = raw as {
              ledgerId?: string;
              type?: string;
              entry_type?: string;
              amount?: number;
              entry_amount?: number;
            };
            if (!e.ledgerId || !ledgerIds.has(e.ledgerId)) return;

            const amt = entryAmount(e);
            const typ = entryType(e);

            if (typ === 'Dr') {
              balances[e.ledgerId] = (balances[e.ledgerId] ?? 0) + amt;
              totalIn += amt;
            } else {
              balances[e.ledgerId] = (balances[e.ledgerId] ?? 0) - amt;
              totalOut += amt;
            }
          });
        });

        setLedgers(
          cashBankLedgers.map((l: { id: string; name: string; group: string }) => ({
            id: l.id,
            name: l.name,
            group: l.group,
            balance: balances[l.id] ?? 0,
          })),
        );
        setInflow(totalIn);
        setOutflow(totalOut);
      })
      .catch(() => {
        setLedgers([]);
        setInflow(0);
        setOutflow(0);
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  const total = useMemo(() => ledgers.reduce((acc, curr) => acc + curr.balance, 0), [ledgers]);
  const netFlow = inflow - outflow;

  const fmt = (n: number) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4 w-full">
      <div className="bg-tally-teal text-white p-2 text-center text-xs font-bold uppercase tracking-widest">
        Cash / Bank Book
      </div>

      <div className="border border-tally-teal/20 bg-white overflow-x-auto shadow-lg">
        <table className="w-full text-xs min-w-[500px]">
          <thead className="bg-gray-100 border-b border-tally-teal/10 font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Particulars</th>
              <th className="px-4 py-3 text-right w-48">Closing Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={2} className="p-10 text-center animate-pulse uppercase tracking-widest text-gray-400">
                  Loading Balances...
                </td>
              </tr>
            ) : ledgers.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-10 text-center uppercase tracking-widest text-gray-400">
                  No cash or bank ledgers for this company
                </td>
              </tr>
            ) : (
              <>
                <tr className="bg-blue-50/30">
                  <td className="px-4 py-2 font-black text-tally-teal uppercase flex items-center gap-2">
                    <Landmark className="w-3 h-3" /> Bank Accounts
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold">
                    {fmt(ledgers.filter((l) => l.group === 'Bank Accounts').reduce((acc, l) => acc + l.balance, 0))}
                  </td>
                </tr>
                {ledgers
                  .filter((l) => l.group === 'Bank Accounts')
                  .map((l) => (
                    <tr key={l.id} className="hover:bg-tally-accent/10 cursor-pointer group">
                      <td className="px-8 py-2 flex justify-between items-center pr-10">
                        <span className="group-hover:text-tally-teal transition-colors">{l.name}</span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-600">{fmt(l.balance)}</td>
                    </tr>
                  ))}

                <tr className="bg-green-50/30">
                  <td className="px-4 py-2 font-black text-tally-teal uppercase flex items-center gap-2">
                    <Wallet className="w-3 h-3" /> Cash-in-Hand
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold">
                    {fmt(ledgers.filter((l) => l.group === 'Cash-in-hand').reduce((acc, l) => acc + l.balance, 0))}
                  </td>
                </tr>
                {ledgers
                  .filter((l) => l.group === 'Cash-in-hand')
                  .map((l) => (
                    <tr key={l.id} className="hover:bg-tally-accent/10 cursor-pointer group">
                      <td className="px-8 py-2 flex justify-between items-center pr-10">
                        <span className="group-hover:text-tally-teal transition-colors">{l.name}</span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-600">{fmt(l.balance)}</td>
                    </tr>
                  ))}
              </>
            )}
          </tbody>
          <tfoot className="bg-tally-teal text-white font-black border-t-4 border-tally-teal/20">
            <tr>
              <td className="px-4 py-3 uppercase tracking-wider">Grand Total</td>
              <td className="px-4 py-3 text-right font-mono text-lg tracking-tighter">₹ {fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex gap-4 mt-8 opacity-60">
        <div className="bg-gray-100 border p-2 flex flex-col items-center flex-1">
          <span className="text-[9px] font-bold text-gray-400">Total Inflow</span>
          <span className="text-xs font-black text-green-600">₹ {fmt(inflow)}</span>
        </div>
        <div className="bg-gray-100 border p-2 flex flex-col items-center flex-1">
          <span className="text-[9px] font-bold text-gray-400">Total Outflow</span>
          <span className="text-xs font-black text-red-600">₹ {fmt(outflow)}</span>
        </div>
        <div className="bg-tally-teal/10 border border-tally-teal p-2 flex flex-col items-center flex-1">
          <span className="text-[9px] font-bold text-tally-teal">Net Cash Flow</span>
          <span className="text-xs font-black text-tally-teal">₹ {fmt(netFlow)}</span>
        </div>
      </div>
    </div>
  );
}
