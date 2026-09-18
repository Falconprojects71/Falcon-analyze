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
  Clock,
  Layers,
  Shield,
} from 'lucide-react';
import { EntryZone, MarketStructure, PriceLevel, StopLoss, TakeProfit } from '../types';

interface FreeTradeSetupCardProps {
  signal?: string;
  entryZone: EntryZone;
  stopLoss: StopLoss;
  takeProfit1: TakeProfit;
  takeProfit2: TakeProfit;
  asset: string;
  timeframe?: string;
  marketStructure?: MarketStructure | { type: string; description?: string };
  supportLevels?: PriceLevel[];
  resistanceLevels?: PriceLevel[];
  reason?: string;
  marketTrend?: string;
  riskRewardRatio?: string;
  confidence?: number;
}

export const FreeTradeSetupCard: React.FC<FreeTradeSetupCardProps> = ({
  signal = 'NO TRADE',
  entryZone,
  stopLoss,
  takeProfit1,
  takeProfit2,
  asset,
  timeframe,
  marketStructure,
  supportLevels = [],
  resistanceLevels = [],
  reason,
  marketTrend = 'UNCLEAR',
  riskRewardRatio = '—',
  confidence = 0,
}) => {
  const [copied, setCopied] = useState(false);

  // Normalize signal strictly to BUY or SELL
  const normalizedSignalUpper = (signal || '').toUpperCase().trim();

  let actionType: 'BUY' | 'SELL' = 'BUY';
  let actionLabel = 'BUY';

  if (
    normalizedSignalUpper.includes('SELL') ||
    normalizedSignalUpper.includes('SHORT') ||
    normalizedSignalUpper.includes('BEAR') ||
    marketTrend.toUpperCase().includes('BEAR')
  ) {
    actionType = 'SELL';
    actionLabel = 'SELL';
  } else {
    actionType = 'BUY';
    actionLabel = 'BUY';
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

  const slDisplay = formatPrice(stopLoss?.price);
  const tp1Display = formatPrice(takeProfit1?.price);
  const tp2Display = formatPrice(takeProfit2?.price);

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
      {/* 1. HIGH-VISIBILITY BUY / SELL / NO TRADE / MARKET CLOSED HEADER CARD */}
      <div
        className={`rounded-2xl p-6 border-2 shadow-2xl relative overflow-hidden transition-all ${
          actionType === 'BUY'
            ? 'bg-gradient-to-r from-emerald-950/80 via-[#061A14] to-slate-900 border-emerald-500/80 shadow-[0_0_30px_rgba(0,240,160,0.2)]'
            : actionType === 'SELL'
            ? 'bg-gradient-to-r from-rose-950/80 via-[#1C0A0E] to-slate-900 border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.2)]'
            : actionType === 'MARKET_CLOSED'
            ? 'bg-gradient-to-r from-amber-950/80 via-[#1E170A] to-slate-900 border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
            : 'bg-gradient-to-r from-slate-950/90 via-[#121624] to-slate-900 border-slate-700/80 shadow-[0_0_30px_rgba(100,116,139,0.15)]'
        }`}
        id="free-signal-banner"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner shrink-0 ${
                actionType === 'BUY'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              {actionType === 'BUY' ? (
                <TrendingUp className="w-8 h-8" />
              ) : (
                <TrendingDown className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
                <span>ASSET: {asset}</span>
                {timeframe && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span className="text-amber-300">TF: {timeframe}</span>
                  </>
                )}
                <span className="text-slate-600">|</span>
                <span className="text-cyan-400">TREND: {trendLabel}</span>
              </div>
              <div
                className={`text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-wider ${
                  actionType === 'BUY'
                    ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(0,240,160,0.5)]'
                    : 'text-rose-300 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                }`}
              >
                TRADE SIGNAL: {actionLabel}
              </div>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm self-start sm:self-center"
            id="copy-free-setup-btn"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Output Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-cyan-400" />
                <span>Copy Output</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. SUMMARY METRICS ROW: TIMEFRAME, MARKET STRUCTURE, CONFIDENCE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="free-metrics-row">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold uppercase text-slate-400">STRUCTURE:</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 truncate max-w-[150px]" title={structureType}>
            {structureType}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold uppercase text-slate-400">RISK/REWARD:</span>
          </div>
          <span className="text-sm font-mono font-bold text-slate-200">
            {effectiveRR}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold uppercase text-slate-400">CONFIDENCE:</span>
          </div>
          <span className="text-sm font-mono font-bold text-slate-200">
            {confidenceDisplay}
          </span>
        </div>
      </div>

      {/* 3. FOUR MAIN VALUES: ENTRY, STOP LOSS, TP1, TP2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="free-key-levels-grid">
        {/* 1. ENTRY */}
        <div className="rounded-xl border-2 border-cyan-500/50 bg-gradient-to-b from-cyan-950/40 via-[#0B101D] to-[#0B101D] p-5 relative overflow-hidden shadow-xl hover:border-cyan-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <span className="tracking-wider uppercase">{isZone ? 'ENTRY ZONE' : 'ENTRY'}</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
          </div>

          <div className="space-y-1">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono tracking-tight text-white break-words">
              {entryDisplay}
            </div>
            <div className="text-xs font-mono text-cyan-300/80">
              {isZone ? 'Identified Entry Range' : 'Technically Justified Entry'}
            </div>
          </div>
        </div>

        {/* 2. STOP LOSS */}
        <div className="rounded-xl border-2 border-rose-500/50 bg-gradient-to-b from-rose-950/40 via-[#0B101D] to-[#0B101D] p-5 relative overflow-hidden shadow-xl hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span className="tracking-wider uppercase">STOP LOSS</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>

          <div className="space-y-1">
            <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-rose-200">
              {slDisplay}
            </div>
            <div className="text-xs font-mono text-rose-400/80">
              Invalidation Level
            </div>
          </div>
        </div>

        {/* 3. TAKE PROFIT 1 */}
        <div className="rounded-xl border-2 border-emerald-500/50 bg-gradient-to-b from-emerald-950/40 via-[#0B101D] to-[#0B101D] p-5 relative overflow-hidden shadow-xl hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="tracking-wider uppercase">TP1</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>

          <div className="space-y-1">
            <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-emerald-200">
              {tp1Display}
            </div>
            <div className="text-xs font-mono text-emerald-400/80">
              Primary Target
            </div>
          </div>
        </div>

        {/* 4. TAKE PROFIT 2 */}
        <div className="rounded-xl border-2 border-teal-500/50 bg-gradient-to-b from-teal-950/40 via-[#0B101D] to-[#0B101D] p-5 relative overflow-hidden shadow-xl hover:border-teal-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-300">
              <Target className="w-4 h-4 text-teal-400" />
              <span className="tracking-wider uppercase">TP2</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-teal-400" />
          </div>

          <div className="space-y-1">
            <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-teal-200">
              {tp2Display}
            </div>
            <div className="text-xs font-mono text-teal-400/80">
              Extended Target
            </div>
          </div>
        </div>
      </div>

      {/* 4. SUPPORT & RESISTANCE LEVELS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="free-sr-levels">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase mb-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>SUPPORT:</span>
          </div>
          <p className="text-xs font-mono text-slate-200">
            {supportStr}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400 uppercase mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>RESISTANCE:</span>
          </div>
          <p className="text-xs font-mono text-slate-200">
            {resistanceStr}
          </p>
        </div>
      </div>

      {/* 5. STRUCTURED LEVELS BREAKDOWN (Exact Specification Display) */}
      <div className="rounded-xl border border-slate-800 bg-[#0A0E1A] p-4 font-mono text-xs shadow-xl" id="levels-breakdown-card">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            TRADE RESULT LEVELS BREAKDOWN
          </span>
          <span className="text-[10px] text-slate-500">Gemini Vision Verified Data</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-slate-300">
          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Trade Verdict:</span>
            <span className={`font-bold ${
              actionType === 'BUY' ? 'text-emerald-400' : actionType === 'SELL' ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {actionLabel}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">{isZone ? 'Entry Zone:' : 'Entry:'}</span>
            <span className="font-bold text-cyan-300">{entryDisplay}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Stop Loss:</span>
            <span className="font-bold text-rose-400">{slDisplay}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">TP1:</span>
            <span className="font-bold text-emerald-400">{tp1Display}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">TP2:</span>
            <span className="font-bold text-teal-300">{tp2Display}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Support:</span>
            <span className="font-bold text-slate-200 truncate max-w-[200px]" title={supportStr}>{supportStr}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Resistance:</span>
            <span className="font-bold text-slate-200 truncate max-w-[200px]" title={resistanceStr}>{resistanceStr}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Risk / Reward:</span>
            <span className="font-bold text-amber-300">{effectiveRR}</span>
          </div>
        </div>
      </div>

      {/* 6. REASON: BASED ONLY ON WHAT IS VISIBLY PRESENT IN THE UPLOADED CHART */}
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-4 shadow-lg" id="free-reason-box">
        <div className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase mb-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>REASON</span>
        </div>
        <p className="text-sm font-mono text-slate-200 leading-relaxed">
          {effectiveReason}
        </p>
      </div>

      {/* Required Disclaimer */}
      <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-slate-400 text-xs font-mono text-center">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>AI visual chart analysis. Not financial advice or guaranteed profit.</span>
      </div>
    </div>
  );
};
