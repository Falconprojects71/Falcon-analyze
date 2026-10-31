import React, { useState } from 'react';
import {
  TrendingUp,
  Shield,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { AuthUser } from '../types';

interface LandingPageProps {
  onLaunchTerminal: () => void;
  onOpenUpgradeModal: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  freeAnalysisCount: number;
  maxFreeAnalyses: number;
  freeLimitReached: boolean;
  isProUser: boolean;
  authUser?: AuthUser | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchTerminal,
  onOpenLogin,
  onOpenRegister,
  authUser,
}) => {
  const [activePreviewTab, setActivePreviewTab] = useState<'tradePlan' | 'levels' | 'structure'>('tradePlan');

  return (
    <div className="min-h-screen bg-[#F2F4F8] text-[#182338] flex flex-col justify-between">
      {/* HERO & GORGEOUS CHART SHOWCASE */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-14 sm:pb-20 px-4 sm:px-6">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#182338 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-7">
          {/* Main Title & Slogan */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#182338]">
              FALCON <span className="text-[#245BDB]">ANALYZE</span>
            </h1>
            <p className="text-xl sm:text-2xl font-bold text-[#182338] tracking-tight">
              See the Market. Understand the Move.
            </p>

            {/* Hero Action CTA */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {authUser ? (
                <button
                  type="button"
                  onClick={onLaunchTerminal}
                  className="px-6 py-3 rounded-xl font-mono text-sm font-bold bg-[#245BDB] hover:bg-[#1948B8] text-white active:scale-[0.98] shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  id="landing-hero-terminal-btn"
                >
                  <TrendingUp className="w-4 h-4 text-white" />
                  <span>Open Analysis Terminal</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onOpenRegister}
                    className="px-6 py-3 rounded-xl font-mono text-sm font-bold bg-[#245BDB] hover:bg-[#1948B8] text-white active:scale-[0.98] shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    id="landing-hero-get-started-btn"
                  >
                    <Shield className="w-4 h-4 text-white" />
                    <span>Get Started — 3 Free Charts</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="px-5 py-3 rounded-xl font-mono text-sm font-bold bg-white hover:bg-[#E9EDF5] border border-[#D8DFEA] text-[#182338] transition-all cursor-pointer shadow-xs"
                    id="landing-hero-signin-btn"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>

          {/* BEAUTIFUL INSTITUTIONAL TERMINAL & CANDLESTICK CHART */}
          <div className="pt-2 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-[#D8DFEA] bg-[#0A0F1D] text-white shadow-2xl overflow-hidden text-left ring-1 ring-slate-800">
              {/* Terminal Window Header */}
              <div className="border-b border-slate-800/80 bg-[#0E1528] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-2">
                    <span className="text-[#245BDB] font-bold tracking-wide">FALCON VISION ENGINE</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-white font-bold">BTC/USDT</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">1H Candlestick</span>
                    <span className="text-slate-600 hidden sm:inline">·</span>
                    <span className="text-emerald-400 font-bold hidden sm:inline">$68,520.00 (+3.42%)</span>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('tradePlan')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                      activePreviewTab === 'tradePlan'
                        ? 'bg-[#245BDB] text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Trade Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('levels')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                      activePreviewTab === 'levels'
                        ? 'bg-[#245BDB] text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Key Levels
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('structure')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                      activePreviewTab === 'structure'
                        ? 'bg-[#245BDB] text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Confluence
                  </button>
                </div>
              </div>

              {/* Chart Visual & Execution Telemetry */}
              <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* SVG Candlestick Chart Display */}
                <div className="lg:col-span-7 bg-[#0D1322] border border-slate-800 rounded-xl p-3 sm:p-4 relative overflow-hidden">
                  {/* Chart Header Bar */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2 border-b border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">Binance Perpetual</span>
                      <span className="text-slate-600">|</span>
                      <span>O: 68,120</span>
                      <span>H: 68,690</span>
                      <span>L: 68,040</span>
                      <span className="text-emerald-400 font-bold">C: 68,520</span>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  {/* High Fidelity SVG Chart */}
                  <svg className="w-full h-52 sm:h-64" viewBox="0 0 540 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Horizontal Grid Lines */}
                    <line x1="0" y1="35" x2="490" y2="35" stroke="#1E293B" strokeDasharray="3 3" />
                    <line x1="0" y1="80" x2="490" y2="80" stroke="#1E293B" strokeDasharray="3 3" />
                    <line x1="0" y1="130" x2="490" y2="130" stroke="#1E293B" strokeDasharray="3 3" />
                    <line x1="0" y1="180" x2="490" y2="180" stroke="#1E293B" strokeDasharray="3 3" />
                    <line x1="0" y1="220" x2="490" y2="220" stroke="#1E293B" strokeDasharray="3 3" />

                    {/* Right Price Scale Divider */}
                    <line x1="490" y1="0" x2="490" y2="240" stroke="#1E293B" />
                    <text x="495" y="38" fill="#16A36A" fontSize="9" fontFamily="monospace" fontWeight="bold">71,800</text>
                    <text x="495" y="83" fill="#16A36A" fontSize="9" fontFamily="monospace">70,250</text>
                    <text x="495" y="133" fill="#60A5FA" fontSize="9" fontFamily="monospace" fontWeight="bold">68,520</text>
                    <text x="495" y="183" fill="#DC4655" fontSize="9" fontFamily="monospace" fontWeight="bold">67,200</text>
                    <text x="495" y="223" fill="#64748B" fontSize="9" fontFamily="monospace">66,500</text>

                    {/* Bottom Time Scale Divider */}
                    <line x1="0" y1="240" x2="490" y2="240" stroke="#1E293B" />
                    <text x="30" y="252" fill="#64748B" fontSize="8" fontFamily="monospace">08:00</text>
                    <text x="110" y="252" fill="#64748B" fontSize="8" fontFamily="monospace">10:00</text>
                    <text x="190" y="252" fill="#64748B" fontSize="8" fontFamily="monospace">12:00</text>
                    <text x="270" y="252" fill="#64748B" fontSize="8" fontFamily="monospace">14:00</text>
                    <text x="350" y="252" fill="#64748B" fontSize="8" fontFamily="monospace">16:00</text>
                    <text x="430" y="252" fill="#64748B" fontSize="8" fontFamily="monospace">18:00</text>

                    {/* Take Profit 2 Target Band ($71,800) */}
                    <rect x="0" y="26" width="490" height="18" fill="rgba(22, 163, 106, 0.12)" />
                    <line x1="0" y1="35" x2="490" y2="35" stroke="#16A36A" strokeWidth="1.5" strokeDasharray="5 3" />
                    <rect x="360" y="22" width="125" height="15" rx="3" fill="#16A36A" />
                    <text x="366" y="33" fill="#FFFFFF" fontSize="8.5" fontFamily="monospace" fontWeight="bold">TP2: $71,800 (+4.8%)</text>

                    {/* Take Profit 1 Target Band ($70,250) */}
                    <rect x="0" y="73" width="490" height="14" fill="rgba(22, 163, 106, 0.08)" />
                    <line x1="0" y1="80" x2="490" y2="80" stroke="#16A36A" strokeWidth="1" strokeDasharray="4 2" />
                    <rect x="360" y="72" width="125" height="15" rx="3" fill="rgba(22, 163, 106, 0.85)" />
                    <text x="366" y="83" fill="#FFFFFF" fontSize="8.5" fontFamily="monospace" fontWeight="bold">TP1: $70,250 (+2.6%)</text>

                    {/* Dynamic Entry Zone ($68,450 - $68,600) */}
                    <rect x="0" y="120" width="490" height="26" fill="rgba(36, 91, 219, 0.22)" />
                    <line x1="0" y1="120" x2="490" y2="120" stroke="#245BDB" strokeWidth="1.5" />
                    <line x1="0" y1="146" x2="490" y2="146" stroke="#245BDB" strokeWidth="1.5" />
                    <rect x="15" y="124" width="185" height="16" rx="3" fill="#245BDB" />
                    <text x="22" y="136" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">ENTRY ZONE: $68,450 – $68,600</text>

                    {/* Invalidation Stop-Loss ($67,200) */}
                    <rect x="0" y="174" width="490" height="14" fill="rgba(220, 70, 85, 0.14)" />
                    <line x1="0" y1="180" x2="490" y2="180" stroke="#DC4655" strokeWidth="1.5" />
                    <rect x="350" y="172" width="135" height="15" rx="3" fill="#DC4655" />
                    <text x="356" y="183" fill="#FFFFFF" fontSize="8.5" fontFamily="monospace" fontWeight="bold">STOP: $67,200 (-1.9%)</text>

                    {/* 200 EMA Smooth Curve */}
                    <path
                      d="M 10 195 C 100 190, 180 182, 260 165 C 330 150, 400 135, 480 120"
                      stroke="#F59E0B"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      fill="none"
                      opacity="0.8"
                    />

                    {/* Volume Histogram Bars (at bottom) */}
                    <rect x="25" y="222" width="6" height="16" fill="rgba(220, 70, 85, 0.4)" />
                    <rect x="45" y="218" width="6" height="20" fill="rgba(22, 163, 106, 0.4)" />
                    <rect x="65" y="226" width="6" height="12" fill="rgba(220, 70, 85, 0.3)" />
                    <rect x="85" y="214" width="6" height="24" fill="rgba(22, 163, 106, 0.5)" />
                    <rect x="105" y="210" width="6" height="28" fill="rgba(22, 163, 106, 0.6)" />
                    <rect x="125" y="220" width="6" height="18" fill="rgba(220, 70, 85, 0.4)" />
                    <rect x="145" y="216" width="6" height="22" fill="rgba(22, 163, 106, 0.4)" />
                    <rect x="165" y="206" width="6" height="32" fill="rgba(22, 163, 106, 0.7)" />
                    <rect x="185" y="224" width="6" height="14" fill="rgba(220, 70, 85, 0.3)" />
                    <rect x="205" y="215" width="6" height="23" fill="rgba(22, 163, 106, 0.5)" />
                    <rect x="225" y="210" width="6" height="28" fill="rgba(22, 163, 106, 0.6)" />
                    <rect x="245" y="225" width="6" height="13" fill="rgba(220, 70, 85, 0.3)" />
                    <rect x="265" y="208" width="6" height="30" fill="rgba(22, 163, 106, 0.7)" />
                    <rect x="285" y="202" width="6" height="36" fill="rgba(22, 163, 106, 0.85)" />
                    <rect x="305" y="212" width="6" height="26" fill="rgba(220, 70, 85, 0.4)" />
                    <rect x="325" y="196" width="6" height="42" fill="rgba(22, 163, 106, 0.9)" />
                    <rect x="345" y="190" width="6" height="48" fill="rgba(22, 163, 106, 1.0)" />

                    {/* Realistic Candlesticks */}
                    {/* Candle 1 (Red) */}
                    <line x1="28" y1="175" x2="28" y2="205" stroke="#DC4655" strokeWidth="1.2" />
                    <rect x="24" y="180" width="8" height="18" fill="#DC4655" />

                    {/* Candle 2 (Green) */}
                    <line x1="48" y1="170" x2="48" y2="198" stroke="#16A36A" strokeWidth="1.2" />
                    <rect x="44" y="174" width="8" height="18" fill="#16A36A" />

                    {/* Candle 3 (Red) */}
                    <line x1="68" y1="165" x2="68" y2="192" stroke="#DC4655" strokeWidth="1.2" />
                    <rect x="64" y="172" width="8" height="14" fill="#DC4655" />

                    {/* Candle 4 (Green) */}
                    <line x1="88" y1="160" x2="88" y2="185" stroke="#16A36A" strokeWidth="1.2" />
                    <rect x="84" y="162" width="8" height="20" fill="#16A36A" />

                    {/* Candle 5 (Green) */}
                    <line x1="108" y1="150" x2="108" y2="180" stroke="#16A36A" strokeWidth="1.2" />
                    <rect x="104" y="154" width="8" height="22" fill="#16A36A" />

                    {/* Candle 6 (Red Retrace) */}
                    <line x1="128" y1="152" x2="128" y2="175" stroke="#DC4655" strokeWidth="1.2" />
                    <rect x="124" y="156" width="8" height="12" fill="#DC4655" />

                    {/* Candle 7 (Green) */}
                    <line x1="148" y1="142" x2="148" y2="170" stroke="#16A36A" strokeWidth="1.2" />
                    <rect x="144" y="146" width="8" height="20" fill="#16A36A" />

                    {/* Candle 8 (Green Strong) */}
                    <line x1="168" y1="130" x2="168" y2="160" stroke="#16A36A" strokeWidth="1.2" />
                    <rect x="164" y="134" width="8" height="24" fill="#16A36A" />

                    {/* Candle 9 (Small Doji) */}
                    <line x1="188" y1="126" x2="188" y2="152" stroke="#DC4655" strokeWidth="1.2" />
                    <rect x="184" y="136" width="8" height="6" fill="#DC4655" />

                    {/* Candle 10 (Green) */}
                    <line x1="208" y1="122" x2="208" y2="148" stroke="#16A36A" strokeWidth="1.2" />
                    <rect x="204" y="125" width="8" height="16" fill="#16A36A" />

                    {/* Candle 11 (Green) */}
                    <line x1="228" y1="115" x2="228" y2="142" stroke="#16A36A" strokeWidth="1.2" />
                    <rect x="224" y="118" width="8" height="20" fill="#16A36A" />

                    {/* Candle 12 (Red Dip into Entry Zone) */}
                    <line x1="248" y1="120" x2="248" y2="146" stroke="#DC4655" strokeWidth="1.2" />
                    <rect x="244" y="124" width="8" height="16" fill="#DC4655" />

                    {/* Candle 13 (Hammer / Long Lower Wick Rejection) */}
                    <line x1="268" y1="118" x2="268" y2="152" stroke="#16A36A" strokeWidth="1.5" />
                    <rect x="264" y="120" width="8" height="12" fill="#16A36A" />

                    {/* Candle 14 (Bullish Engulfing inside Entry Zone) */}
                    <line x1="288" y1="110" x2="288" y2="136" stroke="#16A36A" strokeWidth="1.5" />
                    <rect x="284" y="112" width="8" height="22" fill="#16A36A" />

                    {/* Candle 15 (Small Retest) */}
                    <line x1="308" y1="114" x2="308" y2="132" stroke="#DC4655" strokeWidth="1.2" />
                    <rect x="304" y="118" width="8" height="8" fill="#DC4655" />

                    {/* Candle 16 (Impulsive Breakout) */}
                    <line x1="328" y1="92" x2="328" y2="124" stroke="#16A36A" strokeWidth="1.5" />
                    <rect x="324" y="96" width="8" height="26" fill="#16A36A" />

                    {/* Candle 17 (Active Candle surging toward TP1) */}
                    <line x1="348" y1="78" x2="348" y2="108" stroke="#16A36A" strokeWidth="1.5" />
                    <rect x="344" y="82" width="8" height="24" fill="#16A36A" />

                    {/* Projected Target Trajectory */}
                    <path
                      d="M 352 86 Q 390 62 450 36"
                      stroke="#38BDF8"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      fill="none"
                    />
                    <polygon points="450,33 456,41 445,40" fill="#38BDF8" />
                  </svg>
                </div>

                {/* Right Analytical Telemetry Card */}
                <div className="lg:col-span-5 space-y-3 font-mono text-xs">
                  {activePreviewTab === 'tradePlan' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-emerald-400 uppercase font-semibold">SIGNAL VERDICT</div>
                          <div className="text-base font-bold text-emerald-300">BUY / LONG SETUP</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">CONFIDENCE</div>
                          <div className="text-sm font-bold text-white">88%</div>
                        </div>
                      </div>

                      <div className="space-y-2 p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Risk / Reward Ratio</span>
                          <span className="text-emerald-400 font-bold">1:2.45</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Entry Zone</span>
                          <span className="text-blue-400 font-bold">$68,450 – $68,600</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Stop Loss (Invalidation)</span>
                          <span className="text-rose-400 font-bold">$67,200 (-1.9%)</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Take Profit 1</span>
                          <span className="text-emerald-400 font-bold">$70,250 (+2.6%)</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Take Profit 2</span>
                          <span className="text-emerald-400 font-bold">$71,800 (+4.8%)</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Confirmed 1H liquidity sweep with fair value gap reclaim. Structural support held with rising volume.
                      </p>
                    </div>
                  )}

                  {activePreviewTab === 'levels' && (
                    <div className="space-y-2.5">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Identified Key Levels</div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Major Resistance 2</span>
                          <span className="text-emerald-400 font-bold">$71,800</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Weekly VWAP (TP1)</span>
                          <span className="text-emerald-300 font-medium">$70,250</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Point of Control (POC)</span>
                          <span className="text-blue-400 font-bold">$68,520</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Intermediate Support</span>
                          <span className="text-rose-300 font-medium">$67,800</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Structural Invalidation</span>
                          <span className="text-rose-400 font-bold">$67,200</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        All levels extracted directly from pixel coordinates of candlesticks and horizontal price scale axes.
                      </p>
                    </div>
                  )}

                  {activePreviewTab === 'structure' && (
                    <div className="space-y-2.5">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Multi-Timeframe Confluence</div>
                      <div className="space-y-2 text-[11px]">
                        <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">Daily Trend:</span>
                          <span className="text-emerald-400 font-bold">Bullish (Above 200 EMA)</span>
                        </div>
                        <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">4H Structure:</span>
                          <span className="text-blue-400 font-bold">Higher Low Confirmed</span>
                        </div>
                        <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">15M Trigger:</span>
                          <span className="text-emerald-400 font-bold">Bullish Engulfing</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Multi-timeframe alignment confirms order flow confluence and filters counter-trend false breakouts.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MINIMAL FOOTER */}
      <footer className="border-t border-[#D8DFEA] bg-white py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#182338]">Falcon Analyze</span>
            <span>·</span>
            <span>See the Market. Understand the Move.</span>
          </div>
          <div className="text-[11px] text-[#94A3B8]">
            Institutional AI Market Intelligence
          </div>
        </div>
      </footer>
    </div>
  );
};
