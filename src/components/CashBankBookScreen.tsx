import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Landmark, Wallet, ChevronRight } from 'lucide-react';
import { activeVouchers } from '../lib/voucherUtils';
import { isCashBankGroup } from '../lib/accountGroups';

interface LedgerSummary {
  id: string;
  name: string;
  group: string;
  balance: number;
}

type NavRowType =
  | { type: 'section'; key: string; label: string }
  | { type: 'ledger'; ledger: LedgerSummary };

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
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Bank Accounts', 'Cash-in-hand'])
  );

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    setLoading(true);

    Promise.all([
      fetch(`/api/ledgers${query}`).then((res) => res.json()),
      fetch(`/api/vouchers${query}`).then((res) => res.json()),
    ])
      .then(([ledgerData, voucherData]) => {
        const cashBankLedgers = (Array.isArray(ledgerData) ? ledgerData : []).filter(
          (l: { group?: string; group_name?: string }) =>
            isCashBankGroup(l.group_name || l.group),
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
          cashBankLedgers.map((l: { id: string; name: string; group?: string; group_name?: string }) => ({
            id: l.id,
            name: l.name,
            group: (l.group_name || l.group || '').trim(),
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

  const bankLedgers = useMemo(
    () => ledgers.filter((l) => l.group === 'Bank Accounts'),
    [ledgers]
  );
  const cashLedgers = useMemo(
    () => ledgers.filter((l) => l.group === 'Cash-in-hand' || l.group === 'Cash'),
    [ledgers]
  );
  const bankTotal = useMemo(
    () => bankLedgers.reduce((acc, l) => acc + l.balance, 0),
    [bankLedgers]
  );
  const cashTotal = useMemo(
    () => cashLedgers.reduce((acc, l) => acc + l.balance, 0),
    [cashLedgers]
  );

  // Build navigable rows list (section headers + visible ledger rows)
  const navRows = useMemo<NavRowType[]>(() => {
    const rows: NavRowType[] = [];
    if (bankLedgers.length > 0) {
      rows.push({ type: 'section', key: 'Bank Accounts', label: 'Bank Accounts' });
      if (expandedSections.has('Bank Accounts')) {
        bankLedgers.forEach((l) => rows.push({ type: 'ledger', ledger: l }));
      }
    }
    if (cashLedgers.length > 0) {
      rows.push({ type: 'section', key: 'Cash-in-hand', label: 'Cash-in-Hand' });
      if (expandedSections.has('Cash-in-hand')) {
        cashLedgers.forEach((l) => rows.push({ type: 'ledger', ledger: l }));
      }
    }
    return rows;
  }, [bankLedgers, cashLedgers, expandedSections]);

  const fmt = (n: number) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Print handler ─────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const fmtAbs = (n: number) =>
      Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const bankRows = bankLedgers
      .map(
        (l) => `<tr>
          <td style="padding:3px 8px 3px 28px;font-size:11px;border-bottom:1px solid #eee;color:#444">${l.name}</td>
          <td style="padding:3px 12px;text-align:right;font-size:11px;border-bottom:1px solid #eee;color:#444">${fmtAbs(l.balance)}</td>
        </tr>`
      )
      .join('');

    const cashRows = cashLedgers
      .map(
        (l) => `<tr>
          <td style="padding:3px 8px 3px 28px;font-size:11px;border-bottom:1px solid #eee;color:#444">${l.name}</td>
          <td style="padding:3px 12px;text-align:right;font-size:11px;border-bottom:1px solid #eee;color:#444">${fmtAbs(l.balance)}</td>
        </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Cash / Bank Book</title>
  <meta charset="utf-8"/>
  <style>
    @page { margin: 14mm; size: A4 portrait; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 12px; }
    .hdr { background: #0f766e; color: #fff; text-align: center; padding: 10px 14px; }
    .hdr h1 { margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 2px; }
    .hdr .sub { font-size: 10px; margin-top: 3px; opacity: 0.85; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    .section-hdr td { background: #f2f8f7; font-weight: 800; font-size: 12px; text-transform: uppercase;
                      letter-spacing: 0.5px; padding: 5px 10px; border-top: 1px solid #b8c4cc;
                      border-bottom: 1px solid #b8c4cc; color: #0f766e; }
    .section-total td { font-weight: 700; font-size: 12px; padding: 4px 12px; background: #f9fafb;
                        border-top: 1px solid #ddd; }
    .section-total td:last-child { text-align: right; }
    .grand-total td { font-weight: 900; font-size: 14px; padding: 6px 12px;
                      background: #0f766e; color: #fff; border-top: 3px solid #0d5e57; }
    .grand-total td:last-child { text-align: right; }
    .flow-row { display: flex; gap: 0; border: 1px solid #ddd; margin-top: 16px; }
    .flow-cell { flex: 1; padding: 8px 12px; text-align: center; border-right: 1px solid #ddd; }
    .flow-cell:last-child { border-right: none; }
    .flow-cell .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #888; }
    .flow-cell .val { font-size: 13px; font-weight: 800; margin-top: 2px; }
    .footer { text-align: right; font-size: 9px; color: #888; padding: 6px 10px; border-top: 1px solid #eee; margin-top: 8px; }
    @media print { .footer { position: fixed; bottom: 0; left: 0; right: 0; } }
  </style>
</head>
<body>
  <div class="hdr">
    <h1>Cash / Bank Book</h1>
    <div class="sub">Closing Balance Report</div>
  </div>
  <table>
    <tr class="section-hdr">
      <td>🏦 Bank Accounts</td>
      <td style="text-align:right;font-weight:800">₹ ${fmtAbs(bankTotal)}</td>
    </tr>
    ${bankRows}
    <tr class="section-hdr" style="margin-top:4px">
      <td>👛 Cash-in-Hand</td>
      <td style="text-align:right;font-weight:800">₹ ${fmtAbs(cashTotal)}</td>
    </tr>
    ${cashRows}
    <tr class="grand-total">
      <td>Grand Total</td>
      <td>₹ ${fmtAbs(total)}</td>
    </tr>
  </table>
  <div class="flow-row">
    <div class="flow-cell">
      <div class="lbl">Total Inflow</div>
      <div class="val" style="color:#16a34a">₹ ${fmtAbs(inflow)}</div>
    </div>
    <div class="flow-cell">
      <div class="lbl">Total Outflow</div>
      <div class="val" style="color:#dc2626">₹ ${fmtAbs(outflow)}</div>
    </div>
    <div class="flow-cell" style="background:#f0fdfa">
      <div class="lbl" style="color:#0f766e">Net Cash Flow</div>
      <div class="val" style="color:#0f766e">₹ ${fmtAbs(netFlow)}</div>
    </div>
  </div>
  <div class="footer">Printed on ${new Date().toLocaleString('en-IN')}</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=700,height=900');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 400);
    }
  }, [bankLedgers, cashLedgers, bankTotal, cashTotal, total, inflow, outflow, netFlow]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Alt+P → Print
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        handlePrint();
        return;
      }

      let handled = false;

      if (e.key === 'ArrowDown') {
        setFocusedIdx((prev) => Math.min(prev + 1, navRows.length - 1));
        handled = true;
      } else if (e.key === 'ArrowUp') {
        setFocusedIdx((prev) => Math.max(prev - 1, 0));
        handled = true;
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        // On a section row: expand it
        if (focusedIdx >= 0 && focusedIdx < navRows.length) {
          const row = navRows[focusedIdx];
          if (row.type === 'section') {
            setExpandedSections((prev) => {
              const next = new Set(prev);
              next.add(row.key);
              return next;
            });
            handled = true;
          }
        }
      } else if (e.key === 'ArrowLeft') {
        // On a section row: collapse it. On a ledger row: jump to parent section
        if (focusedIdx >= 0 && focusedIdx < navRows.length) {
          const row = navRows[focusedIdx];
          if (row.type === 'section') {
            setExpandedSections((prev) => {
              const next = new Set(prev);
              next.delete(row.key);
              return next;
            });
            handled = true;
          } else {
            // Find and focus the parent section
            const parentKey = row.ledger.group === 'Bank Accounts' ? 'Bank Accounts' : 'Cash-in-hand';
            const parentIdx = navRows.findIndex(
              (r) => r.type === 'section' && r.key === parentKey
            );
            if (parentIdx >= 0) setFocusedIdx(parentIdx);
            handled = true;
          }
        }
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [handlePrint, focusedIdx, navRows]);

  // Auto-focus root div so keyboard works without clicking
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  // Scroll focused row into view
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});
  useEffect(() => {
    if (focusedIdx >= 0 && rowRefs.current[focusedIdx]) {
      rowRefs.current[focusedIdx]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIdx]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Map navRows to rowRef index per ledger/section identity
  const getNavIdx = useCallback(
    (identity: string) => navRows.findIndex((r) => {
      if (r.type === 'section') return r.key === identity;
      return r.ledger.id === identity;
    }),
    [navRows]
  );

  return (
    <div
      ref={rootRef}
      className="space-y-4 w-full outline-none"
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <style>{`
        .cbbook-focused-section { background: #ffd966 !important; }
        .cbbook-focused-ledger  { background: #ddeeff !important; }
        .cbbook-row:hover       { background: #f0fdf9 !important; }
      `}</style>

      {/* Header */}
      <div className="bg-tally-teal text-white p-2 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-between px-4">
        <span className="opacity-0 pointer-events-none text-[10px]">Alt+P</span>
        <span>Cash / Bank Book</span>
        <button
          onClick={handlePrint}
          title="Print (Alt+P)"
          className="text-[10px] border border-white/40 px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
        >
          Print  <kbd className="opacity-60">Alt+P</kbd>
        </button>
      </div>

      {/* Table */}
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
                {/* ── Bank Accounts Section ── */}
                {bankLedgers.length > 0 && (() => {
                  const secIdx = getNavIdx('Bank Accounts');
                  const isFocused = focusedIdx === secIdx;
                  const isExpanded = expandedSections.has('Bank Accounts');
                  return (
                    <>
                      <tr
                        ref={(el) => { rowRefs.current[secIdx] = el; }}
                        data-navrow={secIdx}
                        className={`cbbook-row cursor-pointer ${isFocused ? 'cbbook-focused-section' : 'bg-blue-50/30'}`}
                        onClick={() => { setFocusedIdx(secIdx); toggleSection('Bank Accounts'); }}
                      >
                        <td className="px-4 py-2 font-black text-tally-teal uppercase flex items-center gap-2">
                          <span
                            style={{
                              display: 'inline-block', width: 12, height: 12, lineHeight: '11px',
                              textAlign: 'center', fontSize: 10, fontWeight: 900,
                              border: '1px solid #b8c4cc', color: '#555', marginRight: 4, flexShrink: 0
                            }}
                          >
                            {isExpanded ? '−' : '+'}
                          </span>
                          <Landmark className="w-3 h-3" /> Bank Accounts
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold">
                          {fmt(bankTotal)}
                        </td>
                      </tr>
                      {isExpanded && bankLedgers.map((l) => {
                        const lIdx = getNavIdx(l.id);
                        const lFocused = focusedIdx === lIdx;
                        return (
                          <tr
                            key={l.id}
                            ref={(el) => { rowRefs.current[lIdx] = el; }}
                            data-navrow={lIdx}
                            className={`cbbook-row cursor-pointer group ${lFocused ? 'cbbook-focused-ledger' : ''}`}
                            onClick={() => setFocusedIdx(lIdx)}
                          >
                            <td className="px-8 py-2 flex justify-between items-center pr-10">
                              <span className="group-hover:text-tally-teal transition-colors">{l.name}</span>
                              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-gray-600">{fmt(l.balance)}</td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })()}

                {/* ── Cash-in-Hand Section ── */}
                {cashLedgers.length > 0 && (() => {
                  const secIdx = getNavIdx('Cash-in-hand');
                  const isFocused = focusedIdx === secIdx;
                  const isExpanded = expandedSections.has('Cash-in-hand');
                  return (
                    <>
                      <tr
                        ref={(el) => { rowRefs.current[secIdx] = el; }}
                        data-navrow={secIdx}
                        className={`cbbook-row cursor-pointer ${isFocused ? 'cbbook-focused-section' : 'bg-green-50/30'}`}
                        onClick={() => { setFocusedIdx(secIdx); toggleSection('Cash-in-hand'); }}
                      >
                        <td className="px-4 py-2 font-black text-tally-teal uppercase flex items-center gap-2">
                          <span
                            style={{
                              display: 'inline-block', width: 12, height: 12, lineHeight: '11px',
                              textAlign: 'center', fontSize: 10, fontWeight: 900,
                              border: '1px solid #b8c4cc', color: '#555', marginRight: 4, flexShrink: 0
                            }}
                          >
                            {isExpanded ? '−' : '+'}
                          </span>
                          <Wallet className="w-3 h-3" /> Cash-in-Hand
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold">
                          {fmt(cashTotal)}
                        </td>
                      </tr>
                      {isExpanded && cashLedgers.map((l) => {
                        const lIdx = getNavIdx(l.id);
                        const lFocused = focusedIdx === lIdx;
                        return (
                          <tr
                            key={l.id}
                            ref={(el) => { rowRefs.current[lIdx] = el; }}
                            data-navrow={lIdx}
                            className={`cbbook-row cursor-pointer group ${lFocused ? 'cbbook-focused-ledger' : ''}`}
                            onClick={() => setFocusedIdx(lIdx)}
                          >
                            <td className="px-8 py-2 flex justify-between items-center pr-10">
                              <span className="group-hover:text-tally-teal transition-colors">{l.name}</span>
                              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-gray-600">{fmt(l.balance)}</td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })()}
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

      {/* Cash Flow Summary */}
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

      {/* Status bar */}
      <div className="flex justify-between items-center px-2 py-1 bg-gray-800 text-gray-400 text-[10px] rounded">
        <span>↑↓ Navigate  |  ← Collapse / Jump to parent  |  → or Enter: Expand</span>
        <span>Alt+P: Print</span>
      </div>
    </div>
  );
}
