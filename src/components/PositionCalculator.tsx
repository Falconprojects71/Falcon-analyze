import React, { useState } from 'react';
import { Calculator, DollarSign, Percent, ArrowUpRight, ArrowDownRight, Shield } from 'lucide-react';
import { EntryZone, StopLoss, TakeProfit } from '../types';

interface PositionCalculatorProps {
  entryPrice: number;
  stopLossPrice: number;
  tp1Price: number;
  tp2Price: number;
  asset: string;
}

export const PositionCalculator: React.FC<PositionCalculatorProps> = ({
  entryPrice,
  stopLossPrice,
  tp1Price,
  tp2Price,
  asset,
}) => {
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [leverage, setLeverage] = useState<number>(1);

  // Safe inputs
  const safeEntry = typeof entryPrice === 'number' && entryPrice > 0 ? entryPrice : 100;
  const safeSl = typeof stopLossPrice === 'number' && stopLossPrice > 0 ? stopLossPrice : (safeEntry * 0.98);
  const safeTp1 = typeof tp1Price === 'number' && tp1Price > 0 ? tp1Price : (safeEntry * 1.03);
  const safeTp2 = typeof tp2Price === 'number' && tp2Price > 0 ? tp2Price : (safeEntry * 1.06);

  // Stop loss distance %
  const rawSlDiff = Math.abs(safeEntry - safeSl);
  const slDistancePercent = safeEntry > 0 && rawSlDiff > 0 ? rawSlDiff / safeEntry : 0.02;
  const dollarRisk = (accountBalance * riskPercent) / 100;
  
  // Position size ($) = Dollar Risk / slDistancePercent
  const positionSizeUsd = slDistancePercent > 0 ? dollarRisk / slDistancePercent : 0;
  const positionUnits = safeEntry > 0 ? positionSizeUsd / safeEntry : 0;

  // Potential returns
  const tp1GainPercent = safeEntry > 0 ? Math.abs(safeTp1 - safeEntry) / safeEntry : 0.03;
  const tp2GainPercent = safeEntry > 0 ? Math.abs(safeTp2 - safeEntry) / safeEntry : 0.06;

  const profitAtTp1 = positionSizeUsd * tp1GainPercent;
  const profitAtTp2 = positionSizeUsd * tp2GainPercent;

  const cleanAssetSymbol = (asset || 'BTC/USD').split('/')[0] || 'UNITS';

  return (
    <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Prop Risk & Position Sizing Engine
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Formula: <strong className="text-white">Position = Risk $ / SL %</strong>
        </span>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Account Size */}
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1">
            Account Balance ($)
          </label>
          <div className="relative">
            <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-cyan-500 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white outline-none"
            />
          </div>
        </div>

        {/* Risk Percentage */}
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1">
            Max Risk per Trade (%)
          </label>
          <div className="flex gap-1.5">
            {[0.5, 1.0, 2.0, 3.0].map((p) => (
              <button
                key={p}
                onClick={() => setRiskPercent(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                  riskPercent === p
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Leverage / Multiplier */}
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1">
            Account Leverage
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 5, 10].map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                  leverage === lev
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Output Results Calculation Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-rose-400 uppercase mb-0.5 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Max Risk ($)
          </div>
          <div className="text-base font-bold font-mono text-rose-300">
            ${dollarRisk.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {(slDistancePercent * 100).toFixed(2)}% to SL
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-cyan-400 uppercase mb-0.5">
            Recommended Size ($)
          </div>
          <div className="text-base font-bold font-mono text-cyan-300">
            ${positionSizeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {positionUnits.toFixed(4)} {cleanAssetSymbol}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-emerald-400 uppercase mb-0.5 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> TP1 Profit ($)
          </div>
          <div className="text-base font-bold font-mono text-emerald-300">
            +${profitAtTp1.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            +{(tp1GainPercent * 100).toFixed(1)}% Return
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-emerald-400 uppercase mb-0.5 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> TP2 Profit ($)
          </div>
          <div className="text-base font-bold font-mono text-emerald-300">
            +${profitAtTp2.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            +{(tp2GainPercent * 100).toFixed(1)}% Return
          </div>
        </div>
      </div>
    </div>
  );
};
