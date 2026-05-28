import React, { useState, useEffect, useMemo, useCallback } from 'react';

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

const isVoided = (v: any): boolean => v.voided === true || v.voided === 1 || v.voided === '1';

// ─── LEVEL 4: VOUCHER DETAIL ────────────────────────────────────────────────
function VoucherDetail({ voucherId, onBack }: any) {
  const [voucher, setVoucher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vouchers`) // The current API returns all vouchers with entries
      .then(r => r.json())
      .then(data => {
        const found = data.find((v: any) => v.id === voucherId);
        setVoucher(found);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [voucherId]);

  if (loading) return <div style={{...ds.root, padding: 20}}>Loading Voucher...</div>;
  if (!voucher) return <div style={{...ds.root, padding: 20}}>Voucher not found. <button onClick={onBack}>Back</button></div>;

  const drTotal = voucher.entries?.filter((e: any) => e.type === 'Dr').reduce((a: number, b: any) => a + Number(b.amount), 0) || 0;
  const crTotal = voucher.entries?.filter((e: any) => e.type === 'Cr').reduce((a: number, b: any) => a + Number(b.amount), 0) || 0;

  return (
    <div style={ds.root}>
      <div style={ds.titleBar}><button onClick={onBack} style={ds.backBtn}>Esc: Back</button><span>Voucher Detail: {voucher.number}</span></div>
      <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #ccc', paddingBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 'bold' }}>Type: {voucher.type}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Date: {fmtDate(voucher.date)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 'bold' }}>No: {voucher.number}</div>
          </div>
        </div>

        <table style={{ ...ds.table, border: '1px solid #ccc' }}>
          <thead>
            <tr style={ds.thead}>
              <th style={{...ds.th, width: '60%'}}>Particulars</th>
              <th style={{...ds.th, width: '20%', textAlign: 'right'}}>Debit</th>
              <th style={{...ds.th, width: '20%', textAlign: 'right'}}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {voucher.entries?.map((e: any, i: number) => (
              <tr key={i} style={ds.tr}>
                <td style={ds.td}>{e.ledger_name || e.ledgerId}</td>
                <td style={{...ds.td, textAlign: 'right'}}>{e.type === 'Dr' ? fmtAmt(e.amount) : ''}</td>
                <td style={{...ds.td, textAlign: 'right'}}>{e.type === 'Cr' ? fmtAmt(e.amount) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot style={ds.tfoot}>
            <tr>
              <td style={ds.tdTotal}>Total</td>
              <td style={{...ds.tdTotal, textAlign: 'right'}}>{fmtAmt(drTotal)}</td>
              <td style={{...ds.tdTotal, textAlign: 'right'}}>{fmtAmt(crTotal)}</td>
            </tr>
          </tfoot>
        </table>

        {voucher.narration && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 'bold', color: '#666' }}>Narration:</div>
            <div style={{ fontSize: 12, fontStyle: 'italic' }}>{voucher.narration}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LEVEL 3: VOUCHER REGISTER ──────────────────────────────────────────────
function VoucherRegister({ ledger, monthIdx, branchId, onBack, onDrill }: any) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [selIdx, setSelIdx] = useState(0);

  useEffect(() => {
    const fiscalMonth = (monthIdx + 3) % 12;
    fetch(`/api/vouchers/ledger/${ledger.id}?branchId=${branchId || ''}`)
      .then(r => r.json())
      .then(data => setVouchers(
        (Array.isArray(data) ? data : [])
          .filter((v: any) => !isVoided(v))
          .filter((v: any) => new Date(v.date).getMonth() === fiscalMonth)
      ))
      .catch(() => setVouchers([]));
  }, [ledger.id, monthIdx, branchId]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(s => Math.min(vouchers.length - 1, s + 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(s => Math.max(0, s - 1)); }
      if (e.key === 'Enter')     { e.preventDefault(); if (vouchers[selIdx]) onDrill(vouchers[selIdx].id); }
    };
    window.addEventListener('keydown', handleKeys, true);
    return () => window.removeEventListener('keydown', handleKeys, true);
  }, [vouchers, selIdx, onDrill]);

  const totals = useMemo(() => {
    return vouchers.reduce((acc, v) => {
      if (v.entry_type === 'Dr') acc.dr += Number(v.entry_amount);
      else acc.cr += Number(v.entry_amount);
      return acc;
    }, { dr: 0, cr: 0 });
  }, [vouchers]);

  return (
    <div style={ds.root}>
      <div style={ds.titleBar}><button onClick={onBack} style={ds.backBtn}>Esc: Back</button><span>{ledger.name} ({MONTHS[monthIdx]})</span></div>
      <div style={ds.tableWrap}>
        <table style={ds.table}>
          <thead><tr style={ds.thead}><th style={ds.th}>Date</th><th style={ds.th}>Particulars</th><th style={{...ds.th, textAlign:'right'}}>Debit</th><th style={{...ds.th, textAlign:'right'}}>Credit</th></tr></thead>
          <tbody>
            {vouchers.map((v, i) => (
              <tr key={i} style={{ ...ds.tr, background: selIdx === i ? YELLOW : 'transparent' }} onClick={() => onDrill(v.id)}>
                <td style={ds.td}>{fmtDate(v.date)}</td>
                <td style={ds.td}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>
                      {v.other_ledger_name || 'Multiple Ledgers'}
                    </span>
                    {v.narration && (
                      <span style={{ fontSize: 10, color: '#666', fontStyle: 'italic', marginTop: 2 }}>
                        {v.narration}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ ...ds.td, textAlign: 'right', color: '#7a0000' }}>{v.entry_type === 'Dr' ? fmtAmt(v.entry_amount) : ''}</td>
                <td style={{ ...ds.td, textAlign: 'right', color: '#006b00' }}>{v.entry_type === 'Cr' ? fmtAmt(v.entry_amount) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot style={ds.tfoot}>
            <tr>
              <td colSpan={2} style={ds.tdTotal}>Grand Total</td>
              <td style={{...ds.tdTotal, textAlign: 'right'}}>{fmtAmt(totals.dr)}</td>
              <td style={{...ds.tdTotal, textAlign: 'right'}}>{fmtAmt(totals.cr)}</td>
            </tr>
          </tfoot>
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
    };
    window.addEventListener('keydown', handleKeys, true);
    return () => window.removeEventListener('keydown', handleKeys, true);
  }, [selIdx, data, onDrill]);

  const totals = useMemo(() => {
    const dr = data.reduce((a, b) => a + b.dr, 0);
    const cr = data.reduce((a, b) => a + b.cr, 0);
    const opening = (ledger.balanceType === 'Cr' ? -1 : 1) * Number(ledger.openingBalance || 0);
    const closing = opening + (dr - cr);
    return { dr, cr, closing };
  }, [data, ledger]);

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
          <tfoot style={ds.tfoot}>
            <tr style={{borderTop: '2px solid #333'}}>
              <td style={ds.tdTotal}>Grand Total</td>
              <td style={{...ds.tdTotal, textAlign: 'right'}}>{fmtAmt(totals.dr)}</td>
              <td style={{...ds.tdTotal, textAlign: 'right'}}>{fmtAmt(totals.cr)}</td>
              <td style={{...ds.tdTotal, textAlign: 'right'}}>{fmtAmt(totals.closing)} {totals.closing >= 0 ? 'Dr' : 'Cr'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── LEVEL 1: TRIAL BALANCE ─────────────────────────────────────────────────
export default function TrialBalanceScreen({ branchId, onBackToGateway }: { branchId?: string; onBackToGateway?: () => void }) {
  const [ledgers, setLedgers]               = useState<Ledger[]>([]);
  const [vouchers, setVouchers]             = useState<any[]>([]);
  const [viewLevel, setViewLevel]           = useState<'trial' | 'monthly' | 'vouchers' | 'voucher_detail'>('trial');
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(0);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey]       = useState<string | null>(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [isDetailed, setIsDetailed]         = useState(false);

  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => r.json()),
      fetch(`/api/vouchers${q}`).then(r => r.json()),
    ]).then(([l, v]) => {
      setLedgers(l);
      setVouchers((Array.isArray(v) ? v : []).filter((x: any) => !isVoided(x)));
      if (l.length > 0) setSelectedKey(`G:${l[0].group_name || 'Primary'}`);
    });
  }, [branchId]);

  // Pre-calculate balances for performance
  const ledgerBalances = useMemo(() => {
    const bals: Record<string, number> = {};
    ledgers.forEach(l => {
      let bal = (l.balanceType === 'Cr' ? -1 : 1) * Number(l.openingBalance || 0);
      bals[l.id] = bal;
    });

    vouchers.forEach((v: any) => {
      const entries = v.entries || [v];
      entries.forEach((e: any) => {
        if (bals[e.ledgerId] !== undefined) {
          bals[e.ledgerId] += (e.type === 'Dr' || e.entry_type === 'Dr') ? Number(e.amount || e.entry_amount || 0) : -Number(e.amount || e.entry_amount || 0);
        }
      });
    });
    return bals;
  }, [ledgers, vouchers]);

  const groupsData = useMemo(() => {
    const g: Record<string, { dr: number; cr: number; ledgers: Ledger[] }> = {};
    ledgers.forEach(l => {
      const grp = l.group_name || 'Primary';
      if (!g[grp]) g[grp] = { dr: 0, cr: 0, ledgers: [] };
      g[grp].ledgers.push(l);
      const bal = ledgerBalances[l.id];
      if (bal >= 0) g[grp].dr += bal; else g[grp].cr += Math.abs(bal);
    });
    return g;
  }, [ledgers, ledgerBalances]);

  const sortedGroups = useMemo(() => {
    return Object.keys(groupsData)
      .filter(grp => {
        if (!searchQuery) return true;
        const g = groupsData[grp];
        return grp.toLowerCase().includes(searchQuery.toLowerCase()) || 
               g.ledgers.some(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
      })
      .sort();
  }, [groupsData, searchQuery]);
  
  const grandTotals = useMemo(() => {
    return sortedGroups.reduce((acc, grp) => {
      acc.dr += groupsData[grp].dr;
      acc.cr += groupsData[grp].cr;
      return acc;
    }, { dr: 0, cr: 0 });
  }, [sortedGroups, groupsData]);

  const flatList = useMemo(() => {
    const list: any[] = [];
    sortedGroups.forEach(grp => {
      list.push({ key: `G:${grp}`, type: 'group', name: grp });
      if (isDetailed || expandedGroups.has(grp)) {
        groupsData[grp].ledgers
          .filter(l => !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || grp.toLowerCase().includes(searchQuery.toLowerCase()))
          .forEach(l => list.push({ key: `L:${l.id}`, type: 'ledger', ledger: l }));
      }
    });
    return list;
  }, [sortedGroups, expandedGroups, groupsData, isDetailed, searchQuery]);

  // Restored Keyboard Handler
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        if (viewLevel === 'voucher_detail') {
          e.preventDefault();
          setViewLevel('vouchers');
          return;
        }
        if (viewLevel === 'vouchers') {
          e.preventDefault();
          setViewLevel('monthly');
          return;
        }
        if (viewLevel === 'monthly') {
          e.preventDefault();
          setViewLevel('trial');
          return;
        }
        if (viewLevel === 'trial') {
          e.preventDefault();
          if (onBackToGateway) onBackToGateway();
          return;
        }
      }

      if (viewLevel !== 'trial') return;
      const idx = flatList.findIndex(x => x.key === selectedKey);
      
      // Detailed View Toggle (Alt+F1 or Alt+F5)
      if (e.altKey && (e.key === 'F1' || e.key === 'F5')) {
        e.preventDefault();
        setIsDetailed(prev => !prev);
        return;
      }

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
    window.addEventListener('keydown', handleKeys, { capture: true });
    return () => window.removeEventListener('keydown', handleKeys, { capture: true });
  }, [selectedKey, flatList, expandedGroups, viewLevel, isDetailed, onBackToGateway]);

  const handleExport = () => {
    const exportData = sortedGroups.flatMap(grp => {
      const rows = [{ Particulars: grp, Debit: groupsData[grp].dr || '', Credit: groupsData[grp].cr || '' }];
      if (isDetailed || expandedGroups.has(grp)) {
        groupsData[grp].ledgers.forEach(l => {
          const b = ledgerBalances[l.id];
          rows.push({
            Particulars: `  ${l.name}`,
            Debit: b >= 0 ? b : '',
            Credit: b < 0 ? Math.abs(b) : ''
          } as any);
        });
      }
      return rows;
    });
    
    import('../lib/ReportUtils').then(mu => {
      mu.exportToExcel(exportData, 'Trial_Balance');
    });
  };

  if (viewLevel === 'voucher_detail' && selectedVoucherId) {
    return <VoucherDetail voucherId={selectedVoucherId} onBack={() => setViewLevel('vouchers')} />;
  }
  if (viewLevel === 'vouchers' && selectedLedger) {
    return <VoucherRegister ledger={selectedLedger} monthIdx={selectedMonthIdx} branchId={branchId} onBack={() => setViewLevel('monthly')} onDrill={(vId: string) => { setSelectedVoucherId(vId); setViewLevel('voucher_detail'); }} />;
  }
  if (viewLevel === 'monthly' && selectedLedger) {
    return <LedgerMonthlySummary ledger={selectedLedger} branchId={branchId} onBack={() => setViewLevel('trial')} onDrill={(mIdx: number) => { setSelectedMonthIdx(mIdx); setViewLevel('vouchers'); }} />;
  }

  return (
    <div style={ds.root}>
      <div style={ds.titleBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>Trial Balance</span>
          <div style={{ background: '#fff', padding: '2px 5px', borderRadius: 2, display: 'flex', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 10, width: 150, color: '#333' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => setIsDetailed(!isDetailed)} style={ds.backBtn}>
            {isDetailed ? 'Condensed' : 'Detailed'} (Alt+F1)
          </button>
          <button onClick={handleExport} style={ds.backBtn}>Export (Alt+E)</button>
        </div>
      </div>
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
                {(isDetailed || expandedGroups.has(grp)) && groupsData[grp].ledgers.map(l => {
                  const b = ledgerBalances[l.id];
                  if (searchQuery && !l.name.toLowerCase().includes(searchQuery.toLowerCase()) && !grp.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                  return (
                    <tr key={l.id} style={{ ...s.ledgerRow, background: selectedKey === `L:${l.id}` ? YELLOW : 'transparent' }} onClick={() => setSelectedKey(`L:${l.id}`)}>
                      <td style={{ ...s.colParticulars, paddingLeft: 30 }}>{l.name}</td>
                      <td style={s.colDebit}>{b >= 0 ? fmtAmt(b) : ''}</td>
                      <td style={s.colCredit}>{b < 0 ? fmtAmt(Math.abs(b)) : ''}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot style={ds.tfoot}>
            <tr style={{borderTop: '2px solid #333'}}>
              <td style={s.colParticulars}><b>Grand Total</b></td>
              <td style={{...s.colDebit, fontWeight: 'bold'}}>{fmtAmt(grandTotals.dr)}</td>
              <td style={{...s.colCredit, fontWeight: 'bold'}}>{fmtAmt(grandTotals.cr)}</td>
            </tr>
          </tfoot>
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
  tableWrap:{ flex: 1, overflowY: 'auto', position: 'relative' },
  table:    { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  thead:    { background: LIGHT, position: 'sticky', top: 0, zIndex: 10 },
  th:       { padding: '8px', borderBottom: `1px solid ${BORDER}`, textAlign: 'left', fontSize: 11, borderRight: `1px solid ${ROW_BDR}`, wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' },
  td:       { padding: '4px 8px', borderBottom: `1px solid ${ROW_BDR}`, fontSize: 12, borderRight: `1px solid ${ROW_BDR}`, wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', verticalAlign: 'top' },
  tfoot:    { position: 'sticky', bottom: 0, background: '#fff', zIndex: 10 },
  tdTotal:  { padding: '6px 8px', fontWeight: 'bold', borderRight: `1px solid ${ROW_BDR}`, background: '#f9f9f9' },
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
