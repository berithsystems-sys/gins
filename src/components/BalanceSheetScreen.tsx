import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types matching exact DB schema ───────────────────────────────────────────
interface Ledger {
  id: string;
  name: string;
  group_name?: string;
  group?: string;
  openingBalance?: number;
  balanceType?: 'Dr' | 'Cr';
  branchId?: string;
}
interface VoucherEntry {
  ledgerId: string;
  amount: number;
  type: 'Dr' | 'Cr';
}
interface Voucher {
  id: string;
  date?: string;
  type?: string;
  narration?: string;
  entries: VoucherEntry[];
}
interface Group {
  id: string;
  name: string;
  parent_group?: string;
  under?: string;
}
interface DrillEntry {
  date: string;
  voucherType: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}

// ─── ALL groups that belong to each Balance Sheet side ───────────────────────
const LIABILITY_GROUPS = [
  'Capital Account',
  'Loans (Liability)',
  'Current Liabilities',
  'Suspense Account',
  'Reserves and Surplus',
  'Bank OD',
  'Secured Loans',
  'Unsecured Loans',
];

const ASSET_GROUPS = [
  'Fixed Assets',
  'Investments',
  'Current Assets',
  'Bank Accounts',
  'Cash',
  'Cash-in-Hand',
  'Sundry Debtors',
  'Stock-in-Hand',
  'Loans & Advances (Asset)',
  'Deposits (Asset)',
  'Miscellaneous Expenses (Asset)',
];

// ─── Inline styles using CSS variables with fallbacks ─────────────────────────
const colors = {
  sidebar:  'var(--tally-sidebar, #1a3a4a)',
  teal:     'var(--tally-teal, #0d6e6e)',
  accent:   'var(--tally-accent, #e8b84b)',
  light:    'var(--tally-light, #e8f4f4)',
  bg:       'var(--tally-bg, #f0f4f4)',
  hotkey:   'var(--tally-hotkey, #253f50)',
};

// ─── Ledger Drill-Down Modal ──────────────────────────────────────────────────
function LedgerDrillDown({ ledger, entries, onClose }: {
  ledger: Ledger; entries: DrillEntry[]; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose]);

  const ob = Number(ledger.openingBalance || 0);
  let runBal = ledger.balanceType === 'Cr' ? -ob : ob;
  const totalDebit  = entries.reduce((a, e) => a + e.debit,  0);
  const totalCredit = entries.reduce((a, e) => a + e.credit, 0);
  const finalBal = runBal + totalDebit - totalCredit;

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        ref={ref} tabIndex={-1}
        style={{ background:'#fff', width:860, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 8px 40px rgba(0,0,0,0.3)', border:`2px solid ${colors.teal}`, outline:'none' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background:colors.sidebar, color:'#fff', padding:'8px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:'bold', textTransform:'uppercase' }}>Ledger Transactions — {ledger.name}</span>
          <span style={{ color:colors.accent, fontSize:10 }}>ESC to close</span>
        </div>
        {/* Sub-header */}
        <div style={{ background:colors.light, padding:'4px 16px', display:'flex', gap:24, fontSize:10, borderBottom:`1px solid ${colors.teal}` }}>
          <span><b>Group:</b> {ledger.group_name || ledger.group || '—'}</span>
          <span><b>Opening Balance:</b> ₹{ob.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledger.balanceType}</span>
        </div>
        {/* Column headers */}
        <div style={{ display:'grid', gridTemplateColumns:'100px 110px 1fr 95px 95px 115px', background:colors.light, padding:'4px 12px', fontSize:10, fontWeight:'bold', textTransform:'uppercase', borderBottom:`1px solid ${colors.teal}`, color:colors.teal }}>
          <span>Date</span><span>Type</span><span>Narration</span>
          <span style={{ textAlign:'right' }}>Debit</span>
          <span style={{ textAlign:'right' }}>Credit</span>
          <span style={{ textAlign:'right' }}>Balance</span>
        </div>
        {/* Rows */}
        <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'100px 110px 1fr 95px 95px 115px', padding:'4px 12px', fontSize:10, background:'#fefce8', borderBottom:'1px solid #fef08a', fontWeight:600 }}>
            <span style={{ color:'#9ca3af' }}>—</span>
            <span style={{ color:'#374151' }}>Opening Balance</span>
            <span style={{ color:'#9ca3af', fontStyle:'italic' }}>—</span>
            <span style={{ textAlign:'right', fontFamily:'monospace', color:'#16a34a' }}>{runBal > 0 ? runBal.toLocaleString('en-IN', { minimumFractionDigits:2 }) : ''}</span>
            <span style={{ textAlign:'right', fontFamily:'monospace', color:'#dc2626' }}>{runBal < 0 ? Math.abs(runBal).toLocaleString('en-IN', { minimumFractionDigits:2 }) : ''}</span>
            <span style={{ textAlign:'right', fontFamily:'monospace', color:colors.teal }}>{Math.abs(runBal).toLocaleString('en-IN', { minimumFractionDigits:2 })} {runBal >= 0 ? 'Dr' : 'Cr'}</span>
          </div>
          {entries.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', fontSize:11, color:'#9ca3af', fontStyle:'italic' }}>No transactions recorded for this ledger.</div>
          ) : entries.map((e, i) => {
            runBal += e.debit - e.credit;
            return (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'100px 110px 1fr 95px 95px 115px', padding:'2px 12px', fontSize:10, borderBottom:'1px solid #f9fafb', background: i%2===1 ? '#f9fafb' : '#fff' }}>
                <span style={{ color:'#6b7280' }}>{e.date}</span>
                <span style={{ color:'#374151', fontWeight:500 }}>{e.voucherType}</span>
                <span style={{ color:'#9ca3af', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.narration||'—'}</span>
                <span style={{ textAlign:'right', fontFamily:'monospace', color:'#16a34a' }}>{e.debit>0?e.debit.toLocaleString('en-IN',{minimumFractionDigits:2}):''}</span>
                <span style={{ textAlign:'right', fontFamily:'monospace', color:'#dc2626' }}>{e.credit>0?e.credit.toLocaleString('en-IN',{minimumFractionDigits:2}):''}</span>
                <span style={{ textAlign:'right', fontFamily:'monospace', color:colors.teal, fontWeight:600 }}>{Math.abs(runBal).toLocaleString('en-IN',{minimumFractionDigits:2})} {runBal>=0?'Dr':'Cr'}</span>
              </div>
            );
          })}
        </div>
        {/* Footer */}
        <div style={{ display:'grid', gridTemplateColumns:'100px 110px 1fr 95px 95px 115px', padding:'8px 12px', fontSize:10, fontWeight:900, background:colors.light, borderTop:`2px solid ${colors.teal}`, color:colors.teal }}>
          <span style={{ gridColumn:'1/4', textTransform:'uppercase' }}>Closing Balance</span>
          <span style={{ textAlign:'right', fontFamily:'monospace' }}>{totalDebit.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
          <span style={{ textAlign:'right', fontFamily:'monospace' }}>{totalCredit.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
          <span style={{ textAlign:'right', fontFamily:'monospace' }}>{Math.abs(finalBal).toLocaleString('en-IN',{minimumFractionDigits:2})} {finalBal>=0?'Dr':'Cr'}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BalanceSheetScreen({ branchId, onBack }: {
  branchId?: string; onBack?: () => void;
}) {
  const [ledgers,        setLedgers]        = useState<Ledger[]>([]);
  const [vouchers,       setVouchers]       = useState<Voucher[]>([]);
  const [groups,         setGroups]         = useState<Group[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [companyName,    setCompanyName]    = useState('');
  const [drillLedger,    setDrillLedger]    = useState<Ledger | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [debugInfo,      setDebugInfo]      = useState<string>('');
  const [fetchDetails,   setFetchDetails]   = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch data with enhanced error handling ────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setFetchDetails('');
      
      try {
        // Build query string
        const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
        const endpoints = {
          ledgers: `/api/ledgers${q}`,
          vouchers: `/api/vouchers${q}`,
          groups: `/api/account-groups${q}`,
          branches: `/api/branches`,
        };

        const fetchLog: string[] = [];

        const fetchWithLog = async (name: string, url: string) => {
          try {
            fetchLog.push(`📡 Fetching ${name}: ${url}`);
            const response = await fetch(url);
            
            if (!response.ok) {
              fetchLog.push(`❌ ${name}: HTTP ${response.status}`);
              const text = await response.text();
              fetchLog.push(`   Response: ${text.substring(0, 100)}`);
              return [];
            }
            
            const data = await response.json();
            const isArray = Array.isArray(data);
            fetchLog.push(`✅ ${name}: ${isArray ? data.length + ' items' : 'received object'}`);
            return isArray ? data : [];
          } catch (err: any) {
            fetchLog.push(`⚠️ ${name}: ${err.message}`);
            return [];
          }
        };

        const [l, v, g, b] = await Promise.all([
          fetchWithLog('Ledgers', endpoints.ledgers),
          fetchWithLog('Vouchers', endpoints.vouchers),
          fetchWithLog('Groups', endpoints.groups),
          fetchWithLog('Branches', endpoints.branches),
        ]);

        setFetchDetails(fetchLog.join('\n'));

        setLedgers(l);
        setVouchers(v);
        setGroups(g);

        // Debug info
        const knownGroups = [...LIABILITY_GROUPS, ...ASSET_GROUPS];
        const ledgerGroups = [...new Set(l.map((ld: Ledger) => ld.group_name || ld.group || 'NONE'))];
        const matchedGroups = ledgerGroups.filter(g => knownGroups.includes(g as string));
        setDebugInfo(`${l.length} ledgers | ${v.length} vouchers | BS groups found: ${matchedGroups.join(', ') || 'NONE'}`);

        // Auto-expand groups that have ledgers
        const allBSGroups = [...LIABILITY_GROUPS, ...ASSET_GROUPS];
        const groupsWithData = allBSGroups.filter(gName =>
          l.some((ld: Ledger) => ld.group_name === gName || ld.group === gName)
        );
        setExpandedGroups(groupsWithData);

        if (Array.isArray(b)) {
          const br = b.find((c: any) => c.id === branchId);
          if (br) setCompanyName(br.name);
          else if (b.length > 0 && !branchId) setCompanyName(b[0]?.name || '');
        }

        // ⚠️ If no data at all, show error
        if (l.length === 0 && v.length === 0 && g.length === 0) {
          setError('⚠️ No data fetched from any endpoint. Check your API endpoints.');
        }
      } catch (err: any) {
        console.error('[BS] fetch error:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [branchId]);

  useEffect(() => { containerRef.current?.focus(); }, [loading]);

  // ── Balance calculation ────────────────────────────────────────────────────
  const calculateBalance = useCallback((ledgerId: string): number => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return 0;
    const ob = Number(ledger.openingBalance || 0);
    let bal = ledger.balanceType === 'Cr' ? -ob : ob;
    for (const v of vouchers) {
      if (!Array.isArray(v.entries)) continue;
      for (const e of v.entries) {
        if (e.ledgerId !== ledgerId) continue;
        const amt = Number(e.amount || 0);
        bal += e.type === 'Dr' ? amt : -amt;
      }
    }
    return bal;
  }, [ledgers, vouchers]);

  const getGroupTotal = useCallback((groupName: string): number => {
    const groupLedgers = ledgers.filter(l => l.group_name === groupName || l.group === groupName);
    let total = groupLedgers.reduce((acc, l) => acc + calculateBalance(l.id), 0);
    const subGroups = groups.filter(g => g.parent_group === groupName || g.under === groupName);
    for (const sg of subGroups) total += getGroupTotal(sg.name);
    return total;
  }, [ledgers, groups, calculateBalance]);

  const getDrillEntries = useCallback((ledger: Ledger): DrillEntry[] => {
    const result: DrillEntry[] = [];
    const relevant = vouchers
      .filter(v => Array.isArray(v.entries) && v.entries.some(e => e.ledgerId === ledger.id))
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    for (const v of relevant) {
      for (const e of v.entries) {
        if (e.ledgerId !== ledger.id) continue;
        const amt = Number(e.amount || 0);
        result.push({
          date: v.date ? new Date(v.date).toLocaleDateString('en-IN') : '—',
          voucherType: v.type || 'Journal',
          narration: v.narration || '',
          debit:  e.type === 'Dr' ? amt : 0,
          credit: e.type === 'Cr' ? amt : 0,
          balance: 0,
        });
      }
    }
    return result;
  }, [vouchers]);

  const handleExport = useCallback(() => {
    try {
      const rows = [
        ...LIABILITY_GROUPS.map(g => ({ Side: 'Liabilities', Group: g, Amount: -getGroupTotal(g) })),
        ...ASSET_GROUPS.map(g => ({ Side: 'Assets', Group: g, Amount: getGroupTotal(g) })),
      ];
      const csv = ['Side,Group,Amount', ...rows.map(r => `${r.Side},${r.Group},${r.Amount.toFixed(2)}`)].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'Balance_Sheet.csv';
      a.click();
    } catch(e) { console.error('Export failed', e); }
  }, [getGroupTotal]);

  const printReport = () => {
    const el = document.getElementById('balance-sheet-report');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Balance Sheet</title><style>body{font-family:monospace;font-size:11px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { onBack?.(); return; }
    e.stopPropagation();
    if (e.altKey && e.key.toUpperCase() === 'P') { e.preventDefault(); printReport(); }
    if (e.altKey && e.key.toUpperCase() === 'E') { e.preventDefault(); handleExport(); }
    if (e.key === 'F1') { e.preventDefault(); setExpandedGroups([]); }
  }, [onBack, handleExport]);

  const toggleGroup = (name: string) =>
    setExpandedGroups(prev =>
      prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]
    );

  // ── Render one BS side ─────────────────────────────────────────────────────
  const renderSection = (title: string, groupNames: string[]) => {
    const isLiab = title === 'Liabilities';

    const sections = groupNames.map(name => {
      const raw     = getGroupTotal(name);
      const display = isLiab ? -raw : raw;
      const ledgerCount = ledgers.filter(l => l.group_name === name || l.group === name).length;
      return { name, raw, display, ledgerCount };
    }).filter(s => s.ledgerCount > 0);

    const total = sections.reduce((acc, s) => acc + s.display, 0);

    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ flex:1 }}>
          {sections.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 16px', gap:8 }}>
              <span style={{ fontSize:10, color:'#9ca3af', fontStyle:'italic' }}>No ledgers assigned to {title} groups</span>
              <span style={{ fontSize:9, color:'#d1d5db' }}>
                {isLiab ? LIABILITY_GROUPS.join(', ') : ASSET_GROUPS.join(', ')}
              </span>
            </div>
          ) : sections.map(s => {
            const isExpanded = expandedGroups.includes(s.name);
            const groupLedgers = ledgers.filter(l =>
              (l.group_name === s.name || l.group === s.name)
            );

            return (
              <div key={s.name} style={{ borderBottom:'1px solid #f3f4f6' }}>
                {/* Group header */}
                <div
                  onClick={() => toggleGroup(s.name)}
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 12px', cursor:'pointer', userSelect:'none', background: isExpanded ? `${colors.light}` : 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.light)}
                  onMouseLeave={e => (e.currentTarget.style.background = isExpanded ? colors.light : 'transparent')}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:9, color:colors.teal, width:12, fontWeight:'bold' }}>
                      {isExpanded ? '▾' : '▸'}
                    </span>
                    <span style={{ fontSize:11, fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.05em', color:'#374151' }}>
                      {s.name}
                    </span>
                    <span style={{ fontSize:9, color:'#9ca3af' }}>({s.ledgerCount})</span>
                  </div>
                  <span style={{ fontSize:11, fontFamily:'monospace', fontWeight:'bold', color: s.display >= 0 ? '#1f2937' : '#dc2626' }}>
                    {s.display.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Expanded: ledger rows */}
                {isExpanded && (
                  <div style={{ background:'#fafafa', borderTop:'1px solid #f3f4f6', paddingBottom:4 }}>
                    {groupLedgers.map(l => {
                      const bal     = calculateBalance(l.id);
                      const display = isLiab ? -bal : bal;
                      return (
                        <div
                          key={l.id}
                          onClick={() => setDrillLedger(l)}
                          title="Click to view transactions"
                          style={{ display:'flex', justifyContent:'space-between', padding:'2px 40px', fontSize:10, color:colors.teal, cursor:'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#e8f4f4'; e.currentTarget.style.fontWeight = '600'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.fontWeight = 'normal'; }}
                        >
                          <span style={{ fontStyle:'italic' }}>{l.name}</span>
                          <span style={{ fontFamily:'monospace' }}>
                            {display.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total row */}
        <div style={{ background:colors.light, padding:'8px 12px', display:'flex', justifyContent:'space-between', fontWeight:900, fontSize:12, color:colors.teal, borderTop:`2px solid ${colors.teal}`, marginTop:'auto' }}>
          <span>TOTAL</span>
          <span style={{ fontFamily:'monospace' }}>
            ₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  };

  const reportDate = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

  return (
    <>
      {drillLedger && (
        <LedgerDrillDown
          ledger={drillLedger}
          entries={getDrillEntries(drillLedger)}
          onClose={() => setDrillLedger(null)}
        />
      )}

      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ display:'flex', flexDirection:'column', height:'100%', background:colors.bg, outline:'none', fontFamily:'monospace, "Courier New"', minHeight:'100vh' }}
      >
        {/* Top bar */}
        <div style={{ background:colors.sidebar, color:'#fff', padding:'4px 16px', fontWeight:'bold', fontSize:12, textTransform:'uppercase', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:10 }}>
          <span>Balance Sheet</span>
          <span style={{ color:colors.accent, fontSize:10, fontWeight:'normal' }}>
            {companyName || (branchId ? `Branch: ${branchId}` : 'All Branches')}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ color:colors.teal, fontWeight:'bold', animation:'pulse 1s infinite' }}>
                ⏳ Loading Balance Sheet…
              </div>
              <div style={{ fontSize:10, color:'#9ca3af', marginTop:4 }}>
                {branchId ? `branchId: ${branchId}` : 'Fetching all branches…'}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:32 }}>
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:24, maxWidth:600, textAlign:'left', fontFamily:'monospace', fontSize:11 }}>
              <div style={{ color:'#dc2626', fontWeight:'bold', fontSize:14, marginBottom:8 }}>⚠️ Failed to load Balance Sheet</div>
              <div style={{ color:'#ef4444', marginBottom:12, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{error}</div>
              
              {fetchDetails && (
                <>
                  <div style={{ color:'#6b7280', fontWeight:'bold', marginTop:16, marginBottom:8 }}>📡 Fetch Details:</div>
                  <div style={{ background:'#fef2f2', border:'1px solid #fde68a', padding:8, borderRadius:4, whiteSpace:'pre-wrap', wordBreak:'break-word', fontSize:10, color:'#92400e' }}>
                    {fetchDetails}
                  </div>
                </>
              )}

              <div style={{ color:'#6b7280', fontSize:10, marginTop:16 }}>
                <b>Troubleshooting:</b>
                <ul style={{ marginTop:6, paddingLeft:20 }}>
                  <li>✓ Check Network tab in DevTools (F12)</li>
                  <li>✓ Verify API endpoints exist: /api/ledgers, /api/vouchers, /api/account-groups</li>
                  <li>✓ Check CORS headers if APIs are on different domain</li>
                  <li>✓ Ensure database has data with matching group_name/group</li>
                </ul>
              </div>

              <button
                onClick={() => window.location.reload()}
                style={{ marginTop:16, padding:'6px 16px', background:colors.teal, color:'#fff', border:'none', borderRadius:4, cursor:'pointer', fontSize:11 }}
              >
                🔄 Retry
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        {!loading && !error && (
          <div style={{ flex:1, overflow:'auto', padding:16, paddingRight: 112 }}>
            {/* Debug bar — shows data status */}
            {debugInfo && (
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:4, padding:'4px 12px', marginBottom:8, fontSize:9, color:'#92400e', fontFamily:'monospace' }}>
                📊 {debugInfo}
              </div>
            )}

            <div
              id="balance-sheet-report"
              style={{ maxWidth:900, margin:'0 auto', background:'#fff', border:`1px solid ${colors.teal}`, boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}
            >
              {/* Company header */}
              <div style={{ textAlign:'center', padding:'12px 0', borderBottom:'1px solid #e5e7eb' }}>
                <h1 style={{ margin:0, fontSize:15, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:'#1f2937' }}>
                  {companyName || 'Balance Sheet'}
                </h1>
                <p style={{ margin:'2px 0 0', fontSize:10, fontWeight:'bold', color:'#4b5563' }}>Balance Sheet</p>
                <p style={{ margin:'2px 0 0', fontSize:9, color:'#9ca3af' }}>As at {reportDate}</p>
              </div>

              {/* Two-column table */}
              <div style={{ display:'flex', borderTop:'none', minHeight:400 }}>
                {/* Liabilities */}
                <div style={{ width:'50%', display:'flex', flexDirection:'column', borderRight:`1px solid ${colors.teal}` }}>
                  <div style={{ background:colors.light, padding:'4px 12px', borderBottom:`1px solid ${colors.teal}`, display:'flex', justifyContent:'space-between', fontSize:10, fontWeight:'bold', textTransform:'uppercase', color:colors.teal }}>
                    <span>Liabilities</span>
                    <span style={{ fontWeight:'normal', color:'#6b7280', fontSize:9 }}>as at {reportDate}</span>
                  </div>
                  {renderSection('Liabilities', LIABILITY_GROUPS)}
                </div>

                {/* Assets */}
                <div style={{ width:'50%', display:'flex', flexDirection:'column' }}>
                  <div style={{ background:colors.light, padding:'4px 12px', borderBottom:`1px solid ${colors.teal}`, display:'flex', justifyContent:'space-between', fontSize:10, fontWeight:'bold', textTransform:'uppercase', color:colors.teal }}>
                    <span>Assets</span>
                    <span style={{ fontWeight:'normal', color:'#6b7280', fontSize:9 }}>as at {reportDate}</span>
                  </div>
                  {renderSection('Assets', ASSET_GROUPS)}
                </div>
              </div>

              {/* Hint bar */}
              <div style={{ background:'#f9fafb', borderTop:'1px solid #f3f4f6', padding:'4px 12px', display:'flex', gap:16, flexWrap:'wrap', fontSize:9, color:'#9ca3af' }}>
                <span>▸/▾ Click group to expand</span>
                <span>Click ledger name to view transactions</span>
                <span>F1 Condense · Alt+P Print · Alt+E Export CSV · ESC Back</span>
              </div>
            </div>
          </div>
        )}

        {/* Right hotkey panel */}
        <div style={{ position:'fixed', right:0, top:32, bottom:0, width:96, background:colors.sidebar, display:'flex', flexDirection:'column', gap:2, padding:2, fontSize:10, color:'#fff', zIndex:20 }}>
          {[
            { label: 'F1: Condensed', fn: () => setExpandedGroups([]) },
            { label: 'F2: Period',    fn: () => {} },
            { label: 'F3: Company',   fn: () => {} },
            { label: 'Alt+P: Print',  fn: printReport },
            { label: 'Alt+E: Export', fn: handleExport },
            { label: 'F12: Config',   fn: () => {} },
            { label: 'ESC: Back',     fn: () => onBack?.() },
          ].map(btn => (
            <div
              key={btn.label}
              onClick={btn.fn}
              style={{ height:40, background:colors.hotkey, display:'flex', alignItems:'center', padding:'0 8px', cursor:'pointer', fontSize:10 }}
              onMouseEnter={e => { e.currentTarget.style.background = colors.accent; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={e => { e.currentTarget.style.background = colors.hotkey; e.currentTarget.style.color = '#fff'; }}
            >
              {btn.label}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
