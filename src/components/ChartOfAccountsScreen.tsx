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
        <span style={{ flex: 1, fontWeight: 700 }}>Multi Ledger Alteration</span>
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
