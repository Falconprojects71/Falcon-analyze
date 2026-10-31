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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border-l border-[#D8DFEA] w-full max-w-md h-full flex flex-col shadow-card">
        {/* Header */}
        <div className="p-4 border-b border-[#D8DFEA] flex items-center justify-between bg-[#E9EDF5]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#245BDB]" />
            <h3 className="text-sm font-bold font-mono text-[#182338]">
              Analysis History ({history.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="p-1.5 rounded text-xs text-[#DC4655] hover:bg-[#DC4655]/10 border border-transparent hover:border-[#DC4655]/30 transition-all cursor-pointer"
                title="Clear all history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#182338] hover:bg-[#D8DFEA] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-[#64748B] text-xs font-mono">
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
                  className="bg-[#F2F4F8] hover:bg-[#E8F0FF] border border-[#D8DFEA] hover:border-[#245BDB] rounded-xl p-3.5 transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-[#182338]">
                          {item.asset}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-[#182338] border border-[#D8DFEA]">
                          {item.timeframe}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#64748B] font-mono mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {item.tradingStyle}
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isBullish
                          ? 'bg-[#16A36A]/10 text-[#16A36A] border-[#16A36A]/30'
                          : isBearish
                          ? 'bg-[#DC4655]/10 text-[#DC4655] border-[#DC4655]/30'
                          : 'bg-[#D99718]/10 text-[#D99718] border-[#D99718]/30'
                      }`}
                    >
                      {item.verdict.signal}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-white rounded-lg p-2 text-[10px] font-mono border border-[#D8DFEA]">
                    <div>
                      <span className="text-[#64748B] block">Entry:</span>
                      <span className="text-[#245BDB] font-bold">${item.entryZone.recommended.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">TP1:</span>
                      <span className="text-[#16A36A] font-bold">${item.takeProfit1.price.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">SL:</span>
                      <span className="text-[#DC4655] font-bold">${item.stopLoss.price.toLocaleString()}</span>
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
