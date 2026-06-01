/**
 * TallyPrime-style Voucher Entry Screen
 * Supports Single Entry Mode (Account + Particulars) and
 * Double Entry Mode (full Dr/Cr with To/By labels)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_ENTRY = {
  ledgerId: '',
  costCentreId: '',
  amount: '',
  type: 'Dr' as 'Dr' | 'Cr',
  tempSearch: '',
  methodAdjustment: 'On Account',
  refNo: '',
};

type EntryRow = typeof DEFAULT_ENTRY;

type VoucherType = 'Contra' | 'Payment' | 'Receipt' | 'Journal';

type Config = {
  entryMode: 'single' | 'double';
  useToBylabels: boolean;
  showBillWise: boolean;
  showCurBalance: boolean;
  warnNegative: boolean;
};

const VOUCHER_STYLES: Record<VoucherType, { header: string; tab: string; bodyBg: string; rowBg: string; accent: string }> = {
  Contra:  { header: '#1f4e79', tab: '#2e75b6', bodyBg: '#f0f4f8', rowBg: '#f7f9fb', accent: '#2e75b6' },
  Payment: { header: '#2d4a22', tab: '#4a7c3f', bodyBg: '#f0f5f0', rowBg: '#f6faf5', accent: '#4a7c3f' },
  Receipt: { header: '#4a2222', tab: '#8b3a3a', bodyBg: '#fdf0f0', rowBg: '#fdf6f6', accent: '#8b3a3a' },
  Journal: { header: '#3d3225', tab: '#7a6040', bodyBg: '#f8f4ee', rowBg: '#faf7f2', accent: '#7a6040' },
};

// In Single Entry mode:
//   Payment  → Account = Cash/Bank (Cr auto), Particulars = Expense/Party (Dr)
//   Receipt  → Account = Cash/Bank (Dr auto), Particulars = Income/Party (Cr)
//   Contra   → Account = one Cash/Bank, Particulars = other Cash/Bank
//   Journal  → falls through to Double Entry automatically
const SINGLE_ENTRY_AUTO: Record<VoucherType, { accountSide: 'Dr' | 'Cr'; particularSide: 'Dr' | 'Cr'; accountLabel: string }> = {
  Payment: { accountSide: 'Cr', particularSide: 'Dr', accountLabel: 'Cash/Bank Account' },
  Receipt: { accountSide: 'Dr', particularSide: 'Cr', accountLabel: 'Cash/Bank Account' },
  Contra:  { accountSide: 'Cr', particularSide: 'Dr', accountLabel: 'From Account' },
  Journal: { accountSide: 'Dr', particularSide: 'Cr', accountLabel: 'Account' },
};

export default function VoucherScreen({
  branchId,
  onTypeChange,
  initialType,
  initialDate,
  user,
  companyName = ' ',
}: {
  branchId?: string;
  onTypeChange?: (t: string) => void;
  initialType?: string;
  initialDate?: string;
  user?: any;
  companyName?: string;
}) {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [costCentres, setCostCentres] = useState<any[]>([]);
  const [type, setType] = useState<VoucherType>((initialType as VoucherType) || 'Payment');
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState<EntryRow[]>([{ ...DEFAULT_ENTRY }]);

  // Single-entry mode account field
  const [accountLedgerId, setAccountLedgerId] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [currentBalances, setCurrentBalances] = useState<Record<string, { balance: number; type: string }>>({});
  const [loadingBalance, setLoadingBalance] = useState<Record<string, boolean>>({});

  // ── Per-user config persisted in localStorage, keyed by user ID.
  //    Each user gets their own isolated defaults — no bleed between accounts.
  const userConfigKey = `vchr_cfg_${user?.id || 'guest'}`;
  const DEFAULT_CONFIG: Config = {
    entryMode: 'single',
    useToBylabels: true,
    showBillWise: true,
    showCurBalance: true,
    warnNegative: true,
  };
  const [config, setConfig] = useState<Config>(() => {
    try {
      const saved = localStorage.getItem(userConfigKey);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_CONFIG;
  });
  const [showConfig, setShowConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  // Wrapper so every config change shows a brief "Saved" flash
  const updateConfig = (updater: (prev: Config) => Config) => {
    setConfig(updater);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 1800);
  };
  const [voucherNo, setVoucherNo] = useState(2);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [focusedRowIdx, setFocusedRowIdx] = useState<number | null>(null);
  const [showAcceptPopup, setShowAcceptPopup] = useState(false);

  const enterCountRef = useRef(0);
  const dateRef = useRef<HTMLInputElement>(null);
  const narrationRef = useRef<HTMLTextAreaElement>(null);
  const accountRef = useRef<HTMLInputElement>(null);

  const colors = VOUCHER_STYLES[type];
  const isDoubleEntry = config.entryMode === 'double' || type === 'Journal';

  const formatTallyDate = (iso: string) => {
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
  };

  const getDayName = (iso: string) => {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return days[new Date(iso).getDay()];
  };

  // ── Fetch ledgers & cost centres
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/ledgers${q}`).then(r => r.json()).then(setLedgers).catch(() => {});
    fetch(`/api/cost-centres${q}`).then(r => r.json()).then(setCostCentres).catch(() => {});
  }, [branchId]);

  // ── Auto-focus on mount
  useEffect(() => {
    setTimeout(() => {
      if (!isDoubleEntry) accountRef.current?.focus();
      else document.getElementById('ledger-0')?.focus();
    }, 100);
  }, []);

  // ── Sync props
  useEffect(() => { if (initialType) setType(initialType as VoucherType); }, [initialType]);
  useEffect(() => { if (initialDate) setDate(initialDate); }, [initialDate]);

  // ── Persist config changes to localStorage under this user's key
  useEffect(() => {
    try { localStorage.setItem(userConfigKey, JSON.stringify(config)); } catch {}
  }, [config, userConfigKey]);

  // ── Fetch balance for a ledger
  const fetchCurrentBalance = useCallback(async (ledgerId: string) => {
    if (!ledgerId || currentBalances[ledgerId] !== undefined) return;
    setLoadingBalance(p => ({ ...p, [ledgerId]: true }));
    try {
      const q = branchId ? `?branchId=${branchId}` : '';
      const res = await fetch(`/api/ledgers/${ledgerId}/balance${q}`);
      if (res.ok) {
        const data = await res.json();
        if (typeof data.balance === 'number' && data.type) {
          setCurrentBalances(p => ({ ...p, [ledgerId]: { balance: data.balance, type: data.type } }));
          return;
        }
      }
      const ledger = ledgers.find((l: any) => l.id === ledgerId);
      const ob = Number(ledger?.openingBalance || 0);
      const signed = ledger?.balanceType === 'Cr' ? -ob : ob;
      setCurrentBalances(p => ({ ...p, [ledgerId]: { balance: Math.abs(signed), type: signed >= 0 ? 'Dr' : 'Cr' } }));
    } catch {
      const ledger = ledgers.find((l: any) => l.id === ledgerId);
      const ob = Number(ledger?.openingBalance || 0);
      setCurrentBalances(p => ({ ...p, [ledgerId]: { balance: Math.abs(ob), type: ob >= 0 ? 'Dr' : 'Cr' } }));
    } finally {
      setLoadingBalance(p => ({ ...p, [ledgerId]: false }));
    }
  }, [branchId, currentBalances, ledgers]);

  useEffect(() => {
    entries.forEach(e => { if (e.ledgerId) fetchCurrentBalance(e.ledgerId); });
  }, [entries]);

  useEffect(() => {
    if (accountLedgerId) fetchCurrentBalance(accountLedgerId);
  }, [accountLedgerId]);

  // ── Global keyboard handler
  useEffect(() => {
    const APP_KEYS = new Set(['F2','F4','F5','F6','F7','F8','F9','F12']);
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (APP_KEYS.has(e.key)) e.preventDefault();
      if (e.ctrlKey && e.key === 'Enter') e.preventDefault();
      if (e.altKey && ['a','r','d'].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.ctrlKey && e.key.toLowerCase() === 'd') e.preventDefault();

      if (e.ctrlKey && e.key === 'Enter') { setShowAcceptPopup(true); return; }
      if (e.key === 'F12') { setShowConfig(true); return; }
      if (e.altKey && e.key.toLowerCase() === 'a') { handleAddEntry(); return; }
      if (e.altKey && e.key.toLowerCase() === 'r') { handleClear(); return; }
      if (e.key === 'F2') { dateRef.current?.focus(); dateRef.current?.select?.(); return; }
      if (e.ctrlKey && e.key.toLowerCase() === 'd' && inInput) {
        if (focusedRowIdx !== null && entries.length > 1) {
          const nf = Math.max(0, focusedRowIdx - 1);
          setEntries(prev => prev.filter((_, i) => i !== focusedRowIdx));
          setTimeout(() => document.getElementById(`ledger-${nf}`)?.focus(), 30);
        }
        return;
      }
      if (e.key === 'F4') { handleTypeChange('Contra'); return; }
      if (e.key === 'F5') { handleTypeChange('Payment'); return; }
      if (e.key === 'F6') { handleTypeChange('Receipt'); return; }
      if (e.key === 'F7') { handleTypeChange('Journal'); return; }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [entries, date, narration, type, config, focusedRowIdx]);

  // ── Helpers
  const getFilteredLedgers = (search: string) => {
    const s = (search || '').toLowerCase();
    return ledgers.filter((l: any) => l.name.toLowerCase().includes(s));
  };

  const formatBalance = (ledgerId: string) => {
    const cb = currentBalances[ledgerId];
    if (loadingBalance[ledgerId]) return '...';
    if (!cb) return '';
    return `${cb.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${cb.type}`;
  };

  const getAdjustedBalance = (ledgerId: string, amountValue: string | number, entryType: 'Dr' | 'Cr') => {
    const cb = currentBalances[ledgerId];
    const amount = Number(amountValue || 0);
    if (!cb || !amount) return null;
    const signed = cb.type === 'Dr' ? cb.balance : -cb.balance;
    const delta = entryType === 'Dr' ? amount : -amount;
    const next = signed + delta;
    return { balance: Math.abs(next), type: next >= 0 ? 'Dr' : 'Cr' };
  };

  // ── Totals (Double Entry)
  const drTotal = entries.filter(e => e.type === 'Dr').reduce((a, e) => a + Number(e.amount || 0), 0);
  const crTotal = entries.filter(e => e.type === 'Cr').reduce((a, e) => a + Number(e.amount || 0), 0);
  const diff = Math.abs(drTotal - crTotal);
  const isBalanced = diff < 0.01;

  // Single entry total
  const singleTotal = entries.reduce((a, e) => a + Number(e.amount || 0), 0);

  // ── To/By label for Double Entry rows
  // "To" = Cr side (money going out to), "By" = Dr side (money coming in by)
  const getToBylabel = (entryType: 'Dr' | 'Cr'): string => {
    if (!config.useToBylabels) return entryType;
    return entryType === 'Dr' ? 'By' : 'To';
  };

  // ── Entry management
  const handleAddEntry = () => {
    if (isDoubleEntry) {
      const nextType: 'Dr' | 'Cr' = drTotal > crTotal ? 'Cr' : 'Dr';
      const nextAmt = diff > 0 ? diff.toString() : '';
      setEntries(prev => [...prev, { ...DEFAULT_ENTRY, type: nextType, amount: nextAmt }]);
    } else {
      setEntries(prev => [...prev, { ...DEFAULT_ENTRY, type: SINGLE_ENTRY_AUTO[type].particularSide }]);
    }
    setTimeout(() => document.getElementById(`ledger-${entries.length}`)?.focus(), 30);
  };

  const handleRemoveEntry = (idx: number) => {
    if (entries.length > 1) setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSelectLedger = (idx: number, ledger: any) => {
    setEntries(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ledgerId: ledger.id, tempSearch: ledger.name };
      if (isDoubleEntry && idx > 0) {
        const drAbove = next.slice(0, idx).filter(e => e.type === 'Dr').reduce((a, e) => a + Number(e.amount || 0), 0);
        const crAbove = next.slice(0, idx).filter(e => e.type === 'Cr').reduce((a, e) => a + Number(e.amount || 0), 0);
        next[idx].type = drAbove > crAbove ? 'Cr' : 'Dr';
      }
      return next;
    });
    setActiveDropdownIdx(null);
    fetchCurrentBalance(ledger.id);
    setTimeout(() => document.getElementById(`amount-${idx}`)?.focus(), 20);
  };

  const handleSelectAccount = (ledger: any) => {
    setAccountLedgerId(ledger.id);
    setAccountSearch(ledger.name);
    setShowAccountDropdown(false);
    fetchCurrentBalance(ledger.id);
    setTimeout(() => {
      document.getElementById('ledger-0')?.focus();
      setActiveDropdownIdx(0);
      setHighlightedIdx(0);
    }, 30);
  };

  const toggleEntryDrCr = (idx: number) => {
    setEntries(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], type: next[idx].type === 'Dr' ? 'Cr' : 'Dr' };
      return next;
    });
  };

  // ── Keyboard nav for entry rows
  const handleEntryKeyDown = (e: React.KeyboardEvent, idx: number, field: 'ledger' | 'amount') => {
    const filtered = getFilteredLedgers(entries[idx].tempSearch || '');
    if (field === 'ledger') {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (activeDropdownIdx === idx) setHighlightedIdx(p => Math.min(filtered.length - 1, p + 1)); else { setActiveDropdownIdx(idx); setHighlightedIdx(0); } return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx(p => Math.max(0, p - 1)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (activeDropdownIdx === idx && filtered.length > 0) { e.preventDefault(); handleSelectLedger(idx, filtered[Math.min(highlightedIdx, filtered.length - 1)]); }
        else if (entries[idx].ledgerId) { e.preventDefault(); document.getElementById(`amount-${idx}`)?.focus(); }
        return;
      }
      if (e.key === 'Escape') { setActiveDropdownIdx(null); return; }
      // Space bar to toggle Dr/Cr in double entry mode
      if (e.key === ' ' && isDoubleEntry && !entries[idx].ledgerId) {
        e.preventDefault();
        toggleEntryDrCr(idx);
        return;
      }
    }
    if (field === 'amount') {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        if (idx < entries.length - 1) document.getElementById(`ledger-${idx + 1}`)?.focus();
        else narrationRef.current?.focus();
        return;
      }
      if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); document.getElementById(`ledger-${idx}`)?.focus(); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (idx === entries.length - 1) {
          enterCountRef.current += 1;
          if (enterCountRef.current >= 2) {
            enterCountRef.current = 0;
            narrationRef.current?.focus();
          }
        } else {
          enterCountRef.current = 0;
          // Move focus to next ledger field AND open its dropdown immediately
          const nextInput = document.getElementById(`ledger-${idx + 1}`);
          if (nextInput) {
            nextInput.focus();
            // Open dropdown for the next row after focus settles
            setTimeout(() => {
              setActiveDropdownIdx(idx + 1);
              setHighlightedIdx(0);
            }, 30);
          }
        }
        return;
      }
      enterCountRef.current = 0;
    }
  };

  const handleAccountKeyDown = (e: React.KeyboardEvent) => {
    const filtered = getFilteredLedgers(accountSearch);
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(p => Math.min(filtered.length - 1, p + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx(p => Math.max(0, p - 1)); }
    if ((e.key === 'Enter' || e.key === 'Tab') && showAccountDropdown && filtered[highlightedIdx]) { e.preventDefault(); handleSelectAccount(filtered[highlightedIdx]); }
    if (e.key === 'Escape') setShowAccountDropdown(false);
  };

  // ── Type change
  const handleTypeChange = (t: VoucherType) => {
    setType(t);
    if (onTypeChange) onTypeChange(t);
    const defaultSide = t === 'Receipt' ? 'Cr' : 'Dr';
    setEntries([{ ...DEFAULT_ENTRY, type: defaultSide }]);
    setAccountLedgerId('');
    setAccountSearch('');
    enterCountRef.current = 0;
    setTimeout(() => {
      const effectiveDouble = config.entryMode === 'double' || t === 'Journal';
      if (!effectiveDouble) accountRef.current?.focus();
      else document.getElementById('ledger-0')?.focus();
    }, 50);
  };

  // ── Toggle entry mode
  const handleToggleEntryMode = () => {
    updateConfig(prev => {
      const newMode = prev.entryMode === 'single' ? 'double' : 'single';
      return { ...prev, entryMode: newMode };
    });
    setEntries([{ ...DEFAULT_ENTRY }]);
    setAccountLedgerId('');
    setAccountSearch('');
    enterCountRef.current = 0;
    setTimeout(() => {
      const newDouble = config.entryMode === 'single'; // will become double
      if (newDouble) document.getElementById('ledger-0')?.focus();
      else accountRef.current?.focus();
    }, 80);
  };

  // ── Clear
  const handleClear = () => {
    if (confirm('Clear all entries?')) {
      setEntries([{ ...DEFAULT_ENTRY, type: type === 'Receipt' ? 'Cr' : 'Dr' }]);
      setNarration('');
      setAccountLedgerId('');
      setAccountSearch('');
      enterCountRef.current = 0;
    }
  };

  // ── Submit
  const handleSubmit = async () => {
    setShowAcceptPopup(false);
    const validEntries = entries.filter(e => e.ledgerId && e.amount);
    if (validEntries.length === 0) { showStatusMsg('Voucher is empty — enter at least one amount.', 'err'); return; }

    let finalEntries: any[];

    if (!isDoubleEntry) {
      // Single Entry mode
      if (!accountLedgerId) { showStatusMsg('Please select an Account (Cash/Bank).', 'err'); return; }
      const auto = SINGLE_ENTRY_AUTO[type];
      const total = validEntries.reduce((a, e) => a + Number(e.amount), 0);
      finalEntries = [
        ...validEntries.map(e => ({
          ledgerId: e.ledgerId,
          costCentreId: e.costCentreId || null,
          amount: Number(e.amount),
          type: auto.particularSide,
          methodAdjustment: e.methodAdjustment,
          refNo: e.refNo,
        })),
        {
          ledgerId: accountLedgerId,
          costCentreId: null,
          amount: total,
          type: auto.accountSide,
          methodAdjustment: 'On Account',
          refNo: '',
        },
      ];
    } else {
      // Double Entry mode — must be balanced
      if (!isBalanced) { showStatusMsg(`Dr ₹${drTotal.toFixed(2)} ≠ Cr ₹${crTotal.toFixed(2)} — difference ₹${diff.toFixed(2)}`, 'err'); return; }
      finalEntries = validEntries.map(e => ({
        ledgerId: e.ledgerId,
        costCentreId: e.costCentreId || null,
        amount: Number(e.amount),
        type: e.type,
        methodAdjustment: e.methodAdjustment,
        refNo: e.refNo,
      }));
    }

    try {
      const total = isDoubleEntry ? drTotal : singleTotal;
      const payload = {
        date, type, number: `VCH-${voucherNo}`, narration,
        amount: total, branchId: branchId || 'HQ',
        userId: user?.id, username: user?.username,
        entries: finalEntries,
      };
      const res = await fetch('/api/vouchers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (res.ok) {
        showStatusMsg(`Voucher VCH-${voucherNo} saved successfully!`, 'ok');
        setCurrentBalances({});
        setEntries([{ ...DEFAULT_ENTRY, type: type === 'Receipt' ? 'Cr' : 'Dr' }]);
        setNarration('');
        setAccountLedgerId('');
        setAccountSearch('');
        setVoucherNo(p => p + 1);
        enterCountRef.current = 0;
      } else {
        showStatusMsg(result.error || 'Server error', 'err');
      }
    } catch (err: any) {
      showStatusMsg(err.message, 'err');
    }
  };

  const showStatusMsg = (text: string, kind: 'ok' | 'err') => {
    setStatusMsg({ text, type: kind });
    if (kind === 'ok') setTimeout(() => setStatusMsg(null), 3000);
  };

  const S = buildStyles(colors);
  const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <style>{`
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=date]::-webkit-calendar-picker-indicator { display: none; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
        .tly-row:hover { background: ${colors.bodyBg} !important; }
        .tly-row.active { background: ${colors.rowBg} !important; }
        .tly-dd-item:hover { background: #cce5ff !important; cursor: pointer; }
        .tly-dd-item.hl { background: #b3d9ff !important; }
        .tly-mode-btn { transition: all 0.15s ease; }
        .tly-mode-btn:hover { opacity: 0.85; }
        .tly-drcr-badge { cursor: pointer; user-select: none; transition: all 0.1s; }
        .tly-drcr-badge:hover { opacity: 0.75; }
      `}</style>

      {/* ── Title Bar ── */}
      <div style={S.titleBar}>
        <span style={S.titleLeft}>Accounting Voucher Creation</span>
        <span style={S.titleCenter}>{companyName}</span>
        <button style={S.titleClose} onClick={() => {}}>✕</button>
      </div>

      {/* ── Voucher Type Tabs + Date + Mode Toggle ── */}
      <div style={S.typeRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {(['Contra','Payment','Receipt','Journal'] as VoucherType[]).map(t => (
            <button key={t} onClick={() => handleTypeChange(t)} style={{
              ...S.typeTab,
              ...(type === t ? { ...S.typeTabActive, background: colors.tab } : {}),
            }}>
              {t}
            </button>
          ))}

          {/* ── Entry Mode Toggle ── */}
          <div style={{ marginLeft: 16, display: 'flex', alignItems: 'center', gap: 0, border: `1px solid ${colors.tab}`, borderRadius: 3, overflow: 'hidden' }}>
            <button
              className="tly-mode-btn"
              onClick={() => { if (isDoubleEntry) handleToggleEntryMode(); }}
              style={{
                padding: '4px 11px',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: FONT,
                cursor: isDoubleEntry ? 'pointer' : 'default',
                border: 'none',
                background: !isDoubleEntry ? colors.tab : 'rgba(255,255,255,0.6)',
                color: !isDoubleEntry ? '#fff' : '#555',
                letterSpacing: 0.3,
              }}
              title="Single Entry Mode (F11)"
            >
              Single
            </button>
            <button
              className="tly-mode-btn"
              onClick={() => { if (!isDoubleEntry) handleToggleEntryMode(); }}
              style={{
                padding: '4px 11px',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: FONT,
                cursor: !isDoubleEntry ? 'pointer' : 'default',
                border: 'none',
                borderLeft: `1px solid ${colors.tab}`,
                background: isDoubleEntry ? colors.tab : 'rgba(255,255,255,0.6)',
                color: isDoubleEntry ? '#fff' : '#555',
                letterSpacing: 0.3,
              }}
              title="Double Entry Mode"
            >
              Double
            </button>
          </div>
        </div>

        <div style={S.voucherMeta}>
          <span style={S.metaLabel}>No.</span>
          <span style={S.metaValue}>{voucherNo}</span>
          <div style={S.dateBlock}>
            <input ref={dateRef} type="date" value={date}
              onChange={e => setDate(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); (!isDoubleEntry ? accountRef.current : document.getElementById('ledger-0'))?.focus(); } }}
              style={S.dateInput}
            />
            <div style={S.dateDisplay} onClick={() => dateRef.current?.focus()}>
              <span style={S.dateMain}>{formatTallyDate(date)}</span>
              <span style={S.dateDay}>{getDayName(date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error status bar ── */}
      {statusMsg && statusMsg.type === 'err' && (
        <div style={{ ...S.statusBar, background: '#c00000' }}>
          <span>✗  {statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} style={S.statusClose}>✕</button>
        </div>
      )}

      {/* ── Main Body ── */}
      <div style={{ ...S.body, background: colors.bodyBg }}>

        {/* ════════════════════════════════════════════════════
            SINGLE ENTRY MODE LAYOUT
        ════════════════════════════════════════════════════ */}
        {!isDoubleEntry && (
          <>
            {/* Account field (Cash/Bank side) */}
            <div style={{ ...S.accountSection, background: colors.rowBg }}>
              <div style={S.accountRow}>
                <span style={S.fieldLabelWide}>{SINGLE_ENTRY_AUTO[type].accountLabel}</span>
                <span style={S.fieldColon}>:</span>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    id="account-field"
                    ref={accountRef}
                    type="text"
                    value={accountSearch}
                    onChange={e => { setAccountSearch(e.target.value); setAccountLedgerId(''); setShowAccountDropdown(true); setHighlightedIdx(0); }}
                    onFocus={() => { setShowAccountDropdown(true); setHighlightedIdx(0); }}
                    onBlur={() => setTimeout(() => setShowAccountDropdown(false), 180)}
                    onKeyDown={handleAccountKeyDown}
                    style={S.accountInput}
                    placeholder="Start typing to search..."
                    autoComplete="off"
                  />
                  {showAccountDropdown && (
                    <LedgerDropdown items={getFilteredLedgers(accountSearch)} highlighted={highlightedIdx}
                      onSelect={handleSelectAccount} balances={currentBalances} loading={loadingBalance}
                      headerBg={colors.header} />
                  )}
                </div>
              </div>
              {accountLedgerId && config.showCurBalance && (
                <div style={S.curBalRow}>
                  <span style={S.fieldLabelWide}>Current balance</span>
                  <span style={S.fieldColon}>:</span>
                  <span style={S.curBalValue}>{formatBalance(accountLedgerId)}</span>
                </div>
              )}
            </div>

            {/* Particulars table */}
            <div style={S.tableWrap}>
              <div style={S.tableHeader}>
                <div style={{ ...S.colToBy, fontSize: 11, fontWeight: 700, color: '#444', padding: '3px 8px' }}>—</div>
                <div style={{ ...S.colParticulars, fontSize: 11, fontWeight: 700, color: '#444', padding: '3px 8px' }}>Particulars</div>
                <div style={{ ...S.colAmount, fontSize: 11, fontWeight: 700, color: '#444', padding: '3px 8px', textAlign: 'right' }}>Amount</div>
              </div>

              <div style={S.tableBody}>
                {entries.map((entry, idx) => {
                  const cb = currentBalances[entry.ledgerId];
                  const isLoad = loadingBalance[entry.ledgerId];
                  const filtered = getFilteredLedgers(entry.tempSearch || '');
                  const ledgerName = entry.tempSearch || ledgers.find((l: any) => l.id === entry.ledgerId)?.name || '';

                  return (
                    <div key={idx}>
                      <div className={`tly-row${activeDropdownIdx === idx ? ' active' : ''}`}
                        style={{ ...S.tableRow, background: colors.rowBg }}>

                        {/* To/By label */}
                        <div style={{ ...S.colToBy, padding: '5px 6px', display: 'flex', alignItems: 'flex-start' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, fontStyle: 'italic',
                            color: colors.accent, userSelect: 'none', paddingTop: 2,
                          }}>
                            {type === 'Payment' || type === 'Contra' ? 'To' : 'By'}
                          </span>
                        </div>

                        {/* Ledger search */}
                        <div style={{ ...S.colParticulars, position: 'relative', padding: '4px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              id={`ledger-${idx}`}
                              type="text"
                              value={ledgerName}
                              onChange={e => {
                                const match = ledgers.find((l: any) => l.name.toLowerCase() === e.target.value.toLowerCase());
                                setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], tempSearch: e.target.value, ledgerId: match ? match.id : ''}; return n; });
                                setActiveDropdownIdx(idx); setHighlightedIdx(0);
                              }}
                              onFocus={() => { setActiveDropdownIdx(idx); setHighlightedIdx(0); setFocusedRowIdx(idx); }}
                              onBlur={() => setTimeout(() => setActiveDropdownIdx(null), 200)}
                              onKeyDown={e => handleEntryKeyDown(e, idx, 'ledger')}
                              style={S.ledgerInput}
                              placeholder={idx === 0 ? 'Select Ledger Account' : 'Select Ledger...'}
                              autoComplete="off"
                            />
                            {entries.length > 1 && (
                              <button type="button" onClick={() => handleRemoveEntry(idx)} tabIndex={-1} style={S.delBtn} title="Delete line">✕</button>
                            )}
                          </div>
                          {entry.ledgerId && config.showCurBalance && (
                            <div style={S.curBalLine}>
                              <span style={S.curBalLabel}>Cur Bal: </span>
                              {isLoad ? <span style={{ color: '#666' }}>...</span> : cb ? <span>{cb.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {cb.type}</span> : null}
                            </div>
                          )}
                          {config.showBillWise && entry.ledgerId && (
                            <div style={S.billWiseRow}>
                              <select value={entry.methodAdjustment}
                                onChange={e => { setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], methodAdjustment: e.target.value}; return n; }); }}
                                style={{ ...S.billWiseSelect, color: colors.accent }}>
                                {['Advance','Against Ref','New Ref','On Account'].map(m => <option key={m}>{m}</option>)}
                              </select>
                              {(entry.methodAdjustment === 'New Ref' || entry.methodAdjustment === 'Against Ref') && (
                                <input type="text" value={entry.refNo}
                                  onChange={e => { setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], refNo: e.target.value}; return n; }); }}
                                  style={S.refInput} placeholder="Ref No." />
                              )}
                            </div>
                          )}
                          {activeDropdownIdx === idx && (
                            <LedgerDropdown items={filtered} highlighted={highlightedIdx}
                              onSelect={l => handleSelectLedger(idx, l)} balances={currentBalances}
                              loading={loadingBalance} headerBg={colors.header} />
                          )}
                        </div>

                        {/* Amount */}
                        <div style={{ ...S.colAmount, padding: '4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                          <input id={`amount-${idx}`} type="number" value={entry.amount}
                            onChange={e => { setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], amount: e.target.value}; return n; }); }}
                            onFocus={() => { setFocusedRowIdx(idx); enterCountRef.current = 0; }}
                            onKeyDown={e => handleEntryKeyDown(e, idx, 'amount')}
                            style={S.amountInput} placeholder="0.00" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty rows */}
                {Array.from({ length: Math.max(0, 6 - entries.length) }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ ...S.tableRow, background: colors.rowBg, minHeight: 28, cursor: 'pointer' }}
                    onClick={i === 0 ? handleAddEntry : undefined} />
                ))}
              </div>

              {/* Total row */}
              <div style={{ ...S.totalRow, background: colors.bodyBg }}>
                <div style={S.colToBy} />
                <div style={S.colParticulars} />
                <div style={{ ...S.colAmount, padding: '3px 8px', fontWeight: 700, fontSize: 12, borderTop: '1px solid #bbb', textAlign: 'right' }}>
                  {singleTotal > 0 ? singleTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════
            DOUBLE ENTRY MODE LAYOUT
        ════════════════════════════════════════════════════ */}
        {isDoubleEntry && (
          <div style={S.tableWrap}>
            {/* Column headers */}
            <div style={S.tableHeader}>
              <div style={{ ...S.colToByDE, fontSize: 11, fontWeight: 700, color: '#444', padding: '3px 6px' }}>Dr/Cr</div>
              <div style={{ ...S.colParticularsDE, fontSize: 11, fontWeight: 700, color: '#444', padding: '3px 8px' }}>Particulars</div>
              <div style={{ ...S.colAmountDE, fontSize: 11, fontWeight: 700, color: '#444', padding: '3px 8px', textAlign: 'right' }}>Debit</div>
              <div style={{ ...S.colAmountDE, fontSize: 11, fontWeight: 700, color: '#444', padding: '3px 8px', textAlign: 'right', borderLeft: '1px solid #ccc' }}>Credit</div>
            </div>

            <div style={S.tableBody}>
              {entries.map((entry, idx) => {
                const cb = currentBalances[entry.ledgerId];
                const isLoad = loadingBalance[entry.ledgerId];
                const filtered = getFilteredLedgers(entry.tempSearch || '');
                const ledgerName = entry.tempSearch || ledgers.find((l: any) => l.id === entry.ledgerId)?.name || '';
                const adjusted = entry.ledgerId && Number(entry.amount) > 0 ? getAdjustedBalance(entry.ledgerId, entry.amount, entry.type) : null;
                const isDr = entry.type === 'Dr';

                return (
                  <div key={idx}>
                    <div className={`tly-row${activeDropdownIdx === idx ? ' active' : ''}`}
                      style={{ ...S.tableRowDE, background: isDr ? `${colors.rowBg}` : `#fffcf5` }}>

                      {/* Dr/Cr toggle badge */}
                      <div style={{ ...S.colToByDE, padding: '5px 6px', display: 'flex', alignItems: 'flex-start' }}>
                        <span
                          className="tly-drcr-badge"
                          onClick={() => toggleEntryDrCr(idx)}
                          title="Click or Space to toggle Dr/Cr"
                          style={{
                            fontSize: 11, fontWeight: 800, fontStyle: 'italic',
                            color: isDr ? '#1a5c2a' : '#8b1a1a',
                            background: isDr ? '#e8f5ec' : '#fdf0f0',
                            border: `1px solid ${isDr ? '#8bc49a' : '#e0a0a0'}`,
                            borderRadius: 2,
                            padding: '1px 5px',
                            display: 'inline-block',
                            userSelect: 'none',
                            lineHeight: 1.6,
                          }}>
                          {config.useToBylabels ? (isDr ? 'By' : 'To') : (isDr ? 'Dr' : 'Cr')}
                        </span>
                      </div>

                      {/* Ledger search */}
                      <div style={{ ...S.colParticularsDE, position: 'relative', padding: '4px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            id={`ledger-${idx}`}
                            type="text"
                            value={ledgerName}
                            onChange={e => {
                              const match = ledgers.find((l: any) => l.name.toLowerCase() === e.target.value.toLowerCase());
                              setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], tempSearch: e.target.value, ledgerId: match ? match.id : ''}; return n; });
                              setActiveDropdownIdx(idx); setHighlightedIdx(0);
                            }}
                            onFocus={() => { setActiveDropdownIdx(idx); setHighlightedIdx(0); setFocusedRowIdx(idx); }}
                            onBlur={() => setTimeout(() => setActiveDropdownIdx(null), 200)}
                            onKeyDown={e => handleEntryKeyDown(e, idx, 'ledger')}
                            style={S.ledgerInput}
                            placeholder={idx === 0 ? 'Select Ledger Account' : 'Select Ledger...'}
                            autoComplete="off"
                          />
                          {entries.length > 1 && (
                            <button type="button" onClick={() => handleRemoveEntry(idx)} tabIndex={-1} style={S.delBtn} title="Delete line">✕</button>
                          )}
                        </div>
                        {entry.ledgerId && config.showCurBalance && (
                          <div style={S.curBalLine}>
                            <span style={S.curBalLabel}>Cur Bal: </span>
                            {isLoad ? <span style={{ color: '#666' }}>...</span>
                              : cb ? <span>{cb.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {cb.type}</span> : null}
                            {adjusted && config.showCurBalance && (
                              <span style={{ marginLeft: 8, color: '#555' }}>
                                → <strong>{adjusted.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {adjusted.type}</strong>
                              </span>
                            )}
                          </div>
                        )}
                        {config.showBillWise && entry.ledgerId && (
                          <div style={S.billWiseRow}>
                            <select value={entry.methodAdjustment}
                              onChange={e => { setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], methodAdjustment: e.target.value}; return n; }); }}
                              style={{ ...S.billWiseSelect, color: colors.accent }}>
                              {['Advance','Against Ref','New Ref','On Account'].map(m => <option key={m}>{m}</option>)}
                            </select>
                            {(entry.methodAdjustment === 'New Ref' || entry.methodAdjustment === 'Against Ref') && (
                              <input type="text" value={entry.refNo}
                                onChange={e => { setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], refNo: e.target.value}; return n; }); }}
                                style={S.refInput} placeholder="Ref No." />
                            )}
                          </div>
                        )}
                        {activeDropdownIdx === idx && (
                          <LedgerDropdown items={filtered} highlighted={highlightedIdx}
                            onSelect={l => handleSelectLedger(idx, l)} balances={currentBalances}
                            loading={loadingBalance} headerBg={colors.header} />
                        )}
                      </div>

                      {/* Debit amount column */}
                      <div style={{ ...S.colAmountDE, padding: '4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                        {isDr ? (
                          <input id={`amount-${idx}`} type="number" value={entry.amount}
                            onChange={e => { setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], amount: e.target.value}; return n; }); }}
                            onFocus={() => { setFocusedRowIdx(idx); enterCountRef.current = 0; }}
                            onKeyDown={e => handleEntryKeyDown(e, idx, 'amount')}
                            style={S.amountInput} placeholder="0.00" />
                        ) : (
                          <span style={{ fontSize: 12, color: '#bbb', padding: '1px 0' }}>—</span>
                        )}
                      </div>

                      {/* Credit amount column */}
                      <div style={{ ...S.colAmountDE, padding: '4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', borderLeft: '1px solid #dde3ea' }}>
                        {!isDr ? (
                          <input id={`amount-${idx}`} type="number" value={entry.amount}
                            onChange={e => { setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], amount: e.target.value}; return n; }); }}
                            onFocus={() => { setFocusedRowIdx(idx); enterCountRef.current = 0; }}
                            onKeyDown={e => handleEntryKeyDown(e, idx, 'amount')}
                            style={{ ...S.amountInput, color: '#7a3030' }} placeholder="0.00" />
                        ) : (
                          <span style={{ fontSize: 12, color: '#bbb', padding: '1px 0' }}>—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty rows */}
              {Array.from({ length: Math.max(0, 5 - entries.length) }).map((_, i) => (
                <div key={`empty-${i}`} style={{ ...S.tableRowDE, background: colors.rowBg, minHeight: 28, cursor: 'pointer' }}
                  onClick={i === 0 ? handleAddEntry : undefined} />
              ))}
            </div>

            {/* Totals row for Double Entry */}
            <div style={{ ...S.totalRow, background: colors.bodyBg, borderTop: '2px solid #aaa' }}>
              <div style={S.colToByDE} />
              <div style={{ ...S.colParticularsDE, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#555', textAlign: 'right' }}>
                {isBalanced && drTotal > 0 ? <span style={{ color: '#1a5c2a' }}>✓ Balanced</span> : diff > 0 ? <span style={{ color: '#c00' }}>Diff: ₹{diff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> : null}
              </div>
              <div style={{ ...S.colAmountDE, padding: '3px 8px', fontWeight: 700, fontSize: 12, textAlign: 'right', borderTop: '1px solid #bbb', color: '#1a5c2a' }}>
                {drTotal > 0 ? drTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
              </div>
              <div style={{ ...S.colAmountDE, padding: '3px 8px', fontWeight: 700, fontSize: 12, textAlign: 'right', borderTop: '1px solid #bbb', borderLeft: '1px solid #dde3ea', color: '#7a3030' }}>
                {crTotal > 0 ? crTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
              </div>
            </div>
          </div>
        )}

        {/* ── Narration ── */}
        <div style={{ ...S.narrationSection, background: colors.rowBg }}>
          <span style={{ ...S.fieldLabelWide, paddingTop: 3 }}>Narration</span>
          <span style={S.fieldColon}>:</span>
          <textarea ref={narrationRef} value={narration}
            onChange={e => setNarration(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setShowAcceptPopup(true); } }}
            rows={2} style={S.narrationInput} placeholder="Enter narration here..." />
        </div>
      </div>

      {/* ── Accept/Reject Bar ── */}
      <div style={{ ...S.acceptBar, background: colors.bodyBg }}>
        <div style={S.acceptLeft}>
          {isDoubleEntry && !isBalanced && drTotal > 0 && (
            <span style={S.diffBadge}>Difference: ₹{diff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          )}
          {isDoubleEntry && isBalanced && drTotal > 0 && (
            <span style={S.balancedBadge}>✓ Balanced</span>
          )}
          <span style={S.modeIndicator}>
            {isDoubleEntry
              ? `Double Entry Mode${config.useToBylabels ? ' (To/By)' : ' (Dr/Cr)'}`
              : `Single Entry Mode`}
          </span>
          <span style={S.hintText}>Ctrl+Enter: Accept  |  Alt+A: Add Line  |  F12: Config</span>
        </div>
        <div style={S.acceptButtons}>
          <span style={S.acceptLabel}>Accept ?</span>
          <button type="button" onClick={() => setShowAcceptPopup(true)} style={S.btnYes}>Yes</button>
          <span style={S.acceptOr}>or</span>
          <button type="button" onClick={handleClear} style={S.btnNo}>No</button>
        </div>
      </div>

      {/* ── Accept Confirmation Popup ── */}
      {showAcceptPopup && (
        <div style={S.modalOverlay}>
          <div style={{ ...S.modal, width: 360, animation: 'popIn 0.15s ease' }}>
            <div style={{ ...S.titleBar, background: colors.header, borderRadius: '3px 3px 0 0' }}>
              <span style={S.titleLeft}>Accept Voucher</span>
              <button style={S.titleClose} onClick={() => setShowAcceptPopup(false)}>✕</button>
            </div>
            <div style={{ padding: '16px 20px 10px', fontSize: 13, color: '#333' }}>
              <div style={{ marginBottom: 7 }}><strong>Type:</strong> {type} &nbsp;|&nbsp; <strong>No.:</strong> VCH-{voucherNo}</div>
              <div style={{ marginBottom: 7 }}><strong>Date:</strong> {formatTallyDate(date)} ({getDayName(date)})</div>
              {!isDoubleEntry && accountLedgerId && (
                <div style={{ marginBottom: 7 }}><strong>Account:</strong> {accountSearch}</div>
              )}
              <div style={{ marginBottom: 7 }}>
                <strong>Amount:</strong> ₹{(isDoubleEntry ? drTotal : singleTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                {isDoubleEntry && <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>
                  (Dr: {drTotal.toFixed(2)} / Cr: {crTotal.toFixed(2)})
                </span>}
              </div>
              {narration && <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic', marginBottom: 4 }}>"{narration}"</div>}
              {isDoubleEntry && !isBalanced && (
                <div style={{ color: '#c00', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                  ⚠ Voucher is not balanced (Diff: ₹{diff.toFixed(2)})
                </div>
              )}
            </div>
            <div style={{ padding: '10px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #eee' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#222', marginRight: 4 }}>Accept ?</span>
              <button type="button" onClick={handleSubmit} autoFocus
                style={{ ...S.btnYes, border: `1px solid ${colors.tab}`, borderRadius: 2, padding: '4px 18px', textDecoration: 'none', fontWeight: 700 }}>
                Yes
              </button>
              <span style={S.acceptOr}>or</span>
              <button type="button" onClick={() => setShowAcceptPopup(false)}
                style={{ ...S.btnNo, border: '1px solid #ddd', borderRadius: 2, padding: '4px 18px', textDecoration: 'none', fontWeight: 700 }}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Overlay ── */}
      {statusMsg?.type === 'ok' && (
        <div style={S.successOverlay}>
          <div style={{ ...S.successBox, borderColor: colors.header, animation: 'popIn 0.15s ease' }}>
            <div style={{ ...S.successCheck, background: colors.header }}>✓</div>
            <div style={S.successTitle}>Voucher Saved</div>
            <div style={S.successSub}>{statusMsg.text}</div>
            <button onClick={() => setStatusMsg(null)} style={S.successDismiss}>Click to dismiss</button>
          </div>
        </div>
      )}

      {/* ── Config Modal ── */}
      {showConfig && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <div style={{ ...S.titleBar, background: colors.header, borderRadius: '2px 2px 0 0' }}>
              <span style={S.titleLeft}>Voucher Configuration (F12)</span>
              {configSaved && (
                <span style={{ fontSize: 11, color: '#aaffaa', marginRight: 8, fontWeight: 600 }}>✓ Saved</span>
              )}
              <button style={S.titleClose} onClick={() => setShowConfig(false)}>✕</button>
            </div>
            <div style={{ padding: '12px 16px' }}>

              {/* Entry mode selector */}
              <div style={{ ...S.configRow, paddingBottom: 10, marginBottom: 6, borderBottom: '2px solid #eee' }}>
                <span style={{ ...S.configLabel, fontSize: 13 }}>Entry Mode</span>
                <div style={{ display: 'flex', gap: 0, border: `1px solid ${colors.tab}`, borderRadius: 3, overflow: 'hidden' }}>
                  {(['single', 'double'] as const).map(mode => (
                    <button key={mode}
                      onClick={() => {
                        if (config.entryMode !== mode) handleToggleEntryMode();
                        setShowConfig(false);
                      }}
                      style={{
                        padding: '4px 14px', fontSize: 12, fontWeight: 700,
                        fontFamily: FONT, cursor: 'pointer', border: 'none',
                        borderLeft: mode === 'double' ? `1px solid ${colors.tab}` : 'none',
                        background: config.entryMode === mode ? colors.tab : '#f5f5f5',
                        color: config.entryMode === mode ? '#fff' : '#555',
                      }}>
                      {mode === 'single' ? 'Single Entry' : 'Double Entry'}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { label: 'Use To/By Labels (instead of Dr/Cr)', key: 'useToBylabels' },
                { label: 'Show Bill-wise Details', key: 'showBillWise' },
                { label: 'Show Current Balance', key: 'showCurBalance' },
                { label: 'Warn on Negative Balance', key: 'warnNegative' },
              ].map(({ label, key }) => (
                <div key={key} style={S.configRow}>
                  <span style={S.configLabel}>{label}</span>
                  <button
                    onClick={() => updateConfig(p => ({ ...p, [key]: !(p as any)[key] }))}
                    style={{ ...S.configToggle, ...((config as any)[key] ? { background: colors.header, borderColor: colors.header, color: '#fff' } : {}) }}>
                    {(config as any)[key] ? 'Yes' : 'No'}
                  </button>
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 16px 12px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowConfig(false)} style={S.btnYes}>Accept</button>
              <button onClick={() => setShowConfig(false)} style={S.btnNo}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ledger Dropdown
// ─────────────────────────────────────────────────────────────────────────────
function LedgerDropdown({ items, highlighted, onSelect, balances, loading, headerBg = '#1f4e79' }: {
  items: any[]; highlighted: number; onSelect: (l: any) => void;
  balances: Record<string, any>; loading: Record<string, boolean>; headerBg?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current?.children[highlighted + 1] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  return (
    <div ref={listRef} style={ddStyles.dropdown}>
      <div style={{ ...ddStyles.ddHeader, background: headerBg }}>
        <span>List of Ledger Accounts</span>
        <span>Balance</span>
      </div>
      {items.length === 0 && (
        <div style={{ padding: '6px 8px', fontSize: 12, color: '#888', fontStyle: 'italic' }}>No matching accounts</div>
      )}
      {items.map((l: any, i: number) => {
        const cb = balances[l.id];
        const isLoad = loading[l.id];
        const bal = isLoad ? '...' : cb ? `${cb.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${cb.type}` : '';
        return (
          <div key={l.id} onMouseDown={() => onSelect(l)}
            className={`tly-dd-item${highlighted === i ? ' hl' : ''}`}
            style={ddStyles.ddItem}>
            <span style={{ fontWeight: 600 }}>{l.name}</span>
            <span style={{ color: '#555', fontSize: 11 }}>{bal}</span>
          </div>
        );
      })}
    </div>
  );
}

const ddStyles = {
  dropdown: {
    position: 'absolute' as const, zIndex: 200, left: 0, top: '100%',
    width: 460, background: '#fff', border: '1px solid #b0b8c4',
    boxShadow: '2px 4px 12px rgba(0,0,0,0.15)', maxHeight: 360,
    overflowY: 'auto' as const, animation: 'fadeIn 0.1s ease',
  },
  ddHeader: {
    display: 'flex', justifyContent: 'space-between' as const, color: '#fff',
    padding: '4px 8px', fontSize: 11, fontWeight: 700,
    position: 'sticky' as const, top: 0,
  },
  ddItem: {
    display: 'flex', justifyContent: 'space-between' as const,
    padding: '4px 8px', fontSize: 12, borderBottom: '1px solid #eee', cursor: 'pointer',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles builder
// ─────────────────────────────────────────────────────────────────────────────
function buildStyles(colors: typeof VOUCHER_STYLES.Payment) {
  const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
  const BORDER = '#b0b8c4';
  const ROW_BORDER = '#dde3ea';

  return {
    root: { fontFamily: FONT, fontSize: 13, color: '#1a1a1a', background: '#fff', display: 'flex', flexDirection: 'column' as const, height: '100%', border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden', userSelect: 'none' as const },
    titleBar: { background: colors.header, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', fontSize: 12, fontWeight: 600, letterSpacing: 0.2 },
    titleLeft: { flex: 1 },
    titleCenter: { flex: 2, textAlign: 'center' as const, fontWeight: 700 },
    titleClose: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '0 4px', lineHeight: 1, opacity: 0.8 },
    typeRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.bodyBg, borderBottom: `1px solid ${BORDER}`, padding: 0, transition: 'background 0.25s' },
    typeTab: { border: 'none', borderRight: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.5)', color: '#333', padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, transition: 'background 0.15s' },
    typeTabActive: { color: '#fff', fontWeight: 700 },
    voucherMeta: { display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px' },
    metaLabel: { fontSize: 12, color: '#555' },
    metaValue: { fontSize: 13, fontWeight: 700, color: '#222' },
    dateBlock: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', position: 'relative' as const },
    dateInput: { position: 'absolute' as const, opacity: 0, width: 1, height: 1, pointerEvents: 'none' as const },
    dateDisplay: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', cursor: 'pointer' },
    dateMain: { fontSize: 13, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 },
    dateDay: { fontSize: 11, color: '#666', lineHeight: 1.2 },
    statusBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', color: '#fff', fontSize: 12, fontWeight: 600 },
    statusClose: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 },
    body: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', transition: 'background 0.3s' },
    accountSection: { borderBottom: `1px solid ${BORDER}`, padding: '6px 12px 4px', transition: 'background 0.3s' },
    accountRow: { display: 'flex', alignItems: 'center', gap: 4 },
    curBalRow: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 },
    fieldLabelWide: { fontSize: 12, color: '#444', width: 130, flexShrink: 0, fontStyle: 'italic' },
    fieldLabel: { fontSize: 12, color: '#444', width: 110, flexShrink: 0, fontStyle: 'italic' },
    fieldColon: { fontSize: 12, color: '#444', marginRight: 6, flexShrink: 0 },
    accountInput: { border: 'none', borderBottom: '1px solid #999', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 700, fontFamily: FONT, color: '#1a1a1a', padding: '1px 2px', width: 280 },
    curBalValue: { fontSize: 12, color: '#1a1a1a', fontWeight: 600, fontStyle: 'italic' },
    tableWrap: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', borderBottom: `1px solid ${BORDER}` },
    tableHeader: { display: 'flex', background: 'rgba(0,0,0,0.06)', borderBottom: `1px solid ${BORDER}`, padding: '4px 0', fontSize: 12, fontWeight: 700, color: '#333' },
    tableBody: { flex: 1, overflowY: 'auto' as const },
    tableRow: { display: 'flex', borderBottom: `1px solid ${ROW_BORDER}`, minHeight: 32, transition: 'background 0.08s' },
    tableRowDE: { display: 'flex', borderBottom: `1px solid ${ROW_BORDER}`, minHeight: 32, transition: 'background 0.08s' },

    // Single entry columns
    colToBy: { width: 36, borderRight: `1px solid ${ROW_BORDER}`, flexShrink: 0 },
    colParticulars: { flex: 1, borderRight: `1px solid ${ROW_BORDER}`, padding: '4px 8px', fontSize: 12 },
    colAmount: { width: 130, padding: '4px 8px', fontSize: 12, textAlign: 'right' as const },

    // Double entry columns
    colToByDE: { width: 44, borderRight: `1px solid ${ROW_BORDER}`, flexShrink: 0 },
    colParticularsDE: { flex: 1, borderRight: `1px solid ${ROW_BORDER}`, padding: '4px 8px', fontSize: 12 },
    colAmountDE: { width: 120, padding: '4px 8px', fontSize: 12, textAlign: 'right' as const },

    ledgerInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 700, fontFamily: FONT, color: '#1a1a1a', width: '100%', padding: 0 },
    delBtn: { background: 'none', border: '1px solid #ddd', borderRadius: 2, color: '#c00', cursor: 'pointer', fontSize: 10, padding: '1px 4px', lineHeight: 1.4, flexShrink: 0, fontFamily: FONT },
    amountInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 700, fontFamily: FONT, color: '#1a1a1a', textAlign: 'right' as const, width: '100%', padding: 0 },
    curBalLine: { fontSize: 11, color: '#555', marginTop: 1, fontStyle: 'italic' },
    curBalLabel: { color: '#888', fontStyle: 'normal' },
    billWiseRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 },
    billWiseSelect: { border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontFamily: FONT, fontWeight: 600, cursor: 'pointer', padding: 0 },
    refInput: { border: 'none', borderBottom: '1px solid #aaa', background: 'transparent', outline: 'none', fontSize: 12, fontFamily: FONT, color: '#222', padding: '0 2px', width: 80 },
    totalRow: { display: 'flex', borderTop: `1px solid ${BORDER}` },
    narrationSection: { display: 'flex', alignItems: 'flex-start', gap: 4, padding: '6px 12px', borderBottom: `1px solid ${BORDER}`, transition: 'background 0.3s' },
    narrationInput: { flex: 1, border: 'none', borderBottom: '1px solid #ccc', background: 'transparent', outline: 'none', fontFamily: FONT, fontSize: 12, resize: 'none' as const, padding: '1px 2px', color: '#1a1a1a' },
    acceptBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderTop: `1px solid ${BORDER}`, fontSize: 12, transition: 'background 0.3s' },
    acceptLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    hintText: { fontSize: 11, color: '#777' },
    modeIndicator: { fontSize: 11, color: colors.accent, fontWeight: 700, background: `${colors.bodyBg}`, border: `1px solid ${colors.tab}30`, borderRadius: 2, padding: '1px 6px' },
    diffBadge: { background: '#fff0f0', border: '1px solid #f5a0a0', color: '#c00', borderRadius: 2, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
    balancedBadge: { background: '#f0fff4', border: '1px solid #90d0a0', color: '#0a6630', borderRadius: 2, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
    acceptButtons: { display: 'flex', alignItems: 'center', gap: 6 },
    acceptLabel: { fontSize: 13, fontWeight: 700, color: '#222', marginRight: 4 },
    acceptOr: { fontSize: 12, color: '#666' },
    btnYes: { background: 'none', border: 'none', color: '#0000cc', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: 'underline', padding: '2px 4px' },
    btnNo: { background: 'none', border: 'none', color: '#cc0000', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: 'underline', padding: '2px 4px' },
    successOverlay: { position: 'fixed' as const, inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' },
    successBox: { background: '#fff', borderWidth: 2, borderStyle: 'solid', borderRadius: 4, padding: '28px 36px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: 280 },
    successCheck: { width: 52, height: 52, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900 },
    successTitle: { fontSize: 15, fontWeight: 800, color: '#1a1a1a', textTransform: 'uppercase' as const, letterSpacing: 1 },
    successSub: { fontSize: 12, color: '#555', textAlign: 'center' as const },
    successDismiss: { marginTop: 4, background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: 11, fontFamily: FONT, textDecoration: 'underline' },
    modalOverlay: { position: 'fixed' as const, inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' },
    modal: { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: 380 },
    configRow: { display: 'flex', justifyContent: 'space-between' as const, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #eee' },
    configLabel: { fontSize: 12, color: '#333', fontWeight: 600 },
    configToggle: { border: '1px solid #bbb', borderRadius: 2, background: '#f5f5f5', color: '#555', padding: '2px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT },
  };
}
