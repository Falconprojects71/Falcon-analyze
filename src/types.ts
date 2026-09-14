export type MarketTrend =
  | 'BULLISH'
  | 'BEARISH'
  | 'NEUTRAL'
  | 'REVERSAL_BULLISH'
  | 'REVERSAL_BEARISH';

export type TradeSignal =
  | 'STRONG BUY'
  | 'BUY / LONG'
  | 'WAIT / NO TRADE'
  | 'SELL / SHORT'
  | 'STRONG SELL'
  | 'INSUFFICIENT CHART DATA — PLEASE UPLOAD A CLEARER CHART'
  | 'NO RELIABLE SETUP — CHART DATA/PRICE SCALE COULD NOT BE READ CLEARLY.'
  | string;

export type LevelStrength = 'MAJOR' | 'INTERMEDIATE' | 'MINOR' | string;

export interface PriceLevel {
  price: number;
  strength?: LevelStrength;
  label?: string;
  level?: string;
  note?: string;
}

export interface EntryZone {
  min?: number;
  max?: number;
  recommended: number;
  range?: string;
  type?: 'MARKET' | 'LIMIT_PULLBACK' | 'BREAKOUT_CONFIRMATION' | string;
  note?: string;
}

export interface StopLoss {
  price: number;
  percentageRisk?: number;
  percentage?: string;
  rationale?: string;
}

export interface TakeProfit {
  price: number;
  percentageGain?: number;
  riskRewardRatio?: number;
  rrr?: string;
  rationale?: string;
}

export interface TechnicalIndicator {
  name: string;
  status: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  detail: string;
}

export interface MarketStructure {
  type: string;
  description: string;
  keyPoints: string[];
  patternDetected: string;
}

export interface OrderFlowContext {
  fairValueGaps?: string;
  liquidityPools?: string;
  volumeAnalysis?: string;
}

export interface TradePlanExecution {
  stepByStep: string[];
  invalidationCriteria: string;
  riskManagementTips: string;
}

export interface ChartAnalysisResult {
  id: string;
  timestamp: number;
  asset: string;
  timeframe: string;
  tradingStyle: string;
  bias?: string;
  currentPrice: number;
  marketTrend: MarketTrend;
  trendStrength: number; // 0 - 100
  confidence: number; // 0 - 100
  verdict: {
    signal: TradeSignal;
    summary: string;
    timeframeContext: string;
  };
  entryZone: EntryZone;
  supportLevels: PriceLevel[];
  resistanceLevels: PriceLevel[];
  stopLoss: StopLoss;
  takeProfit1: TakeProfit;
  takeProfit2: TakeProfit;
  takeProfit3?: TakeProfit;
  visiblePriceRange?: {
    high?: number;
    low?: number;
  };
  riskRewardRatio: string;
  marketStructure: MarketStructure;
  technicalIndicators: TechnicalIndicator[];
  candlestickPatterns: string[];
  orderFlowContext?: OrderFlowContext;
  multiTimeframeAnalysis?: {
    chart1?: {
      timeframe?: string;
      role?: string;
      observations?: string;
      trend?: string;
    };
    chart2?: {
      timeframe?: string;
      role?: string;
      observations?: string;
      keyLevels?: string;
    };
    chart3?: {
      timeframe?: string;
      role?: string;
      observations?: string;
      setupTrigger?: string;
    };
    confluenceSummary?: string;
    conflictResolution?: string;
  };
  tradePlanExecution: TradePlanExecution;
  detailedExplanation: string;
  imagePreviewUrl?: string;
  scalping?: {
    entry: number;
    stopLoss: number;
  };
  intraday?: {
    entry: number;
    stopLoss: number;
  };
  swing?: {
    entry: number;
    stopLoss: number;
  };
  position?: {
    entry: number;
    stopLoss: number;
  };
  tradeData?: {
    signal: string;
    timeframe?: string;
    entry?: number | null;
    stopLoss?: number | null;
    tp1?: number | null;
    tp2?: number | null;
    support?: number;
    resistance?: number;
    scalping?: { entry: number; stopLoss: number };
    intraday?: { entry: number; stopLoss: number };
    swing?: { entry: number; stopLoss: number };
    position?: { entry: number; stopLoss: number };
  };
}

export interface ChartImageItem {
  id: string;
  base64: string;
  mimeType: string;
  name?: string;
  timeframe?: string;
}

export interface AssetInstrument {
  id: string;
  name: string;
  category: 'Crypto' | 'Forex' | 'Commodities' | 'Energies' | 'Stocks' | 'Indices';
  description: string;
  defaultTradingStyle?: string;
  imageUrl?: string;
}

export type AssetCategoryName = 'Crypto' | 'Forex' | 'Commodities' | 'Energies' | 'Stocks' | 'Indices';

export interface SampleChart {
  id: string;
  name: string;
  asset: string;
  timeframe: string;
  tradingStyle: string;
  description: string;
  imageUrl: string;
}

export interface OwnerUser {
  role: 'OWNER';
  email: string;
  ownerAccess: true;
}

export interface OwnerSessionState {
  isOwner: boolean;
  token: string | null;
  user: OwnerUser | null;
}

export type TestProStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface TestProRecord {
  id: string;
  userIdentifier: string; // Email or unique User ID
  accessType: 'TEST';
  status: TestProStatus;
  grantedBy: string;
  durationDays: number;
  durationLabel: string;
  createdAt: string;
  expiresAt: string;
  remainingTime?: string;
  revokedAt?: string;
  notes?: string;
}

export interface TestProDetails {
  userIdentifier: string;
  accessType: 'TEST';
  status: TestProStatus;
  durationDays: number;
  durationLabel: string;
  createdAt: string;
  expiresAt: string;
  remainingTime: string;
}

export interface AuthUser {
  id: string; // Permanent Unique User ID (e.g. user-7KFuVJ)
  email: string;
  createdAt: string;
  freeAnalysisCount: number;
}

export interface AuthSessionState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
}

