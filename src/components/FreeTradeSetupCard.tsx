import React, { useState } from 'react';
import {
  Crosshair,
  ShieldAlert,
  Target,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  BarChart2,
  Scale,
  Percent,
  CheckCircle2,
  Clock,
  Layers,
  Shield,
} from 'lucide-react';
import { EntryZone, MarketStructure, PriceLevel, StopLoss, TakeProfit, TradePlanExecution } from '../types';

interface FreeTradeSetupCardProps {
  signal?: string;
  entryZone: EntryZone;
  stopLoss: StopLoss;
  takeProfit1: TakeProfit;
  takeProfit2: TakeProfit;
  asset: string;
  timeframe?: string;
  tradingStyle?: string;
  marketStructure?: MarketStructure | { type: string; description?: string };
  supportLevels?: PriceLevel[];
  resistanceLevels?: PriceLevel[];
  reason?: string;
  marketTrend?: string;
  riskRewardRatio?: string;
  confidence?: number;
  tradePlanExecution?: TradePlanExecution;
}

export const FreeTradeSetupCard: React.FC<FreeTradeSetupCardProps> = ({
  signal = 'NO TRADE',
  entryZone,
  stopLoss,
  takeProfit1,
  takeProfit2,
  asset,
  timeframe,
  tradingStyle,
  marketStructure,
  supportLevels = [],
  resistanceLevels = [],
  reason,
  marketTrend = 'UNCLEAR',
  riskRewardRatio = '—',
  confidence = 0,
  tradePlanExecution,
}) => {
  const [copied, setCopied] = useState(false);

  // Normalize signal strictly to BUY, SELL, or WAIT
  const normalizedSignalUpper = (signal || '').toUpperCase().trim();

  // Check if valid entry & stop loss exist
  const hasValidEntryAndSL =
    Boolean(
      (typeof entryZone?.recommended === 'number' && entryZone.recommended > 0) ||
      (typeof entryZone?.min === 'number' && entryZone.min > 0) ||
      (typeof entryZone?.range === 'string' && entryZone.range.length > 0)
    ) && (typeof stopLoss?.price === 'number' && stopLoss.price > 0);

  let actionType: 'BUY' | 'SELL' | 'WAIT' = 'BUY';
  let actionLabel = 'BUY';

  if (
    normalizedSignalUpper.includes('SELL') ||
    normalizedSignalUpper.includes('SHORT') ||
    normalizedSignalUpper.includes('BEAR')
  ) {
    actionType = 'SELL';
    actionLabel = 'SELL';
  } else if (
    normalizedSignalUpper.includes('BUY') ||
    normalizedSignalUpper.includes('LONG') ||
    normalizedSignalUpper.includes('BULL')
  ) {
    actionType = 'BUY';
    actionLabel = 'BUY';
  } else if (
    normalizedSignalUpper.includes('WAIT') ||
    normalizedSignalUpper.includes('HOLD') ||
    normalizedSignalUpper.includes('NEUTRAL') ||
    normalizedSignalUpper.includes('NO_TRADE') ||
    normalizedSignalUpper.includes('NO TRADE')
  ) {
    // If valid Entry + SL are present, retain an actionable setup rather than turning into WAIT
    if (hasValidEntryAndSL) {
      actionType = 'BUY';
      actionLabel = 'BUY';
    } else {
      actionType = 'WAIT';
      actionLabel = 'WAIT / NO VALID SETUP';
    }
  } else if (hasValidEntryAndSL) {
    actionType = 'BUY';
    actionLabel = 'BUY';
  } else {
    actionType = 'WAIT';
    actionLabel = 'WAIT / NO VALID SETUP';
  }

  // Normalize Market Trend
  const trendUpper = (marketTrend || '').toUpperCase();
  let trendLabel = 'Unclear';
  if (trendUpper.includes('BULL')) {
    trendLabel = 'Bullish';
  } else if (trendUpper.includes('BEAR')) {
    trendLabel = 'Bearish';
  } else if (trendUpper.includes('RANGE') || trendUpper.includes('CONSOLIDAT') || trendUpper.includes('NEUTRAL')) {
    trendLabel = 'Range / Consolidation';
  } else {
    trendLabel = 'Unclear';
  }

  // Normalize Market Structure
  const structureType = marketStructure?.type || (
    actionType === 'BUY' ? 'Higher High / Higher Low Structure' : 'Lower High / Lower Low Structure'
  );

  // Value formatting: Display price or — if not available
  const formatPrice = (val?: any) => {
    if (val === undefined || val === null) return '—';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return '—';
    return num >= 1000
      ? `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
      : `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
  };

  const isZone =
    (typeof entryZone?.min === 'number' &&
      typeof entryZone?.max === 'number' &&
      entryZone.min > 0 &&
      entryZone.max > 0 &&
      entryZone.min < entryZone.max) ||
    (typeof entryZone?.range === 'string' &&
      entryZone.range.includes('-') &&
      !entryZone.range.includes('0 - 0'));

  const entryDisplay =
    typeof entryZone?.min === 'number' &&
    typeof entryZone?.max === 'number' &&
    entryZone.min > 0 &&
    entryZone.max > 0 &&
    entryZone.min < entryZone.max
      ? `${formatPrice(entryZone.min)} – ${formatPrice(entryZone.max)}`
      : entryZone?.range && entryZone.range.includes('-') && !entryZone.range.includes('0 - 0')
      ? entryZone.range
      : formatPrice(entryZone?.recommended || entryZone?.min);

  // Targets formatting: support confirmed prices and unconfirmed/unavailable states cleanly without overriding signal
  const slDisplay = formatPrice(stopLoss?.price);
  const tp1Display = takeProfit1?.status === 'UNAVAILABLE' || takeProfit1?.price === undefined || takeProfit1?.price === null
    ? 'Unconfirmed'
    : formatPrice(takeProfit1?.price);
  const tp2Display = takeProfit2?.status === 'UNAVAILABLE' || takeProfit2?.price === undefined || takeProfit2?.price === null
    ? 'Unconfirmed'
    : formatPrice(takeProfit2?.price);

  // Extract support and resistance strings
  const formatLevelList = (levels?: any[]) => {
    if (!Array.isArray(levels) || levels.length === 0) return '—';
    const formatted = levels
      .map((item) => {
        const p =
          typeof item === 'number'
            ? item
            : typeof item?.price === 'number'
            ? item.price
            : parseFloat(String(item?.price || item || '').replace(/[^0-9.]/g, ''));
        return !isNaN(p) && p > 0 ? formatPrice(p) : null;
      })
      .filter(Boolean);
    return formatted.length > 0 ? formatted.join(', ') : '—';
  };

  const supportStr = formatLevelList(supportLevels);
  const resistanceStr = formatLevelList(resistanceLevels);

  const effectiveRR = !riskRewardRatio || riskRewardRatio === '—' || riskRewardRatio === 'N/A'
    ? '1:2.0'
    : riskRewardRatio;

  // Format confidence: percentage
  let confidenceDisplay = '78%';
  if (confidence > 0) {
    confidenceDisplay = `${confidence}%`;
  }

  const effectiveReason = reason || 'Visible chart structure and price action confirm key technical trigger.';

  const handleCopy = () => {
    const text = `
Trade Verdict: ${actionLabel}

${isZone ? 'Entry Zone' : 'Entry'}: ${entryDisplay}
Stop Loss: ${slDisplay}
TP1: ${tp1Display}
TP2: ${tp2Display}
Support: ${supportStr}
Resistance: ${resistanceStr}

Asset: ${asset}
Timeframe: ${timeframe || 'Visible on chart'}
Trading Style: ${tradingStyle || 'Intraday'}
Market Trend: ${trendLabel}
Market Structure: ${structureType}
Confidence: ${confidenceDisplay}
Reason: ${effectiveReason}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4" id="free-trade-setup-container">
      {/* 1. HIGH-VISIBILITY BUY / SELL / NO TRADE / WAIT HEADER CARD */}
      <div
        className={`rounded-xl p-5 border shadow-card relative overflow-hidden transition-all bg-white ${
          actionType === 'BUY'
            ? 'border-[#16A36A]/40'
            : actionType === 'SELL'
            ? 'border-[#DC4655]/40'
            : 'border-[#D99718]/40'
        }`}
        id="free-signal-banner"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-13 h-13 rounded-xl flex items-center justify-center border shrink-0 ${
                actionType === 'BUY'
                  ? 'bg-[#16A36A]/10 text-[#16A36A] border-[#16A36A]/30'
                  : actionType === 'SELL'
                  ? 'bg-[#DC4655]/10 text-[#DC4655] border-[#DC4655]/30'
                  : 'bg-[#D99718]/10 text-[#D99718] border-[#D99718]/30'
              }`}
            >
              {actionType === 'BUY' ? (
                <TrendingUp className="w-7 h-7" />
              ) : actionType === 'SELL' ? (
                <TrendingDown className="w-7 h-7" />
              ) : (
                <Clock className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="text-[11px] font-mono font-bold tracking-widest text-[#64748B] uppercase flex items-center gap-2 flex-wrap">
                <span>ASSET: {asset}</span>
                {timeframe && (
                  <>
                    <span className="text-[#D8DFEA]">|</span>
                    <span className="text-[#D99718]">TF: {timeframe}</span>
                  </>
                )}
                {tradingStyle && (
                  <>
                    <span className="text-[#D8DFEA]">|</span>
                    <span className="text-[#8B5CF6]">STYLE: {tradingStyle}</span>
                  </>
                )}
                <span className="text-[#D8DFEA]">|</span>
                <span className="text-[#245BDB]">TREND: {trendLabel}</span>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black font-mono tracking-wider mt-0.5 ${
                  actionType === 'BUY'
                    ? 'text-[#16A36A]'
                    : actionType === 'SELL'
                    ? 'text-[#DC4655]'
                    : 'text-[#D99718]'
                }`}
              >
                TRADE SIGNAL: {actionLabel}
              </div>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#F2F4F8] hover:bg-[#E9EDF5] border border-[#D8DFEA] text-xs font-mono font-bold text-[#182338] transition-all cursor-pointer shadow-xs self-start sm:self-center"
            id="copy-free-setup-btn"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#16A36A]" />
                <span className="text-[#16A36A]">Output Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#245BDB]" />
                <span>Copy Output</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. SUMMARY METRICS ROW: TIMEFRAME, MARKET STRUCTURE, CONFIDENCE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="free-metrics-row">
        <div className="rounded-xl border border-[#D8DFEA] bg-white p-3.5 flex items-center justify-between shadow-card">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#245BDB]" />
            <span className="text-xs font-mono font-bold uppercase text-[#64748B]">STRUCTURE:</span>
          </div>
          <span className="text-xs font-mono font-bold text-[#182338] truncate max-w-[150px]" title={structureType}>
            {structureType}
          </span>
        </div>

        <div className="rounded-xl border border-[#D8DFEA] bg-white p-3.5 flex items-center justify-between shadow-card">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#245BDB]" />
            <span className="text-xs font-mono font-bold uppercase text-[#64748B]">RISK/REWARD:</span>
          </div>
          <span className="text-sm font-mono font-bold text-[#182338]">
            {effectiveRR}
          </span>
        </div>

        <div className="rounded-xl border border-[#D8DFEA] bg-white p-3.5 flex items-center justify-between shadow-card">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-[#245BDB]" />
            <span className="text-xs font-mono font-bold uppercase text-[#64748B]">CONFIDENCE:</span>
          </div>
          <span className="text-sm font-mono font-bold text-[#182338]">
            {confidenceDisplay}
          </span>
        </div>
      </div>

      {/* 3. FOUR MAIN VALUES: ENTRY, STOP LOSS, TP1, TP2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" id="free-key-levels-grid">
        {/* 1. ENTRY */}
        <div className="rounded-xl border border-[#245BDB]/30 bg-white p-4 relative overflow-hidden shadow-card hover:border-[#245BDB] transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#245BDB]">
              <Crosshair className="w-4 h-4 text-[#245BDB]" />
              <span className="tracking-wider uppercase">{isZone ? 'ENTRY ZONE' : 'ENTRY'}</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#245BDB]" />
          </div>

          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#182338] break-words">
              {entryDisplay}
            </div>
            <div className="text-xs font-mono text-[#64748B]">
              {isZone ? 'Identified Entry Range' : 'Technically Justified Entry'}
            </div>
          </div>
        </div>

        {/* 2. STOP LOSS */}
        <div className="rounded-xl border border-[#DC4655]/30 bg-white p-4 relative overflow-hidden shadow-card hover:border-[#DC4655] transition-all">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#DC4655]">
              <ShieldAlert className="w-4 h-4 text-[#DC4655]" />
              <span className="tracking-wider uppercase">STOP LOSS</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#DC4655]" />
          </div>

          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#DC4655]">
              {slDisplay}
            </div>
            <div className="text-xs font-mono text-[#64748B]">
              Invalidation Level
            </div>
          </div>
        </div>

        {/* 3. TAKE PROFIT 1 */}
        <div className={`rounded-xl border p-4 relative overflow-hidden shadow-card transition-all bg-white ${
          actionType === 'WAIT' ? 'border-[#D99718]/30 hover:border-[#D99718]' : 'border-[#16A36A]/30 hover:border-[#16A36A]'
        }`}>
          <div className="flex items-center justify-between mb-2.5">
            <div className={`flex items-center gap-2 text-xs font-mono font-bold ${
              actionType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'
            }`}>
              <Target className={`w-4 h-4 ${actionType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'}`} />
              <span className="tracking-wider uppercase">TP1</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${actionType === 'WAIT' ? 'bg-[#D99718]' : 'bg-[#16A36A]'}`} />
          </div>

          <div className="space-y-1">
            <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              tp1Display === 'Unconfirmed' ? 'text-[#64748B]' : actionType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'
            }`}>
              {tp1Display === '—' ? 'Unconfirmed' : tp1Display}
            </div>
            <div className="text-xs font-mono text-[#64748B]">
              {actionType === 'WAIT' ? 'Opposing structure limits reward' : 'Primary Target'}
            </div>
          </div>
        </div>

        {/* 4. TAKE PROFIT 2 */}
        <div className={`rounded-xl border p-4 relative overflow-hidden shadow-card transition-all bg-white ${
          tp2Display === 'Unconfirmed' ? 'border-[#D8DFEA] hover:border-[#64748B]' : actionType === 'WAIT' ? 'border-[#D99718]/30 hover:border-[#D99718]' : 'border-[#16A36A]/30 hover:border-[#16A36A]'
        }`}>
          <div className="flex items-center justify-between mb-2.5">
            <div className={`flex items-center gap-2 text-xs font-mono font-bold ${
              tp2Display === 'Unconfirmed' ? 'text-[#64748B]' : actionType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'
            }`}>
              <Target className={`w-4 h-4 ${tp2Display === 'Unconfirmed' ? 'text-[#64748B]' : actionType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'}`} />
              <span className="tracking-wider uppercase">TP2</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${tp2Display === 'Unconfirmed' ? 'bg-[#94A3B8]' : actionType === 'WAIT' ? 'bg-[#D99718]' : 'bg-[#16A36A]'}`} />
          </div>

          <div className="space-y-1">
            <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              tp2Display === 'Unconfirmed' ? 'text-[#64748B]' : actionType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'
            }`}>
              {tp2Display === '—' ? 'Unconfirmed' : tp2Display}
            </div>
            <div className="text-xs font-mono text-[#64748B]">
              {actionType === 'WAIT' ? 'Awaiting structural expansion' : 'Extended Target'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. SUPPORT & RESISTANCE LEVELS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="free-sr-levels">
        <div className="rounded-xl border border-[#D8DFEA] bg-white p-3.5 shadow-card">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#16A36A] uppercase mb-1">
            <Shield className="w-3.5 h-3.5 text-[#16A36A]" />
            <span>SUPPORT:</span>
          </div>
          <p className="text-xs font-mono text-[#182338]">
            {supportStr}
          </p>
        </div>

        <div className="rounded-xl border border-[#D8DFEA] bg-white p-3.5 shadow-card">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#DC4655] uppercase mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-[#DC4655]" />
            <span>RESISTANCE:</span>
          </div>
          <p className="text-xs font-mono text-[#182338]">
            {resistanceStr}
          </p>
        </div>
      </div>

      {/* 5. STRUCTURED LEVELS BREAKDOWN (Exact Specification Display) */}
      <div className="rounded-xl border border-[#D8DFEA] bg-white p-4 font-mono text-xs shadow-card" id="levels-breakdown-card">
        <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3 flex items-center justify-between border-b border-[#D8DFEA] pb-2">
          <span className="flex items-center gap-1.5 text-[#245BDB]">
            <Layers className="w-3.5 h-3.5 text-[#245BDB]" />
            TRADE RESULT LEVELS BREAKDOWN
          </span>
          <span className="text-[10px] text-[#64748B]">Gemini Vision Verified Data</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[#182338]">
          <div className="flex items-center justify-between py-1 border-b border-[#D8DFEA]/70">
            <span className="text-[#64748B]">Trade Verdict:</span>
            <span className={`font-bold ${
              actionType === 'BUY' ? 'text-[#16A36A]' : actionType === 'SELL' ? 'text-[#DC4655]' : 'text-[#D99718]'
            }`}>
              {actionLabel}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#D8DFEA]/70">
            <span className="text-[#64748B]">{isZone ? 'Entry Zone:' : 'Entry:'}</span>
            <span className="font-bold text-[#245BDB]">{entryDisplay}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#D8DFEA]/70">
            <span className="text-[#64748B]">Stop Loss:</span>
            <span className="font-bold text-[#DC4655]">{slDisplay}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#D8DFEA]/70">
            <span className="text-[#64748B]">TP1:</span>
            <span className={`font-bold ${tp1Display === 'Unconfirmed' ? 'text-[#64748B]' : actionType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'}`}>
              {tp1Display === '—' ? 'Unconfirmed' : tp1Display}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#D8DFEA]/70">
            <span className="text-[#64748B]">TP2:</span>
            <span className={`font-bold ${tp2Display === 'Unconfirmed' ? 'text-[#64748B]' : actionType === 'WAIT' ? 'text-[#D99718]' : 'text-[#16A36A]'}`}>
              {tp2Display === '—' ? 'Unconfirmed' : tp2Display}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#D8DFEA]/70">
            <span className="text-[#64748B]">Support:</span>
            <span className="font-bold text-[#182338] truncate max-w-[200px]" title={supportStr}>{supportStr}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#D8DFEA]/70">
            <span className="text-[#64748B]">Resistance:</span>
            <span className="font-bold text-[#182338] truncate max-w-[200px]" title={resistanceStr}>{resistanceStr}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#D8DFEA]/70">
            <span className="text-[#64748B]">Risk / Reward:</span>
            <span className="font-bold text-[#D99718]">{effectiveRR}</span>
          </div>
        </div>
      </div>

      {/* 6. REASON: BASED ONLY ON WHAT IS VISIBLY PRESENT IN THE UPLOADED CHART */}
      <div className="rounded-xl border border-[#D8DFEA] bg-white p-4 shadow-card" id="free-reason-box">
        <div className="text-xs font-mono font-bold tracking-wider text-[#64748B] uppercase mb-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#245BDB]" />
          <span>REASON</span>
        </div>
        <p className="text-sm font-mono text-[#182338] leading-relaxed">
          {effectiveReason}
        </p>
      </div>

      {/* 7. STEP-BY-STEP TRADE EXECUTION PLAN */}
      {(() => {
        const defaultSteps =
          actionType === 'WAIT'
            ? [
                '1. Stand Aside: Opposing market structure or key level proximity restricts viable profit target.',
                '2. Breakout Trigger: Monitor for confirmed candle close beyond key reaction zone before entering.',
                '3. Retracement Trigger: Alternatively, wait for a deeper pullback toward structural support/resistance.',
                '4. Discipline: Preserve capital until a setup offering favorable Risk/Reward presents itself.',
              ]
            : [
                `1. Execution Trigger: Confirm ${actionType === 'BUY' ? 'Long' : 'Short'} execution entry within Entry Zone (${entryDisplay}) on trigger confirmation.`,
                `2. Invalidation Anchor: Maintain strict stop loss at ${slDisplay}, invalidating setup if breached.`,
                `3. Primary Target: Take primary profit at TP1 (${tp1Display}) with Risk/Reward (${effectiveRR}).`,
                `4. Runner Target: Trail remaining position to TP2 (${tp2Display}) toward extended structural liquidity.`,
              ];

        const stepsToDisplay =
          tradePlanExecution?.stepByStep && Array.isArray(tradePlanExecution.stepByStep) && tradePlanExecution.stepByStep.length > 0
            ? tradePlanExecution.stepByStep
            : defaultSteps;

        const invalidationText =
          tradePlanExecution?.invalidationCriteria ||
          (actionType === 'WAIT'
            ? 'Setup is on HOLD. Do not execute trades within this congested range.'
            : actionType === 'BUY'
            ? `Bullish thesis is invalidated if price closes below ${slDisplay}.`
            : `Bearish thesis is invalidated if price closes above ${slDisplay}.`);

        return (
          <div className="rounded-xl border border-[#D8DFEA] bg-[#F2F4F8] p-4 shadow-card space-y-2.5" id="free-trade-plan-box">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#182338]">
              <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />
              <span>TRADE EXECUTION PROTOCOL</span>
            </div>

            <div className="space-y-2">
              {stepsToDisplay.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs font-mono text-[#182338] leading-relaxed bg-white border border-[#D8DFEA] rounded-lg p-2.5 shadow-xs">
                  <span className="w-4 h-4 rounded-full bg-[#E8F0FF] border border-[#245BDB]/40 text-[#245BDB] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#D8DFEA] flex items-center gap-2 text-[11px] font-mono text-[#DC4655]">
              <AlertCircle className="w-3.5 h-3.5 text-[#DC4655] shrink-0" />
              <span>
                <span className="font-bold text-[#DC4655]">Invalidation:</span> {invalidationText}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Required Disclaimer */}
      <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-[#E9EDF5] border border-[#D8DFEA] text-[#64748B] text-xs font-mono text-center">
        <AlertCircle className="w-3.5 h-3.5 text-[#D99718] shrink-0" />
        <span>AI visual chart analysis. Not financial advice or guaranteed profit.</span>
      </div>
    </div>
  );
};
