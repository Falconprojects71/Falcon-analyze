import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Users,
  History,
  BarChart2,
  ArrowLeft,
  ArrowRight,
  X,
  CreditCard,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChartAnalysisResult, OwnerUser } from '../types';
import { HistoryDrawer } from './HistoryDrawer';


interface OwnerAdminPortalProps {
  ownerToken: string | null;
  isOwner: boolean;
  ownerUser: OwnerUser | null;
  onLoginSuccess: (token: string, user: OwnerUser) => void;
  onLogout: () => Promise<void>;
  onNavigateHome: () => void;
}

export const OwnerAdminPortal: React.FC<OwnerAdminPortalProps> = ({
  ownerToken,
  isOwner,
  ownerUser,
  onLoginSuccess,
  onLogout,
  onNavigateHome,
}) => {
  // Login form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Controls & Overview panel toggle (open by default for owner)
  const [isControlsPanelOpen, setIsControlsPanelOpen] = useState(true);

  // Platform overview stats
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalCheckouts: number;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Owner History drawer & state (fetched securely from /api/admin/history)
  const [ownerHistory, setOwnerHistory] = useState<ChartAnalysisResult[]>([]);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);


  // Fetch admin stats from protected endpoint
  const fetchOverviewStats = useCallback(async () => {
    if (!ownerToken && !isOwner) return;
    setIsLoadingStats(true);
    try {
      const headers: Record<string, string> = {
        'x-owner-token': ownerToken || '',
        Authorization: `Bearer ${ownerToken || ''}`,
      };

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
  }, [ownerToken, isOwner]);

  // Fetch owner history from protected endpoint
  const fetchOwnerHistory = useCallback(async () => {
    if (!ownerToken && !isOwner) return;
    setIsLoadingHistory(true);
    try {
      const headers: Record<string, string> = {
        'x-owner-token': ownerToken || '',
        Authorization: `Bearer ${ownerToken || ''}`,
      };

      const res = await fetch('/api/admin/history', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.history)) {
          // Normalize items: each item might have `result` or be an analysis directly
          const normalized: ChartAnalysisResult[] = data.history.map((item: any) => {
            if (item.result) {
              return {
                ...item.result,
                id: item.id || item.result.id,
                timestamp: item.timestamp || item.result.timestamp || new Date().toISOString(),
                asset: item.asset || item.result.asset,
                timeframe: item.timeframe || item.result.timeframe,
                tradingStyle: item.tradingStyle || item.result.tradingStyle,
              };
            }
            return item;
          });
          setOwnerHistory(normalized);
        }
      }
    } catch (err) {
      console.error('Failed to fetch owner history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [ownerToken, isOwner]);

  // Clear owner history via protected endpoint
  const handleClearOwnerHistory = async () => {
    if (!ownerToken && !isOwner) return;
    try {
      const headers: Record<string, string> = {
        'x-owner-token': ownerToken || '',
        Authorization: `Bearer ${ownerToken || ''}`,
      };

      const res = await fetch('/api/admin/history', {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setOwnerHistory([]);
      }
    } catch (err) {
      console.error('Failed to clear owner history:', err);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchOverviewStats();
      fetchOwnerHistory();
    }
  }, [isOwner, fetchOverviewStats, fetchOwnerHistory]);

  // Handle owner login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    const cleanPwd = password.trim();

    if (!cleanId || !cleanPwd) {
      setErrorMessage('Please enter both your Owner Email or ID and Password.');
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


  // ------------------------------------------------------------------
  // 1. UNAUTHENTICATED: Display Private Owner Login Portal
  // ------------------------------------------------------------------
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-[#F2F4F8] flex flex-col justify-between" id="private-owner-login-view">
        {/* Top Minimal Bar */}
        <div className="border-b border-[#D8DFEA] bg-white px-4 py-3 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold font-mono text-sm tracking-tight text-[#182338]">
                FALCON <span className="text-purple-600">ANALYZE</span> &bull; <span className="text-[#64748B]">OWNER PORTAL</span>
              </span>
            </div>
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#E9EDF5] border border-[#D8DFEA] text-xs font-mono font-medium text-[#182338] transition-all cursor-pointer shadow-xs"
              id="return-to-public-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#245BDB]" />
              <span>Public Falcon Analyze</span>
            </button>
          </div>
        </div>

        {/* Center Login Card */}
        <div className="flex-1 flex items-center justify-center p-4 border border-[#cd4d4d]">
          <div className="w-full max-w-md bg-white border border-[#cd4d4d] rounded-2xl shadow-card overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-[#E9EDF5] border-b border-[#D8DFEA]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-mono text-[#182338] uppercase tracking-wide">
                    Owner & Admin Interface
                  </h2>
                  <p className="text-xs font-mono text-[#64748B] mt-0.5">
                    Restricted server-authorized administration
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs font-mono text-purple-900 leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-purple-800 font-bold block mb-0.5">Private Administrative Area</strong>
                  Owner Controls, Owner History, and System Functions require valid server authorization.
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-mono text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#DC4655]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A36A]" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-mono font-medium text-[#182338] mb-1.5">
                    Owner Email or Owner ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="milyas1071@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#D8DFEA] rounded-xl text-xs font-mono text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#245BDB] transition-all"
                      id="owner-identifier-input"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-[#182338] mb-1.5">
                    Owner Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#D8DFEA] rounded-xl text-xs font-mono text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#245BDB] transition-all"
                      id="owner-password-input"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
                    id="owner-submit-btn"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying Authorization...</span>
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
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#E9EDF5] border-t border-[#D8DFEA] text-center text-[11px] font-mono text-[#64748B]">
              Direct API requests to administrative endpoints require server-side Owner authentication.
            </div>
          </div>
        </div>

        {/* Bottom Status */}
        <div className="text-center py-4 text-xs font-mono text-[#64748B]">
          Falcon Analyze &bull; Private Owner & Admin Security Subsystem
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // 2. AUTHENTICATED: Full Private Owner/Admin Interface
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F2F4F8] flex flex-col text-[#182338]" id="private-owner-portal-view">
      {/* Dedicated Private Owner Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[#D8DFEA] bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Brand & Owner Status */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg border flex items-center justify-center transition-all shadow-xs bg-purple-50 border-purple-200 text-purple-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold tracking-tight text-[#182338] flex items-center gap-1.5">
                  FALCON <span className="text-purple-600">ANALYZE</span>
                </h1>
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  <ShieldCheck className="w-3 h-3 text-purple-600" />
                  OWNER &bull; PRIVATE ADMIN INTERFACE
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-mono flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#16A36A]" />
                <span className="text-[#16A36A] font-medium">Owner Access Active</span>
                <span className="text-[#64748B] hidden sm:inline">&bull; {ownerUser?.email || 'Administrator'}</span>
              </p>
            </div>
          </div>

          {/* Owner Only Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Owner Controls Button */}
            <button
              type="button"
              onClick={() => setIsControlsPanelOpen(!isControlsPanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer shadow-xs ${
                isControlsPanelOpen
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
              }`}
              id="owner-controls-toggle-btn"
              title="System Overview & Platform Controls"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Owner Controls</span>
            </button>

            {/* Owner History Button */}
            <button
              type="button"
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#E9EDF5] border border-[#D8DFEA] text-xs font-mono font-medium text-[#182338] transition-all cursor-pointer shadow-xs"
              id="owner-history-toggle-btn"
              title="View Private Owner Analysis History"
            >
              <History className="w-3.5 h-3.5 text-purple-600" />
              <span>Owner History</span>
              {ownerHistory.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-purple-100 text-purple-700 border border-purple-200 font-bold">
                  {ownerHistory.length}
                </span>
              )}
            </button>

            {/* Owner Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-mono font-bold text-rose-700 transition-all cursor-pointer shadow-xs"
              title="Logout from Owner Mode"
              id="owner-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Owner Logout</span>
            </button>

            {/* Analysis Terminal Button */}
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#245BDB] hover:bg-[#1948B8] text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              title="Go to Chart Analysis Terminal"
              id="owner-nav-to-terminal-btn"
            >
              <BarChart2 className="w-3.5 h-3.5 text-white" />
              <span>Analysis Terminal</span>
            </button>
          </div>
        </div>
      </header>


      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Owner Controls & Platform Overview Panel (Collapsible or Open) */}
        {isControlsPanelOpen && (
          <div className="bg-white border border-[#D8DFEA] rounded-2xl p-6 shadow-card space-y-5 animate-fadeIn" id="owner-controls-panel">
            <div className="flex items-center justify-between border-b border-[#D8DFEA] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-mono text-base font-bold text-[#182338]">
                    Owner Controls & System Overview
                  </h3>
                  <p className="font-mono text-xs text-[#64748B]">
                    Live server platform statistics & elevated developer privileges
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchOverviewStats}
                  disabled={isLoadingStats}
                  className="px-3 py-1.5 rounded-lg bg-[#F2F4F8] hover:bg-[#E9EDF5] border border-[#D8DFEA] text-xs font-mono font-medium text-[#182338] flex items-center gap-1.5 cursor-pointer"
                  id="refresh-admin-stats-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#245BDB] ${isLoadingStats ? 'animate-spin' : ''}`} />
                  <span>Refresh Stats</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsControlsPanelOpen(false)}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#182338] hover:bg-[#E9EDF5] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Platform Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#F2F4F8] p-4 rounded-xl border border-[#D8DFEA]">
                <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#245BDB]" />
                  Total Users
                </div>
                <div className="text-xl font-bold font-mono text-[#182338] mt-1" id="stat-total-users">
                  {stats ? stats.totalUsers : '—'}
                </div>
              </div>

              <div className="bg-[#F2F4F8] p-4 rounded-xl border border-[#D8DFEA]">
                <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#16A36A]" />
                  Active Subscriptions
                </div>
                <div className="text-xl font-bold font-mono text-[#16A36A] mt-1" id="stat-active-subs">
                  {stats ? stats.activeSubscriptions : '—'}
                </div>
              </div>

              <div className="bg-[#F2F4F8] p-4 rounded-xl border border-[#D8DFEA]">
                <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  Total Subscriptions
                </div>
                <div className="text-xl font-bold font-mono text-[#182338] mt-1" id="stat-total-subs">
                  {stats ? stats.totalSubscriptions : '—'}
                </div>
              </div>

              <div className="bg-[#F2F4F8] p-4 rounded-xl border border-[#D8DFEA]">
                <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Total Checkouts
                </div>
                <div className="text-xl font-bold font-mono text-[#182338] mt-1" id="stat-total-checkouts">
                  {stats ? stats.totalCheckouts : '—'}
                </div>
              </div>
            </div>

            {/* Active Permissions Checklist */}
            <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl p-4 text-xs font-mono space-y-2 text-[#182338]">
              <div className="text-[#64748B] font-bold uppercase tracking-wider text-[11px] mb-2">
                Active Owner Privileges & Capabilities:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-[#16A36A]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Unlimited screenshot testing with zero quota consumption</span>
                </div>
                <div className="flex items-center gap-2 text-[#16A36A]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Full Pro 1, 2, & 3-screenshot multi-timeframe analysis</span>
                </div>
                <div className="flex items-center gap-2 text-[#16A36A]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Direct bypass of payment gateway for development testing</span>
                </div>
                <div className="flex items-center gap-2 text-[#16A36A]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Private server-side history storage & management</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Terminal Launcher Card */}
        <div className="bg-white border border-[#D8DFEA] rounded-2xl p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-center justify-between gap-6" id="owner-terminal-launcher-card">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Unified Falcon Analysis Terminal
            </div>
            <h3 className="text-lg font-bold font-mono text-[#182338]">
              Ready to Analyze Charts with Owner Privileges?
            </h3>
            <p className="text-xs font-mono text-[#64748B] leading-relaxed">
              Access the complete Falcon Analyze terminal with full chart preview, multi-timeframe 1, 2, & 3 screenshot analysis, and unlimited owner bypass. Your normal user session remains active in parallel.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-[#245BDB] hover:bg-[#1948B8] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer shrink-0"
            id="owner-open-terminal-btn"
          >
            <BarChart2 className="w-4 h-4 text-white" />
            <span>Launch Analysis Terminal</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </main>

      {/* Private Owner History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        history={ownerHistory}
        onSelectHistory={(_item) => {
          setIsHistoryDrawerOpen(false);
          onNavigateHome();
        }}
        onClearHistory={handleClearOwnerHistory}
      />
    </div>
  );
};
