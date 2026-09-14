import React from 'react';
import { X, History, Trash2, ArrowUpRight, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { ChartAnalysisResult } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: ChartAnalysisResult[];
  onSelectHistory: (item: ChartAnalysisResult) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistory,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#0D121F] border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono text-white">
              Analysis History ({history.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="p-1.5 rounded text-xs text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                title="Clear all history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-mono">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No analyzed charts in history yet.
              <br />
              Upload and analyze a chart to save it here.
            </div>
          ) : (
            history.map((item) => {
              const sig = String(item.verdict?.signal || '').toUpperCase();
              const isBullish = (sig.includes('BUY') || sig.includes('LONG')) && !sig.includes('NO') && !sig.includes('WAIT');
              const isBearish = (sig.includes('SELL') || sig.includes('SHORT')) && !sig.includes('NO') && !sig.includes('WAIT');
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectHistory(item);
                    onClose();
                  }}
                  className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3.5 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-white">
                          {item.asset}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.timeframe}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {item.tradingStyle}
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isBullish
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : isBearish
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {item.verdict.signal}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 rounded-lg p-2 text-[10px] font-mono border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block">Entry:</span>
                      <span className="text-cyan-300 font-bold">${item.entryZone.recommended.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">TP1:</span>
                      <span className="text-emerald-300 font-bold">${item.takeProfit1.price.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SL:</span>
                      <span className="text-rose-300 font-bold">${item.stopLoss.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
