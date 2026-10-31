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
        bg: 'bg-amber-50 border-amber-200 text-amber-900',
        badgeBg: 'bg-amber-500 text-slate-950 shadow-xs font-bold',
        icon: Clock,
        label: 'NO LIVE TRADE — MARKET CLOSED',
      };
    }
    if (isStrongBuy) {
      return {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        badgeBg: 'bg-[#16A36A] text-white shadow-xs font-bold',
        icon: TrendingUp,
        label: 'STRONG BUY / LONG',
      };
    }
    if (isBuy) {
      return {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        badgeBg: 'bg-[#16A36A] text-white shadow-xs font-bold',
        icon: TrendingUp,
        label: 'BUY / LONG SETUP',
      };
    }
    if (isStrongSell) {
      return {
        bg: 'bg-rose-50 border-rose-200 text-rose-900',
        badgeBg: 'bg-[#DC4655] text-white shadow-xs font-bold',
        icon: TrendingDown,
        label: 'STRONG SELL / SHORT',
      };
    }
    if (isSell) {
      return {
        bg: 'bg-rose-50 border-rose-200 text-rose-900',
        badgeBg: 'bg-[#DC4655] text-white shadow-xs font-bold',
        icon: TrendingDown,
        label: 'SELL / SHORT SETUP',
      };
    }
    if (sigUpper.includes('INSUFFICIENT') || sigUpper.includes('NO RELIABLE') || sigUpper.includes('CLEARER')) {
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-900',
        badgeBg: 'bg-amber-500 text-slate-950 shadow-xs font-bold',
        icon: AlertCircle,
        label: 'NO RELIABLE SETUP — CLEARER CHART NEEDED',
      };
    }
    return {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      badgeBg: 'bg-amber-500 text-slate-950 shadow-xs font-bold',
      icon: Minus,
      label: 'NO TRADE / WAIT',
    };
  };

  const config = getSignalConfig();
  const Icon = config.icon;

  const getTrendBadge = (trend: MarketTrend) => {
    switch (trend) {
      case 'BULLISH':
        return { text: 'BULLISH TREND', color: 'text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]' };
      case 'BEARISH':
        return { text: 'BEARISH TREND', color: 'text-[#BE123C] bg-[#FFF1F2] border-[#FECDD3]' };
      case 'REVERSAL_BULLISH':
        return { text: 'BULLISH REVERSAL', color: 'text-[#1D4ED8] bg-[#EFF6FF] border-[#BFDBFE]' };
      case 'REVERSAL_BEARISH':
        return { text: 'BEARISH REVERSAL', color: 'text-[#C2410C] bg-[#FFF7ED] border-[#FED7AA]' };
      default:
        return { text: 'NEUTRAL / RANGING', color: 'text-[#A16207] bg-[#FEFCE8] border-[#FEF08A]' };
    }
  };

  const trendInfo = getTrendBadge(marketTrend);

  return (
    <div className="rounded-xl border border-[#D8DFEA] p-5 bg-white shadow-card relative overflow-hidden">
      {/* Header bar: Asset & Trend info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[#D8DFEA] mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold font-mono text-[#182338] tracking-wider">
            {asset}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#F2F4F8] text-[#182338] border border-[#D8DFEA]">
            {timeframe}
          </span>
          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${trendInfo.color}`}>
            {trendInfo.text}
          </span>
        </div>

        {/* Confidence Gauge Badge */}
        <div className="flex items-center gap-2 bg-[#F2F4F8] border border-[#D8DFEA] px-3 py-1 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-[#245BDB]" />
          <span className="text-xs font-mono text-[#64748B]">Confidence:</span>
          <span
            className={`text-xs font-mono font-bold ${
              confidence >= 80 ? 'text-[#16A36A]' : confidence >= 60 ? 'text-amber-400' : 'text-[#64748B]'
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
            className={`px-5 py-3 rounded-xl font-mono font-bold text-base sm:text-lg tracking-wider flex items-center gap-2.5 ${config.badgeBg}`}
          >
            <Icon className="w-6 h-6 stroke-[2.5]" />
            <span>{config.label}</span>
          </div>

          <div>
            <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wide">
              Market Trend Strength
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-28 sm:w-36 h-2 rounded-full bg-[#E9EDF5] overflow-hidden border border-[#D8DFEA]">
                <div
                  className={`h-full rounded-full ${
                    isBuy ? 'bg-[#16A36A]' : isSell ? 'bg-[#DC4655]' : 'bg-[#D99718]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, trendStrength))}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-[#182338]">
                {trendStrength}%
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe context pill */}
        <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-lg p-2.5 max-w-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#64748B] mb-1">
            <Clock className="w-3 h-3 text-[#245BDB]" />
            <span>Execution Context:</span>
          </div>
          <p className="text-xs text-[#182338] line-clamp-2">
            {verdict.timeframeContext}
          </p>
        </div>
      </div>

      {/* Summary Rationale */}
      <div className="mt-4 pt-3.5 border-t border-[#D8DFEA] bg-[#E9EDF5] rounded-lg p-3 border border-[#D8DFEA]">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#245BDB] mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#D99718]" /> Executive Trade Thesis
        </div>
        <p className="text-xs text-[#182338] leading-relaxed">
          {verdict.summary}
        </p>
      </div>
    </div>
  );
};
