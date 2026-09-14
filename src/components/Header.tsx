import React from 'react';
import { History, RefreshCw, BarChart2, Crown, Lock, ShieldCheck, LogOut, Shield } from 'lucide-react';

interface HeaderProps {
  onOpenHistory: () => void;
  historyCount: number;
  onReset: () => void;
  isAnalyzing: boolean;
  isProUser: boolean;
  isTestPro?: boolean;
  testProRemainingTime?: string;
  userId?: string;
  onOpenUserAccountModal?: () => void;
  onOpenUpgradeModal: () => void;
  freeAnalysisCount?: number;
  maxFreeAnalyses?: number;
  freeLimitReached?: boolean;
  isOwner?: boolean;
  ownerEmail?: string;
  onOpenOwnerModal?: () => void;
  onOwnerLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  historyCount,
  onReset,
  isAnalyzing,
  isProUser,
  isTestPro = false,
  testProRemainingTime = '',
  userId = '',
  onOpenUserAccountModal,
  onOpenUpgradeModal,
  freeAnalysisCount = 0,
  maxFreeAnalyses = 3,
  freeLimitReached = false,
  isOwner = false,
  ownerEmail = '',
  onOpenOwnerModal,
  onOwnerLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#080B11]/90 backdrop-blur-md px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-lg border flex items-center justify-center shadow-[0_0_15px_rgba(0,240,160,0.2)] ${
              isOwner
                ? 'bg-gradient-to-tr from-purple-500/20 via-indigo-500/20 to-purple-500/30 border-purple-500/40 text-purple-400'
                : isTestPro
                ? 'bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-emerald-500/30 border-cyan-500/40 text-cyan-400'
                : 'bg-gradient-to-tr from-cyan-500/20 via-emerald-500/20 to-teal-500/30 border-emerald-500/30 text-[#00F0A0]'
            }`}
          >
            {isOwner ? <Shield className="w-5 h-5" /> : <BarChart2 className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                FALCON <span className={isOwner ? 'text-purple-400' : isTestPro ? 'text-cyan-400' : 'text-[#00F0A0]'}>ANALYZE</span>
              </h1>
              {isOwner ? (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-purple-600/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  OWNER MODE
                </span>
              ) : isTestPro ? (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-emerald-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)] animate-pulse">
                  <Crown className="w-3 h-3 text-cyan-400" />
                  PRO — TEST ACCESS
                </span>
              ) : isProUser ? (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/40">
                  <Crown className="w-3 h-3 text-amber-400" />
                  PRO
                </span>
              ) : freeLimitReached ? (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Lock className="w-2.5 h-2.5" />
                  FREE ({freeAnalysisCount}/{maxFreeAnalyses} USED)
                </span>
              ) : (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  FREE ({freeAnalysisCount}/{maxFreeAnalyses})
                </span>
              )}
            </div>
            {isOwner ? (
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">✓ Owner Access Active</span>
                <span className="text-slate-500 hidden sm:inline">&bull; Unlimited Testing & User Management</span>
              </p>
            ) : isTestPro ? (
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-400 font-bold">✓ Temporary Pro Testing Active</span>
                {testProRemainingTime && (
                  <span className="text-slate-400">&bull; {testProRemainingTime}</span>
                )}
              </p>
            ) : (
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Gemini Vision Technical Analysis Engine
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {/* User Account / ID Button (For testing users to view/copy ID or link email) */}
          {onOpenUserAccountModal && (
            <button
              type="button"
              onClick={onOpenUserAccountModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                isTestPro
                  ? 'bg-cyan-950/40 hover:bg-cyan-900/50 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="View User ID or Link Account"
              id="header-user-account-btn"
            >
              <span className="font-bold">{userId || 'My Account'}</span>
            </button>
          )}

          {/* Owner Mode Actions vs Test Pro vs Normal User Actions */}
          {isOwner ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenOwnerModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-xs font-mono font-bold text-purple-200 transition-all cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                title="Owner Controls & Permissions"
                id="header-owner-status-btn"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin / Test Pro</span>
              </button>

              <button
                type="button"
                onClick={onOwnerLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-mono font-bold text-rose-300 transition-all cursor-pointer"
                title="Logout from Owner Mode"
                id="header-owner-logout-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : isTestPro ? (
            <button
              type="button"
              onClick={onOpenUserAccountModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-emerald-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-xs font-mono font-bold text-cyan-300 transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
              id="header-test-pro-active-btn"
            >
              <Crown className="w-3.5 h-3.5 text-cyan-400" />
              <span>PRO — TEST ACCESS</span>
            </button>
          ) : isProUser ? (
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-amber-600/20 hover:from-amber-500/20 hover:to-amber-600/30 border border-amber-500/40 text-xs font-mono font-bold text-amber-300 transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.1)]"
              id="header-pro-active-btn"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Pro Active</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 text-xs font-mono font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)] border border-amber-300/40"
              id="header-upgrade-pro-btn"
            >
              <Crown className="w-3.5 h-3.5 text-slate-950" />
              <span>UPGRADE TO PRO</span>
            </button>
          )}

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer relative"
            id="history-toggle-btn"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {historyCount}
              </span>
            )}
          </button>

          {/* Reset / New Chart */}
          <button
            onClick={onReset}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Reset terminal"
            id="reset-terminal-btn"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>New Analysis</span>
          </button>

          {/* Discreet Owner Login Button (When not logged in as Owner) */}
          {!isOwner && (
            <button
              type="button"
              onClick={onOpenOwnerModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/40 text-xs font-mono text-slate-400 hover:text-purple-300 transition-all cursor-pointer"
              title="Owner / Admin Login"
              id="header-owner-login-btn"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400/80" />
              <span>Owner Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

