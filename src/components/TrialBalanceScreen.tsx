import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// --- Types ---
interface Ledger {
  id: string;
  name: string;
  group: string;
  group_name?: string;
  openingBalance?: number;
  balanceType?: string;
}

// --- Constants ---
const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
const HDR_BG = '#1f4e79';
const YELLOW = '#ffd966';
const BORDER = '#b8c4cc';
const LIGHT = '#f0f4f8';
const ROW_BDR = '#e0e6ee';
const MONTHS = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];

const fmtAmt = (n: number) => n === 0 ? "" : Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const ms = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()}-${ms[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
  } catch { return iso; }
};

// Helper: returns true if a voucher is voided (handles boolean true, integer 1, string "1")
const isVoided = (v: any): boolean => v.voided === true || v.voided === 1 || v.voided === '1';

// ─── LEVEL 3: VOUCHER REGISTER ──────────────────────────────────────────────
function VoucherRegister({ ledger, monthIdx, branchId, onBack }: any) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [selIdx, setSelIdx] = useState(0);

  useEffect(() => {
    const fiscalMonth = (monthIdx + 3) % 12;
    // /api/vouchers/ledger/:id is already filtered server-side (excludeVoided in server.ts)
    fetch(`/api/vouchers/ledger/${ledger.id}?branchId=${branchId || ''}`)
      .then(r => r.json())
      .then(data => setVouchers(
        data
          .filter((v: any) => !isVoided(v))                                   // belt-and-suspenders client filter
          .filter((v: any) => new Date(v.date).getMonth() === fiscalMonth)
      ))
      .catch(() => setVouchers([]));
  }, [ledger.id, monthIdx, branchId]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(s => Math.min(vouchers.length - 1, s + 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(s => Math.max(0, s - 1)); }
      if (e.key === 'Escape')    { e.preventDefault(); e.stopPropagation(); onBack(); }
    };
    window.addEventListener('keydown', handleKeys, true);
    return () => window.removeEventListener('keydown', handleKeys, true);
  }, [vouchers.length, onBack]);

  return (
    <div style={ds.root}>
      <div style={ds.titleBar}><button onClick={onBack} style={ds.backBtn}>Esc: Back</button><span>{ledger.name} ({MONTHS[monthIdx]})</span></div>
      <div style={ds.tableWrap}>
        <table style={ds.table}>
          <thead><tr style={ds.thead}><th style={ds.th}>Date</th><th style={ds.th}>Particulars</th><th style={{...ds.th, textAlign:'right'}}>Debit</th><th style={{...ds.th, textAlign:'right'}}>Credit</th></tr></thead>
          <tbody>
            {vouchers.map((v, i) => (
              <tr key={i} style={{ ...ds.tr, background: selIdx === i ? YELLOW : 'transparent' }}>
                <td style={ds.td}>{fmtDate(v.date)}</td>
                <td style={ds.td}>{v.narration || v.type}</td>
                <td style={{ ...ds.td, textAlign: 'right', color: '#7a0000' }}>{v.entry_type === 'Dr' ? fmtAmt(v.entry_amount) : ''}</td>
                <td style={{ ...ds.td, textAlign: 'right', color: '#006b00' }}>{v.entry_type === 'Cr' ? fmtAmt(v.entry_amount) : ''}</td>
              </tr>
            ))}
            {vouchers.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#888', fontStyle: 'italic' }}>No transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── LEVEL 2: MONTHLY SUMMARY ───────────────────────────────────────────────
function LedgerMonthlySummary({ ledger, branchId, onBack, onDrill }: any) {
  const [data, setData] = useState<any[]>([]);
  const [selIdx, setSelIdx] = useState(0);

  useEffect(() => {
    fetch(`/api/vouchers/ledger/${ledger.id}?branchId=${branchId || ''}`)
      .then(r => r.json())
      .then(vouchers => {
        // Filter out voided vouchers before summarising
        const active = vouchers.filter((v: any) => !isVoided(v));
        const summary = MONTHS.map((m, i) => {
          const fiscalMonth = (i + 3) % 12;
          const vchs = active.filter((v: any) => new Date(v.date).getMonth() === fiscalMonth);
          const dr = vchs.filter((v: any) => v.entry_type === 'Dr').reduce((a: number, b: any) => a + Number(b.entry_amount), 0);
          const cr = vchs.filter((v: any) => v.entry_type === 'Cr').reduce((a: number, b: any) => a + Number(b.entry_amount), 0);
          return { month: m, dr, cr, monthIdx: i };
        });
        setData(summary);
      });
  }, [ledger.id, branchId]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(s => Math.min(11, s + 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(s => Math.max(0, s - 1)); }
      if (e.key === 'Enter')     { e.preventDefault(); onDrill(data[selIdx]?.monthIdx); }
      if (e.key === 'Escape')    { e.preventDefault(); e.stopPropagation(); onBack(); }
    };
    window.addEventListener('keydown', handleKeys, true);
    return () => window.removeEventListener('keydown', handleKeys, true);
  }, [selIdx, data, onBack, onDrill]);

  let running = (ledger.balanceType === 'Cr' ? -1 : 1) * Number(ledger.openingBalance || 0);

  return (
    <div style={ds.root}>
      <div style={ds.titleBar}><button onClick={onBack} style={ds.backBtn}>Esc: Back</button><span>Monthly Summary: {ledger.name}</span></div>
      <div style={ds.tableWrap}>
        <table style={ds.table}>
          <thead><tr style={ds.thead}><th style={ds.th}>Month</th><th style={{...ds.th, textAlign:'right'}}>Debit</th><th style={{...ds.th, textAlign:'right'}}>Credit</th><th style={{...ds.th, textAlign:'right'}}>Closing</th></tr></thead>
          <tbody>
            {data.map((row, i) => {
              running += (row.dr - row.cr);
              return (
                <tr key={i} style={{ ...ds.tr, background: selIdx === i ? YELLOW : 'transparent' }} onClick={() => onDrill(row.monthIdx)}>
                  <td style={ds.td}>{row.month}</td>
                  <td style={{...ds.td, textAlign:'right'}}>{fmtAmt(row.dr)}</td>
                  <td style={{...ds.td, textAlign:'right'}}>{fmtAmt(row.cr)}</td>
                  <td style={{...ds.td, textAlign:'right', fontWeight: 600}}>{fmtAmt(running)} {running >= 0 ? 'Dr' : 'Cr'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── LEVEL 1: TRIAL BALANCE ─────────────────────────────────────────────────
export default function TrialBalanceScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers]               = useState<Ledger[]>([]);
  const [vouchers, setVouchers]             = useState<any[]>([]);
  const [viewLevel, setViewLevel]           = useState<'trial' | 'monthly' | 'vouchers'>('trial');
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey]       = useState<string | null>(null);

  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => r.json()),
      fetch(`/api/vouchers${q}`).then(r => r.json()),
    ]).then(([l, v]) => {
      setLedgers(l);
      // ── FIX: exclude voided vouchers so they never enter any calculation ──
      setVouchers((Array.isArray(v) ? v : []).filter((x: any) => !isVoided(x)));
      if (l.length > 0) setSelectedKey(`G:${l[0].group_name || 'Primary'}`);
    });
  }, [branchId]);

  // calcBalance now only sees active (non-voided) vouchers because we filtered at load time
  const calcBalance = useCallback((ledgerId: string) => {
    const l = ledgers.find(x => x.id === ledgerId);
    let bal = (l?.balanceType === 'Cr' ? -1 : 1) * Number(l?.openingBalance || 0);
    vouchers.forEach((v: any) => {
      const entries = v.entries || [v];
      entries.forEach((e: any) => {
        if (e.ledgerId === ledgerId) {
          bal += (e.type === 'Dr' || e.entry_type === 'Dr')
            ? Number(e.amount || e.entry_amount || 0)
            : -Number(e.amount || e.entry_amount || 0);
        }
      });
    });
    return bal;
  }, [ledgers, vouchers]);

  const groupsData = useMemo(() => {
    const g: Record<string, { dr: number; cr: number; ledgers: Ledger[] }> = {};
    ledgers.forEach(l => {
      const grp = l.group_name || 'Primary';
      if (!g[grp]) g[grp] = { dr: 0, cr: 0, ledgers: [] };
      g[grp].ledgers.push(l);
      const bal = calcBalance(l.id);
      if (bal >= 0) g[grp].dr += bal; else g[grp].cr += Math.abs(bal);
    });
    return g;
  }, [ledgers, calcBalance]);

  const sortedGroups = useMemo(() => Object.keys(groupsData).sort(), [groupsData]);
  const flatList = useMemo(() => {
    const list: any[] = [];
    sortedGroups.forEach(grp => {
      list.push({ key: `G:${grp}`, type: 'group', name: grp });
      if (expandedGroups.has(grp))
        groupsData[grp].ledgers.forEach(l => list.push({ key: `L:${l.id}`, type: 'ledger', ledger: l }));
    });
    return list;
  }, [sortedGroups, expandedGroups, groupsData]);

  // Keyboard Handler for Trial Balance
  useEffect(() => {
    if (viewLevel !== 'trial') return;
    const handleKeys = (e: KeyboardEvent) => {
      const idx = flatList.findIndex(x => x.key === selectedKey);
      if (e.key === 'ArrowDown') { e.preventDefault(); const n = flatList[Math.min(flatList.length - 1, idx + 1)]; if (n) setSelectedKey(n.key); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); const p = flatList[Math.max(0, idx - 1)];                  if (p) setSelectedKey(p.key); }
      if (e.key === 'Enter') {
        const curr = flatList[idx];
        if (curr?.type === 'group') {
          const n = new Set(expandedGroups);
          n.has(curr.name) ? n.delete(curr.name) : n.add(curr.name);
          setExpandedGroups(n);
        } else if (curr?.type === 'ledger') {
          setSelectedLedger(curr.ledger); setViewLevel('monthly');
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [selectedKey, flatList, expandedGroups, viewLevel]);

  if (viewLevel === 'vouchers' && selectedLedger) {
    return <VoucherRegister ledger={selectedLedger} monthIdx={selectedMonthIdx} branchId={branchId} onBack={() => setViewLevel('monthly')} />;
  }
  if (viewLevel === 'monthly' && selectedLedger) {
    return <LedgerMonthlySummary ledger={selectedLedger} branchId={branchId} onBack={() => setViewLevel('trial')} onDrill={(mIdx: number) => { setSelectedMonthIdx(mIdx); setViewLevel('vouchers'); }} />;
  }

  return (
    <div style={ds.root}>
      <div style={ds.titleBar}><span>Trial Balance</span></div>
      <div style={ds.tableWrap}>
        <table style={ds.table}>
          <thead><tr style={ds.thead}><th style={s.colParticulars}>Particulars</th><th style={s.colDebit}>Debit</th><th style={s.colCredit}>Credit</th></tr></thead>
          <tbody>
            {sortedGroups.map(grp => (
              <React.Fragment key={grp}>
                <tr style={{ ...s.groupRow, background: selectedKey === `G:${grp}` ? YELLOW : 'transparent' }} onClick={() => setSelectedKey(`G:${grp}`)}>
                  <td style={s.colParticulars}><b>{grp}</b></td>
                  <td style={s.colDebit}>{fmtAmt(groupsData[grp].dr)}</td>
                  <td style={s.colCredit}>{fmtAmt(groupsData[grp].cr)}</td>
                </tr>
                {expandedGroups.has(grp) && groupsData[grp].ledgers.map(l => {
                  const b = calcBalance(l.id);
                  return (
                    <tr key={l.id} style={{ ...s.ledgerRow, background: selectedKey === `L:${l.id}` ? YELLOW : 'transparent' }} onClick={() => setSelectedKey(`L:${l.id}`)}>
                      <td style={{ ...s.colParticulars, paddingLeft: 30 }}>{l.name}</td>
                      <td style={s.colDebit}>{b >= 0 ? fmtAmt(b) : ''}</td>
                      <td style={s.colCredit}>{b < 0 ? fmtAmt(b) : ''}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const ds: Record<string, React.CSSProperties> = {
  root:     { fontFamily: FONT, fontSize: 12, height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' },
  titleBar: { background: HDR_BG, color: '#fff', padding: '4px 10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' },
  backBtn:  { background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid #fff', cursor: 'pointer', fontSize: 10, marginRight: 10 },
  tableWrap:{ flex: 1, overflowY: 'auto' },
  table:    { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  thead:    { background: LIGHT, position: 'sticky', top: 0, zIndex: 10 },
  th:       { padding: '8px', borderBottom: `1px solid ${BORDER}`, textAlign: 'left', fontSize: 11, borderRight: `1px solid ${ROW_BDR}` },
  td:       { padding: '4px 8px', borderBottom: `1px solid ${ROW_BDR}`, fontSize: 12, borderRight: `1px solid ${ROW_BDR}`, whiteSpace: 'nowrap' },
  tr:       { cursor: 'pointer' },
};
const s: Record<string, React.CSSProperties> = {
  ...ds,
  colParticulars: { width: '50%', padding: '6px 10px', borderRight: `1px solid ${ROW_BDR}` },
  colDebit:       { width: '25%', textAlign: 'right', padding: '6px 10px', borderRight: `1px solid ${ROW_BDR}` },
  colCredit:      { width: '25%', textAlign: 'right', padding: '6px 10px' },
  groupRow:       { cursor: 'pointer' },
  ledgerRow:      { cursor: 'pointer' },
};
