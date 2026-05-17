import React, { useState, useEffect } from 'react';
import { ShieldCheck, Database, Server, AlertTriangle, CheckCircle2, XCircle, Activity } from 'lucide-react';

export default function DebugDiagnosticsScreen() {
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);

  const tests = [
    { id: 'api_health', name: 'API Health Check', endpoint: 'api/health' },
    { id: 'db_connection', name: 'Database Connection', endpoint: 'api/ledgers' },
    { id: 'voucher_fetch', name: 'Voucher Retrieval', endpoint: 'api/vouchers' },
    { id: 'branch_fetch', name: 'Branch List Retrieval', endpoint: 'api/branches' },
    { id: 'audit_fetch', name: 'Audit Logs Access', endpoint: 'api/audit' }
  ];

  const runAllTests = async () => {
    setIsRunning(true);
    const newResults: any[] = [];

    for (const test of tests) {
      const startTime = performance.now();
      try {
        const response = await fetch(test.endpoint);
        const data = await response.json();
        const endTime = performance.now();
        
        newResults.push({
          ...test,
          status: response.ok ? 'SUCCESS' : 'FAILED',
          code: response.status,
          latency: Math.round(endTime - startTime),
          details: JSON.stringify(data).substring(0, 100) + '...'
        });
      } catch (err: any) {
        newResults.push({
          ...test,
          status: 'ERROR',
          details: err.message
        });
      }
    }

    setResults(newResults);
    setIsRunning(false);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  return (
    <div className="flex flex-col h-full bg-tally-bg p-4 overflow-auto">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div className="bg-tally-teal text-white p-4 shadow-lg flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-tally-accent" />
            <div>
              <h1 className="text-xl font-black uppercase">System Diagnostics</h1>
              <p className="text-[10px] opacity-70 italic uppercase">Debugging & API Connectivity Testing</p>
            </div>
          </div>
          <button 
            onClick={runAllTests}
            disabled={isRunning}
            className={`bg-white text-tally-teal px-6 py-2 font-black uppercase text-xs hover:bg-tally-accent hover:text-black transition-all shadow-md ${isRunning ? 'opacity-50' : ''}`}
          >
            {isRunning ? 'Running Tests...' : 'Re-Run All Tests'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white tally-border tally-shadow p-4 flex items-center gap-4">
            <Server className="w-10 h-10 text-blue-500" />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Environment</p>
              <p className="text-sm font-black text-tally-teal uppercase">Production / Hosting</p>
            </div>
          </div>
          <div className="bg-white tally-border tally-shadow p-4 flex items-center gap-4">
            <Database className="w-10 h-10 text-orange-500" />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Database</p>
              <p className="text-sm font-black text-tally-teal uppercase">MySQL (PDO)</p>
            </div>
          </div>
          <div className="bg-white tally-border tally-shadow p-4 flex items-center gap-4">
            <Activity className="w-10 h-10 text-green-500" />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
              <p className="text-sm font-black text-tally-teal uppercase">
                {results.every(r => r.status === 'SUCCESS') ? 'HEALTHY' : 'ISSUES DETECTED'}
              </p>
            </div>
          </div>
        </div>

        {/* Test Results Table */}
        <div className="bg-white tally-border tally-shadow overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-tally-teal">
              <tr className="text-[10px] font-bold text-gray-500 uppercase">
                <th className="px-4 py-3">Test Case</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Speed</th>
                <th className="px-4 py-3">Response Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-tally-teal uppercase">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{r.endpoint}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`font-black ${r.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`}>
                        {r.status} {r.code && `(${r.code})`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500">{r.latency ? `${r.latency}ms` : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="max-w-[200px] truncate italic text-gray-400 font-mono text-[9px]">
                      {r.details}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Troubleshooting Guide */}
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <h4 className="text-xs font-bold text-orange-900 uppercase">Troubleshooting Instructions</h4>
              <ul className="text-[10px] text-orange-800 list-disc pl-4 mt-2 space-y-1">
                <li>If <b>Database Connection</b> fails: Check <code>api.php</code> credentials and Hostinger Whitelist.</li>
                <li>If <b>API Health</b> fails: Ensure <code>.htaccess</code> is correctly redirecting requests.</li>
                <li>If <b>Voucher Fetch</b> fails: Run the <code>/api/update-db</code> migration to fix schema.</li>
                <li>Press <b>Shift + Ctrl + R</b> to clear browser cache if the page shows old data.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
