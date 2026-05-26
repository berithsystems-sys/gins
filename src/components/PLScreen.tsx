/**
 * TallyPrime-style Profit & Loss A/c
 * Exact layout from TallyPrime PDF:
 * - Two-column horizontal: Expenditure (left) | Income (right)
 * - Rows: Opening Stock, Purchase Accounts, Direct Expenses, Indirect Expenses, Nett Profit | Sales Accounts, Indirect Incomes, Closing Stock
 * - Grand Total row at bottom (both sides must balance)
 * - Click/Enter on any group → expands ledger detail inline (italic, indented)
 * - F2: Period modal, Alt+P: Print, Alt+E: Export
 * - Right function button panel (Tally style)
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { exportToExcel, printReport } from '../lib/ReportUtils';

interface PLScreenProps { branchId?: string; }

const FONT     = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
const HDR_BG   = '#1f4e79';
const YELLOW   = '#ffd966';
const BORDER   = '#b8c4cc';
const LIGHT    = '#f0f4f8';
const ROW_BDR  = '#e0e6ee';
const DARK_PANEL = '#1a2a3a';
const TEAL     = '#0d6e6e';

function fmtAmt(n: number) {
  return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()}-${M[d.getMonth()]}-${d.getFullYear()}`;
  } catch { return iso; }
}

// ─── Period Modal ──────────────────────────────────────────────────────────────
function PeriodModal({ from, to, onAccept, onCancel }: {
  from: string; to: string;
  onAccept: (f: string, t: string) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const toRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onCancel]);
  return (
    <div style={pm.overlay}>
      <div style={pm.box}>
        <div style={pm.title}>Change Period  <span style={{ fontSize: 9, opacity: 0.6 }}>F2</span></div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={pm.row}>
            <label style={pm.lbl}>From Date :</label>
            <input autoFocus type="date" value={f} onChange={e => setF(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); toRef.current?.focus(); } }}
              style={pm.inp} />
          </div>
          <div style={pm.row}>
            <label style={pm.lbl}>To Date :</label>
            <input ref={toRef} type="date" value={t} onChange={e => setT(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onAccept(f, t); }}
              style={pm.inp} />
          </div>
        </div>
        <div style={{ padding: '8px 16px 12px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => onAccept(f, t)} style={pm.btnY}>Accept</button>
          <button onClick={onCancel} style={pm.btnN}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
const pm: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' },
  box:     { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.28)', width: 300, overflow: 'hidden', fontFamily: FONT },
  title:   { background: HDR_BG, color: '#fff', padding: '5px 12px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between' },
  row:     { display: 'flex', alignItems: 'center', gap: 8 },
  lbl:     { fontSize: 12, color: '#555', fontStyle: 'italic', width: 90, flexShrink: 0 },
  inp:     { flex: 1, border: 'none', borderBottom: `2px solid ${HDR_BG}`, outline: 'none', fontSize: 13, fontWeight: 700, fontFamily: FONT, padding: '2px 4px', background: '#fffde0', color: '#1a1a1a' },
  btnY:    { background: HDR_BG, color: '#fff', border: 'none', padding: '5px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, borderRadius: 2 },
  btnN:    { background: '#f0f4f8', color: '#444', border: `1px solid ${BORDER}`, padding: '5px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, borderRadius: 2 },
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PLScreen({ branchId }: PLScreenProps) {
  const [ledgers, setLedgers]       = useState<any[]>([]);
  const [vouchers, setVouchers]     = useState<any[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [period, setPeriod]         = useState({ from: '', to: '' });
  const [showPeriod, setShowPeriod] = useState(false);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(true);
  const [showPercent, setShowPercent] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    setLoading(true);
    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => r.json()),
      fetch(`/api/vouchers${q}`).then(r => r.json()),
      fetch('/api/branches').then(r => r.json()).catch(() => []),
    ]).then(([l, v, b]) => {
      setLedgers(Array.isArray(l) ? l : []);
      const vArr = Array.isArray(v) ? v : [];
      setVouchers(vArr);
      if (vArr.length > 0) {
        const dates = vArr.map((x: any) => x.date?.slice(0, 10)).filter(Boolean).sort();
        setPeriod({ from: dates[0], to: dates[dates.length - 1] });
      }
      if (branchId && Array.isArray(b)) {
        const br = b.find((x: any) => x.id === branchId);
        if (br) setCompanyName(br.name);
      } else if (Array.isArray(b) && b.length > 0) {
        setCompanyName(b[0].name);
      }
    }).catch(() => {}).finally(() => setLoading(false));

    fetch('/api/settings/company').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setCompanyName(d.name); }).catch(() => {});
  }, [branchId]);

  // ── Balance calculation ───────────────────────────────────────────────
  const calcBalance = useCallback((ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    const ob = Number(ledger?.openingBalance || 0);
    let running = ledger?.balanceType === 'Cr' ? -ob : ob;
    vouchers.forEach(v => {
      (v.entries || []).forEach((e: any) => {
        if (e.ledgerId === ledgerId) running += e.type === 'Dr' ? Number(e.amount) : -Number(e.amount);
      });
    });
    return running;
  }, [ledgers, vouchers]);

  const groupTotal = useCallback((groupName: string) => {
    return ledgers
      .filter(l => l.group === groupName || l.group_name === groupName)
      .reduce((acc, l) => acc + calcBalance(l.id), 0);
  }, [ledgers, calcBalance]);

  const groupLedgers = useCallback((groupName: string) => {
    return ledgers.filter(l => l.group === groupName || l.group_name === groupName);
  }, [ledgers]);

  const toggleGroup = (name: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  };

  // ── P&L structure (exactly as TallyPrime) ────────────────────────────
  // LEFT (Expenditure):  Opening Stock | Purchase Accounts | Direct Expenses | Indirect Expenses | Nett Profit
  // RIGHT (Income):      Sales Accounts | Direct Income | Indirect Incomes | Closing Stock
  const LEFT_GROUPS  = ['Opening Stock', 'Purchase Account', 'Direct Expenses', 'Indirect Expenses'];
  const RIGHT_GROUPS = ['Sales Account', 'Direct Income', 'Indirect Income', 'Closing Stock'];

  const leftTotal  = LEFT_GROUPS.reduce((a, g) => a + Math.abs(groupTotal(g)), 0);
  const rightTotal = RIGHT_GROUPS.reduce((a, g) => a + Math.abs(groupTotal(g)), 0);
  const grandTotal = Math.max(leftTotal, rightTotal);
  const nettProfit = rightTotal - leftTotal;   // positive = profit, negative = loss
  const salesTotal = Math.abs(groupTotal('Sales Account'));

  // ── Period label ─────────────────────────────────────────────────────
  const periodLabel = period.from && period.to
    ? `${fmtDate(period.from)} to ${fmtDate(period.to)}`
    : '1-Apr-24 to 31-Mar-25';

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT') return;
      if (e.key === 'F2') { e.preventDefault(); setShowPeriod(p => !p); }
      if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); }
      if (e.altKey && e.key.toLowerCase() === 'f') { e.preventDefault(); setShowPercent(p => !p); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ── Export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows: any[] = [];
    LEFT_GROUPS.forEach(g => rows.push({ Side: 'Expenditure', Group: g, Amount: Math.abs(groupTotal(g)) }));
    rows.push({ Side: 'Expenditure', Group: nettProfit >= 0 ? 'Nett Profit' : 'Nett Loss', Amount: Math.abs(nettProfit) });
    RIGHT_GROUPS.forEach(g => rows.push({ Side: 'Income', Group: g, Amount: Math.abs(groupTotal(g)) }));
    exportToExcel(rows, 'Profit_And_Loss');
  };

  // ── Row renderer (group + expandable ledgers) ─────────────────────────
  const renderGroupRow = (grpName: string, side: 'left' | 'right') => {
    const total = groupTotal(grpName);
    const abs   = Math.abs(total);
    const isExp = expanded.has(grpName);
    const pct   = salesTotal > 0 ? ((abs / salesTotal) * 100).toFixed(2) : '—';
    const leds  = groupLedgers(grpName).filter(l => calcBalance(l.id) !== 0);

    return (
      <React.Fragment key={grpName}>
        <tr
          style={{ ...rs.groupRow, cursor: 'pointer' }}
          onClick={() => toggleGroup(grpName)}
          className="pl-group-row"
        >
          <td style={rs.tdName}>
            <span style={rs.toggle}>{isExp ? '−' : '+'}</span>
            <span style={rs.groupName}>{grpName}</span>
          </td>
          {showPercent && <td style={rs.tdPct}>{pct} %</td>}
          <td style={rs.tdAmt}>{abs > 0 ? fmtAmt(abs) : ''}</td>
        </tr>
        {isExp && leds.map(l => {
          const bal = calcBalance(l.id);
          return (
            <tr key={l.id} style={rs.ledgerRow}>
              <td style={{ ...rs.tdName, paddingLeft: 28, fontStyle: 'italic', color: '#555' }}>{l.name}</td>
              {showPercent && <td style={rs.tdPct} />}
              <td style={{ ...rs.tdAmt, color: '#555', fontWeight: 400 }}>{fmtAmt(bal)}</td>
            </tr>
          );
        })}
      </React.Fragment>
    );
  };

  // ── Nett Profit / Loss row ────────────────────────────────────────────
  const renderNettRow = () => {
    const isProfit = nettProfit >= 0;
    const label = isProfit ? 'Nett Profit' : 'Nett Loss';
    const color  = isProfit ? '#006b00' : '#7a0000';
    return (
      <tr style={{ ...rs.groupRow, background: '#f8fbff' }}>
        <td style={{ ...rs.tdName, fontStyle: 'italic', color, paddingLeft: 20 }}>{label}</td>
        {showPercent && <td style={rs.tdPct} />}
        <td style={{ ...rs.tdAmt, color, fontWeight: 800 }}>{fmtAmt(nettProfit)}</td>
      </tr>
    );
  };

  // ── Column header (company + period) ──────────────────────────────────
  const ColHeader = () => (
    <thead>
      <tr style={{ background: LIGHT }}>
        <th style={{ ...rs.th, textAlign: 'left', width: showPercent ? '55%' : '65%' }}>Particulars</th>
        {showPercent && <th style={{ ...rs.th, width: '10%', textAlign: 'right' }}>%</th>}
        <th style={{ ...rs.th, textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#1a1a1a' }}>{companyName || '…'}</div>
          <div style={{ fontSize: 10, fontWeight: 400, color: '#666' }}>{periodLabel}</div>
        </th>
      </tr>
    </thead>
  );

  return (
    <div style={s.root} id="pl-report">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          #pl-report { border: none !important; }
        }
        .pl-group-row:hover { background: #eef4fb !important; }
      `}</style>

      {/* Period Modal */}
      {showPeriod && (
        <PeriodModal
          from={period.from} to={period.to}
          onAccept={(f, t) => { setPeriod({ from: f, to: t }); setShowPeriod(false); }}
          onCancel={() => setShowPeriod(false)}
        />
      )}

      {/* ── Title Bar ── */}
      <div style={s.titleBar}>
        <span style={{ flex: 1, fontWeight: 700 }}>Profit & Loss A/c</span>
        <span style={{ flex: 2, textAlign: 'center', fontWeight: 800, fontSize: 12 }}>{companyName || '…'}</span>
        <span style={{ flex: 1, textAlign: 'right', opacity: 0.7, fontSize: 11 }}>{periodLabel}</span>
      </div>

      {/* ── Main Content ── */}
      <div style={s.contentWrap}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={s.twoCol}>

            {/* ── LEFT: Expenditure ── */}
            <div style={s.col}>
              <table style={s.table}>
                <ColHeader />
                <tbody>
                  {LEFT_GROUPS.map(g => renderGroupRow(g, 'left'))}
                  {/* Nett Profit appears on LEFT if income > expenses */}
                  {nettProfit >= 0 && renderNettRow()}
                </tbody>
                <tfoot>
                  <tr style={s.totalRow}>
                    <td style={{ ...rs.tdName, fontWeight: 900, fontSize: 12, letterSpacing: 1, paddingLeft: 12 }}>Total</td>
                    {showPercent && <td style={rs.tdPct} />}
                    <td style={{ ...rs.tdAmt, fontWeight: 900, fontSize: 13, borderTop: '2px solid #555' }}>
                      {fmtAmt(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Column divider */}
            <div style={s.divider} />

            {/* ── RIGHT: Income ── */}
            <div style={s.col}>
              <table style={s.table}>
                <ColHeader />
                <tbody>
                  {RIGHT_GROUPS.map(g => renderGroupRow(g, 'right'))}
                  {/* Nett Loss appears on RIGHT if expenses > income */}
                  {nettProfit < 0 && renderNettRow()}
                </tbody>
                <tfoot>
                  <tr style={s.totalRow}>
                    <td style={{ ...rs.tdName, fontWeight: 900, fontSize: 12, letterSpacing: 1, paddingLeft: 12 }}>Total</td>
                    {showPercent && <td style={rs.tdPct} />}
                    <td style={{ ...rs.tdAmt, fontWeight: 900, fontSize: 13, borderTop: '2px solid #555' }}>
                      {fmtAmt(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        )}
      </div>

      {/* ── Right Function Buttons ── */}
      <div style={s.rightPanel} className="no-print">
        {[
          { k: 'F1',    l: 'Condensed',   a: () => {} },
          { k: 'F2',    l: 'Period',       a: () => setShowPeriod(true) },
          { k: 'F3',    l: 'Company',      a: () => {} },
          { k: 'F5',    l: 'Detailed',     a: () => setExpanded(new Set(['Purchase Account','Direct Expenses','Indirect Expenses','Sales Account','Direct Income','Indirect Income'])) },
          { k: 'Esc',   l: 'Collapse',     a: () => setExpanded(new Set()) },
          { k: 'Alt+F', l: 'Percentages',  a: () => setShowPercent(p => !p) },
          { k: 'Alt+P', l: 'Print',        a: () => window.print() },
          { k: 'Alt+E', l: 'Export',       a: handleExport },
          { k: 'F12',   l: 'Configure',    a: () => {} },
        ].map(b => (
          <button
            key={b.k}
            onClick={b.a}
            style={s.sideBtn}
            className="no-print"
          >
            <span style={s.sBtnKey}>{b.k}:</span>
            <span style={s.sBtnLabel}>{b.l}</span>
          </button>
        ))}
      </div>

      {/* ── Status Bar ── */}
      <div style={s.statusBar} className="no-print">
        <span style={{ color: '#aaa', fontSize: 10 }}>
          {nettProfit >= 0
            ? `Net Profit: ₹ ${fmtAmt(nettProfit)}`
            : `Net Loss: ₹ ${fmtAmt(nettProfit)}`}
        </span>
        <span style={{ color: '#aaa', fontSize: 10 }}>
          Click group to expand  |  F2: Period  |  F5: Expand All  |  Alt+F: %  |  Alt+P: Print
        </span>
      </div>
    </div>
  );
}

// ── Row styles ──────────────────────────────────────────────────────────────────
const rs: Record<string, React.CSSProperties> = {
  th: {
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 700,
    color: '#333',
    borderBottom: `1px solid ${BORDER}`,
    background: LIGHT,
    whiteSpace: 'nowrap',
  },
  groupRow: {
    borderBottom: `1px solid ${ROW_BDR}`,
    background: '#fff',
    transition: 'background 0.07s',
  },
  ledgerRow: {
    borderBottom: `1px solid ${ROW_BDR}`,
    background: '#fafbff',
  },
  tdName: {
    padding: '3px 8px',
    fontSize: 12,
    verticalAlign: 'middle',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tdAmt: {
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'right',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
  tdPct: {
    padding: '3px 6px',
    fontSize: 11,
    textAlign: 'right',
    color: '#888',
    whiteSpace: 'nowrap',
  },
  toggle: {
    display: 'inline-block',
    width: 14,
    height: 14,
    lineHeight: '14px',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 900,
    border: `1px solid ${BORDER}`,
    background: LIGHT,
    color: '#555',
    marginRight: 6,
    cursor: 'pointer',
    flexShrink: 0,
  },
  groupName: {
    fontWeight: 700,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.3,
    color: '#1a1a1a',
  },
};

// ── Layout styles ───────────────────────────────────────────────────────────────
const FONT_    = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
const s: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: FONT_,
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
  contentWrap: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: 90,
  },
  twoCol: {
    display: 'flex',
    minHeight: '100%',
  },
  col: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  divider: {
    width: 1,
    background: BORDER,
    flexShrink: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  totalRow: {
    background: LIGHT,
    borderTop: `2px double #555`,
    position: 'sticky',
    bottom: 0,
  },

  // Right panel
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
    padding: '6px 8px',
    textAlign: 'left',
    fontFamily: FONT_,
    flex: 1,
    transition: 'background 0.1s',
  },
  sBtnKey:   { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, lineHeight: 1.3 },
  sBtnLabel: { fontSize: 10, color: '#d0dae6', fontWeight: 600, lineHeight: 1.3 },

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
