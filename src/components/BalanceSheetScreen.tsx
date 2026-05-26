import React, { useState, useEffect, useCallback, useRef } from 'react';
import { exportToExcel, printReport } from '../lib/ReportUtils';

// ─── Types matching exact DB schema ───────────────────────────────────────────
interface Ledger {
  id: string;
  name: string;
  group_name?: string;
  group?: string;
  openingBalance?: number;
  balanceType?: 'Dr' | 'Cr';
  branchId?: string;
}
interface VoucherEntry {
  ledgerId: string;
  amount: number;
  type: 'Dr' | 'Cr';
}
interface Voucher {
  id: string;
  date?: string;
  type?: string;
  narration?: string;
  entries: VoucherEntry[];
}
interface Group {
  id: string;
  name: string;
  parent_group?: string;
  under?: string;
}
interface DrillEntry {
  date: string;
  voucherType: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}

// ─── ALL groups that belong to each Balance Sheet side ───────────────────────
// Extend this list to match whatever group_names exist in your DB
const LIABILITY_GROUPS = [
  'Capital Account',
  'Loans (Liability)',
  'Current Liabilities',
  'Suspense Account',
  'Reserves and Surplus',
  'Bank OD',
  'Secured Loans',
  'Unsecured Loans',
];

const ASSET_GROUPS = [
  'Fixed Assets',
  'Investments',
  'Current Assets',
  'Bank Accounts',
  'Cash',
  'Cash-in-Hand',
  'Sundry Debtors',
  'Stock-in-Hand',
  'Loans & Advances (Asset)',
  'Deposits (Asset)',
  'Miscellaneous Expenses (Asset)',
];

// ─── Debug Panel ──────────────────────────────────────────────────────────────
function DebugPanel({
  ledgers, vouchers, groups, branchId
}: { ledgers: Ledger[]; vouchers: Voucher[]; groups: Group[]; branchId?: string }) {
  const [open, setOpen] = useState(true); // open by default so you see it immediately

  const uniqueGroupNames = [...new Set(ledgers.map(l => l.group_name || l.group || 'NONE'))];
  const knownBS = [...LIABILITY_GROUPS, ...ASSET_GROUPS];
  const unknownGroups = uniqueGroupNames.filter(g => !knownBS.includes(g));

  if (!open) return (
    <div className="fixed bottom-2 left-2 z-50">
      <button onClick={() => setOpen(true)}
        className="bg-red-600 text-white text-[9px] px-2 py-1 rounded shadow font-bold">
        DEBUG ({ledgers.length}L / {vouchers.length}V)
      </button>
    </div>
  );

  return (
    <div className="fixed bottom-2 left-2 z-50 bg-white border-2 border-red-500 p-3 text-[9px] w-72 max-h-80 overflow-auto shadow-xl rounded">
      <div className="flex justify-between mb-2 items-center">
        <span className="font-bold text-red-500 text-[10px]">⚙ DEBUG PANEL</span>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>
      <div className="space-y-0.5">
        <div><b>branchId:</b> <span className="text-blue-600">{branchId || 'none'}</span></div>
        <div><b>Ledgers loaded:</b> <span className={ledgers.length > 0 ? 'text-green-600' : 'text-red-600'}>{ledgers.length}</span></div>
        <div><b>Vouchers loaded:</b> {vouchers.length}</div>
        <div><b>Groups loaded:</b> {groups.length}</div>
      </div>

      {unknownGroups.length > 0 && (
        <div className="mt-2 p-1.5 bg-yellow-50 border border-yellow-300 rounded">
          <div className="font-bold text-yellow-700">⚠ Groups NOT in Balance Sheet:</div>
          {unknownGroups.map(g => (
            <div key={g} className="text-yellow-600 pl-1">"{g}"
              ({ledgers.filter(l => (l.group_name || l.group) === g).length} ledgers)
            </div>
          ))}
          <div className="text-yellow-500 mt-1 italic">These are P&L groups — normal to exclude from BS</div>
        </div>
      )}

      <div className="mt-2"><b>Ledger group_names in BS:</b></div>
      {uniqueGroupNames.filter(g => knownBS.includes(g)).map(g => (
        <div key={g} className="text-green-700 pl-1">
          ✓ "{g}" → {ledgers.filter(l => (l.group_name || l.group) === g).length} ledgers
        </div>
      ))}

      {ledgers.length > 0 && (
        <div className="mt-2">
          <b>Sample ledger:</b>
          <pre className="text-[8px] text-gray-600 bg-gray-50 p-1 rounded overflow-x-auto mt-0.5">
            {JSON.stringify(ledgers[0], null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Ledger Drill-Down Modal ──────────────────────────────────────────────────
function LedgerDrillDown({ ledger, entries, onClose }: {
  ledger: Ledger; entries: DrillEntry[]; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose]);

  const ob = Number(ledger.openingBalance || 0);
  let runBal = ledger.balanceType === 'Cr' ? -ob : ob;
  const totalDebit  = entries.reduce((a, e) => a + e.debit,  0);
  const totalCredit = entries.reduce((a, e) => a + e.credit, 0);
  const finalBal = runBal + totalDebit - totalCredit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div ref={ref} tabIndex={-1}
        className="bg-white w-[860px] max-h-[88vh] flex flex-col shadow-2xl border-2 border-tally-teal outline-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-tally-sidebar text-white px-4 py-2 flex justify-between items-center">
          <span className="text-xs font-bold uppercase">Ledger Transactions — {ledger.name}</span>
          <span className="text-tally-accent text-[10px]">ESC to close</span>
        </div>

        {/* Sub-header: ledger info */}
        <div className="bg-tally-light px-4 py-1 flex gap-6 text-[10px] border-b border-tally-teal">
          <span><b>Group:</b> {ledger.group_name || ledger.group || '—'}</span>
          <span><b>Opening Balance:</b> ₹{ob.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledger.balanceType}</span>
          <span><b>Branch ID:</b> {ledger.branchId || '—'}</span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[100px_110px_1fr_95px_95px_115px] bg-tally-light px-3 py-1 text-[10px] font-bold uppercase border-b border-tally-teal text-tally-teal">
          <span>Date</span><span>Type</span><span>Narration</span>
          <span className="text-right">Debit (Dr)</span>
          <span className="text-right">Credit (Cr)</span>
          <span className="text-right">Balance</span>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {/* Opening balance row */}
          <div className="grid grid-cols-[100px_110px_1fr_95px_95px_115px] px-3 py-1 text-[10px] bg-yellow-50 border-b border-yellow-200 font-semibold">
            <span className="text-gray-400">—</span>
            <span className="text-gray-700">Opening Balance</span>
            <span className="italic text-gray-400">—</span>
            <span className="text-right font-mono text-green-700">
              {runBal > 0 ? runBal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </span>
            <span className="text-right font-mono text-red-600">
              {runBal < 0 ? Math.abs(runBal).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </span>
            <span className="text-right font-mono text-tally-teal">
              {Math.abs(runBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {runBal >= 0 ? 'Dr' : 'Cr'}
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-12 text-[11px] text-gray-400 italic">
              No transactions recorded for this ledger.
              <div className="text-[10px] mt-1 text-gray-300">Only opening balance applies.</div>
            </div>
          ) : entries.map((e, i) => {
            runBal += e.debit - e.credit;
            return (
              <div key={i}
                className={`grid grid-cols-[100px_110px_1fr_95px_95px_115px] px-3 py-0.5 text-[10px] border-b border-gray-50 hover:bg-tally-accent/10 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}
              >
                <span className="text-gray-500">{e.date}</span>
                <span className="text-gray-700 font-medium">{e.voucherType}</span>
                <span className="text-gray-400 truncate">{e.narration || '—'}</span>
                <span className="text-right font-mono text-green-700">
                  {e.debit > 0 ? e.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                </span>
                <span className="text-right font-mono text-red-600">
                  {e.credit > 0 ? e.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                </span>
                <span className="text-right font-mono text-tally-teal font-semibold">
                  {Math.abs(runBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {runBal >= 0 ? 'Dr' : 'Cr'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="grid grid-cols-[100px_110px_1fr_95px_95px_115px] px-3 py-2 text-[10px] font-black bg-tally-light border-t-2 border-tally-teal text-tally-teal">
          <span className="col-span-3 uppercase">Closing Balance</span>
          <span className="text-right font-mono">{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          <span className="text-right font-mono">{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          <span className="text-right font-mono">
            {Math.abs(finalBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {finalBal >= 0 ? 'Dr' : 'Cr'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BalanceSheetScreen({ branchId, onBack }: {
  branchId?: string; onBack?: () => void;
}) {
  const [ledgers,   setLedgers]   = useState<Ledger[]>([]);
  const [vouchers,  setVouchers]  = useState<Voucher[]>([]);
  const [groups,    setGroups]    = useState<Group[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [drillLedger, setDrillLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = branchId ? `?branchId=${branchId}` : '';
        const [l, v, g, b] = await Promise.all([
          fetch(`/api/ledgers${q}`).then(r => { if (!r.ok) throw new Error(`ledgers: ${r.status}`); return r.json(); }),
          fetch(`/api/vouchers${q}`).then(r => { if (!r.ok) throw new Error(`vouchers: ${r.status}`); return r.json(); }),
          fetch(`/api/account-groups${q}`).then(r => { if (!r.ok) throw new Error(`groups: ${r.status}`); return r.json(); }),
          fetch(`/api/branches`).then(r => r.json()),
        ]);

        console.log('[BS] ledgers sample:', Array.isArray(l) ? l[0] : l);
        console.log('[BS] counts — ledgers:', l?.length, 'vouchers:', v?.length, 'groups:', g?.length);

        const ledgerArr  = Array.isArray(l) ? l : [];
        const voucherArr = Array.isArray(v) ? v : [];
        const groupArr   = Array.isArray(g) ? g : [];

        setLedgers(ledgerArr);
        setVouchers(voucherArr);
        setGroups(groupArr);

        // Auto-expand all BS groups that have data
        const allBSGroups = [...LIABILITY_GROUPS, ...ASSET_GROUPS];
        const groupsWithData = allBSGroups.filter(gName =>
          ledgerArr.some(l => (l.group_name === gName || l.group === gName))
        );
        setExpandedGroups(groupsWithData);

        if (Array.isArray(b)) {
          const br = b.find((c: any) => c.id === branchId);
          if (br) setCompanyName(br.name);
        }
      } catch (err: any) {
        console.error('[BS] fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [branchId]);

  useEffect(() => { containerRef.current?.focus(); }, [loading]);

  // ── Balance for one ledger (opening + all voucher entries) ─────────────
  const calculateBalance = useCallback((ledgerId: string): number => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return 0;
    const ob = Number(ledger.openingBalance || 0);
    // Dr opening = positive, Cr opening = negative
    let bal = ledger.balanceType === 'Cr' ? -ob : ob;
    for (const v of vouchers) {
      if (!Array.isArray(v.entries)) continue;
      for (const e of v.entries) {
        if (e.ledgerId !== ledgerId) continue;
        const amt = Number(e.amount || 0);
        bal += e.type === 'Dr' ? amt : -amt;
      }
    }
    return bal; // positive = Dr, negative = Cr
  }, [ledgers, vouchers]);

  // ── Total for a group (including sub-groups via 'under' field) ─────────
  const getGroupTotal = useCallback((groupName: string): number => {
    const groupLedgers = ledgers.filter(l =>
      l.group_name === groupName || l.group === groupName
    );
    let total = groupLedgers.reduce((acc, l) => acc + calculateBalance(l.id), 0);
    // Sub-groups use 'under' field (your DB schema) OR 'parent_group'
    const subGroups = groups.filter(g =>
      g.parent_group === groupName || g.under === groupName
    );
    for (const sg of subGroups) total += getGroupTotal(sg.name);
    return total;
  }, [ledgers, groups, calculateBalance]);

  // ── Drill-down: all voucher entries for a ledger ───────────────────────
  const getDrillEntries = useCallback((ledger: Ledger): DrillEntry[] => {
    const result: DrillEntry[] = [];
    const relevant = vouchers
      .filter(v => Array.isArray(v.entries) && v.entries.some(e => e.ledgerId === ledger.id))
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    for (const v of relevant) {
      for (const e of v.entries) {
        if (e.ledgerId !== ledger.id) continue;
        const amt = Number(e.amount || 0);
        result.push({
          date: v.date ? new Date(v.date).toLocaleDateString('en-IN') : '—',
          voucherType: v.type || 'Journal',
          narration: v.narration || '',
          debit:  e.type === 'Dr' ? amt : 0,
          credit: e.type === 'Cr' ? amt : 0,
          balance: 0,
        });
      }
    }
    return result;
  }, [vouchers]);

  const handleExport = useCallback(() => {
    const rows = [
      ...LIABILITY_GROUPS.map(g => ({ Side: 'Liabilities', Group: g, Amount: -getGroupTotal(g) })),
      ...ASSET_GROUPS.map(g => ({ Side: 'Assets', Group: g, Amount: getGroupTotal(g) })),
    ].filter(r => Math.abs(r.Amount) >= 0.01);
    exportToExcel(rows, 'Balance_Sheet');
  }, [getGroupTotal]);

  // ── Keyboard shortcuts — scoped, won't reach parent ───────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { onBack?.(); return; }
    e.stopPropagation();
    e.preventDefault();
    if (e.altKey && e.key.toUpperCase() === 'P') printReport('balance-sheet-report');
    if (e.altKey && e.key.toUpperCase() === 'E') handleExport();
    if (e.key === 'F1') setExpandedGroups([]);
  }, [onBack, handleExport]);

  const toggleGroup = (name: string) =>
    setExpandedGroups(prev =>
      prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]
    );

  // ── Render one BS side ─────────────────────────────────────────────────
  const renderSection = (title: string, groupNames: string[]) => {
    const isLiab = title === 'Liabilities';

    const sections = groupNames.map(name => {
      const raw     = getGroupTotal(name);
      // Liabilities: Cr balances are positive. Assets: Dr balances are positive.
      const display = isLiab ? -raw : raw;
      return { name, raw, display };
    }).filter(s => Math.abs(s.display) >= 0.01);

    const total = sections.reduce((acc, s) => acc + s.display, 0);

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1">
          {sections.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-[10px] text-gray-400 italic">No balances to display</span>
            </div>
          ) : sections.map(s => {
            const isExpanded = expandedGroups.includes(s.name);

            const groupLedgers = ledgers.filter(l => {
              if (l.group_name !== s.name && l.group !== s.name) return false;
              const bal     = calculateBalance(l.id);
              const display = isLiab ? -bal : bal;
              return Math.abs(display) >= 0.01;
            });

            return (
              <div key={s.name} className="border-b border-gray-100 last:border-0">
                {/* Group header row */}
                <div
                  onClick={() => toggleGroup(s.name)}
                  className="flex justify-between items-center py-1.5 px-3 hover:bg-tally-accent/10 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-tally-teal w-3 font-bold">
                      {isExpanded ? '▾' : '▸'}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
                      {s.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-gray-800">
                    {s.display.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Expanded: ledger rows */}
                {isExpanded && (
                  <div className="bg-gray-50/50 border-t border-gray-100 pb-1">
                    {groupLedgers.length === 0 ? (
                      <div className="px-10 py-1 text-[10px] italic text-gray-400">
                        No ledgers with balance
                      </div>
                    ) : groupLedgers.map(l => {
                      const bal     = calculateBalance(l.id);
                      const display = isLiab ? -bal : bal;
                      return (
                        <div
                          key={l.id}
                          onClick={() => setDrillLedger(l)}
                          title="Click to view transactions"
                          className="flex justify-between px-10 py-0.5 text-[10px] text-tally-teal cursor-pointer hover:bg-tally-accent/20 group"
                        >
                          <span className="italic group-hover:underline group-hover:font-semibold transition-all">
                            {l.name}
                          </span>
                          <span className="font-mono">
                            {display.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total row */}
        <div className="bg-tally-light px-3 py-2 flex justify-between font-black text-xs text-tally-teal border-t-2 border-tally-teal mt-auto">
          <span>TOTAL</span>
          <span className="font-mono">
            ₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  const reportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <>
      {drillLedger && (
        <LedgerDrillDown
          ledger={drillLedger}
          entries={getDrillEntries(drillLedger)}
          onClose={() => setDrillLedger(null)}
        />
      )}

      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyDownCapture={e => { if (e.key !== 'Escape') e.stopPropagation(); }}
        className="flex flex-col h-full bg-tally-bg outline-none"
      >
        {/* Top bar */}
        <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between items-center sticky top-0 z-10">
          <span>Balance Sheet</span>
          <span className="text-tally-accent text-[10px] font-normal">
            {companyName || `Branch: ${branchId}`}
          </span>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-tally-teal font-bold animate-pulse">Loading Balance Sheet…</div>
              <div className="text-[10px] text-gray-400">branchId: {branchId || 'none'}</div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-red-50 border border-red-200 rounded p-6 max-w-md text-center">
              <div className="text-red-600 font-bold text-sm mb-2">⚠ Failed to load</div>
              <div className="text-red-400 text-xs font-mono">{error}</div>
              <div className="text-gray-400 text-[10px] mt-3">
                Check that /api/ledgers?branchId={branchId} returns data.
              </div>
            </div>
          </div>
        )}

        {/* ── Main content ── */}
        {!loading && !error && (
          <div className="flex-grow overflow-auto p-4 pr-28">
            <div id="balance-sheet-report" className="max-w-5xl mx-auto bg-white tally-border tally-shadow">

              {/* Company header */}
              <div className="text-center py-3 border-b border-gray-200">
                <h1 className="text-base font-black uppercase tracking-widest text-gray-800">
                  {companyName || 'Balance Sheet'}
                </h1>
                <p className="text-[10px] font-bold text-gray-600 mt-0.5">Balance Sheet</p>
                <p className="text-[9px] text-gray-400">As at {reportDate}</p>
              </div>

              {/* Two-column table */}
              <div className="flex divide-x divide-tally-teal min-h-[400px]">

                {/* Liabilities */}
                <div className="w-1/2 flex flex-col">
                  <div className="bg-tally-light px-3 py-1 border-b border-tally-teal flex justify-between text-[10px] font-bold uppercase text-tally-teal">
                    <span>Liabilities</span>
                    <span className="font-normal text-gray-500">as at {reportDate}</span>
                  </div>
                  {renderSection('Liabilities', LIABILITY_GROUPS)}
                </div>

                {/* Assets */}
                <div className="w-1/2 flex flex-col">
                  <div className="bg-tally-light px-3 py-1 border-b border-tally-teal flex justify-between text-[10px] font-bold uppercase text-tally-teal">
                    <span>Assets</span>
                    <span className="font-normal text-gray-500">as at {reportDate}</span>
                  </div>
                  {renderSection('Assets', ASSET_GROUPS)}
                </div>
              </div>

              {/* Hint bar */}
              <div className="bg-gray-50 border-t border-gray-100 px-3 py-1 flex gap-4 flex-wrap text-[9px] text-gray-400">
                <span>▸/▾ Click group to expand</span>
                <span>Click ledger to view transactions</span>
                <span>F1 Condense · Alt+P Print · Alt+E Export · ESC Back</span>
              </div>
            </div>
          </div>
        )}

        {/* Right hotkey panel */}
        <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white z-20">
          {[
            { label: 'F1: Condensed', fn: () => setExpandedGroups([]) },
            { label: 'F2: Period',    fn: () => {} },
            { label: 'F3: Company',   fn: () => {} },
            { label: 'Alt+P: Print',  fn: () => printReport('balance-sheet-report') },
            { label: 'Alt+E: Export', fn: handleExport },
            { label: 'F12: Config',   fn: () => {} },
            { label: 'ESC: Back',     fn: () => onBack?.() },
          ].map(btn => (
            <div key={btn.label} onClick={btn.fn}
              className="h-10 bg-tally-hotkey flex items-center px-2 cursor-pointer hover:bg-tally-accent hover:text-black select-none">
              {btn.label}
            </div>
          ))}
        </div>
      </div>

      {/* Debug panel */}
      {showDebug && (
        <DebugPanel ledgers={ledgers} vouchers={vouchers} groups={groups} branchId={branchId} />
      )}
    </>
  );
}
