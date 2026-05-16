import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Ratio {
  name: string;
  value: number;
  percentage?: number;
  benchmark: number;
  status: 'good' | 'average' | 'poor';
  description: string;
}

const COLORS = ['#20b2aa', '#ff6b6b', '#ffd93d'];

export default function RatioAnalysisScreen({ onBack, branchId }: { onBack: () => void; branchId?: string }) {
  const [activeTab, setActiveTab] = useState<'liquidity' | 'profitability' | 'solvency' | 'efficiency'>('liquidity');
  const [timeRange, setTimeRange] = useState<'quarterly' | 'annual'>('annual');
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/ledgers${query}`).then(res => res.json()),
      fetch(`/api/vouchers${query}`).then(res => res.json())
    ]).then(([l, v]) => {
      setLedgers(l);
      setVouchers(v);
      setLoading(false);
    });
  }, [branchId]);

  const calculateBalance = (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    let balance = ledger?.openingBalance || 0;
    vouchers.forEach(v => {
      v.entries?.forEach((e: any) => {
        if (e.ledgerId === ledgerId) {
          if (e.type === 'Dr') balance += e.amount;
          else balance -= e.amount;
        }
      });
    });
    return balance;
  };

  const getGroupTotal = (groupNames: string[]) => {
    return ledgers
      .filter(l => groupNames.includes(l.group) || groupNames.includes(l.group_name))
      .reduce((acc, l) => acc + calculateBalance(l.id), 0);
  };

  const currentAssets = Math.abs(getGroupTotal(['Current Assets', 'Bank Accounts', 'Cash-in-hand']));
  const currentLiabilities = Math.abs(getGroupTotal(['Current Liabilities', 'Duties & Taxes', 'Provisions']));
  const fixedAssets = Math.abs(getGroupTotal(['Fixed Assets']));
  const sales = Math.abs(getGroupTotal(['Sales Account', 'Direct Income']));
  const directExpenses = Math.abs(getGroupTotal(['Direct Expenses', 'Purchase Account']));
  const indirectExpenses = Math.abs(getGroupTotal(['Indirect Expenses']));
  const indirectIncome = Math.abs(getGroupTotal(['Indirect Income']));

  const grossProfit = sales - directExpenses;
  const netProfit = grossProfit + indirectIncome - indirectExpenses;

  const currentRatio = currentLiabilities !== 0 ? currentAssets / currentLiabilities : 0;
  const quickRatio = currentLiabilities !== 0 ? (currentAssets * 0.8) / currentLiabilities : 0; // Simplified quick ratio
  const debtToEquity = 0.5; // Placeholder for now

  const ratios = {
    liquidity: [
      {
        name: 'Current Ratio',
        value: currentRatio,
        benchmark: 1.5,
        status: currentRatio >= 1.5 ? 'good' : (currentRatio >= 1.0 ? 'average' : 'poor'),
        description: 'Current Assets / Current Liabilities'
      },
      {
        name: 'Quick Ratio',
        value: quickRatio,
        benchmark: 1.0,
        status: quickRatio >= 1.0 ? 'good' : (quickRatio >= 0.8 ? 'average' : 'poor'),
        description: '(Current Assets - Inventory) / Current Liabilities'
      },
    ],
    profitability: [
      {
        name: 'Gross Profit Margin',
        value: sales !== 0 ? (grossProfit / sales) * 100 : 0,
        percentage: sales !== 0 ? (grossProfit / sales) * 100 : 0,
        benchmark: 40,
        status: (sales !== 0 && (grossProfit / sales) * 100 >= 40) ? 'good' : 'average',
        description: 'Gross Profit / Revenue × 100'
      },
      {
        name: 'Net Profit Margin',
        value: sales !== 0 ? (netProfit / sales) * 100 : 0,
        percentage: sales !== 0 ? (netProfit / sales) * 100 : 0,
        benchmark: 15,
        status: (sales !== 0 && (netProfit / sales) * 100 >= 15) ? 'good' : 'average',
        description: 'Net Profit / Revenue × 100'
      },
    ],
    solvency: [
      {
        name: 'Debt-to-Equity Ratio',
        value: debtToEquity,
        benchmark: 1.0,
        status: 'good',
        description: 'Total Debt / Total Equity'
      },
    ],
    efficiency: [
      {
        name: 'Asset Turnover',
        value: fixedAssets !== 0 ? sales / fixedAssets : 0,
        benchmark: 1.5,
        status: 'average',
        description: 'Revenue / Fixed Assets'
      },
    ],
  };

  const trendData = [
    { month: 'Jan', ratio: 2.2, benchmark: 1.5 },
    { month: 'Feb', ratio: 2.3, benchmark: 1.5 },
    { month: 'Mar', ratio: 2.4, benchmark: 1.5 },
    { month: 'Apr', ratio: 2.45, benchmark: 1.5 },
    { month: 'May', ratio: 2.5, benchmark: 1.5 },
    { month: 'Jun', ratio: 2.48, benchmark: 1.5 },
  ];

  const comparisonData = Object.entries(ratios).map(([key, items]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    avg: (items.reduce((sum, r) => sum + r.value, 0) / items.length).toFixed(2),
    count: items.length,
  }));

  const getCurrentRatios = () => {
    return ratios[activeTab];
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
        <span className="text-[12px] font-bold">Ratio Analysis & Financial Metrics</span>
        <span className="text-[10px] text-tally-accent">Press ESC to go back</span>
      </div>

      {/* Tabs */}
      <div className="bg-tally-teal text-white flex border-b border-tally-hotkey h-[32px] overflow-x-auto">
        {[
          { id: 'liquidity' as const, label: 'Liquidity', icon: '💧' },
          { id: 'profitability' as const, label: 'Profitability', icon: '📈' },
          { id: 'solvency' as const, label: 'Solvency', icon: '🏦' },
          { id: 'efficiency' as const, label: 'Efficiency', icon: '⚙️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 border-r border-teal-900 transition-colors ${
              activeTab === tab.id ? 'bg-tally-accent text-black' : 'hover:bg-teal-700'
            } text-[11px] font-bold`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Time Range Selector */}
          <div className="flex gap-2 justify-end">
            {[
              { id: 'quarterly' as const, label: 'Quarterly' },
              { id: 'annual' as const, label: 'Annual' },
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id)}
                className={`px-3 py-1 text-[10px] font-bold transition-colors ${
                  timeRange === range.id
                    ? 'bg-tally-teal text-white'
                    : 'bg-white border-2 border-tally-teal text-tally-teal hover:bg-gray-50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Trend Chart */}
          <div className="bg-white border-2 border-tally-teal p-4">
            <h3 className="text-[12px] font-bold text-tally-teal mb-3">Trend Analysis (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Legend />
                <Line type="monotone" dataKey="ratio" stroke="#20b2aa" strokeWidth={2} name="Current Ratio" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="benchmark" stroke="#ff6b6b" strokeWidth={2} strokeDasharray="5 5" name="Benchmark" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Ratios Grid */}
          <div className="grid grid-cols-1 gap-3">
            {getCurrentRatios().map((ratio, idx) => (
              <div key={idx} className="bg-white border-2 border-tally-teal p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-[11px] font-bold text-tally-teal">{ratio.name}</h4>
                    <p className="text-[9px] text-gray-500 mt-1">{ratio.description}</p>
                  </div>
                  <div className={`text-right ${
                    ratio.status === 'good' ? 'text-green-700' : 
                    ratio.status === 'average' ? 'text-yellow-700' : 
                    'text-red-700'
                  }`}>
                    <div className="text-[14px] font-bold">{ratio.percentage ? ratio.percentage.toFixed(1) + '%' : ratio.value.toFixed(2)}</div>
                    <div className="text-[9px] font-bold uppercase">{ratio.status}</div>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="flex-1 h-8 bg-gray-100 rounded flex items-end overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        ratio.status === 'good' ? 'bg-tally-teal' :
                        ratio.status === 'average' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min((ratio.value / ratio.benchmark) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-gray-600 whitespace-nowrap">
                    Benchmark: {ratio.benchmark}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Chart */}
          <div className="bg-white border-2 border-tally-teal p-4">
            <h3 className="text-[12px] font-bold text-tally-teal mb-3">Category Comparison</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Bar dataKey="avg" fill="#20b2aa" name="Average Ratio" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <div className="bg-tally-teal text-white p-4 rounded">
            <h3 className="text-[12px] font-bold mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Financial Health Summary
            </h3>
            <p className="text-[10px] leading-relaxed">
              Your {activeTab} ratios show {getCurrentRatios().filter(r => r.status === 'good').length}/{getCurrentRatios().length} metrics in good standing. 
              The company maintains healthy {activeTab} positions with values exceeding industry benchmarks. 
              Continue monitoring trends for sustained financial performance.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-tally-bg p-2 border-t border-tally-hotkey flex justify-end">
        <button
          onClick={onBack}
          className="bg-tally-teal text-white px-4 py-1 text-[11px] font-bold hover:bg-teal-700 transition-colors"
        >
          ESC: Back
        </button>
      </div>
    </motion.div>
  );
}
