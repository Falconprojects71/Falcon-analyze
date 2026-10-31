import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ShieldCheck,
  LogOut,
  Users,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { OwnerUser } from '../types';

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

  // System stats state
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalCheckouts: number;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchOverviewStats = async () => {
    if (!ownerToken && !isOwner) return;
    setIsLoadingStats(true);
    try {
      const headers: Record<string, string> = {};
      if (ownerToken) headers['x-owner-token'] = ownerToken;

      const res = await fetch('/api/admin/overview', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isOpen && isOwner) {
      fetchOverviewStats();
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
        throw new Error(data.error || 'Invalid owner credentials.');
      }

      setSuccessMessage('Owner authentication verified successfully!');
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#A855F7', '#3B82F6', '#22C55E'],
        });
      } catch (_) {}

      setTimeout(() => {
        onLoginSuccess(data.token, data.user);
        setIsLoading(false);
        setIdentifier('');
        setPassword('');
      }, 500);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      id="owner-modal-backdrop"
    >
      <div
        className="bg-white border border-[#D8DFEA] rounded-2xl w-full max-w-lg overflow-hidden shadow-card flex flex-col relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        id="owner-modal-content"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#D8DFEA] bg-[#E9EDF5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-[#182338] flex items-center gap-2">
                OWNER / ADMIN PORTAL
              </h2>
              <p className="text-xs text-[#64748B] font-mono">
                {isOwner
                  ? `Authenticated as: ${ownerUser?.email || 'Administrator'}`
                  : 'Developer mode and elevated privileges authentication'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#182338] p-1.5 rounded-lg bg-white border border-[#D8DFEA] transition-colors cursor-pointer"
            id="owner-modal-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isOwner ? (
            /* ================================================== */
            /* OWNER DASHBOARD & PRIVILEGES                       */
            /* ================================================== */
            <div className="space-y-5" id="admin-overview-section">
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-mono text-sm font-bold text-purple-200">
                    Owner Privileges Active
                  </h4>
                  <p className="font-mono text-xs text-[#182338] mt-0.5">
                    Logged in as <strong className="text-white">{ownerUser?.email}</strong>. Full development privileges unlocked.
                  </p>
                </div>
              </div>

              {/* Platform Overview Stats */}
              <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl p-4 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#182338] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#245BDB]" />
                    Platform Stats
                  </span>
                  <button
                    type="button"
                    onClick={fetchOverviewStats}
                    disabled={isLoadingStats}
                    className="text-[11px] text-[#64748B] hover:text-[#182338] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingStats ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-[#D8DFEA]">
                    <div className="text-[10px] text-[#64748B] uppercase">Registered Users</div>
                    <div className="text-base font-bold text-[#182338] mt-0.5">
                      {stats ? stats.totalUsers : '—'}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#D8DFEA]">
                    <div className="text-[10px] text-[#64748B] uppercase">Active Subscriptions</div>
                    <div className="text-base font-bold text-[#22C55E] mt-0.5">
                      {stats ? stats.activeSubscriptions : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Owner Permissions Checklist */}
              <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl p-4 text-left text-xs font-mono space-y-2 text-[#182338]">
                <div className="text-[#64748B] font-bold uppercase tracking-wider text-[11px] mb-1">
                  Active Owner Permissions:
                </div>
                <div className="flex items-center gap-2 text-[#22C55E]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Unlimited Free screenshot testing (Zero quota consumption)</span>
                </div>
                <div className="flex items-center gap-2 text-[#22C55E]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Full Pro 1, 2, & 3-screenshot multi-timeframe analysis testing</span>
                </div>
                <div className="flex items-center gap-2 text-[#22C55E]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Direct bypass of payment gateway for development testing</span>
                </div>
                <div className="flex items-center gap-2 text-[#22C55E]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Full access to institutional risk models & chart annotations</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-[#F2F4F8] hover:bg-[#1E293B] text-[#182338] border border-[#D8DFEA] transition-all cursor-pointer"
                >
                  Continue Testing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  id="owner-logout-overview-btn"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================================================== */
            /* OWNER LOGIN FORM                                   */
            /* ================================================== */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl p-3.5 text-xs font-mono text-[#182338] leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-purple-300 font-bold block mb-0.5">Owner / Admin Access</strong>
                  Authenticate to enable full development privileges and system administration.
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded-xl text-xs font-mono text-[#EF4444] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-[#22C55E]/15 border border-[#22C55E]/30 rounded-xl text-xs font-mono text-[#22C55E] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-[#182338] mb-1.5">
                    Owner Email or Owner ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="milyas1071@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl text-xs font-mono text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6] transition-all"
                      id="owner-identifier-input"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#182338] mb-1.5">
                    Owner Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl text-xs font-mono text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6] transition-all"
                      id="owner-password-input"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  id="owner-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Authenticate as Owner</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
