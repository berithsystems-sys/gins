import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Receipt, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  code: string;
  designation: string;
  salaryStructure: string;
}

interface PayrollEntry {
  employeeId: string;
  name: string;
  basic: number;
  hra: number;
  allowance: number;
  deduction: number;
  net: number;
}

export default function PayrollScreen({ branchId, onBack }: { branchId?: string; onBack: () => void }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [salaryLedgerId, setSalaryLedgerId] = useState<string>('');
  const [cashBankLedgerId, setCashBankLedgerId] = useState<string>('');
  const [ledgers, setLedgers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const query = branchId ? `?branchId=${branchId}` : '';
      const [empRes, ledgerRes] = await Promise.all([
        fetch(`/api/employees${query}`).then(res => res.json()),
        fetch(`/api/ledgers${query}`).then(res => res.json())
      ]);

      setEmployees(empRes);
      setLedgers(ledgerRes);

      // Initialize payroll entries
      const entries = empRes.map((emp: Employee) => {
        const struct = JSON.parse(emp.salaryStructure || '{}');
        return {
          employeeId: emp.id,
          name: emp.name,
          basic: struct.basic || 0,
          hra: struct.hra || 0,
          allowance: struct.allowance || 0,
          deduction: struct.deduction || 0,
          net: (struct.basic || 0) + (struct.hra || 0) + (struct.allowance || 0) - (struct.deduction || 0)
        };
      });
      setPayrollEntries(entries);

      // Auto-select salary ledger
      const salaryLedger = ledgerRes.find((l: any) => l.name.toLowerCase().includes('salary'));
      if (salaryLedger) setSalaryLedgerId(salaryLedger.id);

      const cashBankLedger = ledgerRes.find((l: any) => l.group_name === 'Bank Accounts' || l.group_name === 'Cash');
      if (cashBankLedger) setCashBankLedgerId(cashBankLedger.id);

      setLoading(false);
    };
    fetchData();
  }, [branchId]);

  const updateEntry = (index: number, field: keyof PayrollEntry, value: string) => {
    const newEntries = [...payrollEntries];
    const numValue = parseFloat(value) || 0;
    (newEntries[index] as any)[field] = numValue;
    
    // Recalculate net
    const e = newEntries[index];
    e.net = e.basic + e.hra + e.allowance - e.deduction;
    setPayrollEntries(newEntries);
  };

  const handleProcessPayroll = async () => {
    if (!salaryLedgerId || !cashBankLedgerId) {
      setStatus({ type: 'error', message: 'Please select both Salary Expense and Payment Ledger' });
      return;
    }

    const totalSalary = payrollEntries.reduce((sum, e) => sum + e.net, 0);
    if (totalSalary <= 0) {
      setStatus({ type: 'error', message: 'Total salary must be greater than zero' });
      return;
    }

    setProcessing(true);
    try {
      // Create a Journal Voucher for Payroll
      const voucherData = {
        date: new Date().toISOString().split('T')[0],
        type: 'Journal',
        narration: `Payroll processing for ${format(new Date(), 'MMMM yyyy')}. Total Employees: ${employees.length}`,
        amount: totalSalary,
        branchId: branchId,
        entries: [
          {
            ledgerId: salaryLedgerId,
            amount: totalSalary,
            type: 'Dr'
          },
          {
            ledgerId: cashBankLedgerId,
            amount: totalSalary,
            type: 'Cr'
          }
        ]
      };

      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voucherData)
      });

      if (res.ok) {
        setStatus({ type: 'success', message: `Payroll processed successfully! Voucher created for ₹${totalSalary.toLocaleString()}` });
        // Optional: Reset or redirect
      } else {
        throw new Error('Failed to create voucher');
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to process payroll. Please check database connection.' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs font-bold uppercase animate-pulse">Loading Payroll Data...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-tally-bg"
    >
      {/* Header */}
      <div className="bg-tally-header text-white h-[35px] flex items-center justify-between px-3 border-b border-tally-hotkey">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span className="text-[12px] font-bold uppercase tracking-wider">Payroll Management</span>
        </div>
        <button onClick={onBack} className="text-[10px] bg-white/10 px-2 py-0.5 rounded hover:bg-white/20">ESC: BACK</button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Status Messages */}
        {status && (
          <div className={`p-3 border-2 flex items-center gap-3 ${
            status.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'
          }`}>
            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-xs font-bold uppercase">{status.message}</span>
          </div>
        )}

        {/* Configuration Section */}
        <div className="bg-white border-2 border-tally-teal p-4 shadow-sm">
          <h3 className="text-[10px] font-black text-tally-teal uppercase border-b border-tally-teal/10 pb-2 mb-4">Payroll Configuration</h3>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Salary Expense Ledger (Debit)</label>
              <select 
                value={salaryLedgerId}
                onChange={(e) => setSalaryLedgerId(e.target.value)}
                className="w-full border-b-2 border-tally-teal p-1 text-xs font-bold outline-none bg-gray-50"
              >
                <option value="">Select Expense Ledger...</option>
                {ledgers.filter(l => l.group_name.includes('Expenses') || l.group_name.includes('Income')).map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.group_name})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Payment Ledger (Credit)</label>
              <select 
                value={cashBankLedgerId}
                onChange={(e) => setCashBankLedgerId(e.target.value)}
                className="w-full border-b-2 border-tally-teal p-1 text-xs font-bold outline-none bg-gray-50"
              >
                <option value="">Select Cash/Bank...</option>
                {ledgers.filter(l => l.group_name === 'Bank Accounts' || l.group_name === 'Cash').map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="bg-white border-2 border-tally-teal shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-tally-light border-b border-tally-teal">
              <tr className="font-black uppercase text-[10px] text-tally-teal">
                <th className="px-4 py-2 text-left">Employee Name</th>
                <th className="px-4 py-2 text-right w-24">Basic</th>
                <th className="px-4 py-2 text-right w-24">HRA</th>
                <th className="px-4 py-2 text-right w-24">Allowances</th>
                <th className="px-4 py-2 text-right w-24">Deductions</th>
                <th className="px-4 py-2 text-right w-32">Net Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payrollEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center italic text-gray-400 uppercase">No employees found. Please create employees in Masters first.</td>
                </tr>
              ) : payrollEntries.map((entry, idx) => (
                <tr key={entry.employeeId} className="hover:bg-tally-accent/10 transition-colors">
                  <td className="px-4 py-2 font-bold text-tally-teal uppercase">{entry.name}</td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      value={entry.basic} 
                      onChange={(e) => updateEntry(idx, 'basic', e.target.value)}
                      className="w-full text-right bg-transparent border-b border-gray-200 focus:border-tally-teal outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      value={entry.hra} 
                      onChange={(e) => updateEntry(idx, 'hra', e.target.value)}
                      className="w-full text-right bg-transparent border-b border-gray-200 focus:border-tally-teal outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      value={entry.allowance} 
                      onChange={(e) => updateEntry(idx, 'allowance', e.target.value)}
                      className="w-full text-right bg-transparent border-b border-gray-200 focus:border-tally-teal outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      value={entry.deduction} 
                      onChange={(e) => updateEntry(idx, 'deduction', e.target.value)}
                      className="w-full text-right bg-transparent border-b border-gray-200 focus:border-tally-teal outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-black text-tally-teal">
                    ₹ {entry.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-tally-light border-t-2 border-tally-teal font-black uppercase">
              <tr>
                <td className="px-4 py-3 text-right" colSpan={5}>Total Payroll Amount</td>
                <td className="px-4 py-3 text-right text-base text-tally-teal">
                  ₹ {payrollEntries.reduce((sum, e) => sum + e.net, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-tally-sidebar p-2 flex justify-end gap-3 border-t border-tally-hotkey">
        <button 
          onClick={onBack}
          className="bg-gray-600 text-white px-6 py-1.5 text-[11px] font-bold uppercase hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button 
          disabled={processing || payrollEntries.length === 0}
          onClick={handleProcessPayroll}
          className="bg-tally-accent text-black px-8 py-1.5 text-[11px] font-bold uppercase hover:bg-yellow-500 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {processing ? 'Processing...' : 'Process & Post Voucher (Ctrl+A)'}
        </button>
      </div>
    </motion.div>
  );
}
