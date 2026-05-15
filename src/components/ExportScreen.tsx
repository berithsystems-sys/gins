import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Download, CheckCircle2 } from 'lucide-react';

interface ExportOption {
  id: string;
  label: string;
  description: string;
  selected: boolean;
}

export default function ExportScreen({ onBack }: { onBack: () => void }) {
  const [exportMode, setExportMode] = useState<'export' | 'email'>('export');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [exportOptions, setExportOptions] = useState<ExportOption[]>([
    { id: 'include_header', label: 'Include Header', description: 'Company header info', selected: true },
    { id: 'include_summary', label: 'Include Summary', description: 'Summary totals', selected: true },
    { id: 'format_bold', label: 'Bold Headers', description: 'Format headers in bold', selected: true },
    { id: 'include_date', label: 'Include Date', description: 'Print export date', selected: true },
  ]);
  const [email, setEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('Financial Report');
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('');

  const toggleOption = (id: string) => {
    setExportOptions(exportOptions.map(opt =>
      opt.id === id ? { ...opt, selected: !opt.selected } : opt
    ));
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const filename = `Report_${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : exportFormat === 'pdf' ? 'pdf' : 'csv'}`;
    const link = document.createElement('a');
    link.href = '#';
    link.download = filename;
    link.click();

    setMessage(`Report exported as ${exportFormat.toUpperCase()}`);
    setIsExporting(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEmail = async () => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }

    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    alert(`Report would be sent to: ${email}\nSubject: ${emailSubject}\nFormat: ${exportFormat.toUpperCase()}`);
    setMessage('Email sent successfully');
    setIsExporting(false);
    setTimeout(() => setMessage(''), 3000);
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
        <span className="text-[12px] font-bold">ALT+E: Export & Email</span>
        <span className="text-[10px] text-tally-accent">Press ESC to go back</span>
      </div>

      {/* Mode Selector */}
      <div className="bg-tally-teal text-white flex border-b border-tally-hotkey h-[32px]">
        {[
          { id: 'export' as const, label: 'Export to File' },
          { id: 'email' as const, label: 'Email Report' },
        ].map((mode) => (
          <button
            key={mode.id}
            onClick={() => setExportMode(mode.id)}
            className={`flex-1 text-[11px] font-bold border-r border-teal-900 transition-colors ${
              exportMode === mode.id ? 'bg-tally-accent text-black' : 'hover:bg-teal-700'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Format Selection */}
          <div className="bg-white border-2 border-tally-teal p-4 space-y-3">
            <h3 className="text-[12px] font-bold text-tally-teal border-b border-tally-teal/20 pb-2">
              Export Format
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'excel' as const, label: 'Excel (.xlsx)', icon: '📊' },
                { id: 'pdf' as const, label: 'PDF', icon: '📄' },
                { id: 'csv' as const, label: 'CSV', icon: '📋' },
              ].map(format => (
                <button
                  key={format.id}
                  onClick={() => setExportFormat(format.id)}
                  className={`p-3 border-2 rounded text-center transition-colors ${
                    exportFormat === format.id
                      ? 'border-tally-teal bg-tally-teal/10'
                      : 'border-gray-300 hover:border-tally-teal'
                  }`}
                >
                  <div className="text-lg mb-1">{format.icon}</div>
                  <div className="text-[10px] font-bold">{format.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-white border-2 border-tally-teal p-4 space-y-3">
            <h3 className="text-[12px] font-bold text-tally-teal border-b border-tally-teal/20 pb-2">
              Content Options
            </h3>
            <div className="space-y-2">
              {exportOptions.map(option => (
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

          {/* Email Section (if in email mode) */}
          {exportMode === 'email' && (
            <div className="bg-white border-2 border-tally-teal p-4 space-y-3">
              <h3 className="text-[12px] font-bold text-tally-teal border-b border-tally-teal/20 pb-2">
                Email Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-600 block mb-1">Recipient Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="w-full border-2 border-tally-teal px-2 py-1 text-[11px] font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-600 block mb-1">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full border-2 border-tally-teal px-2 py-1 text-[11px] font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-600 block mb-1">Message</label>
                  <textarea
                    placeholder="Add a message..."
                    className="w-full border-2 border-tally-teal px-2 py-1 text-[11px] font-bold resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="bg-green-100 text-green-800 px-4 py-2 text-[11px] font-bold border-b border-green-300">
          ✓ {message}
        </div>
      )}

      {/* Footer */}
      <div className="bg-tally-bg p-2 border-t border-tally-hotkey flex justify-end gap-2">
        <button
          onClick={onBack}
          className="bg-gray-600 text-white px-4 py-1 text-[11px] font-bold hover:bg-gray-700 transition-colors"
        >
          ESC: Cancel
        </button>
        <button
          onClick={exportMode === 'export' ? handleExport : handleEmail}
          disabled={isExporting}
          className="flex items-center gap-2 bg-tally-teal text-white px-4 py-1 text-[11px] font-bold hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {exportMode === 'export' ? (
            <>
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export (Enter)'}
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              {isExporting ? 'Sending...' : 'Send (Enter)'}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
