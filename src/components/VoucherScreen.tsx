/**
 * TallyPrime-style Chart of Accounts
 * - Flat ledger list with S.No., Name of Ledger, Under (group), Opening Balance, Dr/Cr
 * - Edit Opening Balance modal (inline alteration panel)
 * - Keyboard navigation: ↑↓ Arrow, Enter to open, Esc to close
 * - Right function button panel (F2–F12)
 * - Filter by group (Under Group dropdown)
 * 
 * Scaled & styled with responsive vertical padding rows to span exactly 100% height to the bottom.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
// VoucherScreen is consolidated inline within this file at the bottom

interface Ledger {
  id: string;
  name: string;
  group_id?: string;
  group_name?: string;
  group?: string;
  openingBalance?: number;
  balanceType?: 'Dr' | 'Cr';
}

interface AccountGroup {
  id: string;
  name: string;
  parent_id?: string | null;
}

interface Branch {
  id: string;
  name: string;
}

interface ChartOfAccountsScreenProps {
  branchId?: string;
}

const FONT    = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
const HDR_BG  = '#1f4e79';
const YELLOW  = '#ffd966';
const BORDER  = '#b8c4cc';
const LIGHT   = '#f0f4f8';
const ROW_BDR = '#e0e6ee';
const DARK_PANEL = '#1a2a3a';

function fmtAmt(n: number) {
  return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// ─── LocalStorage Persistence Fallbacks ──────────────────────────────────────
const LOCAL_STORAGE_KEY_LEDGERS = 'tally_ledgers_v1';

const INITIAL_LEDGERS: Ledger[] = [
  { id: '1', name: 'Capital Account', group_name: 'Capital Account', openingBalance: 500000, balanceType: 'Cr' },
  { id: '2', name: 'Cash-in-Hand', group_name: 'Cash-in-Hand', openingBalance: 25000, balanceType: 'Dr' },
  { id: '3', name: 'HDFC Bank A/c', group_name: 'Bank Accounts', openingBalance: 420000, balanceType: 'Dr' },
  { id: '4', name: 'Office Rent A/c', group_name: 'Indirect Expenses', openingBalance: 15000, balanceType: 'Dr' },
  { id: '5', name: 'Salary Paid', group_name: 'Indirect Expenses', openingBalance: 180000, balanceType: 'Dr' },
  { id: '6', name: 'Sales A/c', group_name: 'Sales Accounts', openingBalance: 0, balanceType: 'Cr' },
  { id: '7', name: 'Purchase A/c', group_name: 'Purchase Accounts', openingBalance: 0, balanceType: 'Dr' },
  { id: '8', name: 'Prism Distributors', group_name: 'Sundry Creditors', openingBalance: 45000, balanceType: 'Cr' },
  { id: '9', name: 'Aakash Retail Store', group_name: 'Sundry Debtors', openingBalance: 28000, balanceType: 'Dr' },
  { id: '10', name: 'Office Furniture', group_name: 'Fixed Assets', openingBalance: 75000, balanceType: 'Dr' },
  { id: '11', name: 'GST Payable', group_name: 'Duties & Taxes', openingBalance: 12500, balanceType: 'Cr' },
  { id: '12', name: 'Internet & Telephone A/c', group_name: 'Indirect Expenses', openingBalance: 5600, balanceType: 'Dr' },
  { id: '13', name: 'Electricity Charges A/c', group_name: 'Indirect Expenses', openingBalance: 14200, balanceType: 'Dr' },
  { id: '14', name: 'SBI Current A/c', group_name: 'Bank Accounts', openingBalance: 195000, balanceType: 'Dr' },
  { id: '15', name: 'Petty Cash', group_name: 'Cash-in-Hand', openingBalance: 4500, balanceType: 'Dr' },
];

// ─── Edit Opening Balance Modal ───────────────────────────────────────────────
interface EditOBModalProps {
  ledger: Ledger;
  onSave: (id: string, amount: number, type: 'Dr' | 'Cr') => void;
  onCancel: () => void;
}

function EditOBModal({ ledger, onSave, onCancel }: EditOBModalProps) {
  const [amount, setAmount]     = useState(String(Math.abs(ledger.openingBalance || 0)));
  const [balType, setBalType]   = useState<'Dr' | 'Cr'>(ledger.balanceType || 'Dr');
  const amtRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amtRef.current?.focus();
    amtRef.current?.select();
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onCancel]);

  const handleSave = () => {
    const parsed = parseFloat(amount.replace(/,/g, '')) || 0;
    onSave(ledger.id, parsed, balType);
  };

  return (
    <div style={ms.overlay}>
      <div style={ms.modal}>
        {/* Title */}
        <div style={ms.title}>
          <span>Ledger Alteration</span>
          <span style={{ opacity: 0.6, fontSize: 10 }}>Opening Balance</span>
        </div>

        {/* Ledger info */}
        <div style={ms.infoRow}>
          <div style={ms.infoItem}>
            <span style={ms.infoLabel}>Name</span>
            <span style={ms.infoVal}>{ledger.name}</span>
          </div>
          <div style={ms.infoItem}>
            <span style={ms.infoLabel}>Under</span>
            <span style={ms.infoVal}>{ledger.group_name || ledger.group || '—'}</span>
          </div>
        </div>

        <div style={ms.divider} />

        {/* Fields */}
        <div style={ms.fieldWrap}>
          <div style={ms.fieldRow}>
            <label style={ms.label}>Opening Balance</label>
            <input
              ref={amtRef}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              style={ms.input}
              placeholder="0.00"
            />
          </div>
          <div style={ms.fieldRow}>
            <label style={ms.label}>Balance Type</label>
            <div style={ms.drCrWrap}>
              {(['Dr', 'Cr'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setBalType(t)}
                  style={{
                    ...ms.drCrBtn,
                    background: balType === t ? (t === 'Dr' ? '#7a0000' : '#006b00') : '#f0f4f8',
                    color: balType === t ? '#fff' : '#333',
                    borderColor: balType === t ? (t === 'Dr' ? '#7a0000' : '#006b00') : BORDER,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={ms.divider} />

        {/* Buttons */}
        <div style={ms.btnRow}>
          <button onClick={handleSave} style={ms.btnAccept}>
            <span style={{ fontSize: 9, opacity: 0.7 }}>Ctrl+A  </span>Accept
          </button>
          <button onClick={onCancel} style={ms.btnCancel}>
            <span style={{ fontSize: 9, opacity: 0.7 }}>Esc  </span>Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const ms: Record<string, React.CSSProperties> = {
  overlay:   { position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' },
  modal:     { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', width: 400, overflow: 'hidden', fontFamily: FONT },
  title:     { background: HDR_BG, color: '#fff', padding: '5px 14px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  infoRow:   { display: 'flex', gap: 0, background: '#fafbfd', borderBottom: `1px solid ${BORDER}` },
  infoItem:  { flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 14px', borderRight: `1px solid ${BORDER}` },
  infoLabel: { fontSize: 10, color: '#888', fontStyle: 'italic', marginBottom: 2 },
  infoVal:   { fontSize: 12, fontWeight: 700, color: '#1a1a1a' },
  divider:   { borderTop: `1px solid ${BORDER}` },
  fieldWrap: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 },
  fieldRow:  { display: 'flex', alignItems: 'center', gap: 8 },
  label:     { fontSize: 12, color: '#444', width: 130, fontStyle: 'italic', flexShrink: 0 },
  input:     { flex: 1, border: 'none', borderBottom: `2px solid #1f4e79`, outline: 'none', fontSize: 14, fontWeight: 700, fontFamily: FONT, padding: '2px 4px', background: '#fffde0', color: '#1a1a1a', textAlign: 'right' },
  drCrWrap:  { display: 'flex', gap: 6 },
  drCrBtn:   { border: `1px solid`, padding: '3px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, borderRadius: 2, transition: 'all 0.1s' },
  btnRow:    { display: 'flex', padding: '10px 16px 12px', justifyContent: 'flex-end', gap: 10 },
  btnAccept: { background: HDR_BG, color: '#fff', border: 'none', padding: '5px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, borderRadius: 2 },
  btnCancel: { background: '#f0f4f8', color: '#444', border: `1px solid ${BORDER}`, padding: '5px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, borderRadius: 2 },
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function App({ branchId }: ChartOfAccountsScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<'alteration' | 'voucher'>('alteration');
  const [ledgers, setLedgers]         = useState<Ledger[]>([]);
  const [groups, setGroups]           = useState<AccountGroup[]>([]);
  const [loading, setLoading]         = useState(true);
  const [companyName, setCompanyName] = useState('Bhavani Enterprises');
  const [period, setPeriod]           = useState({ from: '2026-04-01', to: '2027-03-31' });
  const [filterGroup, setFilterGroup] = useState('All Items');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editLedger, setEditLedger]   = useState<Ledger | null>(null);
  const [showPeriod, setShowPeriod]   = useState(false);
  const [searchText, setSearchText]   = useState('');
  
  // Real-time table wrap height tracking
  const [containerHeight, setContainerHeight] = useState(450);

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);

  // ── Measure Table Wrap Height for Dynamic Empty Rows ──────────────────
  useEffect(() => {
    if (!tableWrapRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(Math.max(150, entry.contentRect.height));
      }
    });
    obs.observe(tableWrapRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Fetch & Fallback Initial Setup ─────────────────────────────────────
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    setLoading(true);

    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/account-groups${q}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/vouchers${q}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([l, g, v]) => {
      let activeLedgers = l;
      let activeGroups = g;

      // Local storage synchronization if no server database or if fetch returned null
      if (!activeLedgers) {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY_LEDGERS);
        if (stored) {
          activeLedgers = JSON.parse(stored);
        } else {
          activeLedgers = INITIAL_LEDGERS;
          localStorage.setItem(LOCAL_STORAGE_KEY_LEDGERS, JSON.stringify(INITIAL_LEDGERS));
        }
      }

      setLedgers(activeLedgers || []);
      setGroups(activeGroups || []);

      if (Array.isArray(v) && v.length > 0) {
        const dates = v.map((x: any) => x.date?.slice(0, 10)).filter(Boolean).sort();
        setPeriod({ from: dates[0], to: dates[dates.length - 1] });
      }
    }).catch(() => {
      // Direct local storage fallback if APIs fail block completely
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_LEDGERS);
      if (stored) {
        setLedgers(JSON.parse(stored));
      } else {
        setLedgers(INITIAL_LEDGERS);
        localStorage.setItem(LOCAL_STORAGE_KEY_LEDGERS, JSON.stringify(INITIAL_LEDGERS));
      }
    }).finally(() => setLoading(false));

    // Company setting retrieval
    fetch('/api/settings/company').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setCompanyName(d.name); }).catch(() => {});

    if (branchId) {
      fetch('/api/branches').then(r => r.json())
        .then((bs: Branch[]) => { const b = bs.find(x => x.id === branchId); if (b) setCompanyName(b.name); })
        .catch(() => {});
    }
  }, [branchId]);

  // ── Sorted, filtered ledger list ──────────────────────────────────────
  const groupName = useCallback((l: Ledger) => l.group_name || l.group || '', []);

  const filteredLedgers = useMemo(() => {
    let list = [...ledgers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (filterGroup !== 'All Items') list = list.filter(l => groupName(l) === filterGroup);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(l => l.name?.toLowerCase().includes(q) || groupName(l).toLowerCase().includes(q));
    }
    return list;
  }, [ledgers, filterGroup, searchText, groupName]);

  const allGroupNames = useMemo(() => {
    const names = Array.from(new Set(ledgers.map(l => groupName(l)).filter(Boolean))).sort();
    return ['All Items', ...names];
  }, [ledgers, groupName]);

  // ── Calculated Ledger Totals & Balances for Footer ────────────────────
  const totals = useMemo(() => {
    let dr = 0;
    let cr = 0;
    ledgers.forEach(l => {
      const amt = l.openingBalance || 0;
      if (l.balanceType === 'Cr') cr += amt;
      else dr += amt;
    });
    return { dr, cr, diff: Math.abs(dr - cr) };
  }, [ledgers]);

  // ── Period label formatting ───────────────────────────────────────────
  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${d.getDate()}-${ms[d.getMonth()]}-${d.getFullYear()}`;
    } catch { return iso; }
  };

  const periodLabel = period.from && period.to
    ? `${fmtDate(period.from)} to ${fmtDate(period.to)}`
    : '1-Apr-26 to 31-Mar-27';

  // ── Keyboard navigation ───────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT') return;
      if (e.key === 'F2') { e.preventDefault(); setShowPeriod(p => !p); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => Math.min(filteredLedgers.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const l = filteredLedgers[selectedIdx];
        if (l) setEditLedger(l);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSearchText('');
        setFilterGroup('All Items');
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [filteredLedgers, selectedIdx]);

  // ── Scroll selected row into view ─────────────────────────────────────
  useEffect(() => {
    const row = tbodyRef.current?.children[selectedIdx] as HTMLElement;
    row?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  // ── Alter opening balance ─────────────────────────────────────────────
  const handleSaveOB = useCallback(async (id: string, amount: number, type: 'Dr' | 'Cr') => {
    // 1. Update State
    const updated = ledgers.map(l => l.id === id ? { ...l, openingBalance: amount, balanceType: type } : l);
    setLedgers(updated);
    
    // 2. Persist to LocalStorage
    localStorage.setItem(LOCAL_STORAGE_KEY_LEDGERS, JSON.stringify(updated));

    // 3. API Background Sync
    try {
      await fetch(`/api/ledgers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingBalance: amount, balanceType: type }),
      });
    } catch {}

    setEditLedger(null);
  }, [ledgers]);

  // ── Empty row calculations for full height background coverage ────────
  const ROW_HEIGHT = 26; // row height in pixels matches our styled height perfectly
  const emptyRowCount = useMemo(() => {
    const visibleCapacity = Math.floor(containerHeight / ROW_HEIGHT);
    const needed = visibleCapacity - filteredLedgers.length - 1; // subtract 1 header room
    return Math.max(0, needed);
  }, [containerHeight, filteredLedgers.length]);

  if (currentScreen === 'voucher') {
    return (
      <VoucherScreen 
        ledgers={ledgers} 
        onBack={() => setCurrentScreen('alteration')} 
        onRefreshLedgers={() => {
          const stored = localStorage.getItem('tally_ledgers_v1');
          if (stored) {
            setLedgers(JSON.parse(stored));
          }
        }}
      />
    );
  }

  return (
    <div style={s.root}>
      <style>{`
        @media print { .no-print { display:none!important; } }
        .coa-row:hover  { background: #eef4fb !important; cursor: pointer; }
        .coa-row.sel    { background: ${YELLOW} !important; color: #000 !important; }
        .side-btn:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>

      {/* ── Edit OB Modal ── */}
      {editLedger && (
        <EditOBModal
          ledger={editLedger}
          onSave={handleSaveOB}
          onCancel={() => setEditLedger(null)}
        />
      )}

      {/* ── Period alteration Overlay ── */}
      {showPeriod && (
        <div style={ms.overlay} className="no-print">
          <div style={{ ...ms.modal, width: 300 }}>
            <div style={ms.title}>Change Period (F2)</div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ ...ms.label, width: 80 }}>From :</label>
                <input 
                  ref={fromRef} 
                  type="date" 
                  value={period.from} 
                  onChange={e => setPeriod(p => ({ ...p, from: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); toRef.current?.focus(); } }}
                  style={ms.input} 
                  autoFocus 
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ ...ms.label, width: 80 }}>To :</label>
                <input 
                  ref={toRef} 
                  type="date" 
                  value={period.to} 
                  onChange={e => setPeriod(p => ({ ...p, to: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') setShowPeriod(false); }}
                  style={ms.input} 
                />
              </div>
            </div>
            <div style={ms.btnRow}>
              <button onClick={() => setShowPeriod(false)} style={ms.btnAccept}>Accept</button>
              <button onClick={() => setShowPeriod(false)} style={ms.btnCancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Title Bar ── */}
      <div style={s.titleBar}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700 }}>Multi Ledger Alteration</span>
          <button 
            onClick={() => setCurrentScreen('voucher')}
            style={{
              background: YELLOW,
              color: '#000',
              border: 'none',
              borderRadius: 2,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 'bold',
              cursor: 'pointer',
              marginLeft: 10
            }}
          >
            Go to Voucher Entry Screen →
          </button>
        </div>
        <span style={{ flex: 2, textAlign: 'center', fontWeight: 800, fontSize: 12 }}>{companyName}</span>
        <span style={{ flex: 1, textAlign: 'right', opacity: 0.7, fontSize: 13, cursor: 'pointer' }}>✕</span>
      </div>

      {/* ── Subheader / Control Info ── */}
      <div style={s.subHdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={s.subLabel}>Under Group</span>
          <span style={s.subColon}>:</span>
          <span style={s.subDiamond}>◆</span>
          <select
            value={filterGroup}
            onChange={e => { setFilterGroup(e.target.value); setSelectedIdx(0); }}
            style={s.groupSelect}
          >
            {allGroupNames.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            placeholder="Search ledger…"
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setSelectedIdx(0); }}
            style={s.searchBox}
          />
          <span style={{ fontSize: 11, color: '#555', fontStyle: 'italic', fontWeight: 'bold' }}>{periodLabel}</span>
        </div>
      </div>

      {/* ── Table Header (Perfect alignment with columns) ── */}
      <div style={s.colHdr}>
        <div style={s.colSno}>S.No.</div>
        <div style={s.colName}>Name of Ledger</div>
        <div style={s.colUnder}>Under</div>
        <div style={s.colOB}>Opening Balance</div>
        <div style={s.colDrCr}>Dr/Cr</div>
      </div>

      {/* ── Table Container ── */}
      <div ref={tableWrapRef} style={s.tableWrap}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 13 }}>Loading Chart of Accounts…</div>
        ) : (
          <table style={s.table}>
            <tbody ref={tbodyRef}>
              {/* Actual content rows */}
              {filteredLedgers.map((l, i) => {
                const ob   = l.openingBalance || 0;
                const isSel = i === selectedIdx;
                return (
                  <tr
                    key={l.id}
                    className={`coa-row${isSel ? ' sel' : ''}`}
                    style={s.row}
                    onClick={() => { setSelectedIdx(i); }}
                    onDoubleClick={() => setEditLedger(l)}
                  >
                    <td style={s.tdSno}>{i + 1}.</td>
                    <td style={s.tdName}>
                      <span style={{ fontWeight: isSel ? 800 : 600, color: isSel ? '#000' : '#1a1a1a' }}>
                        {l.name}
                      </span>
                    </td>
                    <td style={s.tdUnder}>{groupName(l) || '—'}</td>
                    <td style={{ ...s.tdOB, color: l.balanceType === 'Cr' ? '#006b00' : (ob > 0 ? '#7a0000' : '#888') }}>
                      {ob > 0 ? fmtAmt(ob) : ''}
                    </td>
                    <td style={{ ...s.tdDrCr, color: l.balanceType === 'Cr' ? '#006b00' : (ob > 0 ? '#7a0000' : '#888'), fontWeight: 700 }}>
                      {ob > 0 ? (l.balanceType || 'Dr') : ''}
                    </td>
                  </tr>
                );
              })}

              {/* Dynamic Filler Empty Row block spanning to fill space fully up to bottom */}
              {Array.from({ length: emptyRowCount }).map((_, idx) => (
                <tr key={`empty-${idx}`} style={s.emptyRow}>
                  <td style={s.tdSno}>&nbsp;</td>
                  <td style={s.tdName}>&nbsp;</td>
                  <td style={s.tdUnder}>&nbsp;</td>
                  <td style={s.tdOB}>&nbsp;</td>
                  <td style={s.tdDrCr}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Summary / Grand Difference Row (Floating visual above status bar) ── */}
      <div style={s.summaryRow}>
        <div style={s.colSno}>&nbsp;</div>
        <div style={{ ...s.colName, fontWeight: 700, fontStyle: 'italic', textAlign: 'right' }}>Total Opening Balances:</div>
        <div style={s.colUnder}>&nbsp;</div>
        <div style={{ ...s.colOB, fontWeight: 800, fontSize: 12, color: '#1a1a1a' }}>
          <div>Dr: {fmtAmt(totals.dr)}</div>
          <div>Cr: {fmtAmt(totals.cr)}</div>
        </div>
        <div style={s.colDrCr}>&nbsp;</div>
      </div>



      {/* ── Bottom Status Bar ── */}
      <div style={s.statusBar} className="no-print">
        <span style={{ color: '#aaa', fontSize: 10 }}>
          {loading ? 'Reading Ledgers…' : `${filteredLedgers.length} of ${ledgers.length} ledgers listed`}
        </span>
        <span style={{ color: '#aaa', fontSize: 10 }}>
          ↑↓ Navigate  |  Enter: Edit Opening Balance  |  B: Zero Balance  |  F2: Period  |  Esc: Reset Filter
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Voucher Entry Screen (Consolidated Inline Component) ──
// ─────────────────────────────────────────────────────────────────────────────

interface Entry {
  ledgerId: string;
  amount: string;
  type: 'Dr' | 'Cr';
  tempSearch: string;
}

const DEFAULT_ENTRY: Entry = {
  ledgerId: '',
  amount: '',
  type: 'Dr',
  tempSearch: '',
};

type VoucherType = 'Contra' | 'Payment' | 'Receipt' | 'Journal';

const VOUCHER_THEMES: Record<VoucherType, { background: string; cardBg: string; shadow: string; headerColor: string }> = {
  Contra: {
    background: 'linear-gradient(135deg, #f1f3f6 0%, #e4e8ed 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    shadow: '0 8px 30px rgba(31, 78, 121, 0.08)',
    headerColor: '#2b4c6f',
  },
  Payment: {
    background: 'linear-gradient(135deg, #f7f5f2 0%, #ebe5df 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    shadow: '0 8px 30px rgba(122, 0, 0, 0.05)',
    headerColor: '#1f4e79',
  },
  Receipt: {
    background: 'linear-gradient(135deg, #f0f4f2 0%, #dfede5 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    shadow: '0 8px 30px rgba(0, 107, 0, 0.05)',
    headerColor: '#1d5e3a',
  },
  Journal: {
    background: 'linear-gradient(135deg, #f4f3f6 0%, #e5e3eb 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    shadow: '0 8px 30px rgba(100, 50, 150, 0.06)',
    headerColor: '#4d2b6f',
  },
};

interface VoucherScreenProps {
  ledgers: Ledger[];
  onBack: () => void;
  onRefreshLedgers?: () => void;
}

function VoucherScreen({ ledgers, onBack, onRefreshLedgers }: VoucherScreenProps) {
  const [type, setType] = useState<VoucherType>('Payment');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState<Entry[]>([ { ...DEFAULT_ENTRY } ]);
  
  const [accountSearch, setAccountSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [showAccountDd, setShowAccountDd] = useState(false);
  const [acHighlightedIdx, setAcHighlightedIdx] = useState(0);

  const [activeRowDdIdx, setActiveRowDdIdx] = useState<number | null>(null);
  const [rowHighlightedIdx, setRowHighlightedIdx] = useState(0);

  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  const accountRef = useRef<HTMLInputElement>(null);
  const narrationRef = useRef<HTMLTextAreaElement>(null);

  // Focus Account selector if not Journal
  useEffect(() => {
    if (type !== 'Journal') {
      accountRef.current?.focus();
    }
  }, [type]);

  const cashBankLedgers = useMemo(() => {
    return ledgers.filter(l => {
      const g = (l.group_name || l.group || '').toLowerCase();
      const n = (l.name || '').toLowerCase();
      return g.includes('cash') || g.includes('bank') || n.includes('cash') || n.includes('bank');
    });
  }, [ledgers]);

  const rowLedgers = useMemo(() => {
    return ledgers.filter(l => l.id !== accountId);
  }, [ledgers, accountId]);

  const formatBalance = (id: string) => {
    const l = ledgers.find(x => x.id === id);
    if (!l) return '0.00 Dr';
    return `${Math.abs(l.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${l.balanceType || 'Dr'}`;
  };

  const handleTypeChange = (t: VoucherType) => {
    setType(t);
    setEntries([{ ...DEFAULT_ENTRY }]);
    setAccountSearch('');
    setAccountId('');
    setNarration('');
    setShowAccountDd(false);
    setActiveRowDdIdx(null);
  };

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.toLowerCase().trim();
    if (!q) return cashBankLedgers;
    return cashBankLedgers.filter(l => (l.name || '').toLowerCase().includes(q));
  }, [cashBankLedgers, accountSearch]);

  useEffect(() => {
    const q = accountSearch.toLowerCase().trim();
    if (q) {
      const match = cashBankLedgers.find(l => (l.name || '').toLowerCase() === q);
      if (match && match.id !== accountId) {
        setAccountId(match.id);
      }
    }
  }, [accountSearch, cashBankLedgers, accountId]);

  const handleAddEntryRow = useCallback((currentList: Entry[]) => {
    const nextType: 'Dr' | 'Cr' = type === 'Receipt' ? 'Cr' : 'Dr';
    setEntries([...currentList, { ...DEFAULT_ENTRY, type: nextType }]);
    setTimeout(() => {
      const nextIdx = currentList.length;
      document.getElementById(`ledger-input-${nextIdx}`)?.focus();
    }, 40);
  }, [type]);

  const handleRemoveEntryRow = (idx: number) => {
    if (entries.length > 1) {
      setEntries(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleAccountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowAccountDd(true);
      setAcHighlightedIdx(prev => Math.min(filteredAccounts.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAcHighlightedIdx(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredAccounts[acHighlightedIdx]) {
        const sel = filteredAccounts[acHighlightedIdx];
        setAccountId(sel.id);
        setAccountSearch(sel.name);
        setShowAccountDd(false);
        setTimeout(() => {
          document.getElementById('ledger-input-0')?.focus();
        }, 50);
      } else if (accountSearch.trim()) {
        const bestMatch = filteredAccounts[0];
        if (bestMatch) {
          setAccountId(bestMatch.id);
          setAccountSearch(bestMatch.name);
          setShowAccountDd(false);
          setTimeout(() => {
            document.getElementById('ledger-input-0')?.focus();
          }, 50);
        }
      }
    } else if (e.key === 'Escape') {
      setShowAccountDd(false);
    }
  };

  const handleSelectRowLedger = (idx: number, l: Ledger) => {
    setEntries(prev => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        ledgerId: l.id,
        tempSearch: l.name
      };
      return next;
    });
    setActiveRowDdIdx(null);
    setTimeout(() => {
      document.getElementById(`amount-input-${idx}`)?.focus();
    }, 40);
  };

  const handleRowLedgerKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const query = entries[idx].tempSearch || '';
    const filteredRows = rowLedgers.filter(l => (l.name || '').toLowerCase().includes(query.toLowerCase()));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveRowDdIdx(idx);
      setRowHighlightedIdx(prev => Math.min(filteredRows.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setRowHighlightedIdx(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!query.trim() && !entries[idx].ledgerId) {
        narrationRef.current?.focus();
        return;
      }
      if (activeRowDdIdx === idx && filteredRows[rowHighlightedIdx]) {
        handleSelectRowLedger(idx, filteredRows[rowHighlightedIdx]);
      } else if (entries[idx].ledgerId) {
        document.getElementById(`amount-input-${idx}`)?.focus();
      } else {
        const firstMatch = filteredRows[0];
        if (firstMatch) {
          handleSelectRowLedger(idx, firstMatch);
        }
      }
    } else if (e.key === 'Escape') {
      setActiveRowDdIdx(null);
    }
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (entries[idx].amount.trim()) {
        const nextIdx = idx + 1;
        if (nextIdx < entries.length) {
          document.getElementById(`ledger-input-${nextIdx}`)?.focus();
        } else {
          handleAddEntryRow(entries);
        }
      }
    }
  };

  const handleOpenConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (type !== 'Journal' && !accountId) {
      alert('Please select an Account (Cash/Bank)');
      return;
    }
    const valid = entries.filter(item => item.ledgerId && item.amount);
    if (valid.length === 0) {
      alert('Please select at least one ledger with a valid amount');
      return;
    }
    setShowConfirmPopup(true);
  };

  const executeSaveVoucher = () => {
    setShowConfirmPopup(false);
    const dateStr = date;
    const typeStr = type;
    const totalAmount = entries.reduce((acc, el) => acc + (parseFloat(el.amount) || 0), 0);

    const storedVouchers = localStorage.getItem('tally_vouchers_v1') || '[]';
    const vouchersList = JSON.parse(storedVouchers);
    const newVoucher = {
      id: Math.random().toString(36).substring(2, 9),
      date: dateStr,
      type: typeStr,
      narration: narration,
      amount: totalAmount,
      entries: entries.map(x => ({
        ledgerId: x.ledgerId,
        amount: parseFloat(x.amount) || 0,
        type: x.type
      }))
    };
    vouchersList.push(newVoucher);
    localStorage.setItem('tally_vouchers_v1', JSON.stringify(vouchersList));

    const storedLedgers = localStorage.getItem('tally_ledgers_v1') || '[]';
    let ledgersList: Ledger[] = JSON.parse(storedLedgers);
    if (!ledgersList.length) ledgersList = ledgers;

    entries.forEach(e => {
      ledgersList = ledgersList.map(l => {
        if (l.id === e.ledgerId) {
          const transAmt = parseFloat(e.amount) || 0;
          const currentBal = l.openingBalance || 0;
          const factor = e.type === l.balanceType ? 1 : -1;
          const nextBal = currentBal + (transAmt * factor);
          return {
            ...l,
            openingBalance: Math.max(0, Math.abs(nextBal)),
            balanceType: nextBal >= 0 ? l.balanceType : (l.balanceType === 'Dr' ? 'Cr' : 'Dr')
          };
        }
        return l;
      });
    });

    if (accountId) {
      ledgersList = ledgersList.map(l => {
        if (l.id === accountId) {
          const transAmt = totalAmount;
          const currentBal = l.openingBalance || 0;
          const isDebitType = type === 'Receipt' || type === 'Contra'; 
          const entryType: 'Dr' | 'Cr' = isDebitType ? 'Dr' : 'Cr';
          const factor = entryType === l.balanceType ? 1 : -1;
          const nextBal = currentBal + (transAmt * factor);
          return {
            ...l,
            openingBalance: Math.max(0, Math.abs(nextBal)),
            balanceType: nextBal >= 0 ? l.balanceType : (l.balanceType === 'Dr' ? 'Cr' : 'Dr')
          };
        }
        return l;
      });
    }

    localStorage.setItem('tally_ledgers_v1', JSON.stringify(ledgersList));
    if (onRefreshLedgers) onRefreshLedgers();

    alert('Voucher successfully created and ledger opening balances adjusted!');
    
    setEntries([{ ...DEFAULT_ENTRY }]);
    setAccountSearch('');
    setAccountId('');
    setNarration('');
  };

  const curTheme = VOUCHER_THEMES[type];

  return (
    <div style={{ ...vs.wrapper, background: curTheme.background }}>
      <div style={vs.titleBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={vs.btnBack} onClick={onBack}>← Back to List</button>
          <span style={{ fontWeight: 700 }}>Voucher Entry Mode</span>
        </div>
        <span style={{ fontWeight: 800 }}>Bhavani Enterprises</span>
        <span style={{ opacity: 0.8, fontSize: 11 }}>Voucher No: 1A</span>
      </div>

      <div style={vs.tabBarRow} className="no-print">
        <div style={{ display: 'flex', gap: 2 }}>
          {(['Contra', 'Payment', 'Receipt', 'Journal'] as VoucherType[]).map(t => {
            const isSel = type === t;
            return (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                style={{
                  ...vs.tabBtn,
                  background: isSel ? curTheme.headerColor : '#e6e9ed',
                  color: isSel ? '#fff' : '#1a1a1a',
                  boxShadow: isSel ? '0px -2px 10px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: isSel ? 700 : 500
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontStyle: 'italic', color: '#555' }}>Voucher Date :</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={vs.dateInputSelect}
          />
        </div>
      </div>

      <div style={{ ...vs.contentCard, background: curTheme.cardBg, boxShadow: curTheme.shadow }}>
        {type !== 'Journal' && (
          <div style={vs.accountBox}>
            <div style={vs.accRowContainer}>
              <span style={vs.labelBold}>Account (Cash/Bank)</span>
              <span style={{ padding: '0 8px', color: '#999' }}>:</span>
              
              <div style={{ position: 'relative', width: 340 }}>
                <input
                  ref={accountRef}
                  placeholder="Type Cash or Bank Ledger Name directly..."
                  value={accountSearch}
                  onChange={e => {
                    setAccountSearch(e.target.value);
                    setAccountId('');
                    setShowAccountDd(true);
                    setAcHighlightedIdx(0);
                  }}
                  onFocus={() => setShowAccountDd(true)}
                  onBlur={() => setTimeout(() => setShowAccountDd(false), 200)}
                  onKeyDown={handleAccountKeyDown}
                  style={vs.accInput}
                />

                {showAccountDd && filteredAccounts.length > 0 && (
                  <div style={vs.dropdownList}>
                    <div style={vs.dropdownHdr}>List of Cash/Bank Accounts</div>
                    {filteredAccounts.map((item, idx) => {
                      const isHighlighted = idx === acHighlightedIdx;
                      return (
                        <div
                          key={item.id}
                          style={{
                            ...vs.dropdownItem,
                            background: isHighlighted ? '#1f4e79' : 'transparent',
                            color: isHighlighted ? '#fff' : '#1a1a1a'
                          }}
                          onMouseDown={() => {
                            setAccountId(item.id);
                            setAccountSearch(item.name);
                            setShowAccountDd(false);
                            setTimeout(() => {
                              document.getElementById('ledger-input-0')?.focus();
                            }, 50);
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                          <span style={{ fontSize: 11, opacity: 0.8 }}>{formatBalance(item.id)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {accountId && (
              <div style={vs.valRowBalance}>
                <span>Current Balance :</span>
                <span style={{ fontWeight: 700, marginLeft: 6, color: '#333' }}>{formatBalance(accountId)}</span>
              </div>
            )}
          </div>
        )}

        <div style={vs.tableContainer}>
          <div style={vs.tableHeaderRow}>
            <div style={{ ...vs.th, flex: 2 }}>Particulars / Ledger Accounts</div>
            <div style={{ ...vs.th, width: 150, textAlign: 'right' }}>Amount (Dr/Cr)</div>
          </div>

          <div style={vs.tableContentBody}>
            {entries.map((item, idx) => {
              const query = item.tempSearch || '';
              const filteredRows = rowLedgers.filter(l => (l.name || '').toLowerCase().includes(query.toLowerCase()));
              const isDdActive = activeRowDdIdx === idx;

              return (
                <div key={idx} style={vs.entryRow}>
                  <div style={{ flex: 2, position: 'relative', borderRight: `1px solid ${ROW_BDR}`, padding: '4px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        id={`ledger-input-${idx}`}
                        placeholder="Type ledger name directly..."
                        value={item.tempSearch || (ledgers.find(l => l.id === item.ledgerId)?.name || '')}
                        onChange={e => {
                          const val = e.target.value;
                          setEntries(prev => {
                            const n = [...prev];
                            const match = ledgers.find(l => (l.name || '').toLowerCase() === val.toLowerCase());
                            n[idx] = { ...n[idx], tempSearch: val, ledgerId: match ? match.id : '' };
                            return n;
                          });
                          setActiveRowDdIdx(idx);
                          setRowHighlightedIdx(0);
                        }}
                        onFocus={() => {
                          setActiveRowDdIdx(idx);
                          setRowHighlightedIdx(0);
                        }}
                        onBlur={() => setTimeout(() => {
                          if (activeRowDdIdx === idx) setActiveRowDdIdx(null);
                        }, 200)}
                        onKeyDown={e => handleRowLedgerKeyDown(e, idx)}
                        style={vs.rowInput}
                      />
                      {entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEntryRow(idx)}
                          style={vs.rowDelBtn}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {item.ledgerId && (
                      <div style={vs.statusBalIndicator}>
                        <span>Balance : {formatBalance(item.ledgerId)}</span>
                      </div>
                    )}

                    {isDdActive && filteredRows.length > 0 && (
                      <div style={vs.dropdownList}>
                        <div style={vs.dropdownHdr}>List of Ledger Accounts</div>
                        {filteredRows.map((l, i) => {
                          const isHighlighted = i === rowHighlightedIdx;
                          return (
                            <div
                              key={l.id}
                              style={{
                                ...vs.dropdownItem,
                                background: isHighlighted ? curTheme.headerColor : 'transparent',
                                color: isHighlighted ? '#fff' : '#1a1a1a'
                              }}
                              onMouseDown={() => handleSelectRowLedger(idx, l)}
                            >
                              <span style={{ fontWeight: 600 }}>{l.name}</span>
                              <span style={{ fontSize: 11, opacity: 0.8 }}>{formatBalance(l.id)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ width: 150, padding: '4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <input
                      id={`amount-input-${idx}`}
                      type="number"
                      placeholder="0.00"
                      value={item.amount}
                      onChange={e => {
                        const val = e.target.value;
                        setEntries(prev => {
                          const n = [...prev];
                          n[idx] = { ...n[idx], amount: val };
                          return n;
                        });
                      }}
                      onKeyDown={e => handleAmountKeyDown(e, idx)}
                      style={vs.amountRowInput}
                    />
                    {item.amount && (
                      <span style={{ fontSize: 9, color: '#666', marginTop: 2, fontWeight: 'bold' }}>
                        {item.type}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={vs.tableFooterTotal}>
            <div style={{ flex: 2, textAlign: 'right', paddingRight: 12, fontWeight: 700 }}>Total :</div>
            <div style={{ width: 150, textAlign: 'right', fontWeight: 800, color: '#1a1a1a', fontSize: 13 }}>
              ₹ {entries.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div style={vs.narrationBox}>
          <span style={vs.labelBold}>Narration :</span>
          <textarea
            ref={narrationRef}
            rows={2}
            value={narration}
            onChange={e => setNarration(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleOpenConfirm();
              }
            }}
            placeholder="Enter standard narration context details..."
            style={vs.narrationTextarea}
          />
        </div>

        <div style={vs.actionRow}>
          <button
            type="button"
            onClick={() => handleAddEntryRow(entries)}
            style={vs.addBtnLine}
          >
            + Add Particulars Row
          </button>
          
          <button
            type="button"
            onClick={handleOpenConfirm}
            style={{ ...vs.submitPrimary, background: curTheme.headerColor }}
          >
            Accept (Ctrl+Enter)
          </button>
        </div>
      </div>

      {showConfirmPopup && (
        <div style={vs.popupOverlay}>
          <div style={vs.popupCard}>
            <div style={vs.popupTitle}>Accept Voucher ?</div>
            <span style={vs.popupSubtext}>Do you want to write and save these record transaction entries?</span>
            
            <div style={vs.popupDetailsList}>
              <div style={vs.popupDetailItem}>
                <span style={{ color: '#666' }}>Voucher Type</span>
                <span style={{ fontWeight: 'bold' }}>{type}</span>
              </div>
              <div style={vs.popupDetailItem}>
                <span style={{ color: '#666' }}>Amount Total</span>
                <span style={{ fontWeight: 'bold', color: '#1d5e3a' }}>
                  ₹ {entries.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {accountId && (
                <div style={vs.popupDetailItem}>
                  <span style={{ color: '#666' }}>Contra/Bank Account</span>
                  <span style={{ fontWeight: 'bold' }}>{accountSearch}</span>
                </div>
              )}
            </div>

            <div style={vs.popupBtnRow}>
              <button
                type="button"
                onClick={executeSaveVoucher}
                style={vs.popupBtnYes}
              >
                Yes (Enter)
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmPopup(false)}
                style={vs.popupBtnNo}
              >
                No (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={vs.statusBarHint}>
        <span>Press Escape to reset search filters | Enter switches between active cells</span>
        <span>Keyboard: Enter twice on blank Particulars moves focus to Narration</span>
      </div>
    </div>
  );
}

const vs: Record<string, React.CSSProperties> = {
  wrapper: {
    fontFamily: FONT,
    fontSize: 12,
    color: '#1a1a1a',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box',
    transition: 'background 0.3s ease',
  },
  titleBar: {
    background: '#1d2c3d',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 14px',
    fontSize: 11,
    flexShrink: 0,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  btnBack: {
    background: '#dc3545',
    color: '#fff',
    border: 'none',
    padding: '3px 8px',
    borderRadius: 2,
    fontSize: 10,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: FONT,
  },
  tabBarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 14px',
    background: 'rgba(255, 255, 255, 0.5)',
    borderBottom: `1px solid ${BORDER}`,
    flexShrink: 0,
  },
  tabBtn: {
    border: 'none',
    padding: '6px 16px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: FONT,
    borderRadius: '2px 2px 0 0',
    transition: 'all 0.1s ease',
  },
  dateInputSelect: {
    border: `1px solid ${BORDER}`,
    background: '#fff',
    fontFamily: FONT,
    fontSize: 11,
    padding: '2px 4px',
    outline: 'none',
  },
  contentCard: {
    flex: 1,
    margin: '12px 14px',
    border: `1px solid ${BORDER}`,
    borderRadius: 3,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  accountBox: {
    background: 'rgba(0, 0, 0, 0.02)',
    borderBottom: `1px solid ${BORDER}`,
    padding: '12px 14px',
  },
  accRowContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  labelBold: {
    fontSize: 11,
    fontWeight: 700,
    color: '#333',
    width: 140,
    flexShrink: 0,
  },
  accInput: {
    width: '100%',
    border: 'none',
    borderBottom: `2px solid #1f4e79`,
    background: '#fffde5',
    outline: 'none',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: FONT,
    padding: '3px 6px',
    boxSizing: 'border-box',
    color: '#1a1a1a',
  },
  valRowBalance: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    marginLeft: 154,
    display: 'flex',
    alignItems: 'center',
  },
  tableContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    minHeight: 0,
  },
  tableHeaderRow: {
    display: 'flex',
    background: '#f1f3f6',
    borderBottom: `1px solid ${BORDER}`,
    fontWeight: 700,
    flexShrink: 0,
  },
  th: {
    padding: '6px 12px',
    fontSize: 11,
    color: '#333',
    fontWeight: 'bold',
  },
  tableContentBody: {
    flex: 1,
    overflowY: 'auto',
    background: '#fff',
  },
  entryRow: {
    display: 'flex',
    borderBottom: `1px solid ${ROW_BDR}`,
    minHeight: '34px',
    alignItems: 'stretch',
    background: '#fff',
  },
  rowInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 0',
    background: 'transparent',
    color: '#1a1a1a',
  },
  rowDelBtn: {
    background: 'none',
    border: 'none',
    color: '#dc3545',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 'bold',
    padding: '0 4px',
  },
  statusBalIndicator: {
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
    marginTop: -2,
    marginBottom: 4,
  },
  amountRowInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    textAlign: 'right',
    fontWeight: 700,
    fontFamily: FONT,
    background: 'transparent',
    padding: '4px 0',
    fontSize: 12,
    color: '#1a1a1a',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: '100%',
    maxHeight: 180,
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 2,
    zIndex: 99,
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    overflowY: 'auto',
  },
  dropdownHdr: {
    fontSize: 9,
    fontWeight: 'bold',
    background: '#f1f3f6',
    color: '#666',
    padding: '4px 8px',
    borderBottom: `1px solid ${BORDER}`,
  },
  dropdownItem: {
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    borderBottom: '1px solid #f1f3f6',
    transition: 'all 0.05s ease',
  },
  tableFooterTotal: {
    display: 'flex',
    background: '#f8fafc',
    borderTop: `2px solid ${BORDER}`,
    padding: '6px 0',
    flexShrink: 0,
  },
  narrationBox: {
    padding: '10px 14px',
    borderTop: `1px solid ${BORDER}`,
    background: '#fafbfc',
    display: 'flex',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  narrationTextarea: {
    flex: 1,
    marginLeft: 14,
    border: 'none',
    borderBottom: '1px solid #999',
    background: 'transparent',
    fontFamily: FONT,
    fontSize: 12,
    outline: 'none',
    resize: 'none',
    color: '#1a1a1a',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: '#f1f3f6',
    borderTop: `1px solid ${BORDER}`,
    flexShrink: 0,
  },
  addBtnLine: {
    background: '#fff',
    border: `1px solid ${BORDER}`,
    cursor: 'pointer',
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 2,
    fontFamily: FONT,
  },
  submitPrimary: {
    color: '#fff',
    border: 'none',
    padding: '6px 18px',
    fontWeight: 'bold',
    fontSize: 11,
    borderRadius: 2,
    cursor: 'pointer',
    fontFamily: FONT,
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  popupOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.45)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCard: {
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 3,
    padding: '20px 24px',
    width: 320,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    fontFamily: FONT,
    display: 'flex',
    flexDirection: 'column',
  },
  popupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  popupSubtext: {
    fontSize: 11,
    color: '#666',
    lineHeight: 1.4,
    marginBottom: 14,
  },
  popupDetailsList: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '8px 12px',
    borderRadius: 2,
    marginBottom: 16,
  },
  popupDetailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    margin: '4px 0',
  },
  popupBtnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  },
  popupBtnYes: {
    background: '#1d5e3a',
    color: '#fff',
    border: 'none',
    padding: '5px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: FONT,
    borderRadius: 2,
  },
  popupBtnNo: {
    background: '#e2e8f0',
    color: '#1a1a1a',
    border: 'none',
    padding: '5px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: FONT,
    borderRadius: 2,
  },
  statusBarHint: {
    background: '#1d2c3d',
    color: '#aaa',
    fontSize: 10,
    padding: '4px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
};

// ── Styles ──────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: FONT,
    fontSize: 12,
    color: '#1a1a1a',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    border: `1px solid ${BORDER}`,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    boxSizing: 'border-box',
  },
  titleBar: {
    background: HDR_BG,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
  },
  subHdr: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 12px',
    background: LIGHT,
    borderBottom: `1px solid ${BORDER}`,
    flexShrink: 0,
  },
  subLabel:  { fontSize: 12, color: '#333', fontStyle: 'italic' },
  subColon:  { fontSize: 12, color: '#333', margin: '0 4px' },
  subDiamond:{ fontSize: 10, color: HDR_BG, marginRight: 4 },
  groupSelect: {
    border: 'none',
    borderBottom: `2px solid ${HDR_BG}`,
    outline: 'none',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: FONT,
    background: '#fffde0',
    color: '#1a1a1a',
    cursor: 'pointer',
    padding: '1px 4px',
    minWidth: 140,
  },
  searchBox: {
    border: 'none',
    borderBottom: `1px solid ${BORDER}`,
    outline: 'none',
    fontSize: 11,
    fontFamily: FONT,
    background: 'transparent',
    color: '#333',
    padding: '1px 4px',
    width: 140,
  },

  // Column headers matching width proportions perfectly
  colHdr: {
    display: 'flex',
    background: LIGHT,
    borderBottom: `2px solid ${BORDER}`,
    fontWeight: 700,
    fontSize: 12,
    flexShrink: 0,
  },
  colSno:   { width: 48, padding: '5px 8px', borderRight: `1px solid ${ROW_BDR}`, textAlign: 'center', flexShrink: 0 },
  colName:  { flex: 1, padding: '5px 8px', borderRight: `1px solid ${ROW_BDR}` },
  colUnder: { width: 220, padding: '5px 8px', borderRight: `1px solid ${ROW_BDR}`, flexShrink: 0 },
  colOB:    { width: 160, padding: '5px 8px', textAlign: 'right', borderRight: `1px solid ${ROW_BDR}`, flexShrink: 0 },
  colDrCr:  { width: 50, padding: '5px 8px', textAlign: 'center', flexShrink: 0 },

  // Table Structure
  tableWrap: { 
    flex: 1, 
    overflowY: 'auto', 
    minHeight: 0,
    background: '#fff' 
  },
  table: { 
    width: '100%', 
    borderCollapse: 'collapse', 
    tableLayout: 'fixed' 
  },
  row: { 
    borderBottom: `1px solid ${ROW_BDR}`, 
    transition: 'background 0.05s',
    height: '26px',
    boxSizing: 'border-box'
  },
  emptyRow: {
    borderBottom: `1px solid ${ROW_BDR}`, 
    height: '26px',
    boxSizing: 'border-box',
    background: '#fff'
  },

  tdSno:   { width: 48, padding: '3px 8px', textAlign: 'center', verticalAlign: 'middle', borderRight: `1px solid ${ROW_BDR}`, color: '#555', fontSize: 11, flexShrink: 0 },
  tdName:  { padding: '3px 8px', verticalAlign: 'middle', borderRight: `1px solid ${ROW_BDR}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tdUnder: { width: 220, padding: '3px 8px', verticalAlign: 'middle', borderRight: `1px solid ${ROW_BDR}`, color: '#444', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 },
  tdOB:    { width: 160, padding: '3px 10px', verticalAlign: 'middle', textAlign: 'right', borderRight: `1px solid ${ROW_BDR}`, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 },
  tdDrCr:  { width: 50, padding: '3px 8px', verticalAlign: 'middle', textAlign: 'center', fontSize: 11, flexShrink: 0 },

  // Floating summary row matching columns exactly
  summaryRow: {
    display: 'flex',
    background: '#fafbfd',
    borderTop: `2px solid ${BORDER}`,
    borderBottom: `1px solid ${BORDER}`,
    fontSize: 11,
    flexShrink: 0,
    zIndex: 10,
  },

  // Right vertical Function Buttons
  rightPanel: {
    position: 'absolute',
    top: 26,
    right: 0,
    bottom: 24,
    width: 88,
    background: DARK_PANEL,
    display: 'flex',
    flexDirection: 'column',
    borderLeft: `1px solid #0d1a2a`,
    overflowY: 'auto',
  },
  sideBtn: {
    background: 'none',
    border: 'none',
    borderBottom: `1px solid rgba(255,255,255,0.07)`,
    color: '#cdd5e0',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '5px 8px',
    textAlign: 'left',
    fontFamily: FONT,
    flex: 1,
    minHeight: 36,
    transition: 'background 0.1s',
  },
  sBtnKey:   { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, lineHeight: 1.3 },
  sBtnLabel: { fontSize: 10, color: '#d0dae6', fontWeight: 600, lineHeight: 1.3, whiteSpace: 'pre-line' },

  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 12px 3px 8px',
    background: DARK_PANEL,
    borderTop: `1px solid #0d1a2a`,
    flexShrink: 0,
    height: 24,
  },
};
