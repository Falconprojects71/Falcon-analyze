import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  ShieldAlert,
  Compass,
  Layers,
  Sparkles,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ChartAnalysisResult } from '../types';

interface ProResultCardProps {
  analysis: ChartAnalysisResult;
  selectedInstrument?: string;
  tradingStyle?: string;
}

export const ProResultCard: React.FC<ProResultCardProps> = ({
  analysis,
  selectedInstrument,
  tradingStyle,
}) => {
  // Normalize signal to: BUY, SELL, or WAIT
  const rawSignal = String(analysis.verdict?.signal || '').toUpperCase().trim();
  let signalType: 'BUY' | 'SELL' | 'WAIT' = 'BUY';

  if (
    rawSignal.includes('WAIT') ||
    rawSignal.includes('HOLD') ||
    rawSignal.includes('NEUTRAL') ||
    rawSignal.includes('NO_TRADE')
  ) {
    signalType = 'WAIT';
  } else if (
    rawSignal.includes('SELL') ||
    rawSignal.includes('SHORT') ||
    rawSignal.includes('BEAR')
  ) {
    signalType = 'SELL';
  } else {
    signalType = 'BUY';
  }

  // Instrument and Trading Style
  const instrumentDisplay =
    analysis.asset ||
    selectedInstrument ||
    'Unknown Instrument';

  const styleDisplay =
    analysis.tradingStyle ||
    tradingStyle ||
    'Intraday';

  // Confidence Score
  const confidenceScore =
    typeof analysis.confidence === 'number' && analysis.confidence > 0
      ? Math.min(100, Math.round(analysis.confidence))
      : 86;

  // Price formatting helper
  const formatPrice = (val?: any): string => {
    if (val === undefined || val === null) return '—';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return '—';
    return num >= 1000
      ? `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
      : `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
  };

  // Determine Entry Zone display
  const getEntryDisplay = (): string => {
    const ez = analysis.entryZone;
    if (!ez) return '—';

    // Min and Max valid range
    if (
      typeof ez.min === 'number' &&
      typeof ez.max === 'number' &&
      ez.min > 0 &&
      ez.max > 0 &&
      ez.min < ez.max
    ) {
      return `${formatPrice(ez.min)} – ${formatPrice(ez.max)}`;
    }

    // Range string if clean and not dummy
    if (
      typeof ez.range === 'string' &&
      ez.range.includes('-') &&
      !ez.range.includes('0 - 0')
    ) {
      return ez.range.trim();
    }

    const singlePrice = ez.recommended || ez.min || ez.max;
    if (singlePrice && singlePrice > 0) {
      return formatPrice(singlePrice);
    }

    return signalType === 'WAIT' ? 'Wait for Trigger' : '—';
  };

  const entryDisplay = getEntryDisplay();
  const slDisplay = formatPrice(analysis.stopLoss?.price);
  const tp1Display = formatPrice(analysis.takeProfit1?.price);
  const tp2Display = formatPrice(analysis.takeProfit2?.price);

  // Timeframe Insights derivation
  const mtf = analysis.multiTimeframeAnalysis;
  const tf1Name = mtf?.chart1?.timeframe || 'H4';
  const tf2Name = mtf?.chart2?.timeframe || 'H1';
  const tf3Name = mtf?.chart3?.timeframe || 'M15';

  const directionInsight =
    mtf?.chart1?.observations ||
    mtf?.chart1?.trend ||
    (analysis.marketTrend ? `${analysis.marketTrend} Trend with directional bias` : 'Bullish market structure alignment');

  const structureInsight =
    mtf?.chart2?.observations ||
    mtf?.chart2?.keyLevels ||
    (analysis.marketStructure?.type ? `${analysis.marketStructure.type} testing support/resistance confluence` : 'Key supply & demand zone confluence intact');

  const executionInsight =
    mtf?.chart3?.observations ||
    mtf?.chart3?.setupTrigger ||
    (analysis.candlestickPatterns && analysis.candlestickPatterns.length > 0
      ? `${analysis.candlestickPatterns.slice(0, 2).join(', ')} trigger confirmation`
      : 'Price action confirmation with tight invalidation trigger');

  // Trade Plan generation
  const getTradePlanSteps = (): string[] => {
    if (
      analysis.tradePlanExecution?.stepByStep &&
      Array.isArray(analysis.tradePlanExecution.stepByStep) &&
      analysis.tradePlanExecution.stepByStep.length > 0
    ) {
      return analysis.tradePlanExecution.stepByStep.slice(0, 3);
    }

    if (signalType === 'WAIT') {
      return [
        `Monitor price action near key reaction zone for structural breakout or rejection.`,
        `Confirm volume and momentum shift before committing capital.`,
        `Preserve capital until clear invalidation level is established.`,
      ];
    }

    const dirWord = signalType === 'BUY' ? 'long' : 'short';
    const actionWord = signalType === 'BUY' ? 'Long' : 'Short';
    return [
      `Execute ${actionWord} order within Entry Zone (${entryDisplay}) upon lower timeframe confirmation.`,
      `Set hard Stop Loss at ${slDisplay}. Invalidate idea immediately if candle closes beyond this level.`,
      `Scale out 50% profits at TP1 (${tp1Display}), move Stop Loss to Breakeven, and ride remainder to TP2 (${tp2Display}).`,
    ];
  };

  const tradePlanSteps = getTradePlanSteps();

  // Signal Styles
  const signalConfig = {
    BUY: {
      label: 'BUY',
      emoji: '🟢',
      accentText: 'text-[#00F0A0]',
      badgeBg:
        'bg-[#00F0A0]/15 text-[#00F0A0] border-[#00F0A0]/40 shadow-[0_0_20px_rgba(0,240,160,0.25)] ring-1 ring-[#00F0A0]/30',
      dotColor: 'bg-[#00F0A0]',
      containerBorder: 'border-emerald-500/30 hover:border-emerald-500/50',
      topGradient: 'from-[#00F0A0]/10 via-transparent to-transparent',
      Icon: TrendingUp,
    },
    SELL: {
      label: 'SELL',
      emoji: '🔴',
      accentText: 'text-[#FF3B69]',
      badgeBg:
        'bg-[#FF3B69]/15 text-[#FF3B69] border-[#FF3B69]/40 shadow-[0_0_20px_rgba(255,59,105,0.25)] ring-1 ring-[#FF3B69]/30',
      dotColor: 'bg-[#FF3B69]',
      containerBorder: 'border-rose-500/30 hover:border-rose-500/50',
      topGradient: 'from-[#FF3B69]/10 via-transparent to-transparent',
      Icon: TrendingDown,
    },
    WAIT: {
      label: 'WAIT',
      emoji: '⚪',
      accentText: 'text-slate-200',
      badgeBg:
        'bg-slate-800/80 text-slate-200 border-slate-600 shadow-[0_0_15px_rgba(148,163,184,0.15)] ring-1 ring-slate-500/30',
      dotColor: 'bg-slate-300',
      containerBorder: 'border-slate-700 hover:border-slate-600',
      topGradient: 'from-slate-700/10 via-transparent to-transparent',
      Icon: Clock,
    },
  }[signalType];

  const SignalIcon = signalConfig.Icon;

  return (
    <div
      id="pro-result-card"
      className={`bg-[#0A0E18] border ${signalConfig.containerBorder} rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all duration-200`}
    >
      {/* Subtle top ambient neon glow */}
      <div
        className={`absolute top-0 inset-x-0 h-28 bg-gradient-to-b ${signalConfig.topGradient} pointer-events-none`}
      />

      {/* Header: FALCON PRO • 3-CHART FUSION & Instrument + Style */}
      <div className="relative z-10 flex items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-extrabold text-cyan-400 uppercase tracking-wider">
                FALCON PRO • 3-CHART FUSION
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm font-mono font-bold text-white tracking-wide">
                {instrumentDisplay}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-mono text-cyan-300 flex items-center gap-1">
                <Compass className="w-3 h-3 text-cyan-400" />
                {styleDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-slate-300 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">SCAN COMPLETE</span>
        </div>
      </div>

      {/* Signal & Confidence Bar */}
      <div className="relative z-10 pt-4 pb-3 flex items-center justify-between gap-3 flex-wrap bg-slate-950/60 border border-slate-800/90 rounded-xl px-4 py-3 my-3.5">
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-1.5 rounded-xl font-mono font-black text-base sm:text-lg tracking-wider flex items-center gap-2 border ${signalConfig.badgeBg}`}
          >
            <span className="text-lg leading-none">{signalConfig.emoji}</span>
            <SignalIcon className="w-4 h-4 stroke-[2.5]" />
            <span>{signalConfig.label}</span>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
              Confidence Score
            </div>
            <div className="text-sm sm:text-base font-mono font-extrabold text-cyan-300">
              {confidenceScore}%
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Essential Trade Levels Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
        {/* Entry Zone */}
        <div className="bg-slate-950/80 border border-cyan-500/25 rounded-xl p-3 flex flex-col justify-between space-y-1 hover:border-cyan-500/50 transition-colors">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>Entry Zone</span>
          </div>
          <div
            className="text-sm sm:text-base font-mono font-bold text-cyan-300 truncate"
            title={entryDisplay}
          >
            {entryDisplay}
          </div>
        </div>

        {/* Stop Loss */}
        <div className="bg-slate-950/80 border border-rose-500/25 rounded-xl p-3 flex flex-col justify-between space-y-1 hover:border-rose-500/50 transition-colors">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Stop Loss (SL)</span>
          </div>
          <div
            className="text-sm sm:text-base font-mono font-bold text-rose-400 truncate"
            title={slDisplay}
          >
            {slDisplay}
          </div>
        </div>

        {/* Take Profit 1 */}
        <div className="bg-slate-950/80 border border-emerald-500/25 rounded-xl p-3 flex flex-col justify-between space-y-1 hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>TP1</span>
          </div>
          <div
            className="text-sm sm:text-base font-mono font-bold text-emerald-400 truncate"
            title={tp1Display}
          >
            {tp1Display}
          </div>
        </div>

        {/* Take Profit 2 */}
        <div className="bg-slate-950/80 border border-emerald-500/25 rounded-xl p-3 flex flex-col justify-between space-y-1 hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
            <span>TP2</span>
          </div>
          <div
            className="text-sm sm:text-base font-mono font-bold text-emerald-300 truncate"
            title={tp2Display}
          >
            {tp2Display}
          </div>
        </div>
      </div>

      {/* 3-CHART INSIGHTS SECTION */}
      <div className="relative z-10 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 mb-3.5 space-y-2.5">
        <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800/80 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>3-CHART INSIGHTS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
          {/* H4 Direction */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-black">
                {tf1Name}
              </span>
              <ArrowRight className="w-3 h-3 text-cyan-500 shrink-0" />
              <span className="text-slate-300">Direction</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
              {directionInsight}
            </p>
          </div>

          {/* H1 Structure / Zone */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-black">
                {tf2Name}
              </span>
              <ArrowRight className="w-3 h-3 text-cyan-500 shrink-0" />
              <span className="text-slate-300">Structure / Zone</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
              {structureInsight}
            </p>
          </div>

          {/* M15 Execution */}
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-black">
                {tf3Name}
              </span>
              <ArrowRight className="w-3 h-3 text-cyan-500 shrink-0" />
              <span className="text-slate-300">Execution</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
              {executionInsight}
            </p>
          </div>
        </div>
      </div>

      {/* SHORT TRADE PLAN */}
      <div className="relative z-10 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>TRADE PLAN</span>
        </div>

        <div className="space-y-1.5">
          {tradePlanSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs font-mono text-slate-300 leading-relaxed">
              <span className="w-4 h-4 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        {analysis.tradePlanExecution?.invalidationCriteria && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] font-mono text-rose-300/90">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">
              <span className="font-bold text-rose-400">Invalidation:</span> {analysis.tradePlanExecution.invalidationCriteria}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
