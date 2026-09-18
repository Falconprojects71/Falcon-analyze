import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  Zap,
  UserPlus,
  Users,
  Clock,
  Calendar,
  Trash2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { OwnerUser, TestProRecord } from '../types';

interface OwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  ownerToken?: string | null;
  ownerUser: OwnerUser | null;
  onLoginSuccess: (token: string, user: OwnerUser) => void;
  onLogout: () => void;
}

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({
  isOpen,
  onClose,
  isOwner,
  ownerToken,
  ownerUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Admin Tab State
  const [activeTab, setActiveTab] = useState<'test_pro' | 'overview'>('test_pro');

  // Test Pro Users Management State
  const [testProUsers, setTestProUsers] = useState<TestProRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  
  // Grant Form State
  const [grantUserIdentifier, setGrantUserIdentifier] = useState('');
  const [grantDurationDays, setGrantDurationDays] = useState<number>(7);
  const [grantNotes, setGrantNotes] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Test Pro users when Owner modal is opened and user is owner
  const fetchTestProUsers = async () => {
    if (!ownerToken && !isOwner) return;
    setIsLoadingUsers(true);
    try {
      const headers: Record<string, string> = {};
      if (ownerToken) headers['x-owner-token'] = ownerToken;

      const res = await fetch('/api/admin/test-pro-users', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setTestProUsers(data.users);
        }
      }
    } catch (err) {
      console.error('Failed to load Test Pro users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen && isOwner) {
      fetchTestProUsers();
    }
  }, [isOpen, isOwner, ownerToken]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    const cleanPwd = password.trim();

    if (!cleanId || !cleanPwd) {
      setErrorMessage('Please enter both your Owner Identifier (Email or ID) and Password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/owner-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: cleanId,
          password: cleanPwd,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid Owner credentials. Access denied.');
      }

      setSuccessMessage('Owner Mode Activated! Full testing privileges & Test Pro control enabled.');
      onLoginSuccess(data.token, data.user);

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#A855F7', '#00F0A0', '#38BDF8'],
        });
      } catch (_) {}

      setTimeout(() => {
        fetchTestProUsers();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantTestPro = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = grantUserIdentifier.trim();
    if (!cleanId) {
      setGrantError('Please enter a valid user email or unique User ID.');
      return;
    }

    setIsGranting(true);
    setGrantError(null);
    setGrantSuccess(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (ownerToken) headers['x-owner-token'] = ownerToken;

      const res = await fetch('/api/admin/grant-test-pro', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userIdentifier: cleanId,
          durationDays: grantDurationDays,
          notes: grantNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to grant Test Pro access.');
      }

      setGrantSuccess(`Test Pro granted to "${cleanId}" for ${grantDurationDays} days!`);
      setGrantUserIdentifier('');
      setGrantNotes('');

      try {
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#00F0A0', '#38BDF8', '#A855F7'],
        });
      } catch (_) {}

      await fetchTestProUsers();

      setTimeout(() => {
        setIsGrantModalOpen(false);
        setGrantSuccess(null);
      }, 1500);
    } catch (err: any) {
      setGrantError(err.message || 'Error granting Test Pro access.');
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeTestPro = async (record: TestProRecord) => {
    const confirmRevoke = window.confirm(
      `Are you sure you want to immediately revoke Test Pro access for "${record.userIdentifier}"?`
    );
    if (!confirmRevoke) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (ownerToken) headers['x-owner-token'] = ownerToken;

      const res = await fetch('/api/admin/revoke-test-pro', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recordId: record.id,
          userIdentifier: record.userIdentifier,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await fetchTestProUsers();
      } else {
        alert(data.error || 'Failed to revoke access.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error while revoking Test Pro access.');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={onClose}
      id="owner-login-modal-backdrop"
    >
      <div
        className={`bg-[#0D121F] border border-purple-500/40 rounded-2xl w-full ${
          isOwner ? 'max-w-2xl' : 'max-w-md'
        } overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col relative transition-all duration-300 my-8`}
        onClick={(e) => e.stopPropagation()}
        id="owner-login-modal-content"
      >
        {/* Top Glow Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-indigo-400 to-[#00F0A0]" />

        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                FALCON ANALYZE
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  OWNER & ADMIN
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {isOwner ? `Logged in as ${ownerUser?.email || 'Owner'}` : 'Development, Testing & User Management'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
            id="owner-modal-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Owner Tab Navigation (Only shown when authenticated) */}
        {isOwner && (
          <div className="flex items-center border-b border-slate-800 bg-slate-950/60 px-5 pt-2">
            <button
              onClick={() => setActiveTab('test_pro')}
              className={`flex items-center gap-2 py-2.5 px-4 font-mono text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'test_pro'
                  ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="admin-tab-test-pro"
            >
              <Users className="w-4 h-4" />
              <span>TEST PRO USERS</span>
              {testProUsers.filter((u) => u.status === 'ACTIVE').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] border border-emerald-500/30">
                  {testProUsers.filter((u) => u.status === 'ACTIVE').length} Active
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 py-2.5 px-4 font-mono text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="admin-tab-overview"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>OWNER PRIVILEGES</span>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          {isOwner ? (
            activeTab === 'test_pro' ? (
              /* ================================================== */
              /* TEST PRO USERS SECTION                             */
              /* ================================================== */
              <div className="space-y-4" id="admin-test-pro-section">
                {/* Header with Grant Button and Refresh */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div>
                    <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      TEST PRO ACCESS MANAGEMENT
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Grant temporary testing Pro access to selected friends/users without payment.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchTestProUsers}
                      disabled={isLoadingUsers}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                      title="Refresh User List"
                      id="refresh-test-pro-btn"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-purple-400' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsGrantModalOpen(true);
                        setGrantError(null);
                        setGrantSuccess(null);
                      }}
                      className="py-2 px-3.5 rounded-lg font-mono text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white border border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
                      id="grant-test-pro-open-btn"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Grant Test Pro</span>
                    </button>
                  </div>
                </div>

                {/* Grant Test Pro Modal / Form Drawer */}
                {isGrantModalOpen && (
                  <div className="bg-purple-950/30 border border-purple-500/40 rounded-xl p-5 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                      <h4 className="text-xs font-mono font-bold text-purple-200 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-purple-400" />
                        Grant Temporary Test Pro Access
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsGrantModalOpen(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-md bg-slate-900/60 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {grantError && (
                      <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-lg text-xs font-mono text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{grantError}</span>
                      </div>
                    )}

                    {grantSuccess && (
                      <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-xs font-mono text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{grantSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleGrantTestPro} className="space-y-3">
                      <div>
                        <label className="block text-xs font-mono text-slate-300 mb-1">
                          User Email OR Unique User ID <span className="text-purple-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={grantUserIdentifier}
                          onChange={(e) => setGrantUserIdentifier(e.target.value)}
                          placeholder="e.g. friend@gmail.com or USR-7A3B9F"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/40"
                          id="grant-user-identifier-input"
                          required
                        />
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                          Enter the friend's email address or the User ID displayed in their Falcon Analyze header/account modal.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-slate-300 mb-1.5">
                          Test Duration <span className="text-purple-400">*</span>
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { days: 1, label: '1 Day' },
                            { days: 3, label: '3 Days' },
                            { days: 7, label: '7 Days' },
                            { days: 14, label: '14 Days' },
                            { days: 30, label: '30 Days' },
                          ].map((option) => (
                            <button
                              key={option.days}
                              type="button"
                              onClick={() => setGrantDurationDays(option.days)}
                              className={`py-2 px-1 text-center font-mono text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                grantDurationDays === option.days
                                  ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                              }`}
                              id={`duration-btn-${option.days}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-slate-300 mb-1">
                          Notes / Reference (Optional)
                        </label>
                        <input
                          type="text"
                          value={grantNotes}
                          onChange={(e) => setGrantNotes(e.target.value)}
                          placeholder="e.g. Beta tester, multi-timeframe swing trader"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsGrantModalOpen(false)}
                          className="py-2 px-3 rounded-lg font-mono text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isGranting}
                          className="py-2 px-4 rounded-lg font-mono text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          id="confirm-grant-test-pro-btn"
                        >
                          {isGranting ? (
                            <>
                              <Zap className="w-3.5 h-3.5 animate-spin" />
                              <span>Granting Access...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Grant Test Pro Access</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Test Pro Users Table / List */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="font-bold text-slate-300">Registered Test Pro Users ({testProUsers.length})</span>
                    <span className="text-[10px]">Server-Enforced Temporary Access</span>
                  </div>

                  {isLoadingUsers ? (
                    <div className="p-8 text-center text-xs font-mono text-slate-400 space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-400" />
                      <p>Loading registered Test Pro records...</p>
                    </div>
                  ) : testProUsers.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-slate-400 space-y-2">
                      <Users className="w-8 h-8 mx-auto text-slate-600" />
                      <p className="text-slate-300 font-bold">No Test Pro users registered yet.</p>
                      <p className="text-[11px] text-slate-500">
                        Click "+ Grant Test Pro" above to give temporary access to a friend or tester.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                      {testProUsers.map((user) => {
                        const isActive = user.status === 'ACTIVE';
                        const isExpired = user.status === 'EXPIRED';
                        const isRevoked = user.status === 'REVOKED';

                        return (
                          <div
                            key={user.id}
                            className="p-3.5 hover:bg-slate-850/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                            id={`test-pro-user-row-${user.id}`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white">{user.userIdentifier}</span>
                                
                                <button
                                  type="button"
                                  onClick={() => handleCopy(user.userIdentifier)}
                                  className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                                  title="Copy Identifier"
                                >
                                  {copiedId === user.userIdentifier ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>

                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  TEST
                                </span>

                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    isActive
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : isExpired
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  }`}
                                >
                                  {user.status}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-500" />
                                  Start: {formatDate(user.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  Expires: {formatDate(user.expiresAt)}
                                </span>
                              </div>

                              {user.notes && (
                                <div className="text-[10px] text-slate-500 italic">
                                  Note: {user.notes}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                              <div className="text-right">
                                <span
                                  className={`text-xs font-bold block ${
                                    isActive
                                      ? 'text-emerald-400'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {user.remainingTime || (isActive ? `${user.durationLabel}` : user.status)}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {user.durationLabel} grant
                                </span>
                              </div>

                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeTestPro(user)}
                                  className="py-1.5 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Immediately revoke Test Pro access"
                                  id={`revoke-btn-${user.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Revoke</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-2 flex justify-between items-center border-t border-slate-800">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Owner session active ({ownerUser?.email})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2 px-4 rounded-xl font-mono text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all cursor-pointer"
                    >
                      Close Panel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      className="py-2 px-3.5 rounded-xl font-mono text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      id="owner-logout-btn"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ================================================== */
              /* OWNER OVERVIEW & PRIVILEGES TAB                   */
              /* ================================================== */
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-emerald-500/20 border border-purple-500/40 mx-auto flex items-center justify-center text-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.25)]">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>

                <div>
                  <h3 className="text-lg font-mono font-bold text-white mb-1">
                    OWNER MODE ACTIVE
                  </h3>
                  <p className="text-xs font-mono text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Owner Access Active ({ownerUser?.email || 'owner'})
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-left text-xs font-mono space-y-2 text-slate-300">
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] mb-1">
                    Active Owner Permissions:
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Unlimited Free 1-screenshot testing (Zero quota consumption)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Full Pro 1, 2, & 3-screenshot simultaneous analysis testing</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Grant & Revoke Test Pro access for friends/testers</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Institutional Risk, Multi-Timeframe Trade Plans & Annotator access</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all cursor-pointer"
                  >
                    Continue Testing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    id="owner-logout-overview-btn"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )
          ) : (
            /* ================================================== */
            /* OWNER LOGIN FORM                                   */
            /* ================================================== */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3.5 text-xs font-mono text-purple-200/90 leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-purple-300 font-bold block mb-0.5">Owner / Admin Access</strong>
                  Authenticate to enable full development privileges and manage temporary Test Pro passes for testers.
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl text-xs font-mono text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-xs font-mono text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    Owner Email or Owner ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="owner@falconanalyze.com or milyas1071@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 transition-all"
                      id="owner-identifier-input"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 transition-all"
                      id="owner-password-input"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:brightness-110 active:scale-[0.99] text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-purple-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                id="owner-login-submit-btn"
              >
                {isLoading ? (
                  <>
                    <Zap className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Login as Owner</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
