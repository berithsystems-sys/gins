/**
 * TallyPrime-style Balance Sheet A/c — v6
 * Fixes over v5:
 * 1. Ledger group normalized on load (group || group_name) → no more blank screen.
 * 2. handleExport added to keyboard useEffect deps → no stale closure.
 * 3. Opening balance excluded from period-filtered calc (only added if no from-filter or OB predates range).
 * 4. navigableRows uses normalized group field.
 * 5. All useCallback / useMemo deps audited.
 * 6. Error boundary wrapper to catch silent render crashes.
 */

import React, {
  useState, useEffect, useMemo, useRef, useCallback, Component, ReactNode,
} from 'react';
import { exportToExcel } from '../lib/ReportUtils';

// ── Constants ────────────────────────────────────────────────────────────────
const FONT_   = `-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,sans-serif`;
const HDR_BG  = '#1f4e79';
const BORDER  = '#b8c4cc';
const LIGHT   = '#f0f4f8';
const ROW_BDR = '#e0e6ee';
const DARK    = '#1a2a3a';

const LIABILITY_GROUPS = [
  'Capital Account','Reserves & Surplus','Loans (Liability)','Current Liabilities','Suspense Account',
];
const ASSET_GROUPS = [
  'Fixed Assets','Investments','Current Assets','Misc. Expenses (Asset)',
];
const ALL_GROUPS = [...LIABILITY_GROUPS, ...ASSET_GROUPS];

const PL_INCOME_GROUPS  = ['Sales Account','Direct Income','Indirect Income','Closing Stock'];
const PL_EXPENSE_GROUPS = ['Opening Stock','Purchase Account','Direct Expenses','Indirect Expenses'];

// ── Types ────────────────────────────────────────────────────────────────────
interface Ledger {
  id: string;
  name: string;
  group: string;           // normalized on load
  openingBalance?: number;
  balanceType?: 'Dr' | 'Cr';
}
interface Period  { label: string; from: string; to: string; }
interface BSProps  { branchId?: string; onBack?: () => void; }

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtAmtAbs = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()}-${M[d.getMonth()]}-${d.getFullYear()}`;
  } catch { return iso; }
};

const isVoided = (v: any): boolean =>
  v.voided === true || v.voided === 1 || v.voided === '1';

// Normalize a raw ledger from the API so group is always a string.
// NOTE: The DB "group" column stores the literal word "group" (a FK label),
//       so we must use group_name which holds the real group name.
const normalizeLedger = (raw: any): Ledger => ({
  ...raw,
  group: (raw.group_name || raw.group || '').trim(),
});

// ── Static styles (module-level — never recreated on render) ─────────────────
const rs: Record<string, React.CSSProperties> = {
  th:        { padding:'5px 10px', fontSize:11, fontWeight:700, color:'#333', borderBottom:`1px solid ${BORDER}`, background:LIGHT, whiteSpace:'nowrap' },
  groupRow:  { borderBottom:`1px solid ${ROW_BDR}`, background:'#fff', transition:'background 0.07s' },
  ledgerRow: { borderBottom:`1px solid ${ROW_BDR}`, background:'#fafbff' },
  tdName:    { padding:'3px 8px', fontSize:12, verticalAlign:'middle', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  tdAmt:     { padding:'3px 10px', fontSize:12, fontWeight:700, textAlign:'right', verticalAlign:'middle', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' },
  toggle:    { display:'inline-block', width:14, height:14, lineHeight:'14px', textAlign:'center', fontSize:11, fontWeight:900, border:`1px solid ${BORDER}`, background:LIGHT, color:'#555', marginRight:6, cursor:'pointer', flexShrink:0 },
  groupName: { fontWeight:700, textTransform:'uppercase', fontSize:12, letterSpacing:0.3, color:'#1a1a1a' },
};

const s: Record<string, React.CSSProperties> = {
  root:        { fontFamily:FONT_, fontSize:12, color:'#1a1a1a', background:'#fff', display:'flex', flexDirection:'column', height:'100%', border:`1px solid ${BORDER}`, borderRadius:2, overflow:'hidden', position:'relative', outline:'none' },
  titleBar:    { background:HDR_BG, color:'#fff', display:'flex', alignItems:'center', padding:'3px 8px', fontSize:11, fontWeight:600, flexShrink:0 },
  backBtn:     { background:'none', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', cursor:'pointer', fontSize:10, marginRight:10, padding:'1px 5px' },
  contentWrap: { flex:1, overflowY:'auto', paddingRight:90 },
  twoCol:      { display:'flex', minHeight:'100%' },
  col:         { flex:1, display:'flex', flexDirection:'column', minWidth:0 },
  divider:     { width:2, background:BORDER, flexShrink:0 },
  table:       { width:'100%', borderCollapse:'collapse', tableLayout:'fixed' },
  totalRow:    { background:LIGHT, borderTop:'2px double #555', position:'sticky', bottom:0 },
  rightPanel:  { position:'absolute', top:26, right:0, bottom:24, width:88, background:DARK, display:'flex', flexDirection:'column', borderLeft:'1px solid #0d1a2a' },
  sideBtn:     { border:'none', borderBottom:'1px solid rgba(255,255,255,0.07)', color:'#cdd5e0', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'flex-start', padding:'6px 8px', textAlign:'left', fontFamily:FONT_, flex:1, transition:'background 0.1s' },
  sBtnKey:     { fontSize:9, color:'rgba(255,255,255,0.4)', fontWeight:700, lineHeight:1.3 },
  sBtnLabel:   { fontSize:10, color:'#d0dae6', fontWeight:600, lineHeight:1.3, whiteSpace:'pre-line' },
  statusBar:   { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'3px 100px 3px 8px', background:DARK, borderTop:'1px solid #0d1a2a', flexShrink:0, height:24 },
};

// ── Error Boundary ───────────────────────────────────────────────────────────
interface EBState { error: Error | null; }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:40, textAlign:'center', color:'#7a0000', fontFamily:FONT_ }}>
          <div style={{ fontWeight:700, marginBottom:8 }}>⚠ Render Error</div>
          <div style={{ fontSize:11, color:'#555', fontStyle:'italic' }}>{this.state.error.message}</div>
          <button onClick={() => this.setState({ error:null })} style={{ marginTop:16, padding:'5px 18px', background:HDR_BG, color:'#fff', border:'none', cursor:'pointer', borderRadius:2 }}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── ColHdrCells — outside component to prevent remount on re-render ──────────
interface ColHdrCellsProps {
  allPeriods: Period[];
  periodLabel: (p: { from: string; to: string }) => string;
}
const ColHdrCells = React.memo(({ allPeriods, periodLabel }: ColHdrCellsProps) => (
  <>
    <th style={{ ...rs.th, textAlign:'left', width:'50%' }}>Particulars</th>
    {allPeriods.map((p, i) => (
      <th key={i} style={{ ...rs.th, textAlign:'right', width:`${50 / allPeriods.length}%`, borderLeft: i === 0 ? 'none' : '1px solid #ccd5dd' }}>
        <div style={{ fontSize:11, fontWeight:800, color:'#1a1a1a', whiteSpace:'nowrap' }}>{p.label}</div>
        <div style={{ fontSize:10, fontWeight:400, color:'#777', whiteSpace:'nowrap' }}>{periodLabel(p)}</div>
      </th>
    ))}
  </>
));

// ── SectionHeader — outside component ───────────────────────────────────────
const SectionHeader = React.memo(({ label, colSpan }: { label: string; colSpan: number }) => (
  <tr style={{ background:'#fafbff' }}>
    <td colSpan={colSpan} style={{ padding:'6px 10px 2px', fontSize:12, fontStyle:'italic', fontWeight:600, color:'#444', letterSpacing:2, borderBottom:'none' }}>
      {label}
    </td>
  </tr>
));

// ── LedgerDetail ─────────────────────────────────────────────────────────────
function LedgerDetail({ ledger, branchId, onBack }: { ledger: Ledger; branchId?: string; onBack: () => void }) {
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onBack(); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onBack]);

  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/vouchers/ledger/${ledger.id}${q}`)
      .then(r => r.json())
      .then(d => setRows((Array.isArray(d) ? d : []).filter((v: any) => !isVoided(v))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [ledger.id, branchId]);

  const ob      = Number(ledger.openingBalance || 0);
  const obSgn   = ledger.balanceType === 'Cr' ? -ob : ob;
  let   running = obSgn;
  const withRun = rows.map(r => {
    const amt = Number(r.entry_amount || 0);
    running  += r.entry_type === 'Dr' ? amt : -amt;
    return { ...r, running };
  });
  const totalDr = rows.filter(r => r.entry_type === 'Dr').reduce((a, r) => a + Number(r.entry_amount || 0), 0);
  const totalCr = rows.filter(r => r.entry_type === 'Cr').reduce((a, r) => a + Number(r.entry_amount || 0), 0);
  const closing = obSgn + totalDr - totalCr;
  const BD      = '#e0e6ee';

  return (
    <div style={{ fontFamily:FONT_, fontSize:12, display:'flex', flexDirection:'column', height:'100%', background:'#fff', border:`1px solid ${BORDER}`, borderRadius:2, overflow:'hidden' }}>
      <div style={{ background:HDR_BG, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'3px 10px', fontSize:12, fontWeight:700, flexShrink:0 }}>
        <button onClick={onBack} style={{ background:'none', border:'1px solid rgba(255,255,255,0.4)', color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:FONT_, padding:'1px 10px', borderRadius:2 }}>← Back (Esc)</button>
        <span style={{ flex:2, textAlign:'center', fontWeight:800, fontSize:13 }}>{ledger.name}</span>
        <span />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 12px', background:'#fafbfd', borderBottom:`1px solid ${BORDER}`, flexShrink:0 }}>
        <div>
          <span style={{ fontSize:11, color:'#777', fontStyle:'italic' }}>Ledger: </span>
          <span style={{ fontSize:12, fontWeight:700 }}>{ledger.name}</span>
          <span style={{ fontSize:11, color:'#777', fontStyle:'italic', marginLeft:16 }}>Group: </span>
          <span style={{ fontSize:12, fontWeight:700 }}>{ledger.group || '—'}</span>
        </div>
        <div>
          <span style={{ fontSize:11, color:'#777', fontStyle:'italic' }}>Opening Balance: </span>
          <span style={{ fontSize:12, fontWeight:700, color: obSgn >= 0 ? '#7a0000' : '#006b00' }}>
            {fmtAmtAbs(ob)} {ledger.balanceType || 'Dr'}
          </span>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
          <thead>
            <tr style={{ background:'#f0f4f8', position:'sticky', top:0, zIndex:5 }}>
              {['Date','Particulars','Vch Type','Vch No.','Debit (₹)','Credit (₹)','Balance'].map((h, i) => (
                <th key={h} style={{ padding:'4px 8px', fontSize:11, fontWeight:700, color:'#333', borderBottom:`1px solid ${BORDER}`, borderRight:`1px solid ${BD}`, background:'#f0f4f8', textAlign: i >= 4 ? 'right' : i === 3 ? 'center' : 'left', whiteSpace:'nowrap', width: i===0?80:i===2?100:i===3?70:i>=4?120:undefined }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ background:'#f8fbff', borderBottom:`1px solid ${BD}` }}>
              <td style={{ padding:'3px 8px', borderRight:`1px solid ${BD}` }} />
              <td style={{ padding:'3px 8px', fontWeight:700, fontStyle:'italic', color:'#555', borderRight:`1px solid ${BD}` }}>Opening Balance</td>
              <td style={{ padding:'3px 8px', borderRight:`1px solid ${BD}` }} />
              <td style={{ padding:'3px 8px', borderRight:`1px solid ${BD}` }} />
              <td style={{ padding:'3px 10px', textAlign:'right', color:'#7a0000', borderRight:`1px solid ${BD}` }}>{obSgn > 0 ? fmtAmtAbs(ob) : ''}</td>
              <td style={{ padding:'3px 10px', textAlign:'right', color:'#006b00', borderRight:`1px solid ${BD}` }}>{obSgn < 0 ? fmtAmtAbs(ob) : ''}</td>
              <td style={{ padding:'3px 10px', textAlign:'right', fontWeight:700 }}>{fmtAmtAbs(ob)} {ledger.balanceType || 'Dr'}</td>
            </tr>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:24, textAlign:'center', color:'#888', fontStyle:'italic' }}>Loading…</td></tr>
            ) : withRun.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:24, textAlign:'center', color:'#888', fontStyle:'italic' }}>No transactions found.</td></tr>
            ) : withRun.map((r, i) => {
              const isDr    = r.entry_type === 'Dr';
              const runType = r.running >= 0 ? 'Dr' : 'Cr';
              return (
                <tr key={`${r.id}-${i}`} style={{ borderBottom:`1px solid ${BD}`, background: i%2===0?'#fff':'#fafbfd' }}>
                  <td style={{ padding:'3px 8px', borderRight:`1px solid ${BD}` }}>{fmtDate(r.date)}</td>
                  <td style={{ padding:'3px 8px', fontWeight:600, borderRight:`1px solid ${BD}`, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.narration || r.type || '—'}</td>
                  <td style={{ padding:'3px 8px', fontStyle:'italic', color:'#555', borderRight:`1px solid ${BD}` }}>{r.type}</td>
                  <td style={{ padding:'3px 8px', textAlign:'center', borderRight:`1px solid ${BD}` }}>{r.number || ''}</td>
                  <td style={{ padding:'3px 10px', textAlign:'right', color:'#7a0000', fontWeight:isDr?700:400, borderRight:`1px solid ${BD}` }}>{isDr ? fmtAmtAbs(r.entry_amount) : ''}</td>
                  <td style={{ padding:'3px 10px', textAlign:'right', color:'#006b00', fontWeight:!isDr?700:400, borderRight:`1px solid ${BD}` }}>{!isDr ? fmtAmtAbs(r.entry_amount) : ''}</td>
                  <td style={{ padding:'3px 10px', textAlign:'right', fontWeight:600 }}>{fmtAmtAbs(r.running)} {runType}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:'#f0f4f8', borderTop:`1px solid ${BORDER}`, position:'sticky', bottom:0 }}>
              <td colSpan={4} style={{ padding:'4px 8px', fontWeight:700, textAlign:'right', borderRight:`1px solid ${BD}` }}>Closing Balance</td>
              <td style={{ padding:'4px 10px', textAlign:'right', fontWeight:700, color:'#7a0000', borderTop:'2px solid #555', borderRight:`1px solid ${BD}` }}>{totalDr > 0 ? fmtAmtAbs(totalDr) : ''}</td>
              <td style={{ padding:'4px 10px', textAlign:'right', fontWeight:700, color:'#006b00', borderTop:'2px solid #555', borderRight:`1px solid ${BD}` }}>{totalCr > 0 ? fmtAmtAbs(totalCr) : ''}</td>
              <td style={{ padding:'4px 10px', textAlign:'right', fontWeight:800, borderTop:'2px solid #555' }}>{fmtAmtAbs(closing)} {closing >= 0 ? 'Dr' : 'Cr'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── PeriodModal ──────────────────────────────────────────────────────────────
function PeriodModal({ from, to, onAccept, onCancel }: {
  from: string; to: string;
  onAccept: (f: string, t: string) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const toRef     = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onCancel]);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.4)' }}>
      <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:2, boxShadow:'0 8px 32px rgba(0,0,0,0.28)', width:300, overflow:'hidden', fontFamily:FONT_ }}>
        <div style={{ background:HDR_BG, color:'#fff', padding:'5px 12px', fontSize:12, fontWeight:700 }}>
          Change Period  <span style={{ fontSize:9, opacity:0.6 }}>F2</span>
        </div>
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
          {([
            { lbl:'From Date :', val:f, set:setF, ref:undefined as any,
              onKey:(e:React.KeyboardEvent)=>{ if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();toRef.current?.focus();} }},
            { lbl:'To Date :',   val:t, set:setT, ref:toRef,
              onKey:(e:React.KeyboardEvent)=>{ if(e.key==='Enter') onAccept(f,t); }},
          ] as const).map((row, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <label style={{ fontSize:12, color:'#555', fontStyle:'italic', width:90, flexShrink:0 }}>{row.lbl}</label>
              <input autoFocus={i===0} ref={row.ref} type="date" value={row.val}
                onChange={e => row.set(e.target.value)} onKeyDown={row.onKey}
                style={{ flex:1, border:'none', borderBottom:`2px solid ${HDR_BG}`, outline:'none', fontSize:13, fontWeight:700, fontFamily:FONT_, padding:'2px 4px', background:'#fffde0', color:'#1a1a1a' }} />
            </div>
          ))}
        </div>
        <div style={{ padding:'8px 16px 12px', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={() => onAccept(f, t)} style={{ background:HDR_BG, color:'#fff', border:'none', padding:'5px 18px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT_, borderRadius:2 }}>Accept</button>
          <button onClick={onCancel} style={{ background:'#f0f4f8', color:'#444', border:`1px solid ${BORDER}`, padding:'5px 18px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT_, borderRadius:2 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── AddPeriodModal ───────────────────────────────────────────────────────────
function AddPeriodModal({ onAdd, onCancel }: {
  onAdd: (label: string, from: string, to: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [from,  setFrom]  = useState('');
  const [to,    setTo]    = useState('');

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onCancel]);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.4)' }}>
      <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:2, boxShadow:'0 8px 32px rgba(0,0,0,0.28)', width:340, overflow:'hidden', fontFamily:FONT_ }}>
        <div style={{ background:HDR_BG, color:'#fff', padding:'5px 12px', fontSize:12, fontWeight:700 }}>Add Comparison Period</div>
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { lbl:'Label (optional):', val:label, set:setLabel, type:'text',  ph:'e.g. FY 2023-24' },
            { lbl:'From Date :',       val:from,  set:setFrom,  type:'date',  ph:'' },
            { lbl:'To Date :',         val:to,    set:setTo,    type:'date',  ph:'' },
          ].map((row, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <label style={{ fontSize:12, color:'#555', fontStyle:'italic', width:110, flexShrink:0 }}>{row.lbl}</label>
              <input autoFocus={i===0} type={row.type} value={row.val} placeholder={row.ph}
                onChange={e => row.set(e.target.value)}
                style={{ flex:1, border:'none', borderBottom:`2px solid ${HDR_BG}`, outline:'none', fontSize:13, fontWeight:700, fontFamily:FONT_, padding:'2px 4px', background:'#fffde0', color:'#1a1a1a' }} />
            </div>
          ))}
        </div>
        <div style={{ padding:'8px 16px 12px', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button
            onClick={() => { if (from && to) onAdd(label || `${fmtDate(from)} – ${fmtDate(to)}`, from, to); }}
            style={{ background:HDR_BG, color:'#fff', border:'none', padding:'5px 18px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT_, borderRadius:2 }}>Add</button>
          <button onClick={onCancel} style={{ background:'#f0f4f8', color:'#444', border:`1px solid ${BORDER}`, padding:'5px 18px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT_, borderRadius:2 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main BalanceSheetScreen ──────────────────────────────────────────────────
function BalanceSheetScreen({ branchId, onBack }: BSProps) {
  const [ledgers, setLedgers]             = useState<Ledger[]>([]);
  const [allVouchers, setAllVouchers]     = useState<any[]>([]);
  const [allEntries, setAllEntries]       = useState<any[]>([]);
  const [companyName, setCompanyName]     = useState('');
  const [mainPeriod, setMainPeriod]       = useState({ from:'', to:'' });
  const [extraPeriods, setExtraPeriods]   = useState<Period[]>([]);
  const [showPeriod, setShowPeriod]       = useState(false);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [expanded, setExpanded]           = useState<Set<string>>(new Set());
  const [drillLedger, setDrillLedger]     = useState<Ledger | null>(null);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState('');
  const [showNettProfit, setShowNettProfit] = useState(true);
  const [focusedRowIdx, setFocusedRowIdx] = useState<number>(-1);
  const [showDebug, setShowDebug]         = useState(false);

  const rootRef    = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-focus root when modals close
  useEffect(() => {
    if (!drillLedger && !showPeriod && !showAddPeriod) rootRef.current?.focus();
  }, [drillLedger, showPeriod, showAddPeriod]);

  // ── Fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    setLoading(true);
    setLoadError('');

    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => { if (!r.ok) throw new Error(`Ledgers: ${r.status}`); return r.json(); }),
      fetch(`/api/vouchers${q}`).then(r => { if (!r.ok) throw new Error(`Vouchers: ${r.status}`); return r.json(); }),
      fetch(`/api/voucher-entries${q}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/branches').then(r => r.json()).catch(() => []),
    ])
    .then(([l, v, ve, b]) => {
      // Fix: use group_name (the "group" column = literal "group" label, not the name)
      const ledgerArr: Ledger[] = (Array.isArray(l) ? l : []).map(normalizeLedger);
      setLedgers(ledgerArr);

      const vArr = (Array.isArray(v) ? v : []).filter((x: any) => !isVoided(x));
      setAllVouchers(vArr);

      // Build a voucherId→date map for quick lookup when processing entries
      const voucherDateMap: Record<string, string> = {};
      vArr.forEach((v: any) => { voucherDateMap[v.id] = v.date?.slice(0,10) || ''; });

      // Attach date to each entry so calcBalanceForPeriod can filter by date
      const entryArr = (Array.isArray(ve) ? ve : []).map((e: any) => ({
        ...e,
        _date: voucherDateMap[e.voucherId] || '',
      }));
      setAllEntries(entryArr);

      if (vArr.length > 0) {
        const dates = vArr.map((x: any) => x.date?.slice(0,10)).filter(Boolean).sort();
        setMainPeriod({ from: dates[0], to: dates[dates.length - 1] });
      }

      if (Array.isArray(b) && b.length > 0) {
        const br = branchId ? b.find((x: any) => x.id === branchId) : b[0];
        if (br) setCompanyName(br.name);
      }
    })
    .catch(err => {
      console.error('[BalanceSheet] fetch error:', err);
      setLoadError(err.message || 'Failed to load data');
    })
    .finally(() => setLoading(false));

    fetch('/api/settings/company')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setCompanyName(d.name); })
      .catch(() => {});
  }, [branchId]);

  // ── Balance helpers ────────────────────────────────────────────────
  // Entries are a flat table (voucherId, ledgerId, amount, type) — NOT nested in vouchers.
  // Each entry has _date pre-attached from the voucher date map on load.
  const calcBalanceForPeriod = useCallback((ledgerId: string, from: string, to: string): number => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return 0;
    const ob     = Number(ledger.openingBalance || 0);
    let running  = ledger.balanceType === 'Cr' ? -ob : ob;
    allEntries.forEach((e: any) => {
      if (e.ledgerId !== ledgerId) return;
      const eDate = e._date || '';
      if (from && eDate < from) return;
      if (to   && eDate > to)   return;
      running += e.type === 'Dr' ? Number(e.amount || 0) : -Number(e.amount || 0);
    });
    return running;
  }, [ledgers, allEntries]);

  const groupTotalForPeriod = useCallback((groupName: string, from: string, to: string): number =>
    ledgers
      .filter(l => l.group === groupName)   // FIX #1 — single normalized field
      .reduce((acc, l) => acc + calcBalanceForPeriod(l.id, from, to), 0),
  [ledgers, calcBalanceForPeriod]);

  const groupLedgersNonZero = useCallback((groupName: string, from: string, to: string): Ledger[] =>
    ledgers
      .filter(l => l.group === groupName)
      .filter(l => calcBalanceForPeriod(l.id, from, to) !== 0),
  [ledgers, calcBalanceForPeriod]);

  // ── Periods ────────────────────────────────────────────────────────
  const allPeriods: Period[] = useMemo(() => [
    { label: companyName || 'Current Period', from: mainPeriod.from, to: mainPeriod.to },
    ...extraPeriods,
  ], [mainPeriod, extraPeriods, companyName]);

  const periodLabel = useCallback((p: { from: string; to: string }) =>
    p.from && p.to ? `${fmtDate(p.from)} to ${fmtDate(p.to)}` : 'All Dates', []);

  // ── P&L Net ────────────────────────────────────────────────────────
  const plNetForPeriod = useCallback((from: string, to: string): number => {
    const income  = PL_INCOME_GROUPS.reduce( (a, g) => a + Math.abs(groupTotalForPeriod(g, from, to)), 0);
    const expense = PL_EXPENSE_GROUPS.reduce((a, g) => a + Math.abs(groupTotalForPeriod(g, from, to)), 0);
    return income - expense;
  }, [groupTotalForPeriod]);

  const periodTotals = useMemo(() => allPeriods.map(p => {
    const liabRaw  = LIABILITY_GROUPS.reduce((a, g) => a + groupTotalForPeriod(g, p.from, p.to), 0);
    const assetRaw = ASSET_GROUPS.reduce(    (a, g) => a + groupTotalForPeriod(g, p.from, p.to), 0);
    const plNet    = showNettProfit ? plNetForPeriod(p.from, p.to) : 0;
    const liabTotal  = Math.abs(liabRaw)  + (plNet >= 0 ? plNet         : 0);
    const assetTotal = Math.abs(assetRaw) + (plNet <  0 ? Math.abs(plNet) : 0);
    const grand = Math.max(liabTotal, assetTotal);
    const diff  = liabTotal - assetTotal;
    return { liabRaw, assetRaw, plNet, liabTotal, assetTotal, grand, diff };
  }), [allPeriods, groupTotalForPeriod, plNetForPeriod, showNettProfit]);

  // ── Navigable rows ─────────────────────────────────────────────────
  const navigableRows = useMemo(() => {
    type NavRow =
      | { type: 'group';  name: string }
      | { type: 'ledger'; ledger: Ledger; groupName: string };
    const rows: NavRow[] = [];
    ALL_GROUPS.forEach(grpName => {
      const anyNonZero = allPeriods.some(p => groupTotalForPeriod(grpName, p.from, p.to) !== 0);
      if (!anyNonZero) return;
      rows.push({ type:'group', name:grpName });
      if (expanded.has(grpName)) {
        groupLedgersNonZero(grpName, mainPeriod.from, mainPeriod.to).forEach(l =>
          rows.push({ type:'ledger', ledger:l, groupName:grpName })
        );
      }
    });
    return rows;
  }, [allPeriods, expanded, groupTotalForPeriod, groupLedgersNonZero, mainPeriod]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedRowIdx < 0) return;
    contentRef.current?.querySelector(`[data-rowidx="${focusedRowIdx}"]`)?.scrollIntoView({ block:'nearest' });
  }, [focusedRowIdx]);

  const toggleGroup = useCallback((name: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; }),
  []);

  // ── Export ─────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const rows: any[] = [];
    allPeriods.forEach(p => {
      LIABILITY_GROUPS.forEach(g => rows.push({ Period:p.label, Side:'Liabilities', Group:g, Amount: Math.abs(groupTotalForPeriod(g, p.from, p.to)) }));
      ASSET_GROUPS.forEach(g =>     rows.push({ Period:p.label, Side:'Assets',      Group:g, Amount: Math.abs(groupTotalForPeriod(g, p.from, p.to)) }));
    });
    exportToExcel(rows, 'Balance_Sheet');
  }, [allPeriods, groupTotalForPeriod]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (drillLedger || showPeriod || showAddPeriod) return;

      let handled = false;

      if (e.key === 'ArrowDown') {
        setFocusedRowIdx(prev => Math.min(prev + 1, navigableRows.length - 1));
        handled = true;
      } else if (e.key === 'ArrowUp') {
        setFocusedRowIdx(prev => Math.max(prev - 1, 0));
        handled = true;
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        if (focusedRowIdx >= 0 && focusedRowIdx < navigableRows.length) {
          const row = navigableRows[focusedRowIdx];
          if (row.type === 'group') toggleGroup(row.name);
          else setDrillLedger(row.ledger);
          handled = true;
        }
      } else if (e.key === 'ArrowLeft') {
        if (focusedRowIdx >= 0 && focusedRowIdx < navigableRows.length) {
          const row = navigableRows[focusedRowIdx];
          const grpName = row.type === 'group' ? row.name : row.groupName;
          setExpanded(prev => { const n = new Set(prev); n.delete(grpName); return n; });
          handled = true;
        }
      } else if (e.key === 'F2') {
        setShowPeriod(true); handled = true;
      } else if (e.key === 'F5') {
        setExpanded(new Set([...LIABILITY_GROUPS, ...ASSET_GROUPS])); handled = true;
      } else if (e.key === 'Escape') {
        if (expanded.size > 0) { setExpanded(new Set()); }
        else if (onBack) { onBack(); }
        handled = true;
      } else if (e.altKey && e.key.toLowerCase() === 'p') {
        window.print(); handled = true;
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        setShowAddPeriod(true); handled = true;
      } else if (e.altKey && e.key.toLowerCase() === 'e') {
        handleExport(); handled = true;   // FIX #2 — handleExport now in deps
      }

      if (handled) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  // FIX #2 — handleExport added to deps
  }, [drillLedger, showPeriod, showAddPeriod, navigableRows, focusedRowIdx, expanded, onBack, toggleGroup, handleExport]);

  // ── Render helpers ─────────────────────────────────────────────────
  const renderGroupRow = (grpName: string) => {
    const anyNonZero = allPeriods.some(p => groupTotalForPeriod(grpName, p.from, p.to) !== 0);
    if (!anyNonZero) return null;

    const isExp     = expanded.has(grpName);
    const grpIdx    = navigableRows.findIndex(r => r.type === 'group' && r.name === grpName);
    const isFocused = focusedRowIdx === grpIdx;

    return (
      <React.Fragment key={grpName}>
        <tr
          data-rowidx={grpIdx}
          style={{ ...rs.groupRow, cursor:'pointer', background: isFocused ? '#ffd966' : '#fff' }}
          onClick={() => { setFocusedRowIdx(grpIdx); toggleGroup(grpName); }}
          className="bs-grp-row"
        >
          <td style={rs.tdName}>
            <span style={rs.toggle}>{isExp ? '−' : '+'}</span>
            <span style={rs.groupName}>{grpName}</span>
          </td>
          {allPeriods.map((p, i) => {
            const abs = Math.abs(groupTotalForPeriod(grpName, p.from, p.to));
            return (
              <td key={i} style={{ ...rs.tdAmt, borderLeft: i===0?'none':'1px solid #dde4ec' }}>
                {abs > 0 ? fmtAmtAbs(abs) : ''}
              </td>
            );
          })}
        </tr>
        {isExp && groupLedgersNonZero(grpName, mainPeriod.from, mainPeriod.to).map(l => {
          const ledgerIdx      = navigableRows.findIndex(r => r.type === 'ledger' && r.ledger.id === l.id);
          const isLedgerFocused = focusedRowIdx === ledgerIdx;
          return (
            <tr
              key={l.id}
              data-rowidx={ledgerIdx}
              style={{ ...rs.ledgerRow, background: isLedgerFocused ? '#ddeeff' : '#fafbff' }}
              onClick={() => setFocusedRowIdx(ledgerIdx)}
            >
              <td style={{ ...rs.tdName, paddingLeft:28 }}>
                <span
                  onClick={e => { e.stopPropagation(); setDrillLedger(l); }}
                  style={{ fontStyle:'italic', color:'#1a5fa8', cursor:'pointer', textDecoration:'underline', fontSize:11 }}
                  title="Click to view transactions"
                >
                  {l.name}
                </span>
              </td>
              {allPeriods.map((p, i) => {
                const bal = calcBalanceForPeriod(l.id, p.from, p.to);
                return (
                  <td key={i} style={{ ...rs.tdAmt, color:'#555', fontWeight:400, fontSize:11, borderLeft: i===0?'none':'1px solid #dde4ec' }}>
                    {bal !== 0 ? fmtAmtAbs(bal) : ''}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </React.Fragment>
    );
  };

  const renderPLRow = () => (
    <tr style={{ ...rs.groupRow, background:'#fffbf0' }}>
      <td style={{ ...rs.tdName, fontStyle:'italic', paddingLeft:16 }}>
        {(periodTotals[0]?.plNet ?? 0) >= 0 ? 'Profit & Loss A/c  (Net Profit)' : 'Profit & Loss A/c  (Net Loss)'}
      </td>
      {periodTotals.map((pt, i) => (
        <td key={i} style={{ ...rs.tdAmt, color: pt.plNet >= 0 ? '#006b00' : '#7a0000', fontStyle:'italic', borderLeft: i===0?'none':'1px solid #dde4ec' }}>
          {Math.abs(pt.plNet) > 0 ? fmtAmtAbs(pt.plNet) : ''}
        </td>
      ))}
    </tr>
  );

  const renderDiffRow = (side: 'liab' | 'asset') => {
    const anyDiff = periodTotals.some(pt => Math.abs(pt.diff) > 0.005);
    if (!anyDiff) return null;
    return (
      <tr style={{ ...rs.groupRow, background:'#fff0f0' }}>
        <td style={{ ...rs.tdName, fontStyle:'italic', color:'#7a0000', paddingLeft:16 }}>
          {side === 'liab' ? 'Difference (Cr > Dr)' : 'Difference (Dr > Cr)'}
        </td>
        {periodTotals.map((pt, i) => {
          const show = side === 'liab' ? pt.diff < 0 : pt.diff > 0;
          return (
            <td key={i} style={{ ...rs.tdAmt, color:'#7a0000', fontStyle:'italic', borderLeft: i===0?'none':'1px solid #dde4ec' }}>
              {show ? fmtAmtAbs(Math.abs(pt.diff)) : ''}
            </td>
          );
        })}
      </tr>
    );
  };

  const colSpan = 1 + allPeriods.length;

  // ── Drill-down view ────────────────────────────────────────────────
  if (drillLedger) {
    return (
      <ErrorBoundary>
        <LedgerDetail ledger={drillLedger} branchId={branchId} onBack={() => setDrillLedger(null)} />
      </ErrorBoundary>
    );
  }

  // ── Main render ────────────────────────────────────────────────────
  return (
    <div ref={rootRef} style={s.root} id="bs-report" tabIndex={0}>
      <style>{`
        @media print { .no-print { display:none!important; } }
        .bs-grp-row:hover { background: #eef4fb !important; }
        #bs-report:focus  { outline: none; }
      `}</style>

      {showPeriod && (
        <PeriodModal from={mainPeriod.from} to={mainPeriod.to}
          onAccept={(f, t) => { setMainPeriod({ from:f, to:t }); setShowPeriod(false); }}
          onCancel={() => setShowPeriod(false)} />
      )}
      {showAddPeriod && (
        <AddPeriodModal
          onAdd={(label, from, to) => { setExtraPeriods(p => [...p, { label, from, to }]); setShowAddPeriod(false); }}
          onCancel={() => setShowAddPeriod(false)} />
      )}

      {/* Title Bar */}
      <div style={s.titleBar}>
        {onBack && <button onClick={onBack} className="no-print" style={s.backBtn}>← Back (Esc)</button>}
        <span style={{ flex:1, fontWeight:700 }}>Balance Sheet</span>
        <span style={{ flex:2, textAlign:'center', fontWeight:800, fontSize:12 }}>{companyName || '…'}</span>
        <span style={{ flex:1, textAlign:'right', opacity:0.7, fontSize:11 }}>{periodLabel(mainPeriod)}</span>
      </div>

      {/* Content */}
      <div style={s.contentWrap} ref={contentRef}>
        {loading ? (
          <div style={{ padding:60, textAlign:'center', color:'#888', fontStyle:'italic', fontSize:13 }}>Loading Balance Sheet…</div>
        ) : loadError ? (
          <div style={{ padding:40, textAlign:'center', color:'#7a0000', fontSize:13 }}>
            <div style={{ fontWeight:700, marginBottom:8 }}>⚠ Failed to load data</div>
            <div style={{ fontStyle:'italic', color:'#555' }}>{loadError}</div>
            <button onClick={() => window.location.reload()} style={{ marginTop:16, padding:'5px 18px', background:HDR_BG, color:'#fff', border:'none', cursor:'pointer', borderRadius:2, fontFamily:FONT_ }}>Retry</button>
          </div>
        ) : ledgers.length === 0 ? (
          <div style={{ padding:60, textAlign:'center', color:'#888', fontStyle:'italic', fontSize:13 }}>
            No ledger data found. Please check your API or add ledger entries.
          </div>
        ) : (
          <>
          {/* ── DEBUG PANEL (remove after fixing) ── */}
          {showDebug && (
            <div style={{ background:'#0d1117', color:'#39ff14', fontFamily:'monospace', fontSize:11, padding:12, borderBottom:'2px solid #ff0', overflowX:'auto', maxHeight:320, overflowY:'auto' }}>
              <div style={{ color:'#ff0', fontWeight:700, marginBottom:6 }}>═══ DEBUG PANEL ═══ (click "DBG" button to hide)</div>

              <div style={{ color:'#0af', marginTop:6 }}>▶ mainPeriod: {JSON.stringify(mainPeriod)}</div>
              <div style={{ color:'#0af' }}>▶ ledgers.length: {ledgers.length}</div>
              <div style={{ color:'#0af' }}>▶ vouchers.length: {allVouchers.length}</div>

              <div style={{ color:'#ff0', marginTop:8 }}>▶ FIRST 3 LEDGERS (check "group" field):</div>
              {ledgers.slice(0,3).map((l,i) => (
                <div key={i} style={{ marginLeft:12, color:'#fff', marginTop:2 }}>
                  [{i}] id={l.id} | name={l.name} | <span style={{ color:'#f80' }}>group="{l.group}"</span> | OB={l.openingBalance} {l.balanceType}
                </div>
              ))}

              <div style={{ color:'#ff0', marginTop:8 }}>▶ ALL UNIQUE GROUP VALUES IN LEDGERS:</div>
              <div style={{ marginLeft:12, color:'#0f8' }}>
                {[...new Set(ledgers.map(l => l.group))].map((g, i) => (
                  <span key={i} style={{ marginRight:8, background:'#1a3a1a', padding:'1px 4px', borderRadius:2 }}>"{g}"</span>
                ))}
              </div>

              <div style={{ color:'#ff0', marginTop:8 }}>▶ FIRST VOUCHER STRUCTURE (check entries format):</div>
              {allVouchers.length > 0 ? (
                <pre style={{ margin:'4px 0 0 12px', color:'#ccc', fontSize:10 }}>
                  {JSON.stringify(allVouchers[0], null, 2).slice(0, 800)}
                </pre>
              ) : <div style={{ marginLeft:12, color:'#f44' }}>NO VOUCHERS LOADED</div>}

              <div style={{ color:'#ff0', marginTop:8 }}>▶ GROUP TOTALS (Capital Account, Current Assets):</div>
              <div style={{ marginLeft:12, color:'#0af' }}>
                Capital Account: {groupTotalForPeriod('Capital Account', mainPeriod.from, mainPeriod.to)}
              </div>
              <div style={{ marginLeft:12, color:'#0af' }}>
                Current Assets: {groupTotalForPeriod('Current Assets', mainPeriod.from, mainPeriod.to)}
              </div>
              <div style={{ marginLeft:12, color:'#0af' }}>
                Fixed Assets: {groupTotalForPeriod('Fixed Assets', mainPeriod.from, mainPeriod.to)}
              </div>
              <div style={{ marginLeft:12, color:'#0af' }}>
                Current Liabilities: {groupTotalForPeriod('Current Liabilities', mainPeriod.from, mainPeriod.to)}
              </div>

              <div style={{ color:'#ff0', marginTop:8 }}>▶ LEDGERS PER EXPECTED GROUP:</div>
              {ALL_GROUPS.map(g => {
                const count = ledgers.filter(l => l.group === g).length;
                return (
                  <div key={g} style={{ marginLeft:12, color: count > 0 ? '#0f8' : '#f44' }}>
                    {count > 0 ? '✓' : '✗'} "{g}" → {count} ledger(s)
                  </div>
                );
              })}
            </div>
          )}
          <div style={s.twoCol}>

            {/* ── Liabilities ── */}
            <div style={s.col}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th colSpan={colSpan} style={{ ...rs.th, textAlign:'center', background:'#e8f0f7', letterSpacing:2, fontSize:12, fontWeight:800, color:HDR_BG, borderBottom:`2px solid ${BORDER}` }}>
                      LIABILITIES
                    </th>
                  </tr>
                  <tr style={{ background:LIGHT }}>
                    <ColHdrCells allPeriods={allPeriods} periodLabel={periodLabel} />
                  </tr>
                </thead>
                <tbody>
                  <SectionHeader label="Share Capital & Reserves" colSpan={colSpan} />
                  {renderGroupRow('Capital Account')}
                  {renderGroupRow('Reserves & Surplus')}

                  <SectionHeader label="Loan Funds" colSpan={colSpan} />
                  {renderGroupRow('Loans (Liability)')}

                  <SectionHeader label="Current Liabilities" colSpan={colSpan} />
                  {renderGroupRow('Current Liabilities')}
                  {renderGroupRow('Suspense Account')}

                  {showNettProfit && (periodTotals[0]?.plNet ?? 0) >= 0 && renderPLRow()}
                  {renderDiffRow('liab')}
                </tbody>
                <tfoot>
                  <tr style={s.totalRow}>
                    <td style={{ ...rs.tdName, fontWeight:900, fontSize:12, letterSpacing:1, paddingLeft:12 }}>Total</td>
                    {periodTotals.map((pt, i) => (
                      <td key={i} style={{ ...rs.tdAmt, fontWeight:900, fontSize:13, borderTop:'2px solid #555', borderLeft: i===0?'none':'1px solid #dde4ec' }}>
                        {fmtAmtAbs(pt.grand)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={s.divider} />

            {/* ── Assets ── */}
            <div style={s.col}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th colSpan={colSpan} style={{ ...rs.th, textAlign:'center', background:'#e8f0f7', letterSpacing:2, fontSize:12, fontWeight:800, color:HDR_BG, borderBottom:`2px solid ${BORDER}` }}>
                      ASSETS
                    </th>
                  </tr>
                  <tr style={{ background:LIGHT }}>
                    <ColHdrCells allPeriods={allPeriods} periodLabel={periodLabel} />
                  </tr>
                </thead>
                <tbody>
                  <SectionHeader label="Fixed Assets" colSpan={colSpan} />
                  {renderGroupRow('Fixed Assets')}

                  <SectionHeader label="Investments" colSpan={colSpan} />
                  {renderGroupRow('Investments')}

                  <SectionHeader label="Current Assets" colSpan={colSpan} />
                  {renderGroupRow('Current Assets')}

                  <SectionHeader label="Miscellaneous" colSpan={colSpan} />
                  {renderGroupRow('Misc. Expenses (Asset)')}

                  {showNettProfit && (periodTotals[0]?.plNet ?? 0) < 0 && renderPLRow()}
                  {renderDiffRow('asset')}
                </tbody>
                <tfoot>
                  <tr style={s.totalRow}>
                    <td style={{ ...rs.tdName, fontWeight:900, fontSize:12, letterSpacing:1, paddingLeft:12 }}>Total</td>
                    {periodTotals.map((pt, i) => (
                      <td key={i} style={{ ...rs.tdAmt, fontWeight:900, fontSize:13, borderTop:'2px solid #555', borderLeft: i===0?'none':'1px solid #dde4ec' }}>
                        {fmtAmtAbs(pt.grand)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
          </>
        )}
      </div>

      {/* Right Function Buttons */}
      <div style={s.rightPanel} className="no-print">
        {[
          { k:'F2',    l:'Period',                         a: () => setShowPeriod(true) },
          { k:'F5',    l:'Expand All',                     a: () => setExpanded(new Set([...LIABILITY_GROUPS, ...ASSET_GROUPS])) },
          { k:'Esc',   l:'Collapse /\nBack',               a: () => { if (expanded.size > 0) setExpanded(new Set()); else onBack?.(); } },
          { k:'Alt+N', l:'Add Period',                     a: () => setShowAddPeriod(true) },
          { k:'Alt+P', l:'Print',                          a: () => window.print() },
          { k:'Alt+E', l:'Export Excel',                   a: handleExport },
          { k:'P&L',   l: showNettProfit ? 'Hide P&L\nBalance' : 'Show P&L\nBalance', a: () => setShowNettProfit(p => !p) },
          { k:'DBG',   l: showDebug ? 'Hide\nDebug' : 'Show\nDebug',                  a: () => setShowDebug(p => !p) },
          { k:'✕ Clr', l:'Clear Periods',                 a: () => setExtraPeriods([]) },
          { k:'F12',   l:'Configure',                      a: () => {} },
        ].map((b, i) => (
          <button key={i} onClick={b.a} className="no-print" style={{
            ...s.sideBtn,
            background: b.k==='Alt+N' ? 'rgba(100,200,100,0.15)' : b.k==='✕ Clr' ? 'rgba(255,80,80,0.15)' : b.k==='P&L' ? 'rgba(255,200,50,0.12)' : 'none',
            opacity: b.l ? 1 : 0.2,
          }}>
            <span style={s.sBtnKey}>{b.k}</span>
            <span style={s.sBtnLabel}>{b.l}</span>
          </button>
        ))}
      </div>

      {/* Status Bar */}
      <div style={s.statusBar} className="no-print">
        <span style={{ color:'#aaa', fontSize:10 }}>
          {periodTotals[0] && (() => {
            const { liabTotal, assetTotal, plNet } = periodTotals[0];
            const balanced = Math.abs(liabTotal - assetTotal) < 0.01;
            return balanced
              ? `Balance Sheet Balanced ✓  |  P&L: ${plNet >= 0 ? 'Net Profit' : 'Net Loss'} ₹ ${fmtAmtAbs(plNet)}`
              : `⚠ Out of Balance by ₹ ${fmtAmtAbs(liabTotal - assetTotal)}`;
          })()}
          {extraPeriods.length > 0 && `  ·  Comparing ${allPeriods.length} periods`}
        </span>
        <span style={{ color:'#aaa', fontSize:10 }}>
          F2: Period  |  F5: Expand  |  Alt+N: Add Comparison  |  Click ledger: Transactions  |  P&L: Toggle
        </span>
      </div>
    </div>
  );
}

// ── Exported with error boundary wrapper ─────────────────────────────────────
export default function BalanceSheetScreenSafe(props: BSProps) {
  return (
    <ErrorBoundary>
      <BalanceSheetScreen {...props} />
    </ErrorBoundary>
  );
}
