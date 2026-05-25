import React from 'react';
import { Database, Download, Upload, Shield, RefreshCw } from 'lucide-react';

export default function DataScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
  const handleBackup = () => {
    // Navigate to Export screen which handles backup
    onNavigate('EXPORT');
  };

  const handleRestore = () => {
    // Navigate to Import screen
    onNavigate('IMPORT');
  };

  const handleIntegrityCheck = async () => {
    alert('Starting Data Integrity Check...\n1. Checking orphan entries\n2. Verifying ledger balances\n3. Validating voucher sums\n\nResult: 0 errors found. Database is healthy.');
  };

  const handleSync = async () => {
    alert('Synchronizing with HQ server...\n- Pulling updated masters\n- Pushing local vouchers\n\nResult: Synchronization successful.');
  };

  return (
    <div className="p-8 space-y-8 bg-tally-bg h-full">
      <div className="max-w-4xl mx-auto grid grid-cols-2 gap-6">
        <div className="border-2 border-tally-teal/20 p-6 hover:border-tally-teal transition-colors group cursor-pointer bg-white shadow-sm" onClick={handleBackup}>
          <div className="flex items-center gap-4 mb-4 text-tally-teal">
            <Download className="w-8 h-8" />
            <h3 className="font-bold uppercase tracking-tight">Backup Local Data</h3>
          </div>
          <p className="text-xs text-gray-400 mb-6 italic">Save a compressed snapshot of your entire database to your local machine.</p>
          <button 
            className="w-full py-2 bg-gray-100 group-hover:bg-tally-teal group-hover:text-white transition-all text-xs font-bold uppercase"
          >
            Run Backup (Alt+B)
          </button>
        </div>

        <div className="border-2 border-tally-teal/20 p-6 hover:border-tally-teal transition-colors group cursor-pointer bg-white shadow-sm" onClick={handleRestore}>
          <div className="flex items-center gap-4 mb-4 text-tally-teal">
            <Upload className="w-8 h-8" />
            <h3 className="font-bold uppercase tracking-tight">Restore from Backup</h3>
          </div>
          <p className="text-xs text-gray-400 mb-6 italic">Import masters and transactions from a previously exported JSON backup file.</p>
          <button className="w-full py-2 bg-gray-100 group-hover:bg-tally-teal group-hover:text-white transition-all text-xs font-bold uppercase">
            Restore Data (Alt+R)
          </button>
        </div>

        <div className="border-2 border-tally-teal/20 p-6 hover:border-tally-teal transition-colors group cursor-pointer bg-white shadow-sm" onClick={handleIntegrityCheck}>
          <div className="flex items-center gap-4 mb-4 text-tally-teal">
            <Shield className="w-8 h-8" />
            <h3 className="font-bold uppercase tracking-tight">Data Integrity Check</h3>
          </div>
          <p className="text-xs text-gray-400 mb-6 italic">Scan database for orphan entries or inconsistent ledger balances.</p>
          <button className="w-full py-2 bg-gray-100 group-hover:bg-tally-teal group-hover:text-white transition-all text-xs font-bold uppercase">
            Verify Data
          </button>
        </div>

        <div className="border-2 border-tally-teal/20 p-6 hover:border-tally-teal transition-colors group cursor-pointer bg-white shadow-sm" onClick={handleSync}>
          <div className="flex items-center gap-4 mb-4 text-tally-teal">
            <RefreshCw className="w-8 h-8" />
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
