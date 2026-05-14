/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Hash } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: any) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, code })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      onLogin(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-tally-bg flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white border-4 border-tally-teal shadow-2xl overflow-hidden"
      >
        <div className="bg-tally-teal p-6 text-white text-center">
          <h1 className="text-2xl font-bold tracking-widest uppercase">TallyPrime ERP</h1>
          <p className="text-[10px] opacity-70 mt-1 uppercase">Church Administration System</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-2 text-red-700 text-xs italic">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="email"
                placeholder="User Email"
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 focus:border-tally-teal outline-none transition-colors text-sm"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="password"
                placeholder="Password"
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 focus:border-tally-teal outline-none transition-colors text-sm"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Branch / Church Login CODE (Optional for HQ)"
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-100 focus:border-tally-teal outline-none transition-colors text-sm uppercase"
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-tally-teal hover:bg-tally-header text-white font-bold py-3 transition-colors uppercase tracking-widest text-sm disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Login (Enter)'}
          </button>
          
          <div className="text-center">
            <span className="text-[10px] text-gray-400 uppercase font-bold">Rel 4.0 | Educational Mode</span>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
