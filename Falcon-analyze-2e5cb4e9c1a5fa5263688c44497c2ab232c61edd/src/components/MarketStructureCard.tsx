import React from 'react';
import { GitCommit, Layers, CheckCircle2, Flame, HelpCircle } from 'lucide-react';
import { MarketStructure } from '../types';

interface MarketStructureCardProps {
  marketStructure: MarketStructure;
  candlestickPatterns: string[];
  detailedExplanation: string;
}

export const MarketStructureCard: React.FC<MarketStructureCardProps> = ({
  marketStructure,
  candlestickPatterns = [],
  detailedExplanation,
}) => {
  const safeStructure = marketStructure || {
    patternDetected: 'Structure Retest',
    type: 'Price Action Structure',
    description: 'Visual analysis of active timeframe price swings.',
    keyPoints: ['Price action swing structure mapped from chart.'],
  };
  const safeKeyPoints = Array.isArray(safeStructure.keyPoints) ? safeStructure.keyPoints : [];
  const safePatterns = Array.isArray(candlestickPatterns) ? candlestickPatterns : [];

  return (
    <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Market Structure & Price Action Breakdown
          </h3>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
          Pattern: {safeStructure.patternDetected || 'Price Action Structure'}
        </span>
      </div>

      {/* Structure Type & Description */}
      <div className="bg-slate-900/90 rounded-lg p-3.5 border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 mb-1">
          <GitCommit className="w-4 h-4 text-cyan-400" />
          <span>Structure Classification:</span>
          <span className="text-cyan-300">{safeStructure.type || 'Price Action Structure'}</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {safeStructure.description || detailedExplanation || 'Price swing structure evaluated from chart image.'}
        </p>
      </div>

      {/* Key Structural Observations (BOS, CHoCH, Liquidity) */}
      <div>
        <div className="text-xs font-mono text-slate-400 mb-2 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Key Structural Milestones & Liquidity Events:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {safeKeyPoints.map((point, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300 font-mono leading-tight">{point}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Candlestick Formations */}
      {safePatterns.length > 0 && (
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1.5">
            Detected Candlestick Formations:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {safePatterns.map((pattern, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-amber-300 flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {pattern}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Deep Rationale Thesis */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5">
        <div className="text-xs font-mono font-bold text-slate-300 mb-1 flex items-center gap-1.5">
          <span>Technical Thesis Deep-Dive</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {detailedExplanation}
        </p>
      </div>
    </div>
  );
};
