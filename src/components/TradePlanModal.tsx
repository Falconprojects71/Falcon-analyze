import React from 'react';
import { X, CheckCircle2, AlertOctagon, ShieldCheck, ListOrdered, Share2, Copy, Check } from 'lucide-react';
import { TradePlanExecution, ChartAnalysisResult } from '../types';

interface TradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ChartAnalysisResult;
}

export const TradePlanModal: React.FC<TradePlanModalProps> = ({
  isOpen,
  onClose,
  analysis,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const { tradePlanExecution, asset, timeframe, verdict, entryZone, stopLoss, takeProfit1, takeProfit2, riskRewardRatio } = analysis;

  const handleCopy = () => {
    const text = `
🎯 [TRADE EXECUTION PLAN]
Asset: ${asset} (${timeframe})
Signal: ${verdict.signal}
----------------------------------------
1. Entry Trigger: $${entryZone.recommended.toLocaleString()} (${entryZone.type})
2. Stop Loss: $${stopLoss.price.toLocaleString()} (-${stopLoss.percentageRisk}%)
3. Take Profit 1: $${takeProfit1.price.toLocaleString()} (+${takeProfit1.percentageGain}%)
4. Take Profit 2: $${takeProfit2.price.toLocaleString()} (+${takeProfit2.percentageGain}%)
5. Risk/Reward: ${riskRewardRatio}

STEPS:
${tradePlanExecution.stepByStep.map((s, i) => `${i + 1}. ${s}`).join('\n')}

INVALIDATION RULE:
${tradePlanExecution.invalidationCriteria}

RISK MANAGEMENT:
${tradePlanExecution.riskManagementTips}
----------------------------------------
Falcon Analyze
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0D121F] border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white">
                Step-by-Step Execution Plan & Invalidation
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {asset} &bull; {timeframe} &bull; {verdict.signal}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Step-by-Step Sequence */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Execution Protocol
            </h4>
            <div className="space-y-2">
              {tradePlanExecution.stepByStep.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-slate-900/80 border border-slate-800 rounded-lg p-3"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-mono">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Invalidation Criteria */}
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-4 space-y-1.5">
            <h4 className="text-xs font-mono font-bold text-rose-300 flex items-center gap-1.5 uppercase">
              <AlertOctagon className="w-4 h-4 text-rose-400" /> Setup Invalidation Criteria
            </h4>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              {tradePlanExecution.invalidationCriteria}
            </p>
          </div>

          {/* Risk Management Tips */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 space-y-1.5">
            <h4 className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5 uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Capital Preservation & Sizing Notes
            </h4>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              {tradePlanExecution.riskManagementTips}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Plan Copied!' : 'Copy Plan to Clipboard'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
