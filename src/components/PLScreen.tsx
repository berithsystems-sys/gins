/**
 * TallyPrime-style Profit & Loss A/c — v5
 * FIX: Physical ESC ksey now guaranteed to trigger onBack 
 * (Dashboard navigation) when at the top level.
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

  // Separate ESC handler for the drill-down view
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onBack(); // Closes the drill-down
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
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

  return (
    <div style={{ fontFamily: 'inherit', fontSize: 12, display:'flex', flexDirection:'column', height:'100vh', background:'#fff' }}>
      <div style={{ background: '#1f4e79', color:'#fff', padding:'4px 10px', display:'flex', justifyContent:'space-between', fontWeight:700 }}>
        <span>{ledger.name}</span>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,0.2)', color:'#fff', border:'1px solid #fff', fontSize:10, cursor:'pointer' }}>Esc: Close</button>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead style={{ position: 'sticky', top:0, background: '#f0f4f8' }}>
            <tr>
              <th style={{ textAlign:'left', padding: '8px' }}>Date</th>
              <th style={{ textAlign:'left', padding: '8px' }}>Particulars</th>
              <th style={{ textAlign:'right', padding: '8px' }}>Debit</th>
              <th style={{ textAlign:'right', padding: '8px' }}>Credit</th>
              <th style={{ textAlign:'right', padding: '8px' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {withRun.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '4px 8px' }}>{fmtDate(r.date)}</td>
                <td style={{ padding: '4px 8px' }}>{r.narration || r.type}</td>
                <td style={{ padding: '4px 8px', textAlign:'right' }}>{r.entry_type === 'Dr' ? fmtAmtAbs(r.entry_amount) : ''}</td>
                <td style={{ padding: '4px 8px', textAlign:'right' }}>{r.entry_type === 'Cr' ? fmtAmtAbs(r.entry_amount) : ''}</td>
                <td style={{ padding: '4px 8px', textAlign:'right', fontWeight:600 }}>{fmtAmtAbs(r.running)} {r.running >= 0 ? 'Dr' : 'Cr'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main PLScreen Component ───────────────────────────────────────────────────
export default function PLScreen({ branchId, onBack }: PLScreenProps) {
  const [ledgers, setLedgers]         = useState<any[]>([]);
  const [allVouchers, setAllVouchers] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [mainPeriod, setMainPeriod]   = useState({ from: '', to: '' });
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [drillLedger, setDrillLedger] = useState<Ledger | null>(null);
  const [loading, setLoading]         = useState(true);
  const [focusedRowIdx, setFocusedRowIdx] = useState<number>(0);
  
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch Logic
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    setLoading(true);
    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => r.json()),
      fetch(`/api/vouchers${q}`).then(r => r.json()),
    ]).then(([l, v]) => {
      setLedgers(Array.isArray(l) ? l : []);
      setAllVouchers((Array.isArray(v) ? v : []).filter((x: any) => !isVoided(x)));
    }).finally(() => setLoading(false));
  }, [branchId]);

  // CALCULATION LOGIC (Simplified for speed)
  const calcBalance = useCallback((ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    let bal = (ledger?.balanceType === 'Cr' ? -1 : 1) * Number(ledger?.openingBalance || 0);
    allVouchers.forEach(v => {
      (v.entries || []).forEach((e: any) => {
        if (e.ledgerId === ledgerId) bal += (e.type === 'Dr' ? 1 : -1) * Number(e.amount);
      });
    });
    return bal;
  }, [ledgers, allVouchers]);

  const LEFT_GROUPS = ['Opening Stock', 'Purchase Account', 'Direct Expenses', 'Indirect Expenses'];
  const RIGHT_GROUPS = ['Sales Account', 'Direct Income', 'Indirect Income', 'Closing Stock'];

  // Map navigable rows for Arrow Keys
  const navigableRows = useMemo(() => {
    const rows: any[] = [];
    [...LEFT_GROUPS, ...RIGHT_GROUPS].forEach(grp => {
      rows.push({ type: 'group', name: grp });
      if (expanded.has(grp)) {
        ledgers.filter(l => l.group === grp || l.group_name === grp).forEach(l => {
          rows.push({ type: 'ledger', ledger: l, groupName: grp });
        });
      }
    });
    return rows;
  }, [expanded, ledgers]);

  // ── KEYBOARD HANDLER (Crucial for Dashboard Navigation) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If we are looking at a single ledger, let LedgerDetail handle ESC
      if (drillLedger) return; 

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        if (expanded.size > 0) {
          // If groups are open, close them first (Tally style)
          setExpanded(new Set());
        } else {
          // If nothing is expanded, go to Dashboard
          if (onBack) onBack();
        }
      }

      if (e.key === 'ArrowDown') {
        setFocusedRowIdx(prev => Math.min(prev + 1, navigableRows.length - 1));
      }
      if (e.key === 'ArrowUp') {
        setFocusedRowIdx(prev => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter') {
        const current = navigableRows[focusedRowIdx];
        if (!current) return;
        if (current.type === 'group') {
          setExpanded(prev => {
            const next = new Set(prev);
            next.has(current.name) ? next.delete(current.name) : next.add(current.name);
            return next;
          });
        } else {
          setDrillLedger(current.ledger);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded, drillLedger, onBack, navigableRows, focusedRowIdx]);

  if (drillLedger) return <LedgerDetail ledger={drillLedger} branchId={branchId} onBack={() => setDrillLedger(null)} />;

  return (
    <div style={{ fontFamily: 'sans-serif', height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', overflow:'hidden' }}>
      <div style={{ background: '#1f4e79', color: '#fff', padding: '4px 10px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Profit & Loss A/c</span>
        <span>Esc: Back to Dashboard</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex' }} ref={contentRef}>
        {/* Expenditure Side */}
        <div style={{ flex: 1, borderRight: '1px solid #ccc' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f0f4f8' }}>
              <tr><th style={{ textAlign: 'left', padding: '8px' }}>Expenditure</th><th style={{ textAlign: 'right', padding: '8px' }}>Amount</th></tr>
            </thead>
            <tbody>
              {LEFT_GROUPS.map(grp => {
                const isFocused = navigableRows[focusedRowIdx]?.name === grp;
                return (
                  <tr key={grp} style={{ background: isFocused ? '#ffd966' : 'transparent', cursor:'pointer' }}>
                    <td style={{ padding: '4px 8px' }}>{expanded.has(grp) ? '[-] ' : '[+] '} <b>{grp}</b></td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>0.00</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Income Side */}
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f0f4f8' }}>
              <tr><th style={{ textAlign: 'left', padding: '8px' }}>Income</th><th style={{ textAlign: 'right', padding: '8px' }}>Amount</th></tr>
            </thead>
            <tbody>
              {RIGHT_GROUPS.map(grp => {
                const isFocused = navigableRows[focusedRowIdx]?.name === grp;
                return (
                  <tr key={grp} style={{ background: isFocused ? '#ffd966' : 'transparent', cursor:'pointer' }}>
                    <td style={{ padding: '4px 8px' }}>{expanded.has(grp) ? '[-] ' : '[+] '} <b>{grp}</b></td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>0.00</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tally-style side panel */}
      <div style={{ position:'absolute', right:0, top:24, bottom:0, width:100, background:'#1a2a3a', color:'#fff', display:'flex', flexDirection:'column', padding: '10px 0' }}>
         <button onClick={onBack} style={{ background:'none', color:'#fff', border:'none', fontSize:10, textAlign:'left', padding:'10px' }}>Esc: Quit</button>
      </div>
    </div>
  );
}
