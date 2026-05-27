/**
 * TallyPrime-style Profit & Loss A/c — v3
 * Fixes:
 * 1. Arrow key navigation (Up/Down to move focus, Enter to expand/drill)
 * 2. Removed Print and Export keyboard shortcuts + side buttons
 * 3. ESC goes back to main menu via onBack prop
 * 4. Table area fills full height to bottom of page
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { exportToExcel } from '../lib/ReportUtils';

// ── Re-use the LedgerDetail component from Trial Balance ──────────────────────
interface Ledger {
  id: string; name: string; group?: string; group_name?: string;
  openingBalance?: number; balanceType?: 'Dr' | 'Cr';
}

function fmtAmtAbs(n: number) {
  return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()}-${M[d.getMonth()]}-${d.getFullYear()}`;
  } catch { return iso; }
}

// ─── LedgerDetail (drill-down) ────────────────────────────────────────────────
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
      .then(r => r.json()).then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([])).finally(() => setLoading(false));
  }, [ledger.id, branchId]);

  const ob     = Number(ledger.openingBalance || 0);
  const obSgn  = ledger.balanceType === 'Cr' ? -ob : ob;
  let running  = obSgn;
  const withRun = rows.map(r => {
    const amt = Number(r.entry_amount || 0);
    running  += r.entry_type === 'Dr' ? amt : -amt;
    return { ...r, running };
  });
  const totalDr = rows.filter(r => r.entry_type === 'Dr').reduce((a,r) => a + Number(r.entry_amount||0), 0);
  const totalCr = rows.filter(r => r.entry_type === 'Cr').reduce((a,r) => a + Number(r.entry_amount||0), 0);
  const closing = obSgn + totalDr - totalCr;

  const FONT = `-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,sans-serif`;
  const HDR  = '#1f4e79';
  const BD   = '#e0e6ee';

  return (
    <div style={{ fontFamily: FONT, fontSize: 12, display:'flex', flexDirection:'column', height:'100%', background:'#fff', border:'1px solid #b8c4cc', borderRadius:2, overflow:'hidden' }}>
      <div style={{ background: HDR, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'3px 10px', fontSize:12, fontWeight:700, flexShrink:0 }}>
        <button onClick={onBack} style={{ background:'none', border:'1px solid rgba(255,255,255,0.4)', color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:FONT, padding:'1px 10px', borderRadius:2 }}>← Back</button>
        <span style={{ flex:2, textAlign:'center', fontWeight:800, fontSize:13 }}>{ledger.name}</span>
        <span />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 12px', background:'#fafbfd', borderBottom:'1px solid #b8c4cc', flexShrink:0 }}>
        <div>
          <span style={{ fontSize:11, color:'#777', fontStyle:'italic' }}>Ledger: </span>
          <span style={{ fontSize:12, fontWeight:700 }}>{ledger.name}</span>
          <span style={{ fontSize:11, color:'#777', fontStyle:'italic', marginLeft:16 }}>Group: </span>
          <span style={{ fontSize:12, fontWeight:700 }}>{ledger.group || ledger.group_name || '—'}</span>
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
              {['Date','Particulars','Vch Type','Vch No.','Debit (₹)','Credit (₹)','Balance'].map((h,i) => (
                <th key={h} style={{ padding:'4px 8px', fontSize:11, fontWeight:700, color:'#333', borderBottom:'1px solid #b8c4cc', borderRight:'1px solid #e0e6ee', background:'#f0f4f8', textAlign: i >= 4 ? 'right' : i === 3 ? 'center' : 'left', whiteSpace:'nowrap', width: i===0?80:i===2?100:i===3?70:i>=4?120:undefined }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ background:'#f8fbff', borderBottom:`1px solid ${BD}` }}>
              <td style={{ padding:'3px 8px', borderRight:`1px solid ${BD}` }} />
              <td style={{ padding:'3px 8px', fontWeight:700, fontStyle:'italic', color:'#555', borderRight:`1px solid ${BD}` }}>Opening Balance</td>
              <td style={{ padding:'3px 8px', borderRight:`1px solid ${BD}` }} /><td style={{ padding:'3px 8px', borderRight:`1px solid ${BD}` }} />
              <td style={{ padding:'3px 10px', textAlign:'right', color:'#7a0000', borderRight:`1px solid ${BD}` }}>{obSgn > 0 ? fmtAmtAbs(ob) : ''}</td>
              <td style={{ padding:'3px 10px', textAlign:'right', color:'#006b00', borderRight:`1px solid ${BD}` }}>{obSgn < 0 ? fmtAmtAbs(ob) : ''}</td>
              <td style={{ padding:'3px 10px', textAlign:'right', fontWeight:700 }}>{fmtAmtAbs(ob)} {ledger.balanceType||'Dr'}</td>
            </tr>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:24, textAlign:'center', color:'#888', fontStyle:'italic' }}>Loading…</td></tr>
            ) : withRun.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:24, textAlign:'center', color:'#888', fontStyle:'italic' }}>No transactions found.</td></tr>
            ) : withRun.map((r,i) => {
              const isDr = r.entry_type === 'Dr';
              const runType = r.running >= 0 ? 'Dr' : 'Cr';
              return (
                <tr key={`${r.id}-${i}`} style={{ borderBottom:`1px solid ${BD}`, background: i%2===0?'#fff':'#fafbfd' }}>
                  <td style={{ padding:'3px 8px', borderRight:`1px solid ${BD}` }}>{fmtDate(r.date)}</td>
                  <td style={{ padding:'3px 8px', fontWeight:600, borderRight:`1px solid ${BD}`, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.narration||r.type||'—'}</td>
                  <td style={{ padding:'3px 8px', fontStyle:'italic', color:'#555', borderRight:`1px solid ${BD}` }}>{r.type}</td>
                  <td style={{ padding:'3px 8px', textAlign:'center', borderRight:`1px solid ${BD}` }}>{r.number||''}</td>
                  <td style={{ padding:'3px 10px', textAlign:'right', color:'#7a0000', fontWeight: isDr?700:400, borderRight:`1px solid ${BD}` }}>{isDr?fmtAmtAbs(r.entry_amount):''}</td>
                  <td style={{ padding:'3px 10px', textAlign:'right', color:'#006b00', fontWeight:!isDr?700:400, borderRight:`1px solid ${BD}` }}>{!isDr?fmtAmtAbs(r.entry_amount):''}</td>
                  <td style={{ padding:'3px 10px', textAlign:'right', fontWeight:600 }}>{fmtAmtAbs(r.running)} {runType}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:'#f0f4f8', borderTop:'1px solid #b8c4cc', position:'sticky', bottom:0 }}>
              <td colSpan={4} style={{ padding:'4px 8px', fontWeight:700, textAlign:'right', borderRight:`1px solid ${BD}`, paddingRight:8 }}>Closing Balance</td>
              <td style={{ padding:'4px 10px', textAlign:'right', fontWeight:700, color:'#7a0000', borderTop:'2px solid #555', borderRight:`1px solid ${BD}` }}>{totalDr>0?fmtAmtAbs(totalDr):''}</td>
              <td style={{ padding:'4px 10px', textAlign:'right', fontWeight:700, color:'#006b00', borderTop:'2px solid #555', borderRight:`1px solid ${BD}` }}>{totalCr>0?fmtAmtAbs(totalCr):''}</td>
              <td style={{ padding:'4px 10px', textAlign:'right', fontWeight:800, borderTop:'2px solid #555' }}>{fmtAmtAbs(closing)} {closing>=0?'Dr':'Cr'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Period Modal ──────────────────────────────────────────────────────────────
function PeriodModal({ from, to, onAccept, onCancel }: { from:string; to:string; onAccept:(f:string,t:string)=>void; onCancel:()=>void }) {
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const toRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onCancel]);
  const HDR = '#1f4e79'; const BD = '#b8c4cc';
  const FONT = `-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.4)' }}>
      <div style={{ background:'#fff', border:`1px solid ${BD}`, borderRadius:2, boxShadow:'0 8px 32px rgba(0,0,0,0.28)', width:300, overflow:'hidden', fontFamily:FONT }}>
        <div style={{ background:HDR, color:'#fff', padding:'5px 12px', fontSize:12, fontWeight:700 }}>Change Period  <span style={{ fontSize:9, opacity:0.6 }}>F2</span></div>
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
          {[{lbl:'From Date :', val:f, set:setF, ref:undefined as any, onKey:(e:React.KeyboardEvent)=>{ if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();toRef.current?.focus();}}},
            {lbl:'To Date :',   val:t, set:setT, ref:toRef,           onKey:(e:React.KeyboardEvent)=>{ if(e.key==='Enter') onAccept(f,t);}}
          ].map((row,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <label style={{ fontSize:12, color:'#555', fontStyle:'italic', width:90, flexShrink:0 }}>{row.lbl}</label>
              <input autoFocus={i===0} ref={row.ref} type="date" value={row.val} onChange={e=>row.set(e.target.value)} onKeyDown={row.onKey}
                style={{ flex:1, border:'none', borderBottom:`2px solid ${HDR}`, outline:'none', fontSize:13, fontWeight:700, fontFamily:FONT, padding:'2px 4px', background:'#fffde0', color:'#1a1a1a' }} />
            </div>
          ))}
        </div>
        <div style={{ padding:'8px 16px 12px', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={()=>onAccept(f,t)} style={{ background:HDR, color:'#fff', border:'none', padding:'5px 18px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT, borderRadius:2 }}>Accept</button>
          <button onClick={onCancel}          style={{ background:'#f0f4f8', color:'#444', border:`1px solid ${BD}`, padding:'5px 18px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT, borderRadius:2 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Comparison Period Modal ───────────────────────────────────────────────
function AddPeriodModal({ onAdd, onCancel }: { onAdd:(label:string,from:string,to:string)=>void; onCancel:()=>void }) {
  const [label, setLabel] = useState('');
  const [from,  setFrom]  = useState('');
  const [to,    setTo]    = useState('');
  const HDR = '#1f4e79'; const BD = '#b8c4cc';
  const FONT = `-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onCancel]);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.4)' }}>
      <div style={{ background:'#fff', border:`1px solid ${BD}`, borderRadius:2, boxShadow:'0 8px 32px rgba(0,0,0,0.28)', width:340, overflow:'hidden', fontFamily:FONT }}>
        <div style={{ background:HDR, color:'#fff', padding:'5px 12px', fontSize:12, fontWeight:700 }}>Add Comparison Period</div>
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { lbl:'Label (optional):', val:label, set:setLabel, type:'text',  ph:'e.g. Q1 Apr–Jun' },
            { lbl:'From Date :',       val:from,  set:setFrom,  type:'date',  ph:'' },
            { lbl:'To Date :',         val:to,    set:setTo,    type:'date',  ph:'' },
          ].map((row,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <label style={{ fontSize:12, color:'#555', fontStyle:'italic', width:110, flexShrink:0 }}>{row.lbl}</label>
              <input autoFocus={i===0} type={row.type} value={row.val} placeholder={row.ph} onChange={e=>row.set(e.target.value)}
                style={{ flex:1, border:'none', borderBottom:`2px solid ${HDR}`, outline:'none', fontSize:13, fontWeight:700, fontFamily:FONT, padding:'2px 4px', background:'#fffde0', color:'#1a1a1a' }} />
            </div>
          ))}
        </div>
        <div style={{ padding:'8px 16px 12px', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={()=>{ if(from&&to) onAdd(label||`${fmtDate(from)} – ${fmtDate(to)}`,from,to); }}
            style={{ background:HDR, color:'#fff', border:'none', padding:'5px 18px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT, borderRadius:2 }}>Add</button>
          <button onClick={onCancel} style={{ background:'#f0f4f8', color:'#444', border:`1px solid ${BD}`, padding:'5px 18px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT, borderRadius:2 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Period { label: string; from: string; to: string; }
// FIX 3: Added onBack prop for ESC → main menu navigation
interface PLScreenProps { branchId?: string; onBack?: () => void; }

const FONT_   = `-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,sans-serif`;
const HDR_BG  = '#1f4e79';
const BORDER  = '#b8c4cc';
const LIGHT   = '#f0f4f8';
const ROW_BDR = '#e0e6ee';
const DARK    = '#1a2a3a';

// ─── Main PLScreen ─────────────────────────────────────────────────────────────
export default function PLScreen({ branchId, onBack }: PLScreenProps) {
  const [ledgers, setLedgers]         = useState<any[]>([]);
  const [allVouchers, setAllVouchers] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [mainPeriod, setMainPeriod]   = useState({ from: '', to: '' });
  const [extraPeriods, setExtraPeriods] = useState<Period[]>([]);
  const [showPeriod, setShowPeriod]   = useState(false);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [drillLedger, setDrillLedger] = useState<Ledger | null>(null);
  const [loading, setLoading]         = useState(true);
  const [showPercent, setShowPercent] = useState(false);

  // FIX 1: Arrow key navigation state
  const [focusedRowIdx, setFocusedRowIdx] = useState<number>(-1);
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Fetch once ──────────────────────────────────────────────────────
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
      setAllVouchers(vArr);
      if (vArr.length > 0) {
        const dates = vArr.map((x:any) => x.date?.slice(0,10)).filter(Boolean).sort();
        setMainPeriod({ from: dates[0], to: dates[dates.length-1] });
      }
      if (Array.isArray(b)) {
        const br = branchId ? b.find((x:any)=>x.id===branchId) : b[0];
        if (br) setCompanyName(br.name);
      }
    }).catch(()=>{}).finally(()=>setLoading(false));
    fetch('/api/settings/company').then(r=>r.ok?r.json():null)
      .then(d=>{if(d?.name)setCompanyName(d.name);}).catch(()=>{});
  }, [branchId]);

  // ── Balance calculation for a specific period ──────────────────────
  const calcBalanceForPeriod = useCallback((ledgerId: string, from: string, to: string) => {
    const ledger  = ledgers.find(l => l.id === ledgerId);
    const ob      = Number(ledger?.openingBalance || 0);
    let running   = ledger?.balanceType === 'Cr' ? -ob : ob;
    allVouchers.forEach(v => {
      const vDate = v.date?.slice(0,10) || '';
      if (from && vDate < from) return;
      if (to   && vDate > to)   return;
      (v.entries || []).forEach((e:any) => {
        if (e.ledgerId === ledgerId) running += e.type === 'Dr' ? Number(e.amount) : -Number(e.amount);
      });
    });
    return running;
  }, [ledgers, allVouchers]);

  const groupTotalForPeriod = useCallback((groupName: string, from: string, to: string) => {
    return ledgers
      .filter(l => l.group === groupName || l.group_name === groupName)
      .reduce((acc, l) => acc + calcBalanceForPeriod(l.id, from, to), 0);
  }, [ledgers, calcBalanceForPeriod]);

  const groupLedgersNonZero = useCallback((groupName: string, from: string, to: string) => {
    return ledgers
      .filter(l => l.group === groupName || l.group_name === groupName)
      .filter(l => calcBalanceForPeriod(l.id, from, to) !== 0);
  }, [ledgers, calcBalanceForPeriod]);

  // All periods (main + extra comparisons)
  const allPeriods: Period[] = useMemo(() => [
    { label: companyName || '…', from: mainPeriod.from, to: mainPeriod.to },
    ...extraPeriods,
  ], [mainPeriod, extraPeriods, companyName]);

  const LEFT_GROUPS  = ['Opening Stock', 'Purchase Account', 'Direct Expenses', 'Indirect Expenses'];
  const RIGHT_GROUPS = ['Sales Account', 'Direct Income', 'Indirect Income', 'Closing Stock'];
  // All navigable group rows (for arrow key nav)
  const ALL_GROUPS   = [...LEFT_GROUPS, ...RIGHT_GROUPS];

  // ── P&L totals per period ────────────────────────────────────────────
  const periodTotals = useMemo(() => allPeriods.map(p => {
    const leftT  = LEFT_GROUPS.reduce((a,g) => a + Math.abs(groupTotalForPeriod(g, p.from, p.to)), 0);
    const rightT = RIGHT_GROUPS.reduce((a,g) => a + Math.abs(groupTotalForPeriod(g, p.from, p.to)), 0);
    return { leftT, rightT, nett: rightT - leftT, grand: Math.max(leftT, rightT) };
  }), [allPeriods, groupTotalForPeriod]);

  const salesTotal0 = Math.abs(groupTotalForPeriod('Sales Account', mainPeriod.from, mainPeriod.to));

  // FIX 1: Build a flat navigable row list for arrow key movement
  // Each entry: { type: 'group', name } | { type: 'ledger', ledger, groupName }
  const navigableRows = useMemo(() => {
    const rows: Array<{ type: 'group'; name: string } | { type: 'ledger'; ledger: any; groupName: string }> = [];
    ALL_GROUPS.forEach(grpName => {
      const anyNonZero = allPeriods.some(p => groupTotalForPeriod(grpName, p.from, p.to) !== 0);
      if (!anyNonZero) return;
      rows.push({ type: 'group', name: grpName });
      if (expanded.has(grpName)) {
        groupLedgersNonZero(grpName, mainPeriod.from, mainPeriod.to).forEach(l => {
          rows.push({ type: 'ledger', ledger: l, groupName: grpName });
        });
      }
    });
    return rows;
  }, [ALL_GROUPS, allPeriods, expanded, groupTotalForPeriod, groupLedgersNonZero, mainPeriod]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedRowIdx < 0) return;
    const el = contentRef.current?.querySelector(`[data-rowidx="${focusedRowIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedRowIdx]);

  // ── Scoped keyboard shortcuts (capture phase, stopPropagation) ──────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (drillLedger) return;

      let handled = false;

      // FIX 1: Arrow key navigation
      if (e.key === 'ArrowDown') {
        setFocusedRowIdx(prev => Math.min(prev + 1, navigableRows.length - 1));
        handled = true;
      } else if (e.key === 'ArrowUp') {
        setFocusedRowIdx(prev => Math.max(prev - 1, 0));
        handled = true;
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        // Enter/Right on group → expand; on ledger → drill down
        if (focusedRowIdx >= 0 && focusedRowIdx < navigableRows.length) {
          const row = navigableRows[focusedRowIdx];
          if (row.type === 'group') {
            toggleGroup(row.name);
          } else if (row.type === 'ledger') {
            setDrillLedger(row.ledger);
          }
          handled = true;
        }
      } else if (e.key === 'ArrowLeft') {
        // Left on ledger → collapse parent group; on group → collapse it
        if (focusedRowIdx >= 0 && focusedRowIdx < navigableRows.length) {
          const row = navigableRows[focusedRowIdx];
          const grpName = row.type === 'group' ? row.name : row.groupName;
          setExpanded(prev => { const n = new Set(prev); n.delete(grpName); return n; });
          handled = true;
        }
      } else if (e.key === 'F2') {
        setShowPeriod(p=>!p); handled = true;
      } else if (e.key === 'F5') {
        setExpanded(new Set([...LEFT_GROUPS, ...RIGHT_GROUPS])); handled = true;
      } else if (e.key === 'Escape') {
        // FIX 3: ESC collapses if anything expanded, else goes back to main menu
        if (expanded.size > 0) {
          setExpanded(new Set());
        } else if (onBack) {
          onBack();
        }
        handled = true;
      } else if (e.altKey && e.key.toLowerCase() === 'f') {
        setShowPercent(p=>!p); handled = true;
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        setShowAddPeriod(true); handled = true;
      }

      if (handled) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [drillLedger, focusedRowIdx, navigableRows, expanded, onBack]);

  // ── Expand/collapse ──────────────────────────────────────────────────
  const toggleGroup = (name: string) => setExpanded(prev => {
    const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n;
  });

  // ── Period label ─────────────────────────────────────────────────────
  const periodLabel = (p: {from:string;to:string}) =>
    p.from && p.to ? `${fmtDate(p.from)} to ${fmtDate(p.to)}` : '—';

  // FIX 2: Export without keyboard shortcut (button only)
  const handleExport = () => {
    const rows: any[] = [];
    allPeriods.forEach(p => {
      LEFT_GROUPS.forEach(g => rows.push({ Period: p.label, Side:'Expenditure', Group:g, Amount: Math.abs(groupTotalForPeriod(g, p.from, p.to)) }));
      RIGHT_GROUPS.forEach(g => rows.push({ Period: p.label, Side:'Income', Group:g, Amount: Math.abs(groupTotalForPeriod(g, p.from, p.to)) }));
    });
    exportToExcel(rows, 'Profit_And_Loss');
  };

  // ── Drill-down view ───────────────────────────────────────────────────
  if (drillLedger) {
    return <LedgerDetail ledger={drillLedger} branchId={branchId} onBack={() => setDrillLedger(null)} />;
  }

  // ── Column header cell ────────────────────────────────────────────────
  const ColHdrCells = ({ side }: { side: 'left'|'right' }) => (
    <>
      <th style={{ ...rs.th, textAlign:'left', width: showPercent ? '40%' : '50%' }}>Particulars</th>
      {showPercent && <th style={{ ...rs.th, width:'8%', textAlign:'right', fontSize:10 }}>%</th>}
      {allPeriods.map((p,i) => (
        <th key={i} style={{ ...rs.th, textAlign:'right', width: `${(showPercent?52:50)/allPeriods.length}%`, borderLeft: i===0?'none':'1px solid #ccd5dd' }}>
          <div style={{ fontSize:11, fontWeight:800, color:'#1a1a1a', whiteSpace:'nowrap' }}>{p.label}</div>
          <div style={{ fontSize:10, fontWeight:400, color:'#777', whiteSpace:'nowrap' }}>{periodLabel(p)}</div>
        </th>
      ))}
    </>
  );

  // FIX 1: Row index counter shared across left/right columns for unified keyboard nav
  // We use a ref-based counter that resets each render pass
  let rowIdxCounter = -1;

  // ── Group row (with all period columns) ───────────────────────────────
  const renderGroupRow = (grpName: string) => {
    const anyNonZero = allPeriods.some(p => groupTotalForPeriod(grpName, p.from, p.to) !== 0);
    if (!anyNonZero) return null;

    const isExp = expanded.has(grpName);
    const mainAbs = Math.abs(groupTotalForPeriod(grpName, mainPeriod.from, mainPeriod.to));
    const pct = salesTotal0 > 0 ? ((mainAbs / salesTotal0) * 100).toFixed(2) : '—';

    rowIdxCounter++;
    const grpIdx = rowIdxCounter;
    const isFocused = focusedRowIdx === grpIdx;

    return (
      <React.Fragment key={grpName}>
        <tr
          data-rowidx={grpIdx}
          style={{ ...rs.groupRow, cursor:'pointer', outline: isFocused ? '2px solid #1f4e79' : 'none', outlineOffset: -2, background: isFocused ? '#ddeeff' : '#fff' }}
          onClick={() => { setFocusedRowIdx(grpIdx); toggleGroup(grpName); }}
          className="pl-grp-row"
        >
          <td style={rs.tdName}>
            <span style={rs.toggle}>{isExp ? '−' : '+'}</span>
            <span style={rs.groupName}>{grpName}</span>
          </td>
          {showPercent && <td style={rs.tdPct}>{pct} %</td>}
          {allPeriods.map((p,i) => {
            const abs = Math.abs(groupTotalForPeriod(grpName, p.from, p.to));
            return (
              <td key={i} style={{ ...rs.tdAmt, borderLeft: i===0?'none':'1px solid #dde4ec' }}>
                {abs > 0 ? fmtAmtAbs(abs) : ''}
              </td>
            );
          })}
        </tr>
        {isExp && groupLedgersNonZero(grpName, mainPeriod.from, mainPeriod.to).map(l => {
          rowIdxCounter++;
          const ledgerIdx = rowIdxCounter;
          const isLedgerFocused = focusedRowIdx === ledgerIdx;
          return (
            <tr
              key={l.id}
              data-rowidx={ledgerIdx}
              style={{ ...rs.ledgerRow, outline: isLedgerFocused ? '2px solid #1f4e79' : 'none', outlineOffset: -2, background: isLedgerFocused ? '#ddeeff' : '#fafbff' }}
              onClick={() => setFocusedRowIdx(ledgerIdx)}
            >
              <td style={{ ...rs.tdName, paddingLeft:28 }}>
                <span
                  onClick={(e) => { e.stopPropagation(); setDrillLedger(l); }}
                  style={{ fontStyle:'italic', color:'#1a5fa8', cursor:'pointer', textDecoration:'underline', fontSize:11 }}
                  title="Click to view transactions"
                >
                  {l.name}
                </span>
              </td>
              {showPercent && <td style={rs.tdPct} />}
              {allPeriods.map((p,i) => {
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

  // ── Nett Profit / Loss row ────────────────────────────────────────────
  const renderNettRow = (side: 'left'|'right') => (
    <tr style={{ ...rs.groupRow, background:'#f8fbff' }}>
      <td style={{ ...rs.tdName, fontStyle:'italic', paddingLeft:16 }}>
        {periodTotals[0]?.nett >= 0 ? 'Nett Profit' : 'Nett Loss'}
      </td>
      {showPercent && <td style={rs.tdPct} />}
      {periodTotals.map((pt,i) => {
        const isProfit = pt.nett >= 0;
        const showOnSide = (side==='left' && isProfit) || (side==='right' && !isProfit);
        return (
          <td key={i} style={{ ...rs.tdAmt, color: isProfit ? '#006b00' : '#7a0000', fontWeight:800, borderLeft: i===0?'none':'1px solid #dde4ec' }}>
            {showOnSide ? fmtAmtAbs(pt.nett) : ''}
          </td>
        );
      })}
    </tr>
  );

  // ── Section header row ────────────────────────────────────────────────
  const SectionHeader = ({ label }: { label: string }) => (
    <tr style={{ background:'#fafbff' }}>
      <td colSpan={1 + (showPercent?1:0) + allPeriods.length}
        style={{ padding:'6px 10px 2px', fontSize:12, fontStyle:'italic', fontWeight:600, color:'#444', letterSpacing:2, borderBottom:'none' }}>
        {label}
      </td>
    </tr>
  );

  return (
    // FIX 4: root uses height:100% with flex column so content fills all available space
    <div style={s.root} id="pl-report" tabIndex={0}>
      <style>{`
        @media print { .no-print { display:none!important; } }
        .pl-grp-row:hover { background: #eef4fb !important; }
        #pl-report:focus { outline: none; }
      `}</style>

      {/* Modals */}
      {showPeriod && (
        <PeriodModal from={mainPeriod.from} to={mainPeriod.to}
          onAccept={(f,t) => { setMainPeriod({from:f,to:t}); setShowPeriod(false); }}
          onCancel={() => setShowPeriod(false)} />
      )}
      {showAddPeriod && (
        <AddPeriodModal
          onAdd={(label,from,to) => { setExtraPeriods(p=>[...p,{label,from,to}]); setShowAddPeriod(false); }}
          onCancel={() => setShowAddPeriod(false)} />
      )}

      {/* Title Bar */}
      <div style={s.titleBar}>
        {/* FIX 3: Back button in title bar calls onBack */}
        {onBack && (
          <button onClick={onBack} className="no-print" style={{ background:'none', border:'1px solid rgba(255,255,255,0.35)', color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:FONT_, padding:'1px 10px', borderRadius:2, marginRight:8 }}>
            ← Back
          </button>
        )}
        <span style={{ flex:1, fontWeight:700 }}>Profit & Loss A/c</span>
        <span style={{ flex:2, textAlign:'center', fontWeight:800, fontSize:12 }}>{companyName||'…'}</span>
        <span style={{ flex:1, textAlign:'right', opacity:0.7, fontSize:11 }}>{periodLabel(mainPeriod)}</span>
      </div>

      {/* FIX 4: contentWrap is flex:1 and overflow handles scroll internally */}
      <div style={s.contentWrap} ref={contentRef}>
        {loading ? (
          <div style={{ padding:60, textAlign:'center', color:'#888', fontStyle:'italic', fontSize:13 }}>Loading…</div>
        ) : (
          // FIX 4: twoCol fills full height of its container
          <div style={s.twoCol}>

            {/* ── LEFT: Expenditure ── */}
            <div style={s.col}>
              <table style={s.table}>
                <thead><tr style={{ background:LIGHT }}><ColHdrCells side="left" /></tr></thead>
                <tbody>
                  <SectionHeader label="Trading Account" />
                  {renderGroupRow('Opening Stock')}
                  {renderGroupRow('Purchase Account')}
                  <SectionHeader label="Indirect Expenses" />
                  {renderGroupRow('Direct Expenses')}
                  {renderGroupRow('Indirect Expenses')}
                  {periodTotals[0]?.nett >= 0 && renderNettRow('left')}
                </tbody>
                <tfoot>
                  <tr style={s.totalRow}>
                    <td style={{ ...rs.tdName, fontWeight:900, fontSize:12, letterSpacing:1, paddingLeft:12 }}>Total</td>
                    {showPercent && <td style={rs.tdPct} />}
                    {periodTotals.map((pt,i) => (
                      <td key={i} style={{ ...rs.tdAmt, fontWeight:900, fontSize:13, borderTop:'2px solid #555', borderLeft: i===0?'none':'1px solid #dde4ec' }}>
                        {fmtAmtAbs(pt.grand)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Column divider */}
            <div style={s.divider} />

            {/* ── RIGHT: Income ── */}
            <div style={s.col}>
              <table style={s.table}>
                <thead><tr style={{ background:LIGHT }}><ColHdrCells side="right" /></tr></thead>
                <tbody>
                  <SectionHeader label="Trading Account" />
                  {renderGroupRow('Sales Account')}
                  {renderGroupRow('Direct Income')}
                  {renderGroupRow('Closing Stock')}
                  <SectionHeader label="Income Statement" />
                  {renderGroupRow('Indirect Income')}
                  {periodTotals[0]?.nett < 0 && renderNettRow('right')}
                </tbody>
                <tfoot>
                  <tr style={s.totalRow}>
                    <td style={{ ...rs.tdName, fontWeight:900, fontSize:12, letterSpacing:1, paddingLeft:12 }}>Total</td>
                    {showPercent && <td style={rs.tdPct} />}
                    {periodTotals.map((pt,i) => (
                      <td key={i} style={{ ...rs.tdAmt, fontWeight:900, fontSize:13, borderTop:'2px solid #555', borderLeft: i===0?'none':'1px solid #dde4ec' }}>
                        {fmtAmtAbs(pt.grand)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        )}
      </div>

      {/* Right Function Buttons — FIX 2: Print and Export shortcuts removed */}
      <div style={s.rightPanel} className="no-print">
        {[
          { k:'F2',    l:'Period',        a:()=>setShowPeriod(true) },
          { k:'F5',    l:'Expand All',    a:()=>setExpanded(new Set([...LEFT_GROUPS,...RIGHT_GROUPS])) },
          { k:'Esc',   l:'Collapse / Back', a:()=>{ if(expanded.size>0){setExpanded(new Set());}else if(onBack){onBack();} } },
          { k:'↑↓',   l:'Navigate Rows', a:()=>{} },
          { k:'Enter', l:'Expand / Drill', a:()=>{} },
          { k:'Alt+N', l:'Add Period',    a:()=>setShowAddPeriod(true) },
          { k:'Alt+F', l:'Percentages',   a:()=>setShowPercent(p=>!p) },
          { k:'',      l: extraPeriods.length > 0 ? `${extraPeriods.length} extra\nperiod(s)` : '', a:()=>{} },
          { k:'✕ Clr', l:'Clear Periods', a:()=>setExtraPeriods([]) },
          { k:'F12',   l:'Configure',     a:()=>{} },
        ].map((b,i) => (
          <button key={i} onClick={b.a} className="no-print" style={{
            ...s.sideBtn,
            background: b.k==='Alt+N' ? 'rgba(100,200,100,0.15)' : b.k==='✕ Clr' ? 'rgba(255,80,80,0.15)' : 'none',
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
          {periodTotals[0] && (periodTotals[0].nett >= 0
            ? `Net Profit: ₹ ${fmtAmtAbs(periodTotals[0].nett)}`
            : `Net Loss: ₹ ${fmtAmtAbs(periodTotals[0].nett)}`)}
          {extraPeriods.length > 0 && ` · Comparing ${allPeriods.length} periods`}
        </span>
        <span style={{ color:'#aaa', fontSize:10 }}>
          F2: Period  |  F5: Expand  |  ↑↓: Navigate  |  Enter: Expand/Drill  |  Esc: Collapse/Back  |  Alt+F: %
        </span>
      </div>
    </div>
  );
}

// ── Row styles ──────────────────────────────────────────────────────────────────
const rs: Record<string, React.CSSProperties> = {
  th:         { padding:'5px 10px', fontSize:11, fontWeight:700, color:'#333', borderBottom:`1px solid ${BORDER}`, background:LIGHT, whiteSpace:'nowrap' },
  groupRow:   { borderBottom:`1px solid ${ROW_BDR}`, background:'#fff', transition:'background 0.07s' },
  ledgerRow:  { borderBottom:`1px solid ${ROW_BDR}`, background:'#fafbff' },
  tdName:     { padding:'3px 8px', fontSize:12, verticalAlign:'middle', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  tdAmt:      { padding:'3px 10px', fontSize:12, fontWeight:700, textAlign:'right', verticalAlign:'middle', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' },
  tdPct:      { padding:'3px 6px', fontSize:11, textAlign:'right', color:'#888', whiteSpace:'nowrap' },
  toggle:     { display:'inline-block', width:14, height:14, lineHeight:'14px', textAlign:'center', fontSize:11, fontWeight:900, border:`1px solid ${BORDER}`, background:LIGHT, color:'#555', marginRight:6, cursor:'pointer', flexShrink:0 },
  groupName:  { fontWeight:700, textTransform:'uppercase', fontSize:12, letterSpacing:0.3, color:'#1a1a1a' },
};

const s: Record<string, React.CSSProperties> = {
  // FIX 4: height:100% + flex column so the component fills its parent fully
  root:        { fontFamily:FONT_, fontSize:12, color:'#1a1a1a', background:'#fff', display:'flex', flexDirection:'column', height:'100%', minHeight:0, border:`1px solid #b8c4cc`, borderRadius:2, overflow:'hidden', position:'relative' },
  titleBar:    { background:HDR_BG, color:'#fff', display:'flex', alignItems:'center', padding:'3px 8px', fontSize:11, fontWeight:600, flexShrink:0 },
  // FIX 4: flex:1 + minHeight:0 + overflowY:auto so it scrolls and fills remaining space
  contentWrap: { flex:1, minHeight:0, overflowY:'auto', paddingRight:90 },
  // FIX 4: minHeight:100% so short data still fills the area
  twoCol:      { display:'flex', minHeight:'100%' },
  col:         { flex:1, display:'flex', flexDirection:'column', minWidth:0 },
  divider:     { width:2, background:'#b8c4cc', flexShrink:0 },
  table:       { width:'100%', borderCollapse:'collapse', tableLayout:'fixed' },
  totalRow:    { background:LIGHT, borderTop:`2px double #555`, position:'sticky', bottom:0 },
  rightPanel:  { position:'absolute', top:26, right:0, bottom:24, width:88, background:DARK, display:'flex', flexDirection:'column', borderLeft:'1px solid #0d1a2a' },
  sideBtn:     { border:'none', borderBottom:'1px solid rgba(255,255,255,0.07)', color:'#cdd5e0', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'flex-start', padding:'6px 8px', textAlign:'left', fontFamily:FONT_, flex:1, transition:'background 0.1s' },
  sBtnKey:     { fontSize:9, color:'rgba(255,255,255,0.4)', fontWeight:700, lineHeight:1.3 },
  sBtnLabel:   { fontSize:10, color:'#d0dae6', fontWeight:600, lineHeight:1.3, whiteSpace:'pre-line' },
  statusBar:   { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'3px 100px 3px 8px', background:DARK, borderTop:'1px solid #0d1a2a', flexShrink:0, height:24 },
};
