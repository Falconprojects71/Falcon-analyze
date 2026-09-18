import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ChartUploader, ChartImageItem } from './components/ChartUploader';
import { ChartAnnotator } from './components/ChartAnnotator';
import { FreeTradeSetupCard } from './components/FreeTradeSetupCard';
import { ProResultCard } from './components/ProResultCard';
import { ProUpgradeModal } from './components/ProUpgradeModal';
import { OwnerLoginModal } from './components/OwnerLoginModal';
import { UserAccountModal } from './components/UserAccountModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ChartAnalysisResult, OwnerUser, AuthUser, TradeSignal } from './types';
import confetti from 'canvas-confetti';
import { ensureRasterImageBase64 } from './utils/imageUtils';
import {
  AlertCircle,
  BarChart2,
  X,
} from 'lucide-react';
import {
  getDeviceFingerprint,
  getPersistentDeviceId,
  getFormattedUserId,
  getStoredUserIdentifier,
  setStoredUserIdentifier,
  getAuthToken,
  setAuthToken,
} from './utils/deviceFingerprint';

const LOCAL_STORAGE_KEY = 'ai_chart_analysis_history_v1';

export default function App() {
  const [images, setImages] = useState<ChartImageItem[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [plan, setPlan] = useState<'free' | 'pro'>('free');

  const [isOwner, setIsOwner] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('falcon_owner_token'));
  });
  const [ownerToken, setOwnerToken] = useState<string | null>(() => {
    return localStorage.getItem('falcon_owner_token');
  });
  const [ownerUser, setOwnerUser] = useState<OwnerUser | null>(null);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState<boolean>(false);

  const [userId] = useState<string>(() => getFormattedUserId());
  const [userIdentifier, setUserIdentifier] = useState<string>(() => getStoredUserIdentifier());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [, setUserAuthToken] = useState<string | null>(() => getAuthToken());
  const [isUserAccountModalOpen, setIsUserAccountModalOpen] = useState<boolean>(false);

  const [isProUser, setIsProUser] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('falcon_pro_license_key'));
  });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);

  const [isTestPro, setIsTestPro] = useState<boolean>(false);

  const [freeAnalysisCount, setFreeAnalysisCount] = useState<number>(0);
  const [maxFreeAnalyses, setMaxFreeAnalyses] = useState<number>(3);
  const [freeLimitReached, setFreeLimitReached] = useState<boolean>(false);

  const [asset, setAsset] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('4H');
  const [tradingStyle, setTradingStyle] = useState<string>('Swing');
  const [bias, setBias] = useState<string>('Auto');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ChartAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [history, setHistory] = useState<ChartAnalysisResult[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  const fetchUsageStatus = useCallback(async () => {
    try {
      const clientId = getPersistentDeviceId();
      const fingerprint = getDeviceFingerprint();
      const storedLicense = localStorage.getItem('falcon_pro_license_key') || '';
      const storedToken = localStorage.getItem('falcon_owner_token') || '';

      const res = await fetch('/api/usage-status', {
        headers: {
          'x-client-id': clientId,
          'x-device-fingerprint': fingerprint,
          'x-license-key': storedLicense,
          'x-owner-token': storedToken,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const freeCount = typeof data.freeAnalysisCount === 'number' ? data.freeAnalysisCount : 0;
        const maxFree = typeof data.maxFreeAnalyses === 'number' ? data.maxFreeAnalyses : 3;
        const limitReached = Boolean(data.freeLimitReached || freeCount >= maxFree);

        setFreeAnalysisCount(freeCount);
        setMaxFreeAnalyses(maxFree);
        setFreeLimitReached(limitReached);

        const proActive = Boolean(data.isProVerified || data.isPaidPro || data.isTestPro || data.isOwner);
        setIsProUser(proActive);
        setIsTestPro(Boolean(data.isTestPro));
        setIsOwner(Boolean(data.isOwner));
        if (data.isOwner && data.role === 'OWNER') {
          setOwnerUser({
            role: 'OWNER',
            email: 'owner@falconanalyze.com',
            ownerAccess: true,
          });
        }
        if (!proActive) {
          setPlan('free');
        }
      }
    } catch (err) {
      console.warn('Failed to fetch usage status:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsageStatus();
  }, [fetchUsageStatus]);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {}
  }, []);

  const handleSaveIdentifier = async (newIdentifier: string) => {
    setStoredUserIdentifier(newIdentifier);
    setUserIdentifier(newIdentifier);
    fetchUsageStatus();
  };

  const handleUserLogin = async (): Promise<boolean> => {
    fetchUsageStatus();
    return true;
  };
  const handleUserRegister = async (): Promise<boolean> => {
    fetchUsageStatus();
    return true;
  };
  const handleUserLogout = async () => {
    setAuthToken(null);
    setUserAuthToken(null);
    setAuthUser(null);
    fetchUsageStatus();
  };

  const handleOwnerLoginSuccess = (token: string, user: OwnerUser) => {
    setIsOwner(true);
    setOwnerToken(token);
    setOwnerUser(user);
    setIsProUser(true);
    localStorage.setItem('falcon_owner_token', token);
    fetchUsageStatus();
  };

  const handleOwnerLogout = async () => {
    setIsOwner(false);
    setOwnerToken(null);
    setOwnerUser(null);
    localStorage.removeItem('falcon_owner_token');
    fetchUsageStatus();
  };

  const handleActivatePro = async (): Promise<boolean> => {
    setIsProUser(true);
    setPlan('pro');
    fetchUsageStatus();
    return true;
  };

  const handleDeactivatePro = () => {
    setIsProUser(false);
    setPlan('free');
    localStorage.removeItem('falcon_pro_license_key');
    fetchUsageStatus();
  };

  const saveToHistory = (newResult: ChartAnalysisResult) => {
    const updated = [newResult, ...history.filter((h) => h.id !== newResult.id)].slice(0, 20);
    setHistory(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {}
  };

  const handleReset = () => {
    setImages([]);
    setActiveImageIndex(0);
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  const activeImage = images[activeImageIndex] || images[0] || null;

  const handleAnalyze = async () => {
    if (images.length === 0 || !activeImage) {
      setErrorMessage('Upload a chart screenshot to begin analysis.');
      return;
    }

    if (plan === 'free' && !isProUser && (freeLimitReached || freeAnalysisCount >= maxFreeAnalyses)) {
      setIsUpgradeModalOpen(true);
      setErrorMessage('Free limit reached: You have used all 3 free screenshots. Upgrade to PRO to continue.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    const clientId = getPersistentDeviceId();
    const fingerprint = getDeviceFingerprint();
    const storedLicense = localStorage.getItem('falcon_pro_license_key') || '';
    const storedToken = localStorage.getItem('falcon_owner_token') || '';

    try {
      const rasterizedImages = await Promise.all(
        images.map(async (img, index) => {
          const raster = await ensureRasterImageBase64(img.base64, img.mimeType);
          return {
            id: img.id || `img_${index + 1}`,
            name: img.name || `Chart ${index + 1}`,
            imageBase64: raster.base64,
            mimeType: raster.mimeType,
            timeframe: img.timeframe,
          };
        })
      );

      const payload = JSON.stringify({
        images: rasterizedImages,
        plan,
        clientId,
        deviceFingerprint: fingerprint,
        licenseKey: storedLicense,
        asset: asset.trim() || 'CRYPTO/FOREX',
        timeframe: timeframe.trim() || '1H',
        tradingStyle: tradingStyle.trim() || 'Intraday',
        bias: bias.trim() || 'Auto',
        additionalNotes: additionalNotes.trim() || '',
      });

      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId,
          'x-device-fingerprint': fingerprint,
          'x-license-key': storedLicense,
          'x-owner-token': storedToken,
        },
        body: payload,
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error('Server returned invalid response. Check backend connection.');
      }

      if (data?.code === 'FREE_LIMIT_REACHED' || data?.limitReached) {
        setFreeLimitReached(true);
        setFreeAnalysisCount(data.freeAnalysisCount ?? maxFreeAnalyses);
        setIsUpgradeModalOpen(true);
        setErrorMessage(data.error || 'Free limit reached: You have used all 3 free screenshots. Upgrade to PRO to continue.');
        setIsAnalyzing(false);
        return;
      }

      if (!response.ok || !data) {
        throw new Error(data?.error || 'Failed to analyze chart screenshot.');
      }

      if (typeof data.freeAnalysisCount === 'number') {
        setFreeAnalysisCount(data.freeAnalysisCount);
        if (data.freeAnalysisCount >= maxFreeAnalyses || data.freeLimitReached) {
          setFreeLimitReached(true);
        }
      }

      const rawData = data.data || data;

      const cleanedData: ChartAnalysisResult = {
        id: `analysis_${Date.now()}`,
        timestamp: Date.now(),
        asset: rawData.asset || asset || 'BTC/USDT',
        timeframe: rawData.timeframe || timeframe || '1H',
        tradingStyle: tradingStyle,
        marketTrend: rawData.marketTrend || rawData.trend || 'Bullish Structure',
        trendStrength: typeof rawData.trendStrength === 'number' ? rawData.trendStrength : (parseInt(String(rawData.trendStrength)) || 75),
        confidence: typeof rawData.confidence === 'number' ? rawData.confidence : (parseInt(String(rawData.confidence)) || 85),
        currentPrice: Number(rawData.currentPrice || rawData.price || 0),
        verdict: {
          signal: (rawData.verdict?.signal || rawData.signal || 'BUY') as TradeSignal,
          summary: rawData.verdict?.summary || rawData.reason || 'Technical structure aligns with directional momentum.',
          timeframeContext: rawData.verdict?.timeframeContext || `${timeframe || '1H'} Structure Analysis`,
        },
        entryZone: {
          recommended: rawData.entryZone?.recommended !== undefined && rawData.entryZone?.recommended !== null
            ? Number(rawData.entryZone.recommended)
            : (rawData.entry !== undefined && rawData.entry !== null ? Number(rawData.entry) : undefined),
          min: rawData.entryZone?.min !== undefined && rawData.entryZone?.min !== null ? Number(rawData.entryZone.min) : undefined,
          max: rawData.entryZone?.max !== undefined && rawData.entryZone?.max !== null ? Number(rawData.entryZone.max) : undefined,
          range: rawData.entryZone?.range || (rawData.entry ? `${rawData.entry}` : ''),
          type: rawData.entryZone?.type || 'MARKET',
          note: rawData.entryZone?.note || '',
        },
        stopLoss: {
          price: rawData.stopLoss?.price !== undefined && rawData.stopLoss?.price !== null
            ? Number(rawData.stopLoss.price)
            : (rawData.stopLossVal !== undefined ? Number(rawData.stopLossVal) : (rawData.sl !== undefined ? Number(rawData.sl) : undefined)),
          percentageRisk: Number(rawData.stopLoss?.percentageRisk ?? 0),
          percentage: rawData.stopLoss?.percentage || '',
          rationale: rawData.stopLoss?.rationale || rawData.stopLoss?.percentage || '',
        },
        takeProfit1: {
          price: rawData.takeProfit1?.price !== undefined && rawData.takeProfit1?.price !== null
            ? Number(rawData.takeProfit1.price)
            : (rawData.tp1 !== undefined ? Number(rawData.tp1) : undefined),
          percentageGain: Number(rawData.takeProfit1?.percentageGain ?? 0),
          riskRewardRatio: Number(rawData.takeProfit1?.riskRewardRatio ?? 0),
          rrr: rawData.takeProfit1?.rrr || '',
          rationale: rawData.takeProfit1?.rationale || rawData.takeProfit1?.rrr || '',
        },
        takeProfit2: {
          price: rawData.takeProfit2?.price !== undefined && rawData.takeProfit2?.price !== null
            ? Number(rawData.takeProfit2.price)
            : (rawData.tp2 !== undefined ? Number(rawData.tp2) : undefined),
          percentageGain: Number(rawData.takeProfit2?.percentageGain ?? 0),
          riskRewardRatio: Number(rawData.takeProfit2?.riskRewardRatio ?? 0),
          rrr: rawData.takeProfit2?.rrr || '',
          rationale: rawData.takeProfit2?.rationale || rawData.takeProfit2?.rrr || '',
        },
        takeProfit3: rawData.takeProfit3?.price ? {
          price: Number(rawData.takeProfit3.price),
          percentageGain: Number(rawData.takeProfit3.percentageGain ?? 0),
          riskRewardRatio: Number(rawData.takeProfit3.riskRewardRatio ?? 0),
          rrr: rawData.takeProfit3.rrr || '',
          rationale: rawData.takeProfit3.rationale || rawData.takeProfit3.rrr || '',
        } : undefined,
        riskRewardRatio: rawData.riskRewardRatio || '1:2.5',
        supportLevels: Array.isArray(rawData.supportLevels)
          ? rawData.supportLevels
              .map((s: any, idx: number) => ({
                level: s.level || `S${idx + 1}`,
                label: s.label || s.level || `S${idx + 1}`,
                price: Number(s.price ?? s ?? 0),
                strength: s.strength || 'Strong',
                note: s.note || '',
              }))
              .filter((s: any) => s.price > 0)
          : [],
        resistanceLevels: Array.isArray(rawData.resistanceLevels)
          ? rawData.resistanceLevels
              .map((r: any, idx: number) => ({
                level: r.level || `R${idx + 1}`,
                label: r.label || r.level || `R${idx + 1}`,
                price: Number(r.price ?? r ?? 0),
                strength: r.strength || 'Strong',
                note: r.note || '',
              }))
              .filter((r: any) => r.price > 0)
          : [],
        visiblePriceRange: rawData.visiblePriceRange,
        marketStructure: rawData.marketStructure || {
          type: 'Higher Highs & Higher Lows',
          description: 'Sustained momentum above key support level.',
        },
        candlestickPatterns: rawData.candlestickPatterns || ['Bullish Engulfing'],
        technicalIndicators: rawData.technicalIndicators || [
          { name: 'RSI', value: '55', signal: 'Bullish' },
        ],
        orderFlowContext: rawData.orderFlowContext || {
          institutionalBias: 'Bullish Accumulation',
          keyLiquidityPools: 'Equal Highs Sweep',
        },
        multiTimeframeAnalysis: rawData.multiTimeframeAnalysis,
        detailedExplanation: rawData.detailedExplanation || rawData.reason || 'Chart displays healthy market structure with high confidence entry setup.',
        tradePlanExecution: rawData.tradePlanExecution || {
          stepByStep: [
            'Wait for price confirmation within the identified entry range.',
            'Maintain disciplined risk management and adhere strictly to predefined stop loss.',
            'Scale out at primary take profit targets and adjust risk parameters accordingly.',
          ],
          invalidationCriteria: 'Candle close beyond stop loss level invalidates setup structure.',
          riskManagementTips: 'Risk maximum 1-2% of total portfolio equity per position.',
        },
        imagePreviewUrl: activeImage.base64,
      };

      setAnalysisResult(cleanedData);
      saveToHistory(cleanedData);

      // Smooth scroll to the result card container so user immediately sees results
      setTimeout(() => {
        const resultElem =
          document.getElementById('pro-result-card') ||
          document.getElementById('free-trade-setup-card');
        if (resultElem) {
          resultElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (_) {}

    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'An error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-[#E2E8F0] flex flex-col font-sans">
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
        onReset={handleReset}
        isAnalyzing={isAnalyzing}
        isProUser={isProUser}
        isTestPro={isTestPro}
        userId={userIdentifier || userId}
        onOpenUserAccountModal={() => setIsUserAccountModalOpen(true)}
        onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        freeAnalysisCount={freeAnalysisCount}
        maxFreeAnalyses={maxFreeAnalyses}
        freeLimitReached={freeLimitReached}
        isOwner={isOwner}
        onOpenOwnerModal={() => setIsOwnerModalOpen(true)}
        onOwnerLogout={handleOwnerLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs font-mono p-4 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <ChartUploader
              images={images}
              setImages={setImages}
              activeImageIndex={activeImageIndex}
              setActiveImageIndex={setActiveImageIndex}
              plan={plan}
              setPlan={setPlan}
              asset={asset}
              setAsset={setAsset}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              tradingStyle={tradingStyle}
              setTradingStyle={setTradingStyle}
              bias={bias}
              setBias={setBias}
              additionalNotes={additionalNotes}
              setAdditionalNotes={setAdditionalNotes}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              isProUser={isProUser}
              onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
              freeAnalysisCount={freeAnalysisCount}
              maxFreeAnalyses={maxFreeAnalyses}
              freeLimitReached={freeLimitReached}
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            {activeImage ? (
              <ChartAnnotator
                imageUrl={activeImage.base64}
                analysis={analysisResult}
                isAnalyzing={isAnalyzing}
                images={images}
                activeImageIndex={activeImageIndex}
                onSelectImageIndex={setActiveImageIndex}
                isPro={isProUser}
              />
            ) : (
              <div className="h-full min-h-[380px] bg-[#0D121F] border border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <BarChart2 className="w-12 h-12 mb-3 text-slate-700" />
                <h3 className="text-sm font-mono font-bold text-slate-300 mb-1">
                  Upload a chart screenshot to begin analysis.
                </h3>
              </div>
            )}

            {/* Pro 3 Charts: New medium-size Result Card separately below the chart view */}
            {analysisResult && (plan === 'pro' || isProUser || images.length > 1) && (
              <ProResultCard
                analysis={analysisResult}
                selectedInstrument={asset || analysisResult.asset}
                tradingStyle={tradingStyle || analysisResult.tradingStyle}
              />
            )}
          </div>
        </div>

        {/* Free Plan Result Card */}
        {analysisResult && plan === 'free' && !isProUser && images.length <= 1 && (
          <div className="space-y-6 pt-4 border-t border-slate-800/80">
            <FreeTradeSetupCard
              signal={analysisResult.verdict?.signal}
              entryZone={analysisResult.entryZone}
              stopLoss={analysisResult.stopLoss}
              takeProfit1={analysisResult.takeProfit1}
              takeProfit2={analysisResult.takeProfit2}
              asset={analysisResult.asset}
              timeframe={analysisResult.timeframe}
              marketStructure={analysisResult.marketStructure}
              supportLevels={analysisResult.supportLevels}
              resistanceLevels={analysisResult.resistanceLevels}
              reason={analysisResult.verdict?.summary || analysisResult.detailedExplanation}
              marketTrend={analysisResult.marketTrend}
              riskRewardRatio={analysisResult.riskRewardRatio}
              confidence={analysisResult.confidence}
            />
          </div>
        )}
      </main>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectHistory={(item) => setAnalysisResult(item)}
        onClearHistory={handleClearHistory}
      />

      <ProUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        isProUser={isProUser}
        onActivatePro={handleActivatePro}
        onDeactivatePro={handleDeactivatePro}
        onOpenOwnerLogin={() => setIsOwnerModalOpen(true)}
        freeLimitReached={freeLimitReached}
      />

      <UserAccountModal
        isOpen={isUserAccountModalOpen}
        onClose={() => setIsUserAccountModalOpen(false)}
        userId={userId}
        userEmailOrId={userIdentifier}
        isOwner={isOwner}
        isPaidPro={isProUser}
        isTestPro={isTestPro}
        freeAnalysisCount={freeAnalysisCount}
        maxFreeAnalyses={maxFreeAnalyses}
        authUser={authUser}
        onLogin={handleUserLogin}
        onRegister={handleUserRegister}
        onLogout={handleUserLogout}
        onSaveIdentifier={handleSaveIdentifier}
      />

      <OwnerLoginModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        isOwner={isOwner}
        ownerToken={ownerToken}
        ownerUser={ownerUser}
        onLoginSuccess={handleOwnerLoginSuccess}
        onLogout={handleOwnerLogout}
      />
    </div>
  );
}