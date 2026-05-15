import React from 'react';
import { jsPDF } from 'jspdf';
import { motion } from 'motion/react';
import { Printer } from 'lucide-react';

export default function ChequePrintScreen({ onBack }: { onBack: () => void }) {
  const sampleCheque = {
    payee: 'Recipient Name',
    amountWords: 'Fifty Thousand Only',
    amount: '50,000.00',
    date: new Date().toISOString().slice(0,10),
    bank: 'State Bank of India',
    branch: 'HQ',
    chequeNo: '000123'
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFontSize(12);
    doc.text('Pay', 20, 40);
    doc.text(`Payee: ${sampleCheque.payee}`, 20, 60);
    doc.text(`Amount: ${sampleCheque.amount}`, 150, 60);
    doc.text(`Amount (words): ${sampleCheque.amountWords}`, 20, 80);
    doc.text(`Date: ${sampleCheque.date}`, 20, 100);
    doc.save(`cheque_${sampleCheque.chequeNo}.pdf`);
  };

  const batchPrintReconciled = async () => {
    // fetch reconciled items and generate a multi-page PDF
    const resp = await fetch('/api/bank/reconciliations?status=RECONCILED');
    const rows = await resp.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      alert('No reconciled items to print');
      return;
    }
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    rows.forEach((r: any, idx: number) => {
      if (idx > 0) doc.addPage();
      doc.setFontSize(12);
      doc.text(`Payee: ${r.particulars || 'Unknown'}`, 20, 40);
      doc.text(`Amount: ${Number(r.amount || 0).toFixed(2)}`, 150, 40);
      doc.text(`Date: ${r.date || ''}`, 20, 60);
      doc.text(`Ref: ${r.reference || r.id}`, 20, 80);
    });
    doc.save(`cheque_batch_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full bg-tally-bg">
      <div className="bg-tally-header text-white h-[35px] flex items-center justify-between px-3 border-b border-tally-hotkey">
         <span className="text-[12px] font-bold">Cheque Printing</span>
         <span className="text-[10px] text-tally-accent">Press ESC to go back</span>
      </div>
      <div className="p-6">
         <div className="bg-white p-4 border shadow-sm max-w-2xl">
           <div className="flex justify-between items-center mb-4">
             <div>
               <div className="text-sm font-bold">{sampleCheque.bank} - {sampleCheque.branch}</div>
               <div className="text-xs text-gray-500">Cheque No: {sampleCheque.chequeNo}</div>
             </div>
             <div className="text-right">
               <div className="text-lg font-bold">₹ {sampleCheque.amount}</div>
               <div className="text-xs">{sampleCheque.date}</div>
             </div>
           </div>
           <div className="border-t pt-3">
             <div className="text-[11px] font-bold">Pay To: {sampleCheque.payee}</div>
             <div className="text-[10px] text-gray-500 mt-2">{sampleCheque.amountWords}</div>
           </div>
         </div>
         <div className="mt-4 flex gap-2 justify-end">
           <button onClick={onBack} className="bg-gray-600 text-white px-4 py-1 text-[11px] font-bold">ESC: Cancel</button>
           <button onClick={exportPdf} className="bg-tally-teal text-white px-4 py-1 text-[11px] font-bold flex items-center gap-2"><Printer className="w-4 h-4"/>Export as PDF</button>
           <button onClick={batchPrintReconciled} className="bg-blue-600 text-white px-4 py-1 text-[11px] font-bold">Batch Print Reconciled</button>
         </div>
      </div>
    </motion.div>
  );
}
