import React, { useState, useEffect } from 'react';

export default function EmployeeScreen({ branchId }: { branchId?: string }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [designation, setDesignation] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);

  const fetchEmployees = async () => {
    const query = branchId ? `?branchId=${branchId}` : '';
    const res = await fetch(`api/employees${query}`);
    const data = await res.json();
    setEmployees(data);
  };

  useEffect(() => {
    fetchEmployees();
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, code, designation, salaryStructure: '{}', branchId }),
    });
    if (response.ok) {
      alert('Employee Created');
      setName('');
      setCode('');
      setDesignation('');
      fetchEmployees();
    }
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-[10px] font-black text-tally-teal uppercase border-b border-tally-teal/10 pb-1">Create Employee (Payroll)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase">Employee Name</label>
            <input 
              autoFocus
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1 font-bold text-tally-teal"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase">Employee Code/ID</label>
            <input 
              type="text" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1 font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase">Designation</label>
            <input 
              type="text" 
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1"
            />
          </div>
        </div>
        <button 
          type="submit"
          className="bg-tally-teal text-white px-8 py-2 text-xs font-bold uppercase shadow-md hover:bg-teal-700 mt-4"
        >
          Accept
        </button>
      </form>

      <div className="border-l pl-8 space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase">Employee Registry</h3>
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {employees.length === 0 && <p className="text-[10px] italic text-gray-400">No employees found</p>}
          {employees.map(emp => (
            <div key={emp.id} className="p-2 border-b border-gray-100 hover:bg-gray-50 group">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-tally-teal uppercase">{emp.name}</span>
                <span className="text-[10px] font-mono text-gray-400">{emp.code}</span>
              </div>
              <div className="text-[10px] text-gray-500">{emp.designation || 'Staff'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
