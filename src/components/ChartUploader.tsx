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

// Professional Color Themes for Asset Categories - Silver Grey + Royal Blue theme
// Professional Color Themes for Asset Categories - Individual soft/light distinct colors
const CATEGORY_COLOR_THEMES: Record<
  AssetCategoryName,
  {
    unselected: string;
    selected: string;
    pillSelected: string;
    pillUnselected: string;
    iconColor: string;
  }
> = {
  Crypto: {
    unselected: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] hover:bg-[#DBEAFE] hover:border-[#93C5FD]',
    selected: 'bg-[#DBEAFE] border-[#2563EB] text-[#1E40AF] font-bold shadow-xs ring-1 ring-[#2563EB]/40',
    pillSelected: 'bg-[#DBEAFE] text-[#1E40AF] border-[#2563EB] font-bold shadow-xs ring-1 ring-[#2563EB]/30',
    pillUnselected: 'bg-[#F8FAFC] text-[#1E3A8A] border-[#BFDBFE] hover:bg-[#EFF6FF]',
    iconColor: '#2563EB',
  },
  Forex: {
    unselected: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] hover:bg-[#DCFCE7] hover:border-[#86EFAC]',
    selected: 'bg-[#DCFCE7] border-[#16A34A] text-[#166534] font-bold shadow-xs ring-1 ring-[#16A34A]/40',
    pillSelected: 'bg-[#DCFCE7] text-[#166534] border-[#16A34A] font-bold shadow-xs ring-1 ring-[#16A34A]/30',
    pillUnselected: 'bg-[#F8FAFC] text-[#14532D] border-[#BBF7D0] hover:bg-[#F0FDF4]',
    iconColor: '#16A34A',
  },
  Commodities: {
    unselected: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A] hover:bg-[#FEF9C3] hover:border-[#FDE047]',
    selected: 'bg-[#FEF9C3] border-[#CA8A04] text-[#854D0E] font-bold shadow-xs ring-1 ring-[#CA8A04]/40',
    pillSelected: 'bg-[#FEF9C3] text-[#854D0E] border-[#CA8A04] font-bold shadow-xs ring-1 ring-[#CA8A04]/30',
    pillUnselected: 'bg-[#F8FAFC] text-[#713F12] border-[#FEF08A] hover:bg-[#FEFCE8]',
    iconColor: '#CA8A04',
  },
  Energies: {
    unselected: 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA] hover:bg-[#FFEDD5] hover:border-[#FDBA74]',
    selected: 'bg-[#FFEDD5] border-[#EA580C] text-[#9A3412] font-bold shadow-xs ring-1 ring-[#EA580C]/40',
    pillSelected: 'bg-[#FFEDD5] text-[#9A3412] border-[#EA580C] font-bold shadow-xs ring-1 ring-[#EA580C]/30',
    pillUnselected: 'bg-[#F8FAFC] text-[#7C2D12] border-[#FED7AA] hover:bg-[#FFF7ED]',
    iconColor: '#EA580C',
  },
  Stocks: {
    unselected: 'bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF] hover:bg-[#F3E8FF] hover:border-[#D8B4FE]',
    selected: 'bg-[#F3E8FF] border-[#9333EA] text-[#6B21A8] font-bold shadow-xs ring-1 ring-[#9333EA]/40',
    pillSelected: 'bg-[#F3E8FF] text-[#6B21A8] border-[#9333EA] font-bold shadow-xs ring-1 ring-[#9333EA]/30',
    pillUnselected: 'bg-[#F8FAFC] text-[#581C87] border-[#E9D5FF] hover:bg-[#FAF5FF]',
    iconColor: '#9333EA',
  },
  Indices: {
    unselected: 'bg-[#ECFEFF] text-[#0E7490] border-[#A5F3FC] hover:bg-[#CFFAFE] hover:border-[#67E8F9]',
    selected: 'bg-[#CFFAFE] border-[#0891B2] text-[#155E75] font-bold shadow-xs ring-1 ring-[#0891B2]/40',
    pillSelected: 'bg-[#CFFAFE] text-[#155E75] border-[#0891B2] font-bold shadow-xs ring-1 ring-[#0891B2]/30',
    pillUnselected: 'bg-[#F8FAFC] text-[#164E63] border-[#A5F3FC] hover:bg-[#ECFEFF]',
    iconColor: '#0891B2',
  },
};

// Clean Timeframe button classes
const getTimeframeButtonClass = (tf: string, isSelected: boolean): string => {
  return isSelected
    ? 'bg-[#245BDB] border-[#245BDB] text-white font-bold shadow-xs'
    : 'bg-white text-[#64748B] border-[#D8DFEA] hover:border-[#245BDB]/50 hover:text-[#182338]';
};

const getTimeframeBadgeClass = (tf: string): string => {
  return 'bg-[#E8F0FF] text-[#245BDB] border-[#D8DFEA]';
};

// Distinct Light Color Themes for Trading Styles
const TRADING_STYLE_CONFIG: Record<
  string,
  {
    selected: string;
    unselected: string;
    titleSelected: string;
    titleUnselected: string;
    subSelected: string;
    subUnselected: string;
  }
> = {
  Scalping: {
    selected: 'bg-[#FFE4E6] border-[#E11D48] text-[#9F1239] shadow-xs ring-1 ring-[#E11D48]/40',
    unselected: 'bg-[#FFF1F2] border-[#FECDD3] text-[#BE123C] hover:bg-[#FFE4E6] hover:border-[#FDA4AF]',
    titleSelected: 'text-[#9F1239] font-bold',
    titleUnselected: 'text-[#BE123C] font-bold',
    subSelected: 'text-[#9F1239] font-medium',
    subUnselected: 'text-[#BE123C]/80',
  },
  Intraday: {
    selected: 'bg-[#DBEAFE] border-[#2563EB] text-[#1E40AF] shadow-xs ring-1 ring-[#2563EB]/40',
    unselected: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8] hover:bg-[#DBEAFE] hover:border-[#93C5FD]',
    titleSelected: 'text-[#1E40AF] font-bold',
    titleUnselected: 'text-[#1D4ED8] font-bold',
    subSelected: 'text-[#1E40AF] font-medium',
    subUnselected: 'text-[#1D4ED8]/80',
  },
  Swing: {
    selected: 'bg-[#DCFCE7] border-[#16A34A] text-[#166534] shadow-xs ring-1 ring-[#16A34A]/40',
    unselected: 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D] hover:bg-[#DCFCE7] hover:border-[#86EFAC]',
    titleSelected: 'text-[#166534] font-bold',
    titleUnselected: 'text-[#15803D] font-bold',
    subSelected: 'text-[#166534] font-medium',
    subUnselected: 'text-[#15803D]/80',
  },
  Position: {
    selected: 'bg-[#F3E8FF] border-[#9333EA] text-[#6B21A8] shadow-xs ring-1 ring-[#9333EA]/40',
    unselected: 'bg-[#FAF5FF] border-[#E9D5FF] text-[#7E22CE] hover:bg-[#F3E8FF] hover:border-[#D8B4FE]',
    titleSelected: 'text-[#6B21A8] font-bold',
    titleUnselected: 'text-[#7E22CE] font-bold',
    subSelected: 'text-[#6B21A8] font-medium',
    subUnselected: 'text-[#7E22CE]/80',
  },
};

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

  const canUseThreeSlots = isProUser;
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

  // Switch plans cleanly with strict Pro entitlement verification
  const handlePlanChange = (newPlan: 'free' | 'pro') => {
    if (newPlan === 'pro' && !isProUser) {
      onOpenUpgradeModal();
      showLimitError('Multi-Chart / 3-Screen Analysis is a PRO-ONLY feature. Upgrade to Pro to unlock 3-chart multi-timeframe analysis.');
      return;
    }
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
          timeframe: slotTimeframes[idx] || img.timeframe || PRO_DEFAULT_TIMEFRAMES[idx] || '1H',
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
          const targetTimeframe = slotTimeframes[slotIndex] || PRO_DEFAULT_TIMEFRAMES[slotIndex] || '1H';
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
        showLimitError('Lifetime free limit reached: You have completed all 3 free chart analyses. Free access is permanently locked. Upgrade to PRO to continue.');
        return;
      }
      if (images.length >= 1 || files.length > 1) {
        showLimitError('Single chart mode analyzes 1 chart per request. Switch to 3 Screenshots mode to analyze up to 3 charts.');
        return;
      }
    } else {
      if (!canUseThreeSlots) {
        onOpenUpgradeModal();
        return;
      }
      if (images.length + files.length > 3) {
        showLimitError('You can upload up to 3 chart screenshots.');
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
        showLimitError('Lifetime free limit reached: You have completed all 3 free chart analyses. Free access is permanently locked. Upgrade to PRO to continue.');
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
      showLimitError('Lifetime free limit reached: You have completed all 3 free chart analyses. Free access is permanently locked. Upgrade to PRO to continue.');
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
    <div className="bg-white border border-[#D8DFEA] rounded-xl p-5 shadow-sm relative overflow-hidden">
      {/* Plan Selector & Header */}
      <div className="pb-4 border-b border-[#D8DFEA] mb-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#245BDB]" />
            <h2 className="text-sm font-bold tracking-wide uppercase text-[#182338] font-mono">
              1. Chart Ingestion
            </h2>
          </div>
          <span
            className={`text-[11px] font-mono px-2.5 py-0.5 rounded border ${
              plan === 'pro'
                ? images.length === 3
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                  : 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                : images.length === 1
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                : 'bg-[#E9EDF5] text-[#64748B] border-[#D8DFEA]'
            }`}
          >
            {images.length} / {maxAllowedScreenshots} Uploaded
          </span>
        </div>

        {/* Plan Mode Selection Pills */}
        <div className="grid grid-cols-2 gap-2 bg-[#E9EDF5] p-1.5 rounded-lg border border-[#D8DFEA]">
          <button
            type="button"
            onClick={() => handlePlanChange('free')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
              plan === 'free'
                ? 'bg-white text-[#182338] border border-[#D8DFEA] shadow-xs'
                : 'text-[#64748B] hover:text-[#182338] hover:bg-white/60'
            }`}
            id="plan-free-btn"
          >
            <Shield className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Free — 3 Chart Analyses Total</span>
          </button>

          <button
            type="button"
            onClick={() => handlePlanChange('pro')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
              plan === 'pro'
                ? 'bg-[#E8F0FF] text-[#245BDB] border border-[#245BDB]/40 shadow-xs'
                : 'text-[#64748B] hover:text-[#182338] hover:bg-white/60'
            }`}
            id="plan-pro-btn"
          >
            {isProUser ? (
              <Crown className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>Pro — 3 Screenshots</span>
            {!isProUser && (
              <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200 font-bold">
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
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-[#E8F0FF] border-[#D8DFEA] text-[#182338]'
            }`}
            id="free-screenshot-limit-indicator"
          >
            <div className="flex items-center gap-2.5">
              {freeLimitReached || freeAnalysisCount >= maxFreeAnalyses ? (
                <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-300 flex items-center justify-center text-[#DC4655] shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#E8F0FF] border border-[#245BDB]/30 flex items-center justify-center text-[#245BDB] shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
              )}
              <div>
                {freeLimitReached || freeAnalysisCount >= maxFreeAnalyses ? (
                  <>
                    <div className="font-bold text-[#DC4655] flex items-center gap-1.5">
                      <span>Lifetime Free Limit Reached — Access Locked</span>
                    </div>
                    <p className="text-[11px] text-rose-700/90">
                      All 3 lifetime free chart analyses used (3/3). Free access is permanently locked. Upgrade to PRO to continue.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-[#182338]">
                      Free Allowance:{' '}
                      <strong className="text-[#245BDB] font-bold">
                        {Math.max(0, maxFreeAnalyses - freeAnalysisCount)} free analys{Math.max(0, maxFreeAnalyses - freeAnalysisCount) === 1 ? 'is' : 'es'} remaining
                      </strong>{' '}
                      / {maxFreeAnalyses} total
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      3 FREE chart analyses total for lifetime. Analysis {Math.min(freeAnalysisCount + 1, maxFreeAnalyses)} of {maxFreeAnalyses}.
                    </p>
                  </>
                )}
              </div>
            </div>

            {freeLimitReached || freeAnalysisCount >= maxFreeAnalyses ? (
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="px-3 py-1.5 rounded-md font-mono text-[11px] font-bold bg-[#245BDB] text-white hover:bg-[#1948B8] active:scale-[0.98] shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                id="free-limit-upgrade-badge-btn"
              >
                <Crown className="w-3.5 h-3.5 text-white" />
                <span>UPGRADE TO PRO</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#245BDB] border border-[#D8DFEA] font-bold">
                  {freeAnalysisCount} / {maxFreeAnalyses} USED
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Limit / Notice Banner */}
      {limitNotice && (
        <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-mono p-3 rounded-lg flex items-start gap-2.5 animate-fadeIn shadow-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{limitNotice}</div>
          <button
            type="button"
            onClick={() => setLimitNotice(null)}
            className="text-amber-700 hover:text-amber-950 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Paste Notification */}
      {pasteToast && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono px-3 py-2 rounded-lg flex items-center gap-2 animate-fadeIn shadow-xs font-semibold">
          <ClipboardCheck className="w-4 h-4 text-emerald-600" />
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
            className="border border-amber-300 bg-amber-50/60 rounded-xl p-6 text-center flex flex-col items-center justify-center relative overflow-hidden shadow-xs"
            id="free-limit-locked-container"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 mb-3">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-mono font-bold text-[#182338] mb-1.5 flex items-center gap-2">
              🔒 LIFETIME FREE LIMIT REACHED — PERMANENTLY LOCKED
            </h3>
            <p className="text-xs text-[#182338] font-mono mb-1 font-semibold">
              You have completed all 3 lifetime free chart analyses (3/3 used).
            </p>
            <p className="text-xs text-amber-800 font-mono mb-4 max-w-md">
              Free access is permanently locked. Upgrade to PRO to continue analyzing charts and unlock 3-chart multi-timeframe analysis.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="py-3 px-6 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-[#245BDB] hover:bg-[#1948B8] text-white active:scale-[0.98] shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                id="free-limit-dropzone-upgrade-btn"
              >
                <Crown className="w-4 h-4 text-white" />
                <span>UPGRADE TO PRO</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenUpgradeModal();
                }}
                className="py-3 px-4 rounded-xl font-mono text-xs font-bold text-[#182338] hover:text-[#245BDB] bg-white border border-[#D8DFEA] hover:border-[#245BDB]/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                  showLimitError('Free limit reached: You have used all 3 free chart analyses. Upgrade to PRO to continue.');
                  return;
                }
                if (images.length >= 1) {
                  showLimitError('Free analysis analyzes 1 chart per request (up to 3 FREE chart analyses total). Upgrade to Pro to analyze 3 charts together.');
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer group ${
                isDragging
                  ? 'border-[#245BDB] bg-[#E8F0FF]'
                  : images.length > 0
                  ? 'border-[#D8DFEA] bg-[#F2F4F8] hover:border-[#245BDB]/50'
                  : 'border-[#D8DFEA] hover:border-[#245BDB] bg-[#F2F4F8] hover:bg-[#E9EDF5]'
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
                  <div className="relative max-h-48 rounded-lg overflow-hidden border border-[#D8DFEA] bg-[#182338] flex items-center justify-center group/preview">
                    <img
                      src={activeImage.base64}
                      alt={activeImage.name || 'Selected trading chart'}
                      className="max-h-48 w-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-[#182338]/70 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-mono text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Free — Chart screenshot loaded (3 FREE chart analyses total)
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-[#64748B]">
                    <span className="flex items-center gap-1 text-[#16A36A] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Free — Chart screenshot ready (3 FREE chart analyses total)
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveImage(0, e)}
                      className="text-[#DC4655] hover:text-rose-700 text-xs font-mono flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#D8DFEA] flex items-center justify-center text-[#245BDB] group-hover:scale-105 group-hover:border-[#245BDB]/50 transition-all shadow-xs mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-[#182338] mb-1">
                    Drop your chart screenshot here (3 FREE chart analyses total)
                  </p>
                  <p className="text-[11px] text-[#64748B] mb-2.5 max-w-sm">
                    TradingView, Binance, MT4/5, or any chart capture.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#E8F0FF] border border-[#245BDB]/30 text-[#245BDB] text-[11px] font-mono font-bold">
                      Browse File
                    </span>
                    <span className="text-[11px] text-[#64748B] font-mono">or press Ctrl+V</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      ) : !isProUser ? (
        /* ============================================================ */
        /* PRO MODE (LOCKED FOR NON-PRO USERS): ACCESS CARD             */
        /* ============================================================ */
        <div className="space-y-4" id="pro-locked-section">
          {/* Header Indicator */}
          <div className="bg-[#F2F4F8] border border-amber-300 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-bold font-mono tracking-wide text-amber-800 flex items-center gap-1.5">
                🔒 PRO — 3 CHART ANALYSIS
              </span>
            </div>
            <p className="text-xs font-mono text-[#182338] leading-relaxed mb-3">
              Upload and analyze up to 3 charts together for a more complete market analysis.
            </p>

            {/* Lock Banner Callout */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-mono font-bold text-amber-800 flex items-center gap-1">
                    🔒 PRO FEATURE
                  </div>
                  <p className="text-[11px] font-mono text-amber-700">
                    Upgrade to Pro to analyze 3 charts together.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="w-full sm:w-auto px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-[#245BDB] hover:bg-[#1948B8] text-white active:scale-[0.98] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                id="uploader-upgrade-to-pro-btn"
              >
                <Crown className="w-3.5 h-3.5 text-white" />
                <span>UPGRADE TO PRO</span>
              </button>
            </div>
          </div>

          {/* Locked Slots Visual Preview */}
          <div className="space-y-2 opacity-60 pointer-events-none select-none">
            {[
              'CHART 1 🔒',
              'CHART 2 🔒',
              'CHART 3 🔒',
            ].map((title, idx) => (
              <div
                key={idx}
                className="border border-dashed border-[#D8DFEA] bg-[#F2F4F8] rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-mono text-[#64748B] font-bold">{title}</span>
                </div>
                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
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
            <span className="text-xs font-mono font-bold text-[#182338] flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-500" /> 3 Dedicated Pro Upload Slots:
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">
              {(Array.isArray(images) ? images.filter((img) => Boolean(img && img.base64 && typeof img.base64 === 'string' && img.base64.trim().length > 0)).length : 0)}/3 Slots Ready
            </span>
          </div>

          <div className="space-y-2.5">
            {[0, 1, 2].map((slotIdx) => {
              const slotImg = Array.isArray(images) ? images[slotIdx] : undefined;
              const slotNum = slotIdx + 1;
              const hasSlotImg = Boolean(slotImg && slotImg.base64 && typeof slotImg.base64 === 'string' && slotImg.base64.trim().length > 0);

              const slotTitles = [
                'CHART 1',
                'CHART 2',
                'CHART 3',
              ];

              const currentSlotTf =
                slotImg?.timeframe || slotTimeframes[slotIdx] || PRO_DEFAULT_TIMEFRAMES[slotIdx] || '1H';

              return (
                <div
                  key={slotIdx}
                  className={`border rounded-xl p-3 transition-all ${
                    hasSlotImg
                      ? 'bg-white border-[#D8DFEA] shadow-xs'
                      : 'bg-[#F2F4F8] border-dashed border-[#D8DFEA] hover:border-[#245BDB]/50'
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
                          hasSlotImg ? 'bg-[#16A36A]' : 'bg-[#D8DFEA]'
                        }`}
                      />
                      <span className="text-xs font-mono font-bold text-[#182338]">
                        {slotTitles[slotIdx]}
                      </span>
                    </div>

                    {hasSlotImg ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => proSlotRefs[slotIdx].current?.click()}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-white hover:bg-[#E9EDF5] text-[#182338] border border-[#D8DFEA] cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Replace chart screenshot"
                        >
                          <RefreshCw className="w-2.5 h-2.5 text-[#64748B]" /> Replace
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveImage(slotIdx, e)}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-[#DC4655] border border-rose-200 cursor-pointer shadow-xs"
                          title="Remove this slot"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0 font-medium">
                        Slot {slotNum} Empty
                      </span>
                    )}
                  </div>

                  {/* Slot Body */}
                  {hasSlotImg ? (
                    <div
                      className="flex items-center gap-3 bg-[#F2F4F8] p-2 rounded-lg border border-[#D8DFEA] cursor-pointer group"
                      onClick={() => setActiveImageIndex(slotIdx)}
                    >
                      <img
                        src={slotImg.base64}
                        alt={`Chart ${slotNum}`}
                        className="w-16 h-12 object-cover rounded border border-[#D8DFEA] shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-mono font-semibold text-[#16A36A] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Chart {slotNum} Loaded
                          </div>
                        </div>
                        <p className="text-[10px] font-mono text-[#64748B] truncate mt-0.5">
                          {slotImg.name || `Screenshot ${slotNum}`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => proSlotRefs[slotIdx].current?.click()}
                      className="flex items-center justify-between p-3 rounded-lg border border-dashed border-[#D8DFEA] hover:border-[#245BDB]/60 bg-white hover:bg-[#E8F0FF]/40 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#E8F0FF] group-hover:bg-[#245BDB]/20 border border-[#D8DFEA] flex items-center justify-center text-[#245BDB]">
                          <Upload className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold text-[#182338] group-hover:text-[#245BDB] flex items-center gap-2">
                            <span>+ Upload Chart {slotNum}</span>
                          </div>
                          <div className="text-[10px] font-mono text-[#64748B]">
                            Click or drag screenshot to upload
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#F2F4F8] group-hover:bg-[#E8F0FF] text-[#182338] border border-[#D8DFEA] font-semibold">
                        Browse
                      </span>
                    </div>
                  )}

                  {/* Timeframe Selector for this slot */}
                  <div className="mt-2.5 pt-2 border-t border-[#D8DFEA] flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-[#245BDB] shrink-0" />
                      <span className="text-[11px] font-mono text-[#182338] font-semibold">
                        Timeframe:
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
                            className={`py-0.5 px-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${getTimeframeButtonClass(tf, isSelected)}`}
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
          <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] px-1">
            <span>Tip: Press Ctrl+V anytime to paste screenshots into empty slots</span>
            <span className="text-amber-700 font-bold">Max = 3 Charts</span>
          </div>
        </div>
      )}

      {/* ASSET CATEGORY & INSTRUMENT SELECTION */}
      <div className="mt-4 pt-3 border-t border-[#D8DFEA]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-mono text-[#182338] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#245BDB]" /> Asset Categories:
          </label>
          <span className="text-[10px] font-mono text-[#64748B]">Click category to view instruments</span>
        </div>

        {/* 1. Category Tabs */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2.5">
          {ASSET_CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat;
            const catTheme = CATEGORY_COLOR_THEMES[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all text-center cursor-pointer border ${
                  isCatActive ? catTheme.selected : catTheme.unselected
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
            const catTheme = CATEGORY_COLOR_THEMES[selectedCategory];
            return (
              <button
                key={inst.id}
                type="button"
                onClick={() => setAsset(inst.name)}
                className={`py-1 px-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                  isSelected ? catTheme.pillSelected : catTheme.pillUnselected
                }`}
              >
                {inst.name}
              </button>
            );
          })}
        </div>

        {/* Manual Asset Input */}
        <div>
          <label className="text-xs font-mono text-[#64748B] block mb-1">
            Custom Symbol / Pair:
          </label>
          <input
            type="text"
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            placeholder="e.g. BTCUSDT, EURUSD, NVDA, XAUUSD..."
            className="w-full bg-white border border-[#D8DFEA] focus:border-[#245BDB] focus:ring-1 focus:ring-[#245BDB] rounded-lg px-3 py-2 text-xs font-mono text-[#182338] placeholder-[#94A3B8] outline-none transition-all"
          />
        </div>
      </div>

      {/* Timeframe & Trading Style Controls */}
      <div className="mt-4 pt-3 border-t border-[#D8DFEA] grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Timeframe Selection */}
        <div>
          <label className="text-xs font-mono text-[#182338] font-semibold flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-[#245BDB]" />
            {plan === 'pro' ? 'Primary / Base Timeframe:' : 'Chart Timeframe:'}
          </label>
          <div className="flex flex-wrap gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`py-1 px-2 rounded text-xs font-mono font-bold transition-all cursor-pointer border ${getTimeframeButtonClass(
                  tf,
                  timeframe === tf
                )}`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Trading Style */}
        <div>
          <label className="text-xs font-mono text-[#182338] font-semibold flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#16A36A]" /> Trading Style:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {TRADING_STYLES.map((item) => {
              const isSelected =
                tradingStyle.toLowerCase() === item.id.toLowerCase() ||
                tradingStyle.toLowerCase() === item.label.toLowerCase();
              const styleTheme = TRADING_STYLE_CONFIG[item.id] || TRADING_STYLE_CONFIG['Intraday'];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTradingStyle(item.id)}
                  className={`py-1.5 px-2.5 rounded-lg text-left transition-all cursor-pointer border flex flex-col justify-center ${
                    isSelected ? styleTheme.selected : styleTheme.unselected
                  }`}
                >
                  <span
                    className={`text-xs font-mono tracking-wide uppercase ${
                      isSelected ? styleTheme.titleSelected : styleTheme.titleUnselected
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`text-[10px] font-mono tracking-tight leading-tight mt-0.5 whitespace-nowrap ${
                      isSelected ? styleTheme.subSelected : styleTheme.subUnselected
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
        <label className="text-xs font-mono text-[#182338] font-semibold flex items-center gap-1.5 mb-1.5">
          <Compass className="w-3.5 h-3.5 text-[#245BDB]" /> Directional Bias:
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
                    ? 'bg-emerald-50 text-[#16A36A] border-[#16A36A]/40 shadow-xs'
                    : b === 'Sell'
                    ? 'bg-rose-50 text-[#DC4655] border-[#DC4655]/40 shadow-xs'
                    : 'bg-[#E8F0FF] text-[#245BDB] border-[#245BDB] shadow-xs'
                  : 'bg-white text-[#64748B] border-[#D8DFEA] hover:border-[#245BDB]/30 hover:text-[#182338]'
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
          className="w-full bg-white border border-[#D8DFEA] focus:border-[#245BDB] focus:ring-1 focus:ring-[#245BDB] rounded-lg px-3 py-1.5 text-xs text-[#182338] placeholder-[#94A3B8] outline-none font-mono transition-all"
        />
      </div>

      {/* Analyze CTA Button */}
      <div className="mt-5">
        {plan === 'free' && !isProUser && (freeLimitReached || freeAnalysisCount >= maxFreeAnalyses) ? (
          <button
            type="button"
            onClick={() => {
              showLimitError('Lifetime free limit reached: You have completed all 3 free chart analyses. Free access is permanently locked. Upgrade to PRO to continue.');
              onOpenUpgradeModal();
            }}
            className="w-full py-3.5 px-6 rounded-xl font-mono text-sm font-bold uppercase tracking-wider bg-[#245BDB] hover:bg-[#1948B8] text-white active:scale-[0.99] shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            id="free-limit-cta-btn"
          >
            <Lock className="w-4 h-4 text-white" />
            <span>LIFETIME FREE LIMIT REACHED (3/3) — UPGRADE TO PRO</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : plan === 'pro' && !isProUser ? (
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className="w-full py-3.5 px-6 rounded-xl font-mono text-sm font-bold uppercase tracking-wider bg-[#245BDB] hover:bg-[#1948B8] text-white active:scale-[0.99] shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            id="locked-pro-cta-upgrade-btn"
          >
            <Lock className="w-4 h-4 text-white" />
            <span>UPGRADE TO PRO TO ANALYZE 3 CHARTS</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onAnalyze}
            disabled={!canScan || isAnalyzing}
            className={`w-full py-3.5 px-6 rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-3 relative overflow-hidden cursor-pointer ${
              !canScan || isAnalyzing
                ? 'bg-[#E9EDF5] text-[#94A3B8] border border-[#D8DFEA] cursor-not-allowed'
                : 'bg-[#245BDB] hover:bg-[#1948B8] text-white active:scale-[0.99] shadow-sm'
            }`}
            id="analyze-chart-btn"
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>
                  {plan === 'pro'
                    ? 'Gemini Vision Scanning 3 Charts Simultaneously...'
                    : 'Scanning Price Action & Structure with Gemini...'}
                </span>
              </>
            ) : plan === 'pro' ? (
              images.length === 3 ? (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  <span>SCAN 3 CHARTS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Upload 3 Charts to Scan ({images.length}/3 Ready)</span>
                </>
              )
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
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
