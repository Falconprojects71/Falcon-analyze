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
  const tp1Display = analysis.takeProfit1?.status === 'UNAVAILABLE' || analysis.takeProfit1?.price === undefined || analysis.takeProfit1?.price === null
    ? 'Unconfirmed'
    : formatPrice(analysis.takeProfit1?.price);
  const tp2Display = analysis.takeProfit2?.status === 'UNAVAILABLE' || analysis.takeProfit2?.price === undefined || analysis.takeProfit2?.price === null
    ? 'Unconfirmed'
    : formatPrice(analysis.takeProfit2?.price);

  // Timeframe Insights derivation dynamically from analysis multiTimeframeAnalysis or compound timeframe
  const mtf = analysis.multiTimeframeAnalysis;
  const splitTimeframes = typeof analysis.timeframe === 'string'
    ? analysis.timeframe.split(/[•·,-]/).map((t) => t.trim()).filter(Boolean)
    : [];

  const tf1Name = mtf?.chart1?.timeframe || splitTimeframes[0] || 'Chart 1';
  const tf2Name = mtf?.chart2?.timeframe || splitTimeframes[1] || 'Chart 2';
  const tf3Name = mtf?.chart3?.timeframe || splitTimeframes[2] || 'Chart 3';

  const c1S1 = formatPrice(mtf?.chart1?.support1?.price);
  const c1R1 = formatPrice(mtf?.chart1?.resistance1?.price);
  const c2S1 = formatPrice(mtf?.chart2?.support1?.price);
  const c2R1 = formatPrice(mtf?.chart2?.resistance1?.price);
  const c3S1 = formatPrice(mtf?.chart3?.support1?.price);
  const c3R1 = formatPrice(mtf?.chart3?.resistance1?.price);

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
      return analysis.tradePlanExecution.stepByStep;
    }

    if (signalType === 'WAIT') {
      return [
        `1. Stand Aside: Opposing market structure or key level proximity restricts viable profit target.`,
        `2. Breakout Trigger: Monitor for confirmed candle close beyond key reaction zone before entering.`,
        `3. Retracement Trigger: Alternatively, wait for a deeper pullback toward structural support/resistance.`,
        `4. Discipline: Preserve capital until a setup offering favorable Risk/Reward presents itself.`,
      ];
    }

    const actionWord = signalType === 'BUY' ? 'Long' : 'Short';
    return [
      `1. Execution Trigger: Confirm ${actionWord} order within Entry Zone (${entryDisplay}) upon lower timeframe confirmation.`,
      `2. Invalidation Anchor: Set strict Stop Loss at ${slDisplay}. Invalidate idea immediately if breached.`,
      `3. Primary Target: Take primary profit at TP1 (${tp1Display}) with favorable R:R (${analysis.riskRewardRatio || '1:1.5+'}).`,
      `4. Runner Target: Trail runner position to TP2 (${tp2Display}) toward extended structural liquidity.`,
    ];
  };

  const tradePlanSteps = getTradePlanSteps();

  // Signal Styles
  const signalConfig = {
    BUY: {
      label: 'BUY',
      emoji: '🟢',
      accentText: 'text-[#16A36A]',
      badgeBg:
        'bg-[#16A36A]/10 text-[#16A36A] border-[#16A36A]/30 shadow-xs',
      dotColor: 'bg-[#16A36A]',
      containerBorder: 'border-[#16A36A]/40 hover:border-[#16A36A]',
      Icon: TrendingUp,
    },
    SELL: {
      label: 'SELL',
      emoji: '🔴',
      accentText: 'text-[#DC4655]',
      badgeBg:
        'bg-[#DC4655]/10 text-[#DC4655] border-[#DC4655]/30 shadow-xs',
      dotColor: 'bg-[#DC4655]',
      containerBorder: 'border-[#DC4655]/40 hover:border-[#DC4655]',
      Icon: TrendingDown,
    },
    WAIT: {
      label: 'WAIT',
      emoji: '⚪',
      accentText: 'text-[#D99718]',
      badgeBg:
        'bg-[#D99718]/10 text-[#D99718] border-[#D99718]/30 shadow-xs',
      dotColor: 'bg-[#D99718]',
      containerBorder: 'border-[#D8DFEA] hover:border-[#245BDB]',
      Icon: Clock,
    },
  }[signalType];

  const SignalIcon = signalConfig.Icon;

  return (
    <div
      id="pro-result-card"
      className={`bg-white border ${signalConfig.containerBorder} rounded-xl p-4 sm:p-5 shadow-card relative overflow-hidden transition-all duration-200`}
    >
      {/* Header: FALCON PRO • 3-CHART FUSION & Instrument + Style */}
      <div className="relative z-10 flex items-center justify-between gap-3 pb-3.5 border-b border-[#D8DFEA] flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#E8F0FF] border border-[#D8DFEA] text-[#245BDB] shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-extrabold text-[#245BDB] uppercase tracking-wider">
                FALCON PRO • 3-CHART FUSION
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm font-mono font-bold text-[#182338] tracking-wide">
                {instrumentDisplay}
              </span>
              <span className="text-[#D8DFEA]">•</span>
              <span className="text-xs font-mono text-[#64748B] flex items-center gap-1">
                <Compass className="w-3 h-3 text-[#245BDB]" />
                {styleDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F2F4F8] border border-[#D8DFEA] text-[11px] font-mono text-[#182338] shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#16A36A]" />
          <span className="font-semibold text-[#182338]">SCAN COMPLETE</span>
        </div>
      </div>

      {/* Signal & Confidence Bar */}
      <div className="relative z-10 pt-4 pb-3 flex items-center justify-between gap-3 flex-wrap bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl px-4 py-3 my-3.5">
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-1.5 rounded-lg font-mono font-bold text-base sm:text-lg tracking-wider flex items-center gap-2 border ${signalConfig.badgeBg}`}
          >
            <span className="text-lg leading-none">{signalConfig.emoji}</span>
            <SignalIcon className="w-4 h-4 stroke-[2.5]" />
            <span>{signalConfig.label}</span>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase text-[#64748B] tracking-wider">
              Confidence Score
            </div>
            <div className="text-sm sm:text-base font-mono font-extrabold text-[#182338]">
              {confidenceScore}%
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-white border border-[#D8DFEA] flex items-center justify-center text-[#245BDB] font-mono font-bold text-xs shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Essential Trade Levels Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
        {/* Entry Zone */}
        <div className="bg-white border border-[#245BDB]/30 rounded-xl p-3 flex flex-col justify-between space-y-1 hover:border-[#245BDB] transition-colors shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#64748B] uppercase tracking-wider">
            <Target className="w-3.5 h-3.5 text-[#245BDB]" />
            <span>Entry Zone</span>
          </div>
          <div
            className="text-sm sm:text-base font-mono font-bold text-[#245BDB] truncate"
            title={entryDisplay}
          >
            {entryDisplay}
          </div>
        </div>

        {/* Stop Loss */}
        <div className="bg-white border border-[#DC4655]/30 rounded-xl p-3 flex flex-col justify-between space-y-1 hover:border-[#DC4655] transition-colors shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#64748B] uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-[#DC4655]" />
            <span>Stop Loss (SL)</span>
          </div>
          <div
            className="text-sm sm:text-base font-mono font-bold text-[#DC4655] truncate"
            title={slDisplay}
          >
            {slDisplay}
          </div>
        </div>

        {/* Take Profit 1 */}
        <div className={`bg-white border rounded-xl p-3 flex flex-col justify-between space-y-1 transition-colors shadow-xs ${
          tp1Display === 'Unconfirmed' ? 'border-[#D8DFEA] hover:border-[#64748B]' : signalType === 'WAIT' ? 'border-[#D99718]/30 hover:border-[#D99718]' : 'border-[#16A36A]/30 hover:border-[#16A36A]'
        }`}>
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#64748B] uppercase tracking-wider">
            <TrendingUp className={`w-3.5 h-3.5 ${tp1Display === 'Unconfirmed' ? 'text-[#64748B]' : signalType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'}`} />
            <span>TP1</span>
          </div>
          <div
            className={`text-sm sm:text-base font-mono font-bold truncate ${
              tp1Display === 'Unconfirmed' ? 'text-[#64748B]' : signalType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'
            }`}
            title={tp1Display}
          >
            {tp1Display}
          </div>
        </div>

        {/* Take Profit 2 */}
        <div className={`bg-white border rounded-xl p-3 flex flex-col justify-between space-y-1 transition-colors shadow-xs ${
          tp2Display === 'Unconfirmed' ? 'border-[#D8DFEA] hover:border-[#64748B]' : signalType === 'WAIT' ? 'border-[#D99718]/30 hover:border-[#D99718]' : 'border-[#16A36A]/30 hover:border-[#16A36A]'
        }`}>
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#64748B] uppercase tracking-wider">
            <TrendingUp className={`w-3.5 h-3.5 ${tp2Display === 'Unconfirmed' ? 'text-[#64748B]' : signalType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'}`} />
            <span>TP2</span>
          </div>
          <div
            className={`text-sm sm:text-base font-mono font-bold truncate ${
              tp2Display === 'Unconfirmed' ? 'text-[#64748B]' : signalType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'
            }`}
            title={tp2Display}
          >
            {tp2Display}
          </div>
        </div>
      </div>

      {/* 3-CHART INSIGHTS SECTION */}
      <div className="relative z-10 bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl p-3.5 mb-3.5 space-y-2.5">
        <div className="flex items-center gap-2 pb-1.5 border-b border-[#D8DFEA] text-xs font-mono font-bold uppercase tracking-wider text-[#182338]">
          <Zap className="w-3.5 h-3.5 text-[#D99718]" />
          <span>3-CHART INSIGHTS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
          {/* Chart 1 Direction & Levels */}
          <div className="p-2.5 rounded-lg bg-white border border-[#D8DFEA] flex flex-col justify-between space-y-2 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[#182338] font-bold text-[11px]">
                <span>Direction</span>
              </div>
              <p className="text-[#64748B] text-[11px] leading-relaxed line-clamp-2">
                {directionInsight}
              </p>
            </div>
            {(c1S1 !== '—' || c1R1 !== '—') && (
              <div className="pt-2 border-t border-[#D8DFEA] flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1" title={mtf?.chart1?.support1?.rationale || 'Chart 1 Support S1'}>
                  <span className="text-[10px] text-[#64748B] font-semibold">S1:</span>
                  <span className="font-bold text-[#16A36A]">{c1S1}</span>
                </div>
                <div className="flex items-center gap-1" title={mtf?.chart1?.resistance1?.rationale || 'Chart 1 Resistance R1'}>
                  <span className="text-[10px] text-[#64748B] font-semibold">R1:</span>
                  <span className="font-bold text-[#DC4655]">{c1R1}</span>
                </div>
              </div>
            )}
          </div>

          {/* Chart 2 Structure / Zone & Levels */}
          <div className="p-2.5 rounded-lg bg-white border border-[#D8DFEA] flex flex-col justify-between space-y-2 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[#182338] font-bold text-[11px]">
                <span>Structure</span>
              </div>
              <p className="text-[#64748B] text-[11px] leading-relaxed line-clamp-2">
                {structureInsight}
              </p>
            </div>
            {(c2S1 !== '—' || c2R1 !== '—') && (
              <div className="pt-2 border-t border-[#D8DFEA] flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1" title={mtf?.chart2?.support1?.rationale || 'Chart 2 Support S1'}>
                  <span className="text-[10px] text-[#64748B] font-semibold">S1:</span>
                  <span className="font-bold text-[#16A36A]">{c2S1}</span>
                </div>
                <div className="flex items-center gap-1" title={mtf?.chart2?.resistance1?.rationale || 'Chart 2 Resistance R1'}>
                  <span className="text-[10px] text-[#64748B] font-semibold">R1:</span>
                  <span className="font-bold text-[#DC4655]">{c2R1}</span>
                </div>
              </div>
            )}
          </div>

          {/* Chart 3 Execution & Levels */}
          <div className="p-2.5 rounded-lg bg-white border border-[#D8DFEA] flex flex-col justify-between space-y-2 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[#182338] font-bold text-[11px]">
                <span>Execution</span>
              </div>
              <p className="text-[#64748B] text-[11px] leading-relaxed line-clamp-2">
                {executionInsight}
              </p>
            </div>
            {(c3S1 !== '—' || c3R1 !== '—') && (
              <div className="pt-2 border-t border-[#D8DFEA] flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1" title={mtf?.chart3?.support1?.rationale || 'Chart 3 Support S1'}>
                  <span className="text-[10px] text-[#64748B] font-semibold">S1:</span>
                  <span className="font-bold text-[#16A36A]">{c3S1}</span>
                </div>
                <div className="flex items-center gap-1" title={mtf?.chart3?.resistance1?.rationale || 'Chart 3 Resistance R1'}>
                  <span className="text-[10px] text-[#64748B] font-semibold">R1:</span>
                  <span className="font-bold text-[#DC4655]">{c3R1}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Combined Major Confluence Levels if available */}
        {(mtf?.combinedMajorSupport?.price || mtf?.combinedMajorResistance?.price) && (
          <div className="pt-2 border-t border-[#D8DFEA] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <span className="text-[#64748B] text-[10px]">COMBINED S/R CONFLUENCE:</span>
            <div className="flex items-center gap-3">
              {mtf?.combinedMajorSupport?.price && (
                <span className="text-[#16A36A] text-[11px]">
                  Major Support (Demand): <strong>{formatPrice(mtf.combinedMajorSupport.price)}</strong>
                </span>
              )}
              {mtf?.combinedMajorResistance?.price && (
                <span className="text-[#DC4655] text-[11px]">
                  Major Resistance (Supply): <strong>{formatPrice(mtf.combinedMajorResistance.price)}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SHORT TRADE PLAN */}
      <div className="relative z-10 bg-[#F2F4F8] border border-[#D8DFEA] rounded-xl p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#182338]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" />
          <span>TRADE PLAN</span>
        </div>

        <div className="space-y-1.5">
          {tradePlanSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs font-mono text-[#182338] leading-relaxed">
              <span className="w-4 h-4 rounded-full bg-white border border-[#D8DFEA] text-[#245BDB] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-xs">
                {idx + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        {analysis.tradePlanExecution?.invalidationCriteria && (
          <div className="pt-2 border-t border-[#D8DFEA] flex items-center gap-2 text-[11px] font-mono text-[#DC4655]">
            <AlertCircle className="w-3.5 h-3.5 text-[#DC4655] shrink-0" />
            <span className="truncate">
              <span className="font-bold text-[#DC4655]">Invalidation:</span> {analysis.tradePlanExecution.invalidationCriteria}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
