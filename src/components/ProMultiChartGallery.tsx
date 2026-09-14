import React, { useState } from 'react';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  CheckCircle2,
  Layers,
  Target,
  Shield,
  Eye,
} from 'lucide-react';
import { ChartAnalysisResult, ChartImageItem } from '../types';

interface ProMultiChartGalleryProps {
  images: ChartImageItem[];
  analysis?: ChartAnalysisResult | null;
}

export const ProMultiChartGallery: React.FC<ProMultiChartGalleryProps> = ({
  images,
  analysis,
}) => {
  const [selectedZoomIndex, setSelectedZoomIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Filter valid loaded images
  const validImages = Array.isArray(images)
    ? images.filter(
        (img) =>
          Boolean(img && img.base64 && typeof img.base64 === 'string' && img.base64.trim().length > 0)
      )
    : [];

  if (validImages.length === 0) {
    return null;
  }

  const slotMetadata = [
    {
      slotNum: 1,
      title: 'CHART 1: HIGHER TIMEFRAME',
      defaultTf: '4H',
      role: 'Overall Trend & Market Structure (Macro Direction)',
      roleIcon: Layers,
      accentColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/30',
      badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      geminiData: analysis?.multiTimeframeAnalysis?.chart1,
    },
    {
      slotNum: 2,
      title: 'CHART 2: MIDDLE TIMEFRAME',
      defaultTf: '1H',
      role: 'Support & Resistance / Confluence (Key Reaction Zones)',
      roleIcon: Shield,
      accentColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
      badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      geminiData: analysis?.multiTimeframeAnalysis?.chart2,
    },
    {
      slotNum: 3,
      title: 'CHART 3: LOWER TIMEFRAME',
      defaultTf: '15M',
      role: 'Entry Setup & Precision Trigger (Execution & Invalidation)',
      roleIcon: Target,
      accentColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      geminiData: analysis?.multiTimeframeAnalysis?.chart3,
    },
  ];

  const handleOpenLightbox = (index: number) => {
    setSelectedZoomIndex(index);
    setZoomLevel(1);
  };

  const handleCloseLightbox = () => {
    setSelectedZoomIndex(null);
    setZoomLevel(1);
  };

  return (
    <div
      className="bg-[#0A0E18] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xl space-y-4"
      id="pro-three-charts-showcase"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white">
                ORIGINAL MULTI-TIMEFRAME CHARTS
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {validImages.length} SCANNED BY GEMINI VISION
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Top-Down Analysis: Higher Timeframe (Direction) → Middle Timeframe (S/R Confluence) → Lower Timeframe (Entry)
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Clean Original Charts (No AI Overlays)</span>
        </div>
      </div>

      {/* 3 Charts Grid */}
      <div
        className={`grid gap-4 ${
          validImages.length === 1
            ? 'grid-cols-1'
            : validImages.length === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-3'
        }`}
      >
        {validImages.map((img, idx) => {
          const meta = slotMetadata[idx] || slotMetadata[slotMetadata.length - 1];
          const SlotRoleIcon = meta.roleIcon;
          const displayTf = img.timeframe || meta.defaultTf;
          const obsText = meta.geminiData?.observations || meta.geminiData?.role;

          return (
            <div
              key={img.id || idx}
              className={`bg-slate-900/70 border ${meta.borderColor} rounded-xl overflow-hidden flex flex-col transition-all hover:border-cyan-500/60 group`}
            >
              {/* Card Top Header */}
              <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-xs font-mono font-bold text-slate-200 truncate">
                    {meta.title}
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${meta.badgeBg} shrink-0`}>
                  {displayTf}
                </span>
              </div>

              {/* Role Sub-Banner */}
              <div className="px-3 py-1.5 bg-black/40 border-b border-slate-800/60 flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                <SlotRoleIcon className={`w-3.5 h-3.5 shrink-0 ${meta.accentColor}`} />
                <span className="truncate">{meta.role}</span>
              </div>

              {/* Original Chart Image */}
              <div
                className="relative bg-black flex-1 min-h-[200px] max-h-[280px] sm:max-h-[300px] flex items-center justify-center p-2 cursor-pointer overflow-hidden group/img"
                onClick={() => handleOpenLightbox(idx)}
                title="Click to view full-resolution chart"
              >
                <img
                  src={img.base64}
                  alt={img.name || meta.title}
                  className="w-full h-full object-contain max-h-[270px] transition-transform duration-200 group-hover/img:scale-[1.02]"
                  referrerPolicy="no-referrer"
                />

                {/* Inspect Overlay Trigger */}
                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-mono text-white pointer-events-none">
                  <span className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 shadow-xl flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    Inspect High-Res
                  </span>
                </div>
              </div>

              {/* Card Footer: Synthesis Findings */}
              <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 text-[11px] font-mono space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>VISUAL EVIDENCE:</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Scanned
                  </span>
                </div>
                <p className="text-slate-300 line-clamp-2 leading-relaxed text-[11px]">
                  {obsText || `${displayTf} chart evaluated for ${meta.role.toLowerCase()}.`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox / High-Res Inspection Modal */}
      {selectedZoomIndex !== null && validImages[selectedZoomIndex] && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-4 sm:p-6"
          onClick={handleCloseLightbox}
        >
          {/* Lightbox Controls Bar */}
          <div
            className="flex items-center justify-between gap-4 p-3 bg-slate-900/90 border border-slate-800 rounded-xl mb-4 text-white font-mono text-xs max-w-5xl w-full mx-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200">
                {slotMetadata[selectedZoomIndex]?.title || `CHART ${selectedZoomIndex + 1}`}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {validImages[selectedZoomIndex]?.timeframe || slotMetadata[selectedZoomIndex]?.defaultTf}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs px-2">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCloseLightbox}
                className="p-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 cursor-pointer ml-2"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Container */}
          <div
            className="flex-1 flex items-center justify-center overflow-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={validImages[selectedZoomIndex].base64}
              alt="High resolution chart view"
              style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg border border-slate-800 shadow-2xl origin-center"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
