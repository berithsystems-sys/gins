
export interface PrintVoucherData {
  type: 'voucher';
  companyName: string;
  voucherType: string;
  voucherNo: string;
  date: string;
  narration?: string;
  entries: {
    ledgerName: string;
    type: 'Dr' | 'Cr';
    amount: number;
  }[];
}

export interface PrintLedgerData {
  type: 'ledger';
  companyName: string;
  ledgerName: string;
  period: string;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  rows: {
    date: string;
    particulars: string;
    vchType: string;
    vchNo: string;
    debit?: number;
    credit?: number;
    balance: number;
    runType: 'Dr' | 'Cr';
  }[];
  closingBalance: number;
  closingType: 'Dr' | 'Cr';
}

export type PrintData = PrintVoucherData | PrintLedgerData;

export const generateTallyPrintHTML = (data: PrintData) => {
  const fmtAmt = (n: number | undefined) => n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '';
  
  if (data.type === 'voucher') {
    const drTotal = data.entries.filter(e => e.type === 'Dr').reduce((a, b) => a + b.amount, 0);
    const crTotal = data.entries.filter(e => e.type === 'Cr').reduce((a, b) => a + b.amount, 0);

    return `
      <html>
        <head>
          <title>${data.voucherType} - ${data.voucherNo}</title>
          <style>
            @media print { @page { margin: 10mm; } }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #000; }
            .container { border: 1px solid #000; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 1px solid #000; padding: 10px; text-align: center; }
            .company-name { font-size: 18px; font-weight: bold; text-transform: uppercase; }
            .vch-info { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #000; font-size: 14px; }
            .vch-title { font-weight: bold; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border-bottom: 1px solid #eee; padding: 8px 10px; font-size: 13px; vertical-align: top; }
            th { border-bottom: 1px solid #000; text-align: left; text-transform: uppercase; font-size: 12px; }
            .text-right { text-align: right; }
            .footer { padding: 10px; }
            .narration { font-style: italic; font-size: 12px; margin-top: 10px; min-height: 40px; }
            .signature-row { display: flex; justify-content: space-between; margin-top: 50px; }
            .sig-box { border-top: 1px solid #000; width: 150px; text-align: center; font-size: 11px; padding-top: 5px; }
            .total-row td { border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="company-name">${data.companyName}</div>
              <div style="font-size: 12px; margin-top: 4px;">Accounting Voucher</div>
            </div>
            <div class="vch-info">
              <div><span class="vch-title">${data.voucherType}</span> No. <b>${data.voucherNo}</b></div>
              <div>Dated: <b>${data.date}</b></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 60%">Particulars</th>
                  <th style="width: 20%" class="text-right">Debit</th>
                  <th style="width: 20%" class="text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                ${data.entries.map(e => `
                  <tr>
                    <td>${e.ledgerName}</td>
                    <td class="text-right">${e.type === 'Dr' ? fmtAmt(e.amount) : ''}</td>
                    <td class="text-right">${e.type === 'Cr' ? fmtAmt(e.amount) : ''}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td>Total</td>
                  <td class="text-right">${fmtAmt(drTotal)}</td>
                  <td class="text-right">${fmtAmt(crTotal)}</td>
                </tr>
              </tbody>
            </table>
            <div class="footer">
              <div class="narration"><b>Narration:</b> ${data.narration || ''}</div>
              <div class="signature-row">
                <div class="sig-box">Prepared by</div>
                <div class="sig-box">Verified by</div>
                <div class="sig-box">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  if (data.type === 'ledger') {
    return `
      <html>
        <head>
          <title>Ledger - ${data.ledgerName}</title>
          <style>
            @media print { @page { margin: 10mm; } }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #000; }
            .header { text-align: center; margin-bottom: 15px; }
            .company-name { font-size: 18px; font-weight: bold; text-transform: uppercase; }
            .report-title { font-size: 14px; font-weight: bold; margin-top: 5px; }
            .period { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 5px 8px; font-size: 11px; }
            th { background-color: #f2f2f2; text-align: left; text-transform: uppercase; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .total-row { background-color: #f9f9f9; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${data.companyName}</div>
            <div class="report-title">Ledger Account: ${data.ledgerName}</div>
            <div class="period">${data.period}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 80px">Date</th>
                <th>Particulars</th>
                <th style="width: 100px">Vch Type</th>
                <th style="width: 60px" class="text-center">Vch No.</th>
                <th style="width: 100px" class="text-right">Debit</th>
                <th style="width: 100px" class="text-right">Credit</th>
                <th style="width: 120px" class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td class="bold">Opening Balance</td>
                <td></td>
                <td></td>
                <td class="text-right">${data.balanceType === 'Dr' ? fmtAmt(data.openingBalance) : ''}</td>
                <td class="text-right">${data.balanceType === 'Cr' ? fmtAmt(data.openingBalance) : ''}</td>
                <td class="text-right bold">${fmtAmt(data.openingBalance)} ${data.balanceType}</td>
              </tr>
              ${data.rows.map(r => `
                <tr>
                  <td>${r.date}</td>
                  <td>${r.particulars}</td>
                  <td>${r.vchType}</td>
                  <td class="text-center">${r.vchNo}</td>
                  <td class="text-right">${r.debit ? fmtAmt(r.debit) : ''}</td>
                  <td class="text-right">${r.credit ? fmtAmt(r.credit) : ''}</td>
                  <td class="text-right">${fmtAmt(r.balance)} ${r.runType}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4" class="text-right">Closing Balance</td>
                <td class="text-right">${data.closingType === 'Dr' ? fmtAmt(data.closingBalance) : ''}</td>
                <td class="text-right">${data.closingType === 'Cr' ? fmtAmt(data.closingBalance) : ''}</td>
                <td class="text-right bold">${fmtAmt(data.closingBalance)} ${data.closingType}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 20px; font-size: 10px; text-align: right;">
            Printed on ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;
  }

  return '';
};
