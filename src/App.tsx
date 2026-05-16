/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useHotkeys } from './hooks/useHotkeys';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Edit3,
  BookOpen, 
  Receipt, 
  Settings, 
  Database, 
  FileText,
  BarChart3,
  ShieldCheck,
  LayoutDashboard,
  Wallet,
  Users,
  LogOut,
  PlusCircle
} from 'lucide-react';
import VoucherScreen from './components/VoucherScreen';
import LedgerScreen from './components/LedgerScreen';
import DayBookScreen from './components/DayBookScreen';
import BalanceSheetScreen from './components/BalanceSheetScreen';
import PLScreen from './components/PLScreen';
import BankingScreen from './components/BankingScreen';
import LoginScreen from './components/LoginScreen';
import HQDashboard from './components/HQDashboard';
import AnalyticsScreen from './components/AnalyticsScreen';
import AuditLogScreen from './components/AuditLogScreen';
import AdminPanel from './components/AdminPanel';
import MastersDashboard from './components/masters/MastersDashboard';
import AlterMasterScreen from './components/AlterMasterScreen';
import CompanyScreen from './components/CompanyScreen';
import DataScreen from './components/DataScreen';
import CashBankBookScreen from './components/CashBankBookScreen';
import TrialBalanceScreen from './components/TrialBalanceScreen';
import ChartOfAccountsScreen from './components/ChartOfAccountsScreen';
import LedgerVouchersScreen from './components/LedgerVouchersScreen';
import SettingsScreen from './components/SettingsScreen';
import PrintScreen from './components/PrintScreen';
import ExportScreen from './components/ExportScreen';
import RatioAnalysisScreen from './components/RatioAnalysisScreen';
import { exportToExcel } from './lib/ReportUtils';

type User = {
  id: string;
  username: string;
  role: 'HQ' | 'BRANCH';
  branchId?: string;
};

type MenuOption = {
  id: string;
  label: string;
  key: string;
  icon?: React.ReactNode;
  shortcut?: string;
};

const GATEWAY_MENU = [
  { section: 'Masters', items: [
    { id: 'masters', label: 'Create', key: 'C' },
    { id: 'alter', label: 'Alter', key: 'A' },
    { id: 'chart', label: 'Chart of Accounts', key: 'H' },
  ]},
  { section: 'Transactions', items: [
    { id: 'vouchers', label: 'Vouchers', key: 'V' },
    { id: 'daybook', label: 'Day Book', key: 'K' },
  ]},
  { section: 'Utilities', items: [
    { id: 'banking', label: 'Banking', key: 'N' },
  ]},
  { section: 'Reports', items: [
    { id: 'balance_sheet', label: 'Balance Sheet', key: 'B' },
    { id: 'pl_account', label: 'Profit & Loss A/c', key: 'P' },
    { id: 'ratio_analysis', label: 'Ratio Analysis', key: 'R' },
    { id: 'trial_balance', label: 'Trial Balance', key: 'T' },
  ]}
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'GATEWAY' | 'VOUCHER' | 'LEDGER' | 'REPORTS' | 'HQ' | 'ANALYTICS' | 'AUDIT' | 'BANKING' | 'PAYROLL' | 'DAYBOOK' | 'COMPANY' | 'DATA' | 'EXCHANGE' | 'GOTO' | 'IMPORT' | 'EXPORT' | 'PRINT' | 'EMAIL' | 'SETTINGS' | 'ALTER' | 'BALANCE_SHEET' | 'PL_ACCOUNT' | 'RATIO' | 'CHART' | 'ADMIN' | 'TRIAL_BALANCE' | 'CASH_BANK_BOOK' | 'LEDGER_DETAIL'>('GATEWAY');
  const [voucherType, setVoucherType] = useState('Payment');
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(undefined);
  const [currentDate, setCurrentDate] = useState('2026-05-12');
  const [branches, setBranches] = useState<any[]>([]);
  const [allLedgers, setAllLedgers] = useState<any[]>([]);
  const [allVouchers, setAllVouchers] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');

  // Flattened menu for keyboard navigation
  const flatMenu = GATEWAY_MENU.flatMap(s => s.items);

  useEffect(() => {
    if (user?.role === 'HQ') {
      setCurrentScreen('HQ');
      // Fetch global data for analytics
      Promise.all([
        fetch('api/branches').then(res => res.json()),
        fetch('api/ledgers').then(res => res.json()),
        fetch('api/vouchers').then(res => res.json())
      ]).then(([b, l, v]) => {
        setBranches(b);
        setAllLedgers(l);
        setAllVouchers(v);
      });
    }
    else if (user?.role === 'BRANCH') {
      setCurrentScreen('GATEWAY');
      setSelectedBranchId(user.branchId);
      fetch(`api/branches`).then(res => res.json()).then(b => setBranches(b));
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [gotoSearch, setGotoSearch] = useState('');
  const [gotoHighlightedIdx, setGotoHighlightedIdx] = useState(0);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateInput, setDateInput] = useState(currentDate);

  const getFilteredGotoOptions = () => {
    const options = [
      { label: 'Balance Sheet', id: 'BALANCE_SHEET' },
      { label: 'Profit & Loss A/c', id: 'PL_ACCOUNT' },
      { label: 'Trial Balance', id: 'TRIAL_BALANCE' },
      { label: 'Day Book', id: 'DAYBOOK' },
      { label: 'Cash/Bank Book', id: 'CASH_BANK_BOOK' },
      { label: 'Ratio Analysis', id: 'RATIO' },
      { label: 'Chart of Accounts', id: 'CHART' },
      { label: 'Create Master', id: 'LEDGER' },
      { label: 'Alter Master', id: 'ALTER' },
      { label: 'Create Voucher', id: 'VOUCHER' },
      { label: 'Banking', id: 'BANKING' },
      { label: 'Audit Logs', id: 'AUDIT' },
      { label: 'Admin Panel', id: 'ADMIN' },
    ];
    return options.filter(o => o.label.toLowerCase().includes(gotoSearch.toLowerCase()));
  };

  useHotkeys('g', (e) => {
    e.preventDefault();
    setCurrentScreen('GOTO');
    setGotoSearch('');
    setGotoHighlightedIdx(0);
    // Focus the search input after a short delay
    setTimeout(() => {
      const input = document.getElementById('goto-search-input');
      if (input) input.focus();
    }, 50);
  });

  const handleGotoSelect = (item: any) => {
    setCurrentScreen(item.id);
  };

  const renderGoTo = () => {
    const filtered = getFilteredGotoOptions();
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-[400px] bg-white border-4 border-tally-teal shadow-2xl overflow-hidden"
        >
          <div className="bg-tally-teal text-white px-4 py-1 text-[10px] font-bold uppercase flex justify-between items-center">
            <span>Go To / Switch To</span>
            <button onClick={() => setCurrentScreen('GATEWAY')} className="hover:text-red-200">ESC: Close</button>
          </div>
          <div className="p-2 space-y-1">
            <input 
              id="goto-search-input"
              autoFocus 
              type="text" 
              placeholder="Type name of report up here..." 
              className="w-full border-b-2 border-tally-teal p-2 text-sm outline-none bg-blue-50/50 uppercase font-bold" 
              value={gotoSearch}
              onChange={(e) => {
                setGotoSearch(e.target.value);
                setGotoHighlightedIdx(0);
              }}
            />
            <div className="max-h-[300px] overflow-y-auto">
              {filtered.length > 0 ? filtered.map((item, idx) => (
                <div 
                  key={item.id} 
                  className={`px-4 py-2 cursor-pointer text-xs font-bold border-b border-gray-50 flex justify-between group transition-colors ${
                    gotoHighlightedIdx === idx ? 'bg-tally-accent text-black' : 'hover:bg-tally-teal hover:text-white'
                  }`}
                  onMouseEnter={() => setGotoHighlightedIdx(idx)}
                  onClick={() => {
                    handleGotoSelect(item);
                  }}
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-gray-300 group-hover:text-white/50 opacity-0 group-hover:opacity-100 italic">Select</span>
                </div>
              )) : (
                <div className="p-4 text-center text-xs italic text-gray-400 uppercase">No matching reports found</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  useHotkeys('up', (e) => {
    if (currentScreen === 'GATEWAY') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (currentScreen === 'GOTO') {
      e.preventDefault();
      setGotoHighlightedIdx(prev => Math.max(0, prev - 1));
    }
  }, { enableOnFormTags: true }, [currentScreen]);
  
  useHotkeys('down', (e) => {
    if (currentScreen === 'GATEWAY') {
      setSelectedIndex(prev => Math.min(flatMenu.length - 1, prev + 1));
    } else if (currentScreen === 'GOTO') {
      e.preventDefault();
      const filtered = getFilteredGotoOptions();
      setGotoHighlightedIdx(prev => Math.min(filtered.length - 1, prev + 1));
    }
  }, { enableOnFormTags: true }, [currentScreen, gotoSearch, flatMenu.length]);

  useHotkeys('enter', (e) => {
    if (currentScreen === 'GATEWAY') {
      const selectedId = flatMenu[selectedIndex].id;
      if (selectedId === 'vouchers') setCurrentScreen('VOUCHER');
      if (selectedId === 'masters') setCurrentScreen('LEDGER'); 
      if (selectedId === 'alter') setCurrentScreen('ALTER');
      if (selectedId === 'daybook') setCurrentScreen('DAYBOOK');
      if (selectedId === 'banking') setCurrentScreen('BANKING');
      if (selectedId === 'balance_sheet') setCurrentScreen('BALANCE_SHEET');
      if (selectedId === 'pl_account') setCurrentScreen('PL_ACCOUNT');
      if (selectedId === 'ratio_analysis') setCurrentScreen('RATIO');
      if (selectedId === 'trial_balance') setCurrentScreen('TRIAL_BALANCE');
      if (selectedId === 'chart') setCurrentScreen('CHART');
      if (selectedId === 'audit') setCurrentScreen('AUDIT');
    } else if (currentScreen === 'GOTO') {
      e.preventDefault();
      const filtered = getFilteredGotoOptions();
      if (filtered[gotoHighlightedIdx]) {
        handleGotoSelect(filtered[gotoHighlightedIdx]);
      }
    }
  }, { enableOnFormTags: true }, [currentScreen, selectedIndex, gotoHighlightedIdx, gotoSearch]);

  const handleBack = () => {
    if (showCalculator) {
      setShowCalculator(false);
      return;
    }

    if (showDateModal) {
      setShowDateModal(false);
      return;
    }

    if (currentScreen === 'GOTO') {
      setCurrentScreen('GATEWAY');
      return;
    }

    if (currentScreen === 'GATEWAY') {
      return;
    }

    if (['VOUCHER', 'LEDGER', 'ALTER', 'DAYBOOK', 'BANKING', 'BALANCE_SHEET', 'PL_ACCOUNT', 'RATIO', 'CHART', 'AUDIT', 'COMPANY', 'DATA', 'IMPORT', 'EXPORT', 'PRINT', 'EMAIL', 'SETTINGS', 'ADMIN', 'TRIAL_BALANCE', 'CASH_BANK_BOOK'].includes(currentScreen)) {
      setCurrentScreen('GATEWAY');
    } else {
      if (user?.role === 'HQ') setCurrentScreen('HQ');
      else setCurrentScreen('GATEWAY');
    }
  };

  useHotkeys('esc', (e) => {
    e.preventDefault();
    handleBack();
  }, { enableOnFormTags: true }, [showCalculator, showDateModal, currentScreen, user]);

  useHotkeys('v', () => setCurrentScreen('VOUCHER'));
  useHotkeys('c', () => setCurrentScreen('LEDGER'));
  useHotkeys('a', () => setCurrentScreen('ALTER'));
  useHotkeys('k', () => setCurrentScreen('DAYBOOK'));
  useHotkeys('n', () => setCurrentScreen('BANKING'));
  useHotkeys('b', () => setCurrentScreen('BALANCE_SHEET'));
  useHotkeys('p', () => setCurrentScreen('PL_ACCOUNT'));
  useHotkeys('r', () => setCurrentScreen('RATIO'));
  useHotkeys('t', () => setCurrentScreen('TRIAL_BALANCE'));
  useHotkeys('h', () => setCurrentScreen('CHART'));
  useHotkeys('l', () => setCurrentScreen('AUDIT'));
  useHotkeys('ctrl+n', () => setShowCalculator(true));
  useHotkeys('alt+f1', () => setUser(null)); // Logout
  useHotkeys('alt+k', () => setCurrentScreen('COMPANY'), { enableOnFormTags: true });
  useHotkeys('alt+y', () => setCurrentScreen('DATA'), { enableOnFormTags: true });
  useHotkeys('alt+z', () => setCurrentScreen('EXCHANGE'), { enableOnFormTags: true });
  useHotkeys('alt+g', (e) => {
    e.preventDefault();
    setCurrentScreen('GOTO');
    setGotoSearch('');
    setGotoHighlightedIdx(0);
  }, { enableOnFormTags: true });
  useHotkeys('alt+m', () => setCurrentScreen('EXPORT'), { enableOnFormTags: true });
  useHotkeys('alt+e', () => setCurrentScreen('EXPORT'), { enableOnFormTags: true });
  useHotkeys('alt+p', () => setCurrentScreen('PRINT'), { enableOnFormTags: true });
  useHotkeys('alt+s', () => setCurrentScreen('SETTINGS'), { enableOnFormTags: true });

  // Global Function Keys (Tally Style)
  useHotkeys('f2', (e) => {
    e.preventDefault();
    setDateInput(currentDate);
    setShowDateModal(true);
  });
  useHotkeys('f3', () => {
    const branch = branches.find(b => b.id === selectedBranchId);
    alert(`Current Church: ${branch ? branch.name : 'BERITHSYSTEMS HQ'}`);
  });
  useHotkeys('f4', (e) => { e.preventDefault(); setCurrentScreen('VOUCHER'); setVoucherType('Contra'); });
  useHotkeys('f5', (e) => { e.preventDefault(); setCurrentScreen('VOUCHER'); setVoucherType('Payment'); });
  useHotkeys('f6', (e) => { e.preventDefault(); setCurrentScreen('VOUCHER'); setVoucherType('Receipt'); });
  useHotkeys('f7', (e) => { e.preventDefault(); setCurrentScreen('VOUCHER'); setVoucherType('Journal'); });
  const [showConfig, setShowConfig] = useState(false);
  useHotkeys('f12', (e) => { e.preventDefault(); setShowConfig(true); });
  useHotkeys('alt+c', () => setCurrentScreen('LEDGER'), { enableOnFormTags: true });
  useHotkeys('alt+a', () => alert('Alter Masters Mode Activated'));
  const [showQuit, setShowQuit] = useState(false);

  useHotkeys('q', () => setShowQuit(true));
  useHotkeys('ctrl+q', () => setShowQuit(true));
  useHotkeys('y', () => { if (showQuit) window.close(); });
  useHotkeys('n', () => { if (showQuit) setShowQuit(false); });

  const [showHelp, setShowHelp] = useState(false);

  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div className="flex flex-col h-screen bg-tally-bg overflow-hidden uppercase relative">
      {/* Global Modals */}
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[130]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-[500px] border-4 border-tally-teal shadow-2xl overflow-hidden uppercase">
              <div className="bg-tally-teal text-white px-4 py-1 text-[10px] font-bold flex justify-between items-center">
                 <span>Configuration</span>
                 <button onClick={() => setShowConfig(false)} className="hover:text-red-200 text-xs">×</button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
                 <div className="space-y-4">
                    <h3 className="text-[11px] font-bold text-tally-teal border-b border-tally-teal/20 pb-1">General</h3>
                    <div className="flex justify-between items-center text-xs">
                       <span>Use Accounting Terminology</span>
                       <span className="text-blue-700 font-bold">Yes</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span>Show Monthly Breakdown</span>
                       <span className="text-blue-700 font-bold">Yes</span>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h3 className="text-[11px] font-bold text-tally-teal border-b border-tally-teal/20 pb-1">Vouchers</h3>
                    <div className="flex justify-between items-center text-xs">
                       <span>Show Ledger Balances</span>
                       <span className="text-blue-700 font-bold">Yes</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span>Warn on Negative Balance</span>
                       <span className="text-blue-700 font-bold">Yes</span>
                    </div>
                 </div>
              </div>
              <div className="bg-tally-bg p-2 text-right border-t">
                 <button onClick={() => setShowConfig(false)} className="bg-tally-teal text-white px-6 py-1 text-[10px] font-bold">ESC: Accept</button>
              </div>
            </motion.div>
          </div>
        )}
        {showDateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-[300px] border-4 border-tally-teal shadow-2xl overflow-hidden">
              <div className="bg-tally-teal text-white px-4 py-1 text-[10px] font-bold uppercase flex justify-between items-center">
                 <span>Change Date</span>
                 <button onClick={() => setShowDateModal(false)} className="hover:text-red-200 text-xs">×</button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (dateInput) {
                    setCurrentDate(dateInput);
                    setShowDateModal(false);
                    setCurrentScreen('DAYBOOK');
                  }
                }}
                className="p-6 space-y-4"
              >
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase">New Date</label>
                   <input 
                     autoFocus 
                     type="date" 
                     className="w-full border-2 border-tally-teal p-2 text-sm outline-none font-bold italic" 
                     value={dateInput}
                     onChange={(e) => setDateInput(e.target.value)}
                   />
                 </div>
                 <div className="flex justify-end pt-2">
                    <button type="submit" className="bg-tally-teal text-white px-4 py-1 text-[11px] font-bold uppercase hover:bg-tally-teal/90">Accept (Enter)</button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}

        {currentScreen === 'GOTO' && renderGoTo()}
      </AnimatePresence>

      {/* Top Header Bar */}
      <header className="bg-tally-header text-white h-[35px] flex items-center justify-between px-2 text-[12px] border-b border-tally-hotkey">
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <span className="cursor-pointer hover:bg-white/10 px-1 rounded" onClick={() => setCurrentScreen('COMPANY')}><u>K</u>: Company</span>
            <span className="cursor-pointer hover:bg-white/10 px-1 rounded" onClick={() => setCurrentScreen('DATA')}><u>Y</u>: Data</span>
            <span className="cursor-pointer hover:bg-white/10 px-1 rounded" onClick={() => setCurrentScreen('EXCHANGE')}><u>Z</u>: Exchange</span>
            <span className="cursor-pointer hover:bg-white/10 px-1 rounded" onClick={() => setCurrentScreen('GOTO')}><u>G</u>: Go To</span>
            <span className="cursor-pointer hover:bg-white/10 px-1 rounded" onClick={() => setCurrentScreen('IMPORT')}><u>O</u>: Import</span>
            <span className="cursor-pointer hover:bg-white/10 px-1 rounded" onClick={() => setCurrentScreen('EXPORT')}><u>E</u>: Export</span>
            <span className="cursor-pointer hover:bg-white/10 px-1 rounded" onClick={() => setCurrentScreen('EMAIL')}><u>M</u>: E-mail</span>
            <span className="cursor-pointer hover:bg-white/10 px-1 rounded" onClick={() => setCurrentScreen('PRINT')}><u>P</u>: Print</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="opacity-70 cursor-pointer hover:underline" onClick={() => setCurrentScreen('SETTINGS')}>User: {user.username}</span>
            <span className="bg-red-500/20 px-2 rounded text-[10px] font-bold">{user.role}</span>
          </div>
          <button className="opacity-80 hover:opacity-100" onClick={() => setUser(null)}>Alt+F1: Logout</button>
        </div>
      </header>

      {/* Secondary Ribbon */}
      <div className="bg-tally-teal text-white h-[30px] flex items-center px-4 justify-between border-b border-tally-hotkey">
        <div className="flex gap-4 items-center text-[13px] font-semibold">
          <span>{user.role === 'HQ' ? 'HQ Administration' : 'Gateway of Tally'}</span>
          {user.role === 'HQ' && currentScreen !== 'HQ' && (
            <button 
              onClick={() => setCurrentScreen('HQ')} 
              className="text-[10px] bg-tally-accent text-black px-2 py-0.5 rounded font-bold hover:bg-yellow-500 border border-black/20 flex items-center gap-1"
            >
              <LayoutDashboard className="w-3 h-3" /> HQ HOME
            </button>
          )}
          {user.role === 'HQ' && (
            <button onClick={() => setCurrentScreen('ADMIN')} className="text-[10px] bg-white/20 px-2 py-0.5 rounded hover:bg-white/30 border border-white/40">SYSTEM ADMIN</button>
          )}
        </div>
        <div className="text-[12px] opacity-80 italic">
          {user.role === 'HQ' ? 'Global Controller' : 'Branch Church'} (2024-25)
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        <AnimatePresence>
          {showQuit && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            >
              <div className="bg-white border-4 border-tally-teal p-8 shadow-2xl text-center">
                <h2 className="text-xl font-bold text-tally-teal uppercase mb-4 tracking-widest">Quit ?</h2>
                <div className="flex gap-8 justify-center">
                  <button onClick={() => window.close()} className="bg-tally-accent text-black px-8 py-1 font-bold border border-black hover:bg-yellow-500 transition-colors">Yes (Y)</button>
                  <button onClick={() => setShowQuit(false)} className="bg-gray-100 px-8 py-1 font-bold border border-gray-300 hover:bg-gray-200 transition-colors">No (N)</button>
                </div>
              </div>
            </motion.div>
          )}

          {showHelp && (
            <motion.div 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="absolute right-0 top-[65px] bottom-[24px] w-[350px] z-[90] bg-white border-l-4 border-tally-teal shadow-2xl p-6 overflow-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-tally-teal tracking-widest">Golden Rules</h2>
                <button onClick={() => setShowHelp(false)} className="text-red-600 font-bold">X</button>
              </div>
              
              <div className="space-y-8">
                <section>
                  <h3 className="text-sm font-bold bg-gray-100 p-1 mb-2">Real Accounts</h3>
                  <p className="text-xs italic text-gray-500 mb-2">(Relating to properties & assets)</p>
                  <ul className="text-xs space-y-1 font-bold">
                    <li className="text-green-700">Debit: What Comes In</li>
                    <li className="text-red-700">Credit: What Goes Out</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-sm font-bold bg-gray-100 p-1 mb-2">Personal Accounts</h3>
                  <p className="text-xs italic text-gray-500 mb-2">(Relating to persons/firms)</p>
                  <ul className="text-xs space-y-1 font-bold">
                    <li className="text-green-700">Debit: The Receiver</li>
                    <li className="text-red-700">Credit: The Giver</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-sm font-bold bg-gray-100 p-1 mb-2">Nominal Accounts</h3>
                  <p className="text-xs italic text-gray-500 mb-2">(Relating to income/expenses)</p>
                  <ul className="text-xs space-y-1 font-bold">
                    <li className="text-green-700">Debit: All Expenses & Losses</li>
                    <li className="text-red-700">Credit: All Incomes & Gains</li>
                  </ul>
                </section>

                <div className="bg-tally-bg p-3 border border-tally-teal/20 text-[10px] italic">
                  Tally Shortcut: Use F12 in any voucher to configure advanced options.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentScreen === 'HQ' ? (
          <HQDashboard onSelectBranch={(id) => { setSelectedBranchId(id); setCurrentScreen('GATEWAY'); }} />
        ) : currentScreen === 'GATEWAY' ? (
          <div className="flex h-full w-full overflow-hidden bg-tally-bg">
            {/* Left Side: Company Info */}
            <div className="w-1/2 p-4 flex flex-col gap-4 border-r border-gray-300">
              <div className="bg-white tally-border tally-shadow p-3">
                <h2 className="text-[10px] font-bold uppercase text-gray-500 border-b mb-2">Current Period</h2>
                <p className="font-bold text-sm">1-Apr-26 to 31-Mar-27</p>
              </div>
              
              <div className="bg-white tally-border tally-shadow p-3 flex-grow">
                <h2 className="text-[10px] font-bold uppercase text-gray-500 border-b mb-2">List of Selected Companies</h2>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-tally-teal uppercase text-sm">{branches.find(b => b.id === selectedBranchId)?.name || 'Local Branch Access'}</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase">CODE: {branches.find(b => b.id === selectedBranchId)?.code || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-gray-500">Date of Last Entry</p>
                    <p className="font-bold text-xs">{currentDate}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Gateway Menu */}
            <div className="w-1/2 flex items-center justify-center p-8">
              <div className="w-80 bg-white tally-border tally-shadow overflow-hidden">
                <div className="bg-tally-teal text-white text-center py-1 font-bold text-sm uppercase tracking-wider">
                  Gateway of Tally
                </div>
                
                <div className="py-2">
                  {GATEWAY_MENU.map((section, sIdx) => (
                    <div key={section.section} className={sIdx > 0 ? "mt-2 pt-2 border-t border-gray-100" : ""}>
                      <h3 className="px-4 text-[10px] font-bold text-gray-400 uppercase mb-1">{section.section}</h3>
                      {section.items.map((item) => {
                        const isSelected = flatMenu[selectedIndex]?.id === item.id;
                        const labelParts = item.label.split(new RegExp(`(${item.key})`, 'i'));
                        
                        return (
                          <div 
                            key={item.id}
                            className={`px-4 py-0.5 flex justify-between cursor-pointer transition-colors ${isSelected ? 'bg-tally-accent text-black font-bold' : 'hover:bg-gray-100'}`}
                            onClick={() => {
                              const idx = flatMenu.findIndex(f => f.id === item.id);
                              setSelectedIndex(idx);
                            }}
                            onDoubleClick={() => {
                              const idx = flatMenu.findIndex(f => f.id === item.id);
                              setSelectedIndex(idx);
                              handleGotoSelect(item);
                            }}
                          >
                            <span className="text-xs">
                              {labelParts.map((part, i) => 
                                part.toLowerCase() === item.key.toLowerCase() 
                                  ? <span key={i} className="text-red-700 font-bold">{part}</span> 
                                  : part
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  
                  <div className="mt-4 pt-2 border-t border-gray-100">
                    <div 
                      className="px-4 py-0.5 flex justify-between cursor-pointer hover:bg-red-100"
                      onClick={() => setShowQuit(true)}
                    >
                      <span className="text-xs font-bold text-red-700 uppercase tracking-tight">Q<u>uit</u></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white p-4 overflow-auto">
            <div className="max-w-4xl mx-auto border-2 border-tally-teal rounded-sm p-4 shadow-lg bg-white">
              <div className="flex justify-between items-center mb-6 border-b border-tally-teal/20 pb-2">
                <h1 className="text-lg font-bold text-tally-teal uppercase flex items-center gap-2">
                  <div className={`w-1 h-6 ${
                    voucherType === 'Payment' ? 'bg-red-600' :
                    voucherType === 'Receipt' ? 'bg-green-600' :
                    voucherType === 'Contra' ? 'bg-blue-600' :
                    voucherType === 'Journal' ? 'bg-purple-600' :
                    voucherType === 'Sales' ? 'bg-cyan-600' :
                    voucherType === 'Purchase' ? 'bg-orange-600' : 'bg-tally-teal'
                  }`}></div>
                  {currentScreen === 'VOUCHER' && `${voucherType} Voucher Creation`}
                  {currentScreen === 'LEDGER' && 'Masters Management (Create)'}
                  {currentScreen === 'ALTER' && 'Masters Management (Alter)'}
                  {currentScreen === 'CHART' && 'Chart of Accounts'}
                  {currentScreen === 'BALANCE_SHEET' && 'Balance Sheet'}
                  {currentScreen === 'PL_ACCOUNT' && 'Profit & Loss A/c'}
                  {currentScreen === 'TRIAL_BALANCE' && 'Trial Balance'}
                  {currentScreen === 'CASH_BANK_BOOK' && 'Cash / Bank Book'}
                  {currentScreen === 'RATIO' && 'Ratio Analysis'}
                  {currentScreen === 'DAYBOOK' && 'Day Book'}
                  {currentScreen === 'ANALYTICS' && 'Visual Data Analytics'}
                  {currentScreen === 'AUDIT' && 'Security Audit Dashboard'}
                  {currentScreen === 'BANKING' && 'Banking Utility'}
                  {currentScreen === 'PAYROLL' && 'Payroll Management'}
                  {currentScreen === 'COMPANY' && 'Company Information'}
                  {currentScreen === 'DATA' && 'Data Management'}
                  {currentScreen === 'EXCHANGE' && 'Data Exchange'}
                  {currentScreen === 'GOTO' && 'Go To / Switch To'}
                  {currentScreen === 'IMPORT' && 'Import Data'}
                  {currentScreen === 'EXPORT' && 'Export Data'}
                  {currentScreen === 'PRINT' && 'Print Reports'}
                  {currentScreen === 'EMAIL' && 'E-mail Services'}
                  {currentScreen === 'SETTINGS' && 'User Settings & Security'}
                  {currentScreen === 'ADMIN' && 'System Administration (HQ Only)'}
                </h1>
                <button 
                  onClick={handleBack}
                  className="text-[11px] bg-tally-bg hover:bg-gray-200 px-3 py-1 border border-tally-teal/20 rounded font-bold uppercase transition-colors"
                >
                  ESC: Back
                </button>
              </div>

              {currentScreen === 'VOUCHER' && <VoucherScreen branchId={selectedBranchId} onTypeChange={setVoucherType} initialType={voucherType} initialDate={currentDate} />}
              {currentScreen === 'LEDGER' && <MastersDashboard branchId={selectedBranchId} />}
              {currentScreen === 'ALTER' && <AlterMasterScreen branchId={selectedBranchId} onSelectLedger={(id) => { setSelectedLedgerId(id); setCurrentScreen('LEDGER_DETAIL'); }} />}
              {currentScreen === 'CHART' && <ChartOfAccountsScreen branchId={selectedBranchId} />}
              {currentScreen === 'PL_ACCOUNT' && <PLScreen branchId={selectedBranchId} />}
              {currentScreen === 'TRIAL_BALANCE' && <TrialBalanceScreen branchId={selectedBranchId} />}
              {currentScreen === 'CASH_BANK_BOOK' && <CashBankBookScreen branchId={selectedBranchId} />}
              {currentScreen === 'CHART' && <ChartOfAccountsScreen branchId={selectedBranchId} />}
              {currentScreen === 'RATIO' && <RatioAnalysisScreen onBack={handleBack} />}
              {currentScreen === 'PRINT' && <PrintScreen onBack={handleBack} currentScreen={currentScreen} />}
              {currentScreen === 'DAYBOOK' && <DayBookScreen branchId={selectedBranchId} initialDate={currentDate} />}
              {currentScreen === 'LEDGER_DETAIL' && <LedgerVouchersScreen branchId={selectedBranchId} ledgerId={selectedLedgerId} onBack={() => setCurrentScreen('GATEWAY')} />}
              {currentScreen === 'HQ' && user?.role === 'HQ' && <HQDashboard onSelectBranch={(id) => { setSelectedBranchId(id); setCurrentScreen('GATEWAY'); }} />}
              {currentScreen === 'ANALYTICS' && <AnalyticsScreen branches={branches} ledgers={allLedgers} vouchers={allVouchers} />}
              {currentScreen === 'AUDIT' && <AuditLogScreen branchId={selectedBranchId} isAdmin={user.role === 'HQ'} />}
              {currentScreen === 'ADMIN' && <AdminPanel />}
              {currentScreen === 'BANKING' && <BankingScreen branchId={selectedBranchId} />}
              {currentScreen === 'PAYROLL' && <div className="p-10 text-center font-bold text-tally-teal uppercase italic">Payroll Module - Coming Soon</div>}
              {currentScreen === 'COMPANY' && <CompanyScreen branchId={selectedBranchId} />}
              {currentScreen === 'DATA' && <DataScreen />}
              {currentScreen === 'IMPORT' && (
                <div className="p-10 space-y-6 max-w-xl mx-auto">
                  <h3 className="text-lg font-bold uppercase text-tally-teal border-b-2 border-tally-teal mb-4">Import Data (Masters/Transactions)</h3>
                  <div className="space-y-4 border p-6 bg-white shadow">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Source File Path (Local/.xml)</label>
                      <input type="text" className="w-full border p-2 text-xs focus:border-tally-teal outline-none" placeholder="C:\TallyPrime\Import\Masters.xml" />
                    </div>
                    <div className="space-y-2">
                       <div className="text-[10px] font-bold text-gray-400 uppercase">Behavior for duplicates</div>
                       <select className="w-full border p-2 text-xs outline-none">
                         <option>Ignore Duplicates</option>
                         <option>Modify with New Data</option>
                         <option>Force Import (Overwrite)</option>
                       </select>
                    </div>
                    <button className="w-full bg-tally-teal text-white py-2 text-xs font-bold uppercase mt-4">Import Now</button>
                  </div>
                </div>
              )}
              {currentScreen === 'EXPORT' && <ExportScreen onBack={handleBack} />}
              {currentScreen === 'PRINT' && <PrintScreen onBack={handleBack} currentScreen={currentScreen} />}
              {currentScreen === 'SETTINGS' && <SettingsScreen onBack={handleBack} />}
              {currentScreen === 'COMPANY' && (
                <div className="p-10 space-y-4">
                   <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-gray-100 p-4 border italic">Select Company (F3)</div>
                      <div className="bg-gray-100 p-4 border italic">Alter Company (Alt+K)</div>
                      <div className="bg-gray-100 p-4 border italic">Connect for Remote Access</div>
                      <div className="bg-gray-100 p-4 border italic">Shut Company (Alt+F1)</div>
                   </div>
                </div>
              )}
              {['DATA', 'EXCHANGE', 'GOTO', 'IMPORT', 'EXPORT', 'PRINT', 'EMAIL'].includes(currentScreen) && (
                <div className="p-20 text-center space-y-4">
                   <div className="text-4xl text-tally-teal/10 font-black uppercase">{currentScreen}</div>
                   <div className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">
                     This utility module is being synchronized with the cloud...
                   </div>
                   <button 
                     onClick={() => setCurrentScreen('GATEWAY')}
                     className="text-[10px] border border-tally-teal px-4 py-1 hover:bg-tally-teal hover:text-white transition-colors"
                   >
                     Back to Gateway
                   </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sidebar Actions */}
        <aside className="w-[180px] bg-tally-teal text-white flex flex-col border-l border-tally-hotkey">
          <div className="hotkey-btn" onClick={() => { setDateInput(currentDate); setShowDateModal(true); }}><span>F2: Date</span></div>
          <div className="hotkey-btn" onClick={() => alert('Branch Selection')}><span>F3: Branch</span></div>
          <div className="h-4 bg-black/10"></div>
          <div className="hotkey-btn" onClick={() => { setCurrentScreen('VOUCHER'); setVoucherType('Contra'); }}><span>F4: Contra</span></div>
          <div className="hotkey-btn" onClick={() => { setCurrentScreen('VOUCHER'); setVoucherType('Payment'); }}><span>F5: Payment</span></div>
          <div className="hotkey-btn" onClick={() => { setCurrentScreen('VOUCHER'); setVoucherType('Receipt'); }}><span>F6: Receipt</span></div>
          <div className="hotkey-btn" onClick={() => { setCurrentScreen('VOUCHER'); setVoucherType('Journal'); }}><span>F7: Journal</span></div>
          <div className="h-4 bg-black/10"></div>
          <div className="hotkey-btn opacity-60"><span>F11: Features</span></div>
          <div className="hotkey-btn" onClick={() => setShowConfig(true)}><span>F12: Configure</span></div>
          <div className="hotkey-btn bg-tally-accent text-black mt-2" onClick={() => setShowHelp(!showHelp)}><span>H: Golden Rules</span></div>
          <div className="mt-auto bg-[#001c24] p-2 text-[10px] text-center italic border-t border-white/5">
            {currentTime.toLocaleTimeString()}
          </div>
        </aside>
      </main>

      {/* Footer / Status Bar */}
      <footer className="relative">
        <AnimatePresence>
          {showCalculator && (
            <motion.div 
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              className="absolute bottom-6 right-2 w-72 bg-tally-teal border-2 border-white shadow-2xl p-2 z-50 overflow-hidden"
            >
              <div className="flex justify-between text-[10px] text-white font-bold mb-1">
                <span>Calculator</span>
                <span className="opacity-50">ESC: Close</span>
              </div>
              <div className="bg-black/20 p-2 text-right font-mono text-white min-h-[40px] break-all border border-white/20">
                {calcInput || '0'}
              </div>
              <div className="grid grid-cols-4 gap-1 mt-2">
                {['/', '*', '-', '+', '7', '8', '9', '=', '4', '5', '6', 'C', '1', '2', '3', '0'].map(char => (
                  <button 
                    key={char}
                    onClick={() => {
                      if (char === 'C') setCalcInput('');
                      else if (char === '=') {
                        try { 
                          // eslint-disable-next-line no-eval
                          setCalcInput(eval(calcInput).toString()); 
                        } catch { setCalcInput('Error'); }
                      }
                      else setCalcInput(prev => prev + char);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white p-1 text-xs font-bold font-mono border border-white/10"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-[24px] bg-tally-status text-white text-[11px] flex items-center px-2 justify-between">
          <div className="flex gap-4 uppercase font-bold tracking-tight">
            <span>ACCOUNTING - BERITHSYSTEMS.COM</span>
            <span className="opacity-50">|</span>
            <span className="font-mono text-yellow-300">{new Date(currentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className="opacity-50">|</span>
            <span>Rel. 4.0</span>
            <span className="opacity-50">|</span>
            <span className="text-tally-accent">Church Multi-Branch ERP</span>
          </div>
          <div className="flex gap-4 items-center">
            <span className="opacity-70 uppercase">Data Path: DB/JSON/STORE</span>
            <span 
              className={`bg-white/10 px-2 rounded cursor-pointer ${showCalculator ? 'bg-tally-accent text-black' : ''}`}
              onClick={() => setShowCalculator(!showCalculator)}
            >
              Ctrl+N: Calculator
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
