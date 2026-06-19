/**
 * CashBankBookScreen — v3
 * 1. Company name fetched from /api/settings/company (+ /api/branches fallback)
 *    and shown in header + period bar, identical to BalanceSheetScreen
 * 2. Period selector (F2) — filters all balances & inflow/outflow to chosen date range
 * 3. LedgerDetail drill-down (click or Enter on a ledger row) — full transaction list
 *    for the selected period, with running balance, print (Alt+P), Esc to go back
 * 4. Keyboard nav: ↑↓ move rows, → / Enter expand/drill, ← collapse/back-to-section
 * 5. Alt+P prints summary (main view) or ledger statement (drill-down view)
 */

import React, {
  useState, useEffect, useMemo, useRef, useCallback, Component, ReactNode,
} from 'react';
import { Landmark, Wallet, ChevronRight } from 'lucide-react';
import { activeVouchers, isVoided } from '../lib/voucherUtils';
import { isCashBankGroup } from '../lib/accountGroups';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LedgerSummary {
  id: string;
  name: string;
  group: string;
  openingBalance?: number;
  balanceType?: 'Dr' | 'Cr';
  balance: number;           // computed closing balance for period
}

type NavRowType =
  | { type: 'section'; key: string; label: string }
  | { type: 'ledger';  ledger: LedgerSummary };

// ── Constants ─────────────────────────────────────────────────────────────────
const FONT_  = `-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,sans-serif`;
const HDR_BG = '#0f766e';   // teal
const BORDER = '#b8c4cc';
const DARK   = '#1a2a3a';
const BD     = '#e0e6ee';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtAbs = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()}-${M[d.getMonth()]}-${d.getFullYear()}`;
  } catch { return iso; }
};

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    const self = this as any;
    if (self.state.error) return (
      <div style={{ padding: 40, textAlign: 'center', color: '#7a0000', fontFamily: FONT_ }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠ Render Error</div>
        <div style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>
          {(self.state.error as Error).message}
        </div>
        <button onClick={() => self.setState({ error: null })}
          style={{ marginTop: 16, padding: '5px 18px', background: HDR_BG, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 2 }}>
          Retry
        </button>
      </div>
    );
    return self.props.children;
  }
}

// ── PeriodModal (F2) ──────────────────────────────────────────────────────────
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.28)', width: 300, overflow: 'hidden', fontFamily: FONT_ }}>
        <div style={{ background: HDR_BG, color: '#fff', padding: '5px 12px', fontSize: 12, fontWeight: 700 }}>
          Change Period <span style={{ fontSize: 9, opacity: 0.6 }}>F2</span>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {([
            { lbl: 'From Date :', val: f, set: setF, ref: undefined as any,
              onKey: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); toRef.current?.focus(); } } },
            { lbl: 'To Date :',   val: t, set: setT, ref: toRef,
              onKey: (e: React.KeyboardEvent) => { if (e.key === 'Enter') onAccept(f, t); } },
          ] as const).map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#555', fontStyle: 'italic', width: 90, flexShrink: 0 }}>{row.lbl}</label>
              <input autoFocus={i === 0} ref={row.ref} type="date" value={row.val}
                onChange={e => row.set(e.target.value)} onKeyDown={row.onKey}
                style={{ flex: 1, border: 'none', borderBottom: `2px solid ${HDR_BG}`, outline: 'none', fontSize: 13, fontWeight: 700, fontFamily: FONT_, padding: '2px 4px', background: '#fffde0', color: '#1a1a1a' }} />
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 16px 12px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => onAccept(f, t)} style={{ background: HDR_BG, color: '#fff', border: 'none', padding: '5px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_, borderRadius: 2 }}>Accept</button>
          <button onClick={onCancel} style={{ background: '#f0f4f8', color: '#444', border: `1px solid ${BORDER}`, padding: '5px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_, borderRadius: 2 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── LedgerDetail (drill-down) ─────────────────────────────────────────────────
function LedgerDetail({ ledger, branchId, period, onBack, onPrint, companyName }: {
  ledger: LedgerSummary;
  branchId?: string;
  period: { from: string; to: string };
  onBack: () => void;
  onPrint?: (data: any) => void;
  companyName: string;
}) {
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/vouchers/ledger/${ledger.id}${q}`)
      .then(r => r.json())
      .then(d => {
        const all = (Array.isArray(d) ? d : []).filter((v: any) => !isVoided(v));
        // Filter to period
        const filtered = all.filter((r: any) => {
          const date = (r.date || '').slice(0, 10);
          if (period.from && date < period.from) return false;
          if (period.to   && date > period.to)   return false;
          return true;
        });
        setRows(filtered);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [ledger.id, branchId, period]);

  const ob     = Number(ledger.openingBalance || 0);
  const obSgn  = ledger.balanceType === 'Cr' ? -ob : ob;
  let running  = obSgn;

  const withRun = rows.map(r => {
    const amt = Number(r.entry_amount || 0);
    running  += r.entry_type === 'Dr' ? amt : -amt;
    return { ...r, running };
  });

  const totalDr = rows.filter(r => r.entry_type === 'Dr').reduce((a, r) => a + Number(r.entry_amount || 0), 0);
  const totalCr = rows.filter(r => r.entry_type === 'Cr').reduce((a, r) => a + Number(r.entry_amount || 0), 0);
  const closing = obSgn + totalDr - totalCr;

  const periodStr = period.from && period.to
    ? `${fmtDate(period.from)} to ${fmtDate(period.to)}`
    : 'All Dates';

  // ── Print ledger statement ──────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    let runBal = obSgn;
    const printRows = rows.map(r => {
      const amt = Number(r.entry_amount || 0);
      runBal += r.entry_type === 'Dr' ? amt : -amt;
      return {
        date: fmtDate(r.date),
        particulars: r.narration || r.type || '—',
        vchType: r.type || '',
        vchNo: r.number || '',
        debit: r.entry_type === 'Dr' ? amt : undefined,
        credit: r.entry_type === 'Cr' ? amt : undefined,
        balance: Math.abs(runBal),
        runType: runBal >= 0 ? ('Dr' as const) : ('Cr' as const)
      };
    });

    if (onPrint) {
      onPrint({
        type: 'ledger',
        companyName,
        ledgerName: ledger.name,
        period: periodStr,
        openingBalance: ob,
        balanceType: ledger.balanceType || 'Dr',
        rows: printRows,
        closingBalance: Math.abs(closing),
        closingType: closing >= 0 ? 'Dr' : 'Cr'
      });
    } else {
      const bodyRows = printRows.map((r, i) => {
        const isDr    = r.runType === 'Dr';
        return `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafbfd'}">
          <td style="padding:3px 8px;border-right:1px solid ${BD}">${r.date}</td>
          <td style="padding:3px 8px;font-weight:600;border-right:1px solid ${BD};max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.particulars}</td>
          <td style="padding:3px 8px;font-style:italic;color:#555;border-right:1px solid ${BD}">${r.vchType}</td>
          <td style="padding:3px 8px;text-align:center;border-right:1px solid ${BD}">${r.vchNo}</td>
          <td style="padding:3px 10px;text-align:right;color:#7a0000;font-weight:${isDr ? 700 : 400};border-right:1px solid ${BD}">${r.debit ? fmtAbs(r.debit) : ''}</td>
          <td style="padding:3px 10px;text-align:right;color:#006b00;font-weight:${!isDr ? 700 : 400};border-right:1px solid ${BD}">${r.credit ? fmtAbs(r.credit) : ''}</td>
          <td style="padding:3px 10px;text-align:right;font-weight:600">${fmtAbs(r.balance)} ${r.runType}</td>
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head>
        <title>Ledger – ${ledger.name}</title><meta charset="utf-8"/>
        <style>
          @page { margin: 12mm; size: A4 landscape; }
          * { box-sizing: border-box; }
          body { font-family: ${FONT_}; margin: 0; padding: 0; font-size: 12px; }
          .hdr { background: ${HDR_BG}; color: #fff; padding: 8px 14px; }
          .hdr h1 { margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
          .hdr .sub { font-size: 10px; margin-top: 3px; opacity: 0.85; }
          .meta { display: flex; justify-content: space-between; background: #f0f4f8; padding: 5px 12px; border-bottom: 1px solid ${BORDER}; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; }
          thead th { background: #f0f4f8; padding: 4px 8px; font-size: 11px; font-weight: 700; border-bottom: 1px solid ${BORDER}; border-right: 1px solid ${BD}; text-align: left; white-space: nowrap; }
          thead th:nth-child(4) { text-align: center; }
          thead th:nth-child(5), thead th:nth-child(6), thead th:nth-child(7) { text-align: right; }
          .ob-row td { background: #f8fbff; font-weight: 700; font-style: italic; color: #555; padding: 3px 8px; border-bottom: 1px solid ${BD}; border-right: 1px solid ${BD}; }
          tfoot td { background: #f0f4f8; font-weight: 700; padding: 4px 8px; border-top: 2px solid ${HDR_BG}; border-right: 1px solid ${BD}; }
          tfoot td:nth-child(5) { text-align: right; color: #7a0000; }
          tfoot td:nth-child(6) { text-align: right; color: #006b00; }
          tfoot td:nth-child(7) { text-align: right; font-weight: 800; }
          .footer { text-align: right; font-size: 9px; color: #888; padding: 5px 10px; border-top: 1px solid #ddd; margin-top: 4px; }
        </style>
      </head><body>
        <div class="hdr">
          <h1>${ledger.name}</h1>
          <div class="sub">Ledger Statement &nbsp;·&nbsp; ${periodStr}</div>
        </div>
        <div class="meta">
          <span><strong>Group:</strong> ${ledger.group || '—'}</span>
          <span><strong>Opening Balance:</strong> ${fmtAbs(ob)} ${ledger.balanceType || 'Dr'}</span>
          <span><strong>Closing Balance:</strong> ${fmtAbs(closing)} ${closing >= 0 ? 'Dr' : 'Cr'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Date</th><th>Particulars</th>
              <th style="width:100px">Vch Type</th><th style="width:70px">Vch No.</th>
              <th style="width:120px">Debit (₹)</th><th style="width:120px">Credit (₹)</th>
              <th style="width:130px">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr class="ob-row">
              <td></td><td>Opening Balance</td><td colspan="2"></td>
              <td style="text-align:right;color:#7a0000">${obSgn > 0 ? fmtAbs(ob) : ''}</td>
              <td style="text-align:right;color:#006b00">${obSgn < 0 ? fmtAbs(ob) : ''}</td>
              <td style="text-align:right;font-weight:700">${fmtAbs(ob)} ${ledger.balanceType || 'Dr'}</td>
            </tr>
            ${bodyRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right;padding-right:12px">Closing Balance</td>
              <td>${totalDr > 0 ? fmtAbs(totalDr) : ''}</td>
              <td>${totalCr > 0 ? fmtAbs(totalCr) : ''}</td>
              <td>${fmtAbs(closing)} ${closing >= 0 ? 'Dr' : 'Cr'}</td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">Printed on ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; ${ledger.name}</div>
      </body></html>`;

      const win = window.open('', '_blank', 'width=960,height=700');
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 400); }
    }
  }, [ledger, rows, ob, obSgn, totalDr, totalCr, closing, periodStr, onPrint, companyName]);

  // Keyboard: Escape → back, Alt+P → print
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onBack(); return; }
      if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); e.stopPropagation(); handlePrint(); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onBack, handlePrint]);

  return (
    <div style={{ fontFamily: FONT_, fontSize: 12, display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: HDR_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 10px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: FONT_, padding: '1px 10px', borderRadius: 2 }}>← Back (Esc)</button>
        <span style={{ flex: 2, textAlign: 'center', fontWeight: 800, fontSize: 13 }}>{ledger.name}</span>
        <button onClick={handlePrint} title="Print (Alt+P)" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: FONT_, padding: '1px 10px', borderRadius: 2 }}>
          Print (Alt+P)
        </button>
      </div>

      {/* Meta bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 12px', background: '#fafbfd', borderBottom: `1px solid ${BORDER}`, flexShrink: 0, flexWrap: 'wrap', gap: 4 }}>
        <div>
          <span style={{ fontSize: 11, color: '#777', fontStyle: 'italic' }}>Group: </span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{ledger.group || '—'}</span>
          <span style={{ fontSize: 11, color: '#777', fontStyle: 'italic', marginLeft: 16 }}>Period: </span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{periodStr}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, color: '#777', fontStyle: 'italic' }}>Opening: </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: obSgn >= 0 ? '#7a0000' : '#006b00' }}>
            {fmtAbs(ob)} {ledger.balanceType || 'Dr'}
          </span>
          <span style={{ fontSize: 11, color: '#777', fontStyle: 'italic', marginLeft: 16 }}>Closing: </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: closing >= 0 ? '#7a0000' : '#006b00' }}>
            {fmtAbs(closing)} {closing >= 0 ? 'Dr' : 'Cr'}
          </span>
        </div>
      </div>

      {/* Transaction table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#f0f4f8', position: 'sticky', top: 0, zIndex: 5 }}>
              {['Date', 'Particulars', 'Vch Type', 'Vch No.', 'Debit (₹)', 'Credit (₹)', 'Balance'].map((h, i) => (
                <th key={h} style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#333', borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${BD}`, background: '#f0f4f8', textAlign: i >= 4 ? 'right' : i === 3 ? 'center' : 'left', whiteSpace: 'nowrap', width: i === 0 ? 80 : i === 2 ? 100 : i === 3 ? 70 : i >= 4 ? 120 : undefined }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Opening balance row */}
            <tr style={{ background: '#f8fbff', borderBottom: `1px solid ${BD}` }}>
              <td style={{ padding: '3px 8px', borderRight: `1px solid ${BD}` }} />
              <td style={{ padding: '3px 8px', fontWeight: 700, fontStyle: 'italic', color: '#555', borderRight: `1px solid ${BD}` }}>Opening Balance</td>
              <td style={{ padding: '3px 8px', borderRight: `1px solid ${BD}` }} />
              <td style={{ padding: '3px 8px', borderRight: `1px solid ${BD}` }} />
              <td style={{ padding: '3px 10px', textAlign: 'right', color: '#7a0000', borderRight: `1px solid ${BD}` }}>{obSgn > 0 ? fmtAbs(ob) : ''}</td>
              <td style={{ padding: '3px 10px', textAlign: 'right', color: '#006b00', borderRight: `1px solid ${BD}` }}>{obSgn < 0 ? fmtAbs(ob) : ''}</td>
              <td style={{ padding: '3px 10px', textAlign: 'right', fontWeight: 700 }}>{fmtAbs(ob)} {ledger.balanceType || 'Dr'}</td>
            </tr>

            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#888', fontStyle: 'italic' }}>Loading…</td></tr>
            ) : withRun.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#888', fontStyle: 'italic' }}>No transactions in this period.</td></tr>
            ) : withRun.map((r, i) => {
              const isDr    = r.entry_type === 'Dr';
              const runType = r.running >= 0 ? 'Dr' : 'Cr';
              return (
                <tr key={`${r.id}-${i}`} style={{ borderBottom: `1px solid ${BD}`, background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                  <td style={{ padding: '3px 8px', borderRight: `1px solid ${BD}` }}>{fmtDate(r.date)}</td>
                  <td style={{ padding: '3px 8px', fontWeight: 600, borderRight: `1px solid ${BD}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.narration || r.type || '—'}</td>
                  <td style={{ padding: '3px 8px', fontStyle: 'italic', color: '#555', borderRight: `1px solid ${BD}` }}>{r.type}</td>
                  <td style={{ padding: '3px 8px', textAlign: 'center', borderRight: `1px solid ${BD}` }}>{r.number || ''}</td>
                  <td style={{ padding: '3px 10px', textAlign: 'right', color: '#7a0000', fontWeight: isDr ? 700 : 400, borderRight: `1px solid ${BD}` }}>{isDr ? fmtAbs(r.entry_amount) : ''}</td>
                  <td style={{ padding: '3px 10px', textAlign: 'right', color: '#006b00', fontWeight: !isDr ? 700 : 400, borderRight: `1px solid ${BD}` }}>{!isDr ? fmtAbs(r.entry_amount) : ''}</td>
                  <td style={{ padding: '3px 10px', textAlign: 'right', fontWeight: 600 }}>{fmtAbs(r.running)} {runType}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f0f4f8', borderTop: `1px solid ${BORDER}`, position: 'sticky', bottom: 0 }}>
              <td colSpan={4} style={{ padding: '4px 8px', fontWeight: 700, textAlign: 'right', borderRight: `1px solid ${BD}` }}>Closing Balance</td>
              <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 700, color: '#7a0000', borderTop: '2px solid #555', borderRight: `1px solid ${BD}` }}>{totalDr > 0 ? fmtAbs(totalDr) : ''}</td>
              <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 700, color: '#006b00', borderTop: '2px solid #555', borderRight: `1px solid ${BD}` }}>{totalCr > 0 ? fmtAbs(totalCr) : ''}</td>
              <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 800, borderTop: '2px solid #555' }}>{fmtAbs(closing)} {closing >= 0 ? 'Dr' : 'Cr'}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 10px', background: DARK, borderTop: '1px solid #0d1a2a', flexShrink: 0, height: 24 }}>
        <span style={{ color: '#aaa', fontSize: 10 }}>
          {rows.length} transaction{rows.length !== 1 ? 's' : ''} · Closing: {fmtAbs(closing)} {closing >= 0 ? 'Dr' : 'Cr'}
        </span>
        <span style={{ color: '#aaa', fontSize: 10 }}>Esc: Back  |  Alt+P: Print Ledger Statement</span>
      </div>
    </div>
  );
}

// ── Main CashBankBookScreen ───────────────────────────────────────────────────
function CashBankBookScreen({ branchId, onPrint }: { branchId?: string; onPrint?: (data: any) => void }) {
  // ── State ───────────────────────────────────────────────────────────────────
  const [rawLedgers, setRawLedgers]         = useState<any[]>([]);
  const [allVouchers, setAllVouchers]       = useState<any[]>([]);
  const [allEntries, setAllEntries]         = useState<any[]>([]);
  const [companyName, setCompanyName]       = useState('');
  const [period, setPeriod]                 = useState({ from: '', to: '' });
  const [showPeriod, setShowPeriod]         = useState(false);
  const [loading, setLoading]               = useState(true);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Bank Accounts', 'Cash-in-hand'])
  );
  const [focusedIdx, setFocusedIdx]         = useState<number>(-1);
  const [drillLedger, setDrillLedger]       = useState<LedgerSummary | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  // Auto-focus root when drill-down or modal closes
  useEffect(() => {
    if (!drillLedger && !showPeriod) rootRef.current?.focus();
  }, [drillLedger, showPeriod]);

  // ── Fetch data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    setLoading(true);

    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => r.json()),
      fetch(`/api/vouchers${q}`).then(r => r.json()),
      fetch(`/api/voucher-entries${q}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/branches').then(r => r.json()).catch(() => []),
    ])
      .then(([ledgerData, voucherData, entriesData, branchData]) => {
        // Cash / bank ledgers only
        const cashBankRaw = (Array.isArray(ledgerData) ? ledgerData : []).filter(
          (l: any) => isCashBankGroup(l.group_name || l.group)
        );
        setRawLedgers(cashBankRaw);

        // Active vouchers
        const vArr = activeVouchers(voucherData);
        setAllVouchers(vArr);

        // Entries — attach date from voucher
        const activeIds = new Set(vArr.map((v: any) => v.id));
        const dateMap: Record<string, string> = {};
        vArr.forEach((v: any) => { dateMap[v.id] = (v.date || '').slice(0, 10); });

        const entryArr = (Array.isArray(entriesData) ? entriesData : [])
          .filter((e: any) => activeIds.has(e.voucherId))
          .map((e: any) => ({ ...e, _date: dateMap[e.voucherId] || '' }));
        setAllEntries(entryArr);

        // Date range from vouchers
        if (vArr.length > 0) {
          const dates = vArr.map((v: any) => (v.date || '').slice(0, 10)).filter(Boolean).sort();
          setPeriod({ from: dates[0], to: dates[dates.length - 1] });
        }

        // Company name from branches
        if (Array.isArray(branchData) && branchData.length > 0) {
          const br = branchId ? branchData.find((b: any) => b.id === branchId) : branchData[0];
          if (br?.name) setCompanyName(br.name);
        }
      })
      .catch(() => {
        setRawLedgers([]);
        setAllVouchers([]);
        setAllEntries([]);
      })
      .finally(() => setLoading(false));

    // Company name override from settings
    fetch('/api/settings/company')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setCompanyName(d.name); })
      .catch(() => {});
  }, [branchId]);

  // ── Computed balances for selected period ─────────────────────────────────
  const ledgers = useMemo<LedgerSummary[]>(() => {
    return rawLedgers.map((raw: any) => {
      const ob  = Number(raw.openingBalance || 0);
      let bal   = raw.balanceType === 'Cr' ? -ob : ob;

      allEntries.forEach((e: any) => {
        if (e.ledgerId !== raw.id) return;
        const d = e._date || '';
        if (period.from && d < period.from) return;
        if (period.to   && d > period.to)   return;
        bal += e.type === 'Dr' ? Number(e.amount || 0) : -Number(e.amount || 0);
      });

      return {
        id:             raw.id,
        name:           raw.name,
        group:          (raw.group_name || raw.group || '').trim(),
        openingBalance: raw.openingBalance,
        balanceType:    raw.balanceType,
        balance:        bal,
      };
    });
  }, [rawLedgers, allEntries, period]);

  // Inflow / outflow for period
  const { inflow, outflow } = useMemo(() => {
    const ledgerIds = new Set(rawLedgers.map((l: any) => l.id));
    let totalIn = 0, totalOut = 0;
    allEntries.forEach((e: any) => {
      if (!ledgerIds.has(e.ledgerId)) return;
      const d = e._date || '';
      if (period.from && d < period.from) return;
      if (period.to   && d > period.to)   return;
      if (e.type === 'Dr') totalIn  += Number(e.amount || 0);
      else                 totalOut += Number(e.amount || 0);
    });
    return { inflow: totalIn, outflow: totalOut };
  }, [rawLedgers, allEntries, period]);

  const total   = useMemo(() => ledgers.reduce((a, l) => a + l.balance, 0), [ledgers]);
  const netFlow = inflow - outflow;

  const bankLedgers = useMemo(() => ledgers.filter(l => l.group === 'Bank Accounts'), [ledgers]);
  const cashLedgers = useMemo(() => ledgers.filter(l => l.group === 'Cash-in-hand' || l.group === 'Cash'), [ledgers]);
  const bankTotal   = useMemo(() => bankLedgers.reduce((a, l) => a + l.balance, 0), [bankLedgers]);
  const cashTotal   = useMemo(() => cashLedgers.reduce((a, l) => a + l.balance, 0), [cashLedgers]);

  // ── Navigable rows ────────────────────────────────────────────────────────
  const navRows = useMemo<NavRowType[]>(() => {
    const rows: NavRowType[] = [];
    if (bankLedgers.length > 0) {
      rows.push({ type: 'section', key: 'Bank Accounts', label: 'Bank Accounts' });
      if (expandedSections.has('Bank Accounts'))
        bankLedgers.forEach(l => rows.push({ type: 'ledger', ledger: l }));
    }
    if (cashLedgers.length > 0) {
      rows.push({ type: 'section', key: 'Cash-in-hand', label: 'Cash-in-Hand' });
      if (expandedSections.has('Cash-in-hand'))
        cashLedgers.forEach(l => rows.push({ type: 'ledger', ledger: l }));
    }
    return rows;
  }, [bankLedgers, cashLedgers, expandedSections]);

  const getNavIdx = useCallback((id: string) =>
    navRows.findIndex(r => r.type === 'section' ? r.key === id : r.ledger.id === id),
  [navRows]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIdx >= 0 && rowRefs.current[focusedIdx])
      rowRefs.current[focusedIdx]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIdx]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const periodStr = period.from && period.to
    ? `${fmtDate(period.from)} to ${fmtDate(period.to)}`
    : 'All Dates';

  // ── Print summary ─────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    if (onPrint) {
      onPrint({
        type: 'cash_bank_book',
        companyName,
        period: periodStr,
        bankAccounts: bankLedgers.map(l => ({ name: l.name, balance: l.balance })),
        cashInHand: cashLedgers.map(l => ({ name: l.name, balance: l.balance })),
        bankTotal,
        cashTotal,
        grandTotal: total,
        inflow,
        outflow,
        netFlow
      });
    } else {
      const bankRows = bankLedgers.map(l =>
        `<tr><td style="padding:3px 8px 3px 28px;font-size:11px;border-bottom:1px solid #eee;color:#444">${l.name}</td>
         <td style="padding:3px 12px;text-align:right;font-size:11px;border-bottom:1px solid #eee;color:#444">${fmtAbs(l.balance)}</td></tr>`
      ).join('');
      const cashRows = cashLedgers.map(l =>
        `<tr><td style="padding:3px 8px 3px 28px;font-size:11px;border-bottom:1px solid #eee;color:#444">${l.name}</td>
         <td style="padding:3px 12px;text-align:right;font-size:11px;border-bottom:1px solid #eee;color:#444">${fmtAbs(l.balance)}</td></tr>`
      ).join('');

      const html = `<!DOCTYPE html><html><head>
        <title>Cash / Bank Book – ${companyName}</title><meta charset="utf-8"/>
        <style>
          @page { margin: 14mm; size: A4 portrait; }
          * { box-sizing: border-box; }
          body { font-family: ${FONT_}; margin: 0; padding: 0; font-size: 12px; }
          .hdr { background: ${HDR_BG}; color: #fff; text-align: center; padding: 10px 14px; }
          .hdr h1 { margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 2px; }
          .hdr .sub { font-size: 10px; margin-top: 3px; opacity: 0.85; }
          table { width: 100%; border-collapse: collapse; }
          .sec-hdr td { background: #f2f8f7; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; padding: 5px 10px; border-top: 1px solid #b8c4cc; border-bottom: 1px solid #b8c4cc; color: ${HDR_BG}; }
          .sec-hdr td:last-child { text-align: right; }
          .grand td { font-weight: 900; font-size: 14px; padding: 6px 12px; background: ${HDR_BG}; color: #fff; border-top: 3px solid #0d5e57; }
          .grand td:last-child { text-align: right; }
          .flow { display: flex; border: 1px solid #ddd; margin-top: 16px; }
          .flow-cell { flex: 1; padding: 8px 12px; text-align: center; border-right: 1px solid #ddd; }
          .flow-cell:last-child { border-right: none; }
          .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #888; }
          .val { font-size: 13px; font-weight: 800; margin-top: 2px; }
          .footer { text-align: right; font-size: 9px; color: #888; padding: 6px 10px; border-top: 1px solid #eee; margin-top: 8px; }
        </style>
      </head><body>
        <div class="hdr">
          <h1>${companyName || 'Cash / Bank Book'}</h1>
          <div class="sub">CASH / BANK BOOK &nbsp;·&nbsp; ${periodStr}</div>
        </div>
        <table>
          <tr class="sec-hdr"><td>🏦 Bank Accounts</td><td>₹ ${fmtAbs(bankTotal)}</td></tr>
          ${bankRows}
          <tr class="sec-hdr"><td>👛 Cash-in-Hand</td><td>₹ ${fmtAbs(cashTotal)}</td></tr>
          ${cashRows}
          <tr class="grand"><td>Grand Total</td><td>₹ ${fmtAbs(total)}</td></tr>
        </table>
        <div class="flow">
          <div class="flow-cell"><div class="lbl">Total Inflow</div><div class="val" style="color:#16a34a">₹ ${fmtAbs(inflow)}</div></div>
          <div class="flow-cell"><div class="lbl">Total Outflow</div><div class="val" style="color:#dc2626">₹ ${fmtAbs(outflow)}</div></div>
          <div class="flow-cell" style="background:#f0fdfa"><div class="lbl" style="color:${HDR_BG}">Net Cash Flow</div><div class="val" style="color:${HDR_BG}">₹ ${fmtAbs(netFlow)}</div></div>
        </div>
        <div class="footer">Printed on ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; ${companyName}</div>
      </body></html>`;

      const win = window.open('', '_blank', 'width=700,height=900');
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 400); }
    }
  }, [companyName, bankLedgers, cashLedgers, bankTotal, cashTotal, total, inflow, outflow, netFlow, periodStr, onPrint]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (showPeriod || drillLedger) return;

      let handled = false;

      if (e.altKey && e.key.toLowerCase() === 'p') {
        handlePrint(); handled = true;
      } else if (e.key === 'F2') {
        setShowPeriod(true); handled = true;
      } else if (e.key === 'ArrowDown') {
        setFocusedIdx(prev => Math.min(prev + 1, navRows.length - 1)); handled = true;
      } else if (e.key === 'ArrowUp') {
        setFocusedIdx(prev => Math.max(prev - 1, 0)); handled = true;
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (focusedIdx >= 0 && focusedIdx < navRows.length) {
          const row = navRows[focusedIdx];
          if (row.type === 'section') {
            setExpandedSections(prev => { const n = new Set(prev); n.add(row.key); return n; });
          } else {
            setDrillLedger(row.ledger);
          }
          handled = true;
        }
      } else if (e.key === 'ArrowLeft') {
        if (focusedIdx >= 0 && focusedIdx < navRows.length) {
          const row = navRows[focusedIdx];
          if (row.type === 'section') {
            setExpandedSections(prev => { const n = new Set(prev); n.delete(row.key); return n; });
          } else {
            const parentKey = row.ledger.group === 'Bank Accounts' ? 'Bank Accounts' : 'Cash-in-hand';
            const pIdx = navRows.findIndex(r => r.type === 'section' && r.key === parentKey);
            if (pIdx >= 0) setFocusedIdx(pIdx);
          }
          handled = true;
        }
      }

      if (handled) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [showPeriod, drillLedger, navRows, focusedIdx, handlePrint]);

  // Auto-focus on mount
  useEffect(() => { rootRef.current?.focus(); }, []);

  // ── Drill-down view ───────────────────────────────────────────────────────
  if (drillLedger) {
    return (
      <ErrorBoundary>
        <LedgerDetail
          ledger={drillLedger}
          branchId={branchId}
          period={period}
          onBack={() => setDrillLedger(null)}
          onPrint={onPrint}
          companyName={companyName}
        />
      </ErrorBoundary>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div ref={rootRef} className="space-y-0 w-full outline-none flex flex-col h-full" tabIndex={0} style={{ outline: 'none', fontFamily: FONT_ }}>
      <style>{`
        .cbbook-focused-section { background: #ffd966 !important; }
        .cbbook-focused-ledger  { background: #ddeeff !important; }
        .cbbook-row:hover       { background: #f0fdf9 !important; }
      `}</style>

      {showPeriod && (
        <PeriodModal
          from={period.from} to={period.to}
          onAccept={(f, t) => { setPeriod({ from: f, to: t }); setShowPeriod(false); }}
          onCancel={() => setShowPeriod(false)}
        />
      )}

      {/* ── Title bar ── */}
      <div style={{ background: HDR_BG, color: '#fff', display: 'flex', alignItems: 'center', padding: '3px 10px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 11 }}>Cash / Bank Book</span>
        <span style={{ flex: 2, textAlign: 'center', fontWeight: 800, fontSize: 12 }}>{companyName || '…'}</span>
        <span style={{ flex: 1, textAlign: 'right', opacity: 0.75, fontSize: 10 }}>{periodStr}</span>
      </div>

      {/* ── Sub-header: period + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 10px', background: '#0d6460', color: '#cde', fontSize: 10, flexShrink: 0 }}>
        <button onClick={() => setShowPeriod(true)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', fontSize: 10, fontFamily: FONT_, padding: '1px 8px', borderRadius: 2 }}>
          F2: Period
        </button>
        <span style={{ opacity: 0.75 }}>Period: {periodStr}</span>
        <button onClick={handlePrint} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', fontSize: 10, fontFamily: FONT_, padding: '1px 8px', borderRadius: 2 }}>
          Alt+P: Print
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white overflow-x-auto" style={{ flex: 1, overflowY: 'auto', border: `1px solid ${BORDER}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 500 }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: `1px solid ${BORDER}` }}>
              <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Particulars</th>
              <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', width: 180 }}>Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={2} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Loading Balances…
                </td>
              </tr>
            ) : ledgers.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>
                  No cash or bank ledgers found
                </td>
              </tr>
            ) : (
              <>
                {/* Bank Accounts */}
                {bankLedgers.length > 0 && (() => {
                  const secIdx    = getNavIdx('Bank Accounts');
                  const isFocused = focusedIdx === secIdx;
                  const isExp     = expandedSections.has('Bank Accounts');
                  return (
                    <React.Fragment key="bank-section">
                      <tr
                        ref={el => { rowRefs.current[secIdx] = el; }}
                        className={`cbbook-row ${isFocused ? 'cbbook-focused-section' : ''}`}
                        style={{ background: isFocused ? '#ffd966' : '#eff6ff', cursor: 'pointer', borderBottom: `1px solid ${BD}` }}
                        onClick={() => { setFocusedIdx(secIdx); toggleSection('Bank Accounts'); }}
                      >
                        <td style={{ padding: '6px 16px', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: HDR_BG, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ display: 'inline-block', width: 12, height: 12, lineHeight: '11px', textAlign: 'center', fontSize: 10, fontWeight: 900, border: `1px solid ${BORDER}`, color: '#555', marginRight: 2, flexShrink: 0 }}>
                            {isExp ? '−' : '+'}
                          </span>
                          <Landmark style={{ width: 12, height: 12, flexShrink: 0 }} />
                          Bank Accounts
                        </td>
                        <td style={{ padding: '6px 16px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtAbs(bankTotal)}
                        </td>
                      </tr>
                      {isExp && bankLedgers.map(l => {
                        const lIdx     = getNavIdx(l.id);
                        const lFocused = focusedIdx === lIdx;
                        return (
                          <tr
                            key={l.id}
                            ref={el => { rowRefs.current[lIdx] = el; }}
                            className={`cbbook-row ${lFocused ? 'cbbook-focused-ledger' : ''}`}
                            style={{ background: lFocused ? '#ddeeff' : '#fafbff', borderBottom: `1px solid ${BD}`, cursor: 'pointer' }}
                            onClick={() => setFocusedIdx(lIdx)}
                            onDoubleClick={() => setDrillLedger(l)}
                          >
                            <td style={{ padding: '5px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 40 }}>
                              <span
                                onClick={e => { e.stopPropagation(); setDrillLedger(l); }}
                                style={{ fontStyle: 'italic', color: '#1d4ed8', cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}
                                title="Click to view transactions"
                              >
                                {l.name}
                              </span>
                              <ChevronRight style={{ width: 12, height: 12, opacity: 0.4, flexShrink: 0 }} />
                            </td>
                            <td style={{ padding: '5px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#4b5563', fontSize: 11 }}>
                              {fmtAbs(l.balance)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })()}

                {/* Cash-in-Hand */}
                {cashLedgers.length > 0 && (() => {
                  const secIdx    = getNavIdx('Cash-in-hand');
                  const isFocused = focusedIdx === secIdx;
                  const isExp     = expandedSections.has('Cash-in-hand');
                  return (
                    <React.Fragment key="cash-section">
                      <tr
                        ref={el => { rowRefs.current[secIdx] = el; }}
                        className={`cbbook-row ${isFocused ? 'cbbook-focused-section' : ''}`}
                        style={{ background: isFocused ? '#ffd966' : '#f0fdf4', cursor: 'pointer', borderBottom: `1px solid ${BD}` }}
                        onClick={() => { setFocusedIdx(secIdx); toggleSection('Cash-in-hand'); }}
                      >
                        <td style={{ padding: '6px 16px', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, color: HDR_BG, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ display: 'inline-block', width: 12, height: 12, lineHeight: '11px', textAlign: 'center', fontSize: 10, fontWeight: 900, border: `1px solid ${BORDER}`, color: '#555', marginRight: 2, flexShrink: 0 }}>
                            {isExp ? '−' : '+'}
                          </span>
                          <Wallet style={{ width: 12, height: 12, flexShrink: 0 }} />
                          Cash-in-Hand
                        </td>
                        <td style={{ padding: '6px 16px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtAbs(cashTotal)}
                        </td>
                      </tr>
                      {isExp && cashLedgers.map(l => {
                        const lIdx     = getNavIdx(l.id);
                        const lFocused = focusedIdx === lIdx;
                        return (
                          <tr
                            key={l.id}
                            ref={el => { rowRefs.current[lIdx] = el; }}
                            className={`cbbook-row ${lFocused ? 'cbbook-focused-ledger' : ''}`}
                            style={{ background: lFocused ? '#ddeeff' : '#fafbff', borderBottom: `1px solid ${BD}`, cursor: 'pointer' }}
                            onClick={() => setFocusedIdx(lIdx)}
                            onDoubleClick={() => setDrillLedger(l)}
                          >
                            <td style={{ padding: '5px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 40 }}>
                              <span
                                onClick={e => { e.stopPropagation(); setDrillLedger(l); }}
                                style={{ fontStyle: 'italic', color: '#1d4ed8', cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}
                                title="Click to view transactions"
                              >
                                {l.name}
                              </span>
                              <ChevronRight style={{ width: 12, height: 12, opacity: 0.4, flexShrink: 0 }} />
                            </td>
                            <td style={{ padding: '5px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#4b5563', fontSize: 11 }}>
                              {fmtAbs(l.balance)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })()}
              </>
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: HDR_BG, color: '#fff', fontWeight: 900, borderTop: `4px solid rgba(0,0,0,0.2)` }}>
              <td style={{ padding: '10px 16px', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12 }}>Grand Total</td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>₹ {fmtAbs(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Cash Flow Summary ── */}
      <div style={{ display: 'flex', gap: 0, flexShrink: 0, borderTop: `1px solid ${BORDER}` }}>
        {[
          { label: 'Total Inflow',    value: inflow,   color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Total Outflow',   value: outflow,  color: '#dc2626', bg: '#fef2f2' },
          { label: 'Net Cash Flow',   value: netFlow,  color: HDR_BG,    bg: '#f0fdfa' },
        ].map((item, i) => (
          <div key={i} style={{ flex: 1, padding: '6px 12px', textAlign: 'center', background: item.bg, borderRight: i < 2 ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: item.color, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>₹ {fmtAbs(item.value)}</div>
          </div>
        ))}
      </div>

      {/* ── Status bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 10px', background: DARK, borderTop: '1px solid #0d1a2a', flexShrink: 0, height: 24 }}>
        <span style={{ color: '#aaa', fontSize: 10 }}>↑↓ Navigate  |  ← Collapse / Back  |  → Enter: Expand / Drill-down  |  Click ledger name: Transactions</span>
        <span style={{ color: '#aaa', fontSize: 10 }}>F2: Period  |  Alt+P: Print</span>
      </div>
    </div>
  );
}

// Exported with error boundary
export default function CashBankBookScreenSafe(props: { branchId?: string; onPrint?: (data: any) => void }) {
  return (
    <ErrorBoundary>
      <CashBankBookScreen {...props} />
    </ErrorBoundary>
  );
}
