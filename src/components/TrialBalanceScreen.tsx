/**
 * TallyPrime-style Trial Balance
 * - Exact layout from screenshot: two-panel header, group+ledger tree inline
 * - Click/Enter on a ledger → shows that ledger's voucher history
 * - Company name fetched dynamically
 * - System fonts only
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface Ledger {
  id: string;
  name: string;
  group: string;
  group_name?: string;
  openingBalance?: number;
  balanceType?: string;
}

interface VoucherEntry {
  ledgerId: string;
  amount: number;
  type: 'Dr' | 'Cr';
  ledger_name?: string;
}

interface Voucher {
  id: string;
  number: string;
  date: string;
  type: string;
  narration: string;
  amount: number;
  entries?: VoucherEntry[];
}

interface Branch { id: string; name: string; }

const FONT    = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
const HDR_BG  = '#1f4e79';
const YELLOW  = '#ffd966';
const BORDER  = '#b8c4cc';
const LIGHT   = '#f0f4f8';
const ROW_BDR = '#e0e6ee';

function fmtAmt(n: number) {
  return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()}-${ms[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
  } catch { return iso; }
}

// ─── Ledger Detail (voucher history for one ledger) ───────────────────────────
function LedgerDetail({ ledger, branchId, onBack }: { ledger: Ledger; branchId?: string; onBack: () => void }) {
  const [rows, setRows]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
 // ← ADD THIS BLOCK
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onBack();
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onBack]);
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/vouchers/ledger/${ledger.id}${q}`)
      .then(r => r.json())
      .then(data => { setRows(Array.isArray(data) ? data : []); })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [ledger.id, branchId]);

  const ob    = Number(ledger.openingBalance || 0);
  const obSgn = ledger.balanceType === 'Cr' ? -ob : ob;
  let running = obSgn;
  const withRunning = rows.map(r => {
    const amt = Number(r.entry_amount || 0);
    running += r.entry_type === 'Dr' ? amt : -amt;
    return { ...r, running };
  });

  const totalDr = rows.filter(r => r.entry_type === 'Dr').reduce((a, r) => a + Number(r.entry_amount || 0), 0);
  const totalCr = rows.filter(r => r.entry_type === 'Cr').reduce((a, r) => a + Number(r.entry_amount || 0), 0);
  const closing = obSgn + totalDr - totalCr;

  return (
    <div style={ds.root}>
      {/* Title */}
      <div style={ds.titleBar}>
        <button onClick={onBack} style={ds.backBtn}>← Back</button>
        <span style={ds.titleCenter}>{ledger.name}</span>
        <span />
      </div>

      {/* Sub-header */}
      <div style={ds.subHdr}>
        <div>
          <span style={ds.subLabel}>Ledger Account: </span>
          <span style={ds.subValue}>{ledger.name}</span>
          <span style={{ ...ds.subLabel, marginLeft: 24 }}>Group: </span>
          <span style={ds.subValue}>{ledger.group || ledger.group_name || '—'}</span>
        </div>
        <div>
          <span style={ds.subLabel}>Opening Balance: </span>
          <span style={{ ...ds.subValue, color: obSgn >= 0 ? '#7a0000' : '#006b00' }}>
            {fmtAmt(ob)} {ledger.balanceType || 'Dr'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={ds.tableWrap}>
        <table style={ds.table}>
          <thead>
            <tr style={ds.thead}>
              <th style={{ ...ds.th, width: 80, textAlign: 'left' }}>Date</th>
              <th style={{ ...ds.th, textAlign: 'left' }}>Particulars</th>
              <th style={{ ...ds.th, width: 100, textAlign: 'left' }}>Vch Type</th>
              <th style={{ ...ds.th, width: 70, textAlign: 'center' }}>Vch No.</th>
              <th style={{ ...ds.th, width: 120, textAlign: 'right' }}>Debit (₹)</th>
              <th style={{ ...ds.th, width: 120, textAlign: 'right' }}>Credit (₹)</th>
              <th style={{ ...ds.th, width: 130, textAlign: 'right' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening balance row */}
            <tr style={{ background: '#f8fbff', borderBottom: `1px solid ${ROW_BDR}` }}>
              <td style={ds.td} />
              <td style={{ ...ds.td, fontWeight: 700, fontStyle: 'italic', color: '#555' }}>Opening Balance</td>
              <td style={ds.td} /><td style={ds.td} />
              <td style={{ ...ds.td, textAlign: 'right', color: obSgn >= 0 ? '#7a0000' : '' }}>
                {obSgn > 0 ? fmtAmt(ob) : ''}
              </td>
              <td style={{ ...ds.td, textAlign: 'right', color: '#006b00' }}>
                {obSgn < 0 ? fmtAmt(ob) : ''}
              </td>
              <td style={{ ...ds.td, textAlign: 'right', fontWeight: 700 }}>
                {fmtAmt(ob)} {ledger.balanceType || 'Dr'}
              </td>
            </tr>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 12 }}>Loading…</td></tr>
            ) : withRunning.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 12 }}>No transactions found.</td></tr>
            ) : withRunning.map((r, i) => {
              const isDr = r.entry_type === 'Dr';
              const runType = r.running >= 0 ? 'Dr' : 'Cr';
              return (
                <tr key={`${r.id}-${i}`} style={{ ...ds.tr, background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                  <td style={ds.td}>{fmtDate(r.date)}</td>
                  <td style={{ ...ds.td, fontWeight: 600 }}>{r.narration || r.type || '—'}</td>
                  <td style={{ ...ds.td, fontStyle: 'italic', color: '#555' }}>{r.type}</td>
                  <td style={{ ...ds.td, textAlign: 'center' }}>{r.number || ''}</td>
                  <td style={{ ...ds.td, textAlign: 'right', color: '#7a0000', fontWeight: isDr ? 700 : 400 }}>
                    {isDr ? fmtAmt(r.entry_amount) : ''}
                  </td>
                  <td style={{ ...ds.td, textAlign: 'right', color: '#006b00', fontWeight: !isDr ? 700 : 400 }}>
                    {!isDr ? fmtAmt(r.entry_amount) : ''}
                  </td>
                  <td style={{ ...ds.td, textAlign: 'right', fontWeight: 600 }}>
                    {fmtAmt(r.running)} {runType}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={ds.tfoot}>
              <td colSpan={4} style={{ ...ds.tfd, fontWeight: 700, textAlign: 'right', paddingRight: 8 }}>Closing Balance</td>
              <td style={{ ...ds.tfd, textAlign: 'right', fontWeight: 700, color: '#7a0000', borderTop: '2px solid #555' }}>
                {totalDr > 0 ? fmtAmt(totalDr) : ''}
              </td>
              <td style={{ ...ds.tfd, textAlign: 'right', fontWeight: 700, color: '#006b00', borderTop: '2px solid #555' }}>
                {totalCr > 0 ? fmtAmt(totalCr) : ''}
              </td>
              <td style={{ ...ds.tfd, textAlign: 'right', fontWeight: 800, borderTop: '2px solid #555' }}>
                {fmtAmt(closing)} {closing >= 0 ? 'Dr' : 'Cr'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const ds: Record<string, React.CSSProperties> = {
  root:       { fontFamily: FONT, fontSize: 12, display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden' },
  titleBar:   { background: HDR_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 10px', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  backBtn:    { background: 'none', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: FONT, padding: '1px 10px', borderRadius: 2 },
  titleCenter:{ flex: 2, textAlign: 'center', fontWeight: 800, fontSize: 13 },
  subHdr:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 12px', background: '#fafbfd', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 },
  subLabel:   { fontSize: 11, color: '#777', fontStyle: 'italic' },
  subValue:   { fontSize: 12, fontWeight: 700, color: '#1a1a1a' },
  tableWrap:  { flex: 1, overflowY: 'auto' },
  table:      { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  thead:      { background: LIGHT, position: 'sticky', top: 0, zIndex: 5 },
  th:         { padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#333', borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${ROW_BDR}`, background: LIGHT, whiteSpace: 'nowrap' },
  tr:         { borderBottom: `1px solid ${ROW_BDR}`, transition: 'background 0.07s' },
  td:         { padding: '3px 8px', fontSize: 12, verticalAlign: 'middle', borderRight: `1px solid ${ROW_BDR}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tfoot:      { background: LIGHT, borderTop: `1px solid ${BORDER}`, position: 'sticky', bottom: 0 },
  tfd:        { padding: '4px 8px', fontSize: 12, borderRight: `1px solid ${ROW_BDR}` },
};

// ─── Main Trial Balance ────────────────────────────────────────────────────────
export default function TrialBalanceScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers]           = useState<Ledger[]>([]);
  const [vouchers, setVouchers]         = useState<Voucher[]>([]);
  const [loading, setLoading]           = useState(true);
  const [companyName, setCompanyName]   = useState('');
  const [period, setPeriod]             = useState({ from: '', to: '' });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey]   = useState<string | null>(null);  // "G:groupName" or "L:ledgerId"
  const [drillLedger, setDrillLedger]   = useState<Ledger | null>(null);
  const [showPeriod, setShowPeriod]     = useState(false);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);

  // ── Fetch company name ────────────────────────────────────────────────
  useEffect(() => {
    if (branchId) {
      fetch('/api/branches').then(r => r.json())
        .then((bs: Branch[]) => { const b = bs.find(x => x.id === branchId); if (b) setCompanyName(b.name); })
        .catch(() => {});
    }
    fetch('/api/settings/company').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setCompanyName(d.name); }).catch(() => {});
  }, [branchId]);

  // ── Fetch data ────────────────────────────────────────────────────────
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    setLoading(true);
    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => r.json()),
      fetch(`/api/vouchers${q}`).then(r => r.json()),
    ]).then(([l, v]) => {
      setLedgers(Array.isArray(l) ? l : []);
      const vArr: Voucher[] = Array.isArray(v) ? v : [];
      setVouchers(vArr);
      // Derive period from voucher dates
      if (vArr.length > 0) {
        const dates = vArr.map(x => x.date?.slice(0, 10)).filter(Boolean).sort();
        setPeriod({ from: dates[0], to: dates[dates.length - 1] });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [branchId]);

  // ── Balance calculation ───────────────────────────────────────────────
  const calcBalance = useCallback((ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    const ob  = Number(ledger?.openingBalance || 0);
    let running = ledger?.balanceType === 'Cr' ? -ob : ob;
    vouchers.forEach(v => {
      (v.entries || []).forEach(e => {
        if (e.ledgerId === ledgerId) running += e.type === 'Dr' ? e.amount : -e.amount;
      });
    });
    return running;
  }, [ledgers, vouchers]);

  // ── Group totals ──────────────────────────────────────────────────────
  const groupsData = useMemo(() => {
    const g: Record<string, { dr: number; cr: number; ledgers: Ledger[] }> = {};
    ledgers.forEach(l => {
      const grp = l.group || l.group_name || 'Ungrouped';
      if (!g[grp]) g[grp] = { dr: 0, cr: 0, ledgers: [] };
      g[grp].ledgers.push(l);
      const bal = calcBalance(l.id);
      if (bal >= 0) g[grp].dr += bal;
      else           g[grp].cr += Math.abs(bal);
    });
    return g;
  }, [ledgers, vouchers, calcBalance]);

  const sortedGroups = useMemo(() => Object.keys(groupsData).sort(), [groupsData]);

  const drTotal = Object.values(groupsData).reduce((a, g) => a + g.dr, 0);
  const crTotal = Object.values(groupsData).reduce((a, g) => a + g.cr, 0);

  // ── Build flat list for keyboard nav ──────────────────────────────────
  const flatList = useMemo(() => {
    const list: { key: string; type: 'group' | 'ledger'; group?: string; ledger?: Ledger }[] = [];
    sortedGroups.forEach(grp => {
      list.push({ key: `G:${grp}`, type: 'group', group: grp });
      if (expandedGroups.has(grp)) {
        groupsData[grp].ledgers.forEach(l => {
          list.push({ key: `L:${l.id}`, type: 'ledger', group: grp, ledger: l });
        });
      }
    });
    return list;
  }, [sortedGroups, expandedGroups, groupsData]);

  const selIdx = flatList.findIndex(r => r.key === selectedKey);

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'F2') { e.preventDefault(); setShowPeriod(p => !p); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const ni = Math.min(flatList.length - 1, selIdx + 1);
        setSelectedKey(flatList[ni]?.key ?? null);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const ni = Math.max(0, selIdx - 1);
        setSelectedKey(flatList[ni]?.key ?? null);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = flatList[selIdx];
        if (!item) return;
        if (item.type === 'group') {
          setExpandedGroups(prev => { const n = new Set(prev); n.has(item.group!) ? n.delete(item.group!) : n.add(item.group!); return n; });
        } else if (item.type === 'ledger' && item.ledger) {
          setDrillLedger(item.ledger);
        }
        return;
      }
      if (e.key === 'Escape') {
        setExpandedGroups(new Set());
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [flatList, selIdx]);

  const periodLabel = period.from && period.to
    ? `${fmtDate(period.from)} to ${fmtDate(period.to)}`
    : 'All Dates';

  // ── Ledger drill-down view ────────────────────────────────────────────
  if (drillLedger) {
    return <LedgerDetail ledger={drillLedger} branchId={branchId} onBack={() => setDrillLedger(null)} />;
  }

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <style>{`
        @media print { .no-print { display:none!important; } }
        .tb-row:hover { background: #eef4fb !important; cursor: pointer; }
        .tb-row.sel { background: ${YELLOW} !important; color: #000 !important; }
        .tb-ledger-row:hover { background: #f0f8ff !important; cursor: pointer; }
        .tb-ledger-row.sel { background: ${YELLOW} !important; }
        .grp-toggle { font-size:10px; opacity:0.5; margin-right:4px; }
      `}</style>

      {/* ── Title Bar ── */}
      <div style={s.titleBar}>
        <span style={s.titleLeft}>Trial Balance</span>
        <span style={s.titleCenter}>{companyName || '…'}</span>
        <span style={s.titleRight}>✕</span>
      </div>

      {/* ── Two-panel report header (exact Tally layout) ── */}
      <div style={s.reportHdr}>
        {/* Left: Particulars label */}
        <div style={s.hdrLeft}>
          <span style={s.hdrParticulars}>P a r t i c u l a r s</span>
        </div>
        {/* Right: company + period + Closing Balance header */}
        <div style={s.hdrRight}>
          <div style={s.hdrCompany}>{companyName || '…'}</div>
          <div style={s.hdrPeriod}>{periodLabel}</div>
          <div style={s.hdrClosing}>Closing Balance</div>
          <div style={s.hdrDrCr}>
            <span style={s.hdrDebit}>Debit</span>
            <span style={s.hdrCredit}>Credit</span>
          </div>
        </div>
      </div>

      {/* ── Period Modal ── */}
      {showPeriod && (
        <div style={s.modalOverlay} className="no-print">
          <div style={s.modal}>
            <div style={s.modalTitle}>Change Period (F2)</div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={s.periodRow}>
                <label style={s.periodLabel}>From Date :</label>
                <input ref={fromRef} type="date" value={period.from} onChange={e => setPeriod(p => ({ ...p, from: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); toRef.current?.focus(); } }}
                  style={s.periodInput} autoFocus />
              </div>
              <div style={s.periodRow}>
                <label style={s.periodLabel}>To Date :</label>
                <input ref={toRef} type="date" value={period.to} onChange={e => setPeriod(p => ({ ...p, to: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') setShowPeriod(false); }}
                  style={s.periodInput} />
              </div>
            </div>
            <div style={{ padding: '8px 16px 12px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowPeriod(false)} style={s.btnYes}>Accept</button>
              <button onClick={() => setShowPeriod(false)} style={s.btnNo}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div style={s.tableWrap}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 13 }}>Loading…</div>
        ) : (
          <table style={s.table}>
            <tbody>
              {sortedGroups.map(grp => {
                const gd   = groupsData[grp];
                const gKey = `G:${grp}`;
                const isSel   = selectedKey === gKey;
                const isExpanded = expandedGroups.has(grp);

                return (
                  <React.Fragment key={grp}>
                    {/* ── Group row ── */}
                    <tr
                      className={`tb-row${isSel ? ' sel' : ''}`}
                      style={s.groupRow}
                      onClick={() => {
                        setSelectedKey(gKey);
                        setExpandedGroups(prev => { const n = new Set(prev); n.has(grp) ? n.delete(grp) : n.add(grp); return n; });
                      }}
                    >
                      <td style={s.colParticulars}>
                        <span className="grp-toggle">{isExpanded ? '▼' : '▶'}</span>
                        <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.2 }}>{grp}</span>
                      </td>
                      <td style={s.colDebit}>
                        {gd.dr > 0 ? fmtAmt(gd.dr) : ''}
                      </td>
                      <td style={s.colCredit}>
                        {gd.cr > 0 ? fmtAmt(gd.cr) : ''}
                      </td>
                    </tr>

                    {/* ── Ledger rows (expanded) ── */}
                    {isExpanded && gd.ledgers.map(l => {
                      const bal    = calcBalance(l.id);
                      const lKey   = `L:${l.id}`;
                      const isLSel = selectedKey === lKey;
                      return (
                        <tr
                          key={l.id}
                          className={`tb-ledger-row${isLSel ? ' sel' : ''}`}
                          style={s.ledgerRow}
                          onClick={() => { setSelectedKey(lKey); setDrillLedger(l); }}
                        >
                          <td style={{ ...s.colParticulars, paddingLeft: 32, fontWeight: 500, color: '#222', fontSize: 12 }}>
                            {l.name}
                          </td>
                          <td style={{ ...s.colDebit, color: '#7a0000' }}>
                            {bal >= 0 && bal !== 0 ? fmtAmt(bal) : ''}
                          </td>
                          <td style={{ ...s.colCredit, color: '#006b00' }}>
                            {bal < 0 ? fmtAmt(Math.abs(bal)) : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Grand Total (sticky bottom, spaced like Tally) ── */}
      <div style={s.grandTotal}>
        <div style={s.gtLabel}>G r a n d &nbsp; T o t a l</div>
        <div style={s.gtDebit}>{drTotal > 0 ? fmtAmt(drTotal) : ''}</div>
        <div style={s.gtCredit}>{crTotal > 0 ? fmtAmt(crTotal) : ''}</div>
      </div>

      {/* ── Right Button Panel ── */}
      <div style={s.rightPanel} className="no-print">
        {[
          { k: 'F2',    l: 'Period',    a: () => setShowPeriod(true) },
          { k: 'F3',    l: 'Company',   a: () => {} },
          { k: 'F10',   l: 'Expand All', a: () => setExpandedGroups(new Set(sortedGroups)) },
          { k: 'Esc',   l: 'Collapse',  a: () => setExpandedGroups(new Set()) },
          { k: 'Alt+P', l: 'Print',     a: () => window.print() },
          { k: 'F12',   l: 'Configure', a: () => {} },
        ].map(b => (
          <button key={b.k} onClick={b.a} style={s.sideBtn}>
            <span style={s.sideBtnKey}>{b.k}</span>
            <span style={s.sideBtnLabel}>{b.l}</span>
          </button>
        ))}
      </div>

      {/* ── Status bar ── */}
      <div style={s.statusBar} className="no-print">
        <span style={{ color: '#aaa', fontSize: 10 }}>
          {loading ? 'Loading…' : `${ledgers.length} ledgers in ${sortedGroups.length} groups`}
        </span>
        <span style={{ color: '#aaa', fontSize: 10 }}>
          ↑↓: Navigate  |  Enter: Expand/Open  |  Esc: Collapse  |  F2: Period  |  Click ledger for details
        </span>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
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
  titleLeft:   { flex: 1, fontWeight: 700 },
  titleCenter: { flex: 2, textAlign: 'center', fontWeight: 800, fontSize: 12 },
  titleRight:  { flex: 1, textAlign: 'right', opacity: 0.7, cursor: 'pointer', fontSize: 13 },

  // Two-panel header
  reportHdr: {
    display: 'flex',
    borderBottom: `2px solid ${BORDER}`,
    flexShrink: 0,
    paddingRight: 90,
  },
  hdrLeft: {
    flex: 1,
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'flex-end',
    borderRight: `1px solid ${BORDER}`,
  },
  hdrParticulars: {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 3,
    color: '#1a1a1a',
  },
  hdrRight: {
    width: 300,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 0 0',
    borderRight: `1px solid ${BORDER}`,
  },
  hdrCompany: { fontSize: 12, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.4 },
  hdrPeriod:  { fontSize: 11, color: '#555', lineHeight: 1.3, marginBottom: 4 },
  hdrClosing: { fontSize: 11, fontWeight: 800, color: '#1a1a1a', borderTop: `1px solid ${BORDER}`, width: '100%', textAlign: 'center', padding: '2px 0', borderBottom: `1px solid ${BORDER}` },
  hdrDrCr: {
    display: 'flex',
    width: '100%',
  },
  hdrDebit:  { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRight: `1px solid ${BORDER}` },
  hdrCredit: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '2px 8px' },

  // Table
  tableWrap: { flex: 1, overflowY: 'auto', paddingRight: 90 },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },

  groupRow: {
    borderBottom: `1px solid ${ROW_BDR}`,
    background: '#fff',
    transition: 'background 0.07s',
  },
  ledgerRow: {
    borderBottom: `1px solid ${ROW_BDR}`,
    background: '#fafbff',
    transition: 'background 0.07s',
  },

  colParticulars: {
    padding: '3px 8px',
    fontSize: 12,
    verticalAlign: 'middle',
    borderRight: `1px solid ${ROW_BDR}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  colDebit: {
    width: 150,
    padding: '3px 10px',
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 600,
    verticalAlign: 'middle',
    borderRight: `1px solid ${ROW_BDR}`,
    whiteSpace: 'nowrap',
  },
  colCredit: {
    width: 150,
    padding: '3px 10px',
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 600,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },

  // Grand total bar
  grandTotal: {
    display: 'flex',
    alignItems: 'center',
    borderTop: `2px solid #555`,
    background: '#fff',
    paddingRight: 90,
    flexShrink: 0,
  },
  gtLabel:  { flex: 1, padding: '5px 12px', fontSize: 13, fontWeight: 900, letterSpacing: 3, color: '#1a1a1a', borderRight: `1px solid ${ROW_BDR}` },
  gtDebit:  { width: 150, padding: '5px 10px', textAlign: 'right', fontSize: 13, fontWeight: 900, borderRight: `1px solid ${ROW_BDR}`, fontVariantNumeric: 'tabular-nums' },
  gtCredit: { width: 150, padding: '5px 10px', textAlign: 'right', fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums' },

  // Right panel
  rightPanel: {
    position: 'absolute',
    top: 26,
    right: 0,
    bottom: 24,
    width: 88,
    background: '#1a2a3a',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: `1px solid #0d1a2a`,
  },
  sideBtn: {
    background: 'none',
    border: 'none',
    borderBottom: `1px solid rgba(255,255,255,0.08)`,
    color: '#cdd5e0',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '6px 8px',
    textAlign: 'left',
    fontFamily: FONT,
    flex: 1,
    transition: 'background 0.1s',
  },
  sideBtnKey:   { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, lineHeight: 1.2 },
  sideBtnLabel: { fontSize: 11, color: '#d0dae6', fontWeight: 600, lineHeight: 1.3 },

  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 100px 3px 8px',
    background: '#1a2a3a',
    borderTop: `1px solid #0d1a2a`,
    flexShrink: 0,
    height: 24,
  },

  // Period modal
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' },
  modal:        { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', width: 320, overflow: 'hidden' },
  modalTitle:   { background: HDR_BG, color: '#fff', padding: '5px 12px', fontSize: 12, fontWeight: 700 },
  periodRow:    { display: 'flex', alignItems: 'center', gap: 8 },
  periodLabel:  { fontSize: 12, color: '#444', width: 90, fontStyle: 'italic' },
  periodInput:  { flex: 1, border: 'none', borderBottom: `1px solid #999`, outline: 'none', fontSize: 13, fontWeight: 700, fontFamily: FONT, padding: '2px', background: 'transparent', color: '#1a1a1a' },
  btnYes:       { background: 'none', border: 'none', color: '#0000cc', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: 'underline', padding: '2px 4px' },
  btnNo:        { background: 'none', border: 'none', color: '#cc0000', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: 'underline', padding: '2px 4px' },
};
