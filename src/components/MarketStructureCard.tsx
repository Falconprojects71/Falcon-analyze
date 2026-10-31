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
    <div className="bg-white border border-[#D8DFEA] rounded-xl p-5 shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#D8DFEA]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#245BDB]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#182338]">
            Market Structure & Price Action Breakdown
          </h3>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#E8F0FF] text-[#245BDB] border border-[#245BDB]/30 font-bold">
          Pattern: {safeStructure.patternDetected || 'Price Action Structure'}
        </span>
      </div>

      {/* Structure Type & Description */}
      <div className="bg-[#F2F4F8] rounded-lg p-3.5 border border-[#D8DFEA]">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#182338] mb-1">
          <GitCommit className="w-4 h-4 text-[#245BDB]" />
          <span>Structure Classification:</span>
          <span className="text-[#245BDB]">{safeStructure.type || 'Price Action Structure'}</span>
        </div>
        <p className="text-xs text-[#64748B] leading-relaxed">
          {safeStructure.description || detailedExplanation || 'Price swing structure evaluated from chart image.'}
        </p>
      </div>

      {/* Key Structural Observations (BOS, CHoCH, Liquidity) */}
      <div>
        <div className="text-xs font-mono text-[#64748B] mb-2 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-[#D99718]" />
          <span>Key Structural Milestones & Liquidity Events:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {safeKeyPoints.map((point, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 bg-[#F2F4F8] border border-[#D8DFEA] rounded-lg p-2.5 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A] shrink-0 mt-0.5" />
              <span className="text-xs text-[#182338] font-mono leading-tight">{point}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Candlestick Formations */}
      {safePatterns.length > 0 && (
        <div>
          <div className="text-xs font-mono text-[#64748B] mb-1.5">
            Detected Candlestick Formations:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {safePatterns.map((pattern, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded bg-[#E8F0FF] border border-[#D8DFEA] text-xs font-mono text-[#245BDB] flex items-center gap-1.5 font-bold"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#245BDB]" />
                {pattern}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Deep Rationale Thesis */}
      <div className="bg-[#E9EDF5] border border-[#D8DFEA] rounded-lg p-3.5">
        <div className="text-xs font-mono font-bold text-[#182338] mb-1 flex items-center gap-1.5">
          <span>Technical Thesis Deep-Dive</span>
        </div>
        <p className="text-xs text-[#64748B] leading-relaxed">
          {detailedExplanation}
        </p>
      </div>
    </div>
  );
};
