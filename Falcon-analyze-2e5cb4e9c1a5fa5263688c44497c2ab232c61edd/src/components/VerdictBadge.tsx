import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Zap,
  Clock,
  Sparkles,
} from 'lucide-react';
import { MarketTrend, TradeSignal } from '../types';

interface VerdictBadgeProps {
  verdict: {
    signal: TradeSignal;
    summary: string;
    timeframeContext: string;
  };
  marketTrend: MarketTrend;
  trendStrength: number;
  confidence: number;
  asset: string;
  timeframe: string;
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({
  verdict,
  marketTrend,
  trendStrength,
  confidence,
  asset,
  timeframe,
}) => {
  const sigUpper = String(verdict.signal || '').toUpperCase().trim();
  const isMarketClosed = sigUpper.includes('MARKET CLOSED') || sigUpper.includes('CLOSED');
  const isStrongBuy = !isMarketClosed && sigUpper === 'STRONG BUY';
  const isBuy = !isMarketClosed && (sigUpper.includes('BUY') || sigUpper.includes('LONG')) && !sigUpper.includes('NO') && !sigUpper.includes('WAIT');
  const isStrongSell = !isMarketClosed && sigUpper === 'STRONG SELL';
  const isSell = !isMarketClosed && (sigUpper.includes('SELL') || sigUpper.includes('SHORT')) && !sigUpper.includes('NO') && !sigUpper.includes('WAIT');
  const isWait = !isBuy && !isSell && !isMarketClosed;

  const getSignalConfig = () => {
    if (isMarketClosed) {
      return {
        bg: 'bg-amber-950/80 border-amber-500/80 text-amber-200',
        badgeBg: 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]',
        glow: 'glow-amber',
        icon: Clock,
        label: 'NO LIVE TRADE — MARKET CLOSED',
      };
    }
    if (isStrongBuy) {
      return {
        bg: 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300',
        badgeBg: 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(0,240,160,0.5)]',
        glow: 'glow-emerald',
        icon: TrendingUp,
        label: 'STRONG BUY / LONG',
      };
    }
    if (isBuy) {
      return {
        bg: 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300',
        badgeBg: 'bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]',
        glow: 'glow-emerald',
        icon: TrendingUp,
        label: 'BUY / LONG SETUP',
      };
    }
    if (isStrongSell) {
      return {
        bg: 'bg-rose-950/80 border-rose-500/80 text-rose-300',
        badgeBg: 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)]',
        glow: 'glow-rose',
        icon: TrendingDown,
        label: 'STRONG SELL / SHORT',
      };
    }
    if (isSell) {
      return {
        bg: 'bg-rose-950/60 border-rose-500/60 text-rose-300',
        badgeBg: 'bg-rose-400 text-slate-950 shadow-[0_0_15px_rgba(244,63,94,0.4)]',
        glow: 'glow-rose',
        icon: TrendingDown,
        label: 'SELL / SHORT SETUP',
      };
    }
    if (sigUpper.includes('INSUFFICIENT') || sigUpper.includes('NO RELIABLE') || sigUpper.includes('CLEARER')) {
      return {
        bg: 'bg-amber-950/70 border-amber-500/70 text-amber-200',
        badgeBg: 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]',
        glow: 'glow-amber',
        icon: AlertCircle,
        label: 'NO RELIABLE SETUP — CLEARER CHART NEEDED',
      };
    }
    return {
      bg: 'bg-amber-950/60 border-amber-500/60 text-amber-300',
      badgeBg: 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
      glow: 'glow-amber',
      icon: Minus,
      label: 'NO TRADE / WAIT',
    };
  };

  const config = getSignalConfig();
  const Icon = config.icon;

  const getTrendBadge = (trend: MarketTrend) => {
    switch (trend) {
      case 'BULLISH':
        return { text: 'BULLISH TREND', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'BEARISH':
        return { text: 'BEARISH TREND', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      case 'REVERSAL_BULLISH':
        return { text: 'BULLISH REVERSAL', color: 'text-teal-300 bg-teal-500/10 border-teal-500/30' };
      case 'REVERSAL_BEARISH':
        return { text: 'BEARISH REVERSAL', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
      default:
        return { text: 'NEUTRAL / RANGING', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
  };

  const trendInfo = getTrendBadge(marketTrend);

  return (
    <div className={`rounded-xl border p-5 bg-[#0D121F] shadow-xl relative overflow-hidden ${config.glow}`}>
      {/* Background Accent Grid */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-bl from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Header bar: Asset & Trend info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold font-mono text-white tracking-wider">
            {asset}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {timeframe}
          </span>
          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${trendInfo.color}`}>
            {trendInfo.text}
          </span>
        </div>

        {/* Confidence Gauge Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-mono text-slate-400">Confidence:</span>
          <span
            className={`text-xs font-mono font-bold ${
              confidence >= 80 ? 'text-emerald-400' : confidence >= 60 ? 'text-amber-400' : 'text-slate-300'
            }`}
          >
            {confidence}%
          </span>
        </div>
      </div>

      {/* Main Signal Display */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`px-5 py-3 rounded-xl font-mono font-black text-base sm:text-lg tracking-wider flex items-center gap-2.5 ${config.badgeBg}`}
          >
            <Icon className="w-6 h-6 stroke-[2.5]" />
            <span>{config.label}</span>
          </div>

          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wide">
              Market Trend Strength
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-28 sm:w-36 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
                <div
                  className={`h-full rounded-full ${
                    isBuy ? 'bg-[#00F0A0]' : isSell ? 'bg-rose-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, trendStrength))}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-slate-200">
                {trendStrength}%
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe context pill */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5 max-w-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>Execution Context:</span>
          </div>
          <p className="text-xs text-slate-300 line-clamp-2">
            {verdict.timeframeContext}
          </p>
        </div>
      </div>

      {/* Summary Rationale */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/60 bg-slate-900/40 rounded-lg p-3 border border-slate-800/40">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Executive Trade Thesis
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {verdict.summary}
        </p>
      </div>
    </div>
  );
};
