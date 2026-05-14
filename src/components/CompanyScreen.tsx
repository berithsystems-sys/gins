import React from 'react';

export default function CompanyScreen({ branchId }: { branchId?: string }) {
  return (
    <div className="p-8 space-y-6">
      <div className="border-2 border-tally-teal p-6 bg-white shadow-xl max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-tally-teal uppercase mb-6 flex items-center gap-2">
          <div className="w-1 h-6 bg-tally-teal"></div>
          Company Information
        </h2>
        
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Company Name</label>
              <div className="font-bold text-lg text-tally-teal border-b">Church Management System</div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Mailing Name</label>
              <div className="font-medium border-b italic">CMS Main</div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Address</label>
              <div className="h-16 border rounded bg-gray-50 p-2 text-xs">
                Plot No. 45, Spiritual Heights,<br />
                Near Zion Square, North District
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Financial Year Begin</label>
              <div className="font-bold border-b">01-Apr-2026</div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Books Beginning From</label>
              <div className="font-bold border-b">01-Apr-2026</div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Security Control</label>
              <div className="font-bold text-green-600 uppercase">Enabled (Tally Vault)</div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-tally-teal/10 flex justify-between">
          <div className="text-[10px] text-gray-400">Press Alt+K to change company settings</div>
          <button className="bg-tally-teal text-white px-6 py-2 text-xs font-bold uppercase shadow-lg">Alter Details</button>
        </div>
      </div>
    </div>
  );
}
