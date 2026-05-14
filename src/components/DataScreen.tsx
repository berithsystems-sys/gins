import React from 'react';
import { Database, Download, Upload, Shield } from 'lucide-react';

export default function DataScreen() {
  return (
    <div className="p-8 space-y-8">
      <div className="max-w-4xl mx-auto grid grid-cols-2 gap-6">
        <div className="border p-6 hover:border-tally-teal transition-colors group cursor-pointer bg-white">
          <div className="flex items-center gap-4 mb-4 text-tally-teal">
            <Download className="w-8 h-8" />
            <h3 className="font-bold uppercase tracking-tight">Backup Local Data</h3>
          </div>
          <p className="text-xs text-gray-400 mb-6 italic">Save a compressed snapshot of your entire database to your local machine.</p>
          <button 
            onClick={() => window.confirm('Start backup of all branch data?') && alert('Backup started... check downloads')}
            className="w-full py-2 bg-gray-100 group-hover:bg-tally-teal group-hover:text-white transition-all text-xs font-bold uppercase"
          >
            Run Backup (Alt+B)
          </button>
        </div>

        <div className="border p-6 hover:border-tally-teal transition-colors group cursor-pointer bg-white">
          <div className="flex items-center gap-4 mb-4 text-tally-teal">
            <Upload className="w-8 h-8" />
            <h3 className="font-bold uppercase tracking-tight">Restore from XML</h3>
          </div>
          <p className="text-xs text-gray-400 mb-6 italic">Import masters and transactions from a previously exported XML or Backup file.</p>
          <button className="w-full py-2 bg-gray-100 group-hover:bg-tally-teal group-hover:text-white transition-all text-xs font-bold uppercase">
            Restore Data (Alt+R)
          </button>
        </div>

        <div className="border p-6 hover:border-tally-teal transition-colors group cursor-pointer bg-white">
          <div className="flex items-center gap-4 mb-4 text-tally-teal">
            <Shield className="w-8 h-8" />
            <h3 className="font-bold uppercase tracking-tight">Data Integrity Check</h3>
          </div>
          <p className="text-xs text-gray-400 mb-6 italic">Scan database for orphan entries or inconsistent ledger balances.</p>
          <button className="w-full py-2 bg-gray-100 group-hover:bg-tally-teal group-hover:text-white transition-all text-xs font-bold uppercase">
            Verify Data
          </button>
        </div>

        <div className="border p-6 hover:border-tally-teal transition-colors group cursor-pointer bg-white">
          <div className="flex items-center gap-4 mb-4 text-tally-teal">
            <Database className="w-8 h-8" />
            <h3 className="font-bold uppercase tracking-tight">Sync with HQ</h3>
          </div>
          <p className="text-xs text-gray-400 mb-6 italic">Push local changes and pull global master updates from HQ server.</p>
          <button className="w-full py-2 bg-gray-100 group-hover:bg-tally-teal group-hover:text-white transition-all text-xs font-bold uppercase">
            Sync Now (Alt+S)
          </button>
        </div>
      </div>
    </div>
  );
}
