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
    <div className="bg-white border border-[#D8DFEA] rounded-xl p-5 shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#D8DFEA]">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#245BDB]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#182338]">
            Prop Risk & Position Sizing Engine
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#64748B]">
          Formula: <strong className="text-[#182338]">Position = Risk $ / SL %</strong>
        </span>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Account Size */}
        <div>
          <label className="block text-[11px] font-mono text-[#64748B] mb-1">
            Account Balance ($)
          </label>
          <div className="relative">
            <DollarSign className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Math.max(1, Number(e.target.value)))}
              className="w-full bg-white border border-[#D8DFEA] focus:border-[#245BDB] rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-[#182338] outline-none"
            />
          </div>
        </div>

        {/* Risk Percentage */}
        <div>
          <label className="block text-[11px] font-mono text-[#64748B] mb-1">
            Max Risk per Trade (%)
          </label>
          <div className="flex gap-1.5">
            {[0.5, 1.0, 2.0, 3.0].map((p) => (
              <button
                key={p}
                onClick={() => setRiskPercent(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                  riskPercent === p
                    ? 'bg-[#245BDB] text-white border-[#245BDB] font-bold shadow-xs'
                    : 'bg-[#F2F4F8] border-[#D8DFEA] text-[#64748B] hover:text-[#182338]'
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Leverage / Multiplier */}
        <div>
          <label className="block text-[11px] font-mono text-[#64748B] mb-1">
            Account Leverage
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 5, 10].map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                  leverage === lev
                    ? 'bg-[#245BDB] text-white border-[#245BDB] font-bold shadow-xs'
                    : 'bg-[#F2F4F8] border-[#D8DFEA] text-[#64748B] hover:text-[#182338]'
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
        <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-lg p-3 shadow-xs">
          <div className="text-[10px] font-mono text-[#DC4655] uppercase mb-0.5 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Max Risk ($)
          </div>
          <div className="text-base font-bold font-mono text-[#DC4655]">
            ${dollarRisk.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#64748B] font-mono">
            {(slDistancePercent * 100).toFixed(2)}% to SL
          </div>
        </div>

        <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-lg p-3 shadow-xs">
          <div className="text-[10px] font-mono text-[#245BDB] uppercase mb-0.5">
            Recommended Size ($)
          </div>
          <div className="text-base font-bold font-mono text-[#245BDB]">
            ${positionSizeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-[#64748B] font-mono">
            {positionUnits.toFixed(4)} {cleanAssetSymbol}
          </div>
        </div>

        <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-lg p-3 shadow-xs">
          <div className="text-[10px] font-mono text-[#16A36A] uppercase mb-0.5 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> TP1 Profit ($)
          </div>
          <div className="text-base font-bold font-mono text-[#16A36A]">
            +${profitAtTp1.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#64748B] font-mono">
            +{(tp1GainPercent * 100).toFixed(1)}% Return
          </div>
        </div>

        <div className="bg-[#F2F4F8] border border-[#D8DFEA] rounded-lg p-3 shadow-xs">
          <div className="text-[10px] font-mono text-[#16A36A] uppercase mb-0.5 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> TP2 Profit ($)
          </div>
          <div className="text-base font-bold font-mono text-[#16A36A]">
            +${profitAtTp2.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#64748B] font-mono">
            +{(tp2GainPercent * 100).toFixed(1)}% Return
          </div>
        </div>
      </div>
    </div>
  );
};
