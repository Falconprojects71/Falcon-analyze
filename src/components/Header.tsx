import React, { useState, useRef, useEffect } from 'react';
import {
  RefreshCw,
  BarChart2,
  Crown,
  Lock,
  User,
  LogIn,
  UserPlus,
  LogOut,
  Shield,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  LayoutDashboard,
  LineChart,
} from 'lucide-react';
import { AuthUser } from '../types';

interface HeaderProps {
  onReset: () => void;
  isAnalyzing: boolean;
  isProUser: boolean;
  authUser?: AuthUser | null;
  isOwner?: boolean;
  onOpenOwnerPortal?: () => void;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onOpenUserAccountModal?: () => void;
  onOpenUpgradeModal: () => void;
  onLogout?: () => void;
  freeAnalysisCount?: number;
  maxFreeAnalyses?: number;
  freeLimitReached?: boolean;
  currentView?: 'landing' | 'terminal';
  onSelectView?: (view: 'landing' | 'terminal') => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  isAnalyzing,
  isProUser,
  authUser,
  isOwner = false,
  onOpenOwnerPortal,
  onOpenLogin,
  onOpenRegister,
  onOpenUserAccountModal,
  onOpenUpgradeModal,
  onLogout,
  freeAnalysisCount = 0,
  maxFreeAnalyses = 3,
  freeLimitReached = false,
  currentView = 'landing',
  onSelectView,
  isDarkMode = false,
  onToggleTheme,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#D8DFEA] dark:border-[#243046] bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md px-4 sm:px-6 py-2.5 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Plan Status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectView?.(authUser ? 'terminal' : 'landing')}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-xl border flex items-center justify-center transition-all shadow-xs bg-[#E8F0FF] dark:bg-[#245BDB]/20 border-[#D8DFEA] dark:border-[#243046] text-[#245BDB] dark:text-[#3B82F6] group-hover:border-[#245BDB]/60">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold tracking-tight text-[#182338] dark:text-[#F1F5F9] flex items-center gap-1.5">
                  FALCON <span className="text-[#245BDB] dark:text-[#3B82F6]">ANALYZE</span>
                </h1>
                {isProUser ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <Crown className="w-3 h-3 text-amber-500" />
                    PRO
                  </span>
                ) : freeLimitReached ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <Lock className="w-2.5 h-2.5" />
                    FREE ({freeAnalysisCount}/{maxFreeAnalyses} USED)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#E8F0FF] dark:bg-[#245BDB]/20 text-[#245BDB] dark:text-[#3B82F6] border border-[#245BDB]/30">
                    {Math.max(0, maxFreeAnalyses - freeAnalysisCount)} FREE LEFT
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono hidden sm:flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#16A36A]" />
                Gemini Vision Technical Analysis Engine
              </p>
            </div>
          </button>
        </div>

        {/* Center / Navigation Switcher (Desktop) */}
        {(authUser || isOwner) && (
          <div className="hidden lg:flex items-center gap-1 bg-[#F2F4F8] dark:bg-[#0B0F19] p-1 rounded-xl border border-[#D8DFEA] dark:border-[#243046] text-xs font-mono">
            <button
              type="button"
              onClick={() => onSelectView?.('terminal')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                currentView === 'terminal'
                  ? 'bg-white dark:bg-[#1E283D] text-[#245BDB] dark:text-[#3B82F6] border border-[#D8DFEA] dark:border-[#243046] shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#182338] dark:hover:text-[#F1F5F9]'
              }`}
            >
              Analysis Terminal
            </button>
            <button
              type="button"
              onClick={() => onSelectView?.('landing')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                currentView === 'landing'
                  ? 'bg-white dark:bg-[#1E283D] text-[#245BDB] dark:text-[#3B82F6] border border-[#D8DFEA] dark:border-[#243046] shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#182338] dark:hover:text-[#F1F5F9]'
              }`}
            >
              Overview
            </button>
          </div>
        )}

        {/* Right Area: Unified Settings / Menu Dropdown */}
        <div className="flex items-center gap-2" ref={menuRef}>
          {/* Quick Upgrade Callout (if not pro) */}
          {!isProUser && (
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#245BDB] hover:bg-[#1948B8] text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              id="header-quick-upgrade-btn"
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>UPGRADE TO PRO</span>
            </button>
          )}

          {/* Quick Reset Callout in Terminal */}
          <button
            type="button"
            onClick={onReset}
            disabled={isAnalyzing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E283D] hover:bg-[#E9EDF5] dark:hover:bg-[#25324E] border border-[#D8DFEA] dark:border-[#243046] text-xs font-medium text-[#182338] dark:text-[#F1F5F9] transition-all cursor-pointer shadow-xs disabled:opacity-40"
            title="Reset Terminal & New Chart"
            id="header-quick-reset-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8] ${isAnalyzing ? 'animate-spin text-[#245BDB]' : ''}`} />
            <span>New Chart</span>
          </button>

          {/* Master Settings / Menu Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                isMenuOpen
                  ? 'bg-[#E8F0FF] dark:bg-[#245BDB]/20 border-[#245BDB] text-[#245BDB] dark:text-[#3B82F6]'
                  : 'bg-white dark:bg-[#1E283D] hover:bg-[#E9EDF5] dark:hover:bg-[#25324E] border-[#D8DFEA] dark:border-[#243046] text-[#182338] dark:text-[#F1F5F9]'
              }`}
              title="Falcon Settings & Menu"
              id="header-settings-menu-trigger"
              aria-expanded={isMenuOpen}
            >
              {authUser ? (
                <div className="w-5 h-5 rounded-full bg-[#245BDB] text-white flex items-center justify-center text-[10px] font-bold">
                  {authUser.email?.[0]?.toUpperCase() || <User className="w-3 h-3" />}
                </div>
              ) : (
                <div className="w-5 h-5 rounded-lg bg-[#E8F0FF] dark:bg-[#245BDB]/30 text-[#245BDB] dark:text-[#3B82F6] flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5" />
                </div>
              )}

              <span className="text-xs font-mono font-semibold max-w-[120px] truncate hidden sm:inline">
                {authUser ? authUser.email?.split('@')[0] : 'Settings / Menu'}
              </span>

              <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8] transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-[#245BDB]' : ''}`} />
            </button>

            {/* Dropdown Menu Modal */}
            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-[#D8DFEA] dark:border-[#243046] bg-white dark:bg-[#111827] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                style={{ backdropFilter: 'blur(12px)' }}
              >
                {/* 1. Session Status Banner */}
                <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#161F30] border border-[#D8DFEA] dark:border-[#243046] mb-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                      Account Session
                    </span>
                    {isOwner ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        <Shield className="w-2.5 h-2.5" /> OWNER
                      </span>
                    ) : isProUser ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <Crown className="w-2.5 h-2.5" /> PRO ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#E8F0FF] dark:bg-[#245BDB]/20 text-[#245BDB] dark:text-[#3B82F6] border border-[#245BDB]/30">
                        FREE PLAN
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-mono font-bold text-[#182338] dark:text-[#F1F5F9] truncate">
                    {authUser ? authUser.email : 'Guest / Visitor Mode'}
                  </p>

                  {!isProUser && (
                    <div className="mt-2 pt-2 border-t border-[#D8DFEA]/60 dark:border-[#243046]/60 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#64748B] dark:text-[#94A3B8]">Lifetime Limit:</span>
                      <span className={`font-bold ${freeLimitReached ? 'text-amber-600 dark:text-amber-400' : 'text-[#245BDB] dark:text-[#3B82F6]'}`}>
                        {freeAnalysisCount} / {maxFreeAnalyses} Used {freeLimitReached ? '(Locked)' : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Dark Mode / Light Mode Toggle */}
                <div className="mb-3 px-1">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#F2F4F8] dark:bg-[#0B0F19] border border-[#D8DFEA] dark:border-[#243046]">
                    <div className="flex items-center gap-2">
                      {isDarkMode ? (
                        <Moon className="w-4 h-4 text-[#3B82F6]" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-xs font-mono font-semibold text-[#182338] dark:text-[#F1F5F9]">
                        Theme: {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={onToggleTheme}
                      className="flex items-center p-1 rounded-lg bg-white dark:bg-[#1E283D] border border-[#D8DFEA] dark:border-[#243046] shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95"
                      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                      id="theme-toggle-dropdown-btn"
                    >
                      <div className={`p-1 rounded-md transition-all ${!isDarkMode ? 'bg-amber-100 text-amber-700 shadow-xs' : 'text-[#64748B]'}`}>
                        <Sun className="w-3.5 h-3.5" />
                      </div>
                      <div className={`p-1 rounded-md transition-all ${isDarkMode ? 'bg-[#245BDB] text-white shadow-xs' : 'text-[#64748B]'}`}>
                        <Moon className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. Navigation & Actions List */}
                <div className="space-y-1 mb-3">
                  {/* Analysis Terminal View */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSelectView?.('terminal');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      currentView === 'terminal'
                        ? 'bg-[#E8F0FF] dark:bg-[#245BDB]/20 text-[#245BDB] dark:text-[#3B82F6] font-bold'
                        : 'text-[#182338] dark:text-[#F1F5F9] hover:bg-[#F2F4F8] dark:hover:bg-[#1E283D]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LineChart className="w-4 h-4 text-[#245BDB] dark:text-[#3B82F6]" />
                      <span>Analysis Terminal</span>
                    </div>
                    {currentView === 'terminal' && <span className="text-[10px] bg-[#245BDB] text-white px-1.5 py-0.2 rounded font-bold">Active</span>}
                  </button>

                  {/* Landing Overview */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSelectView?.('landing');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      currentView === 'landing'
                        ? 'bg-[#E8F0FF] dark:bg-[#245BDB]/20 text-[#245BDB] dark:text-[#3B82F6] font-bold'
                        : 'text-[#182338] dark:text-[#F1F5F9] hover:bg-[#F2F4F8] dark:hover:bg-[#1E283D]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" />
                      <span>Overview & Features</span>
                    </div>
                    {currentView === 'landing' && <span className="text-[10px] bg-[#245BDB] text-white px-1.5 py-0.2 rounded font-bold">Active</span>}
                  </button>

                  {/* New Analysis Reset */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onReset();
                    }}
                    disabled={isAnalyzing}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#182338] dark:text-[#F1F5F9] hover:bg-[#F2F4F8] dark:hover:bg-[#1E283D] transition-all cursor-pointer disabled:opacity-40"
                  >
                    <RefreshCw className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" />
                    <span>Reset / New Chart</span>
                  </button>

                  {/* Pro Upgrade Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenUpgradeModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/80 dark:border-amber-800/60 font-bold transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>{isProUser ? 'Pro Subscription Details' : 'Upgrade to PRO'}</span>
                    </div>
                    {!isProUser && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded">PKR 3,999</span>}
                  </button>

                  {/* Owner Admin Portal (If authorized) */}
                  {isOwner && onOpenOwnerPortal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenOwnerPortal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 font-bold transition-all cursor-pointer"
                      id="menu-owner-portal-btn"
                    >
                      <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Owner & Admin Portal</span>
                    </button>
                  )}

                  {/* User Account Settings */}
                  {authUser && onOpenUserAccountModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenUserAccountModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#182338] dark:text-[#F1F5F9] hover:bg-[#F2F4F8] dark:hover:bg-[#1E283D] transition-all cursor-pointer"
                      id="menu-my-account-btn"
                    >
                      <User className="w-4 h-4 text-[#245BDB] dark:text-[#3B82F6]" />
                      <span>My Account & Key</span>
                    </button>
                  )}
                </div>

                {/* 4. Authentication Action Area (Prominent RED Buttons as explicitly requested) */}
                <div className="pt-2 border-t border-[#D8DFEA] dark:border-[#243046]">
                  {authUser ? (
                    /* RED LOGOUT BUTTON FOR ACTIVE SESSION */
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLogout?.();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                      id="menu-logout-btn"
                    >
                      <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span>Logout from Falcon</span>
                    </button>
                  ) : (
                    /* RED CREATE ACCOUNT & LOGIN BUTTONS FOR GUEST */
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenRegister?.();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                        id="menu-create-account-btn"
                      >
                        <UserPlus className="w-4 h-4 text-white" />
                        <span>Create Free Account</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenLogin?.();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 font-bold text-xs transition-all cursor-pointer"
                        id="menu-login-btn"
                      >
                        <LogIn className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span>Login to Falcon</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
