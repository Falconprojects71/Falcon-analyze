import React from 'react';
import { Shield, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PriceLevel } from '../types';

interface SupportResistanceMatrixProps {
  supports: PriceLevel[];
  resistances: PriceLevel[];
  currentPrice: number;
}

export const SupportResistanceMatrix: React.FC<SupportResistanceMatrixProps> = ({
  supports,
  resistances,
  currentPrice,
}) => {
  const getStrengthBadge = (strength: string) => {
    switch (strength) {
      case 'MAJOR':
        return 'bg-[#E8F0FF] text-[#245BDB] border-[#245BDB]/40 font-bold';
      case 'INTERMEDIATE':
        return 'bg-[#E9EDF5] text-[#182338] border-[#D8DFEA]';
      default:
        return 'bg-[#F2F4F8] text-[#64748B] border-[#D8DFEA]';
    }
  };

  return (
    <div className="bg-white border border-[#D8DFEA] rounded-xl p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#D8DFEA] mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#D99718]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#182338]">
            Support & Resistance Confluence Matrix
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#64748B]">
          Anchor: <strong className="text-[#182338]">${currentPrice.toLocaleString()}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* RESISTANCE LEVELS (Above price) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-[#DC4655] pb-1 border-b border-[#DC4655]/20">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Resistance Levels (Supply Zones)
            </span>
            <span className="text-[10px] text-[#64748B]">{resistances.length} Detected</span>
          </div>

          <div className="space-y-2">
            {resistances.map((lvl, idx) => {
              const diffPercent = (((lvl.price - currentPrice) / currentPrice) * 100).toFixed(1);
              return (
                <div
                  key={idx}
                  className="bg-[#F2F4F8] border border-[#D8DFEA] hover:border-[#DC4655]/40 rounded-lg p-3 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-[#182338]">
                        ${lvl.price.toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getStrengthBadge(lvl.strength)}`}>
                        {lvl.strength}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#DC4655] flex items-center gap-0.5 font-bold">
                      <ArrowUp className="w-3 h-3" /> +{diffPercent}%
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-medium text-[#182338] mb-0.5">
                    {lvl.label}
                  </div>
                  <div className="text-[10px] text-[#64748B] leading-snug">
                    {lvl.note}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SUPPORT LEVELS (Below price) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-[#16A36A] pb-1 border-b border-[#16A36A]/20">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Support Levels (Demand Zones)
            </span>
            <span className="text-[10px] text-[#64748B]">{supports.length} Detected</span>
          </div>

          <div className="space-y-2">
            {supports.map((lvl, idx) => {
              const diffPercent = (((currentPrice - lvl.price) / currentPrice) * 100).toFixed(1);
              return (
                <div
                  key={idx}
                  className="bg-[#F2F4F8] border border-[#D8DFEA] hover:border-[#16A36A]/40 rounded-lg p-3 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-[#182338]">
                        ${lvl.price.toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getStrengthBadge(lvl.strength)}`}>
                        {lvl.strength}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#16A36A] flex items-center gap-0.5 font-bold">
                      <ArrowDown className="w-3 h-3" /> -{diffPercent}%
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-medium text-[#182338] mb-0.5">
                    {lvl.label}
                  </div>
                  <div className="text-[10px] text-[#64748B] leading-snug">
                    {lvl.note}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
