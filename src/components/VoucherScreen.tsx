/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TallyPrime-style Voucher Entry Screen
 * - Fully keyboard driven (no mouse required)
 * - Shows real current balance when ledger is selected
 * - Enter/Tab flow like TallyPrime
 * - F4-F9 voucher type switching
 * - Ctrl+Enter to save, Alt+A to add line
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Ledger {
  id: string;
  name: string;
  openingBalance?: number;
  balanceType?: string;
}

interface CostCentre {
  id: string;
  name: string;
}

interface Entry {
  ledgerId: string;
  costCentreId: string;
  amount: string;
  type: 'Dr' | 'Cr';
  tempSearch: string;
  methodAdjustment: string;
  refNo: string;
}

const DEFAULT_ENTRY: Entry = {
  ledgerId: '',
  costCentreId: '',
  amount: '',
  type: 'Dr',
  tempSearch: '',
  methodAdjustment: 'On Account',
  refNo: '',
};

type VoucherType = 'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase';

const VOUCHER_COLORS: Record<VoucherType, string> = {
  Contra: '#006b6b',
  Payment: '#7a0000',
  Receipt: '#006b00',
  Journal: '#5a4a00',
  Sales: '#00006b',
  Purchase: '#5a0060',
};

export default function VoucherScreen({
  branchId,
  onTypeChange,
  initialType,
  initialDate,
  user,
}: {
  branchId?: string;
  onTypeChange?: (type: string) => void;
  initialType?: string;
  initialDate?: string;
  user?: any;
}) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [costCentres, setCostCentres] = useState<CostCentre[]>([]);
  const [type, setType] = useState<VoucherType>((initialType as VoucherType) || 'Payment');
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState<Entry[]>([{ ...DEFAULT_ENTRY }]);
  const [accountLedgerId, setAccountLedgerId] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [ledgerBalances, setLedgerBalances] = useState<Record<string, number>>({});
  const [currentBalances, setCurrentBalances] = useState<Record<string, { balance: number; type: 'Dr' | 'Cr' } | null>>({});
  const [loadingBalance, setLoadingBalance] = useState<Record<string, boolean>>({});
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({ useDrCr: false, singleEntry: false, showBillWise: false });
  const [voucherNo, setVoucherNo] = useState(`VCH-${Date.now().toString().slice(-6)}`);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'ok' | 'err' | 'info' } | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const narrationRef = useRef<HTMLTextAreaElement>(null);
  const accountRef = useRef<HTMLInputElement>(null);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  const getDrLabel = () => (config.useDrCr ? 'Dr' : 'By');
  const getCrLabel = () => (config.useDrCr ? 'Cr' : 'To');

  // ── Fetch ledgers & cost-centres ──────────────────────────────────────
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`api/ledgers${q}`)
      .then((r) => r.json())
      .then((data) => {
        setLedgers(data);
        const bal: Record<string, number> = {};
        data.forEach((l: any) => {
          bal[l.id] = (l.openingBalance || 0) * (l.balanceType === 'Cr' ? -1 : 1);
        });
        setLedgerBalances(bal);
      });
    fetch(`api/cost-centres${q}`).then((r) => r.json()).then(setCostCentres);
  }, [branchId]);

  // ── Fetch CURRENT balance for a ledger ────────────────────────────────
  // Computes: opening balance ± all voucher entries for this ledger
  const fetchCurrentBalance = useCallback(
    async (ledgerId: string) => {
      if (!ledgerId || currentBalances[ledgerId] !== undefined) return;
      setLoadingBalance((p) => ({ ...p, [ledgerId]: true }));
      try {
        const q = branchId ? `?branchId=${branchId}` : '';

        // Try dedicated balance endpoint first (if you've added it to server.ts)
        const res = await fetch(`/api/ledgers/${ledgerId}/balance${q}`);
        if (res.ok) {
          const data = await res.json();
          // Endpoint returns { balance, type } — normalise
          if (typeof data.balance === 'number' && data.type) {
            setCurrentBalances((p) => ({ ...p, [ledgerId]: { balance: data.balance, type: data.type } }));
            return;
          }
        }

        // ── Fallback: compute from voucher entries via existing endpoint ──
        const vRes = await fetch(`/api/vouchers/ledger/${ledgerId}${q}`);
        const ledger = ledgers.find((l) => l.id === ledgerId);
        const ob = Number(ledger?.openingBalance || 0);
        const obType = ledger?.balanceType === 'Cr' ? -1 : 1;
        let running = ob * obType; // Dr = positive, Cr = negative

        if (vRes.ok) {
          const vouchers: any[] = await vRes.json();
          for (const v of vouchers) {
            const amt = Number(v.entry_amount || 0);
            running += v.entry_type === 'Dr' ? amt : -amt;
          }
        }

        setCurrentBalances((p) => ({
          ...p,
          [ledgerId]: { balance: Math.abs(running), type: running >= 0 ? 'Dr' : 'Cr' },
        }));
      } catch {
        // Last resort: use opening balance from ledger list
        const ledger = ledgers.find((l) => l.id === ledgerId);
        const ob = Number(ledger?.openingBalance || 0);
        const signed = ledger?.balanceType === 'Cr' ? -ob : ob;
        setCurrentBalances((p) => ({
          ...p,
          [ledgerId]: { balance: Math.abs(signed), type: signed >= 0 ? 'Dr' : 'Cr' },
        }));
      } finally {
        setLoadingBalance((p) => ({ ...p, [ledgerId]: false }));
      }
    },
    [branchId, currentBalances, ledgerBalances, ledgers]
  );

  useEffect(() => {
    entries.forEach((e) => { if (e.ledgerId) fetchCurrentBalance(e.ledgerId); });
  }, [entries]);

  useEffect(() => {
    if (accountLedgerId) fetchCurrentBalance(accountLedgerId);
  }, [accountLedgerId]);

  // ── Sync type from parent ─────────────────────────────────────────────
  useEffect(() => {
    if (initialType) {
      setType(initialType as VoucherType);
      setEntries((prev) => {
        const e = { ...prev[0] };
        if (initialType === 'Receipt') e.type = 'Cr';
        else e.type = 'Dr';
        return [e];
      });
    }
  }, [initialType]);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  // Track which row index is currently focused for Ctrl+D delete
  const [focusedRowIdx, setFocusedRowIdx] = useState<number | null>(null);

  // ── Global keyboard shortcuts ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Dismiss success popup on any key
      if (statusMsg?.type === 'ok') { setStatusMsg(null); return; }

      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSubmit(); return; }
      if (e.key === 'F12') { e.preventDefault(); setShowConfig(true); return; }
      if (e.altKey && e.key.toLowerCase() === 'a') { e.preventDefault(); handleAddEntry(); return; }
      if (e.altKey && e.key.toLowerCase() === 'r') { e.preventDefault(); handleClear(); return; }
      if (e.key === 'F2') { e.preventDefault(); dateRef.current?.focus(); dateRef.current?.select(); return; }

      // Ctrl+D — delete currently focused row
      if (e.ctrlKey && e.key.toLowerCase() === 'd' && inInput) {
        e.preventDefault();
        if (focusedRowIdx !== null && entries.length > 1) {
          const nextFocus = Math.max(0, focusedRowIdx - 1);
          setEntries((prev) => prev.filter((_, i) => i !== focusedRowIdx));
          setTimeout(() => document.getElementById(`ledger-${nextFocus}`)?.focus(), 30);
        }
        return;
      }

      if (!inInput) {
        if (e.key === 'F4') { e.preventDefault(); handleTypeChange('Contra'); }
        if (e.key === 'F5') { e.preventDefault(); handleTypeChange('Payment'); }
        if (e.key === 'F6') { e.preventDefault(); handleTypeChange('Receipt'); }
        if (e.key === 'F7') { e.preventDefault(); handleTypeChange('Journal'); }
        if (e.key === 'F8') { e.preventDefault(); handleTypeChange('Sales'); }
        if (e.key === 'F9') { e.preventDefault(); handleTypeChange('Purchase'); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [entries, date, narration, type, config, focusedRowIdx]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const getFilteredLedgers = (search: string) => {
    const s = search.toLowerCase();
    return ledgers.filter((l) => l.name.toLowerCase().includes(s));
  };

  const formatBalance = (ledgerId: string) => {
    const cb = currentBalances[ledgerId];
    if (loadingBalance[ledgerId]) return '...';
    if (!cb) return 'N/A';
    return `${cb.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${cb.type}`;
  };

  const calcTotal = (side?: 'Dr' | 'Cr') =>
    entries
      .filter((e) => !side || e.type === side)
      .reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const drTotal = calcTotal('Dr');
  const crTotal = calcTotal('Cr');
  const diff = Math.abs(drTotal - crTotal);
  const isBalanced = diff < 0.01;

  // ── Entry management ──────────────────────────────────────────────────
  const handleAddEntry = () => {
    const nextType: 'Dr' | 'Cr' = drTotal > crTotal ? 'Cr' : 'Dr';
    const nextAmt = diff > 0 ? diff.toString() : '';
    setEntries((prev) => [...prev, { ...DEFAULT_ENTRY, type: nextType, amount: nextAmt }]);
    setTimeout(() => {
      document.getElementById(`ledger-${entries.length}`)?.focus();
    }, 30);
  };

  const handleRemoveEntry = (idx: number) => {
    if (entries.length > 1) setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSelectLedger = (idx: number, ledger: Ledger) => {
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ledgerId: ledger.id, tempSearch: ledger.name };
      if (idx > 0) {
        const dr = next.slice(0, idx).filter((e) => e.type === 'Dr').reduce((a, e) => a + Number(e.amount || 0), 0);
        const cr = next.slice(0, idx).filter((e) => e.type === 'Cr').reduce((a, e) => a + Number(e.amount || 0), 0);
        next[idx].type = dr > cr ? 'Cr' : 'Dr';
      }
      return next;
    });
    setActiveDropdownIdx(null);
    fetchCurrentBalance(ledger.id);
    setTimeout(() => document.getElementById(`amount-${idx}`)?.focus(), 20);
  };

  const handleSelectAccount = (ledger: Ledger) => {
    setAccountLedgerId(ledger.id);
    setAccountSearch(ledger.name);
    setShowAccountDropdown(false);
    fetchCurrentBalance(ledger.id);
    setTimeout(() => document.getElementById('ledger-0')?.focus(), 20);
  };

  // ── Keyboard navigation within voucher rows ───────────────────────────
  const handleEntryKeyDown = (
    e: React.KeyboardEvent,
    idx: number,
    field: 'ledger' | 'amount'
  ) => {
    const filtered = getFilteredLedgers(entries[idx].tempSearch || '');

    if (field === 'ledger') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeDropdownIdx === idx) setHighlightedIdx((p) => Math.min(filtered.length - 1, p + 1));
        else { setActiveDropdownIdx(idx); setHighlightedIdx(0); }
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIdx((p) => Math.max(0, p - 1));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (activeDropdownIdx === idx && filtered.length > 0) {
          e.preventDefault();
          handleSelectLedger(idx, filtered[Math.min(highlightedIdx, filtered.length - 1)]);
        } else if (entries[idx].ledgerId) {
          e.preventDefault();
          document.getElementById(`amount-${idx}`)?.focus();
        }
        return;
      }
      if (e.key === 'Escape') { setActiveDropdownIdx(null); return; }
    }

    if (field === 'amount') {
      // Tab — only navigate, NEVER add new lines
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        if (idx < entries.length - 1) {
          document.getElementById(`ledger-${idx + 1}`)?.focus();
        } else {
          narrationRef.current?.focus(); // Tab from last amount → narration
        }
        return;
      }
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        document.getElementById(`ledger-${idx}`)?.focus();
        return;
      }
      // Enter — add new line (TallyPrime behaviour)
      if (e.key === 'Enter') {
        e.preventDefault();
        if (idx === entries.length - 1) {
          if (isBalanced && entries[idx].amount) {
            narrationRef.current?.focus(); // balanced → jump to narration
          } else {
            handleAddEntry(); // not balanced → add next line
          }
        } else {
          document.getElementById(`ledger-${idx + 1}`)?.focus();
        }
        return;
      }
    }
  };

  const handleAccountKeyDown = (e: React.KeyboardEvent) => {
    const filtered = getFilteredLedgers(accountSearch).filter(
      (l) => l.name.toLowerCase().includes('cash') || l.name.toLowerCase().includes('bank')
    );
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx((p) => Math.min(filtered.length - 1, p + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx((p) => Math.max(0, p - 1)); }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (showAccountDropdown && filtered[highlightedIdx]) handleSelectAccount(filtered[highlightedIdx]);
      else if (accountLedgerId) document.getElementById('ledger-0')?.focus();
    }
    if (e.key === 'Escape') setShowAccountDropdown(false);
  };

  // ── Type change ───────────────────────────────────────────────────────
  const handleTypeChange = (t: VoucherType) => {
    setType(t);
    setVoucherNo(`VCH-${Date.now().toString().slice(-6)}`);
    if (onTypeChange) onTypeChange(t);
    setEntries([{ ...DEFAULT_ENTRY, type: t === 'Receipt' ? 'Cr' : 'Dr' }]);
    setAccountLedgerId('');
    setAccountSearch('');
    document.getElementById('ledger-0')?.focus();
  };

  // ── Clear ─────────────────────────────────────────────────────────────
  const handleClear = () => {
    if (confirm('Clear all entries?')) {
      setEntries([{ ...DEFAULT_ENTRY, type: type === 'Receipt' ? 'Cr' : 'Dr' }]);
      setNarration('');
      setAccountLedgerId('');
      setAccountSearch('');
      document.getElementById(config.singleEntry ? 'account-field' : 'ledger-0')?.focus();
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const validEntries = entries.filter((e) => e.ledgerId && e.amount);
    if (validEntries.length === 0) {
      showStatus('Voucher is empty — please enter at least one amount.', 'err');
      return;
    }
    if (config.singleEntry && !accountLedgerId && type !== 'Journal') {
      showStatus('Please select an Account (Cash/Bank) for Single Entry mode.', 'err');
      return;
    }

    let finalEntries: any[];

    if (config.singleEntry && type !== 'Journal') {
      const side = type === 'Receipt' ? 'Dr' : 'Cr';
      const otherSide = type === 'Receipt' ? 'Cr' : 'Dr';
      const total = validEntries.reduce((a, e) => a + Number(e.amount), 0);
      finalEntries = [
        ...validEntries.map((e) => ({ ledgerId: e.ledgerId, costCentreId: e.costCentreId || null, amount: Number(e.amount), type: otherSide, methodAdjustment: e.methodAdjustment, refNo: e.refNo })),
        { ledgerId: accountLedgerId, costCentreId: null, amount: total, type: side, methodAdjustment: 'On Account', refNo: '' },
      ];
    } else {
      if (!isBalanced) {
        showStatus(`Dr ₹${drTotal.toFixed(2)} ≠ Cr ₹${crTotal.toFixed(2)} — difference ₹${diff.toFixed(2)}`, 'err');
        return;
      }
      finalEntries = validEntries.map((e) => ({ ledgerId: e.ledgerId, costCentreId: e.costCentreId || null, amount: Number(e.amount), type: e.type, methodAdjustment: e.methodAdjustment, refNo: e.refNo }));
    }

    const hasDr = finalEntries.some((e) => e.type === 'Dr');
    const hasCr = finalEntries.some((e) => e.type === 'Cr');
    if (!hasDr || !hasCr) {
      showStatus('Voucher must have at least one Debit and one Credit entry.', 'err');
      return;
    }

    try {
      const payload = {
        date, type, number: voucherNo, narration,
        amount: drTotal, branchId: branchId || 'HQ',
        userId: user?.id, username: user?.username,
        entries: finalEntries,
      };
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok) {
        showStatus(`Voucher ${voucherNo} saved successfully!`, 'ok');
        setCurrentBalances({}); // Invalidate balance cache
        setEntries([{ ...DEFAULT_ENTRY, type: type === 'Receipt' ? 'Cr' : 'Dr' }]);
        setNarration('');
        setAccountLedgerId('');
        setAccountSearch('');
        setVoucherNo(`VCH-${Date.now().toString().slice(-6)}`);
        document.getElementById(config.singleEntry ? 'account-field' : 'ledger-0')?.focus();
      } else {
        showStatus(result.error || 'Server error', 'err');
      }
    } catch (err: any) {
      showStatus(err.message, 'err');
    }
  };

  const showStatus = (text: string, kind: 'ok' | 'err' | 'info') => {
    setStatusMsg({ text, type: kind });
    // Success popup auto-dismisses after 3 s; errors stay until dismissed
    if (kind === 'ok') setTimeout(() => setStatusMsg(null), 3000);
  };

  const accentColor = VOUCHER_COLORS[type] || '#006b6b';

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-full bg-[#f5f0e8] font-mono text-xs select-none"
      style={{ fontFamily: '"Courier New", Courier, monospace' }}
    >

      {/* ══ SUCCESS POPUP ══════════════════════════════════════════════ */}
      {statusMsg?.type === 'ok' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
          <div
            className="pointer-events-auto flex flex-col items-center gap-3 bg-white border-4 shadow-2xl px-10 py-8 animate-bounce-in"
            style={{ borderColor: accentColor, minWidth: 320 }}
          >
            {/* Big tick */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl font-black"
              style={{ backgroundColor: accentColor }}
            >
              ✓
            </div>
            <div className="text-center">
              <div
                className="text-[15px] font-black uppercase tracking-widest"
                style={{ color: accentColor }}
              >
                Voucher Saved
              </div>
              <div className="text-[11px] text-gray-500 mt-1 font-bold">
                {statusMsg.text}
              </div>
            </div>
            {/* Auto-dismiss progress bar */}
            <div className="w-full h-1 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full rounded"
                style={{
                  backgroundColor: accentColor,
                  animation: 'shrink 3s linear forwards',
                  width: '100%',
                }}
              />
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-[10px] font-bold uppercase text-gray-400 hover:text-gray-700 mt-1"
            >
              Press any key or click to dismiss
            </button>
          </div>
        </div>
      )}

      {/* ══ ERROR / INFO INLINE BAR ════════════════════════════════════ */}
      {statusMsg && statusMsg.type !== 'ok' && (
        <div className="fixed top-0 left-0 right-0 z-[300] flex items-center justify-between px-4 py-2 shadow-lg"
          style={{
            backgroundColor: statusMsg.type === 'err' ? '#7a0000' : '#00006b',
          }}
        >
          <span className="text-white text-[11px] font-bold">
            {statusMsg.type === 'err' ? '✗ ' : 'ℹ '}{statusMsg.text}
          </span>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-white/70 hover:text-white text-lg leading-none font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* CSS for popup animation */}
      <style>{`
        @keyframes bounce-in {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          80%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .animate-bounce-in { animation: bounce-in 0.35s ease forwards; }
      `}</style>

      {/* ── Main Panel ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Top Header Bar ── */}
        <div
          className="flex items-center justify-between px-3 py-1 text-white text-[11px] font-bold uppercase"
          style={{ backgroundColor: accentColor }}
        >
          <div className="flex items-center gap-4">
            <span className="tracking-widest">{type} Voucher</span>
            <span className="opacity-60 text-[10px] font-normal">No: {voucherNo}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-70 text-[10px] font-normal">Date (F2):</span>
            <input
              ref={dateRef}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  document.getElementById(config.singleEntry ? 'account-field' : 'ledger-0')?.focus();
                }
              }}
              className="bg-white/20 border-b border-white/50 text-white text-[11px] focus:outline-none px-1 w-36"
            />
          </div>
        </div>

        {/* ── Account Field (Single Entry Mode) ── */}
        {config.singleEntry && type !== 'Journal' && (
          <div className="flex items-center gap-3 px-3 py-1 bg-[#e8f0e8] border-b border-[#b0c0b0]">
            <span className="text-[10px] font-bold uppercase w-20 text-gray-600">Account :</span>
            <div className="relative flex-1 max-w-sm">
              <input
                id="account-field"
                ref={accountRef}
                type="text"
                value={accountSearch}
                onChange={(e) => {
                  setAccountSearch(e.target.value);
                  setAccountLedgerId('');
                  setShowAccountDropdown(true);
                  setHighlightedIdx(0);
                }}
                onFocus={() => { setShowAccountDropdown(true); setHighlightedIdx(0); }}
                onBlur={() => setTimeout(() => setShowAccountDropdown(false), 150)}
                onKeyDown={handleAccountKeyDown}
                className="w-full bg-transparent border-b-2 border-[#006b6b] focus:outline-none font-bold uppercase text-[11px] py-0.5"
                placeholder="Type to search Cash / Bank..."
                autoComplete="off"
              />
              {accountLedgerId && (
                <span className="text-[10px] text-[#006b6b] font-bold ml-1">
                  Cur Bal: {loadingBalance[accountLedgerId] ? '...' : formatBalance(accountLedgerId)}
                </span>
              )}
              {showAccountDropdown && (
                <LedgerDropdown
                  items={getFilteredLedgers(accountSearch).filter(
                    (l) => l.name.toLowerCase().includes('cash') || l.name.toLowerCase().includes('bank')
                  )}
                  highlighted={highlightedIdx}
                  onSelect={handleSelectAccount}
                  balances={currentBalances}
                  loading={loadingBalance}
                  title="List of Cash / Bank Accounts"
                />
              )}
            </div>
          </div>
        )}

        {/* ── Entry Table ── */}
        <div className="flex-1 flex flex-col overflow-hidden border border-[#a0b0a0] bg-white mx-1 my-1">
          {/* Table Header */}
          <div
            className="grid text-white text-[10px] font-bold uppercase px-1 py-0.5 sticky top-0"
            style={{
              backgroundColor: accentColor,
              gridTemplateColumns: '80px 1fr 130px 130px',
            }}
          >
            <div className="px-2">{config.useDrCr ? 'Dr/Cr' : 'To/By'}</div>
            <div className="px-2">Particulars</div>
            {type === 'Journal' || !config.singleEntry ? (
              <>
                <div className="text-right px-2">Debit (₹)</div>
                <div className="text-right px-2">Credit (₹)</div>
              </>
            ) : (
              <div className="text-right px-2 col-span-2">Amount (₹)</div>
            )}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {entries.map((entry, idx) => (
              <EntryRow
                key={idx}
                idx={idx}
                entry={entry}
                ledgers={ledgers}
                activeDropdownIdx={activeDropdownIdx}
                highlightedIdx={highlightedIdx}
                currentBalances={currentBalances}
                loadingBalance={loadingBalance}
                config={config}
                type={type}
                getDrLabel={getDrLabel}
                getCrLabel={getCrLabel}
                totalEntries={entries.length}
                formatBalance={formatBalance}
                onTypeChange={(t) => {
                  setEntries((prev) => {
                    const n = [...prev];
                    n[idx] = { ...n[idx], type: t };
                    return n;
                  });
                }}
                onSearchChange={(val) => {
                  const match = ledgers.find((l) => l.name.toLowerCase() === val.toLowerCase());
                  setEntries((prev) => {
                    const n = [...prev];
                    n[idx] = { ...n[idx], tempSearch: val, ledgerId: match ? match.id : '' };
                    return n;
                  });
                  setActiveDropdownIdx(idx);
                  setHighlightedIdx(0);
                }}
                onFocusLedger={() => { setActiveDropdownIdx(idx); setHighlightedIdx(0); setFocusedRowIdx(idx); }}
                onFocusAmount={() => setFocusedRowIdx(idx)}
                onBlurLedger={() => setTimeout(() => setActiveDropdownIdx(null), 200)}
                onSelectLedger={(l) => handleSelectLedger(idx, l)}
                onAmountChange={(val) => {
                  setEntries((prev) => {
                    const n = [...prev];
                    n[idx] = { ...n[idx], amount: val };
                    return n;
                  });
                }}
                onMethodChange={(val) => {
                  setEntries((prev) => {
                    const n = [...prev];
                    n[idx] = { ...n[idx], methodAdjustment: val };
                    return n;
                  });
                }}
                onRefNoChange={(val) => {
                  setEntries((prev) => {
                    const n = [...prev];
                    n[idx] = { ...n[idx], refNo: val };
                    return n;
                  });
                }}
                onRemove={() => handleRemoveEntry(idx)}
                onKeyDown={handleEntryKeyDown}
                getFilteredLedgers={getFilteredLedgers}
              />
            ))}

            {/* Empty filler */}
            <div
              className="border-b border-dashed border-gray-200 py-1 px-3 text-[10px] text-gray-300 italic cursor-pointer hover:bg-gray-50"
              onClick={handleAddEntry}
            >
              ↵ Enter in last amount → new line &nbsp;|&nbsp; Tab → navigate only &nbsp;|&nbsp; Alt+A → add line
            </div>
          </div>

          {/* ── Totals Bar ── */}
          <div
            className="grid text-white text-[10px] font-bold uppercase px-1 py-1"
            style={{
              backgroundColor: accentColor,
              gridTemplateColumns: '80px 1fr 130px 130px',
            }}
          >
            <div className="px-2 col-span-2">Total</div>
            {type === 'Journal' || !config.singleEntry ? (
              <>
                <div className="text-right px-2 font-mono">
                  ₹ {drTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-right px-2 font-mono">
                  ₹ {crTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </>
            ) : (
              <div className="text-right px-2 col-span-2 font-mono">
                ₹ {drTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Difference indicator */}
          {!isBalanced && (
            <div className="bg-red-50 border-t border-red-200 px-3 py-0.5 text-[10px] text-red-700 font-bold flex justify-between">
              <span>⚠ Difference (not balanced)</span>
              <span className="font-mono">₹ {diff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {isBalanced && (drTotal > 0 || crTotal > 0) && (
            <div className="bg-green-50 border-t border-green-200 px-3 py-0.5 text-[10px] text-green-700 font-bold">
              ✓ Balanced
            </div>
          )}
        </div>

        {/* ── Narration + Buttons ── */}
        <div className="flex gap-2 px-1 pb-1">
          <div className="flex-1">
            <div className="text-[10px] text-gray-500 mb-0.5 uppercase font-bold">Narration :</div>
            <textarea
              ref={narrationRef}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={2}
              className="w-full border border-gray-300 text-[11px] p-1 focus:outline-none focus:border-[#006b6b] italic bg-white resize-none"
              placeholder="Enter narration here... (Enter to save)"
            />
          </div>
          <div className="flex flex-col gap-1 justify-end w-44">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 py-1 text-[9px] font-bold uppercase border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                Clear (Alt+R)
              </button>
              <button
                type="button"
                onClick={handleAddEntry}
                className="flex-1 py-1 text-[9px] font-bold uppercase text-white hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                Add (Alt+A)
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="w-full py-2 text-[11px] font-bold uppercase text-white hover:opacity-90 tracking-widest"
              style={{ backgroundColor: accentColor }}
            >
              Accept (Ctrl+↵)
            </button>
          </div>
        </div>

        {/* ── Keyboard Hint Bar ── */}
        <div className="flex gap-3 px-2 pb-1 text-[9px] text-gray-400 flex-wrap">
          {[
            'F2: Date', 'F4: Contra', 'F5: Payment', 'F6: Receipt',
            'F7: Journal', 'F8: Sales', 'F9: Purchase', 'F12: Config',
            'Alt+A: Add Line', 'Ctrl+D: Delete Line', 'Alt+R: Clear', 'Ctrl+Enter: Save',
            'Tab: Navigate', 'Enter: New Line',
          ].map((k) => (
            <span key={k} className="bg-gray-100 px-1 rounded border border-gray-200">{k}</span>
          ))}
        </div>
      </div>

      {/* ── Right Button Bar (Tally Style) ── */}
      <div
        className="w-20 flex flex-col text-[10px] text-white"
        style={{ backgroundColor: '#1a2a1a' }}
      >
        {[
          { label: 'F2', sub: 'Date', action: () => dateRef.current?.focus() },
          { label: 'F4', sub: 'Contra', action: () => handleTypeChange('Contra') },
          { label: 'F5', sub: 'Payment', action: () => handleTypeChange('Payment') },
          { label: 'F6', sub: 'Receipt', action: () => handleTypeChange('Receipt') },
          { label: 'F7', sub: 'Journal', action: () => handleTypeChange('Journal') },
          { label: 'F8', sub: 'Sales', action: () => handleTypeChange('Sales') },
          { label: 'F9', sub: 'Purchase', action: () => handleTypeChange('Purchase') },
          { label: 'H', sub: 'Single Entry', action: () => setConfig((p) => ({ ...p, singleEntry: !p.singleEntry })) },
          { label: 'F12', sub: 'Config', action: () => setShowConfig(true) },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            className={`flex-1 flex flex-col items-start px-2 py-1 border-b border-white/10 hover:bg-white/10 text-left transition-colors ${
              (btn.sub === type || (btn.sub === 'Single Entry' && config.singleEntry)) ? 'bg-white/20' : ''
            }`}
          >
            <span className="text-[9px] opacity-60 font-bold">{btn.label}</span>
            <span className="text-[9px] leading-tight">{btn.sub}</span>
          </button>
        ))}
      </div>

      {/* ── Config Modal ── */}
      {showConfig && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
          <div className="w-80 bg-white border-2 shadow-2xl" style={{ borderColor: accentColor }}>
            <div
              className="px-3 py-2 text-white text-[11px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: accentColor }}
            >
              Configuration (F12)
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Use Dr/Cr instead of To/By', key: 'useDrCr' },
                { label: 'Use Single Entry Mode', key: 'singleEntry' },
                { label: 'Show Bill-wise Details', key: 'showBillWise' },
              ].map(({ label, key }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-[11px] font-bold uppercase text-gray-700">{label}</span>
                  <button
                    onClick={() => setConfig((p: any) => ({ ...p, [key]: !p[key] }))}
                    className={`px-3 py-0.5 text-[10px] font-bold uppercase border-2 ${
                      (config as any)[key]
                        ? 'text-white border-transparent'
                        : 'bg-white text-gray-400 border-gray-200'
                    }`}
                    style={(config as any)[key] ? { backgroundColor: accentColor } : {}}
                  >
                    {(config as any)[key] ? 'Yes' : 'No'}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowConfig(false)}
              className="w-full py-2 text-[11px] font-bold uppercase text-white hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              Save & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ledger Dropdown ─────────────────────────────────────────────────────────
function LedgerDropdown({
  items,
  highlighted,
  onSelect,
  balances,
  loading,
  title,
}: {
  items: Ledger[];
  highlighted: number;
  onSelect: (l: Ledger) => void;
  balances: Record<string, { balance: number; type: 'Dr' | 'Cr' } | null>;
  loading: Record<string, boolean>;
  title?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current?.children[highlighted + 1] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  return (
    <div
      ref={listRef}
      className="absolute z-[100] left-0 top-full mt-0.5 w-[420px] bg-white border-2 border-[#006b6b] shadow-2xl max-h-72 overflow-y-auto"
    >
      <div className="bg-[#006b6b] text-white text-[10px] px-2 py-0.5 font-bold flex justify-between sticky top-0">
        <span>{title || 'List of Ledger Accounts'}</span>
        <span>Balance</span>
      </div>
      {items.length === 0 && (
        <div className="px-3 py-2 text-[10px] text-gray-400 italic">No matching accounts</div>
      )}
      {items.map((l, i) => {
        const cb = balances[l.id];
        const isLoad = loading[l.id];
        return (
          <div
            key={l.id}
            onMouseDown={() => onSelect(l)}
            className={`px-2 py-1 text-[11px] font-bold border-b border-gray-100 cursor-pointer flex justify-between items-center uppercase ${
              highlighted === i ? 'bg-[#d4ead4] text-black' : 'hover:bg-gray-50'
            }`}
          >
            <span>{l.name}</span>
            <span className="text-[10px] font-mono opacity-70 ml-2 shrink-0">
              {isLoad ? '...' : cb ? `${cb.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${cb.type}` : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Entry Row ───────────────────────────────────────────────────────────────
function EntryRow({
  idx, entry, ledgers, activeDropdownIdx, highlightedIdx,
  currentBalances, loadingBalance, config, type,
  getDrLabel, getCrLabel, totalEntries, formatBalance,
  onTypeChange, onSearchChange, onFocusLedger, onBlurLedger,
  onSelectLedger, onAmountChange, onMethodChange, onRefNoChange,
  onRemove, onKeyDown, getFilteredLedgers, onFocusAmount,
}: any) {
  const filtered = getFilteredLedgers(entry.tempSearch || '');
  const cb = currentBalances[entry.ledgerId];
  const isLoad = loadingBalance[entry.ledgerId];

  return (
    <>
      <div
        className={`grid items-start border-b border-gray-100 hover:bg-[#f0f8f0] transition-colors ${
          activeDropdownIdx === idx ? 'bg-[#f0f8f0]' : ''
        }`}
        style={{ gridTemplateColumns: '80px 1fr 130px 130px' }}
      >
        {/* Dr/Cr toggle */}
        <div className="px-2 py-1 font-bold text-[11px] border-r border-gray-100">
          <select
            value={entry.type}
            onChange={(e) => onTypeChange(e.target.value as 'Dr' | 'Cr')}
            className="bg-transparent focus:outline-none cursor-pointer w-full font-bold text-[11px]"
            style={{ color: entry.type === 'Dr' ? '#7a0000' : '#006b00' }}
          >
            <option value="Dr">{getDrLabel()}</option>
            <option value="Cr">{getCrLabel()}</option>
          </select>
        </div>

        {/* Particulars */}
        <div className="px-2 py-1 relative border-r border-gray-100">
          <div className="flex items-center gap-1">
            <input
              id={`ledger-${idx}`}
              type="text"
              value={entry.tempSearch || ledgers.find((l: Ledger) => l.id === entry.ledgerId)?.name || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={onFocusLedger}
              onBlur={onBlurLedger}
              onKeyDown={(e: React.KeyboardEvent) => onKeyDown(e, idx, 'ledger')}
              className="flex-1 bg-transparent focus:outline-none font-bold uppercase text-[11px] min-w-0"
              placeholder={idx === 0 ? 'Select Ledger Account...' : 'Select Ledger...'}
              autoComplete="off"
            />
            {/* Delete button — always visible when multiple rows */}
            {totalEntries > 1 && (
              <button
                type="button"
                onClick={onRemove}
                title="Delete this line (Ctrl+D)"
                className="flex items-center gap-0.5 text-[9px] font-bold text-red-400 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-400 px-1 py-0.5 rounded transition-colors shrink-0"
                tabIndex={-1}
              >
                ✕ Del
              </button>
            )}
          </div>
          {/* Current balance — prominent display */}
          {entry.ledgerId && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] text-gray-400 uppercase font-bold">Cur Bal:</span>
              {isLoad ? (
                <span className="text-[10px] italic text-gray-400">Loading...</span>
              ) : cb ? (
                <span
                  className="text-[10px] font-bold font-mono"
                  style={{ color: cb.type === 'Dr' ? '#7a0000' : '#006b00' }}
                >
                  ₹ {cb.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {cb.type}
                </span>
              ) : (
                <span className="text-[10px] text-gray-300">—</span>
              )}
            </div>
          )}

          {/* Dropdown */}
          {activeDropdownIdx === idx && (
            <LedgerDropdown
              items={filtered}
              highlighted={highlightedIdx}
              onSelect={onSelectLedger}
              balances={currentBalances}
              loading={loadingBalance}
            />
          )}
        </div>

        {/* Amount columns */}
        {type === 'Journal' || !config.singleEntry ? (
          <>
            <div className="px-2 py-1 border-r border-gray-100">
              {entry.type === 'Dr' && (
                <input
                  id={`amount-${idx}`}
                  type="number"
                  value={entry.amount}
                  onChange={(e) => onAmountChange(e.target.value)}
                  onFocus={onFocusAmount}
                  onKeyDown={(e: React.KeyboardEvent) => onKeyDown(e, idx, 'amount')}
                  className="w-full text-right bg-transparent focus:outline-none font-bold font-mono text-[11px] text-red-800"
                  placeholder="0.00"
                />
              )}
            </div>
            <div className="px-2 py-1">
              {entry.type === 'Cr' && (
                <input
                  id={`amount-${idx}`}
                  type="number"
                  value={entry.amount}
                  onChange={(e) => onAmountChange(e.target.value)}
                  onFocus={onFocusAmount}
                  onKeyDown={(e: React.KeyboardEvent) => onKeyDown(e, idx, 'amount')}
                  className="w-full text-right bg-transparent focus:outline-none font-bold font-mono text-[11px] text-green-800"
                  placeholder="0.00"
                />
              )}
            </div>
          </>
        ) : (
          <div className="px-2 py-1 col-span-2">
            <input
              id={`amount-${idx}`}
              type="number"
              value={entry.amount}
              onChange={(e) => onAmountChange(e.target.value)}
              onFocus={onFocusAmount}
              onKeyDown={(e: React.KeyboardEvent) => onKeyDown(e, idx, 'amount')}
              className="w-full text-right bg-transparent focus:outline-none font-bold font-mono text-[11px]"
              placeholder="0.00"
            />
          </div>
        )}
      </div>

      {/* Bill-wise sub-row */}
      {config.showBillWise && entry.ledgerId && (
        <div
          className="grid border-b border-dashed border-gray-100 bg-blue-50/40 text-[10px]"
          style={{ gridTemplateColumns: '80px 1fr 130px 130px' }}
        >
          <div />
          <div className="px-3 py-0.5 flex gap-4 items-center">
            <span className="text-gray-400 uppercase font-bold">Method:</span>
            <select
              value={entry.methodAdjustment}
              onChange={(e) => onMethodChange(e.target.value)}
              className="bg-transparent font-bold text-[#006b6b] outline-none text-[10px]"
            >
              {['Advance', 'Against Ref', 'New Ref', 'On Account'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            {(entry.methodAdjustment === 'New Ref' || entry.methodAdjustment === 'Against Ref') && (
              <>
                <span className="text-gray-400 uppercase font-bold">Ref No:</span>
                <input
                  type="text"
                  value={entry.refNo}
                  onChange={(e) => onRefNoChange(e.target.value)}
                  className="border-b border-[#006b6b]/30 focus:border-[#006b6b] outline-none font-bold uppercase px-1 bg-transparent text-[10px] w-24"
                  placeholder="INV-001"
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
