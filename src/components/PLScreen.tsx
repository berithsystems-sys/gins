/**
 * TallyPrime-style Profit & Loss A/c — v4
 * Fixes:
 * 1. ESC key logic: First ESC collapses expanded groups, second ESC triggers onBack.
 * 2. Focus Management: Auto-focuses on mount so keyboard works immediately.
 * 3. Voided transactions filtered out.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// ── Helpers ──────────────────────────────────────────────────────────────────
interface Ledger {
  id: string; name: string; group?: string; group_name?: string;
  openingBalance?: number; balanceType?: 'Dr' | 'Cr';
}

const fmtAmtAbs = (n: number) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()}-${M[d.getMonth()]}-${d.getFullYear()}`;
  } catch { return iso; }
};

const isVoided = (v: any): boolean => v.voided === true || v.voided === 1 || v.voided === '1';

// ─── LedgerDetail (drill-down) ────────────────────────────────────────────────
function LedgerDetail({ ledger, branchId, onBack }: { ledger: Ledger; branchId?: string; onBack: () => void }) {
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      .then(d => {
        const active = (Array.isArray(d) ? d : []).filter(v => !isVoided(v));
        setRows(active);
      })
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
        <button onClick={onBack} style={{ background:'none', border:'1px solid rgba(255,255,255,0.4)', color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:FONT, padding:'1px 10px', borderRadius:2 }}>← Back (Esc)</button>
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

// ... (PeriodModal and AddPeriodModal remain the same as your previous logic)
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
        <div style={{ background:HDR, color:'#fff', padding:'5px 12px', fontSize:12, fontWeight:700 }}>Change Period</div>
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:12, width:90 }}>From Date :</label>
            <input autoFocus type="date" value={f} onChange={e=>setF(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') toRef.current?.focus()}} style={{ flex:1, borderBottom:`2px solid ${HDR}`, border:'none', outline:'none', background:'#fffde0' }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:12, width:90 }}>To Date :</label>
            <input ref={toRef} type="date" value={t} onChange={e=>setT(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') onAccept(f,t)}} style={{ flex:1, borderBottom:`2px solid ${HDR}`, border:'none', outline:'none', background:'#fffde0' }} />
          </div>
        </div>
        <div style={{ padding:'8px 16px 12px', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={()=>onAccept(f,t)} style={{ background:HDR, color:'#fff', border:'none', padding:'5px 18px', cursor:'pointer' }}>Accept</button>
        </div>
      </div>
    </div>
  );
}

function AddPeriodModal({ onAdd, onCancel }: { onAdd:(label:string,from:string,to:string)=>void; onCancel:()=>void }) {
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
      <div style={{ background:'#fff', padding:20, width:340 }}>
        <h4 style={{ margin:'0 0 15px 0' }}>Add Comparison Period</h4>
        <input placeholder="Label (optional)" value={label} onChange={e=>setLabel(e.target.value)} style={{ width:'100%', marginBottom:10 }} />
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{ width:'100%', marginBottom:10 }} />
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{ width:'100%', marginBottom:10 }} />
        <button onClick={()=>onAdd(label, from, to)} style={{ marginRight:10 }}>Add</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Main PLScreen Component ───────────────────────────────────────────────────
interface Period { label: string; from: string; to: string; }
interface PLScreenProps { branchId?: string; onBack?: () => void; }

const FONT_   = `-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,sans-serif`;
const HDR_BG  = '#1f4e79';
const BORDER  = '#b8c4cc';
const LIGHT   = '#f0f4f8';
const ROW_BDR = '#e0e6ee';
const DARK    = '#1a2a3a';

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
  const [focusedRowIdx, setFocusedRowIdx] = useState<number>(-1);
  
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-focus the screen so keyboard navigation works immediately
  useEffect(() => {
    if (!drillLedger && !showPeriod && !showAddPeriod) {
      rootRef.current?.focus();
    }
  }, [drillLedger, showPeriod, showAddPeriod]);

  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    setLoading(true);
    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => r.json()),
      fetch(`/api/vouchers${q}`).then(r => r.json()),
      fetch('/api/branches').then(r => r.json()).catch(() => []),
    ]).then(([l, v, b]) => {
      setLedgers(Array.isArray(l) ? l : []);
      const vArr = (Array.isArray(v) ? v : []).filter((x: any) => !isVoided(x));
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
  }, [branchId]);

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

  const allPeriods: Period[] = useMemo(() => [
    { label: companyName || 'Current Period', from: mainPeriod.from, to: mainPeriod.to },
    ...extraPeriods,
  ], [mainPeriod, extraPeriods, companyName]);

  const LEFT_GROUPS  = ['Opening Stock', 'Purchase Account', 'Direct Expenses', 'Indirect Expenses'];
  const RIGHT_GROUPS = ['Sales Account', 'Direct Income', 'Indirect Income', 'Closing Stock'];
  const ALL_GROUPS   = [...LEFT_GROUPS, ...RIGHT_GROUPS];

  const periodTotals = useMemo(() => allPeriods.map(p => {
    const leftT  = LEFT_GROUPS.reduce((a,g) => a + Math.abs(groupTotalForPeriod(g, p.from, p.to)), 0);
    const rightT = RIGHT_GROUPS.reduce((a,g) => a + Math.abs(groupTotalForPeriod(g, p.from, p.to)), 0);
    return { leftT, rightT, nett: rightT - leftT, grand: Math.max(leftT, rightT) };
  }), [allPeriods, groupTotalForPeriod]);

  const salesTotal0 = Math.abs(groupTotalForPeriod('Sales Account', mainPeriod.from, mainPeriod.to));

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

  // Handle Global Keys
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
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
          else if (row.type === 'ledger') setDrillLedger(row.ledger);
          handled = true;
        }
      } else if (e.key === 'ArrowLeft') {
        if (focusedRowIdx >= 0 && focusedRowIdx < navigableRows.length) {
          const row = navigableRows[focusedRowIdx];
          const grpName = row.type === 'group' ? row.name : row.groupName;
          setExpanded(prev => { const n = new Set(prev); n.delete(grpName); return n; });
          handled = true;
        }
      } else if (e.key === 'Escape') {
        // --- FIX: ESC Logic ---
        if (expanded.size > 0) {
          setExpanded(new Set()); // Step 1: Collapse all
        } else if (onBack) {
          onBack(); // Step 2: Go back to main screen
        }
        handled = true;
      } else if (e.key === 'F2') {
        setShowPeriod(true); handled = true;
      } else if (e.key === 'F5') {
        setExpanded(new Set(ALL_GROUPS)); handled = true;
      }

      if (handled) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [drillLedger, showPeriod, showAddPeriod, focusedRowIdx, navigableRows, expanded, onBack]);

  const toggleGroup = (name: string) => setExpanded(prev => {
    const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n;
  });

  const periodLabel = (p: {from:string;to:string}) =>
    p.from && p.to ? `${fmtDate(p.from)} to ${fmtDate(p.to)}` : '—';

  if (drillLedger) return <LedgerDetail ledger={drillLedger} branchId={branchId} onBack={() => setDrillLedger(null)} />;

  const ColHdrCells = () => (
    <>
      <th style={{ ...rs.th, textAlign:'left', width: showPercent ? '40%' : '50%' }}>Particulars</th>
      {showPercent && <th style={{ ...rs.th, width:'8%', textAlign:'right', fontSize:10 }}>%</th>}
      {allPeriods.map((p,i) => (
        <th key={i} style={{ ...rs.th, textAlign:'right', width: `${(showPercent?52:50)/allPeriods.length}%`, borderLeft: i===0?'none':'1px solid #ccd5dd' }}>
          <div style={{ fontSize:11, fontWeight:800 }}>{p.label}</div>
          <div style={{ fontSize:9, fontWeight:400, color:'#777' }}>{periodLabel(p)}</div>
        </th>
      ))}
    </>
  );

  let rowIdxCounter = -1;

  const renderGroupRow = (grpName: string) => {
    const anyNonZero = allPeriods.some(p => groupTotalForPeriod(grpName, p.from, p.to) !== 0);
    if (!anyNonZero) return null;
    const isExp = expanded.has(grpName);
    rowIdxCounter++;
    const grpIdx = rowIdxCounter;
    const isFocused = focusedRowIdx === grpIdx;

    return (
      <React.Fragment key={grpName}>
        <tr
          data-rowidx={grpIdx}
          style={{ ...rs.groupRow, cursor:'pointer', background: isFocused ? '#ddeeff' : '#fff' }}
          onClick={() => { setFocusedRowIdx(grpIdx); toggleGroup(grpName); }}
        >
          <td style={rs.tdName}>
            <span style={rs.toggle}>{isExp ? '−' : '+'}</span>
            <span style={rs.groupName}>{grpName}</span>
          </td>
          {showPercent && <td style={rs.tdPct}>—</td>}
          {allPeriods.map((p,i) => (
            <td key={i} style={{ ...rs.tdAmt, borderLeft: i===0?'none':'1px solid #dde4ec' }}>
              {fmtAmtAbs(groupTotalForPeriod(grpName, p.from, p.to))}
            </td>
          ))}
        </tr>
        {isExp && groupLedgersNonZero(grpName, mainPeriod.from, mainPeriod.to).map(l => {
          rowIdxCounter++;
          const ledgerIdx = rowIdxCounter;
          return (
            <tr key={l.id} data-rowidx={ledgerIdx} style={{ ...rs.ledgerRow, background: focusedRowIdx === ledgerIdx ? '#ddeeff' : '#fafbff' }} onClick={() => setFocusedRowIdx(ledgerIdx)}>
              <td style={{ ...rs.tdName, paddingLeft:28 }}>
                <span onClick={(e) => { e.stopPropagation(); setDrillLedger(l); }} style={{ color:'#1a5fa8', cursor:'pointer', textDecoration:'underline' }}>{l.name}</span>
              </td>
              {showPercent && <td style={rs.tdPct} />}
              {allPeriods.map((p,i) => (
                <td key={i} style={{ ...rs.tdAmt, fontWeight:400, color:'#555', borderLeft: i===0?'none':'1px solid #dde4ec' }}>
                  {fmtAmtAbs(calcBalanceForPeriod(l.id, p.from, p.to))}
                </td>
              ))}
            </tr>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <div ref={rootRef} style={s.root} tabIndex={-1}>
      {showPeriod && <PeriodModal from={mainPeriod.from} to={mainPeriod.to} onAccept={(f,t)=>{setMainPeriod({from:f,to:t}); setShowPeriod(false)}} onCancel={()=>setShowPeriod(false)} />}
      
      <div style={s.titleBar}>
        {onBack && <button onClick={onBack} style={s.backBtn}>← Back (Esc)</button>}
        <span style={{ flex:1, fontWeight:700 }}>Profit & Loss A/c</span>
        <span style={{ flex:2, textAlign:'center' }}>{companyName}</span>
        <span style={{ flex:1, textAlign:'right', opacity:0.7 }}>{periodLabel(mainPeriod)}</span>
      </div>

      <div style={s.contentWrap} ref={contentRef}>
        {loading ? <div style={{ padding:40, textAlign:'center' }}>Loading...</div> : (
          <div style={s.twoCol}>
            <div style={s.col}>
              <table style={s.table}>
                <thead><tr style={{ background:LIGHT }}><ColHdrCells /></tr></thead>
                <tbody>{LEFT_GROUPS.map(g => renderGroupRow(g))}</tbody>
                <tfoot>
                  <tr style={s.totalRow}>
                    <td style={rs.tdName}>Total</td>
                    {showPercent && <td style={rs.tdPct} />}
                    {periodTotals.map((pt, i) => <td key={i} style={rs.tdAmt}>{fmtAmtAbs(pt.grand)}</td>)}
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style={s.divider} />
            <div style={s.col}>
              <table style={s.table}>
                <thead><tr style={{ background:LIGHT }}><ColHdrCells /></tr></thead>
                <tbody>{RIGHT_GROUPS.map(g => renderGroupRow(g))}</tbody>
                <tfoot>
                  <tr style={s.totalRow}>
                    <td style={rs.tdName}>Total</td>
                    {showPercent && <td style={rs.tdPct} />}
                    {periodTotals.map((pt, i) => <td key={i} style={rs.tdAmt}>{fmtAmtAbs(pt.grand)}</td>)}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      <div style={s.rightPanel}>
        <button onClick={()=>setShowPeriod(true)} style={s.sideBtn}><span style={s.sBtnKey}>F2</span><span style={s.sBtnLabel}>Period</span></button>
        <button onClick={()=>setExpanded(new Set(ALL_GROUPS))} style={s.sideBtn}><span style={s.sBtnKey}>F5</span><span style={s.sBtnLabel}>Expand All</span></button>
        <button onClick={()=>{ if(expanded.size>0) setExpanded(new Set()); else onBack?.(); }} style={s.sideBtn}><span style={s.sBtnKey}>Esc</span><span style={s.sBtnLabel}>Back</span></button>
      </div>

      <div style={s.statusBar}>
        <span style={{ fontSize:10, color:'#aaa' }}>F2: Period | F5: Expand All | Esc: Back | ↑↓: Navigate</span>
      </div>
    </div>
  );
}

// ── Styles (Same as before) ───────────────────────────────────────────────────
const rs: Record<string, React.CSSProperties> = {
  th:         { padding:'5px 10px', fontSize:11, fontWeight:700, borderBottom:`1px solid ${BORDER}`, background:LIGHT },
  groupRow:   { borderBottom:`1px solid ${ROW_BDR}` },
  ledgerRow:  { borderBottom:`1px solid ${ROW_BDR}` },
  tdName:     { padding:'3px 8px', fontSize:12 },
  tdAmt:      { padding:'3px 10px', fontSize:12, fontWeight:700, textAlign:'right' },
  tdPct:      { padding:'3px 6px', fontSize:11, textAlign:'right', color:'#888' },
  toggle:     { display:'inline-block', width:14, textAlign:'center', fontSize:10, border:`1px solid ${BORDER}`, marginRight:6 },
  groupName:  { fontWeight:700, textTransform:'uppercase', fontSize:11 },
};

const s: Record<string, React.CSSProperties> = {
  root:        { fontFamily:FONT_, fontSize:12, background:'#fff', display:'flex', flexDirection:'column', height:'100vh', border:`1px solid #b8c4cc`, overflow:'hidden', position:'relative', outline:'none' },
  titleBar:    { background:HDR_BG, color:'#fff', display:'flex', alignItems:'center', padding:'3px 8px', flexShrink:0 },
  backBtn:     { background:'none', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', cursor:'pointer', fontSize:10, marginRight:10 },
  contentWrap: { flex:1, overflowY:'auto', paddingRight:90 },
  twoCol:      { display:'flex', minHeight:'100%' },
  col:         { flex:1, display:'flex', flexDirection:'column' },
  divider:     { width:2, background:'#b8c4cc' },
  table:       { width:'100%', borderCollapse:'collapse', tableLayout:'fixed' },
  totalRow:    { background:LIGHT, borderTop:`2px double #555`, position:'sticky', bottom:0 },
  rightPanel:  { position:'absolute', top:26, right:0, bottom:0, width:88, background:DARK, display:'flex', flexDirection:'column' },
  sideBtn:     { border:'none', borderBottom:'1px solid rgba(255,255,255,0.1)', color:'#cdd5e0', padding:'8px', textAlign:'left', background:'none', cursor:'pointer' },
  sBtnKey:     { fontSize:9, color:'rgba(255,255,255,0.4)', fontWeight:700 },
  sBtnLabel:   { fontSize:10, color:'#d0dae6' },
  statusBar:   { padding:'3px 8px', background:DARK, flexShrink:0, height:24 },
};
