import React, { useState, useEffect, useCallback, useRef } from 'react';
import { exportToExcel, printReport } from '../lib/ReportUtils';

// ─── Types matching exact server.ts DB schema ─────────────────────────────────
interface Ledger {
  id: string;
  name: string;
  group_name?: string; // from DB
  group?: string;      // alias added by server: l.group = l.group_name
  openingBalance?: number;
  balanceType?: 'Dr' | 'Cr';
  branchId?: string;
}
interface VoucherEntry {
  ledgerId: string;
  amount: number;
  type: 'Dr' | 'Cr';
  ledger_name?: string; // joined by server
}
interface Voucher {
  id: string;
  date?: string;
  type?: string;       // server field is "type" not "voucherType"
  voucherType?: string;
  narration?: string;
  entries: VoucherEntry[];
}
interface Group {
  id: string;
  name: string;
  parent_group?: string;
  branchId?: string;
}
interface DrillEntry {
  date: string;
  voucherType: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}

// ─── Debug Panel (remove in production) ──────────────────────────────────────
function DebugPanel({ ledgers, vouchers, groups }: { ledgers: Ledger[]; vouchers: Voucher[]; groups: Group[] }) {
  const [open, setOpen] = useState(false);
  if (!open) return (
    <div className="fixed bottom-2 left-2 z-50">
      <button onClick={() => setOpen(true)} className="bg-red-500 text-white text-[9px] px-2 py-1 rounded shadow">
        DEBUG
      </button>
    </div>
  );
  const groupNames = [...new Set(ledgers.map(l => l.group_name || l.group || 'NONE'))];
  return (
    <div className="fixed bottom-2 left-2 z-50 bg-white border-2 border-red-500 p-3 text-[9px] max-w-xs max-h-64 overflow-auto shadow-xl">
      <div className="flex justify-between mb-2">
        <span className="font-bold text-red-500">DEBUG</span>
        <button onClick={() => setOpen(false)} className="text-gray-400">✕</button>
      </div>
      <div><b>Ledgers:</b> {ledgers.length}</div>
      <div><b>Vouchers:</b> {vouchers.length}</div>
      <div><b>Groups:</b> {groups.length}</div>
      <div className="mt-1"><b>Ledger group_names found:</b></div>
      {groupNames.map(g => (
        <div key={g} className="text-gray-600 pl-2">
          "{g}" → {ledgers.filter(l => (l.group_name || l.group) === g).length} ledgers
        </div>
      ))}
      <div className="mt-1"><b>account_groups names:</b></div>
      {groups.map(g => <div key={g.id} className="text-gray-600 pl-2">"{g.name}"</div>)}
      <div className="mt-1"><b>Sample voucher entries:</b></div>
      {vouchers.slice(0, 2).map(v => (
        <div key={v.id} className="text-gray-600 pl-2">
          {v.id}: {v.entries?.length ?? 0} entries, type="{v.type}"
        </div>
      ))}
    </div>
  );
}

// ─── Drill-Down Modal ─────────────────────────────────────────────────────────
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

  let runBal = Number(ledger.openingBalance || 0);
  if (ledger.balanceType === 'Cr') runBal = -runBal;

  const totalDebit = entries.reduce((a, e) => a + e.debit, 0);
  const totalCredit = entries.reduce((a, e) => a + e.credit, 0);
  const finalBal = runBal + totalDebit - totalCredit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        ref={ref} tabIndex={-1}
        className="bg-white w-[820px] max-h-[85vh] flex flex-col shadow-2xl border-2 border-tally-teal outline-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-tally-sidebar text-white px-4 py-2 flex justify-between items-center text-xs font-bold uppercase">
          <span>Ledger Transactions — {ledger.name}</span>
          <span className="text-tally-accent text-[10px]">ESC to close</span>
        </div>
        {/* Column headers */}
        <div className="grid grid-cols-[110px_120px_1fr_90px_90px_110px] bg-tally-light px-3 py-1 text-[10px] font-bold uppercase border-b border-tally-teal text-tally-teal">
          <span>Date</span><span>Type</span><span>Narration</span>
          <span className="text-right">Debit</span><span className="text-right">Credit</span>
          <span className="text-right">Balance</span>
        </div>
        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {/* Opening Balance row */}
          <div className="grid grid-cols-[110px_120px_1fr_90px_90px_110px] px-3 py-1 text-[10px] bg-yellow-50 border-b border-yellow-200 font-semibold">
            <span className="text-gray-500">—</span>
            <span>Opening Balance</span>
            <span className="italic text-gray-400">—</span>
            <span className="text-right font-mono">{runBal > 0 ? runBal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</span>
            <span className="text-right font-mono">{runBal < 0 ? Math.abs(runBal).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</span>
            <span className="text-right font-mono text-tally-teal">
              {Math.abs(runBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {runBal >= 0 ? 'Dr' : 'Cr'}
            </span>
          </div>
          {entries.length === 0 ? (
            <div className="text-center py-10 text-[11px] text-gray-400 italic">
              No transactions found for this ledger in this period.
            </div>
          ) : entries.map((e, i) => {
            runBal += e.debit - e.credit;
            return (
              <div key={i}
                className={`grid grid-cols-[110px_120px_1fr_90px_90px_110px] px-3 py-0.5 text-[10px] border-b border-gray-50 hover:bg-tally-accent/10 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}
              >
                <span className="text-gray-600">{e.date}</span>
                <span className="text-gray-700 font-medium truncate">{e.voucherType}</span>
                <span className="text-gray-500 truncate">{e.narration || '—'}</span>
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
        {/* Footer totals */}
        <div className="grid grid-cols-[110px_120px_1fr_90px_90px_110px] px-3 py-1.5 text-[10px] font-black bg-tally-light border-t-2 border-tally-teal text-tally-teal">
          <span className="col-span-3 uppercase">Total</span>
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
export default function BalanceSheetScreen({ branchId, onBack }: { branchId?: string; onBack?: () => void }) {
  const [ledgers, setLedgers]   = useState<Ledger[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [groups, setGroups]     = useState<Group[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState('BERITHSYSTEMS');
  const [drillLedger, setDrillLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Data fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = branchId ? `?branchId=${branchId}` : '';
        const [l, v, g, b] = await Promise.all([
          fetch(`/api/ledgers${query}`).then(r => r.json()),
          fetch(`/api/vouchers${query}`).then(r => r.json()),
          fetch(`/api/account-groups${query}`).then(r => r.json()),
          fetch(`/api/branches`).then(r => r.json()),
        ]);

        console.log('[BalanceSheet] ledgers:', Array.isArray(l) ? l.length : l);
        console.log('[BalanceSheet] vouchers:', Array.isArray(v) ? v.length : v);
        console.log('[BalanceSheet] groups:', Array.isArray(g) ? g.length : g);
        if (Array.isArray(l) && l.length > 0) console.log('[BalanceSheet] sample ledger:', l[0]);
        if (Array.isArray(v) && v.length > 0) console.log('[BalanceSheet] sample voucher:', v[0]);

        setLedgers(Array.isArray(l) ? l : []);
        setVouchers(Array.isArray(v) ? v : []);
        setGroups(Array.isArray(g) ? g : []);

        if (branchId && Array.isArray(b)) {
          const br = b.find((c: any) => c.id === branchId);
          if (br) setCompanyName(br.name);
        }
      } catch (err: any) {
        console.error('[BalanceSheet] Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [branchId]);

  // Focus container so key events are captured here
  useEffect(() => { containerRef.current?.focus(); }, [loading]);

  // ── Balance calculation ──────────────────────────────────────────────────
  // Server returns entries with: ledgerId, amount, type ('Dr'|'Cr')
  const calculateBalance = useCallback((ledgerId: string): number => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return 0;

    // Opening balance: Dr = positive, Cr = negative
    const ob = Number(ledger.openingBalance || 0);
    let balance = ledger.balanceType === 'Cr' ? -ob : ob;

    for (const v of vouchers) {
      if (!Array.isArray(v.entries)) continue;
      for (const e of v.entries) {
        if (e.ledgerId !== ledgerId) continue;
        const amt = Number(e.amount || 0);
        balance += e.type === 'Dr' ? amt : -amt;
      }
    }
    return balance; // positive = Dr, negative = Cr
  }, [ledgers, vouchers]);

  // ── Group total (recursive for sub-groups) ───────────────────────────────
  const getGroupTotal = useCallback((groupName: string): number => {
    // Match ledger by group_name OR group (alias)
    const groupLedgers = ledgers.filter(l =>
      (l.group_name && l.group_name === groupName) ||
      (l.group && l.group === groupName)
    );
    let total = groupLedgers.reduce((acc, l) => acc + calculateBalance(l.id), 0);

    // Recurse into sub-groups
    const subGroups = groups.filter(g => g.parent_group === groupName);
    for (const sg of subGroups) total += getGroupTotal(sg.name);

    return total;
  }, [ledgers, groups, calculateBalance]);

  // ── Drill-down entries for a ledger ──────────────────────────────────────
  const getDrillEntries = useCallback((ledger: Ledger): DrillEntry[] => {
    const result: DrillEntry[] = [];
    let running = Number(ledger.openingBalance || 0);
    if (ledger.balanceType === 'Cr') running = -running;

    const relevant = vouchers
      .filter(v => Array.isArray(v.entries) && v.entries.some(e => e.ledgerId === ledger.id))
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

    for (const v of relevant) {
      for (const e of v.entries) {
        if (e.ledgerId !== ledger.id) continue;
        const amt = Number(e.amount || 0);
        const debit  = e.type === 'Dr' ? amt : 0;
        const credit = e.type === 'Cr' ? amt : 0;
        running += debit - credit;
        result.push({
          date: v.date ? new Date(v.date).toLocaleDateString('en-IN') : '—',
          voucherType: v.type || v.voucherType || 'Journal',
          narration: v.narration || '',
          debit, credit, balance: running,
        });
      }
    }
    return result;
  }, [vouchers]);

  const handleExport = useCallback(() => {
    const data = [
      { Category: 'Liabilities', Group: 'Capital Account',      Amount: getGroupTotal('Capital Account') },
      { Category: 'Liabilities', Group: 'Loans (Liability)',    Amount: getGroupTotal('Loans (Liability)') },
      { Category: 'Liabilities', Group: 'Current Liabilities',  Amount: getGroupTotal('Current Liabilities') },
      { Category: 'Assets',      Group: 'Fixed Assets',         Amount: getGroupTotal('Fixed Assets') },
      { Category: 'Assets',      Group: 'Investments',          Amount: getGroupTotal('Investments') },
      { Category: 'Assets',      Group: 'Current Assets',       Amount: getGroupTotal('Current Assets') },
    ];
    exportToExcel(data, 'Balance_Sheet');
  }, [getGroupTotal]);

  // ── Keyboard handler — scoped to this screen ─────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { onBack?.(); return; } // let ESC bubble for routing
    // Block ALL other keys from reaching parent app
    e.stopPropagation();
    e.preventDefault();
    if (e.altKey) {
      if (e.key.toUpperCase() === 'P') printReport('balance-sheet-report');
      if (e.key.toUpperCase() === 'E') handleExport();
    }
    if (e.key === 'F1') setExpandedGroups([]);
    if (e.key === 'F12') alert('F12 Configure: Coming soon');
  }, [onBack, handleExport]);

  const toggleGroup = (name: string) =>
    setExpandedGroups(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]);

  // ── Render one side (Liabilities or Assets) ──────────────────────────────
  const renderSection = (title: string, groupNames: string[]) => {
    const isLiab = title === 'Liabilities';

    // For liabilities: Cr balances (negative numbers) are positive display
    const sections = groupNames
      .map(name => {
        const raw = getGroupTotal(name);
        const display = isLiab ? -raw : raw;
        return { name, display };
      })
      .filter(s => Math.abs(s.display) >= 0.01); // hide zero groups

    const total = sections.reduce((acc, s) => acc + s.display, 0);

    if (sections.length === 0) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10px] text-gray-400 italic">No balances to display</span>
          </div>
          <div className="bg-tally-light p-2 flex justify-between font-black text-xs text-tally-teal border-t-2 border-tally-teal">
            <span>TOTAL</span><span className="font-mono">₹ 0.00</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-[300px]">
          {sections.map(s => {
            const isExpanded = expandedGroups.includes(s.name);

            // Ledgers in this group with non-zero balance
            const groupLedgers = ledgers.filter(l => {
              const inGroup = (l.group_name === s.name) || (l.group === s.name);
              if (!inGroup) return false;
              const bal = calculateBalance(l.id);
              const display = isLiab ? -bal : bal;
              return Math.abs(display) >= 0.01;
            });

            return (
              <div key={s.name} className="border-b border-gray-100 last:border-0">
                {/* Group row */}
                <div
                  onClick={() => toggleGroup(s.name)}
                  className="flex justify-between items-center py-1.5 px-2 hover:bg-tally-accent/10 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-gray-400 w-3">{isExpanded ? '▾' : '▸'}</span>
                    <span className="text-[11px] font-bold uppercase text-gray-700">{s.name}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold">
                    {s.display.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Expanded ledgers */}
                {isExpanded && (
                  <div className="bg-gray-50/60 pb-1">
                    {groupLedgers.length === 0 ? (
                      <div className="px-8 py-1 text-[10px] italic text-gray-400">No ledgers with balance</div>
                    ) : groupLedgers.map(l => {
                      const bal = calculateBalance(l.id);
                      const display = isLiab ? -bal : bal;
                      return (
                        <div
                          key={l.id}
                          onClick={() => setDrillLedger(l)}
                          title="Click to view transactions"
                          className="flex justify-between px-8 py-0.5 text-[10px] text-tally-teal cursor-pointer hover:bg-tally-accent/20 italic group"
                        >
                          <span className="group-hover:underline group-hover:font-semibold">{l.name}</span>
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
        <div className="bg-tally-light p-2 flex justify-between font-black text-xs text-tally-teal border-t-2 border-tally-teal">
          <span>TOTAL</span>
          <span className="font-mono">₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  };

  // ── Hotkey sidebar ───────────────────────────────────────────────────────
  const hotkeys = [
    { label: 'F1: Condensed', action: () => setExpandedGroups([]) },
    { label: 'F2: Period',    action: () => {} },
    { label: 'F3: Company',   action: () => {} },
    { label: 'Alt+P: Print',  action: () => printReport('balance-sheet-report') },
    { label: 'Alt+E: Export', action: handleExport },
    { label: 'F12: Config',   action: () => {} },
    { label: 'ESC: Back',     action: () => onBack?.() },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Drill-down modal */}
      {drillLedger && (
        <LedgerDrillDown
          ledger={drillLedger}
          entries={getDrillEntries(drillLedger)}
          onClose={() => setDrillLedger(null)}
        />
      )}

      {/* Screen — keyboard captured here */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyDownCapture={e => { if (e.key !== 'Escape') e.stopPropagation(); }}
        className="flex flex-col h-full bg-tally-bg outline-none"
      >
        {/* Top bar */}
        <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between sticky top-0 z-10">
          <span>Balance Sheet</span>
          <span className="text-tally-accent">{companyName}</span>
        </div>

        {/* Loading / Error states */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-tally-teal text-sm font-bold animate-pulse">Loading Balance Sheet...</div>
              <div className="text-xs text-gray-400 mt-1">Fetching ledgers and vouchers</div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-red-50 border border-red-200 p-6 max-w-md text-center">
              <div className="text-red-600 font-bold text-sm mb-2">Failed to load Balance Sheet</div>
              <div className="text-red-400 text-xs">{error}</div>
              <div className="text-gray-400 text-xs mt-2">Check your API connection and try again.</div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="flex-grow p-4 overflow-auto">
            <div id="balance-sheet-report" className="max-w-6xl mx-auto bg-white tally-border tally-shadow">
              {/* Company title */}
              <div className="text-center py-4 border-b border-gray-200">
                <h1 className="text-lg font-bold uppercase">{companyName}</h1>
                <p className="text-xs font-bold">Balance Sheet</p>
                <p className="text-[10px] text-gray-500">As at {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>

              {/* Two-column layout */}
              <div className="flex divide-x divide-tally-teal">
                {/* Liabilities */}
                <div className="w-1/2 flex flex-col">
                  <div className="bg-tally-light px-4 py-1 border-b border-tally-teal flex justify-between font-bold text-xs uppercase">
                    <span>Liabilities</span>
                    <span className="text-[10px] font-normal text-gray-500">as at today</span>
                  </div>
                  <div className="flex-grow p-2">
                    {renderSection('Liabilities', [
                      'Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Suspense Account'
                    ])}
                  </div>
                </div>

                {/* Assets */}
                <div className="w-1/2 flex flex-col">
                  <div className="bg-tally-light px-4 py-1 border-b border-tally-teal flex justify-between font-bold text-xs uppercase">
                    <span>Assets</span>
                    <span className="text-[10px] font-normal text-gray-500">as at today</span>
                  </div>
                  <div className="flex-grow p-2">
                    {renderSection('Assets', [
                      'Fixed Assets', 'Investments', 'Current Assets'
                    ])}
                  </div>
                </div>
              </div>

              {/* Shortcut hint bar */}
              <div className="bg-gray-50 border-t border-gray-100 px-3 py-1 flex gap-4 flex-wrap text-[9px] text-gray-400">
                <span>▸ Click group to expand/collapse</span>
                <span>Click ledger name to view transactions</span>
                <span>F1 Condense · Alt+P Print · Alt+E Export · ESC Back</span>
              </div>
            </div>
          </div>
        )}

        {/* Right-side hotkey panel */}
        <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white z-20">
          {hotkeys.map(btn => (
            <div
              key={btn.label}
              onClick={btn.action}
              className="h-10 bg-tally-hotkey flex items-center px-2 cursor-pointer hover:bg-tally-accent hover:text-black select-none"
            >
              {btn.label}
            </div>
          ))}
        </div>
      </div>

      {/* Debug panel — remove after confirming data loads correctly */}
      <DebugPanel ledgers={ledgers} vouchers={vouchers} groups={groups} />
    </>
  );
}
