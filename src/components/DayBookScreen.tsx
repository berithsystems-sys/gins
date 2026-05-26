/**
 * TallyPrime-style Day Book Screen
 * - Matches the exact Tally Day Book layout from screenshot
 * - Company name fetched dynamically from API/props
 * - System fonts only, clean professional look
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, isValid, parseISO } from 'date-fns';

interface VoucherEntry {
  ledgerId: string;
  ledger_name?: string;
  amount: number;
  type: 'Dr' | 'Cr';
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

interface Branch {
  id: string;
  name: string;
}

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;

const HEADER_BG  = '#1f4e79';
const TAB_BG     = '#2e75b6';
const HIGHLIGHT  = '#ffd966';  // Tally's yellow selected-row
const ROW_BORDER = '#e0e6ee';
const LIGHT_BG   = '#f0f4f8';
const BORDER     = '#b0b8c4';

function fmtDate(iso: string) {
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso;
    return format(d, 'd-MMM-yy');
  } catch { return iso; }
}

function fmtAmount(n: number) {
  if (!n && n !== 0) return '';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function DayBookScreen({
  branchId,
  initialDate,
  fromDate: propFrom,
  toDate: propTo,
  user,
}: {
  branchId?: string;
  initialDate?: string;
  fromDate?: string;
  toDate?: string;
  user?: any;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [vouchers, setVouchers]     = useState<Voucher[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fromDate, setFromDate]     = useState(propFrom || initialDate || today);
  const [toDate, setToDate]         = useState(propTo   || initialDate || today);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [showPeriod, setShowPeriod] = useState(false);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);

  // ── Fetch company name from branch or API ──────────────────────────────
  useEffect(() => {
    if (branchId) {
      fetch(`/api/branches`)
        .then(r => r.json())
        .then((branches: Branch[]) => {
          const b = branches.find(b => b.id === branchId);
          if (b?.name) setCompanyName(b.name);
        })
        .catch(() => {});
    }
    // Also try HQ company name from a settings endpoint if it exists
    fetch('/api/settings/company')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setCompanyName(d.name); })
      .catch(() => {});
  }, [branchId]);

  // ── Fetch vouchers ─────────────────────────────────────────────────────
  const fetchData = useCallback(() => {
    setLoading(true);
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/vouchers${q}`)
      .then(r => r.json())
      .then((data: Voucher[]) => {
        const filtered = data.filter(v => {
          if (!v.date) return false;
          const d = v.date.slice(0, 10);
          return d >= fromDate && d <= toDate;
        });
        // Sort by date asc, then voucher number
        filtered.sort((a, b) => {
          const dd = a.date.localeCompare(b.date);
          if (dd !== 0) return dd;
          return (a.number || '').localeCompare(b.number || '');
        });
        setVouchers(filtered);
      })
      .catch(() => setVouchers([]))
      .finally(() => setLoading(false));
  }, [branchId, fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('VOID VOUCHER: Are you sure you want to delete this transaction? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/vouchers/${id}`, { method: 'DELETE' });
      if (res.ok) { alert('Voucher Voided Successfully'); fetchData(); }
      else alert('Failed to void voucher');
    } catch { alert('Network error'); }
  };

  // ── Print ──────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── Export CSV ─────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ['Date','Particulars','Vch Type','Vch No.','Debit Amount','Credit Amount'],
      ...vouchers.map(v => {
        const dr = (v.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);
        const cr = (v.entries || []).filter(e => e.type === 'Cr').reduce((a, e) => a + e.amount, 0);
        return [fmtDate(v.date), v.narration || '', v.type, v.number || '', dr || '', cr || ''];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `DayBook_${fromDate}_to_${toDate}.csv`;
    a.click();
  };

  // ── Keyboard ───────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setShowPeriod(p => !p); }
      if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); handlePrint(); }
      if (e.altKey && e.key.toLowerCase() === 'e') { e.preventDefault(); handleExport(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [vouchers]);

  // ── Totals ─────────────────────────────────────────────────────────────
  const drTotal = vouchers.reduce((acc, v) => {
    const dr = (v.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);
    return acc + (dr || v.amount || 0);
  }, 0);
  const crTotal = vouchers.reduce((acc, v) => {
    const cr = (v.entries || []).filter(e => e.type === 'Cr').reduce((a, e) => a + e.amount, 0);
    return acc + cr;
  }, 0);

  const periodLabel = fromDate === toDate
    ? fmtDate(fromDate)
    : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
        .db-row:hover { background: #eef4fb !important; cursor: pointer; }
        .db-row.selected { background: ${HIGHLIGHT} !important; }
        .void-btn { opacity: 0; }
        .db-row:hover .void-btn { opacity: 1; }
      `}</style>

      {/* ── Title Bar ── */}
      <div style={s.titleBar}>
        <span style={s.titleLeft}>Day Book</span>
        <span style={s.titleCenter}>{companyName || '…'}</span>
        <span style={s.titleRight}>✕</span>
      </div>

      {/* ── Report Header (below title, like Tally) ── */}
      <div style={s.reportHeader}>
        <span style={s.reportTitle}>Day Book</span>
        <span style={s.reportPeriod}>{periodLabel}</span>
      </div>

      {/* ── Sub-header: "List of All Vouchers" ── */}
      <div style={s.subHeader}>
        <span style={s.subTitle}>List of All Vouchers</span>
      </div>

      {/* ── Period Modal ── */}
      {showPeriod && (
        <div style={s.modalOverlay} className="no-print">
          <div style={s.modal}>
            <div style={s.modalTitle}>Change Period (F2)</div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={s.periodRow}>
                <label style={s.periodLabel}>From Date :</label>
                <input
                  ref={fromRef}
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); toRef.current?.focus(); } }}
                  style={s.periodInput}
                  autoFocus
                />
              </div>
              <div style={s.periodRow}>
                <label style={s.periodLabel}>To Date :</label>
                <input
                  ref={toRef}
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { setShowPeriod(false); fetchData(); } }}
                  style={s.periodInput}
                />
              </div>
            </div>
            <div style={{ padding: '8px 16px 12px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setShowPeriod(false); fetchData(); }} style={s.btnYes}>Accept</button>
              <button onClick={() => setShowPeriod(false)} style={s.btnNo}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Table ── */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.theadRow}>
              <th style={{ ...s.th, width: 80, textAlign: 'left' }}>Date</th>
              <th style={{ ...s.th, textAlign: 'left' }}>Particulars</th>
              <th style={{ ...s.th, width: 130, textAlign: 'left' }}>Vch Type</th>
              <th style={{ ...s.th, width: 80, textAlign: 'center' }}>Vch No.</th>
              <th style={{ ...s.th, width: 130, textAlign: 'right' }}>
                Debit Amount<br />
                <span style={s.subCol}>Inwards Qty</span>
              </th>
              <th style={{ ...s.th, width: 130, textAlign: 'right' }}>
                Credit Amount<br />
                <span style={s.subCol}>Outwards Qty</span>
              </th>
              <th style={{ ...s.th, width: 50, textAlign: 'center' }} className="no-print" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 12 }}>
                  Loading vouchers…
                </td>
              </tr>
            ) : vouchers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 12 }}>
                  No vouchers found for this period.
                </td>
              </tr>
            ) : vouchers.map((v) => {
              const drAmt = (v.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);
              const crAmt = (v.entries || []).filter(e => e.type === 'Cr').reduce((a, e) => a + e.amount, 0);
              // Fallback: if no entries breakdown, use voucher amount as debit
              const displayDr = drAmt || (crAmt === 0 ? v.amount : 0);
              const displayCr = crAmt;
              const isSelected = selectedId === v.id;
              return (
                <tr
                  key={v.id}
                  className={`db-row${isSelected ? ' selected' : ''}`}
                  style={{ ...s.tr, background: isSelected ? HIGHLIGHT : '#fff' }}
                  onClick={() => setSelectedId(v.id === selectedId ? null : v.id)}
                >
                  <td style={{ ...s.td, color: '#333' }}>{fmtDate(v.date)}</td>
                  <td style={{ ...s.td, fontWeight: 700, color: '#1a1a1a' }}>
                    {v.narration || <span style={{ fontStyle: 'italic', color: '#aaa' }}>(Blank)</span>}
                  </td>
                  <td style={{ ...s.td, color: '#555', fontStyle: 'italic' }}>{v.type}</td>
                  <td style={{ ...s.td, textAlign: 'center', color: '#333' }}>{v.number || ''}</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: displayDr ? 600 : 400, color: '#1a1a1a' }}>
                    {displayDr ? fmtAmount(displayDr) : ''}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: displayCr ? 600 : 400, color: '#1a1a1a' }}>
                    {displayCr ? fmtAmount(displayCr) : ''}
                  </td>
                  <td style={{ ...s.td, textAlign: 'center' }} className="no-print">
                    <button
                      className="void-btn"
                      onClick={e => { e.stopPropagation(); handleDelete(v.id); }}
                      style={s.voidBtn}
                    >
                      Void
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={s.tfootRow}>
              <td colSpan={4} style={{ ...s.tfoot, textAlign: 'right', paddingRight: 8, fontWeight: 700, fontSize: 11 }}>
                Grand Total
              </td>
              <td style={{ ...s.tfoot, textAlign: 'right', fontWeight: 700, borderTop: '2px solid #555' }}>
                {drTotal > 0 ? fmtAmount(drTotal) : ''}
              </td>
              <td style={{ ...s.tfoot, textAlign: 'right', fontWeight: 700, borderTop: '2px solid #555' }}>
                {crTotal > 0 ? fmtAmount(crTotal) : ''}
              </td>
              <td className="no-print" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Right Button Panel (Tally style) ── */}
      <div style={s.rightPanel} className="no-print">
        {[
          { key: 'F2',     label: 'Period',    action: () => setShowPeriod(true) },
          { key: 'F3',     label: 'Company',   action: () => {} },
          { key: 'F4',     label: 'Vch Type',  action: () => {} },
          { key: 'F5',     label: 'Refresh',   action: fetchData },
          { key: 'Alt+P',  label: 'Print',     action: handlePrint },
          { key: 'Alt+E',  label: 'Export',    action: handleExport },
          { key: 'F12',    label: 'Configure', action: () => {} },
        ].map(btn => (
          <button key={btn.key} onClick={btn.action} style={s.sideBtn}>
            <span style={s.sideBtnKey}>{btn.key}</span>
            <span style={s.sideBtnLabel}>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* ── Status bar ── */}
      <div style={s.statusBar} className="no-print">
        <span style={{ color: '#aaa', fontSize: 10 }}>
          {loading ? 'Loading…' : `${vouchers.length} voucher${vouchers.length !== 1 ? 's' : ''}`}
        </span>
        <span style={{ color: '#aaa', fontSize: 10 }}>F2: Period  |  Alt+P: Print  |  Alt+E: Export CSV</span>
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
    position: 'relative',
    border: `1px solid ${BORDER}`,
    borderRadius: 2,
    overflow: 'hidden',
  },
  titleBar: {
    background: HEADER_BG,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.2,
    flexShrink: 0,
  },
  titleLeft:   { flex: 1, fontWeight: 700 },
  titleCenter: { flex: 2, textAlign: 'center', fontWeight: 700, fontSize: 12 },
  titleRight:  { flex: 1, textAlign: 'right', cursor: 'pointer', opacity: 0.7, fontSize: 13 },
  reportHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    padding: '6px 12px 2px',
    background: '#fff',
    borderBottom: `1px solid ${BORDER}`,
    flexShrink: 0,
  },
  reportTitle:  { fontSize: 14, fontWeight: 700, color: '#1a1a1a' },
  reportPeriod: { fontSize: 12, fontWeight: 600, color: '#444' },
  subHeader: {
    padding: '1px 12px 3px',
    background: '#fff',
    borderBottom: `2px solid ${BORDER}`,
    flexShrink: 0,
  },
  subTitle: { fontSize: 11, fontStyle: 'italic', color: '#555', fontWeight: 400 },
  tableWrap: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'auto',
    paddingRight: 96, // space for right panel
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  theadRow: {
    background: LIGHT_BG,
    borderBottom: `1px solid ${BORDER}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  th: {
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 700,
    color: '#333',
    borderBottom: `1px solid ${BORDER}`,
    borderRight: `1px solid ${ROW_BORDER}`,
    background: LIGHT_BG,
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
    lineHeight: 1.4,
  },
  subCol: {
    fontSize: 10,
    fontWeight: 400,
    color: '#777',
    fontStyle: 'italic',
  },
  tr: {
    borderBottom: `1px solid ${ROW_BORDER}`,
    transition: 'background 0.08s',
  },
  td: {
    padding: '3px 8px',
    fontSize: 12,
    verticalAlign: 'middle',
    borderRight: `1px solid ${ROW_BORDER}`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.5,
  },
  tfootRow: {
    background: LIGHT_BG,
    borderTop: `1px solid ${BORDER}`,
    position: 'sticky',
    bottom: 0,
  },
  tfoot: {
    padding: '4px 8px',
    fontSize: 12,
    borderRight: `1px solid ${ROW_BORDER}`,
  },
  voidBtn: {
    background: 'none',
    border: '1px solid #f5a0a0',
    borderRadius: 2,
    color: '#c00',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 700,
    fontFamily: FONT,
    padding: '1px 5px',
    textTransform: 'uppercase' as const,
    transition: 'all 0.1s',
  },
  rightPanel: {
    position: 'absolute',
    top: 26,   // below title bar
    right: 0,
    bottom: 24, // above status bar
    width: 90,
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
    transition: 'background 0.1s',
    flex: 1,
  },
  sideBtnKey:   { fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 700, lineHeight: 1.2 },
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
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.4)',
  },
  modal: {
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 2,
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    width: 340,
    overflow: 'hidden',
  },
  modalTitle: {
    background: HEADER_BG,
    color: '#fff',
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 700,
  },
  periodRow: { display: 'flex', alignItems: 'center', gap: 8 },
  periodLabel: { fontSize: 12, color: '#444', width: 90, fontStyle: 'italic', fontWeight: 500 },
  periodInput: {
    flex: 1,
    border: 'none',
    borderBottom: `1px solid #999`,
    outline: 'none',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: FONT,
    padding: '2px 2px',
    background: 'transparent',
    color: '#1a1a1a',
  },
  btnYes: {
    background: 'none', border: 'none', color: '#0000cc', cursor: 'pointer',
    fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: 'underline', padding: '2px 4px',
  },
  btnNo: {
    background: 'none', border: 'none', color: '#cc0000', cursor: 'pointer',
    fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: 'underline', padding: '2px 4px',
  },
};
