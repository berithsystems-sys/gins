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

interface Voucher {
  id: string;
  number: string;
  date: string;
  type: string;
  narration: string;
  amount: number;
  entry_amount?: number; // from joined query
  entry_type?: 'Dr' | 'Cr';
  entries?: any[];
}

// --- Constants & Helpers ---
const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
const HDR_BG = '#1f4e79';
const YELLOW = '#ffd966';
const BORDER = '#b8c4cc';
const LIGHT = '#f0f4f8';
const ROW_BDR = '#e0e6ee';

const MONTHS = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

function fmtAmt(n: number) {
  if (n === 0) return "";
  return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    const ms = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()}-${ms[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
  } catch { return iso; }
}

// ─── 3. VOUCHER REGISTER (Level 3) ──────────────────────────────────────────
function VoucherRegister({ ledger, monthIdx, year, branchId, onBack }: any) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tally Fiscal Year logic (Month 0 is April)
    const fiscalMonth = (monthIdx + 3) % 12; 
    const fiscalYear = monthIdx < 9 ? year : year + 1;

    fetch(`/api/vouchers/ledger/${ledger.id}?branchId=${branchId || ''}`)
      .then(r => r.json())
      .then(data => {
        const filtered = data.filter((v: any) => {
          const d = new Date(v.date);
          return d.getMonth() === fiscalMonth;
        });
        setVouchers(filtered);
      })
      .finally(() => setLoading(false));
  }, [ledger.id, monthIdx]);

  return (
    <div style={ds.root}>
      <div style={ds.titleBar}>
        <button onClick={onBack} style={ds.backBtn}>Esc: Back</button>
        <span style={ds.titleCenter}>Voucher Register: {ledger.name} ({MONTHS[monthIdx]})</span>
      </div>
      <div style={ds.tableWrap}>
        <table style={ds.table}>
          <thead>
            <tr style={ds.thead}>
              <th style={{ ...ds.th, width: 100 }}>Date</th>
              <th style={ds.th}>Particulars</th>
              <th style={{ ...ds.th, width: 120 }}>Vch Type</th>
              <th style={{ ...ds.th, width: 80 }}>Vch No.</th>
              <th style={{ ...ds.th, width: 120, textAlign: 'right' }}>Debit</th>
              <th style={{ ...ds.th, width: 120, textAlign: 'right' }}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v, i) => (
              <tr key={i} style={ds.tr}>
                <td style={ds.td}>{fmtDate(v.date)}</td>
                <td style={ds.td}>{v.narration || '—'}</td>
                <td style={ds.td}>{v.type}</td>
                <td style={ds.td}>{v.number}</td>
                <td style={{ ...ds.td, textAlign: 'right', color: '#7a0000' }}>{v.entry_type === 'Dr' ? fmtAmt(v.entry_amount) : ''}</td>
                <td style={{ ...ds.td, textAlign: 'right', color: '#006b00' }}>{v.entry_type === 'Cr' ? fmtAmt(v.entry_amount) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 2. MONTHLY SUMMARY (Level 2) ───────────────────────────────────────────
function LedgerMonthlySummary({ ledger, branchId, onBack, onDrill }: any) {
  const [data, setData] = useState<any[]>([]);
  const [selIdx, setSelIdx] = useState(0);

  useEffect(() => {
    fetch(`/api/vouchers/ledger/${ledger.id}?branchId=${branchId || ''}`)
      .then(r => r.json())
      .then(vouchers => {
        // Group by Month (April to March)
        const summary = MONTHS.map((m, i) => {
          const fiscalMonth = (i + 3) % 12;
          const vchs = vouchers.filter((v: any) => new Date(v.date).getMonth() === fiscalMonth);
          const dr = vchs.filter((v: any) => v.entry_type === 'Dr').reduce((a: any, b: any) => a + Number(b.entry_amount), 0);
          const cr = vchs.filter((v: any) => v.entry_type === 'Cr').reduce((a: any, b: any) => a + Number(b.entry_amount), 0);
          return { month: m, dr, cr, monthIdx: i };
        });
        setData(summary);
      });
  }, [ledger.id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') setSelIdx(s => Math.min(11, s + 1));
      if (e.key === 'ArrowUp') setSelIdx(s => Math.max(0, s - 1));
      if (e.key === 'Enter') onDrill(data[selIdx].monthIdx);
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selIdx, data]);

  const ob = Number(ledger.openingBalance || 0);
  const obSgn = ledger.balanceType === 'Cr' ? -ob : ob;
  let running = obSgn;

  return (
    <div style={ds.root}>
      <div style={ds.titleBar}>
        <button onClick={onBack} style={ds.backBtn}>← Back</button>
        <span style={ds.titleCenter}>Ledger Monthly Summary: {ledger.name}</span>
      </div>
      <div style={ds.tableWrap}>
        <table style={ds.table}>
          <thead>
            <tr style={ds.thead}>
              <th style={ds.th}>Particulars</th>
              <th style={{ ...ds.th, textAlign: 'right' }}>Debit</th>
              <th style={{ ...ds.th, textAlign: 'right' }}>Credit</th>
              <th style={{ ...ds.th, textAlign: 'right' }}>Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: '#f9f9f9' }}>
              <td style={{ ...ds.td, fontWeight: 'bold' }}>Opening Balance</td>
              <td style={ds.td}></td><td style={ds.td}></td>
              <td style={{ ...ds.td, textAlign: 'right', fontWeight: 'bold' }}>{fmtAmt(ob)} {obSgn >= 0 ? 'Dr' : 'Cr'}</td>
            </tr>
            {data.map((row, i) => {
              running += (row.dr - row.cr);
              return (
                <tr 
                  key={i} 
                  style={{ ...ds.tr, background: selIdx === i ? YELLOW : 'transparent' }}
                  onClick={() => onDrill(row.monthIdx)}
                >
                  <td style={ds.td}>{row.month}</td>
                  <td style={{ ...ds.td, textAlign: 'right' }}>{fmtAmt(row.dr)}</td>
                  <td style={{ ...ds.td, textAlign: 'right' }}>{fmtAmt(row.cr)}</td>
                  <td style={{ ...ds.td, textAlign: 'right', fontWeight: 600 }}>
                    {fmtAmt(running)} {running >= 0 ? 'Dr' : 'Cr'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 1. TRIAL BALANCE (Main Screen) ──────────────────────────────────────────
export default function TrialBalanceScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [viewLevel, setViewLevel] = useState<'trial' | 'monthly' | 'vouchers'>('trial');
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(0);
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Data Loading
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => r.json()),
      fetch(`/api/vouchers${q}`).then(r => r.json()),
    ]).then(([l, v]) => {
      setLedgers(l);
      setVouchers(v);
      setLoading(false);
    });
  }, [branchId]);

  // Balance Calculation
  const calcBalance = (ledgerId: string) => {
    const l = ledgers.find(x => x.id === ledgerId);
    let bal = (l?.balanceType === 'Cr' ? -1 : 1) * Number(l?.openingBalance || 0);
    vouchers.forEach(v => {
      v.entries?.forEach(e => {
        if (e.ledgerId === ledgerId) bal += (e.type === 'Dr' ? e.amount : -e.amount);
      });
    });
    return bal;
  };

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
  }, [ledgers, vouchers]);

  // View Switcher
  if (viewLevel === 'vouchers' && selectedLedger) {
    return (
      <VoucherRegister 
        ledger={selectedLedger} 
        monthIdx={selectedMonthIdx} 
        year={2024} // Should be dynamic based on period
        branchId={branchId}
        onBack={() => setViewLevel('monthly')} 
      />
    );
  }

  if (viewLevel === 'monthly' && selectedLedger) {
    return (
      <LedgerMonthlySummary 
        ledger={selectedLedger} 
        branchId={branchId}
        onBack={() => setViewLevel('trial')} 
        onDrill={(mIdx: number) => {
          setSelectedMonthIdx(mIdx);
          setViewLevel('vouchers');
        }}
      />
    );
  }

  return (
    <div style={s.root}>
      <div style={s.titleBar}>
        <span style={s.titleLeft}>Trial Balance</span>
        <span style={s.titleCenter}>Company Name</span>
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.reportHdr}>
              <th style={s.colParticulars}>Particulars</th>
              <th style={s.colDebit}>Debit</th>
              <th style={s.colCredit}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groupsData).map(grp => (
              <React.Fragment key={grp}>
                <tr 
                  style={s.groupRow} 
                  onClick={() => {
                    const n = new Set(expandedGroups);
                    n.has(grp) ? n.delete(grp) : n.add(grp);
                    setExpandedGroups(n);
                  }}
                >
                  <td style={s.colParticulars}><b>{grp}</b></td>
                  <td style={s.colDebit}>{fmtAmt(groupsData[grp].dr)}</td>
                  <td style={s.colCredit}>{fmtAmt(groupsData[grp].cr)}</td>
                </tr>
                {expandedGroups.has(grp) && groupsData[grp].ledgers.map(l => {
                  const b = calcBalance(l.id);
                  return (
                    <tr 
                      key={l.id} 
                      style={s.ledgerRow} 
                      onClick={() => {
                        setSelectedLedger(l);
                        setViewLevel('monthly');
                      }}
                    >
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

// ─── STYLES (Cleaned up for clarity) ──────────────────────────────────────────
const ds: Record<string, React.CSSProperties> = {
  root: { fontFamily: FONT, fontSize: 12, height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' },
  titleBar: { background: HDR_BG, color: '#fff', padding: '4px 10px', display: 'flex', justifyContent: 'space-between' },
  backBtn: { background: 'transparent', color: '#fff', border: '1px solid #fff', cursor: 'pointer', fontSize: 10 },
  titleCenter: { fontWeight: 'bold' },
  tableWrap: { flex: 1, overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: LIGHT, position: 'sticky', top: 0 },
  th: { padding: '8px', borderBottom: `1px solid ${BORDER}`, textAlign: 'left', fontSize: 11 },
  td: { padding: '6px 8px', borderBottom: `1px solid ${ROW_BDR}`, fontSize: 12 },
  tr: { cursor: 'pointer' }
};

const s: Record<string, React.CSSProperties> = {
  ...ds,
  reportHdr: { background: '#f0f0f0', borderBottom: `2px solid ${BORDER}` },
  groupRow: { background: '#fff', cursor: 'pointer', borderBottom: `1px solid ${ROW_BDR}` },
  ledgerRow: { background: '#fafafa', cursor: 'pointer', borderBottom: `1px solid ${ROW_BDR}` },
  colParticulars: { width: '60%', padding: '6px 10px' },
  colDebit: { width: '20%', textAlign: 'right', padding: '6px 10px' },
  colCredit: { width: '20%', textAlign: 'right', padding: '6px 10px' },
};
