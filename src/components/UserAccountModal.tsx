import React, { useState } from 'react';
import {
  User,
  X,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  LogIn,
  UserPlus,
  LogOut,
  KeyRound,
  Mail,
} from 'lucide-react';
import { TestProDetails, AuthUser } from '../types';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmailOrId: string;
  isOwner: boolean;
  isPaidPro: boolean;
  isTestPro: boolean;
  testProDetails?: TestProDetails | null;
  freeAnalysisCount: number;
  maxFreeAnalyses: number;
  authUser?: AuthUser | null;
  onLogin?: (email: string, password: string) => Promise<boolean>;
  onRegister?: (email: string, password: string) => Promise<boolean>;
  onLogout?: () => Promise<void>;
  onSaveIdentifier: (newIdentifier: string) => Promise<void>;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmailOrId,
  isOwner,
  isPaidPro,
  isTestPro,
  testProDetails,
  freeAnalysisCount,
  maxFreeAnalyses,
  authUser,
  onLogin,
  onRegister,
  onLogout,
  onSaveIdentifier,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'sync'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inputVal, setInputVal] = useState(userEmailOrId);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter both email and password.' });
      return;
    }
    if (!onLogin) return;

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const success = await onLogin(email.trim(), password);
      if (success) {
        setStatusMessage({ type: 'success', text: 'Identity synced successfully' });
        setEmail('');
        setPassword('');
      } else {
        setStatusMessage({ type: 'error', text: 'Invalid email or password.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter both email and password.' });
      return;
    }
    if (password.length < 6) {
      setStatusMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (!onRegister) return;

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const success = await onRegister(email.trim(), password);
      if (success) {
        setStatusMessage({ type: 'success', text: 'Identity synced successfully' });
        setEmail('');
        setPassword('');
      } else {
        setStatusMessage({ type: 'error', text: 'Account creation failed. Email may already be in use.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Registration failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSync = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) return;

    setIsLoading(true);
    setStatusMessage(null);
    try {
      await onSaveIdentifier(clean);
      setStatusMessage({ type: 'success', text: 'Identity synced successfully' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (_) {
      setStatusMessage({ type: 'error', text: 'Sync failed. Please check network connection.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    if (!onLogout) return;
    setIsLoading(true);
    try {
      await onLogout();
      setStatusMessage({ type: 'success', text: 'Logged out successfully.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      id="user-account-modal-backdrop"
    >
      <div
        className="bg-[#0D121F] border border-cyan-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        id="user-account-modal-content"
      >
        {/* Glow Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-[#00F0A0]" />

        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                USER ACCOUNT & IDENTITY
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {authUser ? `Logged in: ${authUser.email}` : 'Unique User ID & Authentication'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
            id="user-account-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Active Plan Status Banner */}
          <div className="p-4 rounded-xl border font-mono text-xs">
            {isOwner ? (
              <div className="bg-purple-950/40 border-purple-500/30 -m-4 p-4 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 font-bold uppercase tracking-wider">Current Plan</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                    OWNER / ADMIN
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">Unlimited analysis testing privileges enabled.</p>
              </div>
            ) : isTestPro ? (
              <div className="bg-cyan-950/40 border-cyan-500/30 -m-4 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Current Plan
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                    PRO — TEST ACCESS
                  </span>
                </div>
                <div className="text-slate-300 text-[11px] space-y-1">
                  <p className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Full Pro 3-chart analysis & institutional models active
                  </p>
                  {testProDetails && (
                    <div className="pt-1 text-[10px] text-slate-400 space-y-0.5">
                      <p className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        Remaining: <strong className="text-white">{testProDetails.remainingTime || `${testProDetails.durationLabel}`}</strong>
                      </p>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Expires: {new Date(testProDetails.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : isPaidPro ? (
              <div className="bg-emerald-950/40 border-emerald-500/30 -m-4 p-4 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-300 font-bold uppercase tracking-wider">Current Plan</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    PRO SUBSCRIBER
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">Pro license active with full institutional features.</p>
              </div>
            ) : (
              <div className="bg-slate-900 border-slate-800 -m-4 p-4 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Current Plan</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
                    FREE TIER
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Usage: <strong className="text-white">{freeAnalysisCount}/{maxFreeAnalyses}</strong> free analyses used
                </p>
              </div>
            )}
          </div>

          {/* Unique User ID Display */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-slate-300">
                Your unique user ID
              </label>
              <span className="text-[10px] font-mono text-slate-500">Permanent ID</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 font-bold tracking-wider select-all">
                {userId}
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                id="copy-user-id-btn"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              Provide this ID or your account email to the Owner/Admin to receive temporary 7-day Test Pro access.
            </p>
          </div>

          {/* Status Message feedback */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* If Logged In: Show Account details & Logout */}
          {authUser ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Account Email:</span>
                <span className="text-white font-bold">{authUser.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Member Since:</span>
                <span className="text-slate-300">{new Date(authUser.createdAt).toLocaleDateString()}</span>
              </div>
              <button
                type="button"
                onClick={handleLogoutClick}
                disabled={isLoading}
                className="w-full mt-2 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                id="user-logout-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            /* If Not Logged In: Show Sign In / Register / Quick Link Tabs */
            <div className="space-y-4 pt-1 font-mono">
              <div className="flex border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => { setActiveTab('signin'); setStatusMessage(null); }}
                  className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'signin'
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                  id="tab-user-signin"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('register'); setStatusMessage(null); }}
                  className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'register'
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                  id="tab-user-register"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('sync'); setStatusMessage(null); }}
                  className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'sync'
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                  id="tab-user-sync"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Link Email</span>
                </button>
              </div>

              {activeTab === 'signin' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. friend@gmail.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                      id="login-email-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                      id="login-password-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    id="submit-user-login-btn"
                  >
                    {isLoading ? <span>Authenticating...</span> : (
                      <>
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Log In & Sync Identity</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {activeTab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. friend@gmail.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                      id="register-email-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      Password (min 6 chars)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                      id="register-password-input"
                    />
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Creating an account secures your permanent User ID and syncs your usage and Test Pro access across all devices.
                  </p>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    id="submit-user-register-btn"
                  >
                    {isLoading ? <span>Creating Account...</span> : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create Account & Bind ID</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {activeTab === 'sync' && (
                <form onSubmit={handleQuickSync} className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Link email address or user account
                    </label>
                    <input
                      type="text"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      placeholder="e.g. friend@gmail.com or user-7KFuVJ"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                      id="user-account-input"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Accessing from a new device? Enter your registered email or User ID to authenticate your Test Pro access.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    id="save-account-identifier-btn"
                  >
                    {isLoading ? (
                      <span>Syncing Account...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Save & Sync Identity</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
