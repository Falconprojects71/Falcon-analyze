import React, { useState, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { ChartAnalysisResult, ChartImageItem } from '../types';

interface ChartAnnotatorProps {
  imageUrl: string;
  analysis?: ChartAnalysisResult | null;
  isAnalyzing: boolean;
  images?: ChartImageItem[];
  activeImageIndex?: number;
  onSelectImageIndex?: (index: number) => void;
  isPro?: boolean;
}

export const ChartAnnotator: React.FC<ChartAnnotatorProps> = ({
  imageUrl,
  analysis,
  isAnalyzing,
  images = [],
  activeImageIndex = 0,
  onSelectImageIndex,
  isPro = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoom(1);

  // Derive active chart info
  const activeImage = images[activeImageIndex];
  const uploadedCount = images.filter((img) => img.base64).length;

  return (
    <div
      className={`bg-[#0D121F] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-[#080B11]' : 'relative'
      }`}
    >
      {/* Top Toolbar */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
            Chart Viewport {analysis?.asset ? `• ${analysis.asset}` : ''}{' '}
            {activeImage?.timeframe ? `(${activeImage.timeframe})` : analysis?.timeframe ? `(${analysis.timeframe})` : ''}
          </span>
          {isPro && uploadedCount > 1 && (
            <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold">
              CHART {activeImageIndex + 1} OF {uploadedCount}
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCrosshair(!showCrosshair)}
            className={`p-1.5 rounded text-xs font-mono flex items-center transition-all cursor-pointer ${
              showCrosshair
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
            }`}
            title="Toggle Precision Crosshair"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Multi-Chart Switcher Banner for PRO when multiple charts are uploaded */}
      {images.length > 1 && uploadedCount > 1 && (
        <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono text-slate-400">PRO MULTI-TIMEFRAME VIEW:</span>
          </div>
          <div className="flex items-center gap-2">
            {images.map((img, idx) => {
              if (!img.base64) return null;
              const isActive = activeImageIndex === idx;
              const defaultRoles = ['Higher TF', 'Middle TF', 'Lower TF'];
              return (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => onSelectImageIndex?.(idx)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-500/50 hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>CHART {idx + 1} ({img.timeframe || defaultRoles[idx] || 'TF'})</span>
                  {isActive && <CheckCircle2 className="w-3 h-3 text-slate-950 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Viewport Canvas Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative flex-1 bg-[#06080E] flex items-center justify-center overflow-auto min-h-[400px] p-4 select-none ${
          showCrosshair ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        {/* Scanning Laser Animation during analysis */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#00F0A0] to-transparent shadow-[0_0_15px_#00F0A0] animate-laser absolute" />
            <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-4">
              <div className="px-4 py-2.5 rounded-xl bg-slate-950/90 border border-emerald-500/50 shadow-2xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
                <div className="text-left">
                  <div className="text-xs font-mono font-bold text-emerald-300">
                    GEMINI VISION SCANNING MULTI-TIMEFRAME STRUCTURE
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Extracting 4H macro trend, 1H confluence & 15M entry timing...
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clean Original Uploaded Chart Image - strictly NO AI overlays */}
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="transition-transform duration-150 ease-out relative inline-block max-w-full"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`Trading Chart ${activeImageIndex + 1}`}
              className="max-h-[600px] w-auto rounded object-contain border border-slate-800/80 shadow-2xl block"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-64 w-80 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-500 font-mono text-xs p-6 text-center">
              <span>No chart image loaded</span>
            </div>
          )}
        </div>

        {/* Precision Crosshair Lines */}
        {showCrosshair && mousePos && (
          <div className="absolute inset-0 pointer-events-none z-30">
            <div
              className="absolute left-0 right-0 border-t border-dashed border-amber-400/50"
              style={{ top: `${mousePos.y}px` }}
            />
            <div
              className="absolute top-0 bottom-0 border-l border-dashed border-amber-400/50"
              style={{ left: `${mousePos.x}px` }}
            />
            <div
              className="absolute px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500 text-[10px] font-mono text-amber-300 shadow-md"
              style={{ top: `${Math.max(10, mousePos.y - 25)}px`, left: `${mousePos.x + 10}px` }}
            >
              Pointer ({Math.round(mousePos.x)}, {Math.round(mousePos.y)})
            </div>
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="bg-slate-900/60 border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          {activeImage?.timeframe && (
            <span>
              Timeframe: <strong className="text-cyan-300">{activeImage.timeframe}</strong>
            </span>
          )}
          {analysis && typeof analysis.currentPrice === 'number' && analysis.currentPrice > 0 && (
            <span>
              Last Price Detected:{' '}
              <strong className="text-white font-bold">${analysis.currentPrice.toLocaleString()}</strong>
            </span>
          )}
        </div>
        <div className="text-slate-500">
          {images.length > 1 && uploadedCount > 1
            ? 'Use tabs above to switch between uploaded timeframes'
            : 'Click & Drag or use mouse wheel to inspect'}
        </div>
      </div>
    </div>
  );
};
