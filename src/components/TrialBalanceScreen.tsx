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
const FONT   = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
const HDR_BG = '#1f4e79';
const YELLOW = '#ffd966';
const BORDER = '#b8c4cc';
const LIGHT  = '#f0f4f8';
const ROW_BDR = '#e0e6ee';
const MONTHS  = ["April","May","June","July","August","September","October","November","December","January","February","March"];

const fmtAmt = (n: number) =>
  n === 0 ? "" : Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const fmtDate = (iso: string) => {
  try {
    const d  = new Date(iso);
    const ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()}-${ms[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
  } catch { return iso; }
};

const isVoided = (v: any): boolean =>
  v.voided === true || v.voided === 1 || v.voided === '1';

// ─── LEVEL 4: VOUCHER DETAIL ─────────────────────────────────────────────────
function VoucherDetail({ voucherId, onBack, companyName, onPrint }: any) {
  const [voucher, setVoucher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vouchers`)
      .then(r => r.json())
      .then(data => {
        const found = data.find((v: any) => v.id === voucherId);
        setVoucher(found);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [voucherId]);

  const handlePrint = useCallback(() => {
    if (!voucher) return;
    const fmt    = (n: number) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const drTotal = (voucher.entries || []).filter((e: any) => e.type === 'Dr').reduce((a: number, b: any) => a + Number(b.amount), 0);
    const crTotal = (voucher.entries || []).filter((e: any) => e.type === 'Cr').reduce((a: number, b: any) => a + Number(b.amount), 0);

    if (onPrint) {
      onPrint({
        type: 'voucher',
        companyName,
        voucherType: voucher.type,
        voucherNo: voucher.number || '—',
        date: fmtDate(voucher.date),
        narration: voucher.narration,
        entries: (voucher.entries || []).map((e: any) => ({
          ledgerName: e.ledger_name || e.ledgerId,
          type: e.type as 'Dr' | 'Cr',
          amount: Number(e.amount),
        }))
      });
    } else {
      const html = `<!DOCTYPE html><html><head>
        <title>${voucher.type} – ${voucher.number}</title><meta charset="utf-8"/>
        <style>
          @page { margin:12mm; size:A4 portrait; }
          *{box-sizing:border-box}
          body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;margin:0;padding:0;color:#000;font-size:12px}
          .hdr{background:#1f4e79;color:#fff;text-align:center;padding:8px 12px}
          .hdr h1{margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px}
          .hdr .sub{font-size:10px;margin-top:3px;opacity:.85}
          .info{display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #ccc;background:#f0f4f8;font-size:12px}
          table{width:100%;border-collapse:collapse}
          th{background:#edf1f5;padding:5px 10px;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #ccc;text-align:left}
          td{padding:5px 10px;border-bottom:1px solid #eee;font-size:12px}
          .tr td{border-top:2px solid #555;font-weight:700;background:#f2f6fa}
          .narr{padding:8px 12px;font-size:11px;font-style:italic;color:#555;border-top:1px solid #eee}
          .sig{display:flex;justify-content:space-between;padding:40px 20px 10px}
          .sig-box{text-align:center;border-top:1px solid #000;width:140px;font-size:10px;padding-top:4px}
          .footer{text-align:right;font-size:9px;color:#888;padding:5px 10px;border-top:1px solid #ddd}
        </style>
      </head><body>
        <div class="hdr">
          <h1>${companyName || 'Company'}</h1>
          <div class="sub">${voucher.type?.toUpperCase()} VOUCHER</div>
        </div>
        <div class="info">
          <div><b>${voucher.type}</b> No. <b>${voucher.number || '—'}</b></div>
          <div>Date: <b>${fmtDate(voucher.date)}</b></div>
        </div>
        <table>
          <thead><tr>
            <th style="width:60%">Particulars</th>
            <th style="width:20%;text-align:right">Debit</th>
            <th style="width:20%;text-align:right">Credit</th>
          </tr></thead>
          <tbody>
            ${(voucher.entries || []).map((e: any) =>
              `<tr>
                <td>${e.ledger_name || e.ledgerId}</td>
                <td style="text-align:right">${e.type === 'Dr' ? fmt(e.amount) : ''}</td>
                <td style="text-align:right">${e.type === 'Cr' ? fmt(e.amount) : ''}</td>
              </tr>`
            ).join('')}
            <tr class="tr">
              <td>Total</td>
              <td style="text-align:right">${fmt(drTotal)}</td>
              <td style="text-align:right">${fmt(crTotal)}</td>
            </tr>
          </tbody>
        </table>
        ${voucher.narration ? `<div class="narr"><b>Narration:</b> ${voucher.narration}</div>` : ''}
        <div class="sig">
          <div class="sig-box">Prepared by</div>
          <div class="sig-box">Verified by</div>
          <div class="sig-box">Authorised Signatory</div>
        </div>
        <div class="footer">Printed on ${new Date().toLocaleString('en-IN')} | ${companyName}</div>
      </body></html>`;

      const win = window.open('', '_blank', 'width=800,height=650');
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 400); }
    }
  }, [voucher, companyName, onPrint]);

  // Keyboard: Escape = back, Alt+P = print
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onBack(); return; }
      if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); e.stopPropagation(); handlePrint(); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onBack, handlePrint]);

  if (loading) return <div style={{ ...ds.root, padding: 20 }}>Loading Voucher…</div>;
  if (!voucher) return (
    <div style={{ ...ds.root, padding: 20 }}>
      Voucher not found.{' '}
      <button onClick={onBack}>Back</button>
    </div>
  );

  const drTotal = voucher.entries?.filter((e: any) => e.type === 'Dr').reduce((a: number, b: any) => a + Number(b.amount), 0) || 0;
  const crTotal = voucher.entries?.filter((e: any) => e.type === 'Cr').reduce((a: number, b: any) => a + Number(b.amount), 0) || 0;

  return (
    <div style={ds.root}>
      <div style={ds.titleBar}>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onBack} style={ds.backBtn}>← Back (Esc)</button>
          <span>Voucher Detail: {voucher.number}</span>
        </div>
        <button onClick={handlePrint} style={ds.backBtn}>Print (Alt+P)</button>
      </div>

      <div style={{ padding:20, flex:1, overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20, borderBottom:'1px solid #ccc', paddingBottom:10 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:'bold' }}>Type: {voucher.type}</div>
            <div style={{ fontSize:12, color:'#666' }}>Date: {fmtDate(voucher.date)}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:14, fontWeight:'bold' }}>No: {voucher.number}</div>
          </div>
        </div>

        <table style={{ ...ds.table, border:'1px solid #ccc' }}>
          <thead>
            <tr style={ds.thead}>
              <th style={{ ...ds.th, width:'60%' }}>Particulars</th>
              <th style={{ ...ds.th, width:'20%', textAlign:'right' }}>Debit</th>
              <th style={{ ...ds.th, width:'20%', textAlign:'right' }}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {voucher.entries?.map((e: any, i: number) => (
              <tr key={i} style={ds.tr}>
                <td style={ds.td}>{e.ledger_name || e.ledgerId}</td>
                <td style={{ ...ds.td, textAlign:'right' }}>{e.type === 'Dr' ? fmtAmt(e.amount) : ''}</td>
                <td style={{ ...ds.td, textAlign:'right' }}>{e.type === 'Cr' ? fmtAmt(e.amount) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot style={ds.tfoot}>
            <tr>
              <td style={ds.tdTotal}>Total</td>
              <td style={{ ...ds.tdTotal, textAlign:'right' }}>{fmtAmt(drTotal)}</td>
              <td style={{ ...ds.tdTotal, textAlign:'right' }}>{fmtAmt(crTotal)}</td>
            </tr>
          </tfoot>
        </table>

        {voucher.narration && (
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:11, fontWeight:'bold', color:'#666' }}>Narration:</div>
            <div style={{ fontSize:12, fontStyle:'italic' }}>{voucher.narration}</div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={ds.statusBar}>
        <span style={{ color:'#aaa', fontSize:10 }}>{companyName}</span>
        <span style={{ color:'#aaa', fontSize:10 }}>Esc: Back &nbsp;|&nbsp; Alt+P: Print Voucher</span>
      </div>
    </div>
  );
}

// ─── LEVEL 3: VOUCHER REGISTER ───────────────────────────────────────────────
function VoucherRegister({ ledger, monthIdx, branchId, onBack, onDrill, companyName, onPrint }: any) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [selIdx, setSelIdx]     = useState(0);

  useEffect(() => {
    const fiscalMonth = (monthIdx + 3) % 12;
    fetch(`/api/vouchers/ledger/${ledger.id}?branchId=${branchId || ''}`)
      .then(r => r.json())
      .then(data =>
        setVouchers(
          (Array.isArray(data) ? data : [])
            .filter((v: any) => !isVoided(v))
            .filter((v: any) => new Date(v.date).getMonth() === fiscalMonth)
        )
      )
      .catch(() => setVouchers([]));
  }, [ledger.id, monthIdx, branchId]);

  const handlePrint = useCallback(() => {
    const fmt = (n: number) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    let running = 0;
    const printRows = vouchers.map(v => {
      const amt  = Number(v.entry_amount);
      const isDr = v.entry_type === 'Dr';
      running   += isDr ? amt : -amt;
      return {
        date: fmtDate(v.date),
        particulars: `${v.other_ledger_name || 'Multiple Ledgers'}${v.narration ? ` - ${v.narration}` : ''}`,
        vchType: v.type || 'Journal',
        vchNo: v.number || '-',
        debit: isDr ? amt : undefined,
        credit: !isDr ? amt : undefined,
        balance: Math.abs(running),
        runType: running >= 0 ? ('Dr' as const) : ('Cr' as const)
      };
    });
    const drTot = vouchers.filter(v => v.entry_type === 'Dr').reduce((a, v) => a + Number(v.entry_amount), 0);
    const crTot = vouchers.filter(v => v.entry_type === 'Cr').reduce((a, v) => a + Number(v.entry_amount), 0);

    if (onPrint) {
      onPrint({
        type: 'ledger',
        companyName,
        ledgerName: ledger.name,
        period: `${MONTHS[monthIdx]}`,
        openingBalance: 0,
        balanceType: 'Dr',
        rows: printRows,
        closingBalance: Math.abs(running),
        closingType: running >= 0 ? 'Dr' : 'Cr'
      });
    } else {
      const htmlRows = vouchers.map(v => {
        const amt  = Number(v.entry_amount);
        const isDr = v.entry_type === 'Dr';
        const runAmt = isDr ? amt : -amt;
        const localRun = running; // approximation or recalculate
        return `<tr>
          <td style="padding:3px 8px;border-bottom:1px solid #eee">${fmtDate(v.date)}</td>
          <td style="padding:3px 8px;border-bottom:1px solid #eee;font-weight:600">
            ${v.other_ledger_name || 'Multiple Ledgers'}
            ${v.narration ? `<div style="font-size:10px;font-style:italic;color:#777">${v.narration}</div>` : ''}
          </td>
          <td style="padding:3px 8px;border-bottom:1px solid #eee">${v.type || 'Journal'}</td>
          <td style="padding:3px 8px;border-bottom:1px solid #eee;text-align:center">${v.number || '-'}</td>
          <td style="padding:3px 8px;border-bottom:1px solid #eee;text-align:right;color:#7a0000">${isDr ? fmt(amt) : ''}</td>
          <td style="padding:3px 8px;border-bottom:1px solid #eee;text-align:right;color:#006b00">${!isDr ? fmt(amt) : ''}</td>
          <td style="padding:3px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${fmt(localRun)} ${localRun >= 0 ? 'Dr' : 'Cr'}</td>
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head>
        <title>Ledger – ${ledger.name}</title><meta charset="utf-8"/>
        <style>
          @page{margin:12mm;size:A4 landscape}
          *{box-sizing:border-box}
          body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;margin:0;padding:0;color:#000;font-size:12px}
          .hdr{background:#1f4e79;color:#fff;text-align:center;padding:8px 12px}
          .hdr h1{margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px}
          .hdr .sub{font-size:10px;margin-top:3px;opacity:.85}
          table{width:100%;border-collapse:collapse}
          thead tr{background:#2c5f8a;color:#fff}
          th{padding:5px 8px;font-size:10px;font-weight:800;letter-spacing:1px;text-align:left}
          .tfoot td{border-top:2px solid #1f4e79;font-weight:900;font-size:12px;background:#e8f0f8;padding:5px 8px}
          .footer{text-align:right;font-size:9px;color:#888;padding:5px 10px;border-top:1px solid #ddd;margin-top:4px}
        </style>
      </head><body>
        <div class="hdr">
          <h1>${companyName || 'Company'}</h1>
          <div class="sub">LEDGER: ${ledger.name} &nbsp;·&nbsp; ${MONTHS[monthIdx]}</div>
        </div>
        <table>
          <thead><tr>
            <th style="width:80px">Date</th><th>Particulars</th><th style="width:80px">Vch Type</th>
            <th style="width:70px;text-align:center">Vch No.</th>
            <th style="width:110px;text-align:right">Debit</th>
            <th style="width:110px;text-align:right">Credit</th>
            <th style="width:120px;text-align:right">Balance</th>
          </tr></thead>
          <tbody>${htmlRows}</tbody>
          <tfoot><tr class="tfoot">
            <td colspan="4" style="text-align:right;padding-right:12px">Grand Total</td>
            <td style="text-align:right">${fmt(drTot)}</td>
            <td style="text-align:right">${fmt(crTot)}</td>
            <td style="text-align:right">${fmt(running)} ${running >= 0 ? 'Dr' : 'Cr'}</td>
          </tr></tfoot>
        </table>
        <div class="footer">Printed on ${new Date().toLocaleString('en-IN')} | ${companyName}</div>
      </body></html>`;

      const win = window.open('', '_blank', 'width=1000,height=700');
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 400); }
    }
  }, [vouchers, ledger, monthIdx, companyName, onPrint]);

  // Keyboard: Escape = back, arrows + enter = navigate, Alt+P = print
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onBack(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(s => Math.min(vouchers.length - 1, s + 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(s => Math.max(0, s - 1)); return; }
      if (e.key === 'Enter')     { e.preventDefault(); if (vouchers[selIdx]) onDrill(vouchers[selIdx].id); return; }
      if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); e.stopPropagation(); handlePrint(); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [vouchers, selIdx, onDrill, onBack, handlePrint]);

  const totals = useMemo(() =>
    vouchers.reduce((acc, v) => {
      if (v.entry_type === 'Dr') acc.dr += Number(v.entry_amount);
      else acc.cr += Number(v.entry_amount);
      return acc;
    }, { dr:0, cr:0 }),
  [vouchers]);

  return (
    <div style={ds.root}>
      <div style={ds.titleBar}>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onBack} style={ds.backBtn}>← Back (Esc)</button>
          <span>{ledger.name} ({MONTHS[monthIdx]})</span>
        </div>
        <button onClick={handlePrint} style={ds.backBtn}>Print (Alt+P)</button>
      </div>

      <div style={ds.tableWrap}>
        <table style={ds.table}>
          <thead>
            <tr style={ds.thead}>
              <th style={ds.th}>Date</th>
              <th style={ds.th}>Particulars</th>
              <th style={{ ...ds.th, textAlign:'right' }}>Debit</th>
              <th style={{ ...ds.th, textAlign:'right' }}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v, i) => (
              <tr
                key={i}
                style={{ ...ds.tr, background: selIdx === i ? YELLOW : 'transparent' }}
                onClick={() => onDrill(v.id)}
              >
                <td style={ds.td}>{fmtDate(v.date)}</td>
                <td style={ds.td}>
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    <span style={{ fontWeight:600 }}>{v.other_ledger_name || 'Multiple Ledgers'}</span>
                    {v.narration && (
                      <span style={{ fontSize:10, color:'#666', fontStyle:'italic', marginTop:2 }}>{v.narration}</span>
                    )}
                  </div>
                </td>
                <td style={{ ...ds.td, textAlign:'right', color:'#7a0000' }}>{v.entry_type === 'Dr' ? fmtAmt(v.entry_amount) : ''}</td>
                <td style={{ ...ds.td, textAlign:'right', color:'#006b00' }}>{v.entry_type === 'Cr' ? fmtAmt(v.entry_amount) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot style={ds.tfoot}>
            <tr>
              <td colSpan={2} style={ds.tdTotal}>Grand Total</td>
              <td style={{ ...ds.tdTotal, textAlign:'right' }}>{fmtAmt(totals.dr)}</td>
              <td style={{ ...ds.tdTotal, textAlign:'right' }}>{fmtAmt(totals.cr)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Status bar */}
      <div style={ds.statusBar}>
        <span style={{ color:'#aaa', fontSize:10 }}>{companyName}</span>
        <span style={{ color:'#aaa', fontSize:10 }}>↑↓: Navigate &nbsp;|&nbsp; Enter: Open &nbsp;|&nbsp; Esc: Back &nbsp;|&nbsp; Alt+P: Print</span>
      </div>
    </div>
  );
}

// ─── LEVEL 2: MONTHLY SUMMARY ────────────────────────────────────────────────
function LedgerMonthlySummary({ ledger, branchId, onBack, onDrill, companyName, onPrint }: any) {
  const [data, setData]     = useState<any[]>([]);
  const [selIdx, setSelIdx] = useState(0);

  useEffect(() => {
    fetch(`/api/vouchers/ledger/${ledger.id}?branchId=${branchId || ''}`)
      .then(r => r.json())
      .then(vouchers => {
        const active  = vouchers.filter((v: any) => !isVoided(v));
        const summary = MONTHS.map((m, i) => {
          const fiscalMonth = (i + 3) % 12;
          const vchs = active.filter((v: any) => new Date(v.date).getMonth() === fiscalMonth);
          const dr   = vchs.filter((v: any) => v.entry_type === 'Dr').reduce((a: number, b: any) => a + Number(b.entry_amount), 0);
          const cr   = vchs.filter((v: any) => v.entry_type === 'Cr').reduce((a: number, b: any) => a + Number(b.entry_amount), 0);
          return { month:m, dr, cr, monthIdx:i };
        });
        setData(summary);
      });
  }, [ledger.id, branchId]);

  // ── FIX: handlePrint for monthly summary ──────────────────────────
  const handlePrint = useCallback(() => {
    const fmt    = (n: number) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const opening = (ledger.balanceType === 'Cr' ? -1 : 1) * Number(ledger.openingBalance || 0);
    let running   = opening;

    const printRows = data.map(row => {
      running += (row.dr - row.cr);
      return {
        date: row.month,
        particulars: `Monthly Summary - ${row.month}`,
        vchType: '',
        vchNo: '',
        debit: row.dr > 0 ? row.dr : undefined,
        credit: row.cr > 0 ? row.cr : undefined,
        balance: Math.abs(running),
        runType: running >= 0 ? ('Dr' as const) : ('Cr' as const)
      };
    });

    const totalDr = data.reduce((a, b) => a + b.dr, 0);
    const totalCr = data.reduce((a, b) => a + b.cr, 0);
    const closing = opening + (totalDr - totalCr);

    if (onPrint) {
      onPrint({
        type: 'ledger',
        companyName,
        ledgerName: `${ledger.name} (Monthly Summary)`,
        period: 'All Months',
        openingBalance: Math.abs(opening),
        balanceType: opening >= 0 ? 'Dr' : 'Cr',
        rows: printRows,
        closingBalance: Math.abs(closing),
        closingType: closing >= 0 ? 'Dr' : 'Cr'
      });
    } else {
      let runBal = opening;
      const htmlRows = data.map(row => {
        runBal += (row.dr - row.cr);
        return `<tr>
          <td style="padding:4px 10px;border-bottom:1px solid #eee">${row.month}</td>
          <td style="padding:4px 10px;border-bottom:1px solid #eee;text-align:right;color:#7a0000">${row.dr > 0 ? fmt(row.dr) : ''}</td>
          <td style="padding:4px 10px;border-bottom:1px solid #eee;text-align:right;color:#006b00">${row.cr > 0 ? fmt(row.cr) : ''}</td>
          <td style="padding:4px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${fmt(runBal)} ${runBal >= 0 ? 'Dr' : 'Cr'}</td>
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head>
        <title>Monthly Summary – ${ledger.name}</title><meta charset="utf-8"/>
        <style>
          @page{margin:12mm;size:A4 portrait}
          *{box-sizing:border-box}
          body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;margin:0;padding:0;color:#000;font-size:12px}
          .hdr{background:#1f4e79;color:#fff;text-align:center;padding:8px 12px}
          .hdr h1{margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px}
          .hdr .sub{font-size:10px;margin-top:3px;opacity:.85}
          .meta{display:flex;justify-content:space-between;padding:5px 12px;background:#f0f4f8;border-bottom:1px solid #b8c4cc;font-size:11px}
          table{width:100%;border-collapse:collapse}
          thead tr{background:#2c5f8a;color:#fff}
          th{padding:5px 10px;font-size:10px;font-weight:800;letter-spacing:1px;text-align:left}
          .tfoot td{border-top:2px solid #1f4e79;font-weight:900;font-size:12px;background:#e8f0f8;padding:5px 10px}
          .footer{text-align:right;font-size:9px;color:#888;padding:5px 10px;border-top:1px solid #ddd;margin-top:4px}
        </style>
      </head><body>
        <div class="hdr">
          <h1>${companyName || 'Company'}</h1>
          <div class="sub">MONTHLY SUMMARY: ${ledger.name}</div>
        </div>
        <div class="meta">
          <span><b>Group:</b> ${ledger.group_name || ledger.group || '—'}</span>
          <span><b>Opening Balance:</b> ${fmt(Math.abs(opening))} ${opening >= 0 ? 'Dr' : 'Cr'}</span>
          <span><b>Closing Balance:</b> ${fmt(Math.abs(closing))} ${closing >= 0 ? 'Dr' : 'Cr'}</span>
        </div>
        <table>
          <thead><tr>
            <th style="width:35%">Month</th>
            <th style="width:22%;text-align:right">Debit</th>
            <th style="width:22%;text-align:right">Credit</th>
            <th style="width:21%;text-align:right">Balance</th>
          </tr></thead>
          <tbody>${htmlRows}</tbody>
          <tfoot><tr class="tfoot">
            <td>Grand Total</td>
            <td style="text-align:right">${fmt(totalDr)}</td>
            <td style="text-align:right">${fmt(totalCr)}</td>
            <td style="text-align:right">${fmt(Math.abs(closing))} ${closing >= 0 ? 'Dr' : 'Cr'}</td>
          </tr></tfoot>
        </table>
        <div class="footer">Printed on ${new Date().toLocaleString('en-IN')} | ${companyName}</div>
      </body></html>`;

      const win = window.open('', '_blank', 'width=800,height=650');
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 400); }
    }
  }, [data, ledger, companyName, onPrint]);

  // Keyboard: Escape = back, arrows + enter = navigate, Alt+P = print
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')    { e.preventDefault(); e.stopPropagation(); onBack(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(s => Math.min(11, s + 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(s => Math.max(0, s - 1)); return; }
      if (e.key === 'Enter')     { e.preventDefault(); onDrill(data[selIdx]?.monthIdx); return; }
      if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); e.stopPropagation(); handlePrint(); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [selIdx, data, onDrill, onBack, handlePrint]);

  const totals = useMemo(() => {
    const dr      = data.reduce((a, b) => a + b.dr, 0);
    const cr      = data.reduce((a, b) => a + b.cr, 0);
    const opening = (ledger.balanceType === 'Cr' ? -1 : 1) * Number(ledger.openingBalance || 0);
    const closing = opening + (dr - cr);
    return { dr, cr, closing };
  }, [data, ledger]);

  let running = (ledger.balanceType === 'Cr' ? -1 : 1) * Number(ledger.openingBalance || 0);

  return (
    <div style={ds.root}>
      <div style={ds.titleBar}>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onBack} style={ds.backBtn}>← Back (Esc)</button>
          <span>Monthly Summary: {ledger.name}</span>
        </div>
        {/* FIX: Print button added to monthly summary */}
        <button onClick={handlePrint} style={ds.backBtn}>Print (Alt+P)</button>
      </div>

      <div style={ds.tableWrap}>
        <table style={ds.table}>
          <thead>
            <tr style={ds.thead}>
              <th style={ds.th}>Month</th>
              <th style={{ ...ds.th, textAlign:'right' }}>Debit</th>
              <th style={{ ...ds.th, textAlign:'right' }}>Credit</th>
              <th style={{ ...ds.th, textAlign:'right' }}>Closing</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              running += (row.dr - row.cr);
              return (
                <tr
                  key={i}
                  style={{ ...ds.tr, background: selIdx === i ? YELLOW : 'transparent' }}
                  onClick={() => onDrill(row.monthIdx)}
                >
                  <td style={ds.td}>{row.month}</td>
                  <td style={{ ...ds.td, textAlign:'right' }}>{fmtAmt(row.dr)}</td>
                  <td style={{ ...ds.td, textAlign:'right' }}>{fmtAmt(row.cr)}</td>
                  <td style={{ ...ds.td, textAlign:'right', fontWeight:600 }}>
                    {fmtAmt(running)} {running >= 0 ? 'Dr' : 'Cr'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot style={ds.tfoot}>
            <tr style={{ borderTop:'2px solid #333' }}>
              <td style={ds.tdTotal}>Grand Total</td>
              <td style={{ ...ds.tdTotal, textAlign:'right' }}>{fmtAmt(totals.dr)}</td>
              <td style={{ ...ds.tdTotal, textAlign:'right' }}>{fmtAmt(totals.cr)}</td>
              <td style={{ ...ds.tdTotal, textAlign:'right' }}>
                {fmtAmt(totals.closing)} {totals.closing >= 0 ? 'Dr' : 'Cr'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Status bar */}
      <div style={ds.statusBar}>
        <span style={{ color:'#aaa', fontSize:10 }}>{companyName}</span>
        <span style={{ color:'#aaa', fontSize:10 }}>↑↓: Navigate &nbsp;|&nbsp; Enter: Open Month &nbsp;|&nbsp; Esc: Back &nbsp;|&nbsp; Alt+P: Print</span>
      </div>
    </div>
  );
}

// ─── LEVEL 1: TRIAL BALANCE ──────────────────────────────────────────────────
export default function TrialBalanceScreen({
  branchId,
  onBackToGateway,
  onPrint,
}: {
  branchId?: string;
  onBackToGateway?: () => void;
  onPrint?: (data: any) => void;
}) {
  const [ledgers, setLedgers]             = useState<Ledger[]>([]);
  const [vouchers, setVouchers]           = useState<any[]>([]);
  // FIX: company name fetched from settings/branches, not ledger[0].company_name
  const [companyName, setCompanyName]     = useState('');

  const [viewLevel, setViewLevel]         = useState<'trial' | 'monthly' | 'vouchers' | 'voucher_detail'>('trial');
  const [selectedLedger, setSelectedLedger]         = useState<Ledger | null>(null);
  const [selectedMonthIdx, setSelectedMonthIdx]     = useState<number>(0);
  const [selectedVoucherId, setSelectedVoucherId]   = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups]         = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey]               = useState<string | null>(null);
  const [searchQuery, setSearchQuery]               = useState('');
  const [isDetailed, setIsDetailed]                 = useState(false);

  // ── FIX: Fetch company name from settings + branches ──────────────
  useEffect(() => {
    // 1. Try /api/settings/company first (most reliable)
    fetch('/api/settings/company')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setCompanyName(d.name); })
      .catch(() => {});

    // 2. Also try /api/branches for the active branch name
    fetch('/api/branches')
      .then(r => r.json())
      .then((branches: any[]) => {
        if (!Array.isArray(branches) || branches.length === 0) return;
        const br = branchId ? branches.find(b => b.id === branchId) : branches[0];
        if (br?.name) setCompanyName(br.name);
      })
      .catch(() => {});
  }, [branchId]);

  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/ledgers${q}`).then(r => r.json()),
      fetch(`/api/vouchers${q}`).then(r => r.json()),
    ]).then(([l, v]) => {
      setLedgers(Array.isArray(l) ? l : []);
      setVouchers((Array.isArray(v) ? v : []).filter((x: any) => !isVoided(x)));
      if (Array.isArray(l) && l.length > 0) setSelectedKey(`G:${l[0].group_name || 'Primary'}`);
    });
  }, [branchId]);

  // Pre-calculate balances
  const ledgerBalances = useMemo(() => {
    const bals: Record<string, number> = {};
    ledgers.forEach(l => {
      bals[l.id] = (l.balanceType === 'Cr' ? -1 : 1) * Number(l.openingBalance || 0);
    });
    vouchers.forEach((v: any) => {
      const entries = v.entries || [v];
      entries.forEach((e: any) => {
        if (bals[e.ledgerId] !== undefined) {
          bals[e.ledgerId] += (e.type === 'Dr' || e.entry_type === 'Dr')
            ? Number(e.amount || e.entry_amount || 0)
            : -Number(e.amount || e.entry_amount || 0);
        }
      });
    });
    return bals;
  }, [ledgers, vouchers]);

  const groupsData = useMemo(() => {
    const g: Record<string, { dr:number; cr:number; ledgers:Ledger[] }> = {};
    ledgers.forEach(l => {
      const grp = l.group_name || 'Primary';
      if (!g[grp]) g[grp] = { dr:0, cr:0, ledgers:[] };
      g[grp].ledgers.push(l);
      const bal = ledgerBalances[l.id];
      if (bal >= 0) g[grp].dr += bal; else g[grp].cr += Math.abs(bal);
    });
    return g;
  }, [ledgers, ledgerBalances]);

  const sortedGroups = useMemo(() =>
    Object.keys(groupsData)
      .filter(grp => {
        if (!searchQuery) return true;
        return grp.toLowerCase().includes(searchQuery.toLowerCase()) ||
          groupsData[grp].ledgers.some(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
      })
      .sort(),
  [groupsData, searchQuery]);

  const grandTotals = useMemo(() =>
    sortedGroups.reduce((acc, grp) => {
      acc.dr += groupsData[grp].dr;
      acc.cr += groupsData[grp].cr;
      return acc;
    }, { dr:0, cr:0 }),
  [sortedGroups, groupsData]);

  const flatList = useMemo(() => {
    const list: any[] = [];
    sortedGroups.forEach(grp => {
      list.push({ key:`G:${grp}`, type:'group', name:grp });
      if (isDetailed || expandedGroups.has(grp)) {
        groupsData[grp].ledgers
          .filter(l => !searchQuery ||
            l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            grp.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .forEach(l => list.push({ key:`L:${l.id}`, type:'ledger', ledger:l }));
      }
    });
    return list;
  }, [sortedGroups, expandedGroups, groupsData, isDetailed, searchQuery]);

  // ── Print (Trial Balance) ──────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const fmt = (n: number) => n === 0 ? '' : Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const now = new Date().toLocaleString('en-IN');

    if (onPrint) {
      const printRows: any[] = [];
      sortedGroups.forEach(grp => {
        const g = groupsData[grp];
        printRows.push({
          particulars: grp,
          isGroup: true,
          level: 0,
          clDr: g.dr > 0 ? g.dr : undefined,
          clCr: g.cr > 0 ? g.cr : undefined
        });
        if (isDetailed || expandedGroups.has(grp)) {
          g.ledgers.forEach(l => {
            const b = ledgerBalances[l.id];
            if (b === 0) return;
            printRows.push({
              particulars: l.name,
              isGroup: false,
              level: 1,
              clDr: b > 0 ? b : undefined,
              clCr: b < 0 ? Math.abs(b) : undefined
            });
          });
        }
      });

      onPrint({
        type: 'trial_balance',
        companyName,
        period: 'All Dates',
        rows: printRows,
        totals: {
          opDr: 0,
          opCr: 0,
          transDr: 0,
          transCr: 0,
          clDr: grandTotals.dr,
          clCr: grandTotals.cr
        },
        isDetailed
      });
    } else {
      const groupRows = sortedGroups.map(grp => {
        const g = groupsData[grp];
        const ledgerSubRows = (isDetailed || expandedGroups.has(grp))
          ? g.ledgers.map(l => {
              const b = ledgerBalances[l.id];
              if (b === 0) return '';
              return `<tr style="background:#fff">
                <td style="padding:2px 8px 2px 24px;font-size:11px;border-bottom:1px solid #eee;color:#444">${l.name}</td>
                <td style="padding:2px 10px;text-align:right;font-size:11px;border-bottom:1px solid #eee;color:#444">${b > 0 ? fmt(b) : ''}</td>
                <td style="padding:2px 10px;text-align:right;font-size:11px;border-bottom:1px solid #eee;color:#444">${b < 0 ? fmt(Math.abs(b)) : ''}</td>
              </tr>`;
            }).join('')
          : '';
        return `
          <tr style="background:#f2f6fa">
            <td style="padding:4px 10px;font-weight:700;font-size:12px;border-bottom:1px solid #c5d2dc;border-top:1px solid #c5d2dc">${grp}</td>
            <td style="padding:4px 10px;text-align:right;font-weight:700;font-size:12px;border-bottom:1px solid #c5d2dc;border-top:1px solid #c5d2dc">${fmt(g.dr)}</td>
            <td style="padding:4px 10px;text-align:right;font-weight:700;font-size:12px;border-bottom:1px solid #c5d2dc;border-top:1px solid #c5d2dc">${fmt(g.cr)}</td>
          </tr>${ledgerSubRows}`;
      }).join('');

      const html = `<!DOCTYPE html><html><head>
        <title>Trial Balance</title><meta charset="utf-8"/>
        <style>
          @page{margin:12mm;size:A4 portrait}
          *{box-sizing:border-box}
          body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;margin:0;padding:0;color:#000;font-size:12px}
          .hdr{background:#1f4e79;color:#fff;text-align:center;padding:8px 12px}
          .hdr h1{margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px}
          .hdr .sub{font-size:10px;margin-top:3px;opacity:.85;letter-spacing:.5px}
          table{width:100%;border-collapse:collapse}
          .col-hdr{background:#2c5f8a;color:#fff;text-align:center;font-size:10px;font-weight:800;padding:4px 10px;letter-spacing:2px}
          .total td{border-top:2px solid #1f4e79;border-bottom:2px solid #1f4e79;font-weight:900;font-size:13px;background:#e8f0f8;padding:5px 10px}
          .footer{text-align:right;font-size:9px;color:#888;padding:5px 10px;border-top:1px solid #ddd;margin-top:4px}
          @media print{.footer{position:fixed;bottom:0;right:0;left:0}}
        </style>
      </head><body>
        <div class="hdr">
          <h1>${companyName || 'Company'}</h1>
          <div class="sub">TRIAL BALANCE${isDetailed ? ' — DETAILED' : ''}</div>
        </div>
        <table>
          <tr>
            <th class="col-hdr" style="text-align:left;width:60%">PARTICULARS</th>
            <th class="col-hdr" style="width:20%">DEBIT</th>
            <th class="col-hdr" style="width:20%">CREDIT</th>
          </tr>
          ${groupRows}
          <tr class="total">
            <td>Grand Total</td>
            <td style="text-align:right">${fmt(grandTotals.dr)}</td>
            <td style="text-align:right">${fmt(grandTotals.cr)}</td>
          </tr>
        </table>
        <div class="footer">Printed on ${now} | ${companyName}</div>
      </body></html>`;

      const win = window.open('', '_blank', 'width=800,height=650');
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 400); }
    }
  }, [sortedGroups, groupsData, ledgerBalances, isDetailed, expandedGroups, grandTotals, companyName, onPrint]);

  const handleExport = useCallback(() => {
    const exportData = sortedGroups.flatMap(grp => {
      const rows: any[] = [{ Particulars: grp, Debit: groupsData[grp].dr || '', Credit: groupsData[grp].cr || '' }];
      if (isDetailed || expandedGroups.has(grp)) {
        groupsData[grp].ledgers.forEach(l => {
          const b = ledgerBalances[l.id];
          rows.push({ Particulars: `  ${l.name}`, Debit: b >= 0 ? b : '', Credit: b < 0 ? Math.abs(b) : '' });
        });
      }
      return rows;
    });
    import('../lib/ReportUtils').then(mu => mu.exportToExcel(exportData, 'Trial_Balance'));
  }, [sortedGroups, groupsData, ledgerBalances, isDetailed, expandedGroups]);

  // ── Keyboard (Trial Balance level) ────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // Sub-views handle their own Escape; only handle when on trial view
      if (viewLevel !== 'trial') return;

      if (e.key === 'Escape') {
        e.preventDefault(); e.stopImmediatePropagation();
        if (onBackToGateway) onBackToGateway();
        return;
      }

      if (e.altKey && (e.key === 'F1' || e.key === 'F5')) {
        e.preventDefault(); setIsDetailed(prev => !prev); return;
      }
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault(); handlePrint(); return;
      }
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault(); handleExport(); return;
      }

      const idx = flatList.findIndex(x => x.key === selectedKey);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const n = flatList[Math.min(flatList.length - 1, idx + 1)];
        if (n) setSelectedKey(n.key);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const p = flatList[Math.max(0, idx - 1)];
        if (p) setSelectedKey(p.key);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const curr = flatList[idx];
        if (curr?.type === 'group') {
          const n = new Set(expandedGroups);
          n.has(curr.name) ? n.delete(curr.name) : n.add(curr.name);
          setExpandedGroups(n);
        } else if (curr?.type === 'ledger') {
          setSelectedLedger(curr.ledger);
          setViewLevel('monthly');
        }
      }
    };
    window.addEventListener('keydown', h, { capture:true });
    return () => window.removeEventListener('keydown', h, { capture:true });
  }, [selectedKey, flatList, expandedGroups, viewLevel, isDetailed, onBackToGateway, handlePrint, handleExport]);

  // ── Sub-view routing ───────────────────────────────────────────────
  if (viewLevel === 'voucher_detail' && selectedVoucherId) {
    return (
      <VoucherDetail
        voucherId={selectedVoucherId}
        onBack={() => setViewLevel('vouchers')}
        companyName={companyName}
        onPrint={onPrint}
      />
    );
  }
  if (viewLevel === 'vouchers' && selectedLedger) {
    return (
      <VoucherRegister
        ledger={selectedLedger}
        monthIdx={selectedMonthIdx}
        branchId={branchId}
        onBack={() => setViewLevel('monthly')}
        onDrill={(vId: string) => { setSelectedVoucherId(vId); setViewLevel('voucher_detail'); }}
        companyName={companyName}
        onPrint={onPrint}
      />
    );
  }
  if (viewLevel === 'monthly' && selectedLedger) {
    return (
      <LedgerMonthlySummary
        ledger={selectedLedger}
        branchId={branchId}
        onBack={() => setViewLevel('trial')}
        onDrill={(mIdx: number) => { setSelectedMonthIdx(mIdx); setViewLevel('vouchers'); }}
        companyName={companyName}
        onPrint={onPrint}
      />
    );
  }

  // ── Main Trial Balance render ──────────────────────────────────────
  return (
    <div style={ds.root}>
      <div style={ds.titleBar}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {onBackToGateway && (
            <button onClick={onBackToGateway} style={ds.backBtn}>← Back (Esc)</button>
          )}
          <span style={{ fontWeight:700 }}>Trial Balance</span>
          {/* FIX: Show company name in title bar */}
          {companyName && (
            <span style={{ fontWeight:800, fontSize:12, opacity:0.9 }}>— {companyName}</span>
          )}
          <div style={{ background:'#fff', padding:'2px 5px', borderRadius:2, display:'flex', alignItems:'center' }}>
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border:'none', outline:'none', fontSize:10, width:150, color:'#333' }}
            />
          </div>
        </div>
        <div style={{ display:'flex', gap:5 }}>
          <button onClick={() => setIsDetailed(!isDetailed)} style={ds.backBtn}>
            {isDetailed ? 'Condensed' : 'Detailed'} (Alt+F1)
          </button>
          <button onClick={handlePrint}  style={ds.backBtn}>Print (Alt+P)</button>
          <button onClick={handleExport} style={ds.backBtn}>Export (Alt+E)</button>
        </div>
      </div>

      <div style={ds.tableWrap}>
        <table style={ds.table}>
          <thead>
            <tr style={ds.thead}>
              <th style={s.colParticulars}>Particulars</th>
              <th style={s.colDebit}>Debit</th>
              <th style={s.colCredit}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map(grp => (
              <React.Fragment key={grp}>
                <tr
                  style={{ ...s.groupRow, background: selectedKey === `G:${grp}` ? YELLOW : 'transparent' }}
                  onClick={() => setSelectedKey(`G:${grp}`)}
                >
                  <td style={s.colParticulars}><b>{grp}</b></td>
                  <td style={s.colDebit}>{fmtAmt(groupsData[grp].dr)}</td>
                  <td style={s.colCredit}>{fmtAmt(groupsData[grp].cr)}</td>
                </tr>
                {(isDetailed || expandedGroups.has(grp)) &&
                  groupsData[grp].ledgers.map(l => {
                    const b = ledgerBalances[l.id];
                    if (searchQuery &&
                      !l.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                      !grp.toLowerCase().includes(searchQuery.toLowerCase())
                    ) return null;
                    return (
                      <tr
                        key={l.id}
                        style={{ ...s.ledgerRow, background: selectedKey === `L:${l.id}` ? YELLOW : 'transparent' }}
                        onClick={() => setSelectedKey(`L:${l.id}`)}
                        onDoubleClick={() => { setSelectedLedger(l); setViewLevel('monthly'); }}
                      >
                        <td style={{ ...s.colParticulars, paddingLeft:30 }}>{l.name}</td>
                        <td style={s.colDebit}>{b >= 0 ? fmtAmt(b) : ''}</td>
                        <td style={s.colCredit}>{b < 0 ? fmtAmt(Math.abs(b)) : ''}</td>
                      </tr>
                    );
                  })
                }
              </React.Fragment>
            ))}
          </tbody>
          <tfoot style={ds.tfoot}>
            <tr style={{ borderTop:'2px solid #333' }}>
              <td style={s.colParticulars}><b>Grand Total</b></td>
              <td style={{ ...s.colDebit,  fontWeight:'bold' }}>{fmtAmt(grandTotals.dr)}</td>
              <td style={{ ...s.colCredit, fontWeight:'bold' }}>{fmtAmt(grandTotals.cr)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Status bar */}
      <div style={ds.statusBar}>
        <span style={{ color:'#aaa', fontSize:10 }}>{companyName}</span>
        <span style={{ color:'#aaa', fontSize:10 }}>
          ↑↓: Navigate &nbsp;|&nbsp; Enter: Expand/Open &nbsp;|&nbsp; Alt+F1: Detailed &nbsp;|&nbsp; Alt+P: Print &nbsp;|&nbsp; Alt+E: Export
        </span>
      </div>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const ds: Record<string, React.CSSProperties> = {
  root:      { fontFamily:FONT, fontSize:12, height:'100vh', display:'flex', flexDirection:'column', background:'#fff', overflow:'hidden' },
  titleBar:  { background:HDR_BG, color:'#fff', padding:'4px 10px', display:'flex', justifyContent:'space-between', alignItems:'center', fontWeight:'bold', flexShrink:0 },
  backBtn:   { background:'rgba(255,255,255,0.2)', color:'#fff', border:'1px solid rgba(255,255,255,0.4)', cursor:'pointer', fontSize:10, padding:'2px 8px', borderRadius:2 },
  tableWrap: { flex:1, overflowY:'auto', position:'relative' },
  table:     { width:'100%', borderCollapse:'collapse', tableLayout:'fixed' },
  thead:     { background:LIGHT, position:'sticky', top:0, zIndex:10 },
  th:        { padding:'8px', borderBottom:`1px solid ${BORDER}`, textAlign:'left', fontSize:11, borderRight:`1px solid ${ROW_BDR}`, wordWrap:'break-word', overflowWrap:'break-word', whiteSpace:'normal' },
  td:        { padding:'4px 8px', borderBottom:`1px solid ${ROW_BDR}`, fontSize:12, borderRight:`1px solid ${ROW_BDR}`, wordWrap:'break-word', overflowWrap:'break-word', whiteSpace:'normal', verticalAlign:'top' },
  tfoot:     { position:'sticky', bottom:0, background:'#fff', zIndex:10 },
  tdTotal:   { padding:'6px 8px', fontWeight:'bold', borderRight:`1px solid ${ROW_BDR}`, background:'#f9f9f9' },
  tr:        { cursor:'pointer' },
  // FIX: status bar consistent with BalanceSheetScreen
  statusBar: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'3px 10px', background:'#1a2a3a', borderTop:'1px solid #0d1a2a', flexShrink:0, height:24 },
};

const s: Record<string, React.CSSProperties> = {
  colParticulars: { width:'50%', padding:'6px 10px', borderRight:`1px solid ${ROW_BDR}` },
  colDebit:       { width:'25%', textAlign:'right', padding:'6px 10px', borderRight:`1px solid ${ROW_BDR}` },
  colCredit:      { width:'25%', textAlign:'right', padding:'6px 10px' },
  groupRow:       { cursor:'pointer' },
  ledgerRow:      { cursor:'pointer' },
};
