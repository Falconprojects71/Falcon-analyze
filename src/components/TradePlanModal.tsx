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

  const isWait = verdict?.signal === 'WAIT';
  const entryFormatted = entryZone?.recommended ? `$${entryZone.recommended.toLocaleString()}` : (entryZone?.range || 'Awaiting Setup');
  const slFormatted = stopLoss?.price ? `$${stopLoss.price.toLocaleString()}` : '—';
  const tp1Formatted = (takeProfit1?.status === 'UNAVAILABLE' || takeProfit1?.price === undefined || takeProfit1?.price === null) ? 'Unconfirmed' : `$${takeProfit1.price.toLocaleString()}`;
  const tp2Formatted = (takeProfit2?.status === 'UNAVAILABLE' || takeProfit2?.price === undefined || takeProfit2?.price === null) ? 'Unconfirmed' : `$${takeProfit2.price.toLocaleString()}`;

  const execution = {
    stepByStep: (tradePlanExecution?.stepByStep && Array.isArray(tradePlanExecution.stepByStep) && tradePlanExecution.stepByStep.length > 0)
      ? tradePlanExecution.stepByStep
      : [
          `1. Execution Trigger: Confirm order within Entry Zone (${entryFormatted}) upon lower timeframe confirmation.`,
          `2. Invalidation Anchor: Maintain strict stop loss at ${slFormatted}, invalidating setup immediately if breached.`,
          `3. Primary Target: ${tp1Formatted !== 'Unconfirmed' ? `Lock in primary profit at ${tp1Formatted}.` : 'Unconfirmed — Manage trade dynamically toward visible structural reaction levels.'}`,
          `4. Runner Target: ${tp2Formatted !== 'Unconfirmed' ? `Trail remaining position to ${tp2Formatted}.` : 'Unconfirmed — Trail stop loss once initial reaction levels are reached.'}`,
        ],
    invalidationCriteria: tradePlanExecution?.invalidationCriteria || (
      verdict?.signal === 'SELL'
        ? `Bearish structure is invalidated if price closes above ${slFormatted}.`
        : `Bullish structure is invalidated if price closes below ${slFormatted}.`
    ),
    riskManagementTips: tradePlanExecution?.riskManagementTips || 'Risk maximum 1–2% of trading equity on this setup. Protect capital with strict invalidation rules.',
  };

  const handleCopy = () => {
    const stepsFormatted = (execution.stepByStep || []).map((s, i) => `${i + 1}. ${s}`).join('\n');

    const text = `
🎯 [TRADE EXECUTION PLAN]
Asset: ${asset} (${timeframe || 'Chart'})
Signal: ${verdict?.signal || 'BUY'}
----------------------------------------
1. Entry Trigger: ${entryFormatted}
2. Stop Loss: ${slFormatted} ${stopLoss?.percentageRisk ? `(-${stopLoss.percentageRisk}%)` : ''}
3. Take Profit 1: ${tp1Formatted} ${takeProfit1?.percentageGain ? `(+${takeProfit1.percentageGain}%)` : ''}
4. Take Profit 2: ${tp2Formatted} ${takeProfit2?.percentageGain ? `(+${takeProfit2.percentageGain}%)` : ''}
5. Risk/Reward: ${riskRewardRatio || '—'}

STEPS:
${stepsFormatted}

INVALIDATION RULE:
${execution.invalidationCriteria}

RISK MANAGEMENT:
${execution.riskManagementTips}
----------------------------------------
Falcon Analyze
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-[#D8DFEA] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-card overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#D8DFEA] flex items-center justify-between bg-[#E9EDF5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F0FF] text-[#245BDB] border border-[#D8DFEA] flex items-center justify-center">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-[#182338]">
                Step-by-Step Execution Plan & Invalidation
              </h3>
              <p className="text-xs text-[#64748B] font-mono">
                {asset} &bull; {timeframe} &bull; {verdict?.signal || 'BUY'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#182338] hover:bg-[#D8DFEA] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Step-by-Step Sequence */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#245BDB] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#16A36A]" /> Execution Protocol
            </h4>
            <div className="space-y-2">
              {execution.stepByStep.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-[#F2F4F8] border border-[#D8DFEA] rounded-lg p-3 shadow-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-[#E8F0FF] border border-[#245BDB]/40 text-[#245BDB] text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-[#182338] leading-relaxed font-mono">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Invalidation Criteria */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-1.5">
            <h4 className="text-xs font-mono font-bold text-[#DC4655] flex items-center gap-1.5 uppercase">
              <AlertOctagon className="w-4 h-4 text-[#DC4655]" /> Setup Invalidation Criteria
            </h4>
            <p className="text-xs text-rose-900 leading-relaxed">
              {execution.invalidationCriteria}
            </p>
          </div>

          {/* Risk Management Tips */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5">
            <h4 className="text-xs font-mono font-bold text-[#16A36A] flex items-center gap-1.5 uppercase">
              <ShieldCheck className="w-4 h-4 text-[#16A36A]" /> Capital Preservation & Sizing Notes
            </h4>
            <p className="text-xs text-emerald-900 leading-relaxed">
              {execution.riskManagementTips}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#D8DFEA] bg-[#E9EDF5] flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-[#E8F0FF] border border-[#D8DFEA] text-[#245BDB] text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-[#16A36A]" /> : <Copy className="w-4 h-4 text-[#245BDB]" />}
            <span>{copied ? 'Plan Copied!' : 'Copy Plan to Clipboard'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#245BDB] hover:bg-[#1948B8] text-xs font-mono text-white transition-all cursor-pointer shadow-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
