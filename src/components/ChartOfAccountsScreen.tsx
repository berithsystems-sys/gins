/**
 * TallyPrime-style Chart of Accounts
 * - Flat ledger list with S.No., Name of Ledger, Under (group), Opening Balance, Dr/Cr
 * - Edit Opening Balance modal (inline alteration panel)
 * - Keyboard navigation: ↑↓ Arrow, Enter to open, Esc to close
 * - Right function button panel (F2–F12)
 * - Filter by group (Under Group dropdown)
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
  btnRow:    { display: 'flex', gap: 0, padding: '10px 16px 12px', justifyContent: 'flex-end', gap: 10 } as React.CSSProperties,
  btnAccept: { background: HDR_BG, color: '#fff', border: 'none', padding: '5px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, borderRadius: 2 },
  btnCancel: { background: '#f0f4f8', color: '#444', border: `1px solid ${BORDER}`, padding: '5px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, borderRadius: 2 },
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ChartOfAccountsScreen({ branchId }: ChartOfAccountsScreenProps) {
  const [ledgers, setLedgers]         = useState<Ledger[]>([]);
  const [groups, setGroups]           = useState<AccountGroup[]>([]);
  const [loading, setLoading]         = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [period, setPeriod]           = useState({ from: '', to: '' });
  const [filterGroup, setFilterGroup] = useState('All Items');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editLedger, setEditLedger]   = useState<Ledger | null>(null);
  const [showPeriod, setShowPeriod]   = useState(false);
  const [searchText, setSearchText]   = useState('');
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => r.json()),
      fetch(`/api/account-groups${q}`).then(r => r.json()),
      fetch(`/api/vouchers${q}`).then(r => r.json()).catch(() => []),
    ]).then(([l, g, v]) => {
      setLedgers(Array.isArray(l) ? l : []);
      setGroups(Array.isArray(g) ? g : []);
      const vArr = Array.isArray(v) ? v : [];
      if (vArr.length > 0) {
        const dates = vArr.map((x: any) => x.date?.slice(0, 10)).filter(Boolean).sort();
        setPeriod({ from: dates[0], to: dates[dates.length - 1] });
      }
    }).catch(() => {}).finally(() => setLoading(false));

    // Company name
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

  // ── Period label ──────────────────────────────────────────────────────
  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const ms = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
      return `${d.getDate()}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}-${d.getFullYear()}`;
    } catch { return iso; }
  };
  const periodLabel = period.from && period.to
    ? `${fmtDate(period.from)} to ${fmtDate(period.to)}`
    : '1-Apr-24 to 31-Mar-25';

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
      if (e.key === 'Enter' || e.key === 'F11') {
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

  // ── Save opening balance ──────────────────────────────────────────────
  const handleSaveOB = useCallback(async (id: string, amount: number, type: 'Dr' | 'Cr') => {
    try {
      await fetch(`/api/ledgers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingBalance: amount, balanceType: type }),
      });
      setLedgers(prev => prev.map(l => l.id === id ? { ...l, openingBalance: amount, balanceType: type } : l));
    } catch {}
    setEditLedger(null);
  }, []);

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

      {/* ── Period Modal ── */}
      {showPeriod && (
        <div style={ms.overlay} className="no-print">
          <div style={{ ...ms.modal, width: 300 }}>
            <div style={ms.title}>Change Period (F2)</div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ ...ms.label, width: 80 }}>From :</label>
                <input ref={fromRef} type="date" value={period.from} onChange={e => setPeriod(p => ({ ...p, from: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); toRef.current?.focus(); } }}
                  style={ms.input} autoFocus />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ ...ms.label, width: 80 }}>To :</label>
                <input ref={toRef} type="date" value={period.to} onChange={e => setPeriod(p => ({ ...p, to: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') setShowPeriod(false); }}
                  style={ms.input} />
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
        <span style={{ flex: 2, textAlign: 'center', fontWeight: 800, fontSize: 12 }}>{companyName || '…'}</span>
        <span style={{ flex: 1, textAlign: 'right', opacity: 0.7, fontSize: 13, cursor: 'pointer' }}>✕</span>
      </div>

      {/* ── Sub-header (Tally style: Under Group + Period) ── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Search box */}
          <input
            placeholder="Search ledger…"
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setSelectedIdx(0); }}
            style={s.searchBox}
          />
          <span style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>{periodLabel}</span>
        </div>
      </div>

      {/* ── Column Header ── */}
      <div style={s.colHdr}>
        <div style={{ ...s.colSno }}>S.No.</div>
        <div style={{ ...s.colName }}>Name of Ledger</div>
        <div style={{ ...s.colUnder }}>Under</div>
        <div style={{ ...s.colOB }}>Opening Balance</div>
        <div style={{ ...s.colDrCr }}>Dr/Cr</div>
      </div>

      {/* ── Table Body ── */}
      <div style={s.tableWrap}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 13 }}>Loading…</div>
        ) : filteredLedgers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 13 }}>No ledgers found.</div>
        ) : (
          <table style={s.table}>
            <tbody ref={tbodyRef}>
              {filteredLedgers.map((l, i) => {
                const ob   = l.openingBalance || 0;
                const isSel = i === selectedIdx;
                return (
                  <tr
                    key={l.id}
                    className={`coa-row${isSel ? ' sel' : ''}`}
                    style={s.row}
                    onClick={() => { setSelectedIdx(i); setEditLedger(l); }}
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
            </tbody>
          </table>
        )}
      </div>

      {/* ── Right Function Buttons ── */}
      <div style={s.rightPanel} className="no-print">
        {[
          { k: 'F2',    l: 'Period',           a: () => setShowPeriod(true) },
          { k: 'F3',    l: 'Company',           a: () => {} },
          { k: 'F4',    l: 'Group',             a: () => {} },
          { k: 'F5',    l: '',                  a: () => {} },
          { k: 'F6',    l: '',                  a: () => {} },
          { k: 'F7',    l: '',                  a: () => {} },
          { k: 'F8',    l: '',                  a: () => {} },
          { k: 'F9',    l: '',                  a: () => {} },
          { k: 'F10',   l: '',                  a: () => {} },
          { k: 'I',     l: 'More Details',      a: () => {} },
          { k: 'B',     l: 'Zero Opening\nBalance', a: () => {
            const l = filteredLedgers[selectedIdx];
            if (l) handleSaveOB(l.id, 0, 'Dr');
          }},
          { k: 'H',     l: 'Change Parent\nGroup', a: () => {} },
          { k: 'F12',   l: 'Configure',         a: () => {} },
        ].map(b => (
          <button
            key={b.k}
            onClick={b.a}
            className="side-btn"
            style={{
              ...s.sideBtn,
              opacity: b.l ? 1 : 0.25,
              background: b.k === 'B' ? 'rgba(255,80,80,0.18)' : b.k === 'I' ? 'rgba(100,180,255,0.15)' : 'none',
              border: b.k === 'B' ? '1px solid rgba(255,80,80,0.4)' : 'none',
            }}
          >
            <span style={s.sBtnKey}>{b.k}:</span>
            <span style={s.sBtnLabel}>{b.l}</span>
          </button>
        ))}
      </div>

      {/* ── Status Bar ── */}
      <div style={s.statusBar} className="no-print">
        <span style={{ color: '#aaa', fontSize: 10 }}>
          {loading ? 'Loading…' : `${filteredLedgers.length} of ${ledgers.length} ledgers`}
        </span>
        <span style={{ color: '#aaa', fontSize: 10 }}>
          ↑↓ Navigate  |  Enter / Click: Edit Opening Balance  |  B: Zero Balance  |  F2: Period  |  Esc: Reset Filter
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
    height: '100%',
    border: `1px solid ${BORDER}`,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
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
    paddingRight: 98,
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

  // Column header (matches screenshot layout exactly)
  colHdr: {
    display: 'flex',
    background: LIGHT,
    borderBottom: `2px solid ${BORDER}`,
    fontWeight: 700,
    fontSize: 12,
    flexShrink: 0,
    paddingRight: 90,
  },
  colSno:   { width: 48, padding: '5px 8px', borderRight: `1px solid ${ROW_BDR}`, textAlign: 'center', flexShrink: 0 },
  colName:  { flex: 1, padding: '5px 8px', borderRight: `1px solid ${ROW_BDR}` },
  colUnder: { width: 220, padding: '5px 8px', borderRight: `1px solid ${ROW_BDR}` },
  colOB:    { width: 160, padding: '5px 8px', textAlign: 'right', borderRight: `1px solid ${ROW_BDR}` },
  colDrCr:  { width: 50, padding: '5px 8px', textAlign: 'center' },

  // Table
  tableWrap: { flex: 1, overflowY: 'auto', paddingRight: 90 },
  table:     { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  row:       { borderBottom: `1px solid ${ROW_BDR}`, transition: 'background 0.06s' },

  tdSno:   { width: 48, padding: '3px 8px', textAlign: 'center', verticalAlign: 'middle', borderRight: `1px solid ${ROW_BDR}`, color: '#555', fontSize: 11, flexShrink: 0 },
  tdName:  { padding: '3px 8px', verticalAlign: 'middle', borderRight: `1px solid ${ROW_BDR}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tdUnder: { width: 220, padding: '3px 8px', verticalAlign: 'middle', borderRight: `1px solid ${ROW_BDR}`, color: '#444', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tdOB:    { width: 160, padding: '3px 10px', verticalAlign: 'middle', textAlign: 'right', borderRight: `1px solid ${ROW_BDR}`, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  tdDrCr:  { width: 50, padding: '3px 8px', verticalAlign: 'middle', textAlign: 'center', fontSize: 11 },

  // Right panel (Tally-style)
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
    padding: '3px 100px 3px 8px',
    background: DARK_PANEL,
    borderTop: `1px solid #0d1a2a`,
    flexShrink: 0,
    height: 24,
  },
};
