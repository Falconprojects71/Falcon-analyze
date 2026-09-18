import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  Layers,
  ArrowRight,
  ClipboardCheck,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Shield,
  Crown,
  Lock,
  Compass,
  FileImage,
  Maximize2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import {
  ASSET_CATEGORIES,
  ASSET_INSTRUMENTS_BY_CATEGORY,
} from '../data/sampleCharts';
import { AssetCategoryName, AssetInstrument } from '../types';

export interface ChartImageItem {
  id: string;
  base64: string;
  mimeType: string;
  name?: string;
  timeframe?: string;
}

interface ChartUploaderProps {
  images: ChartImageItem[];
  setImages: React.Dispatch<React.SetStateAction<ChartImageItem[]>>;
  activeImageIndex: number;
  setActiveImageIndex: React.Dispatch<React.SetStateAction<number>>;
  plan: 'free' | 'pro';
  setPlan: (plan: 'free' | 'pro') => void;
  asset: string;
  setAsset: (asset: string) => void;
  timeframe: string;
  setTimeframe: (tf: string) => void;
  tradingStyle: string;
  setTradingStyle: (style: string) => void;
  bias: string;
  setBias: (b: string) => void;
  additionalNotes: string;
  setAdditionalNotes: (notes: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  isProUser: boolean;
  onOpenUpgradeModal: () => void;
  freeAnalysisCount?: number;
  maxFreeAnalyses?: number;
  freeLimitReached?: boolean;
}

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W', '1M'];

const PRO_DEFAULT_TIMEFRAMES = ['4H', '1H', '15m'];
const PRO_SLOT_LABELS = ['Higher Timeframe', 'Middle Timeframe', 'Lower Timeframe'];

const TRADING_STYLES = [
  { id: 'Scalping', label: 'SCALPING', timeframes: '1M • 5M • 15M' },
  { id: 'Intraday', label: 'INTRADAY', timeframes: '15M • 30M • 1H • 4H' },
  { id: 'Swing', label: 'SWING', timeframes: '4H • 1H • D1' },
  { id: 'Position', label: 'POSITION', timeframes: 'D1 • W1' },
];

const BIAS_OPTIONS = ['Auto', 'Buy', 'Sell'];

export const ChartUploader: React.FC<ChartUploaderProps> = ({
  images,
  setImages,
  activeImageIndex,
  setActiveImageIndex,
  plan,
  setPlan,
  asset,
  setAsset,
  timeframe,
  setTimeframe,
  tradingStyle,
  setTradingStyle,
  bias,
  setBias,
  additionalNotes,
  setAdditionalNotes,
  onAnalyze,
  isAnalyzing,
  isProUser,
  onOpenUpgradeModal,
  freeAnalysisCount = 0,
  maxFreeAnalyses = 3,
  freeLimitReached = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pasteToast, setPasteToast] = useState(false);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategoryName>('Crypto');
  const [slotTimeframes, setSlotTimeframes] = useState<string[]>(['4H', '1H', '15m']);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dedicated refs for the 3 Pro slots
  const proSlotRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const maxAllowedScreenshots = plan === 'free' ? 1 : 3;

  // Update ONLY a specific slot image's timeframe without replacing or removing the image
  const handleSlotTimeframeChange = (slotIdx: number, newTimeframe: string) => {
    setSlotTimeframes((prev) => {
      const next = [...prev];
      next[slotIdx] = newTimeframe;
      return next;
    });
    setImages((prev) => {
      if (!Array.isArray(prev)) return [];
      if (slotIdx < prev.length && prev[slotIdx]) {
        const updated = [...prev];
        updated[slotIdx] = {
          ...updated[slotIdx],
          timeframe: newTimeframe,
        };
        return updated;
      }
      return prev;
    });
  };

  const showLimitError = (message: string) => {
    setLimitNotice(message);
    setTimeout(() => {
      setLimitNotice((prev) => (prev === message ? null : prev));
    }, 4500);
  };

  // Switch plans cleanly with guaranteed safe array initialization
  const handlePlanChange = (newPlan: 'free' | 'pro') => {
    setPlan(newPlan);
    setLimitNotice(null);
    if (newPlan === 'free') {
      setImages((prev) => {
        const currentList = Array.isArray(prev)
          ? prev.filter((img) => Boolean(img && img.base64 && typeof img.base64 === 'string' && img.base64.trim().length > 0))
          : [];
        return currentList.slice(0, 1);
      });
      setActiveImageIndex(0);
    } else if (newPlan === 'pro') {
      setImages((prev) => {
        const currentList = Array.isArray(prev)
          ? prev.filter((img) => Boolean(img && img.base64 && typeof img.base64 === 'string' && img.base64.trim().length > 0))
          : [];
        const initialized = currentList.slice(0, 3).map((img, idx) => ({
          ...img,
          timeframe: img.timeframe || slotTimeframes[idx] || PRO_DEFAULT_TIMEFRAMES[idx] || '1H',
        }));
        return initialized;
      });
      setActiveImageIndex((prev) => (prev >= 3 ? 0 : prev));
    }
  };

  // Helper to process a single file into a specific slot in Pro mode
  const handleProSlotFile = (slotIndex: number, file: File) => {
    if (!isProUser) {
      onOpenUpgradeModal();
      return;
    }
    if (!file.type.startsWith('image/')) {
      showLimitError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImages((prev) => {
          const currentList = Array.isArray(prev)
            ? prev.filter((img) => Boolean(img && img.base64 && typeof img.base64 === 'string' && img.base64.trim().length > 0))
            : [];
          const existingTf = currentList[slotIndex]?.timeframe;
          const chosenTf = slotTimeframes[slotIndex] || PRO_DEFAULT_TIMEFRAMES[slotIndex] || '1H';
          const targetTimeframe = existingTf || chosenTf;
          const newItem: ChartImageItem = {
            id: `pro_slot_${slotIndex}_${Date.now()}`,
            base64: result,
            mimeType: file.type || 'image/png',
            name: file.name,
            timeframe: targetTimeframe,
          };
          const updated = [...currentList];
          if (slotIndex < updated.length) {
            updated[slotIndex] = newItem;
          } else {
            updated.push(newItem);
          }
          return updated.slice(0, 3);
        });
        setActiveImageIndex(slotIndex);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper to read and append files with strict limit enforcement
  const processFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));

    if (files.length === 0) {
      showLimitError('Please select valid image files (PNG, JPG, WEBP, or SVG).');
      return;
    }

    if (plan === 'free') {
      if (!isProUser && (freeLimitReached || freeAnalysisCount >= maxFreeAnalyses)) {
        onOpenUpgradeModal();
        showLimitError('Free limit reached: You have used all 3 free screenshots. Upgrade to PRO to continue.');
        return;
      }
      if (images.length >= 1 || files.length > 1) {
        showLimitError('Free plan allows 1 screenshot per analysis. Upgrade to Pro to analyze 3 charts together.');
        return;
      }
    } else {
      if (!isProUser) {
        onOpenUpgradeModal();
        return;
      }
      if (images.length + files.length > 3) {
        showLimitError('Pro plan allows up to 3 screenshots. You can upload up to 3 chart screenshots.');
        return;
      }
    }

    // Process allowable files
    const availableSlots = maxAllowedScreenshots - images.length;
    const filesToLoad = files.slice(0, availableSlots);

    Promise.all(
      filesToLoad.map((file, fileIdx) => {
        return new Promise<ChartImageItem>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            const targetSlot = images.length + fileIdx;
            const itemTimeframe =
              plan === 'pro'
                ? slotTimeframes[targetSlot] || PRO_DEFAULT_TIMEFRAMES[targetSlot] || '1H'
                : timeframe;
            resolve({
              id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              base64: result,
              mimeType: file.type || 'image/png',
              name: file.name,
              timeframe: itemTimeframe,
            });
          };
          reader.readAsDataURL(file);
        });
      })
    ).then((newItems) => {
      if (newItems.length > 0) {
        setImages((prev) => {
          const currentLimit = plan === 'free' ? 1 : 3;
          const combined = [...prev, ...newItems].slice(0, currentLimit);
          return combined;
        });
        setActiveImageIndex((prev) => Math.min(prev + newItems.length, maxAllowedScreenshots - 1));
      }
    });
  };

  // Global paste handler (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (plan === 'free' && !isProUser && (freeLimitReached || freeAnalysisCount >= maxFreeAnalyses)) {
        onOpenUpgradeModal();
        showLimitError('Free limit reached: You have used all 3 free screenshots. Upgrade to PRO to continue.');
        return;
      }
      if (e.clipboardData && e.clipboardData.items) {
        const imageItems: File[] = [];
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) imageItems.push(file);
          }
        }
        if (imageItems.length > 0) {
          processFiles(imageItems);
          setPasteToast(true);
          setTimeout(() => setPasteToast(false), 2500);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [images.length, plan, isProUser, freeLimitReached, freeAnalysisCount, maxFreeAnalyses]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (plan === 'free' && !isProUser && (freeLimitReached || freeAnalysisCount >= maxFreeAnalyses)) {
      onOpenUpgradeModal();
      showLimitError('Free limit reached: You have used all 3 free screenshots. Upgrade to PRO to continue.');
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveImage = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (activeImageIndex >= updated.length) {
        setActiveImageIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const safeImagesList = Array.isArray(images)
    ? images.filter((img) => Boolean(img && img.base64 && typeof img.base64 === 'string' && img.base64.trim().length > 0))
    : [];
  const activeImage = safeImagesList[activeImageIndex] || safeImagesList[0] || null;
  // Pro user can scan 1, 2, or 3 images (or all 3 when multi-timeframe full set ready)
  const isProReady = plan === 'pro' && isProUser && safeImagesList.length >= 1;
  const isFreeReady = plan === 'free' && safeImagesList.length === 1;
  const canScan = isFreeReady || isProReady;

  return (
    <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
      {/* Plan Selector & Header */}
      <div className="pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h2 className="text-sm font-bold tracking-wide uppercase text-slate-200 font-mono">
              1. Chart Ingestion
            </h2>
          </div>
          <span
            className={`text-[11px] font-mono px-2.5 py-0.5 rounded border ${
              plan === 'pro'
                ? images.length === 3
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                : images.length === 1
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/50'
            }`}
          >
            {images.length} / {maxAllowedScreenshots} Uploaded
          </span>
        </div>

        {/* Plan Mode Selection Pills */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => handlePlanChange('free')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
              plan === 'free'
                ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
            id="plan-free-btn"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Free — 1 Screenshot</span>
          </button>

          <button
            type="button"
            onClick={() => handlePlanChange('pro')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
              plan === 'pro'
                ? 'bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-cyan-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
            id="plan-pro-btn"
          >
            {isProUser ? (
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Pro — 3 Screenshots</span>
            {!isProUser && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 font-bold">
                LOCK
              </span>
            )}
          </button>
        </div>

        {/* Free Screenshot Limit Indicator */}
        {!isProUser && plan === 'free' && (
          <div
            className={`mt-3 p-3 rounded-lg border flex items-center justify-between gap-3 text-xs font-mono transition-all ${
              freeLimitReached || freeAnalysisCount >= maxFreeAnalyses
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-300'
            }`}
            id="free-screenshot-limit-indicator"
          >
            <div className="flex items-center gap-2.5">
              {freeLimitReached || freeAnalysisCount >= maxFreeAnalyses ? (
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
              )}
              <div>
                {freeLimitReached || freeAnalysisCount >= maxFreeAnalyses ? (
                  <>
                    <div className="font-bold text-rose-300 flex items-center gap-1.5">
                      <span>Free Limit Reached — 4th Screenshot Locked</span>
                    </div>
                    <p className="text-[11px] text-rose-400/90">
                      All 3 free screenshots used (3/3). Upgrade to PRO to continue.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-slate-200">
                      Free:{' '}
                      <strong className="text-cyan-400 font-bold">
                        {Math.max(0, maxFreeAnalyses - freeAnalysisCount)} screenshot{Math.max(0, maxFreeAnalyses - freeAnalysisCount) === 1 ? '' : 's'} remaining
                      </strong>{' '}
                      / {maxFreeAnalyses} allowed
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Screenshot {Math.min(freeAnalysisCount + 1, maxFreeAnalyses)} of {maxFreeAnalyses} free analyses.
                    </p>
                  </>
                )}
              </div>
            </div>

            {freeLimitReached || freeAnalysisCount >= maxFreeAnalyses ? (
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="px-3 py-1.5 rounded-md font-mono text-[11px] font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-[0.98] shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                id="free-limit-upgrade-badge-btn"
              >
                <Crown className="w-3.5 h-3.5 text-slate-950" />
                <span>UPGRADE TO PRO</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-bold">
                  {freeAnalysisCount} / {maxFreeAnalyses} USED
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Limit / Notice Banner */}
      {limitNotice && (
        <div className="mb-4 bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs font-mono p-3 rounded-lg flex items-start gap-2.5 animate-fadeIn shadow-md">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{limitNotice}</div>
          <button
            type="button"
            onClick={() => setLimitNotice(null)}
            className="text-amber-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Paste Notification */}
      {pasteToast && (
        <div className="mb-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono px-3 py-2 rounded-lg flex items-center gap-2 animate-fadeIn">
          <ClipboardCheck className="w-4 h-4 text-emerald-400" />
          Image pasted from clipboard successfully!
        </div>
      )}

      {/* ============================================================ */}
      {/* FREE MODE: Single-Screenshot Dropzone & Flow                 */}
      {/* ============================================================ */}
      {plan === 'free' ? (
        !isProUser && (freeLimitReached || freeAnalysisCount >= maxFreeAnalyses) ? (
          /* Locked Free Mode when all 3 analyses are used */
          <div
            className="border border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-slate-950/80 rounded-xl p-6 text-center flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_25px_rgba(245,158,11,0.1)]"
            id="free-limit-locked-container"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-mono font-bold text-white mb-1.5 flex items-center gap-2">
              🔒 FREE LIMIT REACHED — 4TH SCREENSHOT LOCKED
            </h3>
            <p className="text-xs text-slate-300 font-mono mb-1 font-semibold">
              You have completed all 3 free screenshots (3/3 used).
            </p>
            <p className="text-xs text-amber-300 font-mono mb-4 max-w-md">
              Screenshot 4 is locked. Upgrade to PRO to continue analyzing screenshots or unlock 3-chart multi-timeframe analysis.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="py-3 px-6 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-[0.98] shadow-[0_0_20px_rgba(245,158,11,0.35)] border border-amber-300/40 transition-all flex items-center gap-2 cursor-pointer"
                id="free-limit-dropzone-upgrade-btn"
              >
                <Crown className="w-4 h-4 text-slate-950" />
                <span>UPGRADE TO PRO</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  handlePlanChange('pro');
                  onOpenUpgradeModal();
                }}
                className="py-3 px-4 rounded-xl font-mono text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5 cursor-pointer"
                id="switch-to-pro-from-locked-btn"
              >
                <span>PRO Mode (3 Charts)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => {
                if (!isProUser && (freeLimitReached || freeAnalysisCount >= maxFreeAnalyses)) {
                  onOpenUpgradeModal();
                  showLimitError('Free limit reached: You have used all 3 free screenshots. Upgrade to PRO to continue.');
                  return;
                }
                if (images.length >= 1) {
                  showLimitError('Free plan allows only 1 screenshot per analysis. Upgrade to Pro to analyze 3 charts together.');
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer group ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-950/20'
                  : images.length > 0
                  ? 'border-slate-700/80 bg-slate-900/40 hover:border-cyan-500/50'
                  : 'border-slate-700/80 hover:border-cyan-500/60 bg-slate-900/30 hover:bg-slate-900/50'
              }`}
              id="chart-dropzone-free"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />

              {images.length > 0 && activeImage ? (
                <div className="space-y-2">
                  <div className="relative max-h-48 rounded-lg overflow-hidden border border-slate-700 bg-black/40 flex items-center justify-center group/preview">
                    <img
                      src={activeImage.base64}
                      alt={activeImage.name || 'Selected trading chart'}
                      className="max-h-48 w-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-mono text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Free — 1 Screenshot loaded
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Free — 1 Screenshot ready
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveImage(0, e)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:border-cyan-500/40 transition-all shadow-inner mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200 mb-1">
                    Drop your chart screenshot here (Free — 1 Screenshot)
                  </p>
                  <p className="text-[11px] text-slate-400 mb-2.5 max-w-sm">
                    TradingView, Binance, MT4/5, or any chart capture.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono">
                      Browse File
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">or press Ctrl+V</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      ) : !isProUser ? (
        /* ============================================================ */
        /* PRO MODE (LOCKED FOR FREE USERS): ACCESS CONTROL CARD        */
        /* ============================================================ */
        <div className="space-y-4" id="pro-locked-section">
          {/* Header Indicator */}
          <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-4 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-bold font-mono tracking-wide text-amber-300 flex items-center gap-1.5">
                🔒 PRO — 3 CHART ANALYSIS
              </span>
            </div>
            <p className="text-xs font-mono text-slate-300 leading-relaxed mb-3">
              Upload and analyze up to 3 charts together for a more complete market analysis.
            </p>

            {/* Lock Banner Callout */}
            <div className="bg-amber-950/60 border border-amber-500/50 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1">
                    🔒 PRO FEATURE
                  </div>
                  <p className="text-[11px] font-mono text-amber-200/90">
                    Upgrade to Pro to analyze 3 charts together.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="w-full sm:w-auto px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-[0.98] shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border border-amber-300/40"
                id="uploader-upgrade-to-pro-btn"
              >
                <Crown className="w-3.5 h-3.5 text-slate-950" />
                <span>UPGRADE TO PRO</span>
              </button>
            </div>
          </div>

          {/* Locked Slots Visual Preview */}
          <div className="space-y-2 opacity-60 pointer-events-none select-none">
            {[
              'CHART 1 (Higher Timeframe — e.g. 4H / 1D) 🔒',
              'CHART 2 (Middle Timeframe — e.g. 1H / 30m) 🔒',
              'CHART 3 (Lower Timeframe — e.g. 15m / 5m) 🔒',
            ].map((title, idx) => (
              <div
                key={idx}
                className="border border-dashed border-slate-800 bg-slate-900/30 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400/70" />
                  <span className="text-xs font-mono text-slate-400 font-bold">{title}</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400/60 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Pro Locked
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* PRO MODE (ACTIVE PRO USER): UNLOCKED 3 SEPARATE SLOTS        */
        /* ============================================================ */
        <div className="space-y-3" id="pro-three-slots-uploader">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> 3 Dedicated Upload Slots:
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {(Array.isArray(images) ? images.filter((img) => Boolean(img && img.base64 && typeof img.base64 === 'string' && img.base64.trim().length > 0)).length : 0)}/3 Slots Ready
            </span>
          </div>

          <div className="space-y-2.5">
            {[0, 1, 2].map((slotIdx) => {
              const slotImg = Array.isArray(images) ? images[slotIdx] : undefined;
              const slotNum = slotIdx + 1;
              const hasSlotImg = Boolean(slotImg && slotImg.base64 && typeof slotImg.base64 === 'string' && slotImg.base64.trim().length > 0);

              const slotTitles = [
                'CHART 1 (Higher Timeframe — e.g. 4H / 1D)',
                'CHART 2 (Middle Timeframe — e.g. 1H / 30m)',
                'CHART 3 (Lower Timeframe — e.g. 15m / 5m)',
              ];

              const currentSlotTf =
                slotImg?.timeframe || slotTimeframes[slotIdx] || PRO_DEFAULT_TIMEFRAMES[slotIdx] || '1H';

              return (
                <div
                  key={slotIdx}
                  className={`border rounded-xl p-3 transition-all ${
                    hasSlotImg
                      ? 'bg-slate-900/70 border-slate-700/80'
                      : 'bg-slate-900/30 border-dashed border-slate-800 hover:border-cyan-500/50'
                  }`}
                >
                  <input
                    ref={proSlotRefs[slotIdx]}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProSlotFile(slotIdx, e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />

                  {/* Slot Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          hasSlotImg ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {slotTitles[slotIdx]}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        {currentSlotTf}
                      </span>
                    </div>

                    {hasSlotImg ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => proSlotRefs[slotIdx].current?.click()}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer flex items-center gap-1"
                          title="Replace chart screenshot"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Replace
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveImage(slotIdx, e)}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 cursor-pointer"
                          title="Remove this slot"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
                        Slot {slotNum} Empty
                      </span>
                    )}
                  </div>

                  {/* Slot Body */}
                  {hasSlotImg ? (
                    <div
                      className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-slate-800 cursor-pointer group"
                      onClick={() => setActiveImageIndex(slotIdx)}
                    >
                      <img
                        src={slotImg.base64}
                        alt={`Chart ${slotNum}`}
                        className="w-16 h-12 object-cover rounded border border-slate-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Chart {slotNum} Loaded
                          </div>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            {currentSlotTf}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                          {slotImg.name || `Screenshot ${slotNum}`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => proSlotRefs[slotIdx].current?.click()}
                      className="flex items-center justify-between p-3 rounded-lg border border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/40 hover:bg-slate-900/50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-emerald-950/80 border border-slate-700 group-hover:border-emerald-500/40 flex items-center justify-center text-slate-400 group-hover:text-emerald-300">
                          <Upload className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold text-slate-300 group-hover:text-emerald-300 flex items-center gap-2">
                            <span>+ Upload Chart {slotNum}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-normal">
                              Default: {PRO_DEFAULT_TIMEFRAMES[slotIdx]}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Click or drag {PRO_SLOT_LABELS[slotIdx].toLowerCase()} screenshot
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 group-hover:bg-slate-700 text-slate-300 border border-slate-700">
                        Browse
                      </span>
                    </div>
                  )}

                  {/* Timeframe Selector for this slot */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="text-[11px] font-mono text-slate-300 font-semibold">
                        {PRO_SLOT_LABELS[slotIdx]} Timeframe:
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/25 text-cyan-300 border border-cyan-500/50">
                        {currentSlotTf}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {TIMEFRAMES.map((tf) => {
                        const isSelected = currentSlotTf === tf;
                        return (
                          <button
                            key={tf}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSlotTimeframeChange(slotIdx, tf);
                            }}
                            className={`py-0.5 px-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                            }`}
                            title={`Set Chart ${slotNum} timeframe to ${tf}`}
                          >
                            {tf}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick paste helper */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-1">
            <span>Tip: Press Ctrl+V anytime to paste screenshots into empty slots</span>
            <span className="text-amber-400/90 font-bold">Max = 3 Charts</span>
          </div>
        </div>
      )}

      {/* ASSET CATEGORY & INSTRUMENT SELECTION */}
      <div className="mt-4 pt-3 border-t border-slate-800/60">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Asset Categories:
          </label>
          <span className="text-[10px] font-mono text-slate-500">Click category to view instruments</span>
        </div>

        {/* 1. Category Tabs */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2.5">
          {ASSET_CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all text-center cursor-pointer border ${
                  isCatActive
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* 2. Instrument Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {(ASSET_INSTRUMENTS_BY_CATEGORY[selectedCategory] || []).map((inst) => {
            const isSelected = asset.toUpperCase() === inst.name.toUpperCase();
            return (
              <button
                key={inst.id}
                type="button"
                onClick={() => setAsset(inst.name)}
                className={`py-1 px-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_8px_rgba(0,240,160,0.2)]'
                    : 'bg-slate-900/50 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                {inst.name}
              </button>
            );
          })}
        </div>

        {/* Manual Asset Input */}
        <div>
          <label className="text-xs font-mono text-slate-400 block mb-1">
            Custom Symbol / Pair:
          </label>
          <input
            type="text"
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            placeholder="e.g. BTCUSDT, EURUSD, NVDA, XAUUSD..."
            className="w-full bg-slate-900/80 border border-slate-800 focus:border-cyan-500/60 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Timeframe & Trading Style Controls */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Timeframe Selection */}
        <div>
          <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            {plan === 'pro' ? 'Primary / Base Timeframe:' : 'Chart Timeframe:'}
          </label>
          <div className="flex flex-wrap gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`py-1 px-2 rounded text-xs font-mono font-bold transition-all cursor-pointer border ${
                  timeframe === tf
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm'
                    : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Trading Style */}
        <div>
          <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Trading Style:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {TRADING_STYLES.map((item) => {
              const isSelected =
                tradingStyle.toLowerCase() === item.id.toLowerCase() ||
                tradingStyle.toLowerCase() === item.label.toLowerCase();
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTradingStyle(item.id)}
                  className={`py-1.5 px-2.5 rounded-lg text-left transition-all cursor-pointer border flex flex-col justify-center ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-sm'
                      : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span
                    className={`text-xs font-mono font-bold tracking-wide uppercase ${
                      isSelected ? 'text-emerald-300' : 'text-slate-200'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`text-[10px] font-mono tracking-tight leading-tight mt-0.5 whitespace-nowrap ${
                      isSelected ? 'text-emerald-400/80' : 'text-slate-500'
                    }`}
                  >
                    {item.timeframes}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Directional Bias */}
      <div className="mt-3">
        <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5 mb-1.5">
          <Compass className="w-3.5 h-3.5 text-cyan-400" /> Directional Bias:
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {BIAS_OPTIONS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBias(b)}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                bias === b
                  ? b === 'Buy'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-sm'
                    : b === 'Sell'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-sm'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm'
                  : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {b === 'Auto' ? 'Auto (Objective)' : b === 'Buy' ? 'Long / Buy' : 'Short / Sell'}
            </button>
          ))}
        </div>
      </div>

      {/* Additional Context/Notes (Optional) */}
      <div className="mt-3">
        <input
          type="text"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Optional notes / key levels / thesis"
          className="w-full bg-slate-900/60 border border-slate-800 focus:border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 outline-none font-mono"
        />
      </div>

      {/* Analyze CTA Button */}
      <div className="mt-5">
        {plan === 'free' && !isProUser && (freeLimitReached || freeAnalysisCount >= maxFreeAnalyses) ? (
          <button
            type="button"
            onClick={() => {
              showLimitError('Free limit reached: You have used all 3 free screenshots. Upgrade to PRO to continue.');
              onOpenUpgradeModal();
            }}
            className="w-full py-3.5 px-6 rounded-xl font-mono text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-[0.99] shadow-[0_0_25px_rgba(245,158,11,0.35)] border border-amber-300/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            id="free-limit-cta-btn"
          >
            <Lock className="w-4 h-4 text-slate-950" />
            <span>FREE LIMIT REACHED (3/3) — UPGRADE TO PRO</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : plan === 'pro' && !isProUser ? (
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className="w-full py-3.5 px-6 rounded-xl font-mono text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-[0.99] shadow-[0_0_25px_rgba(245,158,11,0.35)] border border-amber-300/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            id="locked-pro-cta-upgrade-btn"
          >
            <Lock className="w-4 h-4 text-slate-950" />
            <span>UPGRADE TO PRO TO ANALYZE 3 CHARTS</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onAnalyze}
            disabled={!canScan || isAnalyzing}
            className={`w-full py-3.5 px-6 rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 relative overflow-hidden cursor-pointer ${
              !canScan || isAnalyzing
                ? 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 hover:brightness-110 active:scale-[0.99] shadow-[0_0_25px_rgba(0,240,160,0.35)] border border-emerald-300/40'
            }`}
            id="analyze-chart-btn"
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>
                  {plan === 'pro'
                    ? 'Gemini Vision Scanning 3 Charts Simultaneously...'
                    : 'Scanning Price Action & Structure with Gemini...'}
                </span>
              </>
            ) : plan === 'pro' ? (
              images.length === 3 ? (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>SCAN 3 CHARTS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Upload 3 Charts to Scan ({images.length}/3 Ready)</span>
                </>
              )
            ) : (
              <>
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Analyze Chart with AI Vision</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
