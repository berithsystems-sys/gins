import React, { useState, useEffect } from 'react';

export default function CompanyScreen({ branchId }: { branchId?: string }) {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch('/api/branches');
        const branches = await response.json();
        
        // Find the specific branch or default to HQ
        const targetBranch = branches.find((b: any) => b.id === (branchId || 'HQ'));
        setCompany(targetBranch);
      } catch (error) {
        console.error('Failed to fetch company details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [branchId]);

  if (loading) return <div className="p-20 text-center font-bold text-tally-teal uppercase animate-pulse">Loading Company Details...</div>;

  const displayData = company || {
    name: 'BERITHSYSTEMS HQ',
    code: 'HQ',
    location: 'Headquarters',
    registrationType: 'Regular'
  };

  return (
    <div className="p-8 space-y-6">
      <div className="border-2 border-tally-teal p-6 bg-white shadow-xl max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-tally-teal uppercase mb-6 flex items-center gap-2">
          <div className="w-1 h-6 bg-tally-teal"></div>
          Church Information
        </h2>
        
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company Name</label>
              <div className="font-black text-xl text-tally-teal border-b border-gray-100 py-1 uppercase">{displayData.name}</div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mailing Name</label>
              <div className="font-bold border-b border-gray-100 py-1 uppercase">{displayData.name}</div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Address</label>
              <div className="h-20 border rounded bg-gray-50 p-3 text-xs font-bold text-gray-600 uppercase">
                {displayData.location || 'NOT SPECIFIED'}<br />
                {displayData.state || ''} {displayData.country || ''}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Financial Year Begin</label>
              <div className="font-black border-b border-gray-100 py-1">01-Apr-2026</div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Books Beginning From</label>
              <div className="font-black border-b border-gray-100 py-1">01-Apr-2026</div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registration Type</label>
              <div className="font-black text-tally-teal uppercase py-1">{displayData.registrationType || 'Regular'}</div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">GST Status</label>
              <div className="font-black text-green-600 uppercase py-1">Enabled (Active)</div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-tally-teal/10 flex justify-between items-center">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
            Branch ID: <span className="text-tally-teal">{displayData.id}</span> | Code: <span className="text-tally-teal">{displayData.code}</span>
          </div>
          <button className="bg-tally-teal hover:bg-tally-header text-white px-8 py-2 text-xs font-black uppercase shadow-lg transition-colors">
            Alter (F3)
          </button>
        </div>
      </div>
    </div>
  );
}

