import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User, Lock, Save } from 'lucide-react';

interface SettingsScreenProps {
  onBack: () => void;
  user: { id: string; username: string; role: string; branchId?: string };
  onUserUpdate: (user: any) => void;
}

export default function SettingsScreen({ onBack, user, onUserUpdate }: SettingsScreenProps) {
  const [username, setUsername] = useState(user.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setUsername(user.username);
  }, [user]);

  const showStatus = (text: string, isError = false) => {
    if (isError) {
      setError(text);
      setTimeout(() => setError(''), 4000);
    } else {
      setMessage(text);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleProfileSave = async () => {
    if (!username.trim()) return showStatus('Username cannot be empty', true);
    if (username === user.username) return showStatus('No profile changes to save');

    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${user.id}/email`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to update username');

      onUserUpdate({ ...user, username: username.trim() });
      showStatus('Username updated successfully');
    } catch (err: any) {
      showStatus(err.message || 'Failed to update profile', true);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return showStatus('Complete all password fields', true);
    if (newPassword !== confirmPassword) return showStatus('New password and confirmation do not match', true);
    if (newPassword.length < 6) return showStatus('New password must be at least 6 characters', true);

    setChangingPassword(true);
    try {
      const res = await fetch(`/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to change password');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showStatus('Password changed successfully');
    } catch (err: any) {
      showStatus(err.message || 'Failed to change password', true);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-tally-bg"
    >
      <div className="bg-tally-header text-white h-[35px] flex items-center justify-between px-3 border-b border-tally-hotkey">
        <div className="text-[12px] font-bold flex items-center gap-2">
          <User className="w-4 h-4" />
          User Settings & Security
        </div>
        <button onClick={onBack} className="text-[10px] text-tally-accent hover:text-white">ESC: Back</button>
      </div>

      <div className="bg-tally-teal text-white flex border-b border-tally-hotkey h-[38px]">
        {[
          { id: 'profile' as const, label: 'Profile' },
          { id: 'security' as const, label: 'Security' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-[11px] font-bold transition-colors ${
              activeTab === tab.id ? 'bg-tally-accent text-black' : 'hover:bg-teal-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
          <div className="space-y-4">
            <div className="bg-white border-2 border-tally-teal p-4 rounded-md">
              <h3 className="text-[12px] font-bold text-tally-teal uppercase tracking-[0.2em] mb-3">Signed in user</h3>
              <div className="space-y-3 text-[11px] text-gray-700">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="text-[9px] uppercase font-bold text-gray-500">Username</div>
                    <div className="font-bold mt-1">{user.username}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="text-[9px] uppercase font-bold text-gray-500">Role</div>
                    <div className="font-bold mt-1">{user.role}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 col-span-2">
                    <div className="text-[9px] uppercase font-bold text-gray-500">Branch ID</div>
                    <div className="font-bold mt-1">{user.branchId || 'HQ / Global'}</div>
                  </div>
                </div>
              </div>
            </div>

            {activeTab === 'profile' && (
              <div className="bg-white border-2 border-tally-teal p-4 rounded-md">
                <h3 className="text-[12px] font-bold text-tally-teal uppercase tracking-[0.2em] mb-3">Profile Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500">Login Email</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full border-2 border-tally-teal px-3 py-2 mt-1 text-[11px] font-bold rounded"
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 leading-relaxed">
                    Your login email identifies your account. Changing it will update the current signed-in user immediately.
                  </div>
                  <button
                    onClick={handleProfileSave}
                    disabled={savingProfile}
                    className="bg-tally-teal text-white px-4 py-2 rounded font-bold text-[11px] hover:bg-teal-700 transition-colors disabled:opacity-60"
                  >
                    <Save className="w-3 h-3 inline-block mr-2" />
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white border-2 border-tally-teal p-4 rounded-md">
                <h3 className="text-[12px] font-bold text-tally-teal uppercase tracking-[0.2em] mb-3">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full border-2 border-tally-teal px-3 py-2 mt-1 text-[11px] font-bold rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border-2 border-tally-teal px-3 py-2 mt-1 text-[11px] font-bold rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border-2 border-tally-teal px-3 py-2 mt-1 text-[11px] font-bold rounded"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="bg-tally-teal text-white px-4 py-2 rounded font-bold text-[11px] hover:bg-teal-700 transition-colors disabled:opacity-60"
                  >
                    <Lock className="w-3 h-3 inline-block mr-2" />
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border-2 border-tally-teal p-4 rounded-md">
              <h3 className="text-[12px] font-bold text-tally-teal uppercase tracking-[0.2em] mb-3">Security Summary</h3>
              <div className="space-y-3 text-[11px] text-gray-700">
                <p>
                  This settings page applies only to the current signed-in user. Password changes are immediately persisted for your account.
                </p>
                <p>
                  Role: <span className="font-bold">{user.role}</span>
                </p>
                <p>
                  Branch ID: <span className="font-bold">{user.branchId || 'HQ / Global'}</span>
                </p>
                <p>
                  Always keep your password secure and do not share it with others.
                </p>
              </div>
            </div>
            <div className="bg-white border-2 border-tally-teal p-4 rounded-md text-[10px] text-gray-500">
              <div className="font-bold uppercase tracking-[0.2em] mb-2">Keyboard shortcut</div>
              <div className="space-y-3">
                <div>ALT+F1: Logout</div>
                <div>ALT+S: Open settings</div>
                <div>ESC: Go back</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(message || error) && (
        <div className={`px-4 py-3 text-[11px] font-bold ${error ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'}`}>
          {error || message}
        </div>
      )}
    </motion.div>
  );
}
