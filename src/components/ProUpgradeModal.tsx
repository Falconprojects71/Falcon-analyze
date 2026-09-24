import React, { useState } from 'react';
import {
  Crown,
  Lock,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  CreditCard,
  KeyRound,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProUser: boolean;
  onActivatePro: (licenseKey?: string) => boolean | Promise<boolean>;
  onDeactivatePro: () => void;
  onOpenOwnerLogin?: () => void;
  freeLimitReached?: boolean;
}

export const PRO_BENEFITS = [
  'Analyze up to 3 screenshots together',
  'Multi-timeframe analysis',
  'Combined market trend',
  'Trading Style analysis',
  'Bias analysis',
  'Price Action',
  'Support & Resistance',
  'Entry',
  'Stop Loss',
  'TP1',
  'TP2',
  'Combined final result',
];

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  isOpen,
  onClose,
  isProUser,
  onActivate
  onDeactivatePro,
  onOpenOwnerLogin,
  freeLimitReached = false,
}) => {
  const [activeTier, setActiveTier] = useState<'monthly' | 'annual'>('annual');
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<{
    loading: boolean;
    error: string | null;
    success: boolean;
  }>({
    loading: false,
    error: null,
    success: false,
  });
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  if (!isOpen) return null;

 const handleCheckoutClick = async () => {
  setCheckoutNotice('Opening Safepay checkout...');

  try {
    const response = await fetch('/api/safepay/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan: activeTier === 'monthly' ? 'monthly' : 'yearly',
        userIdentifier: 'falcon-user',
        currency,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.checkoutUrl) {
      throw new Error(
        data.error || 'Unable to create Safepay checkout.'
      );
    }

    window.location.href = data.checkoutUrl;
  } catch (error: any) {
    setCheckoutNotice(
      error.message || 'Unable to open Safepay checkout.'
    );
  }
};

  const handleVerifyLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = licenseInput.trim();
    if (!key) {
      setLicenseStatus({ loading: false, error: 'Please enter a valid Pro license key or access code.', success: false });
      return;
    }

    setLicenseStatus({ loading: true, error: null, success: false });

    try {
      const success = await onActivatePro(key);
      if (success) {
        setLicenseStatus({ loading: false, error: null, success: true });
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.5 },
            colors: ['#F59E0B', '#00F0A0', '#38BDF8'],
          });
        } catch (_) {}
      } else {
        setLicenseStatus({
          loading: false,
          error: 'Invalid license key. Verified keys include FALCON-PRO-2026, VIP-TRADER, or valid customer tokens.',
          success: false,
        });
      }
    } catch (err: any) {
      setLicenseStatus({
        loading: false,
        error: err.message || 'Error verifying license key. Please check network and retry.',
        success: false,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      id="pro-upgrade-modal-backdrop"
    >
      <div
        className="bg-[#0D121F] border border-amber-500/40 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
        id="pro-upgrade-modal-content"
      >
        {/* Top Glow Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400" />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono tracking-tight text-white">
                  FALCON ANALYZE PRO
                </h2>
                {isProUser ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ACTIVE MEMBER
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    PREMIUM TIER
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Upload and analyze up to 3 charts together for a more complete market analysis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
            id="close-pro-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Free Screenshot Limit Reached Banner */}
          {freeLimitReached && !isProUser && (
            <div
              className="bg-gradient-to-r from-amber-950/70 to-rose-950/60 border border-amber-500/50 rounded-xl p-4 flex items-start gap-3 shadow-md"
              id="pro-modal-free-limit-banner"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-2">
                  <span>Free Screenshot Limit Reached (3/3 Used)</span>
                  <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">
                    4th SCREENSHOT LOCKED
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-300 mt-1 leading-relaxed">
                  Free accounts allow a maximum of 3 screenshot analyses. You have used all 3 free screenshots.
                  Screenshot 4 is locked. Upgrade to PRO or enter your Pro license key below to continue analyzing charts.
                </p>
              </div>
            </div>
          )}

          {/* Active Pro Member Banner if already active */}
          {isProUser && (
            <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-300">
                    Pro Access is Active & Unlocked
                  </div>
                  <p className="text-[11px] font-mono text-emerald-400/80">
                    You have full access to 3-chart multi-timeframe analysis.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onDeactivatePro();
                  onClose();
                }}
                className="text-[11px] font-mono px-3 py-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 transition-all cursor-pointer"
              >
                Deactivate Pro
              </button>
            </div>
          )}

          {/* Pricing Tiers Selection (Monthly $9.99 / Annual $100 — Lifetime removed) */}
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
              Select Subscription Plan:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Monthly Plan */}
              <div
                onClick={() => setActiveTier('monthly')}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  activeTier === 'monthly'
                    ? 'bg-slate-900/90 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-slate-300">Monthly</div>
                  {activeTier === 'monthly' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-white">
  {currency === 'USD' ? '$15' : 'PKR 4,165'}
</span>
                  <span className="text-xs font-mono text-slate-400">/ month</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1">Billed monthly &bull; Cancel anytime</div>
              </div>

              {/* Annual Plan (Best Value) */}
              <div
                onClick={() => setActiveTier('annual')}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  activeTier === 'annual'
                    ? 'bg-slate-900/90 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shadow-sm">
                  SAVE 16%
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-amber-300">Annual</div>
                  {activeTier === 'annual' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-white">$100</span>
                  <span className="text-xs font-mono text-slate-400">/ year</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-400 mt-1">$8.33 / mo &bull; Billed annually</div>
              </div>
            </div>
          </div>

          {/* Pro Benefits Checklist (Exact required list) */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
            <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Pro Benefits:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRO_BENEFITS.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs font-mono text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Gateway Checkout Section */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleCheckoutClick}
              className="w-full py-3.5 px-4 rounded-xl font-mono text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-[0.99] shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              id="pro-subscribe-checkout-btn"
            >
              <CreditCard className="w-4 h-4" />
              <span>
              Proceed to Checkout (
  {currency === 'USD'
    ? activeTier === 'monthly'
      ? '$15 / Month'
      : '$150 / Year'
    : activeTier === 'monthly'
      ? 'PKR 4,165 / Month'
      : 'PKR 41,650 / Year'}
              </span>
            </button>

            {/* Gateway Configuration Notice */}
            {checkoutNotice && (
              <div className="bg-amber-950/70 border border-amber-500/50 rounded-xl p-3.5 text-xs font-mono text-amber-200 flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-amber-300">Payment Gateway Notice:</div>
                  <p className="text-[11px] leading-relaxed text-amber-200/90">{checkoutNotice}</p>
                </div>
              </div>
            )}
          </div>

          {/* Verified License Key / Access Code Activation */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                Activate with License Key / Access Token:
              </label>
              <span className="text-[10px] font-mono text-slate-500">Verified Activation</span>
            </div>

            <form onSubmit={handleVerifyLicense} className="space-y-2">
              <div className="flex gap-2 mb-4">
  <button
    type="button"
    onClick={() => setCurrency('PKR')}
    className={`px-4 py-2 rounded-lg ${
      currency === 'PKR'
        ? 'bg-emerald-500 text-black'
        : 'bg-gray-800 text-white'
    }`}
  >
    PKR
  </button>

  <button
    type="button"
    onClick={() => setCurrency('USD')}
    className={`px-4 py-2 rounded-lg ${
      currency === 'USD'
        ? 'bg-emerald-500 text-black'
        : 'bg-gray-800 text-white'
    }`}
  >
    USD
  </button>
</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={licenseInput}
                  onChange={(e) => {
                    setLicenseInput(e.target.value);
                    setLicenseStatus({ loading: false, error: null, success: false });
                  }}
                  placeholder="e.g. FALCON-PRO-2026 or VIP-TRADER"
                  className="flex-1 bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none uppercase"
                  id="pro-license-key-input"
                />
                <button
                  type="submit"
                  disabled={licenseStatus.loading}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  id="verify-license-btn"
                >
                  {licenseStatus.loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Activate</span>
                </button>
              </div>

              {licenseStatus.error && (
                <div className="text-[11px] font-mono text-rose-400 flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{licenseStatus.error}</span>
                </div>
              )}

              {licenseStatus.success && (
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>License verified successfully! Falcon Pro is now activated.</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>Encrypted Access &bull; Verified AI Vision Engine</span>
            {onOpenOwnerLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOwnerLogin();
                }}
                className="text-slate-500 hover:text-purple-400 underline transition-colors cursor-pointer"
                id="pro-modal-owner-login-btn"
              >
                Owner / Admin Login
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
