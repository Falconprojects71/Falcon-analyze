import React from 'react';
import { Activity, BarChart3, TrendingUp, TrendingDown, Minus, Eye, Sparkles } from 'lucide-react';
import { TechnicalIndicator, OrderFlowContext } from '../types';

interface IndicatorsCardProps {
  indicators: TechnicalIndicator[];
  orderFlow?: OrderFlowContext;
}

export const IndicatorsCard: React.FC<IndicatorsCardProps> = ({
  indicators = [],
  orderFlow,
}) => {
  const safeIndicators = Array.isArray(indicators) ? indicators : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BULLISH':
        return {
          icon: TrendingUp,
          cls: 'bg-[#16A36A]/10 text-[#16A36A] border-[#16A36A]/30',
        };
      case 'BEARISH':
        return {
          icon: TrendingDown,
          cls: 'bg-[#DC4655]/10 text-[#DC4655] border-[#DC4655]/30',
        };
      default:
        return {
          icon: Minus,
          cls: 'bg-[#E9EDF5] text-[#64748B] border-[#D8DFEA]',
        };
    }
  };

  return (
    <div className="bg-white border border-[#D8DFEA] rounded-xl p-5 shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#D8DFEA]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#245BDB]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#182338]">
            Technical Indicators & Order Flow Matrix
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#64748B]">
          {safeIndicators.length} Indicators Monitored
        </span>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {safeIndicators.map((ind, idx) => {
          const cfg = getStatusBadge(ind.status);
          const Icon = cfg.icon;
          return (
            <div
              key={idx}
              className="bg-[#F2F4F8] border border-[#D8DFEA] hover:border-[#245BDB] rounded-lg p-3 flex flex-col justify-between shadow-xs transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-bold text-[#182338] truncate">
                    {ind.name}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 ${cfg.cls}`}>
                    <Icon className="w-3 h-3" />
                    {ind.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] line-clamp-2 leading-snug">
                  {ind.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Flow & Smart Money Insights */}
      {orderFlow && (orderFlow.fairValueGaps || orderFlow.liquidityPools || orderFlow.volumeAnalysis) && (
        <div className="bg-[#E9EDF5] border border-[#D8DFEA] rounded-lg p-3.5 space-y-2">
          <div className="text-xs font-mono font-bold text-[#245BDB] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Order Flow & Smart Money Insights</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {orderFlow.fairValueGaps && (
              <div className="text-xs">
                <div className="font-mono text-[#64748B] text-[10px] uppercase mb-0.5">Fair Value Gaps (FVG)</div>
                <p className="text-[#182338] text-[11px]">{orderFlow.fairValueGaps}</p>
              </div>
            )}
            {orderFlow.liquidityPools && (
              <div className="text-xs">
                <div className="font-mono text-[#64748B] text-[10px] uppercase mb-0.5">Resting Liquidity Pools</div>
                <p className="text-[#182338] text-[11px]">{orderFlow.liquidityPools}</p>
              </div>
            )}
            {orderFlow.volumeAnalysis && (
              <div className="text-xs">
                <div className="font-mono text-[#64748B] text-[10px] uppercase mb-0.5">Volume & Delta Profile</div>
                <p className="text-[#182338] text-[11px]">{orderFlow.volumeAnalysis}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
