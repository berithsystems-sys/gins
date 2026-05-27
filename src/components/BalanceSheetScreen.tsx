import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────
interface Ledger {
  id: string; name: string; group?: string; group_name?: string;
  openingBalance?: number; balanceType?: 'Dr' | 'Cr';
}

const isVoided = (v: any): boolean => v.voided === true || v.voided === 1 || v.voided === '1';
const fmtAmtAbs = (n: number) => n === 0 ? "0.00" : Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()}-${M[d.getMonth()]}-${d.getFullYear()}`;
  } catch { return iso; }
};

// ─── LedgerDetail (drill-down) ────────────────────────────────────────────────
function LedgerDetail({ ledger, branchId, onBack }: { ledger: Ledger; branchId?: string; onBack: () => void }) {
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onBack]);

  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/vouchers/ledger/${ledger.id}${q}`)
      .then(r => r.json())
      .then(d => {
          // server.ts uses entry_amount and entry_type for this route
          setRows((Array.isArray(d) ? d : []).filter(v => !isVoided(v)));
      })
      .catch(() => setRows([])).finally(() => setLoading(false));
  }, [ledger.id, branchId]);

  return (
    <div style={{ fontFamily: 'sans-serif', fontSize: 12, height: '100vh', display:'flex', flexDirection:'column', background:'#fff' }}>
      <div style={{ background: '#1f4e79', color:'#fff', padding: '5px 10px', display:'flex', justifyContent:'space-between' }}>
        <span>{ledger.name}</span>
        <button onClick={onBack} style={{ color:'#fff', background:'none', border:'1px solid #fff', cursor:'pointer' }}>Esc: Close</button>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        <table style={{ width: '100%', borderCollapse:'collapse' }}>
            <thead>
                <tr style={{ background:'#f0f4f8' }}>
                    <th style={{ textAlign:'left', padding:8 }}>Date</th>
                    <th style={{ textAlign:'left', padding:8 }}>Particulars</th>
                    <th style={{ textAlign:'right', padding:8 }}>Debit</th>
                    <th style={{ textAlign:'right', padding:8 }}>Credit</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #eee' }}>
                        <td style={{ padding:8 }}>{fmtDate(r.date)}</td>
                        <td style={{ padding:8 }}>{r.narration || r.type}</td>
                        <td style={{ padding:8, textAlign:'right', color: '#7a0000' }}>{r.entry_type === 'Dr' ? fmtAmtAbs(r.entry_amount) : ''}</td>
                        <td style={{ padding:8, textAlign:'right', color: '#006b00' }}>{r.entry_type === 'Cr' ? fmtAmtAbs(r.entry_amount) : ''}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Balance Sheet ───────────────────────────────────────────────────────
export default function BalanceSheetScreen({ branchId, onBack }: { branchId?: string, onBack?: () => void }) {
  const [ledgers, setLedgers]         = useState<any[]>([]);
  const [allVouchers, setAllVouchers] = useState<any[]>([]);
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [drillLedger, setDrillLedger] = useState<Ledger | null>(null);
  const [loading, setLoading]         = useState(true);

  // Groups as defined in your server.ts defaultGroups
  const LIABILITY_GROUPS = ['Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Suspense Account', 'Reserves & Surplus'];
  const ASSET_GROUPS     = ['Fixed Assets', 'Investments', 'Current Assets', 'Misc. Expenses (Asset)'];

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

  // Robust balance calculation matching server.ts logic
  const calcBalance = useCallback((ledgerId: string) => {
    const l = ledgers.find(x => x.id === ledgerId);
    if (!l) return 0;
    let bal = (l.balanceType === 'Cr' ? -1 : 1) * Number(l.openingBalance || 0);
    
    allVouchers.forEach(v => {
      const entries = v.entries || [];
      entries.forEach((e: any) => {
        if (e.ledgerId === ledgerId) {
          const amt = Number(e.amount || 0);
          bal += (e.type === 'Dr') ? amt : -amt;
        }
      });
    });
    return bal;
  }, [ledgers, allVouchers]);

  // Keyboard navigation
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drillLedger) setDrillLedger(null);
        else if (expanded.size > 0) setExpanded(new Set());
        else if (onBack) onBack();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [drillLedger, expanded, onBack]);

  if (drillLedger) return <LedgerDetail ledger={drillLedger} branchId={branchId} onBack={() => setDrillLedger(null)} />;

  // Calculate Net Profit/Loss from P&L groups to make BS balance
  const nettProfit = allVouchers.reduce((acc, v) => {
      v.entries?.forEach((e: any) => {
          const l = ledgers.find(lx => lx.id === e.ledgerId);
          if (['Sales Account', 'Direct Income', 'Indirect Income'].includes(l?.group_name)) acc -= Number(e.amount) * (e.type === 'Cr' ? 1 : -1);
          if (['Purchase Account', 'Direct Expenses', 'Indirect Expenses'].includes(l?.group_name)) acc += Number(e.amount) * (e.type === 'Dr' ? 1 : -1);
      });
      return acc;
  }, 0) * -1;

  const renderGroupRow = (grp: string) => {
    const grpLedgers = ledgers.filter(l => l.group_name === grp || l.group === grp);
    const total = grpLedgers.reduce((sum, l) => sum + calcBalance(l.id), 0);
    
    // Hide zero groups unless expanded
    if (Math.abs(total) < 0.01 && !expanded.has(grp)) return null;

    return (
      <React.Fragment key={grp}>
        <tr onClick={() => setExpanded(prev => {
            const next = new Set(prev);
            next.has(grp) ? next.delete(grp) : next.add(grp);
            return next;
        })} style={{ cursor: 'pointer', borderBottom: '1px solid #eee', background: expanded.has(grp) ? '#fffde7' : 'transparent' }}>
          <td style={{ padding: '6px 8px' }}>{expanded.has(grp) ? '▼' : '▶'} <b>{grp}</b></td>
          <td style={{ textAlign: 'right', padding: '6px 8px' }}>{fmtAmtAbs(total)}</td>
        </tr>
        {expanded.has(grp) && grpLedgers.map(l => (
          <tr key={l.id} onClick={(e) => { e.stopPropagation(); setDrillLedger(l); }} style={{ background: '#fafafa' }}>
            <td style={{ padding: '4px 25px', color: '#1a5fa8', cursor: 'pointer', textDecoration: 'underline' }}>{l.name}</td>
            <td style={{ textAlign: 'right', padding: '4px 8px', color: '#555' }}>{fmtAmtAbs(calcBalance(l.id))}</td>
          </tr>
        ))}
      </React.Fragment>
    );
  };

  return (
    <div style={{ fontFamily: 'sans-serif', fontSize: 12, height: '100vh', display: 'flex', flexDirection:'column', background: '#fff' }}>
      <div style={{ background: '#1f4e79', color: '#fff', padding: '6px 10px', display:'flex', justifyContent:'space-between', fontWeight: 'bold' }}>
        <span>Balance Sheet</span>
        <button onClick={onBack} style={{ color:'#fff', background:'rgba(255,255,255,0.2)', border:'1px solid #fff', cursor: 'pointer', fontSize: 10 }}>Esc: Back</button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflowY: 'auto', border: '1px solid #ccc', margin: '10px' }}>
        {/* Liabilities Column */}
        <div style={{ flex: 1, borderRight: '1px solid #ccc' }}>
            <div style={{ background: '#f0f4f8', padding: 8, fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #ccc' }}>LIABILITIES</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                    {LIABILITY_GROUPS.map(grp => renderGroupRow(grp))}
                    {/* Profit & Loss Account Row */}
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '6px 8px' }}><b>Profit & Loss A/c</b></td>
                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>{fmtAmtAbs(nettProfit)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Assets Column */}
        <div style={{ flex: 1 }}>
            <div style={{ background: '#f0f4f8', padding: 8, fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #ccc' }}>ASSETS</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                    {ASSET_GROUPS.map(grp => renderGroupRow(grp))}
                </tbody>
            </table>
        </div>
      </div>

      {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.8)', padding: 20, border: '1px solid #ccc' }}>Loading Data...</div>}
      
      {!loading && ledgers.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
              No Ledgers found. Please create ledgers in the Masters section first.
          </div>
      )}

      <div style={{ padding: '4px 10px', background: '#1a2a3a', color: '#aaa', fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
        <span>F1: Detailed | F2: Period | Esc: Quit</span>
        <span>{branchId ? `Branch ID: ${branchId}` : 'HQ View'}</span>
      </div>
    </div>
  );
}
