import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Printer, FileText, CheckCircle2 } from 'lucide-react';

interface PrintOption {
  id: string;
  label: string;
  description: string;
  selected: boolean;
}

export default function PrintScreen({ onBack, currentScreen }: { onBack: () => void; currentScreen: string }) {
  const [printOptions, setPrintOptions] = useState<PrintOption[]>([
    { id: 'include_header', label: 'Include Header', description: 'Print company header info', selected: true },
    { id: 'include_footer', label: 'Include Footer', description: 'Print page number and date', selected: true },
    { id: 'show_details', label: 'Show Details', description: 'Print line item details', selected: true },
    { id: 'show_summary', label: 'Show Summary', description: 'Print summary totals', selected: true },
    { id: 'landscape', label: 'Landscape Mode', description: 'Print in landscape orientation', selected: false },
  ]);
  const [copies, setCopies] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  const toggleOption = (id: string) => {
    setPrintOptions(printOptions.map(opt => 
      opt.id === id ? { ...opt, selected: !opt.selected } : opt
    ));
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    // Simulate printing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const printContent = generatePrintContent();
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    
    setIsPrinting(false);
  };

  const generatePrintContent = () => {
    const orientation = printOptions.find(o => o.id === 'landscape')?.selected ? 'landscape' : 'portrait';
    const html = `
      <html>
        <head>
          <title>Print Report</title>
          <style>
            @media print { @page { margin: 10mm; orientation: ${orientation}; } }
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .company-name { font-size: 16px; font-weight: bold; }
            .report-title { font-size: 14px; margin-top: 10px; }
            .content { margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; border-top: 2px solid #000; padding-top: 10px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
          </style>
        </head>
        <body>
          ${printOptions.find(o => o.id === 'include_header')?.selected ? `
            <div class="header">
              <div class="company-name">BERITHSYSTEMS</div>
              <div class="report-title">Financial Report - ${new Date().toLocaleDateString()}</div>
            </div>
          ` : ''}
          
          <div class="content">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Cash in Hand</td><td>50,000</td><td>-</td><td>50,000</td></tr>
                <tr><td>Bank Account</td><td>100,000</td><td>-</td><td>100,000</td></tr>
                <tr><td>Sales</td><td>-</td><td>200,000</td><td>200,000</td></tr>
              </tbody>
            </table>
          </div>
          
          ${printOptions.find(o => o.id === 'include_footer')?.selected ? `
            <div class="footer">
              Page 1 of 1 | Printed on ${new Date().toLocaleDateString()}
            </div>
          ` : ''}
        </body>
      </html>
    `;
    return html;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-tally-bg"
    >
      {/* Header */}
      <div className="bg-tally-header text-white h-[35px] flex items-center justify-between px-3 border-b border-tally-hotkey">
        <span className="text-[12px] font-bold">ALT+P: Print Report</span>
        <span className="text-[10px] text-tally-accent">Press ESC to go back</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Print Options */}
          <div className="bg-white border-2 border-tally-teal p-4 space-y-3">
            <h3 className="text-[12px] font-bold text-tally-teal border-b border-tally-teal/20 pb-2">
              Print Options
            </h3>
            <div className="space-y-2">
              {printOptions.map(option => (
                <div
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  className="flex items-start gap-3 p-2 cursor-pointer hover:bg-gray-50 rounded border border-gray-100"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    option.selected ? 'bg-tally-teal border-tally-teal' : 'border-gray-300'
                  }`}>
                    {option.selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-bold">{option.label}</div>
                    <div className="text-[10px] text-gray-500">{option.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Copies */}
          <div className="bg-white border-2 border-tally-teal p-4 space-y-3">
            <h3 className="text-[12px] font-bold text-tally-teal border-b border-tally-teal/20 pb-2">
              Print Settings
            </h3>
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold">Number of Copies</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="bg-gray-300 text-black px-3 py-1 text-[11px] font-bold hover:bg-gray-400"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="border-2 border-tally-teal px-2 py-1 text-[11px] font-bold w-[50px] text-center"
                />
                <button
                  onClick={() => setCopies(copies + 1)}
                  className="bg-gray-300 text-black px-3 py-1 text-[11px] font-bold hover:bg-gray-400"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white border-2 border-tally-teal p-4 space-y-3">
            <h3 className="text-[12px] font-bold text-tally-teal border-b border-tally-teal/20 pb-2">
              Preview
            </h3>
            <div className="bg-gray-100 border border-gray-300 p-4 text-[10px] font-mono space-y-1">
              {printOptions.find(o => o.id === 'include_header')?.selected && (
                <>
                  <div className="text-center font-bold">BERITHSYSTEMS</div>
                  <div className="text-center">Financial Report</div>
                  <div className="border-t border-gray-400 my-2"></div>
                </>
              )}
              <div>Account                          Debit      Credit    Balance</div>
              <div>Cash in Hand                   50,000         -      50,000</div>
              <div>Bank Account                  100,000         -     100,000</div>
              {printOptions.find(o => o.id === 'include_footer')?.selected && (
                <div className="border-t border-gray-400 mt-4 pt-2 text-center text-[9px]">
                  Page 1 of 1
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-tally-bg p-2 border-t border-tally-hotkey flex justify-end gap-2">
        <button
          onClick={onBack}
          className="bg-gray-600 text-white px-4 py-1 text-[11px] font-bold hover:bg-gray-700 transition-colors"
        >
          ESC: Cancel
        </button>
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex items-center gap-2 bg-tally-teal text-white px-4 py-1 text-[11px] font-bold hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          {isPrinting ? 'Printing...' : 'Print (Enter)'}
        </button>
      </div>
    </motion.div>
  );
}
