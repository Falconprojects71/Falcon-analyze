import React, { useState, useEffect } from 'react';
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
import { AuthUser } from '../types';
import {
  getStoredUserIdentifier,
  getFormattedUserId,
  getAuthToken,
} from '../utils/deviceFingerprint';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProUser: boolean;
  userIdentifier?: string;
  authUser?: AuthUser | null;
  onOpenAccountModal?: () => void;
  onActivatePro: (licenseKey?: string) => boolean | Promise<boolean>;
  onDeactivatePro: () => void;
  freeLimitReached?: boolean;
  initialLicenseKey?: string;
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

const PRICING_CONFIG = {
  USD: {
    monthly: {
      amount: '$15',
      period: '/ month',
      subtext: 'Billed monthly • Cancel anytime',
      buttonLabel: '$15 / Month',
    },
    annual: {
      amount: '$150',
      period: '/ year',
      effectiveRate: '$12.50 / mo • Billed annually',
      savingsBadge: 'SAVE 17%',
      buttonLabel: '$150 / Year',
    },
  },
  PKR: {
    monthly: {
      amount: '₨4,165',
      period: '/ month',
      subtext: 'Billed monthly • Cancel anytime',
      buttonLabel: '₨4,165 / Month',
    },
    annual: {
      amount: '₨41,650',
      period: '/ year',
      effectiveRate: '₨3,471 / mo • Billed annually',
      savingsBadge: 'SAVE 17%',
      buttonLabel: '₨41,650 / Year',
    },
  },
} as const;

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  isOpen,
  onClose,
  isProUser,
  userIdentifier,
  authUser,
  onOpenAccountModal,
  onActivatePro,
  onDeactivatePro,
  freeLimitReached = false,
  initialLicenseKey,
}) => {
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD');
  const [activeTier, setActiveTier] = useState<'monthly' | 'annual'>('annual');
  const [licenseInput, setLicenseInput] = useState(initialLicenseKey || '');
  const [licenseStatus, setLicenseStatus] = useState<{
    loading: boolean;
    error: string | null;
    success: boolean;
  }>({
    loading: false,
    error: null,
    success: false,
  });
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (initialLicenseKey) {
      setLicenseInput(initialLicenseKey);
    }
  }, [initialLicenseKey, isOpen]);

  if (!isOpen) return null;

  const currentPricing = PRICING_CONFIG[currency];

  const handleCheckoutClick = async () => {
    setIsCheckingOut(true);
    setCheckoutError(null);

    if (!authUser) {
      setCheckoutError('Please create an account or log in before subscribing so your Pro subscription is securely linked to your verified account.');
      setIsCheckingOut(false);
      return;
    }

    try {
      const selectedPlan = activeTier === 'annual' ? 'yearly' : 'monthly';
      const token = getAuthToken() || localStorage.getItem('falcon_user_auth_token_v1');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-auth-token'] = token;
      }

      const response = await fetch('/api/safepay/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan: selectedPlan,
          currency,
          userIdentifier: authUser.email,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (_jsonErr) {
        throw new Error(response.statusText ? `Checkout service error (HTTP ${response.status}): ${response.statusText}` : 'Unexpected response received from checkout service. Please retry.');
      }

      if (!response.ok || !data?.success || !data?.checkoutUrl) {
        throw new Error(data?.error || `Failed to initialize Safepay checkout session (HTTP ${response.status}).`);
      }

      try {
        if (window.top && window.top !== window) {
          window.top.location.href = data.checkoutUrl;
        } else {
          window.location.href = data.checkoutUrl;
        }
      } catch (_) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      console.error('[SAFEPAY] Checkout error:', err);
      const isNetworkError =
        err?.name === 'TypeError' ||
        String(err?.message || '').toLowerCase().includes('networkerror') ||
        String(err?.message || '').toLowerCase().includes('failed to fetch');
      const displayMessage = isNetworkError
        ? 'Network error connecting to Safepay checkout. Please check your network connection and retry.'
        : (err?.message || 'Payment checkout initialization failed. Please retry.');
      setCheckoutError(displayMessage);
      setIsCheckingOut(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      id="pro-upgrade-modal-backdrop"
    >
      <div
        className="bg-white border border-[#D8DFEA] rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-card flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
        id="pro-upgrade-modal-content"
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-[#D8DFEA] flex items-start justify-between gap-4 bg-[#E9EDF5]">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white border border-[#D8DFEA] flex items-center justify-center text-[#245BDB] shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono tracking-tight text-[#182338]">
                  FALCON ANALYZE PRO
                </h2>
                {isProUser ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                    ACTIVE MEMBER
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    PREMIUM TIER
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-1">
                Upload and analyze up to 3 charts together for a more complete market analysis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#182338] p-1.5 rounded-lg bg-white border border-[#D8DFEA] transition-colors cursor-pointer"
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
              className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3"
              id="pro-modal-free-limit-banner"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F2F4F8] border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-2">
                  <span>Free Screenshot Limit Reached (3/3 Used)</span>
                  <span className="text-[9px] bg-[#EF4444]/15 text-[#EF4444] px-1.5 py-0.2 rounded border border-[#EF4444]/30">
                    4th SCREENSHOT LOCKED
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[#182338] mt-1 leading-relaxed">
                  Free accounts allow a maximum of 3 screenshot analyses. You have used all 3 free screenshots.
                  Screenshot 4 is locked. Upgrade to PRO or enter your Pro license key below to continue analyzing charts.
                </p>
              </div>
            </div>
          )}

          {/* Active Pro Member Banner if already active */}
          {isProUser && (
            <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
                <div>
                  <div className="text-xs font-mono font-bold text-[#22C55E]">
                    Pro Access is Active & Unlocked
                  </div>
                  <p className="text-[11px] font-mono text-[#182338]">
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
                className="text-[11px] font-mono px-3 py-1.5 rounded bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 transition-all cursor-pointer"
              >
                Deactivate Pro
              </button>
            </div>
          )}

          {/* Pricing Tiers Selection (Monthly: $15 / ₨4,165 — Annual: $150 / ₨41,650) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-mono text-[#64748B] uppercase tracking-wider font-semibold">
                Select Subscription Plan:
              </label>

              {/* Currency Selector (USD / PKR) */}
              <div className="flex items-center bg-[#E9EDF5] p-0.5 rounded-lg border border-[#D8DFEA]">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                    currency === 'USD'
                      ? 'bg-[#245BDB] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#182338]'
                  }`}
                  id="currency-usd-btn"
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('PKR')}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                    currency === 'PKR'
                      ? 'bg-[#245BDB] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#182338]'
                  }`}
                  id="currency-pkr-btn"
                >
                  PKR (₨)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Monthly Plan */}
              <div
                onClick={() => setActiveTier('monthly')}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  activeTier === 'monthly'
                    ? 'bg-[#E8F0FF] border-[#245BDB] ring-1 ring-[#245BDB]/30'
                    : 'bg-[#F2F4F8] border-[#D8DFEA] hover:border-[#245BDB]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-[#182338]">Monthly</div>
                  {activeTier === 'monthly' && (
                    <span className="w-2 h-2 rounded-full bg-[#245BDB]" />
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-[#182338]">
                    {currentPricing.monthly.amount}
                  </span>
                  <span className="text-xs font-mono text-[#64748B]">
                    {currentPricing.monthly.period}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#64748B] mt-1">
                  {currentPricing.monthly.subtext}
                </div>
              </div>

              {/* Annual Plan (Best Value) */}
              <div
                onClick={() => setActiveTier('annual')}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  activeTier === 'annual'
                    ? 'bg-[#E8F0FF] border-[#245BDB] ring-1 ring-[#245BDB]/30'
                    : 'bg-[#F2F4F8] border-[#D8DFEA] hover:border-[#245BDB]/50'
                }`}
              >
                <div className="absolute -top-2.5 right-3 bg-[#245BDB] text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {currentPricing.annual.savingsBadge}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-[#245BDB]">Annual</div>
                  {activeTier === 'annual' && (
                    <span className="w-2 h-2 rounded-full bg-[#245BDB]" />
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-[#182338]">
                    {currentPricing.annual.amount}
                  </span>
                  <span className="text-xs font-mono text-[#64748B]">
                    {currentPricing.annual.period}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#22C55E] mt-1">
                  {currentPricing.annual.effectiveRate}
                </div>
              </div>
            </div>
          </div>

          {/* Pro Benefits Checklist (Exact required list) */}
          <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl p-4">
            <h3 className="text-xs font-mono font-bold text-[#245BDB] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Pro Benefits:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRO_BENEFITS.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs font-mono text-[#182338]">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
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
              disabled={isCheckingOut}
              className="w-full py-3.5 px-4 rounded-xl font-mono text-sm font-bold uppercase tracking-wider bg-[#245BDB] hover:bg-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed text-white active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
              id="pro-subscribe-checkout-btn"
            >
              {isCheckingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to Safepay...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>
                    Proceed to Checkout ({activeTier === 'monthly' ? currentPricing.monthly.buttonLabel : currentPricing.annual.buttonLabel})
                  </span>
                </>
              )}
            </button>

            {/* Checkout Error Display */}
            {checkoutError && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-3.5 text-xs font-mono text-[#EF4444] flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="font-bold">Checkout Notice:</div>
                  <p className="text-[11px] leading-relaxed text-[#182338]">{checkoutError}</p>
                  {!authUser && onOpenAccountModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAccountModal();
                      }}
                      className="mt-1 px-3 py-1.5 bg-[#245BDB] hover:bg-[#2563EB] text-white rounded-lg text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-1.5"
                    >
                      <span>Create Account / Log In</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Verified License Key / Access Code Activation */}
          <div className="pt-4 border-t border-[#D8DFEA]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-[#182338] font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#3B82F6]" />
                Activate with License Key / Access Token:
              </label>
              <span className="text-[10px] font-mono text-[#64748B]">Verified Activation</span>
            </div>

            <form onSubmit={handleVerifyLicense} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={licenseInput}
                  onChange={(e) => {
                    setLicenseInput(e.target.value);
                    setLicenseStatus({ loading: false, error: null, success: false });
                  }}
                  placeholder="e.g. FALCON-PRO-2026 or VIP-TRADER"
                  className="flex-1 bg-[#F2F4F8] border border-[#D8DFEA] focus:border-[#3B82F6] rounded-xl px-3.5 py-2 text-xs font-mono text-[#182338] placeholder-[#94A3B8] outline-none uppercase"
                  id="pro-license-key-input"
                />
                <button
                  type="submit"
                  disabled={licenseStatus.loading}
                  className="px-4 py-2 rounded-xl bg-[#245BDB] hover:bg-[#2563EB] text-white font-mono font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-sm"
                  id="verify-license-btn"
                >
                  {licenseStatus.loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Activate</span>
                </button>
              </div>

              {licenseStatus.error && (
                <div className="text-[11px] font-mono text-[#EF4444] flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{licenseStatus.error}</span>
                </div>
              )}

              {licenseStatus.success && (
                <div className="text-[11px] font-mono text-[#22C55E] flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>License verified successfully! Falcon Pro is now activated.</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#E9EDF5] border-t border-[#D8DFEA] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-[#64748B]">
          <div className="flex items-center gap-3">
            <span>Encrypted Access &bull; Verified AI Vision Engine</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748B] hover:text-[#182338] cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
