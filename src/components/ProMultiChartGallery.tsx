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
      title: 'CHART 1',
      role: 'Overall Trend & Market Structure (Macro Direction)',
      roleIcon: Layers,
      accentColor: 'text-[#245BDB]',
      borderColor: 'border-[#D8DFEA]',
      badgeBg: 'bg-[#E8F0FF] text-[#245BDB] border-[#245BDB]/30',
      geminiData: analysis?.multiTimeframeAnalysis?.chart1,
    },
    {
      slotNum: 2,
      title: 'CHART 2',
      role: 'Support & Resistance / Confluence (Key Reaction Zones)',
      roleIcon: Shield,
      accentColor: 'text-[#16B8D4]',
      borderColor: 'border-[#D8DFEA]',
      badgeBg: 'bg-[#16B8D4]/10 text-[#16B8D4] border-[#16B8D4]/30',
      geminiData: analysis?.multiTimeframeAnalysis?.chart2,
    },
    {
      slotNum: 3,
      title: 'CHART 3',
      role: 'Entry Setup & Precision Trigger (Execution & Invalidation)',
      roleIcon: Target,
      accentColor: 'text-[#16A36A]',
      borderColor: 'border-[#D8DFEA]',
      badgeBg: 'bg-[#16A36A]/10 text-[#16A36A] border-[#16A36A]/30',
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
      className="bg-white border border-[#D8DFEA] rounded-xl p-4 sm:p-5 shadow-card space-y-4"
      id="pro-three-charts-showcase"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D8DFEA]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#E8F0FF] border border-[#245BDB]/30 text-[#245BDB]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[#182338]">
                ORIGINAL MULTI-TIMEFRAME CHARTS
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16A36A]/10 text-[#16A36A] border border-[#16A36A]/30 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {validImages.length} SCANNED BY GEMINI VISION
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
              Top-Down Analysis: Higher Timeframe (Direction) → Middle Timeframe (S/R Confluence) → Lower Timeframe (Entry)
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-[#245BDB]" />
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
          const displayTf = img.timeframe || meta.geminiData?.timeframe || `Chart ${idx + 1}`;
          const obsText = meta.geminiData?.observations || meta.geminiData?.role;

          return (
            <div
              key={img.id || idx}
              className="bg-white border border-[#D8DFEA] rounded-xl overflow-hidden flex flex-col transition-all hover:border-[#245BDB] shadow-sm group"
            >
              {/* Card Top Header */}
              <div className="p-3 bg-[#E9EDF5] border-b border-[#D8DFEA] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-[#16A36A] shrink-0" />
                  <span className="text-xs font-mono font-bold text-[#182338] truncate">
                    {meta.title}
                  </span>
                </div>
              </div>

              {/* Role Sub-Banner */}
              <div className="px-3 py-1.5 bg-[#F2F4F8] border-b border-[#D8DFEA] flex items-center gap-1.5 text-[11px] font-mono text-[#64748B]">
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
                <div className="absolute inset-0 bg-[#182338]/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-mono text-white pointer-events-none">
                  <span className="px-3 py-1.5 rounded-lg bg-[#182338]/95 border border-[#D8DFEA]/40 shadow-xl flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-[#16B8D4]" />
                    Inspect High-Res
                  </span>
                </div>
              </div>

              {/* Card Footer: Synthesis Findings */}
              <div className="p-3 bg-white border-t border-[#D8DFEA] text-[11px] font-mono space-y-1.5">
                <div className="flex items-center justify-between text-[#64748B] text-[10px]">
                  <span>VISUAL EVIDENCE:</span>
                  <span className="text-[#16A36A] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Scanned
                  </span>
                </div>
                <p className="text-[#182338] line-clamp-2 leading-relaxed text-[11px]">
                  {obsText || `${displayTf} chart evaluated for ${meta.role.toLowerCase()}.`}
                </p>
                {(meta.geminiData?.support1?.price || meta.geminiData?.resistance1?.price) && (
                  <div className="pt-1.5 border-t border-[#D8DFEA] flex items-center justify-between text-[11px] font-mono">
                    {meta.geminiData?.support1?.price && (
                      <span className="text-[#16A36A]" title={meta.geminiData.support1.rationale || 'Support S1'}>
                        <strong className="text-[#64748B] font-semibold text-[10px]">S1:</strong> ${typeof meta.geminiData.support1.price === 'number' ? meta.geminiData.support1.price.toLocaleString() : meta.geminiData.support1.price}
                      </span>
                    )}
                    {meta.geminiData?.resistance1?.price && (
                      <span className="text-[#DC4655]" title={meta.geminiData.resistance1.rationale || 'Resistance R1'}>
                        <strong className="text-[#64748B] font-semibold text-[10px]">R1:</strong> ${typeof meta.geminiData.resistance1.price === 'number' ? meta.geminiData.resistance1.price.toLocaleString() : meta.geminiData.resistance1.price}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox / High-Res Inspection Modal */}
      {selectedZoomIndex !== null && validImages[selectedZoomIndex] && (
        <div
          className="fixed inset-0 z-50 bg-[#182338]/85 backdrop-blur-sm flex flex-col p-4 sm:p-6"
          onClick={handleCloseLightbox}
        >
          {/* Lightbox Controls Bar */}
          <div
            className="flex items-center justify-between gap-4 p-3 bg-[#E9EDF5] border border-[#D8DFEA] rounded-xl mb-4 text-[#182338] font-mono text-xs max-w-5xl w-full mx-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#182338]">
                {slotMetadata[selectedZoomIndex]?.title || `CHART ${selectedZoomIndex + 1}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 rounded bg-white hover:bg-[#F2F4F8] text-[#182338] border border-[#D8DFEA] cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs px-2 text-[#182338] font-bold">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-1.5 rounded bg-white hover:bg-[#F2F4F8] text-[#182338] border border-[#D8DFEA] cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 rounded bg-white hover:bg-[#F2F4F8] text-[#182338] border border-[#D8DFEA] cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCloseLightbox}
                className="p-1.5 rounded bg-white hover:bg-rose-50 text-[#DC4655] border border-[#D8DFEA] hover:border-[#DC4655]/40 cursor-pointer ml-2"
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
