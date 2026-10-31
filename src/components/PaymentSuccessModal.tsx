import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  Crown,
  X,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentStatusResponse } from '../types';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: string;
  onOpenUpgradeModalWithKey: (key: string) => void;
  onAutoActivatePro?: (key: string) => Promise<boolean | void> | boolean | void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  onClose,
  reference,
  onOpenUpgradeModalWithKey,
  onAutoActivatePro,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [paymentData, setPaymentData] = useState<PaymentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [pollCount, setPollCount] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !reference) return;

    let isMounted = true;
    let timer: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('falcon_user_auth_token_v1');
        const res = await fetch(`/api/safepay/payment-status?reference=${encodeURIComponent(reference)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.verified && data.licenseKey) {
          setPaymentData(data);
          setLoading(false);
          if (onAutoActivatePro) {
            onAutoActivatePro(data.licenseKey);
          }
          try {
            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#22C55E', '#3B82F6', '#F59E0B'],
            });
          } catch (_) {}
        } else if (data.cancelled) {
          setPaymentData(data);
          setLoading(false);
          setError('Payment was cancelled or failed on Safepay.');
        } else {
          // Still pending confirmation from Safepay webhook
          setPaymentData(data);
          if (pollCount < 15) {
            timer = setTimeout(() => {
              if (isMounted) setPollCount((c) => c + 1);
            }, 2500);
          } else {
            setLoading(false);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || 'Error checking payment status.');
        setLoading(false);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, reference, pollCount]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!paymentData?.licenseKey) return;
    navigator.clipboard.writeText(paymentData.licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleProceedToActivate = () => {
    if (paymentData?.licenseKey) {
      onOpenUpgradeModalWithKey(paymentData.licenseKey);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      id="payment-success-modal-backdrop"
    >
      <div
        className="bg-white border border-[#D8DFEA] rounded-2xl w-full max-w-lg overflow-hidden shadow-card flex flex-col relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        id="payment-success-modal-content"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#D8DFEA] bg-[#E9EDF5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/40 flex items-center justify-center text-[#22C55E]">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#245BDB]" />
              ) : paymentData?.verified ? (
                <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-[#182338]">
                {loading
                  ? 'VERIFYING SAFEPAY PAYMENT...'
                  : paymentData?.verified
                  ? 'PAYMENT SUCCESSFUL'
                  : 'PAYMENT STATUS'}
              </h2>
              <p className="text-xs text-[#64748B] font-mono">
                Reference: {reference.substring(0, 24)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#182338] p-1.5 rounded-lg bg-white border border-[#D8DFEA] transition-colors cursor-pointer"
            id="payment-modal-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-[#245BDB]" />
              <div className="space-y-1">
                <p className="text-sm font-mono font-bold text-[#182338]">
                  Awaiting Safepay Confirmation
                </p>
                <p className="text-xs font-mono text-[#64748B] max-w-sm">
                  We are securely validating your payment via server-side webhook signature. This usually takes just a few seconds.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertCircle className="w-4 h-4 text-[#DC4655] shrink-0" />
                <span>Verification Alert</span>
              </div>
              <p>{error}</p>
              <p className="text-[#64748B] text-[11px] pt-1">
                If your card was charged, your license key is safely recorded and you can retrieve it by logging into your account under <strong>My Pro / License Key</strong>.
              </p>
            </div>
          ) : paymentData?.verified && paymentData.licenseKey ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-mono space-y-1">
                <p className="text-[#16A36A] font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Safepay Payment Verified by Server
                </p>
                <p className="text-[#182338] text-[11px]">
                  Subscription: <strong className="text-emerald-950 font-bold capitalize">{paymentData.plan}</strong> ({paymentData.currency})
                </p>
              </div>

              {/* License Key Box */}
              <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl p-4 space-y-2 font-mono">
                <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
                  Your Falcon Analyze Pro License Key:
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-[#245BDB]/40 rounded-lg px-3.5 py-2.5 text-sm text-[#245BDB] font-bold tracking-wider select-all overflow-x-auto">
                    {paymentData.licenseKey}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-2.5 bg-[#245BDB] hover:bg-[#1948B8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                    id="copy-payment-license-key-btn"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Automatic Pro Activation Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 font-mono text-xs text-emerald-900 space-y-1.5">
                <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  PRO ACTIVATED AUTOMATICALLY
                </p>
                <p className="text-[11px] leading-relaxed text-[#182338]">
                  Your verified payment was received and Pro access (including Multi-Chart / 3-Screen Analysis) has been automatically unlocked for your account. Keep your license key above for your records.
                </p>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold font-mono bg-[#16A36A] hover:bg-[#128054] text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  id="start-pro-btn"
                >
                  <Crown className="w-4 h-4" />
                  <span>Start Multi-Chart Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] font-mono text-[#64748B] text-center pt-1">
                You can also recover this key anytime by logging into your account under <strong>My Pro / License Key</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[#F2F4F8] border border-[#D8DFEA] space-y-2">
                <p className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  Payment Verification Pending
                </p>
                <p className="text-[#182338] text-[11px]">
                  Safepay webhook confirmation has not arrived yet. If your payment went through, your subscription is safe and will be processed shortly.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white hover:bg-[#1E293B] text-[#182338] border border-[#D8DFEA] rounded-lg text-xs font-mono font-medium cursor-pointer"
                >
                  Close & Check Account Later
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
