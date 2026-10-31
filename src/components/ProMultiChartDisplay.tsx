import React, { useState, useRef } from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Trash2,
  Plus,
  Sparkles,
  CheckCircle2,
  FileImage,
  Crosshair,
  RotateCcw,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { ChartImageItem, ChartAnalysisResult } from '../types';

interface ProMultiChartDisplayProps {
  images: ChartImageItem[];
  setImages: React.Dispatch<React.SetStateAction<ChartImageItem[]>>;
  activeImageIndex: number;
  setActiveImageIndex: React.Dispatch<React.SetStateAction<number>>;
  analysis: ChartAnalysisResult | null;
  isAnalyzing: boolean;
  onAddImageClick?: () => void;
}

export const ProMultiChartDisplay: React.FC<ProMultiChartDisplayProps> = ({
  images,
  setImages,
  activeImageIndex,
  setActiveImageIndex,
  analysis,
  isAnalyzing,
  onAddImageClick,
}) => {
  const [modalImageIndex, setModalImageIndex] = useState<number | null>(null);
  const [modalZoom, setModalZoom] = useState(1);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const fileInputRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];

  const handleSlotUpload = (slotIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImages((prev) => {
          const currentList = Array.isArray(prev)
            ? prev.filter((item) => Boolean(item && item.base64 && typeof item.base64 === 'string' && item.base64.trim().length > 0))
            : [];
          const newItem: ChartImageItem = {
            id: `img_slot_${slotIndex}_${Date.now()}`,
            base64: result,
            mimeType: file.type || 'image/png',
            name: file.name,
          };
          const updated = [...currentList];
          if (slotIndex < updated.length) {
            updated[slotIndex] = newItem;
          } else {
            updated.push(newItem);
          }
          return updated.slice(0, 3);
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages((prev) => {
      const currentList = Array.isArray(prev) ? prev : [];
      const updated = currentList.filter((_, idx) => idx !== indexToRemove);
      return updated;
    });
    setActiveImageIndex((prev) => Math.max(0, prev - 1));
  };

  const handleOpenModal = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalImageIndex(index);
    setModalZoom(1);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const safeImages = Array.isArray(images)
    ? images.filter((img) => Boolean(img && img.base64 && typeof img.base64 === 'string' && img.base64.trim().length > 0))
    : [];
  const totalLoaded = safeImages.length;
  const isComplete = totalLoaded === 3;

  const slotDescriptions = [
    'Chart 1: Macro Trend & Dominant Direction',
    'Chart 2: Intermediate Structure & Key Zones',
    'Chart 3: Precision Trigger & Entry Setup',
  ];

  return (
    <div
      className="bg-white border border-[#D8DFEA] rounded-xl overflow-hidden shadow-card flex flex-col relative"
      id="pro-multi-chart-display"
    >
      {/* Top Header Banner */}
      <div className="bg-[#E9EDF5] border-b border-[#D8DFEA] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isComplete ? 'bg-[#16A36A] animate-pulse' : 'bg-[#D99718]'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#182338] uppercase tracking-wider">
                Pro 3-Chart Viewport
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  isComplete
                    ? 'bg-[#16A36A]/10 text-[#16A36A] border-[#16A36A]/30 shadow-xs'
                    : 'bg-[#D99718]/10 text-[#D99718] border-[#D99718]/30'
                }`}
              >
                {totalLoaded} of 3 Charts Loaded {isComplete ? '• Ready to Scan' : '• 3 Required'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
              All 3 charts displayed simultaneously on one screen & synthesized together by Gemini Vision
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2">
          {totalLoaded < 3 && onAddImageClick && (
            <button
              type="button"
              onClick={onAddImageClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#245BDB] hover:bg-[#1948B8] text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
              title="Add another screenshot"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Next Chart ({totalLoaded + 1}/3)</span>
            </button>
          )}
        </div>
      </div>

      {/* Analyzing Laser Scanning Banner */}
      {isAnalyzing && (
        <div className="bg-[#E8F0FF] border-b border-[#245BDB]/30 px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-mono text-[#245BDB] animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#245BDB] animate-spin" />
            <span className="font-bold">
              GEMINI VISION SCANNING ALL 3 CHARTS: Reading Chart 1, Chart 2, & Chart 3 simultaneously...
            </span>
          </div>
          <span className="text-[10px] text-[#245BDB] bg-white px-2 py-0.5 rounded border border-[#245BDB]/30 font-bold">
            3 / 3 Images Transmitted
          </span>
        </div>
      )}

      {/* 3-Chart Grid Display: [ CHART 1 ] [ CHART 2 ] [ CHART 3 ] */}
      <div className="p-4 bg-[#F2F4F8] flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {[0, 1, 2].map((slotIdx) => {
            const img = safeImages[slotIdx];
            const slotNum = slotIdx + 1;
            const hasImage = Boolean(img && img.base64 && typeof img.base64 === 'string' && img.base64.trim().length > 0);

            return (
              <div
                key={slotIdx}
                className={`bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col transition-all ${
                  hasImage
                    ? 'border-[#D8DFEA] hover:border-[#245BDB]'
                    : 'border-dashed border-[#D8DFEA] hover:border-[#245BDB] bg-white/70'
                }`}
              >
                {/* Slot Header */}
                <div className="bg-[#E9EDF5] border-b border-[#D8DFEA] px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        slotIdx === 0 ? 'bg-[#16B8D4]' : slotIdx === 1 ? 'bg-[#16A36A]' : 'bg-[#D99718]'
                      }`}
                    />
                    <span className="text-xs font-mono font-bold text-[#182338] tracking-wide truncate">
                      CHART {slotNum}
                    </span>
                    {hasImage && img.name && (
                      <span className="text-[10px] font-mono text-[#64748B] truncate max-w-[80px]" title={img.name}>
                        • {img.name}
                      </span>
                    )}
                  </div>

                  {hasImage ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleOpenModal(slotIdx, e)}
                        className="p-1 rounded bg-white hover:bg-[#F2F4F8] text-[#182338] border border-[#D8DFEA] transition-all cursor-pointer"
                        title={`Enlarge Chart ${slotNum}`}
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveImage(slotIdx, e)}
                        className="p-1 rounded bg-white hover:bg-rose-50 text-[#64748B] hover:text-[#DC4655] border border-[#D8DFEA] hover:border-[#DC4655]/40 transition-all cursor-pointer"
                        title={`Remove Chart ${slotNum}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#64748B] border border-[#D8DFEA]">
                      Empty Slot {slotNum}
                    </span>
                  )}
                </div>

                {/* Hidden File Input for this Slot */}
                <input
                  ref={fileInputRefs[slotIdx]}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSlotUpload(slotIdx, e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />

                {/* Image View or Drop Slot */}
                {hasImage ? (
                  <div
                    className="p-2 bg-[#06080E] flex flex-col items-center justify-center min-h-[260px] flex-1 cursor-pointer group/chart"
                    onClick={(e) => handleOpenModal(slotIdx, e)}
                  >
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        src={img.base64}
                        alt={`Chart ${slotNum}`}
                        className="max-h-[280px] w-auto max-w-full rounded object-contain border border-slate-800 shadow-md group-hover/chart:border-[#245BDB]/70 transition-all"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/chart:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-mono text-[#16B8D4]">
                        <Maximize2 className="w-4 h-4" /> Click to Enlarge
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRefs[slotIdx].current?.click()}
                    className="p-5 flex flex-col items-center justify-center min-h-[260px] flex-1 text-center cursor-pointer hover:bg-[#E9EDF5]/60 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#E8F0FF] group-hover:bg-[#245BDB] border border-[#D8DFEA] group-hover:border-[#245BDB] flex items-center justify-center text-[#245BDB] group-hover:text-white transition-all mb-2.5 shadow-xs">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-mono font-bold text-[#182338] group-hover:text-[#245BDB] mb-1">
                      Upload Chart {slotNum}
                    </div>
                    <p className="text-[10px] font-mono text-[#64748B] max-w-[170px] leading-relaxed">
                      {slotDescriptions[slotIdx]}
                    </p>
                    <span className="mt-3 px-2 py-1 rounded bg-white hover:bg-[#F2F4F8] text-[#182338] text-[10px] font-mono border border-[#D8DFEA] shadow-xs">
                      Browse File
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Status Confirmation Banner */}
        <div className="mt-4">
          {isComplete ? (
            <div className="bg-[#16A36A]/10 border border-[#16A36A]/30 rounded-xl p-3 flex items-center justify-between text-xs font-mono text-[#16A36A] animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A36A] shrink-0" />
                <span>
                  All 3 chart screenshots loaded. Click <strong>"SCAN 3 CHARTS"</strong> to begin multi-timeframe analysis.
                </span>
              </div>
              <span className="text-[10px] font-bold bg-[#16A36A] text-white px-2 py-0.5 rounded shadow-xs shrink-0">
                PRO 3/3 READY
              </span>
            </div>
          ) : (
            <div className="bg-[#D99718]/10 border border-[#D99718]/30 rounded-xl p-3 flex items-center justify-between text-xs font-mono text-[#D99718]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#D99718] shrink-0" />
                <span>
                  Pro mode requires all 3 screenshots to compare higher, middle, and lower timeframes ({totalLoaded}/3 loaded).
                </span>
              </div>
              <span className="text-[10px] font-bold bg-[#D99718] text-white px-2 py-0.5 rounded shadow-xs shrink-0">
                {3 - totalLoaded} MORE NEEDED
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="bg-[#E9EDF5] border-t border-[#D8DFEA] px-4 py-2.5 flex items-center justify-between text-[11px] font-mono text-[#64748B]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[#182338]">
            <Layers className="w-3.5 h-3.5 text-[#245BDB]" />
            <span>{totalLoaded} of 3 Original Screenshots Stored</span>
          </span>
          {analysis && (
            <span className="text-[#182338]">
              Asset: <strong className="text-[#245BDB] font-bold">{analysis.asset}</strong>
            </span>
          )}
        </div>
        <div className="text-[#64748B] text-[10px]">
          Click any chart to zoom with crosshair & full resolution
        </div>
      </div>

      {/* Enlarged Inspection Modal */}
      {modalImageIndex !== null && safeImages[modalImageIndex] && safeImages[modalImageIndex].base64 && (
        <div
          className="fixed inset-0 z-50 bg-[#182338]/80 backdrop-blur-sm flex flex-col p-4 animate-fadeIn"
          onClick={() => setModalImageIndex(null)}
        >
          {/* Modal Header */}
          <div
            className="flex items-center justify-between bg-[#E9EDF5] border border-[#D8DFEA] rounded-t-xl px-4 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A36A]" />
              <span className="text-xs font-mono font-bold text-[#182338] uppercase tracking-wider">
                CHART {modalImageIndex + 1} OF 3 — HIGH RESOLUTION VIEW
              </span>
              {safeImages[modalImageIndex]?.name && (
                <span className="text-xs font-mono text-[#64748B]">
                  ({safeImages[modalImageIndex].name})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCrosshair(!showCrosshair)}
                className={`p-1.5 rounded text-xs font-mono flex items-center transition-all cursor-pointer ${
                  showCrosshair
                    ? 'bg-[#245BDB] text-white border border-[#245BDB] shadow-xs'
                    : 'bg-white text-[#64748B] hover:text-[#182338] hover:bg-[#F2F4F8] border border-[#D8DFEA]'
                }`}
                title="Toggle Precision Crosshair"
              >
                <Crosshair className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setModalZoom((z) => Math.min(z + 0.25, 3))}
                className="p-1.5 rounded bg-white hover:bg-[#F2F4F8] text-[#182338] border border-[#D8DFEA] cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setModalZoom((z) => Math.max(z - 0.25, 0.5))}
                className="p-1.5 rounded bg-white hover:bg-[#F2F4F8] text-[#182338] border border-[#D8DFEA] cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setModalZoom(1)}
                className="p-1.5 rounded bg-white hover:bg-[#F2F4F8] text-[#182338] border border-[#D8DFEA] cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setModalImageIndex(null)}
                className="p-1.5 rounded bg-white hover:bg-rose-50 border border-[#D8DFEA] hover:border-[#DC4655]/40 text-[#DC4655] cursor-pointer ml-2"
                title="Close"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Image Viewport */}
          <div
            className={`flex-1 bg-[#06080E] border-x border-b border-[#D8DFEA] rounded-b-xl overflow-auto flex items-center justify-center p-4 relative ${
              showCrosshair ? 'cursor-crosshair' : 'cursor-default'
            }`}
            onClick={(e) => e.stopPropagation()}
            onMouseMove={handleMouseMove}
          >
            <div
              style={{ transform: `scale(${modalZoom})`, transformOrigin: 'center center' }}
              className="transition-transform duration-100 ease-out"
            >
              <img
                src={safeImages[modalImageIndex]?.base64 || ''}
                alt={`Chart ${modalImageIndex + 1}`}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded border border-slate-800 shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>

            {showCrosshair && mousePos && (
              <div className="absolute inset-0 pointer-events-none z-30">
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-[#D99718]"
                  style={{ top: `${mousePos.y}px` }}
                />
                <div
                  className="absolute top-0 bottom-0 border-l border-dashed border-[#D99718]"
                  style={{ left: `${mousePos.x}px` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
