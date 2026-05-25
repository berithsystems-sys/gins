import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, FileJson, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function ImportScreen({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/json' && !selectedFile.name.endsWith('.json')) {
        setStatus({ type: 'error', message: 'Please select a valid JSON backup file' });
        return;
      }
      setFile(selectedFile);
      setStatus(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    const confirmImport = confirm("DANGER: Importing data will overwrite or merge with existing database records. It is highly recommended to take a backup first. Continue?");
    if (!confirmImport) return;

    setImporting(true);
    setStatus(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          // Simple validation of backup structure
          if (!data.branches || !data.ledgers || !data.vouchers) {
            throw new Error("Invalid backup format. Missing core tables.");
          }

          const response = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: content
          });

          if (response.ok) {
            const result = await response.json();
            setStatus({ 
              type: 'success', 
              message: `Import Successful! Processed ${result.vouchers || 0} vouchers and ${result.ledgers || 0} ledgers.` 
            });
          } else {
            const errData = await response.json();
            throw new Error(errData.error || 'Server failed to process import');
          }
        } catch (err: any) {
          setStatus({ type: 'error', message: `Import Failed: ${err.message}` });
        } finally {
          setImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Failed to read file' });
      setImporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-tally-bg"
    >
      {/* Header */}
      <div className="bg-tally-header text-white h-[35px] flex items-center justify-between px-3 border-b border-tally-hotkey">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          <span className="text-[12px] font-bold uppercase tracking-wider">Alt+O: Import Data (JSON)</span>
        </div>
        <button onClick={onBack} className="text-[10px] bg-white/10 px-2 py-0.5 rounded hover:bg-white/20">ESC: BACK</button>
      </div>

      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full space-y-6">
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 flex gap-4">
            <ShieldAlert className="w-8 h-8 text-orange-600 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-orange-800 uppercase">Critical Warning</h3>
              <p className="text-[11px] text-orange-700 mt-1">
                Importing data is a destructive operation. Ensure the backup file is from a compatible version of GINS ERP.
                Existing IDs will be matched and updated; new IDs will be created.
              </p>
            </div>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-4 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              file ? 'border-tally-teal bg-teal-50' : 'border-gray-300 hover:border-tally-teal hover:bg-gray-50'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".json"
            />
            <FileJson className={`w-16 h-16 mx-auto mb-4 ${file ? 'text-tally-teal' : 'text-gray-300'}`} />
            <h4 className="text-sm font-bold text-gray-700">
              {file ? file.name : 'Click to select JSON backup file'}
            </h4>
            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest">
              Only .json files are supported
            </p>
          </div>

          {status && (
            <div className={`p-4 border-2 flex items-start gap-3 ${
              status.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 
              status.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
              'bg-red-50 border-red-500 text-red-800'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span className="text-xs font-bold uppercase">{status.message}</span>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={onBack}
              className="px-8 py-2 bg-gray-200 text-gray-700 text-xs font-bold uppercase hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!file || importing}
              onClick={handleImport}
              className="px-8 py-2 bg-tally-teal text-white text-xs font-bold uppercase hover:bg-teal-700 shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                'Start Import'
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
