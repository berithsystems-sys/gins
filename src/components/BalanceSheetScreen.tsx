import React, { useState, useEffect, useCallback, useRef } from 'react';
import { exportToExcel, printReport } from '../lib/ReportUtils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Ledger { id: string; name: string; group_name?: string; group?: string; openingBalance?: number; }
interface Entry { ledgerId: string; amount: number; type: 'Dr' | 'Cr'; }
interface Voucher { id: string; date?: string; voucherType?: string; narration?: string; entries: Entry[]; }
interface Group { name: string; parent_group?: string; }

interface DrillEntry {
  date: string;
  voucherType: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}

// ─── Drill-Down Modal ─────────────────────────────────────────────────────────
function LedgerDrillDown({
  ledger, entries, onClose
}: { ledger: Ledger; entries: DrillEntry[]; onClose: () => void }) {
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

  let running = 0;
  const rows = [
    { date: '—', voucherType: 'Opening Balance', narration: '', debit: 0, credit: 0, isOpening: true, balance: Number(ledger.openingBalance || 0) },
    ...entries.map(e => {
      running += e.debit - e.credit;
      return { ...e, isOpening: false };
    })
  ];

  let runBal = Number(ledger.openingBalance || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="bg-white w-[800px] max-h-[85vh] flex flex-col shadow-2xl border-2 border-tally-teal outline-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-tally-sidebar text-white px-4 py-2 flex justify-between items-center text-xs font-bold uppercase">
          <span>Trial Balance — {ledger.name}</span>
          <span className="text-tally-accent">ESC to close</span>
        </div>
        {/* Column headers */}
        <div className="grid grid-cols-[120px_130px_1fr_90px_90px_100px] bg-tally-light px-3 py-1 text-[10px] font-bold uppercase border-b border-tally-teal text-tally-teal">
          <span>Date</span>
          <span>Type</span>
          <span>Narration</span>
          <span className="text-right">Debit</span>
          <span className="text-right">Credit</span>
          <span className="text-right">Balance</span>
        </div>
        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {/* Opening */}
          <div className="grid grid-cols-[120px_130px_1fr_90px_90px_100px] px-3 py-1 text-[10px] bg-yellow-50 border-b border-yellow-200 font-semibold">
            <span>—</span>
            <span>Opening Balance</span>
            <span className="italic text-gray-500">—</span>
            <span className="text-right font-mono">
              {runBal >= 0 ? runBal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </span>
            <span className="text-right font-mono">
              {runBal < 0 ? Math.abs(runBal).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </span>
            <span className="text-right font-mono text-tally-teal">
              {Math.abs(runBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {runBal >= 0 ? 'Dr' : 'Cr'}
            </span>
          </div>
          {entries.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400 italic">No transactions found for this ledger.</div>
          )}
          {entries.map((e, i) => {
            runBal += e.debit - e.credit;
            return (
              <div
                key={i}
                className={`grid grid-cols-[120px_130px_1fr_90px_90px_100px] px-3 py-0.5 text-[10px] border-b border-gray-50 hover:bg-tally-accent/10 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}
              >
                <span className="text-gray-600">{e.date}</span>
                <span className="text-gray-700 font-medium">{e.voucherType}</span>
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
        <div className="grid grid-cols-[120px_130px_1fr_90px_90px_100px] px-3 py-1.5 text-[10px] font-black bg-tally-light border-t-2 border-tally-teal text-tally-teal">
          <span className="col-span-3">TOTAL</span>
          <span className="text-right font-mono">
            {entries.reduce((a, e) => a + e.debit, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-right font-mono">
            {entries.reduce((a, e) => a + e.credit, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-right font-mono">
            {Math.abs(runBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {runBal >= 0 ? 'Dr' : 'Cr'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BalanceSheetScreen({ branchId, onBack }: { branchId?: string; onBack?: () => void }) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState('BERITHSYSTEMS');
  const [drillLedger, setDrillLedger] = useState<Ledger | null>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Data fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = branchId ? `?branchId=${branchId}` : '';
        const [l, v, g, b] = await Promise.all([
          fetch(`/api/ledgers${query}`).then(r => r.json()),
          fetch(`/api/vouchers${query}`).then(r => r.json()),
          fetch(`/api/account-groups${query}`).then(r => r.json()),
          fetch(`/api/branches`).then(r => r.json()),
        ]);
        setLedgers(Array.isArray(l) ? l : []);
        setVouchers(Array.isArray(v) ? v : []);
        setGroups(Array.isArray(g) ? g : []);
        if (branchId && Array.isArray(b)) {
          const br = b.find((c: any) => c.id === branchId);
          if (br) setCompanyName(br.name);
        }
      } catch (err) {
        console.error('Balance Sheet Fetch Error:', err);
      }
    };
    fetchData();
  }, [branchId]);

  // ── Focus container so keydown events are captured here ─────────────────
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // ── Keyboard shortcut handler — captured at this level, not bubbling up ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Always let ESC bubble so parent can handle "go back"
    if (e.key === 'Escape') {
      onBack?.();
      return; // do NOT stopPropagation for ESC
    }

    // Capture everything else so parent app shortcuts don't fire
    e.stopPropagation();
    e.preventDefault();

    const alt = e.altKey;
    const key = e.key.toUpperCase();

    if (alt && key === 'P') printReport('balance-sheet-report');
    if (alt && key === 'E') handleExport();
    if (alt && key === 'N') alert('Auto Column: Coming soon');
    if (e.key === 'F2') setShowPeriodModal(true);
    if (e.key === 'F12') alert('F12 Configure: Coming soon');
    if (e.key === 'F1') {
      // Toggle condensed: collapse all groups
      setExpandedGroups([]);
    }
  }, [onBack]);

  // ── Balance calculations ─────────────────────────────────────────────────
  const calculateBalance = useCallback((ledgerId: string): number => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return 0;
    let balance = Number(ledger.openingBalance || 0);
    vouchers.forEach(v => {
      (v.entries || []).forEach((e: Entry) => {
        if (e.ledgerId === ledgerId) {
          const amt = Number(e.amount || 0);
          balance += e.type === 'Dr' ? amt : -amt;
        }
      });
    });
    return balance;
  }, [ledgers, vouchers]);

  const getGroupTotal = useCallback((groupName: string): number => {
    const relevantLedgers = ledgers.filter(l => l.group_name === groupName || l.group === groupName);
    let total = relevantLedgers.reduce((acc, l) => acc + calculateBalance(l.id), 0);
    const subGroups = groups.filter(g => g.parent_group === groupName);
    subGroups.forEach(sg => { total += getGroupTotal(sg.name); });
    return total;
  }, [ledgers, groups, calculateBalance]);

  // ── Drill-down: build trial balance entries for a ledger ─────────────────
  const getDrillEntries = (ledger: Ledger): DrillEntry[] => {
    const entries: DrillEntry[] = [];
    let running = Number(ledger.openingBalance || 0);
    vouchers
      .filter(v => (v.entries || []).some(e => e.ledgerId === ledger.id))
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
      .forEach(v => {
        v.entries.forEach((e: Entry) => {
          if (e.ledgerId !== ledger.id) return;
          const amt = Number(e.amount || 0);
          const debit = e.type === 'Dr' ? amt : 0;
          const credit = e.type === 'Cr' ? amt : 0;
          running += debit - credit;
          entries.push({
            date: v.date ? new Date(v.date).toLocaleDateString('en-IN') : '—',
            voucherType: v.voucherType || 'Journal',
            narration: v.narration || '',
            debit,
            credit,
            balance: running,
          });
        });
      });
    return entries;
  };

  const handleExport = () => {
    const data = [
      { Category: 'Liabilities', Group: 'Capital Account', Amount: getGroupTotal('Capital Account') },
      { Category: 'Liabilities', Group: 'Loans (Liability)', Amount: getGroupTotal('Loans (Liability)') },
      { Category: 'Liabilities', Group: 'Current Liabilities', Amount: getGroupTotal('Current Liabilities') },
      { Category: 'Assets', Group: 'Fixed Assets', Amount: getGroupTotal('Fixed Assets') },
      { Category: 'Assets', Group: 'Investments', Amount: getGroupTotal('Investments') },
      { Category: 'Assets', Group: 'Current Assets', Amount: getGroupTotal('Current Assets') },
    ];
    exportToExcel(data, 'Balance_Sheet');
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]
    );
  };

  // ── Render a Liabilities or Assets section ───────────────────────────────
  const renderSection = (title: string, groupNames: string[]) => {
    const isLiabilities = title === 'Liabilities';
    const sections = groupNames.map(name => ({
      name,
      rawBalance: getGroupTotal(name),
      displayBalance: isLiabilities ? -getGroupTotal(name) : getGroupTotal(name),
    }));

    // Hide groups with zero total
    const nonZeroSections = sections.filter(s => Math.abs(s.displayBalance) >= 0.01);
    const total = nonZeroSections.reduce((acc, s) => acc + s.displayBalance, 0);

    return (
      <div className="flex flex-col w-full h-full">
        <div className="flex-1 min-h-[300px]">
          {nonZeroSections.length === 0 && (
            <div className="text-center py-8 text-[10px] text-gray-400 italic">No data</div>
          )}
          {nonZeroSections.map(s => {
            const isExpanded = expandedGroups.includes(s.name);
            // Ledgers in this group with non-zero balance
            const groupLedgers = ledgers.filter(l => {
              const inGroup = l.group_name === s.name || l.group === s.name;
              if (!inGroup) return false;
              const bal = calculateBalance(l.id);
              const display = isLiabilities ? -bal : bal;
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
                    <span className="text-[9px] font-bold text-gray-400 w-3">
                      {isExpanded ? '▾' : '▸'}
                    </span>
                    <span className="text-[11px] font-bold uppercase text-gray-700">{s.name}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold">
                    {Math.abs(s.displayBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Expanded ledgers */}
                {isExpanded && (
                  <div className="bg-gray-50/60 pb-1">
                    {groupLedgers.length === 0 && (
                      <div className="px-8 py-1 text-[10px] italic text-gray-400">No ledgers with balance</div>
                    )}
                    {groupLedgers.map(l => {
                      const bal = calculateBalance(l.id);
                      const displayBal = isLiabilities ? -bal : bal;
                      return (
                        <div
                          key={l.id}
                          onClick={() => setDrillLedger(l)}
                          className="flex justify-between px-8 py-0.5 text-[10px] text-tally-teal cursor-pointer hover:bg-tally-accent/20 hover:underline italic group"
                          title="Click to view trial balance"
                        >
                          <span className="group-hover:font-semibold transition-all">{l.name}</span>
                          <span className="font-mono">
                            {Math.abs(displayBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
          <span className="font-mono">₹ {Math.abs(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  };

  // ── Hotkey buttons ───────────────────────────────────────────────────────
  const hotkeys = [
    { label: 'F1: Condensed', action: () => setExpandedGroups([]) },
    { label: 'F2: Period', action: () => setShowPeriodModal(true) },
    { label: 'F3: Company', action: () => {} },
    { label: 'Alt+P: Print', action: () => printReport('balance-sheet-report') },
    { label: 'Alt+E: Export', action: handleExport },
    { label: 'F12: Configure', action: () => {} },
    { label: 'ESC: Back', action: () => onBack?.() },
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

      {/* Period modal placeholder */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border-2 border-tally-teal p-6 w-80 shadow-xl text-xs">
            <div className="font-bold mb-3 text-tally-teal uppercase">Change Period</div>
            <div className="text-gray-600 mb-4">Period selection UI goes here.</div>
            <button
              onClick={() => setShowPeriodModal(false)}
              className="bg-tally-teal text-white px-4 py-1 text-xs font-bold hover:bg-tally-sidebar"
            >
              Close (ESC)
            </button>
          </div>
        </div>
      )}

      {/* Main screen — captures keyboard here, NOT on window */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex flex-col h-full bg-tally-bg outline-none"
        // Intercept all keyboard events so parent shortcuts don't fire when BS is open
        onKeyDownCapture={e => {
          if (e.key !== 'Escape') {
            e.stopPropagation();
          }
        }}
      >
        {/* Top bar */}
        <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between sticky top-0 z-10">
          <span>Balance Sheet</span>
          <span className="text-tally-accent">{companyName}</span>
        </div>

        <div className="flex-grow p-4 overflow-auto">
          <div id="balance-sheet-report" className="max-w-6xl mx-auto bg-white tally-border tally-shadow">
            {/* Company title */}
            <div className="text-center py-4 border-b border-gray-200">
              <h1 className="text-lg font-bold uppercase">{companyName}</h1>
              <p className="text-xs font-bold">Balance Sheet</p>
              <p className="text-[10px]">1-Apr-26 to 31-Mar-27</p>
            </div>

            {/* Two columns */}
            <div className="flex divide-x divide-tally-teal border-b border-tally-teal">
              {/* Liabilities */}
              <div className="w-1/2 flex flex-col">
                <div className="bg-tally-light px-4 py-1 border-b border-tally-teal flex justify-between font-bold text-xs uppercase">
                  <span>Liabilities</span>
                  <span>as at 31-Mar-27</span>
                </div>
                <div className="flex-grow p-2">
                  {renderSection('Liabilities', ['Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Suspense Account'])}
                </div>
              </div>

              {/* Assets */}
              <div className="w-1/2 flex flex-col">
                <div className="bg-tally-light px-4 py-1 border-b border-tally-teal flex justify-between font-bold text-xs uppercase">
                  <span>Assets</span>
                  <span>as at 31-Mar-27</span>
                </div>
                <div className="flex-grow p-2">
                  {renderSection('Assets', ['Fixed Assets', 'Investments', 'Current Assets'])}
                </div>
              </div>
            </div>

            {/* Shortcut hint bar */}
            <div className="bg-gray-100 border-t border-gray-200 px-3 py-1 flex gap-4 flex-wrap text-[9px] text-gray-500">
              <span><kbd className="bg-white border border-gray-300 px-1 rounded">▸</kbd> Click group to expand</span>
              <span><kbd className="bg-white border border-gray-300 px-1 rounded">Ledger name</kbd> Click to view trial balance</span>
              <span><kbd className="bg-white border border-gray-300 px-1 rounded">F1</kbd> Condense all</span>
              <span><kbd className="bg-white border border-gray-300 px-1 rounded">Alt+P</kbd> Print</span>
              <span><kbd className="bg-white border border-gray-300 px-1 rounded">Alt+E</kbd> Export</span>
              <span><kbd className="bg-white border border-gray-300 px-1 rounded">ESC</kbd> Back</span>
            </div>
          </div>
        </div>

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
    </>
  );
}
