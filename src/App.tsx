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

const GATEWAY_MENU: MenuOption[] = [
  { id: 'masters', label: 'Create', key: 'C', icon: <PlusCircle className="w-4 h-4" /> },
  { id: 'alter', label: 'Alter', key: 'A', icon: <Edit3 className="w-4 h-4" /> },
  { id: 'chart', label: 'Chart of Accounts', key: 'H', icon: <Building2 className="w-4 h-4" /> },
  { id: 'vouchers', label: 'Vouchers', key: 'V', icon: <Receipt className="w-4 h-4" />, shortcut: 'F4-F9' },
  { id: 'daybook', label: 'Day Book', key: 'K', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'banking', label: 'Banking', key: 'N', icon: <Wallet className="w-4 h-4" /> },
  { id: 'balance_sheet', label: 'Balance Sheet', key: 'B', icon: <FileText className="w-4 h-4" /> },
  { id: 'pl_account', label: 'Profit & Loss A/c', key: 'P', icon: <FileText className="w-4 h-4" /> },
  { id: 'ratio_analysis', label: 'Ratio Analysis', key: 'R', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'audit', label: 'Audit Logs', key: 'L', icon: <ShieldCheck className="w-4 h-4" /> },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'GATEWAY' | 'VOUCHER' | 'LEDGER' | 'REPORTS' | 'HQ' | 'ANALYTICS' | 'AUDIT' | 'BANKING' | 'PAYROLL' | 'DAYBOOK' | 'COMPANY' | 'DATA' | 'EXCHANGE' | 'GOTO' | 'IMPORT' | 'EXPORT' | 'PRINT' | 'EMAIL' | 'SETTINGS' | 'ALTER' | 'BALANCE_SHEET' | 'PL_ACCOUNT' | 'RATIO' | 'CHART' | 'ADMIN'>('GATEWAY');
  const [voucherType, setVoucherType] = useState('Payment');
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(undefined);
  const [currentDate, setCurrentDate] = useState('2026-05-12');
  const [branches, setBranches] = useState<any[]>([]);
  const [allLedgers, setAllLedgers] = useState<any[]>([]);
  const [allVouchers, setAllVouchers] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');

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
    const options = ['Balance Sheet', 'Profit & Loss A/c', 'Trial Balance', 'Day Book', 'Cash/Bank Book', 'Stock Summary', 'Ratio Analysis', 'Audit Logs', 'Admin Panel', 'Banking'];
    return options.filter(o => o.toLowerCase().includes(gotoSearch.toLowerCase()));
  };

  useHotkeys('g', (e) => {
    e.preventDefault();
    setCurrentScreen('GOTO');
    setGotoSearch('');
    setGotoHighlightedIdx(0);
  }, { enableOnFormTags: true });

  const handleGotoSelect = (item: string) => {
    if (item === 'Day Book') setCurrentScreen('DAYBOOK');
    else if (item === 'Balance Sheet') setCurrentScreen('BALANCE_SHEET');
    else if (item === 'Profit & Loss A/c') setCurrentScreen('PL_ACCOUNT');
    else if (item === 'Trial Balance') setCurrentScreen('REPORTS');
    else if (item === 'Banking') setCurrentScreen('BANKING');
    else if (item === 'Audit Logs') setCurrentScreen('AUDIT');
    else if (item === 'Admin Panel') setCurrentScreen('ADMIN');
    else if (item === 'Ratio Analysis') setCurrentScreen('RATIO');
    else if (item === 'Cash/Bank Book') setCurrentScreen('BANKING');
    setCurrentScreen('GATEWAY'); // close goto after selection
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
      setSelectedIndex(prev => Math.min(GATEWAY_MENU.length - 1, prev + 1));
    } else if (currentScreen === 'GOTO') {
      e.preventDefault();
      const filtered = getFilteredGotoOptions();
      setGotoHighlightedIdx(prev => Math.min(filtered.length - 1, prev + 1));
    }
  }, { enableOnFormTags: true }, [currentScreen, gotoSearch]);

  useHotkeys('enter', (e) => {
    if (currentScreen === 'GATEWAY') {
      const selectedId = GATEWAY_MENU[selectedIndex].id;
      if (selectedId === 'vouchers') setCurrentScreen('VOUCHER');
      if (selectedId === 'masters') setCurrentScreen('LEDGER'); 
      if (selectedId === 'alter') setCurrentScreen('ALTER');
      if (selectedId === 'daybook') setCurrentScreen('DAYBOOK');
      if (selectedId === 'banking') setCurrentScreen('BANKING');
      if (selectedId === 'balance_sheet') setCurrentScreen('BALANCE_SHEET');
      if (selectedId === 'pl_account') setCurrentScreen('PL_ACCOUNT');
      if (selectedId === 'ratio_analysis') setCurrentScreen('RATIO');
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
      // Do nothing on ESC in Gateway to stay in the same company as requested
      // In Tally this would normally prompt "Quit? Yes/No"
      return;
    }

    if (['VOUCHER', 'LEDGER', 'ALTER', 'DAYBOOK', 'BANKING', 'BALANCE_SHEET', 'PL_ACCOUNT', 'RATIO', 'CHART', 'AUDIT', 'COMPANY', 'DATA', 'IMPORT', 'EXPORT', 'PRINT', 'EMAIL', 'SETTINGS', 'ADMIN'].includes(currentScreen)) {
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
  useHotkeys('h', () => setCurrentScreen('CHART'));
  useHotkeys('l', () => setCurrentScreen('AUDIT'));
  useHotkeys('ctrl+n', () => setShowCalculator(true));
  useHotkeys('alt+f1', () => setUser(null)); // Logout
  useHotkeys('alt+k', () => setCurrentScreen('COMPANY'));
  useHotkeys('alt+y', () => setCurrentScreen('DATA'));
  useHotkeys('alt+z', () => setCurrentScreen('EXCHANGE'));
  useHotkeys('alt+g', () => setCurrentScreen('GOTO'));
  useHotkeys('alt+o', () => setCurrentScreen('IMPORT'));
  useHotkeys('alt+e', () => setCurrentScreen('EXPORT'));
  useHotkeys('alt+m', () => setCurrentScreen('EMAIL'));
  useHotkeys('alt+p', () => setCurrentScreen('PRINT'));
  useHotkeys('alt+s', () => setCurrentScreen('SETTINGS'));

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
  useHotkeys('f4', () => { setCurrentScreen('VOUCHER'); setVoucherType('Contra'); });
  useHotkeys('f5', () => { setCurrentScreen('VOUCHER'); setVoucherType('Payment'); });
  useHotkeys('f6', () => { setCurrentScreen('VOUCHER'); setVoucherType('Receipt'); });
  useHotkeys('f7', () => { setCurrentScreen('VOUCHER'); setVoucherType('Journal'); });
  useHotkeys('f8', () => { setCurrentScreen('VOUCHER'); setVoucherType('Sales'); });
  useHotkeys('f9', () => { setCurrentScreen('VOUCHER'); setVoucherType('Purchase'); });
  useHotkeys('f11', () => alert('Features (F11)'));
  useHotkeys('f12', () => alert('Configuration (F12)'));
  useHotkeys('alt+c', () => setCurrentScreen('LEDGER'));
  useHotkeys('alt+a', () => alert('Alter Masters Mode Activated'));
  const [showQuit, setShowQuit] = useState(false);

  useHotkeys('q', () => setShowQuit(true));
  useHotkeys('ctrl+q', () => setShowQuit(true));
  useHotkeys('y', () => { if (showQuit) window.close(); });
  useHotkeys('n', () => { if (showQuit) setShowQuit(false); });
  useHotkeys('f5', () => { if (currentScreen === 'VOUCHER') alert('Payment Mode'); });
  useHotkeys('f6', () => { if (currentScreen === 'VOUCHER') alert('Receipt Mode'); });
  useHotkeys('f7', () => { if (currentScreen === 'VOUCHER') alert('Journal Mode'); });

  const [showHelp, setShowHelp] = useState(false);

  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div className="flex flex-col h-screen bg-tally-bg overflow-hidden uppercase relative">
      {/* Global Modals */}
      <AnimatePresence>
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

        {currentScreen === 'GOTO' && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-[400px] border-4 border-tally-teal shadow-2xl overflow-hidden">
              <div className="bg-tally-teal text-white px-4 py-1 text-[10px] font-bold uppercase flex justify-between items-center">
                 <span>Go To / Switch To</span>
                 <button onClick={() => setCurrentScreen('GATEWAY')} className="hover:text-red-200">ESC: Close</button>
              </div>
              <div className="p-2 space-y-1">
                 <input 
                   autoFocus 
                   type="text" 
                   placeholder="Type name of report up here..." 
                   className="w-full border-b-2 border-tally-teal p-2 text-sm outline-none bg-blue-50/50" 
                   value={gotoSearch}
                   onChange={(e) => {
                     setGotoSearch(e.target.value);
                     setGotoHighlightedIdx(0);
                   }}
                 />
                 <div className="max-h-[300px] overflow-y-auto">
                    {getFilteredGotoOptions().map((item, idx) => (
                      <div 
                        key={item} 
                        className={`px-4 py-2 cursor-pointer text-xs font-bold border-b border-gray-50 flex justify-between group transition-colors ${
                          gotoHighlightedIdx === idx ? 'bg-tally-accent text-black' : 'hover:bg-tally-teal hover:text-white'
                        }`}
                        onMouseEnter={() => setGotoHighlightedIdx(idx)}
                        onClick={() => {
                          handleGotoSelect(item);
                        }}
                      >
                         <span>{item}</span>
                         <span className="text-[10px] text-gray-300 group-hover:text-white/50 opacity-0 group-hover:opacity-100 italic">Select</span>
                      </div>
                    ))}
                 </div>
              </div>
            </motion.div>
          </div>
        )}
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
        <div className="flex gap-8 text-[13px] font-semibold">
          <span>{user.role === 'HQ' ? 'HQ Administration' : 'Gateway of Tally'}</span>
          {user.role === 'HQ' && (
            <button onClick={() => setCurrentScreen('ADMIN')} className="text-[10px] bg-white/20 px-2 rounded hover:bg-white/30 border border-white/40">SYSTEM ADMIN</button>
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
          <>
            {/* Left Side: Current Status */}
            <section className="w-[35%] border-r border-teal-200 p-4 bg-transparent flex flex-col gap-6">
              <div className="flex justify-between border-b border-teal-300 pb-2">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase opacity-60">Current Period</span>
                  <span className="text-[13px] font-bold">1-Apr-2024 to 31-Mar-2025</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] uppercase opacity-60">Current Date</span>
                  <span className="text-[13px] font-bold">{currentTime.toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase mb-2 border-b border-teal-200">Selected Church Branch</span>
                <div className="flex justify-between items-center bg-white p-2 border border-teal-200">
                  <div className="flex flex-col">
                    <span className="font-bold text-blue-900 uppercase">
                      {user.role === 'HQ' ? 'Admin Drilldown' : 'Local Branch Access'}
                    </span>
                    <span className="text-[10px] text-gray-500 italic">Financial Year: 2024-25</span>
                  </div>
                  <span className="text-[11px] opacity-60">{selectedBranchId || 'N/A'}</span>
                </div>
              </div>

              <div className="mt-auto bg-[#fff9c4] border border-[#fbc02d] p-3 text-[12px] text-gray-800">
                <p className="font-bold mb-1 uppercase">Notice:</p>
                <p>Press <span className="font-bold text-red-600">G</span> for Go To. Use keyboard shortcuts for faster entry.</p>
              </div>
            </section>

            {/* Right Side: Gateway of Tally Menu */}
            <section className="flex-grow bg-[#f5f5f5] flex items-center justify-center relative">
              <div className="gateway-box w-[320px] flex flex-col shadow-xl">
                <div className="bg-tally-teal text-white text-center py-1 text-[13px] font-bold uppercase tracking-wider">
                  Gateway of Tally
                </div>
                <div className="p-4 flex flex-col gap-1 text-[14px]">
                  {GATEWAY_MENU.map((item, index) => (
                    <React.Fragment key={item.id}>
                      {index === 0 && <div className="text-gray-400 text-[10px] font-bold uppercase mb-1 mt-2">Masters</div>}
                      {index === 1 && <div className="text-gray-400 text-[10px] font-bold uppercase mb-1 mt-2">Transactions</div>}
                      {index === 3 && <div className="text-gray-400 text-[10px] font-bold uppercase mb-1 mt-2">Reports</div>}
                      {index === 8 && <div className="text-gray-400 text-[10px] font-bold uppercase mb-1 mt-2">Utilities</div>}
                      
                      <div
                        id={`menu-item-${index}`}
                        className={`flex justify-between px-2 py-0.5 cursor-pointer transition-colors ${
                          selectedIndex === index 
                            ? 'bg-tally-accent text-black font-bold' 
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedIndex(index)}
                        onDoubleClick={() => {
                          if (item.id === 'vouchers') setCurrentScreen('VOUCHER');
                          if (item.id === 'masters') setCurrentScreen('LEDGER'); 
                          if (item.id === 'alter') setCurrentScreen('ALTER');
                          if (item.id === 'daybook') setCurrentScreen('DAYBOOK');
                          if (item.id === 'banking') setCurrentScreen('BANKING');
                          if (item.id === 'balance_sheet') setCurrentScreen('BALANCE_SHEET');
                          if (item.id === 'pl_account') setCurrentScreen('PL_ACCOUNT');
                          if (item.id === 'ratio_analysis') setCurrentScreen('RATIO');
                          if (item.id === 'chart') setCurrentScreen('CHART');
                          if (item.id === 'audit') setCurrentScreen('AUDIT');
                        }}
                      >
                        <div className="flex gap-2">
                          <span className={selectedIndex === index ? 'text-black' : 'text-red-700 font-bold'}>{item.key}</span>
                          <span>{item.label.replace(item.key, '')}</span>
                        </div>
                        {item.shortcut && (
                          <span className="text-[10px] opacity-40 uppercase font-mono">
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                  <div className="border-t border-gray-300 pt-1 flex justify-between px-2 hover:bg-red-100 cursor-pointer mt-2" onClick={() => setShowQuit(true)}>
                    <span><u>Q</u>uit</span>
                  </div>
                </div>
              </div>
            </section>
          </>
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
              {currentScreen === 'ALTER' && <AlterMasterScreen branchId={selectedBranchId} />}
              {currentScreen === 'BALANCE_SHEET' && <BalanceSheetScreen branchId={selectedBranchId} />}
              {currentScreen === 'PL_ACCOUNT' && <PLScreen branchId={selectedBranchId} />}
              {currentScreen === 'CHART' && <AlterMasterScreen branchId={selectedBranchId} />} {/* Chart of accounts is similar list */}
              {currentScreen === 'RATIO' && <div className="p-20 text-center font-black text-tally-teal uppercase italic border">Ratio Analysis - Coming Soon</div>}
              {currentScreen === 'DAYBOOK' && <DayBookScreen branchId={selectedBranchId} initialDate={currentDate} />}
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
              {currentScreen === 'EXPORT' && (
                <div className="p-10 space-y-6 max-w-xl mx-auto">
                   <h3 className="text-lg font-bold uppercase text-tally-teal border-b-2 border-tally-teal mb-4">Export Configuration</h3>
                   <div className="space-y-4 border p-6 bg-white shadow">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400">FORMAT</label>
                          <select className="w-full border p-2 text-xs outline-none">
                             <option>XML (Data Interchange)</option>
                             <option>Excel (Spreadsheet)</option>
                             <option>PDF (Readable Document)</option>
                             <option>JPEG (Image)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400">DATA TO EXPORT</label>
                          <select className="w-full border p-2 text-xs outline-none">
                             <option>All Masters</option>
                             <option>All Transactions</option>
                             <option>Day Book Only</option>
                             <option>Trial Balance</option>
                          </select>
                        </div>
                      </div>
                      <button className="w-full bg-tally-teal text-white py-2 text-xs font-bold uppercase mt-4">Send Export</button>
                   </div>
                </div>
              )}
              {currentScreen === 'PRINT' && (
                <div className="p-20 text-center space-y-4">
                   <div className="w-20 h-20 bg-tally-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-10 h-10 text-tally-teal" />
                   </div>
                   <h3 className="text-xl font-black uppercase text-tally-teal">Print Spooler</h3>
                   <p className="text-xs text-gray-400 max-w-xs mx-auto italic">Generating printable buffers for all branch reports. Ensure your printer is connected via Tally Gateway.</p>
                   <button onClick={() => window.print()} className="bg-tally-teal text-white px-10 py-2 text-xs font-bold uppercase shadow-xl mt-4">Execute Local Print</button>
                </div>
              )}
              {currentScreen === 'SETTINGS' && (
                <div className="p-8 space-y-6">
                  <div className="border p-4 bg-gray-50">
                    <h3 className="text-sm font-bold uppercase mb-4 text-tally-teal">Change Password</h3>
                    <div className="space-y-4 max-w-xs">
                      <input 
                        id="new-password"
                        type="password" 
                        placeholder="Enter New Password"
                        className="w-full border p-2 text-sm outline-none focus:border-tally-teal"
                      />
                      <button 
                        onClick={async () => {
                          const pass = (document.getElementById('new-password') as HTMLInputElement).value;
                          if (!pass) return;
                          const res = await fetch(`api/users/${user.id}/password`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: pass })
                          });
                          if (res.ok) alert('Password updated successfully');
                        }}
                        className="bg-tally-teal text-white px-4 py-2 text-[10px] font-bold uppercase w-full shadow-md hover:bg-tally-header"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 italic">
                    User ID: {user.id} | Access Level: {user.role}
                  </div>
                </div>
              )}
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
          <div className="hotkey-btn" onClick={() => alert('Date')}><span>F2: Date</span></div>
          <div className="hotkey-btn" onClick={() => alert('Branch Selection')}><span>F3: Branch</span></div>
          <div className="h-4 bg-black/10"></div>
          <div className="hotkey-btn" onClick={() => setCurrentScreen('VOUCHER')}><span>F4: Contra</span></div>
          <div className="hotkey-btn" onClick={() => setCurrentScreen('VOUCHER')}><span>F5: Payment</span></div>
          <div className="hotkey-btn" onClick={() => setCurrentScreen('VOUCHER')}><span>F6: Receipt</span></div>
          <div className="hotkey-btn" onClick={() => setCurrentScreen('VOUCHER')}><span>F7: Journal</span></div>
          <div className="hotkey-btn" onClick={() => setCurrentScreen('VOUCHER')}><span>F8: Sales</span></div>
          <div className="hotkey-btn" onClick={() => setCurrentScreen('VOUCHER')}><span>F9: Purchase</span></div>
          <div className="hotkey-btn"><span>F10: Other</span></div>
          <div className="h-4 bg-black/10"></div>
          <div className="hotkey-btn opacity-60"><span>F11: Features</span></div>
          <div className="hotkey-btn opacity-60"><span>F12: Configure</span></div>
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
