/**
 * TallyPrime-style Voucher Entry Screen
 * Updated: removed Sales/Purchase, auto-account focus, per-type bg colors,
 * double-Enter→Narration, Accept popup on save
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_ENTRY = {
  ledgerId: '',
  costCentreId: '',
  amount: '',
  type: 'Dr',
  tempSearch: '',
  methodAdjustment: 'On Account',
  refNo: '',
};

// ── Per-type subtle background colors (muted, slightly glossy feel)
const VOUCHER_STYLES = {
  Contra:  { header: '#1f4e79', tab: '#2e75b6', bodyBg: '#f0f4f8', rowBg: '#f7f9fb', accent: '#2e75b6' },
  Payment: { header: '#2d4a22', tab: '#4a7c3f', bodyBg: '#f0f5f0', rowBg: '#f6faf5', accent: '#4a7c3f' },
  Receipt: { header: '#4a2222', tab: '#8b3a3a', bodyBg: '#fdf0f0', rowBg: '#fdf6f6', accent: '#8b3a3a' },
  Journal: { header: '#3d3225', tab: '#7a6040', bodyBg: '#f8f4ee', rowBg: '#faf7f2', accent: '#7a6040' },
};

export default function VoucherScreen({
  branchId,
  onTypeChange,
  initialType,
  initialDate,
  user,
  companyName = ' ',
}) {
  const [ledgers, setLedgers] = useState([]);
  const [costCentres, setCostCentres] = useState([]);
  const [type, setType] = useState(initialType || 'Payment');
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState([{ ...DEFAULT_ENTRY }]);
  const [accountLedgerId, setAccountLedgerId] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [activeDropdownIdx, setActiveDropdownIdx] = useState(null);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [currentBalances, setCurrentBalances] = useState({});
  const [loadingBalance, setLoadingBalance] = useState({});
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({ useDrCr: false, singleEntry: true, showBillWise: true });
  const [voucherNo, setVoucherNo] = useState(2);
  const [statusMsg, setStatusMsg] = useState(null);
  const [focusedRowIdx, setFocusedRowIdx] = useState(null);
  const [showAcceptPopup, setShowAcceptPopup] = useState(false);
  // Track consecutive Enter presses on last entry's amount
  const enterCountRef = useRef(0);

  const dateRef = useRef(null);
  const narrationRef = useRef(null);
  const accountRef = useRef(null);

  const colors = VOUCHER_STYLES[type] || VOUCHER_STYLES.Payment;

  const formatTallyDate = (iso) => {
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
  };

  const getDayName = (iso) => {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return days[new Date(iso).getDay()];
  };

  // ── Fetch data
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/ledgers${q}`).then(r => r.json()).then(setLedgers).catch(() => {});
    fetch(`/api/cost-centres${q}`).then(r => r.json()).then(setCostCentres).catch(() => {});
  }, [branchId]);

  // ── Auto-focus account field on mount
  useEffect(() => {
    setTimeout(() => {
      if (config.singleEntry) {
        accountRef.current?.focus();
      } else {
        document.getElementById('ledger-0')?.focus();
      }
    }, 100);
  }, []);

  // ── Fetch balance
  const fetchCurrentBalance = useCallback(async (ledgerId) => {
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
      const ledger = ledgers.find(l => l.id === ledgerId);
      const ob = Number(ledger?.openingBalance || 0);
      const signed = ledger?.balanceType === 'Cr' ? -ob : ob;
      setCurrentBalances(p => ({ ...p, [ledgerId]: { balance: Math.abs(signed), type: signed >= 0 ? 'Dr' : 'Cr' } }));
    } catch {
      const ledger = ledgers.find(l => l.id === ledgerId);
      const ob = Number(ledger?.openingBalance || 0);
      const signed = ledger?.balanceType === 'Cr' ? -ob : ob;
      setCurrentBalances(p => ({ ...p, [ledgerId]: { balance: Math.abs(signed), type: signed >= 0 ? 'Dr' : 'Cr' } }));
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

  useEffect(() => { if (initialType) setType(initialType); }, [initialType]);
  useEffect(() => { if (initialDate) setDate(initialDate); }, [initialDate]);

  // ── Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); setShowAcceptPopup(true); return; }
      if (e.key === 'F12') { e.preventDefault(); setShowConfig(true); return; }
      if (e.altKey && e.key.toLowerCase() === 'a') { e.preventDefault(); handleAddEntry(); return; }
      if (e.altKey && e.key.toLowerCase() === 'r') { e.preventDefault(); handleClear(); return; }
      if (e.key === 'F2') { e.preventDefault(); dateRef.current?.focus(); dateRef.current?.select(); return; }
      if (e.ctrlKey && e.key.toLowerCase() === 'd' && inInput) {
        e.preventDefault();
        if (focusedRowIdx !== null && entries.length > 1) {
          const nf = Math.max(0, focusedRowIdx - 1);
          setEntries(prev => prev.filter((_, i) => i !== focusedRowIdx));
          setTimeout(() => document.getElementById(`ledger-${nf}`)?.focus(), 30);
        }
        return;
      }
      if (!inInput) {
        if (e.key === 'F4') { e.preventDefault(); handleTypeChange('Contra'); }
        if (e.key === 'F5') { e.preventDefault(); handleTypeChange('Payment'); }
        if (e.key === 'F6') { e.preventDefault(); handleTypeChange('Receipt'); }
        if (e.key === 'F7') { e.preventDefault(); handleTypeChange('Journal'); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [entries, date, narration, type, config, focusedRowIdx]);

  // ── Helpers
  const getFilteredLedgers = (search) => {
    const s = (search || '').toLowerCase();
    return ledgers.filter(l => l.name.toLowerCase().includes(s));
  };

  const formatBalance = (ledgerId) => {
    const cb = currentBalances[ledgerId];
    if (loadingBalance[ledgerId]) return '...';
    if (!cb) return '';
    return `${cb.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${cb.type}`;
  };

  const calcTotal = (side) =>
    entries.filter(e => !side || e.type === side).reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const drTotal = calcTotal('Dr');
  const crTotal = calcTotal('Cr');
  const diff = Math.abs(drTotal - crTotal);
  const isBalanced = diff < 0.01;

  // ── Entry management
  const handleAddEntry = () => {
    const nextType = drTotal > crTotal ? 'Cr' : 'Dr';
    const nextAmt = diff > 0 ? diff.toString() : '';
    setEntries(prev => [...prev, { ...DEFAULT_ENTRY, type: nextType, amount: nextAmt }]);
    setTimeout(() => document.getElementById(`ledger-${entries.length}`)?.focus(), 30);
  };

  const handleRemoveEntry = (idx) => {
    if (entries.length > 1) setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSelectLedger = (idx, ledger) => {
    setEntries(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ledgerId: ledger.id, tempSearch: ledger.name };
      if (idx > 0) {
        const dr = next.slice(0, idx).filter(e => e.type === 'Dr').reduce((a, e) => a + Number(e.amount || 0), 0);
        const cr = next.slice(0, idx).filter(e => e.type === 'Cr').reduce((a, e) => a + Number(e.amount || 0), 0);
        next[idx].type = dr > cr ? 'Cr' : 'Dr';
      }
      return next;
    });
    setActiveDropdownIdx(null);
    fetchCurrentBalance(ledger.id);
    setTimeout(() => document.getElementById(`amount-${idx}`)?.focus(), 20);
  };

  const handleSelectAccount = (ledger) => {
    setAccountLedgerId(ledger.id);
    setAccountSearch(ledger.name);
    setShowAccountDropdown(false);
    fetchCurrentBalance(ledger.id);
    setTimeout(() => document.getElementById('ledger-0')?.focus(), 20);
  };

  // ── Keyboard nav for entry rows
  const handleEntryKeyDown = (e, idx, field) => {
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
        // Double Enter on last row → go to narration instead of adding new row
        if (idx === entries.length - 1) {
          enterCountRef.current += 1;
          if (enterCountRef.current >= 2) {
            enterCountRef.current = 0;
            narrationRef.current?.focus();
          }
          // First Enter: do nothing extra (stay on amount or move to narration on 2nd)
        } else {
          enterCountRef.current = 0;
          document.getElementById(`ledger-${idx + 1}`)?.focus();
        }
        return;
      }
      // Reset enter count on any other key
      enterCountRef.current = 0;
    }
  };

  const handleAccountKeyDown = (e) => {
    const filtered = getFilteredLedgers(accountSearch);
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(p => Math.min(filtered.length - 1, p + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx(p => Math.max(0, p - 1)); }
    if ((e.key === 'Enter' || e.key === 'Tab') && showAccountDropdown && filtered[highlightedIdx]) { e.preventDefault(); handleSelectAccount(filtered[highlightedIdx]); }
    if (e.key === 'Escape') setShowAccountDropdown(false);
  };

  // ── Type change
  const handleTypeChange = (t) => {
    setType(t);
    if (onTypeChange) onTypeChange(t);
    setEntries([{ ...DEFAULT_ENTRY, type: t === 'Receipt' ? 'Cr' : 'Dr' }]);
    setAccountLedgerId('');
    setAccountSearch('');
    enterCountRef.current = 0;
    // Re-focus account field after type switch
    setTimeout(() => {
      if (config.singleEntry) accountRef.current?.focus();
      else document.getElementById('ledger-0')?.focus();
    }, 50);
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

  // ── Submit (called after Accept → Yes)
  const handleSubmit = async () => {
    setShowAcceptPopup(false);
    const validEntries = entries.filter(e => e.ledgerId && e.amount);
    if (validEntries.length === 0) { showStatus('Voucher is empty — enter at least one amount.', 'err'); return; }

    let finalEntries;
    if (config.singleEntry && type !== 'Journal') {
      if (!accountLedgerId) { showStatus('Please select an Account (Cash/Bank).', 'err'); return; }
      const side = type === 'Receipt' ? 'Dr' : 'Cr';
      const otherSide = type === 'Receipt' ? 'Cr' : 'Dr';
      const total = validEntries.reduce((a, e) => a + Number(e.amount), 0);
      finalEntries = [
        ...validEntries.map(e => ({ ledgerId: e.ledgerId, costCentreId: e.costCentreId || null, amount: Number(e.amount), type: otherSide, methodAdjustment: e.methodAdjustment, refNo: e.refNo })),
        { ledgerId: accountLedgerId, costCentreId: null, amount: total, type: side, methodAdjustment: 'On Account', refNo: '' },
      ];
    } else {
      if (!isBalanced) { showStatus(`Dr ₹${drTotal.toFixed(2)} ≠ Cr ₹${crTotal.toFixed(2)} — difference ₹${diff.toFixed(2)}`, 'err'); return; }
      finalEntries = validEntries.map(e => ({ ledgerId: e.ledgerId, costCentreId: e.costCentreId || null, amount: Number(e.amount), type: e.type, methodAdjustment: e.methodAdjustment, refNo: e.refNo }));
    }

    try {
      const payload = { date, type, number: `VCH-${voucherNo}`, narration, amount: drTotal, branchId: branchId || 'HQ', userId: user?.id, username: user?.username, entries: finalEntries };
      const res = await fetch('/api/vouchers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (res.ok) {
        showStatus(`Voucher VCH-${voucherNo} saved successfully!`, 'ok');
        setCurrentBalances({});
        setEntries([{ ...DEFAULT_ENTRY, type: type === 'Receipt' ? 'Cr' : 'Dr' }]);
        setNarration('');
        setAccountLedgerId('');
        setAccountSearch('');
        setVoucherNo(p => p + 1);
        enterCountRef.current = 0;
      } else {
        showStatus(result.error || 'Server error', 'err');
      }
    } catch (err) {
      showStatus(err.message, 'err');
    }
  };

  const showStatus = (text, kind) => {
    setStatusMsg({ text, type: kind });
    if (kind === 'ok') setTimeout(() => setStatusMsg(null), 3000);
  };

  // ── Styles (dynamic based on type)
  const S = buildStyles(colors);

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
      `}</style>

      {/* Title Bar */}
      <div style={S.titleBar}>
        <span style={S.titleLeft}>Accounting Voucher Creation</span>
        <span style={S.titleCenter}>{companyName}</span>
        <button style={S.titleClose} onClick={() => {}}>✕</button>
      </div>

      {/* Voucher Type Tab + Date — only Contra, Payment, Receipt, Journal */}
      <div style={S.typeRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {['Contra','Payment','Receipt','Journal'].map(t => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              style={{
                ...S.typeTab,
                ...(type === t ? { ...S.typeTabActive, background: colors.tab } : {}),
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={S.voucherMeta}>
          <span style={S.metaLabel}>No.</span>
          <span style={S.metaValue}>{voucherNo}</span>
          <div style={S.dateBlock}>
            <input
              ref={dateRef}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); (config.singleEntry ? accountRef.current : document.getElementById('ledger-0'))?.focus(); } }}
              style={S.dateInput}
            />
            <div style={S.dateDisplay} onClick={() => dateRef.current?.focus()}>
              <span style={S.dateMain}>{formatTallyDate(date)}</span>
              <span style={S.dateDay}>{getDayName(date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {statusMsg && statusMsg.type !== 'ok' && (
        <div style={{ ...S.statusBar, background: statusMsg.type === 'err' ? '#c00000' : '#003087' }}>
          <span>{statusMsg.type === 'err' ? '✗  ' : 'ℹ  '}{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} style={S.statusClose}>✕</button>
        </div>
      )}

      {/* Main Body */}
      <div style={{ ...S.body, background: colors.bodyBg }}>

        {/* Account Field */}
        {config.singleEntry && type !== 'Journal' && (
          <div style={{ ...S.accountSection, background: colors.rowBg }}>
            <div style={S.accountRow}>
              <span style={S.fieldLabel}>Account</span>
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
                  placeholder="Start typing to search account..."
                  autoComplete="off"
                  autoFocus
                />
                {showAccountDropdown && (
                  <LedgerDropdown
                    items={getFilteredLedgers(accountSearch)}
                    highlighted={highlightedIdx}
                    onSelect={handleSelectAccount}
                    balances={currentBalances}
                    loading={loadingBalance}
                    headerBg={colors.header}
                  />
                )}
              </div>
            </div>
            {accountLedgerId && (
              <div style={S.curBalRow}>
                <span style={S.fieldLabel}>Current balance</span>
                <span style={S.fieldColon}>:</span>
                <span style={S.curBalValue}>{formatBalance(accountLedgerId)}</span>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div style={S.tableWrap}>
          <div style={S.tableHeader}>
            <div style={S.colParticulars}>Particulars</div>
            <div style={S.colAmount}>Amount</div>
          </div>

          <div style={S.tableBody}>
            {entries.map((entry, idx) => {
              const cb = currentBalances[entry.ledgerId];
              const isLoad = loadingBalance[entry.ledgerId];
              const filtered = getFilteredLedgers(entry.tempSearch || '');
              const ledgerName = entry.tempSearch || ledgers.find(l => l.id === entry.ledgerId)?.name || '';

              return (
                <div key={idx}>
                  <div
                    className={`tly-row${activeDropdownIdx === idx ? ' active' : ''}`}
                    style={{ ...S.tableRow, background: colors.rowBg }}
                  >
                    <div style={{ ...S.colParticulars, position: 'relative', padding: '4px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          id={`ledger-${idx}`}
                          type="text"
                          value={ledgerName}
                          onChange={e => {
                            const match = ledgers.find(l => l.name.toLowerCase() === e.target.value.toLowerCase());
                            setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], tempSearch: e.target.value, ledgerId: match ? match.id : ''}; return n; });
                            setActiveDropdownIdx(idx);
                            setHighlightedIdx(0);
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

                      {entry.ledgerId && (
                        <div style={S.curBalLine}>
                          <span style={S.curBalLabel}>Cur Bal: </span>
                          {isLoad ? <span style={{ color: '#666' }}>...</span> : cb ? <span style={{ color: '#555' }}>{cb.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {cb.type}</span> : null}
                        </div>
                      )}

                      {config.showBillWise && entry.ledgerId && (
                        <div style={S.billWiseRow}>
                          <select
                            value={entry.methodAdjustment}
                            onChange={e => { setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], methodAdjustment: e.target.value}; return n; }); }}
                            style={{ ...S.billWiseSelect, color: colors.accent }}
                          >
                            {['Advance','Against Ref','New Ref','On Account'].map(m => <option key={m}>{m}</option>)}
                          </select>
                          {(entry.methodAdjustment === 'New Ref' || entry.methodAdjustment === 'Against Ref') && (
                            <input
                              type="text"
                              value={entry.refNo}
                              onChange={e => { setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], refNo: e.target.value}; return n; }); }}
                              style={S.refInput}
                              placeholder="Ref No."
                            />
                          )}
                        </div>
                      )}

                      {activeDropdownIdx === idx && (
                        <LedgerDropdown
                          items={filtered}
                          highlighted={highlightedIdx}
                          onSelect={l => handleSelectLedger(idx, l)}
                          balances={currentBalances}
                          loading={loadingBalance}
                          headerBg={colors.header}
                        />
                      )}
                    </div>

                    <div style={{ ...S.colAmount, padding: '4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                      <input
                        id={`amount-${idx}`}
                        type="number"
                        value={entry.amount}
                        onChange={e => { setEntries(prev => { const n=[...prev]; n[idx]={...n[idx], amount: e.target.value}; return n; }); }}
                        onFocus={() => { setFocusedRowIdx(idx); enterCountRef.current = 0; }}
                        onKeyDown={e => handleEntryKeyDown(e, idx, 'amount')}
                        style={S.amountInput}
                        placeholder="0.00"
                      />
                      {entry.ledgerId && config.showBillWise && entry.amount && (
                        <span style={S.amountDrCr}>{entry.amount} {entry.type}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty rows */}
            {Array.from({ length: Math.max(0, 6 - entries.length) }).map((_, i) => (
              <div key={`empty-${i}`} style={{ ...S.tableRow, background: colors.rowBg, minHeight: 28, cursor: 'pointer' }}
                onClick={i === 0 ? handleAddEntry : undefined}
              />
            ))}
          </div>

          {/* Total row */}
          <div style={{ ...S.totalRow, background: colors.bodyBg }}>
            <div style={S.colParticulars} />
            <div style={{ ...S.colAmount, padding: '3px 8px', fontWeight: 700, fontSize: 12, borderTop: '1px solid #bbb', textAlign: 'right' }}>
              {drTotal > 0 ? drTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </div>
          </div>
        </div>

        {/* Narration */}
        <div style={{ ...S.narrationSection, background: colors.rowBg }}>
          <span style={{ ...S.fieldLabel, paddingTop: 3 }}>Narration</span>
          <span style={S.fieldColon}>:</span>
          <textarea
            ref={narrationRef}
            value={narration}
            onChange={e => setNarration(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setShowAcceptPopup(true); }
            }}
            rows={2}
            style={S.narrationInput}
            placeholder="Enter narration here..."
          />
        </div>
      </div>

      {/* Accept / Reject Bar */}
      <div style={{ ...S.acceptBar, background: colors.bodyBg }}>
        <div style={S.acceptLeft}>
          {!isBalanced && drTotal > 0 && (
            <span style={S.diffBadge}>Difference: ₹{diff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          )}
          {isBalanced && drTotal > 0 && (
            <span style={S.balancedBadge}>✓ Balanced</span>
          )}
          <span style={S.hintText}>Ctrl+Enter to Accept  |  Alt+A to Add Line  |  F12 Config</span>
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
          <div style={{ ...S.modal, width: 340, animation: 'popIn 0.15s ease' }}>
            <div style={{ ...S.titleBar, background: colors.header, borderRadius: '3px 3px 0 0' }}>
              <span style={S.titleLeft}>Accept Voucher</span>
              <button style={S.titleClose} onClick={() => setShowAcceptPopup(false)}>✕</button>
            </div>
            <div style={{ padding: '18px 20px 10px', fontSize: 13, color: '#333' }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Voucher Type:</strong> {type} &nbsp;|&nbsp; <strong>No.:</strong> VCH-{voucherNo}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Date:</strong> {formatTallyDate(date)} ({getDayName(date)})
              </div>
              {accountLedgerId && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Account:</strong> {accountSearch}
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <strong>Amount:</strong> ₹{drTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              {narration && (
                <div style={{ marginBottom: 4, fontSize: 12, color: '#555', fontStyle: 'italic' }}>
                  "{narration}"
                </div>
              )}
              {!isBalanced && type === 'Journal' && (
                <div style={{ color: '#c00', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                  ⚠ Voucher is not balanced (Diff: ₹{diff.toFixed(2)})
                </div>
              )}
            </div>
            <div style={{ padding: '10px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #eee' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#222', marginRight: 4 }}>Accept ?</span>
              <button
                type="button"
                onClick={handleSubmit}
                style={{ ...S.btnYes, border: `1px solid ${colors.tab}`, borderRadius: 2, padding: '4px 18px', textDecoration: 'none', fontWeight: 700 }}
                autoFocus
              >Yes</button>
              <span style={S.acceptOr}>or</span>
              <button
                type="button"
                onClick={() => setShowAcceptPopup(false)}
                style={{ ...S.btnNo, border: '1px solid #ddd', borderRadius: 2, padding: '4px 18px', textDecoration: 'none', fontWeight: 700 }}
              >No</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Overlay */}
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

      {/* Error status */}
      {statusMsg && statusMsg.type === 'err' && (
        <div style={{ ...S.statusBar, background: '#c00000', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 400 }}>
          <span>✗  {statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} style={S.statusClose}>✕</button>
        </div>
      )}

      {/* Config Modal */}
      {showConfig && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <div style={{ ...S.titleBar, background: colors.header, borderRadius: '2px 2px 0 0' }}>
              <span style={S.titleLeft}>Voucher Configuration (F12)</span>
              <button style={S.titleClose} onClick={() => setShowConfig(false)}>✕</button>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {[
                { label: 'Use Dr/Cr instead of To/By', key: 'useDrCr' },
                { label: 'Use Single Entry Mode', key: 'singleEntry' },
                { label: 'Show Bill-wise Details', key: 'showBillWise' },
              ].map(({ label, key }) => (
                <div key={key} style={S.configRow}>
                  <span style={S.configLabel}>{label}</span>
                  <button
                    onClick={() => setConfig(p => ({ ...p, [key]: !p[key] }))}
                    style={{ ...S.configToggle, ...(config[key] ? { background: colors.header, borderColor: colors.header, color: '#fff' } : {}) }}
                  >{config[key] ? 'Yes' : 'No'}</button>
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

// ── Ledger Dropdown
function LedgerDropdown({ items, highlighted, onSelect, balances, loading, headerBg = '#1f4e79' }) {
  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current?.children[highlighted + 1];
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
      {items.map((l, i) => {
        const cb = balances[l.id];
        const isLoad = loading[l.id];
        const bal = isLoad ? '...' : cb ? `${cb.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${cb.type}` : '';
        return (
          <div
            key={l.id}
            onMouseDown={() => onSelect(l)}
            className={`tly-dd-item${highlighted === i ? ' hl' : ''}`}
            style={ddStyles.ddItem}
          >
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
    position: 'absolute',
    zIndex: 200,
    left: 0,
    top: '100%',
    width: 460,
    background: '#fff',
    border: '1px solid #b0b8c4',
    boxShadow: '2px 4px 12px rgba(0,0,0,0.15)',
    maxHeight: 260,
    overflowY: 'auto',
    animation: 'fadeIn 0.1s ease',
  },
  ddHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#fff',
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 700,
    position: 'sticky',
    top: 0,
  },
  ddItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 8px',
    fontSize: 12,
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
  },
};

// ── Dynamic styles builder
function buildStyles(colors) {
  const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
  const BORDER = '#b0b8c4';
  const ROW_BORDER = '#dde3ea';

  return {
    root: {
      fontFamily: FONT,
      fontSize: 13,
      color: '#1a1a1a',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      border: `1px solid ${BORDER}`,
      borderRadius: 2,
      overflow: 'hidden',
      userSelect: 'none',
    },
    titleBar: {
      background: colors.header,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '4px 8px',
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: 0.2,
    },
    titleLeft: { flex: 1 },
    titleCenter: { flex: 2, textAlign: 'center', fontWeight: 700 },
    titleClose: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '0 4px', lineHeight: 1, opacity: 0.8 },
    typeRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: colors.bodyBg,
      borderBottom: `1px solid ${BORDER}`,
      padding: 0,
      transition: 'background 0.25s',
    },
    typeTab: {
      border: 'none',
      borderRight: `1px solid ${BORDER}`,
      background: 'rgba(255,255,255,0.5)',
      color: '#333',
      padding: '5px 14px',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: FONT,
      transition: 'background 0.15s',
    },
    typeTabActive: { color: '#fff', fontWeight: 700 },
    voucherMeta: { display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px' },
    metaLabel: { fontSize: 12, color: '#555' },
    metaValue: { fontSize: 13, fontWeight: 700, color: '#222' },
    dateBlock: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' },
    dateInput: { position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' },
    dateDisplay: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', cursor: 'pointer' },
    dateMain: { fontSize: 13, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 },
    dateDay: { fontSize: 11, color: '#666', lineHeight: 1.2 },
    statusBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '4px 12px',
      color: '#fff',
      fontSize: 12,
      fontWeight: 600,
    },
    statusClose: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 },
    body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'background 0.3s' },
    accountSection: { borderBottom: `1px solid ${BORDER}`, padding: '6px 12px 4px', transition: 'background 0.3s' },
    accountRow: { display: 'flex', alignItems: 'center', gap: 4 },
    curBalRow: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 },
    fieldLabel: { fontSize: 12, color: '#444', width: 110, flexShrink: 0, fontStyle: 'italic' },
    fieldColon: { fontSize: 12, color: '#444', marginRight: 6, flexShrink: 0 },
    accountInput: {
      border: 'none',
      borderBottom: '1px solid #999',
      background: 'transparent',
      outline: 'none',
      fontSize: 13,
      fontWeight: 700,
      fontFamily: FONT,
      color: '#1a1a1a',
      padding: '1px 2px',
      width: 280,
    },
    curBalValue: { fontSize: 12, color: '#1a1a1a', fontWeight: 600, fontStyle: 'italic' },
    tableWrap: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderBottom: `1px solid ${BORDER}` },
    tableHeader: {
      display: 'flex',
      background: 'rgba(0,0,0,0.06)',
      borderBottom: `1px solid ${BORDER}`,
      padding: '4px 0',
      fontSize: 12,
      fontWeight: 700,
      color: '#333',
    },
    tableBody: { flex: 1, overflowY: 'auto' },
    tableRow: {
      display: 'flex',
      borderBottom: `1px solid ${ROW_BORDER}`,
      minHeight: 32,
      transition: 'background 0.08s',
    },
    colParticulars: { flex: 1, borderRight: `1px solid ${ROW_BORDER}`, padding: '4px 8px', fontSize: 12 },
    colAmount: { width: 140, padding: '4px 8px', fontSize: 12, textAlign: 'right' },
    ledgerInput: {
      border: 'none',
      background: 'transparent',
      outline: 'none',
      fontSize: 13,
      fontWeight: 700,
      fontFamily: FONT,
      color: '#1a1a1a',
      width: '100%',
      padding: 0,
    },
    delBtn: {
      background: 'none',
      border: '1px solid #ddd',
      borderRadius: 2,
      color: '#c00',
      cursor: 'pointer',
      fontSize: 10,
      padding: '1px 4px',
      lineHeight: 1.4,
      flexShrink: 0,
      fontFamily: FONT,
    },
    amountInput: {
      border: 'none',
      background: 'transparent',
      outline: 'none',
      fontSize: 13,
      fontWeight: 700,
      fontFamily: FONT,
      color: '#1a1a1a',
      textAlign: 'right',
      width: '100%',
      padding: 0,
    },
    amountDrCr: { fontSize: 11, color: '#444', marginTop: 1 },
    curBalLine: { fontSize: 11, color: '#555', marginTop: 1, fontStyle: 'italic' },
    curBalLabel: { color: '#888', fontStyle: 'normal' },
    billWiseRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 },
    billWiseSelect: { border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontFamily: FONT, fontWeight: 600, cursor: 'pointer', padding: 0 },
    refInput: { border: 'none', borderBottom: '1px solid #aaa', background: 'transparent', outline: 'none', fontSize: 12, fontFamily: FONT, color: '#222', padding: '0 2px', width: 80 },
    totalRow: { display: 'flex', borderTop: `1px solid ${BORDER}` },
    narrationSection: { display: 'flex', alignItems: 'flex-start', gap: 4, padding: '6px 12px', borderBottom: `1px solid ${BORDER}`, transition: 'background 0.3s' },
    narrationInput: { flex: 1, border: 'none', borderBottom: '1px solid #ccc', background: 'transparent', outline: 'none', fontFamily: FONT, fontSize: 12, resize: 'none', padding: '1px 2px', color: '#1a1a1a' },
    acceptBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderTop: `1px solid ${BORDER}`, fontSize: 12, transition: 'background 0.3s' },
    acceptLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    hintText: { fontSize: 11, color: '#777' },
    diffBadge: { background: '#fff0f0', border: '1px solid #f5a0a0', color: '#c00', borderRadius: 2, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
    balancedBadge: { background: '#f0fff4', border: '1px solid #90d0a0', color: '#0a6630', borderRadius: 2, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
    acceptButtons: { display: 'flex', alignItems: 'center', gap: 6 },
    acceptLabel: { fontSize: 13, fontWeight: 700, color: '#222', marginRight: 4 },
    acceptOr: { fontSize: 12, color: '#666' },
    btnYes: { background: 'none', border: 'none', color: '#0000cc', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: 'underline', padding: '2px 4px' },
    btnNo: { background: 'none', border: 'none', color: '#cc0000', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: 'underline', padding: '2px 4px' },
    successOverlay: { position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' },
    successBox: { background: '#fff', border: `2px solid ${colors.header}`, borderRadius: 4, padding: '28px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: 280 },
    successCheck: { width: 52, height: 52, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900 },
    successTitle: { fontSize: 15, fontWeight: 800, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 1 },
    successSub: { fontSize: 12, color: '#555', textAlign: 'center' },
    successDismiss: { marginTop: 4, background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: 11, fontFamily: FONT, textDecoration: 'underline' },
    modalOverlay: { position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' },
    modal: { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: 380 },
    configRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #eee' },
    configLabel: { fontSize: 12, color: '#333', fontWeight: 600 },
    configToggle: { border: '1px solid #bbb', borderRadius: 2, background: '#f5f5f5', color: '#555', padding: '2px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT },
  };
}
