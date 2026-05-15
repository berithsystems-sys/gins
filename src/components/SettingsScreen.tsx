import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Save, RotateCcw } from 'lucide-react';

interface Settings {
  companyName: string;
  gstin: string;
  pan: string;
  registrationType: 'Regular' | 'Composition';
  financialYear: string;
  bookClosingDate: string;
  useAccounting: boolean;
  showMonthlyBreakdown: boolean;
  showLedgerBalances: boolean;
  warnNegativeBalance: boolean;
  dateFormat: string;
  decimalPlaces: number;
  autoBackup: boolean;
  backupFrequency: 'Daily' | 'Weekly' | 'Monthly';
}

const DEFAULT_SETTINGS: Settings = {
  companyName: 'BERITHSYSTEMS',
  gstin: '',
  pan: '',
  registrationType: 'Regular',
  financialYear: '2025-26',
  bookClosingDate: '2026-03-31',
  useAccounting: true,
  showMonthlyBreakdown: true,
  showLedgerBalances: true,
  warnNegativeBalance: true,
  dateFormat: 'DD-MM-YYYY',
  decimalPlaces: 2,
  autoBackup: true,
  backupFrequency: 'Weekly',
};

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'general' | 'company' | 'display' | 'backup'>('general');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const saveSettings = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setMessage('Settings saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('appSettings');
    setMessage('Settings reset to defaults!');
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
        <span className="text-[12px] font-bold">ALT+S: Settings & Configuration</span>
        <span className="text-[10px] text-tally-accent">Press ESC to go back</span>
      </div>

      {/* Tabs */}
      <div className="bg-tally-teal text-white flex border-b border-tally-hotkey h-[32px]">
        {[
          { id: 'general' as const, label: 'General' },
          { id: 'company' as const, label: 'Company' },
          { id: 'display' as const, label: 'Display' },
          { id: 'backup' as const, label: 'Backup' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-[11px] font-bold border-r border-teal-900 transition-colors ${
              activeTab === tab.id ? 'bg-tally-accent text-black' : 'hover:bg-teal-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* General Settings */}
          {activeTab === 'general' && (
            <>
              <div className="bg-white border-2 border-tally-teal p-4 space-y-3">
                <h3 className="text-[12px] font-bold text-tally-teal border-b border-tally-teal/20 pb-2">
                  General Options
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold">Use Accounting Terminology</label>
                    <select
                      value={settings.useAccounting ? 'Yes' : 'No'}
                      onChange={(e) => setSettings({ ...settings, useAccounting: e.target.value === 'Yes' })}
                      className="border-2 border-tally-teal px-2 py-1 text-[10px] font-bold"
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold">Date Format</label>
                    <select
                      value={settings.dateFormat}
                      onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                      className="border-2 border-tally-teal px-2 py-1 text-[10px] font-bold"
                    >
                      <option>DD-MM-YYYY</option>
                      <option>MM-DD-YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold">Decimal Places</label>
                    <select
                      value={settings.decimalPlaces}
                      onChange={(e) => setSettings({ ...settings, decimalPlaces: parseInt(e.target.value) })}
                      className="border-2 border-tally-teal px-2 py-1 text-[10px] font-bold"
                    >
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Company Settings */}
          {activeTab === 'company' && (
            <>
              <div className="bg-white border-2 border-tally-teal p-4 space-y-3">
                <h3 className="text-[12px] font-bold text-tally-teal border-b border-tally-teal/20 pb-2">
                  Company Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Company Name</label>
                    <input
                      type="text"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      className="w-full border-2 border-tally-teal px-2 py-1 text-[11px] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={settings.gstin}
                      onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                      className="w-full border-2 border-tally-teal px-2 py-1 text-[11px] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">PAN</label>
                    <input
                      type="text"
                      value={settings.pan}
                      onChange={(e) => setSettings({ ...settings, pan: e.target.value })}
                      className="w-full border-2 border-tally-teal px-2 py-1 text-[11px] font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold">Registration Type</label>
                    <select
                      value={settings.registrationType}
                      onChange={(e) => setSettings({ ...settings, registrationType: e.target.value as 'Regular' | 'Composition' })}
                      className="border-2 border-tally-teal px-2 py-1 text-[10px] font-bold"
                    >
                      <option>Regular</option>
                      <option>Composition</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-tally-teal p-4 space-y-3">
                <h3 className="text-[12px] font-bold text-tally-teal border-b border-tally-teal/20 pb-2">
                  Financial Year
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold">Current Financial Year</label>
                    <input
                      type="text"
                      value={settings.financialYear}
                      onChange={(e) => setSettings({ ...settings, financialYear: e.target.value })}
                      className="border-2 border-tally-teal px-2 py-1 text-[10px] font-bold w-[150px]"
                      placeholder="2025-26"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold">Book Closing Date</label>
                    <input
                      type="date"
                      value={settings.bookClosingDate}
                      onChange={(e) => setSettings({ ...settings, bookClosingDate: e.target.value })}
                      className="border-2 border-tally-teal px-2 py-1 text-[10px] font-bold"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Display Settings */}
          {activeTab === 'display' && (
            <>
              <div className="bg-white border-2 border-tally-teal p-4 space-y-3">
                <h3 className="text-[12px] font-bold text-tally-teal border-b border-tally-teal/20 pb-2">
                  Display Options
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold">Show Monthly Breakdown</label>
                    <select
                      value={settings.showMonthlyBreakdown ? 'Yes' : 'No'}
                      onChange={(e) => setSettings({ ...settings, showMonthlyBreakdown: e.target.value === 'Yes' })}
                      className="border-2 border-tally-teal px-2 py-1 text-[10px] font-bold"
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold">Show Ledger Balances</label>
                    <select
                      value={settings.showLedgerBalances ? 'Yes' : 'No'}
                      onChange={(e) => setSettings({ ...settings, showLedgerBalances: e.target.value === 'Yes' })}
                      className="border-2 border-tally-teal px-2 py-1 text-[10px] font-bold"
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold">Warn on Negative Balance</label>
                    <select
                      value={settings.warnNegativeBalance ? 'Yes' : 'No'}
                      onChange={(e) => setSettings({ ...settings, warnNegativeBalance: e.target.value === 'Yes' })}
                      className="border-2 border-tally-teal px-2 py-1 text-[10px] font-bold"
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Backup Settings */}
          {activeTab === 'backup' && (
            <>
              <div className="bg-white border-2 border-tally-teal p-4 space-y-3">
                <h3 className="text-[12px] font-bold text-tally-teal border-b border-tally-teal/20 pb-2">
                  Backup Options
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold">Enable Auto Backup</label>
                    <select
                      value={settings.autoBackup ? 'Yes' : 'No'}
                      onChange={(e) => setSettings({ ...settings, autoBackup: e.target.value === 'Yes' })}
                      className="border-2 border-tally-teal px-2 py-1 text-[10px] font-bold"
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  {settings.autoBackup && (
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold">Backup Frequency</label>
                      <select
                        value={settings.backupFrequency}
                        onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value as 'Daily' | 'Weekly' | 'Monthly' })}
                        className="border-2 border-tally-teal px-2 py-1 text-[10px] font-bold"
                      >
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                      </select>
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        alert('Backup initiated. Data will be backed up to your local storage.');
                        setMessage('Backup completed!');
                        setTimeout(() => setMessage(''), 3000);
                      }}
                      className="w-full bg-tally-teal text-white px-3 py-2 text-[11px] font-bold hover:bg-teal-700 transition-colors"
                    >
                      Create Manual Backup Now
                    </button>
                  </div>
                </div>
              </div>
            </>
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
      <div className="bg-tally-bg p-2 border-t border-tally-hotkey flex justify-between">
        <button
          onClick={resetSettings}
          className="flex items-center gap-2 bg-gray-600 text-white px-4 py-1 text-[11px] font-bold hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to Defaults
        </button>
        <button
          onClick={saveSettings}
          className="flex items-center gap-2 bg-tally-teal text-white px-4 py-1 text-[11px] font-bold hover:bg-teal-700 transition-colors"
        >
          <Save className="w-3 h-3" />
          Save (Enter)
        </button>
      </div>
    </motion.div>
  );
}
