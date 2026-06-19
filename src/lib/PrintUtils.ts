export interface PrintVoucherData {
  type: 'voucher';
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyGSTIN?: string;
  partyName?: string;
  partyAddress?: string;
  partyGSTIN?: string;
  voucherType: string;
  voucherNo: string;
  date: string;
  narration?: string;
  entries: {
    ledgerName: string;
    type: 'Dr' | 'Cr';
    amount: number;
    hsnCode?: string;
    gstRate?: number;
    quantity?: number;
    rate?: number;
    discount?: number;
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

export interface PrintBalanceSheetData {
  type: 'balance_sheet';
  companyName: string;
  period: string;
  liabilities: { group: string; amount: number; ledgers?: { name: string; amount: number }[] }[];
  assets: { group: string; amount: number; ledgers?: { name: string; amount: number }[] }[];
  plNet: number;
  liabTotal: number;
  assetTotal: number;
}

export interface PrintPLData {
  type: 'pl_account';
  companyName: string;
  period: string;
  expenditure: { group: string; amount: number; ledgers?: { name: string; amount: number }[] }[];
  income: { group: string; amount: number; ledgers?: { name: string; amount: number }[] }[];
  nett: number;
  grandTotal: number;
}

export interface PrintTrialBalanceData {
  type: 'trial_balance';
  companyName: string;
  period: string;
  rows: {
    particulars: string;
    isGroup: boolean;
    level: number;
    opDr?: number;
    opCr?: number;
    transDr?: number;
    transCr?: number;
    clDr?: number;
    clCr?: number;
  }[];
  totals: {
    opDr: number;
    opCr: number;
    transDr: number;
    transCr: number;
    clDr: number;
    clCr: number;
  };
  isDetailed?: boolean;
}

export interface PrintDaybookData {
  type: 'daybook';
  companyName: string;
  period: string;
  vouchers: {
    date: string;
    particulars: string;
    vchType: string;
    vchNo: string;
    debitAmount: number;
    creditAmount: number;
    voided?: boolean;
  }[];
  drTotal: number;
  crTotal: number;
}

export interface PrintCashBankBookData {
  type: 'cash_bank_book';
  companyName: string;
  period: string;
  bankAccounts: { name: string; balance: number }[];
  cashInHand: { name: string; balance: number }[];
  bankTotal: number;
  cashTotal: number;
  grandTotal: number;
  inflow: number;
  outflow: number;
  netFlow: number;
}

export type PrintData =
  | PrintVoucherData
  | PrintLedgerData
  | PrintBalanceSheetData
  | PrintPLData
  | PrintTrialBalanceData
  | PrintDaybookData
  | PrintCashBankBookData;

export interface PrintConfig {
  printerSelection: string;
  paperSize: 'A4' | 'Letter' | 'Legal' | 'A5';
  orientation: 'Portrait' | 'Landscape';
  scaling: 'Fit to Page' | 'Actual Size';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  numberOfCopies: number;
  copyType: 'Original' | 'Duplicate' | 'Triplicate' | 'Voucher-wise';
  paperType: 'Plain Paper' | 'Pre-printed Paper';
  printFormat: 'Neat Mode' | 'Dot Matrix Format' | 'Quick/Draft Mode';
  showCompanyName: boolean;
  showCompanyAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showGSTIN: boolean;
  showLogo: boolean;
  showPartyName: boolean;
  showBillingAddress: boolean;
  showShippingAddress: boolean;
  showPartyGSTIN: boolean;
  showItemDescription: boolean;
  showItemCode: boolean;
  showHSN: boolean;
  showBatch: boolean;
  showExpiry: boolean;
  showQuantity: boolean;
  showRate: boolean;
  showDiscount: boolean;
  showTaxBreakup: boolean;
  showNarration: boolean;
  showTerms: boolean;
  showDeclaration: boolean;
  showQRCode: boolean;
  showSignatureSpace: boolean;
  reportTitle: string;
  reportSubtitle: string;
  showDate: boolean;
  fontSize: number;
  boldHeaders: boolean;
  lineSpacing: number;
}

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  printerSelection: 'Save as PDF (Tally Virtual)',
  paperSize: 'A4',
  orientation: 'Portrait',
  scaling: 'Fit to Page',
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 10,
  marginRight: 10,
  numberOfCopies: 1,
  copyType: 'Original',
  paperType: 'Plain Paper',
  printFormat: 'Neat Mode',
  showCompanyName: true,
  showCompanyAddress: true,
  showPhone: true,
  showEmail: true,
  showWebsite: true,
  showGSTIN: true,
  showLogo: true,
  showPartyName: true,
  showBillingAddress: true,
  showShippingAddress: true,
  showPartyGSTIN: true,
  showItemDescription: true,
  showItemCode: true,
  showHSN: true,
  showBatch: false,
  showExpiry: false,
  showQuantity: true,
  showRate: true,
  showDiscount: true,
  showTaxBreakup: true,
  showNarration: true,
  showTerms: true,
  showDeclaration: true,
  showQRCode: true,
  showSignatureSpace: true,
  reportTitle: '',
  reportSubtitle: '',
  showDate: true,
  fontSize: 12,
  boldHeaders: true,
  lineSpacing: 1.2,
};

export const generateTallyPrintHTML = (data: PrintData, config: PrintConfig = DEFAULT_PRINT_CONFIG): string => {
  const fmtAmt = (n: number | undefined) =>
    n !== undefined && n !== null
      ? Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';

  // Copy designations depending on copies count
  const getCopyLabel = (copyIndex: number) => {
    if (config.numberOfCopies <= 1) return '';
    const labels = ['ORIGINAL FOR BUYER', 'DUPLICATE FOR TRANSPORTER', 'TRIPLICATE FOR ASSESSEE', 'EXTRA COPY'];
    return labels[copyIndex] || `COPY ${copyIndex + 1}`;
  };

  // Compile global styles
  const isDotMatrix = config.printFormat === 'Dot Matrix Format';
  const isDraft = config.printFormat === 'Quick/Draft Mode';
  const fontFamily = isDotMatrix
    ? '"Courier New", Courier, monospace'
    : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const styleBlock = `
    <style>
      @page {
        size: ${config.paperSize.toLowerCase()} ${config.orientation.toLowerCase()};
        margin: ${config.marginTop}mm ${config.marginRight}mm ${config.marginBottom}mm ${config.marginLeft}mm;
      }
      * { box-sizing: border-box; }
      body {
        font-family: ${fontFamily};
        margin: 0;
        padding: 0;
        color: #000;
        font-size: ${config.fontSize}pt;
        line-height: ${config.lineSpacing};
        background: #fff;
      }
      .page-break {
        page-break-after: always;
        position: relative;
        padding-bottom: 20px;
      }
      .page-break:last-child {
        page-break-after: avoid;
      }
      .container {
        width: 100%;
        border: ${isDraft ? 'none' : '1px solid #000'};
        padding: 10px;
        position: relative;
      }
      .copy-badge {
        position: absolute;
        top: 5px;
        right: 10px;
        font-size: 8pt;
        font-weight: bold;
        border: 1px dashed #000;
        padding: 2px 6px;
      }
      .company-header {
        text-align: center;
        margin-bottom: 12px;
        border-bottom: ${isDraft ? 'none' : '1px solid #000'};
        padding-bottom: 8px;
      }
      .company-name {
        font-size: 16pt;
        font-weight: bold;
        text-transform: uppercase;
      }
      .company-details {
        font-size: 9pt;
        margin-top: 2px;
      }
      .report-header {
        text-align: center;
        margin-bottom: 10px;
      }
      .report-title {
        font-size: 13pt;
        font-weight: bold;
        text-transform: uppercase;
        text-decoration: underline;
      }
      .report-subtitle {
        font-size: 10pt;
        font-style: italic;
        margin-top: 2px;
      }
      .meta-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 9.5pt;
        border-bottom: ${isDraft ? 'none' : '1px solid #ccc'};
        padding-bottom: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6px;
        font-size: ${config.fontSize - 1}pt;
      }
      th, td {
        padding: 4px 6px;
        vertical-align: top;
        border: ${isDraft ? 'none' : '1px solid #ddd'};
        border-bottom: 1px solid #000;
      }
      th {
        background-color: ${isDotMatrix || isDraft ? 'transparent' : '#f5f5f5'};
        font-weight: ${config.boldHeaders ? 'bold' : 'normal'};
        text-transform: uppercase;
        text-align: left;
        border-bottom: 2px solid #000;
      }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .bold { font-weight: bold; }
      .total-row td {
        font-weight: bold;
        border-top: 2px solid #000;
        border-bottom: 2px solid #000;
        background-color: ${isDotMatrix || isDraft ? 'transparent' : '#f9f9f9'};
      }
      .voucher-logo {
        max-height: 45px;
        display: ${config.showLogo ? 'block' : 'none'};
        margin: 0 auto 5px auto;
      }
      .signature-area {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
        padding-top: 10px;
      }
      .sig-box {
        border-top: 1px solid #000;
        width: 150px;
        text-align: center;
        font-size: 8pt;
        padding-top: 4px;
      }
      .party-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        border: 1px solid #ccc;
        padding: 6px;
        background-color: #fafafa;
        font-size: 9pt;
      }
      .party-box { width: 48%; }
      .party-box h4 { margin: 0 0 4px 0; font-size: 9.5pt; text-transform: uppercase; }
      .narration {
        margin-top: 10px;
        font-size: 9pt;
        font-style: italic;
      }
      .tc-box {
        margin-top: 15px;
        font-size: 8pt;
        border-top: 1px solid #ccc;
        padding-top: 5px;
      }
      .two-col-wrap {
        display: flex;
        border-top: 2px solid #000;
      }
      .print-col {
        flex: 1;
      }
      .print-col:first-child {
        border-right: 2px solid #000;
      }
      .flow-box {
        display: flex;
        border: 1px solid #000;
        margin-top: 15px;
      }
      .flow-column {
        flex: 1;
        padding: 6px;
        text-align: center;
        border-right: 1px solid #000;
      }
      .flow-column:last-child {
        border-right: none;
      }
    </style>
  `;

  let contentPages = [];

  for (let c = 0; c < config.numberOfCopies; c++) {
    const copyLabel = getCopyLabel(c);
    let pageContent = '';

    // Render Company Header Block
    let companyHeaderHTML = '';
    if (config.showCompanyName) {
      const anyData = data as any;
      const address = config.showCompanyAddress && anyData.companyAddress ? `<div>${anyData.companyAddress}</div>` : '';
      const phone = config.showPhone && anyData.companyPhone ? `Phone: ${anyData.companyPhone}` : '';
      const email = config.showEmail && anyData.companyEmail ? `Email: ${anyData.companyEmail}` : '';
      const web = config.showWebsite && anyData.companyWebsite ? `Web: ${anyData.companyWebsite}` : '';
      const gstin = config.showGSTIN && anyData.companyGSTIN ? `<div><b>GSTIN/VAT:</b> ${anyData.companyGSTIN}</div>` : '';

      const phoneEmailWeb = [phone, email, web].filter(Boolean).join(' | ');

      companyHeaderHTML = `
        <div class="company-header">
          ${config.showLogo ? `<div class="bold" style="color: #004050; font-size: 11pt; margin-bottom: 4px;">★ BERITHSYSTEMS CORP ★</div>` : ''}
          <div class="company-name">${data.companyName}</div>
          <div class="company-details">
            ${address}
            ${phoneEmailWeb ? `<div>${phoneEmailWeb}</div>` : ''}
            ${gstin}
          </div>
        </div>
      `;
    }

    // Render Title Block
    const defaultTitle =
      data.type === 'voucher'
        ? `${data.voucherType} Voucher`
        : data.type === 'ledger'
        ? `Ledger Account Statement`
        : data.type === 'balance_sheet'
        ? 'Balance Sheet'
        : data.type === 'pl_account'
        ? 'Profit & Loss Account'
        : data.type === 'trial_balance'
        ? 'Trial Balance'
        : data.type === 'cash_bank_book'
        ? 'Cash & Bank Book'
        : 'Day Book';

    const reportTitle = config.reportTitle || defaultTitle;
    const subtitle = config.reportSubtitle || (data.type === 'ledger' ? data.period : (data as any).period || '');
    const dateStr = config.showDate ? `Printed on: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}` : '';

    const titleHTML = `
      <div class="report-header">
        <div class="report-title">${reportTitle}</div>
        ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ''}
        ${dateStr ? `<div style="font-size: 8pt; color: #555; margin-top: 2px;">${dateStr}</div>` : ''}
      </div>
    `;

    // ──────────────────────────────────────────
    // VOUCHER LAYOUT
    // ──────────────────────────────────────────
    if (data.type === 'voucher') {
      const drTotal = data.entries.filter((e) => e.type === 'Dr').reduce((acc, val) => acc + val.amount, 0);
      const crTotal = data.entries.filter((e) => e.type === 'Cr').reduce((acc, val) => acc + val.amount, 0);

      // Party Box (Customer Details)
      let partyHTML = '';
      if (config.showPartyName && (data.partyName || data.partyAddress || data.partyGSTIN)) {
        partyHTML = `
          <div class="party-info">
            <div class="party-box">
              <h4>Billed To (Party Details)</h4>
              <div><b>Name:</b> ${data.partyName || 'Cash / General Party'}</div>
              ${config.showBillingAddress && data.partyAddress ? `<div><b>Address:</b> ${data.partyAddress}</div>` : ''}
              ${config.showPartyGSTIN && data.partyGSTIN ? `<div><b>GSTIN:</b> ${data.partyGSTIN}</div>` : ''}
            </div>
            <div class="party-box" style="text-align: right;">
              <div><b>Voucher No:</b> ${data.voucherNo}</div>
              <div><b>Date:</b> ${data.date}</div>
              <div><b>Vch Type:</b> ${data.voucherType}</div>
            </div>
          </div>
        `;
      }

      // HSN/Code headers depending on config
      const showItemCodeCol = config.showItemCode;
      const showHSNCol = config.showHSN;

      const tableRows = data.entries
        .map((e) => {
          return `
          <tr>
            <td>
              <div class="bold">${e.ledgerName}</div>
              ${config.showItemDescription && e.hsnCode ? `<div style="font-size: 8pt; color: #666;">HSN/SAC: ${e.hsnCode}</div>` : ''}
            </td>
            ${showItemCodeCol ? `<td class="text-center">${e.hsnCode || 'N/A'}</td>` : ''}
            ${showHSNCol ? `<td class="text-center">${e.gstRate ? `${e.gstRate}%` : '—'}</td>` : ''}
            <td class="text-center">${e.type}</td>
            <td class="text-right bold">${e.type === 'Dr' ? fmtAmt(e.amount) : ''}</td>
            <td class="text-right bold">${e.type === 'Cr' ? fmtAmt(e.amount) : ''}</td>
          </tr>
        `;
        })
        .join('');

      pageContent = `
        <div class="container">
          ${copyLabel ? `<div class="copy-badge">${copyLabel}</div>` : ''}
          ${companyHeaderHTML}
          ${titleHTML}
          ${partyHTML}
          <table>
            <thead>
              <tr>
                <th>Particulars</th>
                ${showItemCodeCol ? '<th class="text-center" style="width: 100px;">Item Code</th>' : ''}
                ${showHSNCol ? '<th class="text-center" style="width: 80px;">GST Rate</th>' : ''}
                <th class="text-center" style="width: 60px;">Dr/Cr</th>
                <th class="text-right" style="width: 120px;">Debit</th>
                <th class="text-right" style="width: 120px;">Credit</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              <tr class="total-row">
                <td>Total</td>
                ${showItemCodeCol ? '<td></td>' : ''}
                ${showHSNCol ? '<td></td>' : ''}
                <td></td>
                <td class="text-right">₹ ${fmtAmt(drTotal)}</td>
                <td class="text-right">₹ ${fmtAmt(crTotal)}</td>
              </tr>
            </tbody>
          </table>

          ${config.showNarration && data.narration ? `<div class="narration"><b>Narration:</b> ${data.narration}</div>` : ''}

          ${
            config.showTerms
              ? `
            <div class="tc-box">
              <b>Terms & Conditions:</b>
              <div>1. Goods once sold will not be taken back.</div>
              <div>2. Interest @ 18% p.a. will be charged if payment is not made within due date.</div>
              ${config.showDeclaration ? `<div><b>Declaration:</b> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>` : ''}
            </div>
          `
              : ''
          }

          ${
            config.showSignatureSpace
              ? `
            <div class="signature-area">
              <div class="sig-box">Receiver's Signature</div>
              <div class="sig-box">Prepared By</div>
              <div class="sig-box">Authorized Signatory</div>
            </div>
          `
              : ''
          }
        </div>
      `;
    }

    // ──────────────────────────────────────────
    // LEDGER STATEMENT LAYOUT
    // ──────────────────────────────────────────
    else if (data.type === 'ledger') {
      const rowsHTML = data.rows
        .map((r, i) => {
          return `
          <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#fcfcfc'}">
            <td>${r.date}</td>
            <td>
              <div class="bold">${r.particulars}</div>
            </td>
            <td>${r.vchType}</td>
            <td class="text-center">${r.vchNo}</td>
            <td class="text-right" style="color: #7a0000;">${r.debit ? fmtAmt(r.debit) : ''}</td>
            <td class="text-right" style="color: #006b00;">${r.credit ? fmtAmt(r.credit) : ''}</td>
            <td class="text-right bold">${fmtAmt(r.balance)} ${r.runType}</td>
          </tr>
        `;
        })
        .join('');

      pageContent = `
        <div class="container">
          ${copyLabel ? `<div class="copy-badge">${copyLabel}</div>` : ''}
          ${companyHeaderHTML}
          ${titleHTML}
          
          <div class="meta-info">
            <div><b>Ledger:</b> ${data.ledgerName}</div>
            <div><b>Opening Balance:</b> ${fmtAmt(data.openingBalance)} ${data.balanceType}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 90px;">Date</th>
                <th>Particulars</th>
                <th style="width: 110px;">Vch Type</th>
                <th class="text-center" style="width: 70px;">Vch No.</th>
                <th class="text-right" style="width: 120px;">Debit</th>
                <th class="text-right" style="width: 120px;">Credit</th>
                <th class="text-right" style="width: 130px;">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td class="bold" style="font-style: italic;">Opening Balance</td>
                <td></td>
                <td></td>
                <td class="text-right">${data.balanceType === 'Dr' ? fmtAmt(data.openingBalance) : ''}</td>
                <td class="text-right">${data.balanceType === 'Cr' ? fmtAmt(data.openingBalance) : ''}</td>
                <td class="text-right bold">${fmtAmt(data.openingBalance)} ${data.balanceType}</td>
              </tr>
              ${rowsHTML}
              <tr class="total-row">
                <td colspan="4" class="text-right">Closing Balance</td>
                <td class="text-right">${data.closingType === 'Dr' ? fmtAmt(data.closingBalance) : ''}</td>
                <td class="text-right">${data.closingType === 'Cr' ? fmtAmt(data.closingBalance) : ''}</td>
                <td class="text-right bold">${fmtAmt(data.closingBalance)} ${data.closingType}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // ──────────────────────────────────────────
    // BALANCE SHEET LAYOUT
    // ──────────────────────────────────────────
    else if (data.type === 'balance_sheet') {
      const renderBSGroupRows = (groups: typeof data.liabilities) => {
        return groups
          .map((grp) => {
            if (grp.amount === 0) return '';
            const ledRows =
              grp.ledgers
                ?.map((l) => {
                  return `
                <tr>
                  <td style="padding-left: 20px; font-size: 8.5pt; color: #444; border: none;">${l.name}</td>
                  <td class="text-right" style="font-size: 8.5pt; color: #444; border: none;">${fmtAmt(l.amount)}</td>
                </tr>
              `;
                })
                .join('') || '';

            return `
            <tr>
              <td class="bold" style="background-color: #fafafa;">${grp.group}</td>
              <td class="text-right bold" style="background-color: #fafafa;">${fmtAmt(grp.amount)}</td>
            </tr>
            ${ledRows}
          `;
          })
          .join('');
      };

      pageContent = `
        <div class="container">
          ${copyLabel ? `<div class="copy-badge">${copyLabel}</div>` : ''}
          ${companyHeaderHTML}
          ${titleHTML}

          <div class="two-col-wrap">
            <!-- Liabilities -->
            <div class="print-col">
              <table style="margin-top: 0;">
                <thead>
                  <tr>
                    <th style="background-color: #004050; color: #fff;">Liabilities</th>
                    <th class="text-right" style="background-color: #004050; color: #fff; width: 120px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderBSGroupRows(data.liabilities)}
                  ${
                    data.plNet >= 0
                      ? `
                    <tr>
                      <td style="font-style: italic; background-color: #fbfbf0;">Profit & Loss A/c (Net Profit)</td>
                      <td class="text-right" style="font-style: italic; background-color: #fbfbf0;">${fmtAmt(data.plNet)}</td>
                    </tr>
                  `
                      : ''
                  }
                  <tr class="total-row">
                    <td>Total Liabilities</td>
                    <td class="text-right">₹ ${fmtAmt(data.liabTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Assets -->
            <div class="print-col">
              <table style="margin-top: 0;">
                <thead>
                  <tr>
                    <th style="background-color: #004050; color: #fff;">Assets</th>
                    <th class="text-right" style="background-color: #004050; color: #fff; width: 120px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderBSGroupRows(data.assets)}
                  ${
                    data.plNet < 0
                      ? `
                    <tr>
                      <td style="font-style: italic; background-color: #fbfbf0;">Profit & Loss A/c (Net Loss)</td>
                      <td class="text-right" style="font-style: italic; background-color: #fbfbf0;">${fmtAmt(Math.abs(data.plNet))}</td>
                    </tr>
                  `
                      : ''
                  }
                  <tr class="total-row">
                    <td>Total Assets</td>
                    <td class="text-right">₹ ${fmtAmt(data.assetTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // ──────────────────────────────────────────
    // PROFIT & LOSS A/C LAYOUT
    // ──────────────────────────────────────────
    else if (data.type === 'pl_account') {
      const renderPLGroupRows = (groups: typeof data.expenditure) => {
        return groups
          .map((grp) => {
            if (grp.amount === 0) return '';
            const ledRows =
              grp.ledgers
                ?.map((l) => {
                  return `
                <tr>
                  <td style="padding-left: 20px; font-size: 8.5pt; color: #444; border: none;">${l.name}</td>
                  <td class="text-right" style="font-size: 8.5pt; color: #444; border: none;">${fmtAmt(l.amount)}</td>
                </tr>
              `;
                })
                .join('') || '';

            return `
            <tr>
              <td class="bold" style="background-color: #fafafa;">${grp.group}</td>
              <td class="text-right bold" style="background-color: #fafafa;">${fmtAmt(grp.amount)}</td>
            </tr>
            ${ledRows}
          `;
          })
          .join('');
      };

      pageContent = `
        <div class="container">
          ${copyLabel ? `<div class="copy-badge">${copyLabel}</div>` : ''}
          ${companyHeaderHTML}
          ${titleHTML}

          <div class="two-col-wrap">
            <!-- Expenditure -->
            <div class="print-col">
              <table style="margin-top: 0;">
                <thead>
                  <tr>
                    <th style="background-color: #004050; color: #fff;">Expenditure</th>
                    <th class="text-right" style="background-color: #004050; color: #fff; width: 120px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderPLGroupRows(data.expenditure)}
                  ${
                    data.nett >= 0
                      ? `
                    <tr>
                      <td style="font-style: italic; background-color: #f0fdf4; font-weight: bold; color: #006b00;">Net Profit</td>
                      <td class="text-right" style="font-style: italic; background-color: #f0fdf4; font-weight: bold; color: #006b00;">${fmtAmt(data.nett)}</td>
                    </tr>
                  `
                      : ''
                  }
                  <tr class="total-row">
                    <td>Total Expenditure</td>
                    <td class="text-right">₹ ${fmtAmt(data.grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Income -->
            <div class="print-col">
              <table style="margin-top: 0;">
                <thead>
                  <tr>
                    <th style="background-color: #004050; color: #fff;">Income</th>
                    <th class="text-right" style="background-color: #004050; color: #fff; width: 120px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderPLGroupRows(data.income)}
                  ${
                    data.nett < 0
                      ? `
                    <tr>
                      <td style="font-style: italic; background-color: #fef2f2; font-weight: bold; color: #7a0000;">Net Loss</td>
                      <td class="text-right" style="font-style: italic; background-color: #fef2f2; font-weight: bold; color: #7a0000;">${fmtAmt(Math.abs(data.nett))}</td>
                    </tr>
                  `
                      : ''
                  }
                  <tr class="total-row">
                    <td>Total Income</td>
                    <td class="text-right">₹ ${fmtAmt(data.grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // ──────────────────────────────────────────
    // TRIAL BALANCE LAYOUT
    // ──────────────────────────────────────────
    else if (data.type === 'trial_balance') {
      const rowsHTML = data.rows
        .map((r, i) => {
          const indent = r.level * 16;
          const bg = r.isGroup ? '#f5f7fa' : '#ffffff';
          const fontW = r.isGroup ? 'bold' : 'normal';

          return `
          <tr style="background-color: ${bg}; font-weight: ${fontW}">
            <td style="padding-left: ${indent + 8}px;">${r.particulars}</td>
            <td class="text-right">${r.opDr !== undefined ? fmtAmt(r.opDr) : ''}</td>
            <td class="text-right">${r.opCr !== undefined ? fmtAmt(r.opCr) : ''}</td>
            <td class="text-right">${r.transDr !== undefined ? fmtAmt(r.transDr) : ''}</td>
            <td class="text-right">${r.transCr !== undefined ? fmtAmt(r.transCr) : ''}</td>
            <td class="text-right bold">${r.clDr !== undefined ? fmtAmt(r.clDr) : ''}</td>
            <td class="text-right bold">${r.clCr !== undefined ? fmtAmt(r.clCr) : ''}</td>
          </tr>
        `;
        })
        .join('');

      pageContent = `
        <div class="container">
          ${copyLabel ? `<div class="copy-badge">${copyLabel}</div>` : ''}
          ${companyHeaderHTML}
          ${titleHTML}

          <table>
            <thead>
              <tr>
                <th rowspan="2">Particulars</th>
                <th colspan="2" class="text-center" style="border-bottom: 1px solid #ddd;">Opening Balance</th>
                <th colspan="2" class="text-center" style="border-bottom: 1px solid #ddd;">Transactions</th>
                <th colspan="2" class="text-center" style="border-bottom: 1px solid #ddd;">Closing Balance</th>
              </tr>
              <tr>
                <th class="text-right" style="width: 100px;">Debit</th>
                <th class="text-right" style="width: 100px;">Credit</th>
                <th class="text-right" style="width: 100px;">Debit</th>
                <th class="text-right" style="width: 100px;">Credit</th>
                <th class="text-right" style="width: 110px;">Debit</th>
                <th class="text-right" style="width: 110px;">Credit</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
              <tr class="total-row">
                <td>Grand Total</td>
                <td class="text-right">${fmtAmt(data.totals.opDr)}</td>
                <td class="text-right">${fmtAmt(data.totals.opCr)}</td>
                <td class="text-right">${fmtAmt(data.totals.transDr)}</td>
                <td class="text-right">${fmtAmt(data.totals.transCr)}</td>
                <td class="text-right">₹ ${fmtAmt(data.totals.clDr)}</td>
                <td class="text-right">₹ ${fmtAmt(data.totals.clCr)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // ──────────────────────────────────────────
    // DAYBOOK LAYOUT
    // ──────────────────────────────────────────
    else if (data.type === 'daybook') {
      const rowsHTML = data.vouchers
        .map((v, i) => {
          const bg = v.voided ? '#fff4f4' : i % 2 === 0 ? '#ffffff' : '#fcfcfc';
          const textDec = v.voided ? 'text-decoration: line-through; color: #999;' : '';

          return `
          <tr style="background-color: ${bg}; ${textDec}">
            <td>${v.date}</td>
            <td>
              <div class="bold">${v.particulars}</div>
            </td>
            <td>${v.vchType}</td>
            <td class="text-center">${v.vchNo}</td>
            <td class="text-right bold" style="color: #7a0000;">${v.debitAmount ? fmtAmt(v.debitAmount) : ''}</td>
            <td class="text-right bold" style="color: #006b00;">${v.creditAmount ? fmtAmt(v.creditAmount) : ''}</td>
          </tr>
        `;
        })
        .join('');

      pageContent = `
        <div class="container">
          ${copyLabel ? `<div class="copy-badge">${copyLabel}</div>` : ''}
          ${companyHeaderHTML}
          ${titleHTML}

          <table>
            <thead>
              <tr>
                <th style="width: 100px;">Date</th>
                <th>Particulars</th>
                <th style="width: 120px;">Vch Type</th>
                <th class="text-center" style="width: 80px;">Vch No.</th>
                <th class="text-right" style="width: 130px;">Debit</th>
                <th class="text-right" style="width: 130px;">Credit</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
              <tr class="total-row">
                <td colspan="4" class="text-right">Total</td>
                <td class="text-right">₹ ${fmtAmt(data.drTotal)}</td>
                <td class="text-right">₹ ${fmtAmt(data.crTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // ──────────────────────────────────────────
    // CASH BANK BOOK LAYOUT
    // ──────────────────────────────────────────
    else if (data.type === 'cash_bank_book') {
      const bankAccountsHTML = data.bankAccounts.map(b => `
        <tr>
          <td style="padding-left: 20px; font-size: 9pt; border: none;">${b.name}</td>
          <td class="text-right" style="font-size: 9pt; border: none;">₹ ${fmtAmt(b.balance)}</td>
        </tr>
      `).join('');

      const cashInHandHTML = data.cashInHand.map(c => `
        <tr>
          <td style="padding-left: 20px; font-size: 9pt; border: none;">${c.name}</td>
          <td class="text-right" style="font-size: 9pt; border: none;">₹ ${fmtAmt(c.balance)}</td>
        </tr>
      `).join('');

      pageContent = `
        <div class="container text-black">
          ${copyLabel ? `<div class="copy-badge">${copyLabel}</div>` : ''}
          ${companyHeaderHTML}
          ${titleHTML}

          <table>
            <thead>
              <tr style="background-color: #004050; color: #fff;">
                <th style="color: #fff;">Particulars</th>
                <th class="text-right" style="color: #fff; width: 180px;">Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr class="bold" style="background-color: #eff6ff;">
                <td>🏦 Bank Accounts</td>
                <td class="text-right">₹ ${fmtAmt(data.bankTotal)}</td>
              </tr>
              ${bankAccountsHTML}
              <tr class="bold" style="background-color: #f0fdf4;">
                <td>👛 Cash-in-Hand</td>
                <td class="text-right">₹ ${fmtAmt(data.cashTotal)}</td>
              </tr>
              ${cashInHandHTML}
              <tr class="total-row">
                <td>Grand Total</td>
                <td class="text-right">₹ ${fmtAmt(data.grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div class="flow-box">
            <div class="flow-column">
              <div class="bold" style="font-size: 8pt; color: #888; text-transform: uppercase;">Total Inflow</div>
              <div class="bold" style="font-size: 12pt; color: #16a34a; margin-top: 2px;">₹ ${fmtAmt(data.inflow)}</div>
            </div>
            <div class="flow-column">
              <div class="bold" style="font-size: 8pt; color: #888; text-transform: uppercase;">Total Outflow</div>
              <div class="bold" style="font-size: 12pt; color: #dc2626; margin-top: 2px;">₹ ${fmtAmt(data.outflow)}</div>
            </div>
            <div class="flow-column" style="background-color: #f0fdfa;">
              <div class="bold" style="font-size: 8pt; color: #004050; text-transform: uppercase;">Net Cash Flow</div>
              <div class="bold" style="font-size: 12pt; color: #004050; margin-top: 2px;">₹ ${fmtAmt(data.netFlow)}</div>
            </div>
          </div>
        </div>
      `;
    }

    contentPages.push(`
      <div class="page-break">
        ${pageContent}
      </div>
    `);
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>TallyPrime Report Printer</title>
        <meta charset="utf-8" />
        ${styleBlock}
      </head>
      <body>
        ${contentPages.join('')}
      </body>
    </html>
  `;
};
