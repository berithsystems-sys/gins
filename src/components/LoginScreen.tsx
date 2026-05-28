/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Hash, Download, ArrowRight, ShieldCheck, Globe, Database } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: any) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBtn(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, code }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      // Store in local storage for faster subsequent loads (PWA optimization)
      localStorage.setItem('tally_user', JSON.stringify(data));
      onLogin(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-tally-bg flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Left Side: Landing Content */}
      <div className="hidden md:flex md:w-1/2 bg-tally-header p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-tally-teal opacity-20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-tally-accent opacity-10 rounded-full blur-[80px]"></div>
        
        <motion.div 
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-tally-accent p-2 rounded-lg">
              <Database className="w-8 h-8 text-tally-header" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter">GINS ERP</h1>
          </div>
          
          <h2 className="text-5xl font-black text-white leading-tight mb-6">
            Intelligent Church <br />
            <span className="text-tally-accent">Management</span> Simplified.
          </h2>
          <p className="text-white/60 text-lg max-w-md mb-12">
            A comprehensive, cloud-ready accounting solution designed for modern religious institutions. 
            Secure, reliable, and multi-branch enabled.
          </p>

          <div className="grid grid-cols-1 gap-6">
            {[
              { icon: <ShieldCheck className="w-5 h-5" />, title: 'Bank-Grade Security', desc: 'Encrypted transactions and audit trails.' },
              { icon: <Globe className="w-5 h-5" />, title: 'Multi-Branch Sync', desc: 'Real-time data consolidation across HQ.' },
              { icon: <Database className="w-5 h-5" />, title: 'Automated Reporting', desc: 'Instant Balance Sheet and P&L generation.' }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 + (i * 0.1) }}
                className="flex items-start gap-4"
              >
                <div className="bg-white/10 p-2 rounded-md text-tally-accent">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{feature.title}</h4>
                  <p className="text-white/40 text-xs">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="relative z-10 flex items-center justify-between text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">
          <span>© 2026 BERITHSYSTEMS</span>
          <span>Version 4.0.2-RELEASE</span>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 relative">
        <AnimatePresence>
          {showInstallBtn && (
            <motion.button
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              onClick={handleInstall}
              className="absolute top-6 right-6 bg-tally-accent hover:bg-yellow-500 text-black px-4 py-2 rounded-full text-[11px] font-black uppercase flex items-center gap-2 shadow-lg transition-all z-20"
            >
              <Download className="w-4 h-4" />
              Install Desktop App
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 text-center md:text-left">
            <h3 className="text-2xl font-black text-tally-header uppercase">Sign In</h3>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Access your account portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 bg-white p-8 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100">
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-[11px] font-bold uppercase italic rounded"
              >
                {error}
              </motion.div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Account Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="email"
                    placeholder="name@church.com"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-tally-teal focus:bg-white rounded-xl outline-none transition-all text-sm font-bold"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Secure Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-tally-teal focus:bg-white rounded-xl outline-none transition-all text-sm font-bold"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Branch Access Code</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Optional for HQ"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-tally-teal focus:bg-white rounded-xl outline-none transition-all text-sm font-bold uppercase"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-tally-header hover:bg-tally-teal text-white font-black py-4 rounded-xl transition-all uppercase tracking-[0.2em] text-xs shadow-lg shadow-tally-teal/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 group"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Authenticate
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-6 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
             <div className="flex items-center gap-1">
               <ShieldCheck className="w-4 h-4" />
               <span className="text-[9px] font-black uppercase">SSL SECURE</span>
             </div>
             <div className="flex items-center gap-1">
               <Database className="w-4 h-4" />
               <span className="text-[9px] font-black uppercase">ENCRYPTED DB</span>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
