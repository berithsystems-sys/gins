import * as XLSX from 'xlsx';

interface PrintSettings {
  printShowHeader: boolean;
  printShowFooter: boolean;
  printShowPageNumbers: boolean;
  printShowCompanyName: boolean;
  printPageSize: 'A4' | 'A3' | 'Letter';
  printMargin: number;
  companyName: string;
}

export const getPrintSettings = (): PrintSettings => {
  const saved = localStorage.getItem('appSettings');
  if (saved) {
    const settings = JSON.parse(saved);
    return {
      printShowHeader: settings.printShowHeader !== false,
      printShowFooter: settings.printShowFooter !== false,
      printShowPageNumbers: settings.printShowPageNumbers !== false,
      printShowCompanyName: settings.printShowCompanyName !== false,
      printPageSize: settings.printPageSize || 'A4',
      printMargin: settings.printMargin || 0.5,
      companyName: settings.companyName || 'BERITHSYSTEMS'
    };
  }
  return {
    printShowHeader: true,
    printShowFooter: true,
    printShowPageNumbers: true,
    printShowCompanyName: true,
    printPageSize: 'A4',
    printMargin: 0.5,
    companyName: 'BERITHSYSTEMS'
  };
};

export const applyPrintStyles = () => {
  const settings = getPrintSettings();
  
  // Create a style element for print
  const styleId = 'print-settings-style';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement;
  
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const pageSize = settings.printPageSize === 'A3' ? 'A3' : settings.printPageSize === 'Letter' ? 'letter' : 'A4';
  const marginInches = settings.printMargin;

  styleEl.textContent = `
    @media print {
      @page {
        size: ${pageSize};
        margin: ${marginInches}in;
      }

      body, html {
        height: auto;
        overflow: auto;
      }

      /* Report headers */
      #balance-sheet-report > div:first-child,
      #pl-report > div:first-child,
      #trial-balance-report > div:first-child,
      #daybook-report > div:first-child {
        display: ${settings.printShowHeader ? 'block' : 'none'};
      }

      /* Page numbers in footer */
      .print-page-number {
        display: ${settings.printShowPageNumbers ? 'block' : 'none'};
      }

      /* Page footer */
      .print-footer {
        display: ${settings.printShowFooter ? 'block' : 'none'};
      }

      /* Company name in header */
      .print-company-name {
        display: ${settings.printShowCompanyName ? 'inline-block' : 'none'};
      }

      /* Ensure tables break properly */
      table {
        page-break-inside: avoid;
        width: 100%;
        border-collapse: collapse;
      }

      thead, tfoot {
        display: table-header-group;
      }

      tr {
        page-break-inside: avoid;
      }

      /* Remove buttons from print */
      button {
        display: none !important;
      }

      /* Optimize text for print */
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body {
        font-size: 11pt;
        line-height: 1.4;
        color: #000;
      }
    }
  `;
};

export const printReport = (reportId: string) => {
  // Apply print settings before printing
  applyPrintStyles();
  
  // Add data attributes for header/footer support
  const reportEl = document.getElementById(reportId);
  if (reportEl) {
    const settings = getPrintSettings();
    if (!settings.printShowHeader) {
      reportEl.style.marginTop = '0';
    }
  }
  
  // Trigger print dialog
  window.print();
};

export const exportToExcel = (data: any[], fileName: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const printDiv = (id: string) => {
  const content = document.getElementById(id);
  if (!content) return;
  const originalBody = document.body.innerHTML;
  document.body.innerHTML = content.innerHTML;
  window.print();
  document.body.innerHTML = originalBody;
  window.location.reload(); // To restore react state
};
