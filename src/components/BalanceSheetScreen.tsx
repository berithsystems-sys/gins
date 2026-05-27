import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Helpers ---
const isVoided = (v: any): boolean => v.voided === true || v.voided === 1 || v.voided === '1';
const fmtAmtAbs = (n: number) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// ─── Main Balance Sheet ───────────────────────────────────────────────────────
export default function BalanceSheetScreen({ branchId, onBack }: { branchId?: string, onBack?: () => void }) {
  const [ledgers, setLedgers]         = useState<any[]>([]);
  const [allVouchers, setAllVouchers] = useState<any[]>([]);
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Define Groups (Matching server.ts exactly)
  const LIABILITY_GROUPS = ['Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Suspense Account', 'Reserves & Surplus'];
  const ASSET_GROUPS     = ['Fixed Assets', 'Investments', 'Current Assets', 'Misc. Expenses (Asset)'];

  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => { if(!r.ok) throw new Error("Ledger API failed"); return r.json(); }),
      fetch(`/api/vouchers${q}`).then(r => { if(!r.ok) throw new Error("Voucher API failed"); return r.json(); }),
    ]).then(([l, v]) => {
      setLedgers(Array.isArray(l) ? l : []);
      setAllVouchers((Array.isArray(v) ? v : []).filter((x: any) => !isVoided(x)));
    }).catch(err => {
      setError(err.message);
    }).finally(() => setLoading(false));
  }, [branchId]);

  // Robust calculation function
  const calcBalance = useCallback((ledgerId: string) => {
    const l = ledgers.find(x => x.id === ledgerId);
    if (!l) return 0;
    
    // Opening balance logic
    let bal = (l.balanceType === 'Cr' ? -1 : 1) * Number(l.openingBalance || 0);
    
    // Voucher movement logic
    allVouchers.forEach(v => {
      const entries = Array.isArray(v.entries) ? v.entries : [];
      entries.forEach((e: any) => {
        if (String(e.ledgerId) === String(ledgerId)) {
          const amt = Number(e.amount || 0);
          bal += (e.type === 'Dr') ? amt : -amt;
        }
      });
    });
    return bal;
  }, [ledgers, allVouchers]);

  // Summarize groups
  const getGroupTotal = (groupName: string) => {
    return ledgers
      .filter(l => l.group_name === groupName || l.group === groupName)
      .reduce((sum, l) => sum + calcBalance(l.id), 0);
  };

  if (loading) return <div style={{ padding: 50, textAlign: 'center', fontFamily: 'sans-serif' }}>Loading Balance Sheet Data...</div>;
  if (error) return <div style={{ padding: 50, color: 'red', textAlign: 'center' }}>Error: {error}</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', fontSize: 12, height: '100vh', display: 'flex', flexDirection:'column', background: '#fff' }}>
      {/* Title Bar */}
      <div style={{ background: '#1f4e79', color: '#fff', padding: '6px 10px', display:'flex', justifyContent:'space-between', fontWeight: 'bold' }}>
        <span>Balance Sheet</span>
        <button onClick={onBack} style={{ color:'#fff', background:'rgba(255,255,255,0.2)', border:'1px solid #fff', cursor: 'pointer' }}>Esc: Back</button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflowY: 'auto', padding: 10 }}>
        
        {/* LIABILITIES COLUMN */}
        <div style={{ flex: 1, border: '1px solid #ccc', borderRight: 'none' }}>
          <div style={{ background: '#f0f4f8', padding: 8, fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #ccc' }}>LIABILITIES</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {LIABILITY_GROUPS.map(grp => {
                const total = getGroupTotal(grp);
                if (Math.abs(total) < 0.01) return null; // Hide empty groups
                return (
                  <tr key={grp} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}><b>{grp}</b></td>
                    <td style={{ textAlign: 'right', padding: '8px' }}>{fmtAmtAbs(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ASSETS COLUMN */}
        <div style={{ flex: 1, border: '1px solid #ccc' }}>
          <div style={{ background: '#f0f4f8', padding: 8, fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #ccc' }}>ASSETS</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {ASSET_GROUPS.map(grp => {
                const total = getGroupTotal(grp);
                if (Math.abs(total) < 0.01) return null; // Hide empty groups
                return (
                  <tr key={grp} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}><b>{grp}</b></td>
                    <td style={{ textAlign: 'right', padding: '8px' }}>{fmtAmtAbs(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* --- DEBUG PANEL (Will show if data is missing) --- */}
      <div style={{ background: '#fee', padding: '10px', borderTop: '2px solid red', maxHeight: '200px', overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 5px 0', color: 'red' }}>System Debug Info (Why is it blank?)</h4>
        <p>Total Ledgers Found: {ledgers.length}</p>
        <p>Total Vouchers Found: {allVouchers.length}</p>
        <table border={1} style={{ fontSize: 10, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#ddd' }}>
              <th>Ledger Name</th>
              <th>Group Name (From DB)</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledgers.slice(0, 10).map(l => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{l.group_name}</td>
                <td>{calcBalance(l.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ledgers.length === 0 && <p style={{ fontWeight: 'bold', color: 'red' }}>NO LEDGERS RETURNED FROM API. Check branchId or database connections.</p>}
      </div>
    </div>
  );
}
