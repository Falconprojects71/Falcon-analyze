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
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
      case 'INTERMEDIATE':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-700/40 text-slate-400 border-slate-600/40';
    }
  };

  return (
    <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Support & Resistance Confluence Matrix
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Anchor: <strong className="text-white">${currentPrice.toLocaleString()}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* RESISTANCE LEVELS (Above price) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-400 pb-1 border-b border-rose-500/20">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Resistance Levels (Supply Zones)
            </span>
            <span className="text-[10px] text-slate-500">{resistances.length} Detected</span>
          </div>

          <div className="space-y-2">
            {resistances.map((lvl, idx) => {
              const diffPercent = (((lvl.price - currentPrice) / currentPrice) * 100).toFixed(1);
              return (
                <div
                  key={idx}
                  className="bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 rounded-lg p-3 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-white">
                        ${lvl.price.toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getStrengthBadge(lvl.strength)}`}>
                        {lvl.strength}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-rose-400 flex items-center gap-0.5">
                      <ArrowUp className="w-3 h-3" /> +{diffPercent}%
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-medium text-slate-300 mb-0.5">
                    {lvl.label}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-snug">
                    {lvl.note}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SUPPORT LEVELS (Below price) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400 pb-1 border-b border-emerald-500/20">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Support Levels (Demand Zones)
            </span>
            <span className="text-[10px] text-slate-500">{supports.length} Detected</span>
          </div>

          <div className="space-y-2">
            {supports.map((lvl, idx) => {
              const diffPercent = (((currentPrice - lvl.price) / currentPrice) * 100).toFixed(1);
              return (
                <div
                  key={idx}
                  className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-lg p-3 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-white">
                        ${lvl.price.toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getStrengthBadge(lvl.strength)}`}>
                        {lvl.strength}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-0.5">
                      <ArrowDown className="w-3 h-3" /> -{diffPercent}%
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-medium text-slate-300 mb-0.5">
                    {lvl.label}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-snug">
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
