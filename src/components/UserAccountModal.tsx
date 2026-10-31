import React, { useState, useEffect } from 'react';
import {
  User,
  X,
  Copy,
  Check,
  Crown,
  LogOut,
  LogIn,
  UserPlus,
  KeyRound,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AuthUser } from '../types';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser?: AuthUser | null;
  isOwner: boolean;
  isPaidPro: boolean;
  freeAnalysisCount: number;
  maxFreeAnalyses: number;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: (email: string, password: string, confirmPassword?: string) => Promise<boolean>;
  onLogout: () => Promise<void>;
  onOpenUpgradeModal: () => void;
  onActivateLicenseKey: (key: string) => Promise<boolean>;
  initialTab?: 'signin' | 'register' | 'forgot' | 'account' | 'pro';
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  authUser,
  isOwner,
  isPaidPro,
  freeAnalysisCount,
  maxFreeAnalyses,
  onLogin,
  onRegister,
  onLogout,
  onOpenUpgradeModal,
  onActivateLicenseKey,
  initialTab = 'signin',
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'forgot' | 'account' | 'pro'>(
    authUser ? 'account' : initialTab
  );

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Reset state
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Manual License Key activation state
  const [licenseInput, setLicenseInput] = useState('');
  const [isActivatingKey, setIsActivatingKey] = useState(false);

  // Key recovery state
  const [isRecoveringKey, setIsRecoveringKey] = useState(false);
  const [recoveredKey, setRecoveredKey] = useState<string | null>(null);

  // General feedback states
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (authUser) {
      setActiveTab('account');
    } else if (initialTab === 'register' || initialTab === 'forgot') {
      setActiveTab(initialTab);
    } else {
      setActiveTab('signin');
    }
    setStatusMessage(null);
  }, [authUser, initialTab, isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'id' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter both email and password.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const success = await onLogin(email.trim(), password);
      if (success) {
        setStatusMessage({ type: 'success', text: 'Logged in successfully!' });
        setEmail('');
        setPassword('');
        setActiveTab('account');
      } else {
        setStatusMessage({ type: 'error', text: 'Invalid email or password.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Login failed. Please retry.' });
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
      setStatusMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (password !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const success = await onRegister(email.trim(), password, confirmPassword);
      if (success) {
        setStatusMessage({ type: 'success', text: 'Account created successfully! Welcome to Falcon Analyze.' });
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#3B82F6', '#22C55E', '#F59E0B'],
          });
        } catch (_) {}
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setActiveTab('account');
      } else {
        setStatusMessage({ type: 'error', text: 'Registration failed. Email may already be in use.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Registration failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your registered email address.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Password reset request failed.');
      }

      setResetToken(data.resetToken || '');
      setResetStep('reset');
      setStatusMessage({
        type: 'success',
        text: 'Password reset code generated. Please set your new password below.',
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Could not find registered account.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      setStatusMessage({ type: 'error', text: 'Reset code is required.' });
      return;
    }
    if (newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken.trim(),
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Password reset failed.');
      }

      setStatusMessage({ type: 'success', text: 'Password reset successfully! Please log in now.' });
      setResetStep('request');
      setResetToken('');
      setNewPassword('');
      setConfirmNewPassword('');
      setActiveTab('signin');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Password reset failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = licenseInput.trim().toUpperCase();
    if (!cleanKey) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid license key.' });
      return;
    }

    setIsActivatingKey(true);
    setStatusMessage(null);
    try {
      const ok = await onActivateLicenseKey(cleanKey);
      if (ok) {
        setStatusMessage({ type: 'success', text: 'Pro License Key activated successfully! Pro unlocked.' });
        setLicenseInput('');
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#22C55E', '#3B82F6', '#F59E0B'],
          });
        } catch (_) {}
      } else {
        setStatusMessage({ type: 'error', text: 'Invalid or expired license key.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'License activation failed.' });
    } finally {
      setIsActivatingKey(false);
    }
  };

  const handleRecoverLicense = async () => {
    setIsRecoveringKey(true);
    setStatusMessage(null);
    try {
      const token = localStorage.getItem('falcon_user_auth_token_v1');
      const res = await fetch('/api/auth/recover-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'License recovery failed.');
      }

      setRecoveredKey(data.licenseKey);
      setStatusMessage({ type: 'success', text: 'License key recovered and verified!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'No active verified subscription found.' });
    } finally {
      setIsRecoveringKey(false);
    }
  };

  const activeLicenseKey =
    recoveredKey ||
    authUser?.licenseKey ||
    authUser?.subscription?.licenseKey ||
    localStorage.getItem('falcon_pro_license_key');

  const hasPro = Boolean(isOwner || isPaidPro || authUser?.isPro || authUser?.subscription?.status === 'ACTIVE');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      id="user-account-modal-backdrop"
    >
      <div
        className="bg-white border border-[#D8DFEA] rounded-2xl w-full max-w-md overflow-hidden shadow-card flex flex-col relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        id="user-account-modal-content"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#D8DFEA] bg-[#E9EDF5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#D8DFEA] flex items-center justify-center text-[#245BDB]">
              {authUser ? <User className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-[#182338] flex items-center gap-2">
                {authUser ? 'MY ACCOUNT & PRO' : 'ACCOUNT ACCESS'}
              </h2>
              <p className="text-xs text-[#64748B] font-mono">
                {authUser ? authUser.email : 'Create an account or log in'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#182338] p-1.5 rounded-lg bg-white border border-[#D8DFEA] transition-colors cursor-pointer"
            id="user-account-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#D8DFEA] bg-[#F2F4F8] font-mono text-xs">
          {authUser ? (
            <>
              <button
                type="button"
                onClick={() => { setActiveTab('account'); setStatusMessage(null); }}
                className={`flex-1 py-2.5 font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'account'
                    ? 'border-[#245BDB] text-[#245BDB] bg-[#E8F0FF]'
                    : 'border-transparent text-[#64748B] hover:text-[#182338]'
                }`}
                id="tab-my-account"
              >
                <User className="w-3.5 h-3.5" />
                <span>My Account</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('pro'); setStatusMessage(null); }}
                className={`flex-1 py-2.5 font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'pro'
                    ? 'border-[#245BDB] text-[#245BDB] bg-[#E8F0FF]'
                    : 'border-transparent text-[#64748B] hover:text-[#182338]'
                }`}
                id="tab-my-pro"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>My Pro</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setActiveTab('signin'); setStatusMessage(null); }}
                className={`flex-1 py-2.5 font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'signin'
                    ? 'border-[#245BDB] text-[#245BDB] bg-[#E8F0FF]'
                    : 'border-transparent text-[#64748B] hover:text-[#182338]'
                }`}
                id="tab-user-signin"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setStatusMessage(null); }}
                className={`flex-1 py-2.5 font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'register'
                    ? 'border-[#245BDB] text-[#245BDB] bg-[#E8F0FF]'
                    : 'border-transparent text-[#64748B] hover:text-[#182338]'
                }`}
                id="tab-user-register"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('forgot'); setStatusMessage(null); }}
                className={`flex-1 py-2.5 font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'forgot'
                    ? 'border-[#245BDB] text-[#245BDB] bg-[#E8F0FF]'
                    : 'border-transparent text-[#64748B] hover:text-[#182338]'
                }`}
                id="tab-user-forgot"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Forgot?</span>
              </button>
            </>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]'
                  : 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="flex-1">{statusMessage.text}</span>
            </div>
          )}

          {/* TAB: MY ACCOUNT (Logged In) */}
          {authUser && activeTab === 'account' && (
            <div className="space-y-4 font-mono">
              <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#D8DFEA]">
                  <span className="text-[#64748B]">Account Email:</span>
                  <span className="text-[#182338] font-bold">{authUser.email}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#D8DFEA]">
                  <span className="text-[#64748B]">Account Status:</span>
                  <span className="text-[#22C55E] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Active & Verified
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Internal User ID:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(authUser.id, 'id')}
                      className="text-[11px] text-[#245BDB] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                    </button>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-[#D8DFEA] text-[#245BDB] font-bold select-all break-all">
                    {authUser.id}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#64748B]">Member Since:</span>
                  <span className="text-[#182338]">
                    {new Date(authUser.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Log Out Button */}
              <button
                type="button"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await onLogout();
                    onClose();
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                id="user-logout-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out of Account</span>
              </button>
            </div>
          )}

          {/* TAB: MY PRO (Logged In) */}
          {authUser && activeTab === 'pro' && (
            <div className="space-y-4 font-mono text-xs">
              {hasPro ? (
                /* PRO ACTIVE VIEW */
                <div className="space-y-3">
                  <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#22C55E] flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-400" />
                        PRO SUBSCRIPTION ACTIVE
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] text-[10px] font-bold border border-[#22C55E]/30">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-[11px] text-[#182338] leading-relaxed">
                      You have full institutional access: 3-chart analysis, multi-timeframe confluent trend, and S1/R1 key level models.
                    </p>
                  </div>

                  {/* License Key Display & Copy */}
                  {activeLicenseKey && (
                    <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748B] font-bold">Your Pro License Key:</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeLicenseKey, 'key')}
                          className="text-[11px] text-[#3B82F6] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                        </button>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-[#D8DFEA] text-[#182338] font-bold select-all tracking-wider text-center">
                        {activeLicenseKey}
                      </div>
                      <p className="text-[10px] text-[#64748B]">
                        This key is securely bound to your verified user account.
                      </p>
                    </div>
                  )}

                  {/* Reissue / Recover License Key */}
                  <button
                    type="button"
                    onClick={handleRecoverLicense}
                    disabled={isRecoveringKey}
                    className="w-full py-2.5 px-4 bg-white hover:bg-[#E9EDF5] text-[#245BDB] border border-[#D8DFEA] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    id="reissue-license-btn"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRecoveringKey ? 'animate-spin' : ''}`} />
                    <span>{isRecoveringKey ? 'Reissuing Key...' : 'Reissue / Recover License Key'}</span>
                  </button>
                </div>
              ) : (
                /* FREE TIER VIEW */
                <div className="space-y-4">
                  <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] font-bold uppercase">Current Tier:</span>
                      <span className="px-2 py-0.5 rounded bg-white text-[#182338] border border-[#D8DFEA] text-[10px] font-bold">
                        FREE PLAN
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[#64748B]">Available Free Charts:</span>
                      <strong className="text-[#16A36A] font-bold">
                        {Math.max(0, maxFreeAnalyses - freeAnalysisCount)} / {maxFreeAnalyses} Available
                      </strong>
                    </div>
                    <p className="text-[#64748B] text-[11px]">
                      {freeAnalysisCount} of {maxFreeAnalyses} free chart analyses used for this account.
                    </p>
                  </div>

                  {/* Upgrade Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUpgradeModal();
                    }}
                    className="w-full py-3 px-4 bg-[#245BDB] hover:bg-[#1948B8] text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                    id="my-pro-upgrade-btn"
                  >
                    <Crown className="w-4 h-4 text-amber-300" />
                    <span>Upgrade to Pro (from $15 / mo)</span>
                  </button>

                  {/* License Key Activation input */}
                  <form onSubmit={handleActivateLicenseSubmit} className="pt-2 border-t border-[#D8DFEA] space-y-2">
                    <label className="block text-[11px] text-[#64748B]">
                      Have a Pro License Key? Enter it to activate:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={licenseInput}
                        onChange={(e) => setLicenseInput(e.target.value.toUpperCase())}
                        placeholder="FALCON-PRO-XXXX-XXXX"
                        className="flex-1 px-3 py-2 bg-white border border-[#D8DFEA] rounded-xl text-xs text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#245BDB]"
                      />
                      <button
                        type="submit"
                        disabled={isActivatingKey}
                        className="px-4 py-2 bg-[#245BDB] hover:bg-[#1948B8] text-white rounded-xl font-bold cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        {isActivatingKey ? 'Activating...' : 'Activate'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB: LOGIN (Logged Out) */}
          {!authUser && activeTab === 'signin' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[#182338] mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2.5 bg-white border border-[#D8DFEA] rounded-xl text-xs text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#245BDB]"
                  id="login-email-input"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#182338] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#64748B]" />
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('forgot'); setStatusMessage(null); }}
                    className="text-[11px] text-[#245BDB] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2.5 bg-white border border-[#D8DFEA] rounded-xl text-xs text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#245BDB]"
                  id="login-password-input"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold bg-[#245BDB] hover:bg-[#1948B8] text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                id="submit-user-login-btn"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Log In</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-[11px] text-[#64748B]">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setActiveTab('register'); setStatusMessage(null); }}
                  className="text-[#245BDB] font-bold hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* TAB: REGISTER (Logged Out) */}
          {!authUser && activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[#182338] mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2.5 bg-white border border-[#D8DFEA] rounded-xl text-xs text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#245BDB]"
                  id="register-email-input"
                />
              </div>

              <div>
                <label className="block text-[#182338] mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#64748B]" />
                  Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2.5 bg-white border border-[#D8DFEA] rounded-xl text-xs text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#245BDB]"
                  id="register-password-input"
                />
              </div>

              <div>
                <label className="block text-[#182338] mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#64748B]" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2.5 bg-white border border-[#D8DFEA] rounded-xl text-xs text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#245BDB]"
                  id="register-confirm-password-input"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold bg-[#245BDB] hover:bg-[#1948B8] text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                id="submit-user-register-btn"
              >
                {isLoading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-[11px] text-[#64748B]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setActiveTab('signin'); setStatusMessage(null); }}
                  className="text-[#245BDB] font-bold hover:underline cursor-pointer"
                >
                  Log In
                </button>
              </div>
            </form>
          )}

          {/* TAB: FORGOT PASSWORD (Logged Out) */}
          {!authUser && activeTab === 'forgot' && (
            <div className="space-y-4 font-mono text-xs">
              {resetStep === 'request' ? (
                <form onSubmit={handleForgotPasswordRequest} className="space-y-3">
                  <p className="text-[11px] text-[#182338] leading-relaxed">
                    Enter your account email address. We will generate a secure expiring reset code for you.
                  </p>

                  <div>
                    <label className="block text-[#182338] mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                      Account Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2.5 bg-white border border-[#D8DFEA] rounded-xl text-xs text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#245BDB]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl font-bold bg-[#245BDB] hover:bg-[#1948B8] text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {isLoading ? <span>Generating Code...</span> : <span>Send Reset Code</span>}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('signin')}
                      className="text-[11px] text-[#64748B] hover:text-[#182338]"
                    >
                      &larr; Back to Login
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[#182338] mb-1">Reset Code / Token</label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste reset token here"
                      className="w-full px-3 py-2 bg-white border border-[#D8DFEA] rounded-xl text-xs text-[#182338] font-mono select-all focus:outline-none focus:border-[#245BDB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#182338] mb-1">New Password (min 6 chars)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-white border border-[#D8DFEA] rounded-xl text-xs text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#245BDB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#182338] mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-white border border-[#D8DFEA] rounded-xl text-xs text-[#182338] placeholder-[#94A3B8] focus:outline-none focus:border-[#245BDB]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl font-bold bg-[#245BDB] hover:bg-[#1948B8] text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isLoading ? <span>Updating Password...</span> : <span>Update Password</span>}
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
