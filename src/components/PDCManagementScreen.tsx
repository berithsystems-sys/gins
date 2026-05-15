import React, { useState } from 'react';
import { motion } from 'motion/react';

interface PDC {
  id: string;
  payer: string;
  amount: number;
  chequeNo: string;
  chequeDate: string;
  status: 'PENDING' | 'CLEARED' | 'BOUNCED';
}

export default function PDCManagementScreen({ onBack }: { onBack: () => void }) {
  const [pdcs, setPdcs] = useState<PDC[]>([]);

  useEffect(() => {
    fetch('/api/pdcs')
      .then(r => r.json())
      .then(setPdcs)
      .catch(() => {
        setPdcs([]);
      });
  }, []);

  const markCleared = async (id: string) => {
    await fetch('/api/pdcs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'CLEARED' }) });
    setPdcs(pdcs.map(p => p.id === id ? { ...p, status: 'CLEARED' } : p));
  };

  const markBounced = async (id: string) => {
    await fetch('/api/pdcs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'BOUNCED' }) });
    setPdcs(pdcs.map(p => p.id === id ? { ...p, status: 'BOUNCED' } : p));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full bg-tally-bg">
      <div className="bg-tally-header text-white h-[35px] flex items-center justify-between px-3 border-b border-tally-hotkey">
         <span className="text-[12px] font-bold">PDC Management</span>
         <span className="text-[10px] text-tally-accent">Press ESC to go back</span>
      </div>
      <div className="p-6">
         <div className="bg-white p-4 border shadow-sm">
           <h3 className="text-sm font-bold text-tally-teal mb-3">Post-Dated Cheques</h3>
           <div className="grid gap-3">
             {pdcs.map(p => (
               <div key={p.id} className="flex justify-between items-center border p-2">
                 <div>
                   <div className="font-bold">{p.payer} • ₹ {p.amount}</div>
                   <div className="text-[10px] text-gray-500">Cheque: {p.chequeNo} • Date: {p.chequeDate}</div>
                 </div>
                 <div className="flex gap-2">
                   {p.status === 'PENDING' && (
                     <>
                       <button onClick={() => markCleared(p.id)} className="bg-green-600 text-white px-3 py-1 text-[10px] font-bold">Clear</button>
                       <button onClick={() => markBounced(p.id)} className="bg-red-600 text-white px-3 py-1 text-[10px] font-bold">Bounce</button>
                     </>
                   )}
                   {p.status !== 'PENDING' && (
                     <div className={`px-3 py-1 text-[10px] font-bold ${p.status === 'CLEARED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status}</div>
                   )}
                 </div>
               </div>
             ))}
           </div>
         </div>
         <div className="mt-4 flex justify-end">
           <button onClick={onBack} className="bg-tally-teal text-white px-4 py-1 text-[11px] font-bold">ESC: Back</button>
         </div>
      </div>
    </motion.div>
  );
}
