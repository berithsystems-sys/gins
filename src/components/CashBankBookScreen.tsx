import React, { useState, useEffect, useCallback } from 'react';
import { Landmark, Wallet, ChevronRight, Printer, ArrowLeft } from 'lucide-react';

interface LedgerSummary {
  id: string;
  name: string;
  group: string;
  balance: number;
  balanceType: string;
}

interface Transaction {
  id: string;
  date: string;
  voucher_type: string;
  voucher_number: string;
  narration: string;
  entry_amount: number;
  entry_type: string;
  contra_names: string | null;
}

const fmtDate = (d: string) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
};
const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// ── LEDGER STATEMENT (DETAIL VIEW) ──────────────────────────────────────────
function LedgerStatement({
  ledger,
  branchId,
  companyName,
  onBack,
}: {
  ledger: LedgerSummary;
  branchId?: string;
  companyName: string;
  onBack: () => void;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [openingType, setOpeningType] = useState<'Dr' | 'Cr'>('Dr');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/ledger-statement/${ledger.id}${q}`)
      .then(r => r.json())
      .then(data => {
        const txns: Transaction[] = Array.isArray(data.transactions)
          ? data.transactions
          : (data.transactions?.rows ?? []);
        setTransactions(txns);
        setOpeningBalance(data.ledger?.openingBalance ?? 0);
        setOpeningType((data.ledger?.balanceType as 'Dr' | 'Cr') ?? 'Dr');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ledger.id, branchId]);

  const rows = React.useMemo(() => {
    let running = openingType === 'Dr' ? openingBalance : -openingBalance;
    return transactions.map(t => {
      const amt = Number(t.entry_amount);
      running += t.entry_type === 'Dr' ? amt : -amt;
      return { ...t, running };
    });
  }, [transactions, openingBalance, openingType]);

  const totalDr = transactions
    .filter(t => t.entry_type === 'Dr')
    .reduce((a, t) => a + Number(t.entry_amount), 0);
  const totalCr = transactions
    .filter(t => t.entry_type === 'Cr')
    .reduce((a, t) => a + Number(t.entry_amount), 0);
  const closingBal = rows.length > 0 ? rows[rows.length - 1].running : (openingType === 'Dr' ? openingBalance : -openingBalance);

  const handlePrint = useCallback(() => {
    const rowsHtml = rows
      .map(
        r => `<tr>
          <td style="padding:4px 8px;border-bottom:1px solid #eee">${fmtDate(r.date)}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee">
            <strong>${r.contra_names || r.voucher_type}</strong>
            ${r.narration ? `<div style="font-size:10px;color:#666;font-style:italic">${r.narration}</div>` : ''}
          </td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${r.voucher_type}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${r.voucher_number || '—'}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;color:#7a0000">${r.entry_type === 'Dr' ? fmt(r.entry_amount) : ''}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;color:#006b00">${r.entry_type === 'Cr' ? fmt(r.entry_amount) : ''}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">
            ${fmt(r.running)}&nbsp;<span style="font-size:10px">${r.running >= 0 ? 'Dr' : 'Cr'}</span>
          </td>
        </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html><html><head>
      <title>${ledger.name} – Statement</title><meta charset="utf-8"/>
      <style>
        @page { margin: 12mm; size: A4 landscape; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 12px; }
        .hdr { background: #1f4e79; color: #fff; text-align: center; padding: 10px 12px; }
        .hdr h1 { margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
        .hdr .sub { font-size: 11px; margin-top: 3px; opacity: 0.85; }
        .info { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #ccc; background: #f0f4f8; font-size: 11px; }
        .ob { background: #f5f5f5; border-bottom: 1px solid #ddd; }
        .ob td { padding: 4px 8px; font-style: italic; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #2c5f8a; color: #fff; }
        th { padding: 5px 8px; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-align: left; }
        .tfoot td { border-top: 2px solid #1f4e79; font-weight: 900; font-size: 12px; background: #e8f0f8; padding: 5px 8px; }
        .footer { text-align: right; font-size: 9px; color: #888; padding: 5px 10px; border-top: 1px solid #ddd; margin-top: 4px; }
      </style>
    </head><body>
      <div class="hdr">
        <h1>${companyName}</h1>
        <div class="sub">LEDGER STATEMENT &nbsp;·&nbsp; ${ledger.name}</div>
      </div>
      <div class="info">
        <div>Account: <strong>${ledger.name}</strong></div>
        <div>Printed on: ${new Date().toLocaleString('en-IN')}</div>
      </div>
      <table>
        <thead><tr>
          <th style="width:80px">Date</th>
          <th>Particulars</th>
          <th style="width:80px">Vch Type</th>
          <th style="width:70px;text-align:center">Vch No.</th>
          <th style="width:110px;text-align:right">Debit (₹)</th>
          <th style="width:110px;text-align:right">Credit (₹)</th>
          <th style="width:130px;text-align:right">Balance (₹)</th>
        </tr></thead>
        <tbody>
          <tr class="ob">
            <td colspan="6" style="padding:4px 8px;border-bottom:1px solid #ddd;font-style:italic;color:#444">Opening Balance</td>
            <td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right;font-weight:600">${fmt(openingBalance)}&nbsp;<span style="font-size:10px">${openingType}</span></td>
          </tr>
          ${rowsHtml}
        </tbody>
        <tfoot><tr class="tfoot">
          <td colspan="4" style="text-align:right;padding-right:12px">Grand Total</td>
          <td style="text-align:right">${fmt(totalDr)}</td>
          <td style="text-align:right">${fmt(totalCr)}</td>
          <td style="text-align:right">${fmt(closingBal)}&nbsp;<span style="font-size:10px">${closingBal >= 0 ? 'Dr' : 'Cr'}</span></td>
        </tr></tfoot>
      </table>
      <div class="footer">${companyName} | ${ledger.name} | Printed on ${new Date().toLocaleString('en-IN')}</div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1050,height=720');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 400);
    }
  }, [rows, openingBalance, openingType, totalDr, totalCr, closingBal, ledger, companyName]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); e.stopPropagation(); handlePrint(); }
      if (e.key === 'Escape') { e.preventDefault(); onBack(); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [handlePrint, onBack]);

  return (
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div className="bg-tally-header text-white h-[35px] flex items-center justify-between px-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[11px] hover:text-tally-accent transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <span className="text-[12px] font-bold border-l border-white/20 pl-3">
            {ledger.group === 'Bank Accounts' ? '🏦' : '💵'} {ledger.name} — Ledger Statement
          </span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1 text-[11px] bg-tally-teal/80 hover:bg-tally-teal px-3 py-1 rounded transition-colors"
        >
          <Printer className="w-3 h-3" /> Print (Alt+P)
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-10 text-center text-xs animate-pulse uppercase tracking-widest text-gray-400">
            Loading transactions…
          </div>
        ) : (
          <table className="w-full text-xs border-collapse min-w-[700px]">
            <thead className="sticky top-0 bg-tally-header text-white z-10">
              <tr>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider w-24">Date</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Particulars</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider w-24">Vch Type</th>
                <th className="px-3 py-2 text-center font-bold uppercase tracking-wider w-20">Vch No.</th>
                <th className="px-3 py-2 text-right font-bold uppercase tracking-wider w-28">Debit (₹)</th>
                <th className="px-3 py-2 text-right font-bold uppercase tracking-wider w-28">Credit (₹)</th>
                <th className="px-3 py-2 text-right font-bold uppercase tracking-wider w-32">Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening balance row */}
              <tr className="bg-blue-50 border-b border-blue-200">
                <td className="px-3 py-2 text-gray-500 italic">—</td>
                <td className="px-3 py-2 text-gray-600 italic font-semibold" colSpan={5}>
                  Opening Balance
                </td>
                <td className="px-3 py-2 text-right font-mono font-bold text-tally-teal">
                  {fmt(openingBalance)}&nbsp;<span className="text-[9px]">{openingType}</span>
                </td>
              </tr>

              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400 italic">
                    No transactions found for this ledger
                  </td>
                </tr>
              )}

              {rows.map((r, i) => (
                <tr
                  key={r.id + i}
                  className={`border-b border-gray-100 hover:bg-tally-accent/5 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}
                >
                  <td className="px-3 py-1.5 font-mono text-gray-600">{fmtDate(r.date)}</td>
                  <td className="px-3 py-1.5">
                    <span className="font-semibold">{r.contra_names || r.voucher_type}</span>
                    {r.narration && (
                      <div className="text-[10px] text-gray-400 italic">{r.narration}</div>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">{r.voucher_type}</td>
                  <td className="px-3 py-1.5 text-center text-gray-500 font-mono">{r.voucher_number || '—'}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-red-700">
                    {r.entry_type === 'Dr' ? fmt(r.entry_amount) : ''}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-green-700">
                    {r.entry_type === 'Cr' ? fmt(r.entry_amount) : ''}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-tally-teal">
                    {fmt(r.running)}&nbsp;
                    <span className="text-[9px] text-gray-500">{r.running >= 0 ? 'Dr' : 'Cr'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-tally-header text-white">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-bold uppercase tracking-wider text-[11px]">
                  Closing Balance
                </td>
                <td className="px-3 py-2 text-right font-mono font-bold text-red-300">{fmt(totalDr)}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-green-300">{fmt(totalCr)}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-tally-accent">
                  {fmt(closingBal)}&nbsp;
                  <span className="text-[9px]">{closingBal >= 0 ? 'Dr' : 'Cr'}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

// ── SUMMARY VIEW ─────────────────────────────────────────────────────────────
export default function CashBankBookScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('Company');
  const [drillLedger, setDrillLedger] = useState<LedgerSummary | null>(null);
  const [selIdx, setSelIdx] = useState(0);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/ledgers${query}`).then(r => r.json()),
      fetch('/api/branches').then(r => r.json()),
    ]).then(([ledgerData, branchData]) => {
      const filtered: LedgerSummary[] = ledgerData
        .filter((l: any) => l.group === 'Cash-in-hand' || l.group === 'Bank Accounts')
        .map((l: any) => ({
          id: l.id,
          name: l.name,
          group: l.group,
          balance: Number(l.openingBalance || 0),
          balanceType: l.balanceType || 'Dr',
        }));
      setLedgers(filtered);

      if (branchId) {
        const br = branchData.find((b: any) => b.id === branchId);
        if (br?.name) setCompanyName(br.name);
      } else if (branchData.length > 0) {
        setCompanyName(branchData[0].name);
      }
      setLoading(false);
    });
  }, [branchId]);

  const handlePrintSummary = useCallback(() => {
    const bankLedgers = ledgers.filter(l => l.group === 'Bank Accounts');
    const cashLedgers = ledgers.filter(l => l.group === 'Cash-in-hand');
    const bankTotal = bankLedgers.reduce((a, l) => a + l.balance, 0);
    const cashTotal = cashLedgers.reduce((a, l) => a + l.balance, 0);
    const grandTotal = bankTotal + cashTotal;

    const sectionRows = (items: LedgerSummary[]) =>
      items
        .map(
          l => `<tr>
            <td style="padding:4px 24px;border-bottom:1px solid #eee">${l.name}</td>
            <td style="padding:4px 12px;text-align:right;border-bottom:1px solid #eee;font-family:monospace">${fmt(l.balance)}&nbsp;${l.balanceType}</td>
          </tr>`
        )
        .join('');

    const html = `<!DOCTYPE html><html><head>
      <title>Cash / Bank Book</title><meta charset="utf-8"/>
      <style>
        @page { margin: 15mm; size: A4 portrait; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 12px; }
        .hdr { background: #1f4e79; color: #fff; text-align: center; padding: 10px 12px; }
        .hdr h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
        .hdr .sub { font-size: 11px; margin-top: 4px; opacity: 0.85; }
        table { width: 100%; border-collapse: collapse; }
        .section-hdr td { background: #2c5f8a; color: #fff; padding: 5px 12px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .section-total td { background: #e8f0f8; font-weight: 700; padding: 4px 12px; border-top: 1px solid #aac; }
        .grand td { background: #1f4e79; color: #fff; font-weight: 900; font-size: 13px; padding: 7px 12px; }
        .footer { text-align: right; font-size: 9px; color: #888; padding: 5px 12px; margin-top: 4px; border-top: 1px solid #ddd; }
      </style>
    </head><body>
      <div class="hdr">
        <h1>${companyName}</h1>
        <div class="sub">CASH / BANK BOOK — ACCOUNT SUMMARY</div>
      </div>
      <table>
        <tbody>
          <tr class="section-hdr"><td>🏦 Bank Accounts</td><td style="text-align:right">Balance</td></tr>
          ${sectionRows(bankLedgers)}
          <tr class="section-total"><td style="padding-left:24px">Bank Total</td><td style="text-align:right;font-family:monospace">${fmt(bankTotal)}</td></tr>
          <tr><td colspan="2" style="padding:4px"></td></tr>
          <tr class="section-hdr"><td>💵 Cash-in-Hand</td><td style="text-align:right">Balance</td></tr>
          ${sectionRows(cashLedgers)}
          <tr class="section-total"><td style="padding-left:24px">Cash Total</td><td style="text-align:right;font-family:monospace">${fmt(cashTotal)}</td></tr>
          <tr class="grand"><td>Grand Total</td><td style="text-align:right;font-family:monospace">₹ ${fmt(grandTotal)}</td></tr>
        </tbody>
      </table>
      <div class="footer">Printed on ${new Date().toLocaleString('en-IN')} | ${companyName}</div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=700,height=600');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 400);
    }
  }, [ledgers, companyName]);

  useEffect(() => {
    if (drillLedger) return;
    const all = [...ledgers.filter(l => l.group === 'Bank Accounts'), ...ledgers.filter(l => l.group === 'Cash-in-hand')];
    const h = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); e.stopPropagation(); handlePrintSummary(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(s => Math.min(all.length - 1, s + 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(s => Math.max(0, s - 1)); return; }
      if (e.key === 'Enter' && all[selIdx]) { e.preventDefault(); setDrillLedger(all[selIdx]); return; }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [drillLedger, ledgers, selIdx, handlePrintSummary]);

  if (drillLedger) {
    return (
      <LedgerStatement
        ledger={drillLedger}
        branchId={branchId}
        companyName={companyName}
        onBack={() => setDrillLedger(null)}
      />
    );
  }

  const bankLedgers = ledgers.filter(l => l.group === 'Bank Accounts');
  const cashLedgers = ledgers.filter(l => l.group === 'Cash-in-hand');
  const allOrdered = [...bankLedgers, ...cashLedgers];
  const total = ledgers.reduce((acc, l) => acc + l.balance, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Title bar with print button */}
      <div className="bg-tally-header text-white h-[35px] flex items-center justify-between px-3 flex-shrink-0">
        <span className="text-[12px] font-bold">Cash / Bank Book</span>
        <button
          onClick={handlePrintSummary}
          className="flex items-center gap-1 text-[11px] bg-tally-teal/80 hover:bg-tally-teal px-3 py-1 rounded transition-colors"
        >
          <Printer className="w-3 h-3" /> Print (Alt+P)
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="border border-tally-teal/20 bg-white overflow-x-auto shadow-lg">
          <table className="w-full text-xs min-w-[500px]">
            <thead className="bg-gray-100 border-b border-tally-teal/10 font-bold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Particulars</th>
                <th className="px-4 py-3 text-right w-48">Opening Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={2} className="p-10 text-center animate-pulse uppercase tracking-widest text-gray-400">
                    Loading Balances…
                  </td>
                </tr>
              ) : (
                <>
                  {/* Bank Accounts section */}
                  <tr className="bg-blue-50/30">
                    <td className="px-4 py-2 font-black text-tally-teal uppercase flex items-center gap-2">
                      <Landmark className="w-3 h-3" /> Bank Accounts
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-bold">
                      {fmt(bankLedgers.reduce((a, l) => a + l.balance, 0))}
                    </td>
                  </tr>
                  {bankLedgers.map((l, idx) => (
                    <tr
                      key={l.id}
                      onClick={() => setDrillLedger(l)}
                      className={`hover:bg-tally-accent/10 cursor-pointer group ${
                        allOrdered[selIdx]?.id === l.id ? 'bg-tally-accent/20 outline outline-1 outline-tally-teal' : ''
                      }`}
                    >
                      <td className="px-8 py-2 flex justify-between items-center pr-10">
                        <span className="group-hover:text-tally-teal transition-colors">{l.name}</span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-tally-teal" />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-600">
                        {fmt(l.balance)}&nbsp;
                        <span className="text-[9px] text-gray-400">{l.balanceType}</span>
                      </td>
                    </tr>
                  ))}

                  {/* Cash-in-Hand section */}
                  <tr className="bg-green-50/30">
                    <td className="px-4 py-2 font-black text-tally-teal uppercase flex items-center gap-2">
                      <Wallet className="w-3 h-3" /> Cash-in-Hand
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-bold">
                      {fmt(cashLedgers.reduce((a, l) => a + l.balance, 0))}
                    </td>
                  </tr>
                  {cashLedgers.map(l => (
                    <tr
                      key={l.id}
                      onClick={() => setDrillLedger(l)}
                      className={`hover:bg-tally-accent/10 cursor-pointer group ${
                        allOrdered[selIdx]?.id === l.id ? 'bg-tally-accent/20 outline outline-1 outline-tally-teal' : ''
                      }`}
                    >
                      <td className="px-8 py-2 flex justify-between items-center pr-10">
                        <span className="group-hover:text-tally-teal transition-colors">{l.name}</span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-tally-teal" />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-600">
                        {fmt(l.balance)}&nbsp;
                        <span className="text-[9px] text-gray-400">{l.balanceType}</span>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
            <tfoot className="bg-tally-teal text-white font-black border-t-4 border-tally-teal/20">
              <tr>
                <td className="px-4 py-3 uppercase tracking-wider">Grand Total</td>
                <td className="px-4 py-3 text-right font-mono text-lg tracking-tighter">
                  ₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-3 text-[10px] text-gray-400 text-center">
          Click any account to view full ledger statement &nbsp;·&nbsp; Alt+P to print summary
        </div>
      </div>
    </div>
  );
}
