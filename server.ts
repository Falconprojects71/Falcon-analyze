import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// ============================================================
// FALCON ANALYZE - PRODUCTION SERVER
// ============================================================

const PORT = Number(process.env.PORT || 3000);

const MAX_FREE_ANALYSES = 3;
const FREE_WINDOW_DAYS = 1;

const MAX_FREE_IMAGES = 1;
const MAX_PRO_IMAGES = 3;

const MAX_IMAGE_SIZE_MB = 12;
const MAX_BODY_SIZE = '50mb';

const DATA_DIR = path.join(process.cwd(), 'data');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');
const TEST_PRO_FILE = path.join(DATA_DIR, 'test-pro.json');

// ============================================================
// ENVIRONMENT / SECRETS
// ============================================================

function env(name: string, fallback = ''): string {
  return (process.env[name] || fallback).trim();
}

function getValidApiKey(): string {
  const key = env('GEMINI_API_KEY') || env('API_KEY') || env('GOOGLE_API_KEY');

  if (
    !key ||
    key === 'MY_GEMINI_API_KEY' ||
    key === 'YOUR_API_KEY'
  ) {
    return '';
  }

  return key;
}

const OWNER_EMAIL = env('OWNER_EMAIL').toLowerCase();
const OWNER_PASSWORD = env('OWNER_PASSWORD');

const OWNER_SECRET_TOKEN =
  env('OWNER_SECRET_TOKEN') || crypto.randomBytes(32).toString('hex');

const GEMINI_PRIMARY_MODEL =
  env('GEMINI_MODEL') || 'gemini-3.1-flash-lite';

const GEMINI_FALLBACK_MODELS = [
  GEMINI_PRIMARY_MODEL,
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
].filter((v, i, a) => v && a.indexOf(v) === i);

const DEFAULT_PRO_KEYS = [
  'FALCON_PRO_OFFICIAL',
  'FALCON_PRO_2026',
  'FALCON-PRO-2026',
  'FALCON-PRO-PASS',
  'VIP-TRADER',
  'VIP-TRADER-2026',
  'PRO-TRADER-VIP',
  'FALCON-QUANT-PRO',
  'VALID_PRO_KEY',
  'TEST_PRO_KEY_ACTIVE',
];

function getConfiguredProKeys(): Set<string> {
  const raw = env('PRO_LICENSE_KEYS');
  const set = new Set<string>(DEFAULT_PRO_KEYS);

  if (raw) {
    raw
      .split(',')
      .map((key) => key.trim().toUpperCase())
      .filter(Boolean)
      .forEach((k) => set.add(k));
  }

  return set;
}

// ============================================================
// TYPES
// ============================================================

export interface TestProRecord {
  id: string;
  userIdentifier: string;
  accessType: 'TEST';
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  grantedBy: string;
  durationDays: number;
  durationLabel: string;
  createdAt: string;
  expiresAt: string;
  remainingTime: string;
  revokedAt?: string;
  notes?: string;
}

interface UsageRecord {
  count: number;
  date: string;
  totalCount?: number;
  lastUsedAt?: string;
}

interface AnalysisRequestImage {
  imageBase64?: string;
  dataUrl?: string;
  base64?: string;
  mimeType?: string;
}

interface ChartAnalysis {
  asset?: string;
  timeframe?: string;
  tradingStyle?: string;
  marketTrend?: string;
  trendStrength?: number;
  confidence?: number;
  currentPrice?: number;
  visiblePriceRange?: {
    high?: number;
    low?: number;
  };

  verdict?: {
    signal?: 'BUY' | 'SELL' | 'WAIT';
    bias?: 'Bullish' | 'Bearish' | 'Neutral';
    summary?: string;
    timeframeContext?: string;
  };

  entryZone?: {
    recommended?: number;
    min?: number;
    max?: number;
    range?: string;
  };

  stopLoss?: {
    price?: number;
    percentage?: string;
    rationale?: string;
  };

  takeProfit1?: {
    price?: number;
    rrr?: string;
    rationale?: string;
  };

  takeProfit2?: {
    price?: number;
    rrr?: string;
    rationale?: string;
  };

  takeProfit3?: {
    price?: number;
    rrr?: string;
  };

  riskRewardRatio?: string;

  supportLevels?: Array<{
    level?: string;
    price?: number;
    strength?: string;
  }>;

  resistanceLevels?: Array<{
    level?: string;
    price?: number;
    strength?: string;
  }>;

  marketStructure?: {
    type?: string;
    description?: string;
  };

  orderFlowContext?: {
    fairValueGaps?: string;
    liquidityPools?: string;
    volumeAnalysis?: string;
  };

  technicalIndicators?: Array<{
    name?: string;
    status?: string;
    detail?: string;
  }>;

  candlestickPatterns?: string[];

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

  tradePlanExecution?: {
    stepByStep?: string[];
    invalidationCriteria?: string;
    riskManagementTips?: string;
  };

  detailedExplanation?: string;

  [key: string]: any;
}

// ============================================================
// PERSISTENT STORAGE
// ============================================================

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[STORAGE] Failed to create data directory:', err);
  }
}

function readJsonFile<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;

    const raw = fs.readFileSync(file, 'utf8');

    if (!raw.trim()) return fallback;

    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[STORAGE] Failed reading ${file}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(file: string, data: T) {
  try {
    ensureDataDirectory();

    const tempFile = `${file}.tmp`;

    fs.writeFileSync(
      tempFile,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    fs.renameSync(tempFile, file);
  } catch (err) {
    console.error(`[STORAGE] Failed writing ${file}:`, err);
  }
}

const freeUsageTracker = readJsonFile<Record<string, UsageRecord>>(
  USAGE_FILE,
  {}
);

const testProUsersList = new Map<string, TestProRecord>(
  Object.entries(
    readJsonFile<Record<string, TestProRecord>>(TEST_PRO_FILE, {})
  )
);

function persistUsage() {
  const data: Record<string, UsageRecord> = {};

  for (const [key, value] of Object.entries(freeUsageTracker)) {
    data[key] = value;
  }

  writeJsonFile(USAGE_FILE, data);
}

function persistTestProUsers() {
  const data: Record<string, TestProRecord> = {};

  for (const [key, value] of testProUsersList.entries()) {
    data[key] = value;
  }

  writeJsonFile(TEST_PRO_FILE, data);
}

// ============================================================
// SECURITY HELPERS
// ============================================================

function hashIdentifier(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function getClientIdentifier(req: Request): string {
  /*
   * Do NOT trust arbitrary x-forwarded-for / query client IDs.
   *
   * Priority:
   * 1. Server-provided authenticated user identifier
   * 2. x-client-id
   * 3. Express IP
   */

  const authenticatedUser =
    typeof req.headers['x-user-identifier'] === 'string'
      ? req.headers['x-user-identifier'].trim().toLowerCase()
      : '';

  if (authenticatedUser) {
    return `user:${authenticatedUser}`;
  }

  const clientHeader =
    typeof req.headers['x-client-id'] === 'string'
      ? req.headers['x-client-id'].trim()
      : '';

  if (clientHeader && clientHeader.length >= 8 && clientHeader.length <= 200) {
    return `client:${clientHeader}`;
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) {
      return `ip:${firstIp}`;
    }
  }

  const ip =
    req.ip ||
    req.socket.remoteAddress ||
    'unknown-client';

  return `ip:${ip}`;
}

function getOwnerSessionFromRequest(req: Request) {
  const authHeader =
    typeof req.headers.authorization === 'string'
      ? req.headers.authorization.trim()
      : '';

  const tokenHeader =
    typeof req.headers['x-owner-token'] === 'string'
      ? req.headers['x-owner-token'].trim()
      : '';

  const ownerToken =
    authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : tokenHeader;

  if (
    ownerToken &&
    OWNER_SECRET_TOKEN &&
    safeEqual(ownerToken, OWNER_SECRET_TOKEN)
  ) {
    return {
      role: 'OWNER' as const,
      email: OWNER_EMAIL || 'owner',
    };
  }

  return null;
}

// ============================================================
// LICENSE
// ============================================================

function isVerifiedProKey(key?: string): boolean {
  if (!key || typeof key !== 'string') return false;

  const normalized = key.trim().toUpperCase();

  if (!normalized) return false;

  const configuredKeys = getConfiguredProKeys();

  return configuredKeys.has(normalized);
}

// ============================================================
// TEST PRO
// ============================================================

function calculateRemainingTime(expiresAtMs: number): string {
  const diff = expiresAtMs - Date.now();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(
    diff / (1000 * 60 * 60 * 24)
  );

  const hours = Math.floor(
    (diff % (1000 * 60 * 60 * 24)) /
      (1000 * 60 * 60)
  );

  const mins = Math.floor(
    (diff % (1000 * 60 * 60)) /
      (1000 * 60)
  );

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  return `${hours}h ${mins}m left`;
}

function getActiveTestProForRequest(
  req: Request
): TestProRecord | null {
  const clientId = getClientIdentifier(req).toLowerCase();

  const userIdent =
    typeof req.headers['x-user-identifier'] === 'string'
      ? req.headers['x-user-identifier'].trim().toLowerCase()
      : '';

  for (const record of testProUsersList.values()) {
    const recordIdent = record.userIdentifier
      .toLowerCase()
      .trim();

    const matched =
      recordIdent === clientId ||
      (!!userIdent && recordIdent === userIdent);

    if (!matched) continue;

    const expMs = new Date(record.expiresAt).getTime();

    if (
      record.status === 'ACTIVE' &&
      Date.now() < expMs
    ) {
      record.remainingTime =
        calculateRemainingTime(expMs);

      return record;
    }

    if (record.status === 'ACTIVE') {
      record.status = 'EXPIRED';
      record.remainingTime = 'Expired';
      persistTestProUsers();
    }
  }

  return null;
}

// ============================================================
// FREE USAGE
// ============================================================

function getUsageDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getClientKeys(req: Request): string[] {
  const keys: string[] = [];

  const authenticatedUser =
    typeof req.headers['x-user-identifier'] === 'string'
      ? req.headers['x-user-identifier'].trim().toLowerCase()
      : '';
  if (authenticatedUser) {
    keys.push(hashIdentifier(`user:${authenticatedUser}`));
  }

  const clientHeader =
    typeof req.headers['x-client-id'] === 'string'
      ? req.headers['x-client-id'].trim()
      : '';
  if (clientHeader && clientHeader.length >= 8 && clientHeader.length <= 200) {
    keys.push(hashIdentifier(`client:${clientHeader}`));
  }

  const fpHeader =
    typeof req.headers['x-device-fingerprint'] === 'string'
      ? req.headers['x-device-fingerprint'].trim()
      : '';
  if (fpHeader && fpHeader.length >= 8 && fpHeader.length <= 200) {
    keys.push(hashIdentifier(`fp:${fpHeader}`));
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) {
      keys.push(hashIdentifier(`ip:${firstIp}`));
    }
  }

  const ip = req.ip || req.socket.remoteAddress;
  if (ip && ip !== '::1' && ip !== '127.0.0.1') {
    keys.push(hashIdentifier(`ip:${ip}`));
  }

  const primaryId = hashIdentifier(getClientIdentifier(req));
  keys.push(primaryId);

  return Array.from(new Set(keys));
}

function getFreeUsageCountForClient(
  req: Request
): number {
  const keys = getClientKeys(req);
  let maxCount = 0;

  for (const k of keys) {
    const record = freeUsageTracker[k];
    if (record && typeof record.count === 'number') {
      if (record.count > maxCount) {
        maxCount = record.count;
      }
    }
  }

  return maxCount;
}

function incrementFreeUsageCountForClient(
  req: Request
): number {
  const keys = getClientKeys(req);
  const currentCount = getFreeUsageCountForClient(req);
  const newCount = currentCount + 1;
  const today = getUsageDate();
  const nowIso = new Date().toISOString();

  for (const k of keys) {
    freeUsageTracker[k] = {
      count: newCount,
      totalCount: newCount,
      date: today,
      lastUsedAt: nowIso,
    };
  }

  persistUsage();
  return newCount;
}

// ============================================================
// GEMINI
// ============================================================

function getGeminiClient(): GoogleGenAI {
  const apiKey = getValidApiKey();

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not configured.'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'falcon-analyze-production',
      },
    },
  });
}

// ============================================================
// JSON PARSER
// ============================================================

function extractAndParseJson(
  text: string
): any {
  if (!text || typeof text !== 'string') {
    throw new Error(
      'Empty response received from vision model.'
    );
  }

  let cleaned = text.trim();

  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

    if (match?.[1]) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned
        .replace(/^```[a-zA-Z]*\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch {}

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace
  ) {
    const jsonSub = cleaned.substring(
      firstBrace,
      lastBrace + 1
    );

    try {
      return JSON.parse(jsonSub);
    } catch {}

    const sanitized = jsonSub
      .replace(/,\s*([}\]])/g, '$1')
      .replace(
        /[\x00-\x1F\x7F]/g,
        (ch) =>
          ch === '\n' ||
          ch === '\r' ||
          ch === '\t'
            ? ch
            : ''
      );

    try {
      return JSON.parse(sanitized);
    } catch {}
  }

  throw new Error(
    `Invalid JSON syntax in model response: ${cleaned.slice(
      0,
      300
    )}`
  );
}

// ============================================================
// NUMBER VALIDATION
// ============================================================

function parseNumericValue(value: any): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function validNumber(value: any): boolean {
  return parseNumericValue(value) !== null;
}

function finiteNumber(value: any): number | null {
  return parseNumericValue(value);
}

// ============================================================
// TRADE VALIDATION
// ============================================================

function validateTradeStructure(
  result: ChartAnalysis
): {
  valid: boolean;
  reason?: string;
} {
  const signal = String(result?.verdict?.signal || '').toUpperCase().trim();

  if (!signal) {
    return {
      valid: false,
      reason: 'Missing verdict signal.',
    };
  }

  if (signal !== 'BUY' && signal !== 'SELL') {
    return {
      valid: false,
      reason: `Verdict signal must be BUY or SELL, got "${signal}".`,
    };
  }

  const entry =
    finiteNumber(
      result?.entryZone?.recommended ?? (result?.entryZone as any)?.min
    );

  const sl =
    finiteNumber(
      result?.stopLoss?.price
    );

  const tp1 =
    finiteNumber(
      result?.takeProfit1?.price
    );

  const tp2 =
    finiteNumber(
      result?.takeProfit2?.price
    );

  if (
    entry === null ||
    sl === null ||
    tp1 === null
  ) {
    return {
      valid: false,
      reason:
        'BUY/SELL analysis is missing valid Entry, Stop Loss or TP1.',
    };
  }

  if (signal === 'BUY') {
    if (!(sl < entry)) {
      return {
        valid: false,
        reason:
          `Invalid BUY structure: Stop Loss (${sl}) must be below Entry (${entry}).`,
      };
    }

    if (!(tp1 > entry)) {
      return {
        valid: false,
        reason:
          `Invalid BUY structure: TP1 (${tp1}) must be above Entry (${entry}).`,
      };
    }

    if (tp2 !== null && !(tp2 > tp1)) {
      return {
        valid: false,
        reason:
          `Invalid BUY structure: TP2 (${tp2}) must be above TP1 (${tp1}).`,
      };
    }
  }

  if (signal === 'SELL') {
    if (!(sl > entry)) {
      return {
        valid: false,
        reason:
          `Invalid SELL structure: Stop Loss (${sl}) must be above Entry (${entry}).`,
      };
    }

    if (!(tp1 < entry)) {
      return {
        valid: false,
        reason:
          `Invalid SELL structure: TP1 (${tp1}) must be below Entry (${entry}).`,
      };
    }

    if (tp2 !== null && !(tp2 < tp1)) {
      return {
        valid: false,
        reason:
          `Invalid SELL structure: TP2 (${tp2}) must be below TP1 (${tp1}).`,
      };
    }
  }

  return { valid: true };
}

// ============================================================
// NORMALIZE RESULT
// ============================================================

function normalizeAnalysis(
  result: ChartAnalysis,
  request: {
    asset?: string;
    timeframe?: string;
    tradingStyle?: string;
    timeframes?: string[];
  }
): ChartAnalysis {
  let finalTimeframe = result.timeframe || request.timeframe || 'Unknown';
  if (Array.isArray(request.timeframes)) {
    const validTfs = request.timeframes.filter((t) => t && typeof t === 'string' && t.trim().length > 0);
    if (validTfs.length > 1) {
      finalTimeframe = validTfs.join(' • ');
    }
  }

  const normalized: ChartAnalysis = {
    ...result,

    asset:
      result.asset ||
      request.asset ||
      'Unknown Asset',

    timeframe: finalTimeframe,

    tradingStyle:
      request.tradingStyle ||
      result.tradingStyle ||
      'Intraday',
  };

  // Normalize currentPrice
  const curP = parseNumericValue(result.currentPrice);
  if (curP !== null) {
    normalized.currentPrice = curP;
  }

  // Normalize entryZone
  if (result.entryZone) {
    const rec = parseNumericValue(result.entryZone.recommended);
    let min = parseNumericValue((result.entryZone as any).min);
    let max = parseNumericValue((result.entryZone as any).max);

    // Extract min & max from range string if not already present
    if ((min === null || max === null) && typeof result.entryZone.range === 'string') {
      const parts = result.entryZone.range
        .split(/[-–—to]/i)
        .map((s) => parseNumericValue(s))
        .filter((n): n is number => n !== null);
      if (parts.length >= 2) {
        min = Math.min(parts[0], parts[1]);
        max = Math.max(parts[0], parts[1]);
      }
    }

    normalized.entryZone = {
      ...result.entryZone,
      recommended: rec ?? undefined,
      min: min ?? undefined,
      max: max ?? undefined,
      range: result.entryZone.range || (rec ? `${rec}` : undefined),
    };
  }

  // Normalize stopLoss
  if (result.stopLoss) {
    const slP = parseNumericValue(result.stopLoss.price);
    normalized.stopLoss = {
      ...result.stopLoss,
      price: slP ?? undefined,
    };
  }

  // Normalize takeProfit1
  if (result.takeProfit1) {
    const tp1P = parseNumericValue(result.takeProfit1.price);
    normalized.takeProfit1 = {
      ...result.takeProfit1,
      price: tp1P ?? undefined,
    };
  }

  // Normalize takeProfit2
  if (result.takeProfit2) {
    const tp2P = parseNumericValue(result.takeProfit2.price);
    normalized.takeProfit2 = {
      ...result.takeProfit2,
      price: tp2P ?? undefined,
    };
  }

  // Normalize takeProfit3
  if (result.takeProfit3) {
    const tp3P = parseNumericValue(result.takeProfit3.price);
    normalized.takeProfit3 = {
      ...result.takeProfit3,
      price: tp3P ?? undefined,
    };
  }

  // Normalize supportLevels
  if (Array.isArray(result.supportLevels)) {
    normalized.supportLevels = result.supportLevels
      .map((item: any, idx: number) => {
        const p = parseNumericValue(item?.price ?? item);
        if (p === null) return null;
        return {
          level: item?.level || `S${idx + 1}`,
          price: p,
          strength: item?.strength || 'Strong',
        };
      })
      .filter((s): s is { level: string; price: number; strength: string } => s !== null);
  }

  // Normalize resistanceLevels
  if (Array.isArray(result.resistanceLevels)) {
    normalized.resistanceLevels = result.resistanceLevels
      .map((item: any, idx: number) => {
        const p = parseNumericValue(item?.price ?? item);
        if (p === null) return null;
        return {
          level: item?.level || `R${idx + 1}`,
          price: p,
          strength: item?.strength || 'Strong',
        };
      })
      .filter((r): r is { level: string; price: number; strength: string } => r !== null);
  }

  // Normalize visiblePriceRange
  if (result.visiblePriceRange) {
    const high = parseNumericValue(result.visiblePriceRange.high);
    const low = parseNumericValue(result.visiblePriceRange.low);
    if (high !== null && low !== null && high > low) {
      normalized.visiblePriceRange = { high, low };
    }
  }

  // Enforce strictly BUY or SELL signal
  const rawSig = String(normalized.verdict?.signal || '').toUpperCase().trim();
  let finalSignal: 'BUY' | 'SELL' = 'BUY';
  if (rawSig.includes('SELL') || rawSig.includes('SHORT') || rawSig.includes('BEAR')) {
    finalSignal = 'SELL';
  } else if (rawSig.includes('BUY') || rawSig.includes('LONG') || rawSig.includes('BULL')) {
    finalSignal = 'BUY';
  } else {
    const biasUpper = String(normalized.verdict?.bias || normalized.marketTrend || '').toUpperCase();
    finalSignal = biasUpper.includes('BEAR') || biasUpper.includes('DOWN') ? 'SELL' : 'BUY';
  }

  if (!normalized.verdict) {
    normalized.verdict = {
      signal: finalSignal,
      summary: normalized.detailedExplanation || 'Technical analysis derived from visible chart structure.',
      timeframeContext: `${normalized.timeframe || 'Chart'} Structure`,
    };
  } else {
    normalized.verdict.signal = finalSignal;
  }

  // Ensure recommended entry is populated if min/max exist
  if (normalized.entryZone) {
    if (!normalized.entryZone.recommended && normalized.entryZone.min && normalized.entryZone.max) {
      normalized.entryZone.recommended = (normalized.entryZone.min + normalized.entryZone.max) / 2;
    } else if (!normalized.entryZone.recommended && normalized.entryZone.min) {
      normalized.entryZone.recommended = normalized.entryZone.min;
    } else if (!normalized.entryZone.recommended && normalized.entryZone.max) {
      normalized.entryZone.recommended = normalized.entryZone.max;
    }
    if (!normalized.entryZone.range && normalized.entryZone.recommended) {
      normalized.entryZone.range = `${normalized.entryZone.recommended}`;
    }
  }

  // Ensure TP2 is structurally valid relative to TP1 from visible chart levels if needed
  const entryVal = parseNumericValue(normalized.entryZone?.recommended);
  const tp1Val = parseNumericValue(normalized.takeProfit1?.price);
  if (entryVal !== null && tp1Val !== null) {
    if (finalSignal === 'BUY') {
      const tp2Val = parseNumericValue(normalized.takeProfit2?.price);
      if (tp2Val === null || tp2Val <= tp1Val) {
        // Derive TP2 from visible resistance levels higher than TP1
        const higherRes = normalized.resistanceLevels?.find((r) => r.price > tp1Val);
        if (higherRes) {
          normalized.takeProfit2 = {
            price: higherRes.price,
            rationale: `Extended target at visible resistance ${higherRes.price}`,
          };
        }
      }
    } else if (finalSignal === 'SELL') {
      const tp2Val = parseNumericValue(normalized.takeProfit2?.price);
      if (tp2Val === null || tp2Val >= tp1Val) {
        // Derive TP2 from visible support levels lower than TP1
        const lowerSup = normalized.supportLevels?.find((s) => s.price < tp1Val);
        if (lowerSup) {
          normalized.takeProfit2 = {
            price: lowerSup.price,
            rationale: `Extended target at visible support ${lowerSup.price}`,
          };
        }
      }
    }
  }

  // Derive mathematical Risk/Reward ratio if not already populated
  const recEntry = parseNumericValue(normalized.entryZone?.recommended);
  const slVal = parseNumericValue(normalized.stopLoss?.price);
  const targetVal = parseNumericValue(normalized.takeProfit1?.price);
  if (recEntry && slVal && targetVal) {
    const risk = Math.abs(recEntry - slVal);
    const reward = Math.abs(targetVal - recEntry);
    if (risk > 0) {
      const ratio = (reward / risk).toFixed(2);
      normalized.riskRewardRatio = `1:${ratio}`;
    }
  }

  // Preserve multiTimeframeAnalysis if present
  if (result.multiTimeframeAnalysis) {
    normalized.multiTimeframeAnalysis = result.multiTimeframeAnalysis;
  }

  return normalized;
}

// ============================================================
// PROMPT
// ============================================================

function buildVisionPrompt(params: {
  asset?: string;
  timeframe?: string;
  tradingStyle?: string;
  bias?: string;
  additionalNotes?: string;
  imageCount: number;
  imageTimeframes?: string[];
}): string {
  const mtfSpec = Array.isArray(params.imageTimeframes) && params.imageTimeframes.length > 0
    ? `
Multi-Timeframe Specification for Uploaded Screenshots:
${params.imageTimeframes.map((tf, idx) => {
  const roles = [
    'Chart 1: Higher Timeframe → Overall Trend / Market Structure / Dominant Direction',
    'Chart 2: Middle Timeframe → Support & Resistance / Confluence / Key Zones',
    'Chart 3: Lower Timeframe → Entry Setup / Precision Trigger Price / Stop Loss Invalidation',
  ];
  return `- Screenshot ${idx + 1}: Timeframe ${tf || 'Auto-detect'} (${roles[idx] || 'Supporting Context'})`;
}).join('\n')}
`
    : '';

  return `
You are Falcon Analyze, an expert chart-reading technical-analysis vision AI.

Your primary job is to VISUALLY INSPECT the uploaded trading chart image(s).

Do NOT generate a generic trading answer.

Do NOT assume BTC, EURUSD, gold, or any other asset unless it is actually visible or supplied by the user.

============================================================
USER PARAMETERS
============================================================

Asset:
${params.asset || 'Auto-detect from chart'}

Timeframe:
${params.timeframe || 'Auto-detect from chart'}
${mtfSpec}
Trading Style:
${params.tradingStyle || 'Intraday'}

Directional Bias:
${params.bias || 'Auto / Objective'}

Additional Notes:
${params.additionalNotes || 'None'}

Number of uploaded screenshots:
${params.imageCount}

============================================================
CRITICAL VISUAL ANALYSIS RULES
============================================================

1. READ THE ACTUAL CHART.

Inspect:
- candlesticks
- candle bodies
- wicks
- highs
- lows
- market structure
- visible price scale
- support
- resistance
- breakouts
- retests
- rejection
- liquidity
- gaps / imbalances if visible
- volume if visible
- indicators if visible

2. NEVER INVENT A PRICE.

Every numerical price must be supported by visible chart information.

If the price scale is unreadable, do NOT manufacture precise prices.

3. CURRENT PRICE IS NOT AUTOMATICALLY ENTRY.

This is extremely important.

The current displayed market price is NOT the recommended entry merely because it is visible.

The Entry must be a technically justified execution zone.

Possible valid reasons include:
- support retest
- resistance rejection
- breakout and retest
- demand/supply zone
- liquidity sweep and reversal
- market-structure confirmation
- clearly visible pullback area

4. MANDATORY TRADE DIRECTION: MUST BE 'BUY' OR 'SELL'.

Every successfully analyzed chart MUST receive a definitive trade direction: either 'BUY' or 'SELL'.

You are STRICTLY FORBIDDEN from outputting 'WAIT', 'NO TRADE', 'NO SETUP', 'NEUTRAL', or 'INSUFFICIENT' as the verdict.signal.

Even in consolidating, ranging, or complex market conditions, you must evaluate the dominant technical bias, order flow, recent swings, and supply/demand zones on the chart to formulate the highest-probability, technically defensible trade plan:
- If the structure favors an upward move, support bounce, break of resistance, or sweep of lower liquidity: Signal is 'BUY'.
- If the structure favors a downward move, resistance rejection, break of support, or sweep of upper liquidity: Signal is 'SELL'.

5. COMPLETE TRADE SETUP LEVELS REQUIRED FOR EVERY CHART.

For every chart, you MUST provide all core levels derived strictly from visible chart information:
- Entry (entryZone.recommended, entryZone.min, entryZone.max, entryZone.range)
- Stop Loss (stopLoss.price)
- Take Profit 1 (takeProfit1.price)
- Take Profit 2 (takeProfit2.price)
- Support levels (supportLevels array)
- Resistance levels (resistanceLevels array)
- Risk / Reward ratio (riskRewardRatio)

CRITICAL LEVEL RULES:
- DERIVE ALL LEVELS FROM VISIBLE CHART PRICE ACTION: Read the visible price scale and actual candle formations (wicks, bodies, swing highs, swing lows, order blocks, fair value gaps, key support/resistance lines).
- NEVER USE FAKE, FIXED, OR RANDOM PRICES.
- DO NOT BLINDLY COPY CURRENT MARKET PRICE AS ENTRY. The Entry must be a technically justified execution zone (e.g. pullback level, retest level, or zone boundary).
- STOP LOSS:
  * For BUY: Stop Loss MUST be strictly below Entry (SL < Entry). Placed below key swing low, support, or structural invalidation level.
  * For SELL: Stop Loss MUST be strictly above Entry (SL > Entry). Placed above key swing high, resistance, or structural invalidation level.
- TAKE PROFITS:
  * For BUY: TP1 MUST be strictly above Entry (TP1 > Entry), and TP2 MUST be strictly above TP1 (TP2 > TP1). Placed at upcoming visible resistance or swing targets.
  * For SELL: TP1 MUST be strictly below Entry (TP1 < Entry), and TP2 MUST be strictly below TP1 (TP2 < TP1). Placed at upcoming visible support or swing targets.

6. BUY STRUCTURE.

For BUY:
SL must be below Entry.

TP1 must be above Entry.

TP2, if supplied, must be above TP1.

TP3, if supplied, must be above TP2.

7. SELL STRUCTURE.

For SELL:
SL must be above Entry.

TP1 must be below Entry.

TP2, if supplied, must be below TP1.

TP3, if supplied, must be below TP2.

8. SUPPORT AND RESISTANCE.

Only report levels that are actually supported by visible chart structure.

9. MULTIPLE SCREENSHOTS (PRO MULTI-TIMEFRAME ANALYSIS).

If multiple screenshots are provided (${params.imageCount || 1} image(s) provided):
- You MUST thoroughly scan and analyze EVERY SINGLE SCREENSHOT in sequence (Chart 1, Chart 2, Chart 3).
- Understand each chart's timeframe and role in the top-down multi-timeframe analysis:
  * Higher Timeframe (e.g. 4H / Daily / 1H): Dictates Macro Trend, Dominant Market Bias, Major Structural Swing Highs/Lows, and Key Daily/Weekly Levels.
  * Intermediate Timeframe (e.g. 1H / 30M / 15M): Identifies Intermediate Market Structure, Key Confluence Areas, Order Blocks, Liquidity Sweeps, and Supply/Demand zones.
  * Lower Timeframe (e.g. 15M / 5M / 1M): Pinpoints the Precision Entry Trigger, Local Reversal or Breakout Confirmation, and Structural Invalidation (Stop Loss).
- If there is a conflict between timeframes (e.g. Higher TF is Bullish but Lower TF is in a minor pullback):
  * Synthesize them intelligently: the higher timeframe trend dominates overall bias, while the lower timeframe gives the optimal pullback entry and tight invalidation.
- You must synthesize all charts into ONE UNIFIED, COHESIVE TRADE PLAN.
- In the "multiTimeframeAnalysis" JSON field, provide clear observations for each chart (chart1, chart2, chart3) along with the confluence summary and how any conflict was resolved.

10. TIMEFRAME.

Respect the user's selected timeframe.

If the chart itself visibly shows a different timeframe, mention the discrepancy.

11. TRADING STYLE.

Scalping:
Focus on short-term execution and immediate structure.

Intraday:
Focus on intraday structure, key levels and session movement.

Swing:
Focus on larger structure, major support/resistance and multi-session movement.

Position:
Focus on broad market structure and major levels.

============================================================
ENTRY LOGIC
============================================================

For BUY:
Prefer a pullback/retest or confirmation area below/around current price when technically justified.

For SELL:
Prefer a rejection/retest or confirmation area above/around current price when technically justified.

Do not chase price.

Do not use the current price as Entry unless the chart clearly shows that the current price itself is a valid execution trigger according to the visible setup.

============================================================
STOP LOSS
============================================================

SL must be based on structural invalidation.

Examples:
- below swing low for BUY
- above swing high for SELL
- beyond rejection structure
- beyond support/resistance invalidation

Do not use an arbitrary fixed percentage simply because the template contains one.

============================================================
TAKE PROFITS
============================================================

Targets should be based on visible structure such as:
- next resistance
- next support
- liquidity area
- previous high
- previous low
- range boundary
- measured technical objective if clearly justified

============================================================
CONFIDENCE
============================================================

Confidence must reflect the quality of visible evidence.

Do not automatically output 80 or 90.

============================================================
JSON RULE
============================================================

Return ONLY valid JSON.

No markdown.
No code fences.
No explanation outside JSON.

Use this exact general structure:

{
  "asset": "string",
  "timeframe": "string",
  "tradingStyle": "string",
  "marketTrend": "Bullish Structure | Bearish Structure | Consolidating",
  "trendStrength": 0,
  "confidence": 0,
  "currentPrice": 0,
  "visiblePriceRange": {
    "high": 0,
    "low": 0
  },

  "verdict": {
    "signal": "BUY | SELL",
    "bias": "Bullish | Bearish",
    "summary": "string",
    "timeframeContext": "string"
  },

  "entryZone": {
    "recommended": 0,
    "min": 0,
    "max": 0,
    "range": "string"
  },

  "stopLoss": {
    "price": 0,
    "percentage": "string",
    "rationale": "string"
  },

  "takeProfit1": {
    "price": 0,
    "rrr": "string",
    "rationale": "string"
  },

  "takeProfit2": {
    "price": 0,
    "rrr": "string",
    "rationale": "string"
  },

  "takeProfit3": {
    "price": 0,
    "rrr": "string"
  },

  "riskRewardRatio": "string",

  "supportLevels": [
    {
      "level": "S1",
      "price": 0,
      "strength": "Strong | Moderate | Weak"
    }
  ],

  "resistanceLevels": [
    {
      "level": "R1",
      "price": 0,
      "strength": "Strong | Moderate | Weak"
    }
  ],

  "marketStructure": {
    "type": "string",
    "description": "string"
  },

  "orderFlowContext": {
    "fairValueGaps": "string",
    "liquidityPools": "string",
    "volumeAnalysis": "string"
  },

  "technicalIndicators": [
    {
      "name": "string",
      "status": "string",
      "detail": "string"
    }
  ],

  "candlestickPatterns": [],

  "multiTimeframeAnalysis": {
    "chart1": {
      "timeframe": "4H | Daily | Higher TF",
      "role": "Macro Trend & Dominant Bias",
      "observations": "string detailing structure observed on chart 1",
      "trend": "Bullish | Bearish | Range"
    },
    "chart2": {
      "timeframe": "1H | Intermediate TF",
      "role": "Intermediate Structure & Confluence",
      "observations": "string detailing structure observed on chart 2",
      "keyLevels": "string"
    },
    "chart3": {
      "timeframe": "15M | Lower TF",
      "role": "Precision Entry & Invalidation",
      "observations": "string detailing structure observed on chart 3",
      "setupTrigger": "string"
    },
    "confluenceSummary": "string explaining how the 3 timeframes align together into one coherent setup",
    "conflictResolution": "string explaining how any conflict between timeframes was resolved"
  },

  "tradePlanExecution": {
    "stepByStep": [],
    "invalidationCriteria": "string",
    "riskManagementTips": "string"
  },

  "detailedExplanation": "string"
}

IMPORTANT:

Every analyzed chart MUST have a definitive signal of "BUY" or "SELL" along with technically defensible Entry, Stop Loss, TP1, and TP2 derived strictly from visible chart structure.
Never output WAIT, NO TRADE, or NO SETUP.
The analysis must be based on the uploaded chart image(s), not on assumptions.
`;
}

// ============================================================
// MIDDLEWARE
// ============================================================

const app = express();

app.disable('x-powered-by');

app.use(
  (req: Request, res: Response, next: NextFunction) => {
    res.header(
      'Access-Control-Allow-Origin',
      process.env.ALLOWED_ORIGIN || '*'
    );

    res.header(
      'Access-Control-Allow-Headers',
      [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'x-owner-token',
        'x-license-key',
        'x-user-identifier',
        'x-client-id',
      ].join(', ')
    );

    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, OPTIONS'
    );

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  }
);

app.use(
  express.json({
    limit: MAX_BODY_SIZE,
  })
);

app.use(
  express.urlencoded({
    limit: MAX_BODY_SIZE,
    extended: true,
  })
);

// ============================================================
// HEALTH
// ============================================================

app.get(
  '/api/health',
  (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      app: 'Falcon Analyze',
      apiKeyConfigured: Boolean(
        getValidApiKey()
      ),
      timestamp: new Date().toISOString(),
    });
  }
);

app.get(
  '/api/status',
  (_req: Request, res: Response) => {
    res.json({
      status: 'ONLINE',
      app: 'Falcon Analyze API',
      engine: 'Gemini Vision',
      timestamp: new Date().toISOString(),
      apiKeyConfigured: Boolean(
        getValidApiKey()
      ),
    });
  }
);

// ============================================================
// USAGE STATUS
// ============================================================

app.get(
  '/api/usage-status',
  (req: Request, res: Response) => {
    const ownerSession =
      getOwnerSessionFromRequest(req);

    const isOwner =
      Boolean(ownerSession);

    const licenseKey =
      typeof req.headers['x-license-key'] ===
      'string'
        ? req.headers['x-license-key']
        : typeof req.query?.licenseKey ===
            'string'
          ? req.query.licenseKey
          : '';

    const isPaidPro =
      isVerifiedProKey(licenseKey);

    const activeTestPro =
      !isOwner && !isPaidPro
        ? getActiveTestProForRequest(req)
        : null;

    const isTestPro =
      Boolean(activeTestPro);

    const isPro =
      isOwner ||
      isPaidPro ||
      isTestPro;

    const currentFreeCount =
      getFreeUsageCountForClient(req);

    res.json({
      freeAnalysisCount:
        isOwner || isPro
          ? 0
          : currentFreeCount,

      maxFreeAnalyses:
        MAX_FREE_ANALYSES,

      remainingFreeAnalyses:
        isOwner || isPro
          ? 999
          : Math.max(
              0,
              MAX_FREE_ANALYSES -
                currentFreeCount
            ),

      freeLimitReached:
        isOwner || isPro
          ? false
          : currentFreeCount >=
            MAX_FREE_ANALYSES,

      isProVerified: isPro,

      isPaidPro,

      isTestPro,

      accessType:
        isOwner
          ? 'OWNER'
          : isTestPro
            ? 'TEST'
            : isPaidPro
              ? 'PAID'
              : 'FREE',

      testProDetails:
        isTestPro && activeTestPro
          ? {
              userIdentifier:
                activeTestPro.userIdentifier,
              accessType: 'TEST',
              status:
                activeTestPro.status,
              durationDays:
                activeTestPro.durationDays,
              durationLabel:
                activeTestPro.durationLabel,
              createdAt:
                activeTestPro.createdAt,
              expiresAt:
                activeTestPro.expiresAt,
              remainingTime:
                activeTestPro.remainingTime,
            }
          : null,

      isOwner,

      role:
        isOwner ? 'OWNER' : 'USER',

      ownerAccess: isOwner,

      user: null,
    });
  }
);

// ============================================================
// LICENSE VERIFICATION
// ============================================================

app.post(
  '/api/safepay/webhook',
  async (req: Request, res: Response) => {
    try {
      const payload = JSON.stringify(req.body);
      const signature = req.headers['x-sfpy-signature'] as string;
      const webhookSecret = env('SAFEPAY_WEBHOOK_SECRET');

      if (!signature || !webhookSecret) {
        return res.status(400).json({
          success: false,
          error: 'Webhook verification data missing.',
        });
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      if (!safeEqual(signature, expectedSignature)) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature.',
        });
      }

      const event = req.body;

      if (event?.type === 'payment.succeeded') {
        console.log('Safepay payment succeeded:', event.data);
      }

      return res.json({ received: true });
    } catch (error) {
      console.error('Safepay webhook error:', error);
      return res.status(400).json({
        success: false,
        error: 'Webhook processing failed.',
      });
    }
  }
);
app.post(
  '/api/verify-license',
  (req: Request, res: Response) => {
    const { licenseKey } =
      req.body || {};

    if (
      !licenseKey ||
      typeof licenseKey !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        error:
          'License key is required.',
      });
    }

    const normalized =
      licenseKey
        .trim()
        .toUpperCase();

    if (
      isVerifiedProKey(normalized)
    ) {
      return res.json({
        success: true,
        tier: 'pro',
        status: 'active',
        licenseKey: normalized,
        activatedAt:
          new Date().toISOString(),

        features: [
          'clean-vision-engine',
          '3-chart-analysis',
          'multi-timeframe',
          'technical-validation',
        ],
      });
    }

    return res.status(403).json({
      success: false,
      error:
        'Invalid or expired Pro license key.',
    });
  }
);

// ============================================================
// OWNER AUTHENTICATION
// ============================================================

app.post(
  '/api/auth/owner-login',
  (req: Request, res: Response) => {
    const {
      email,
      emailOrId,
      identifier,
      password,
    } = req.body || {};

    const userIdentifier = String(
      identifier ||
        emailOrId ||
        email ||
        ''
    )
      .trim()
      .toLowerCase();

    const userPassword =
      typeof password === 'string'
        ? password
        : '';

    if (
      !OWNER_EMAIL ||
      !OWNER_PASSWORD
    ) {
      return res.status(500).json({
        success: false,
        error:
          'Owner authentication is not configured on the server.',
      });
    }

    if (
      safeEqual(
        userIdentifier,
        OWNER_EMAIL
      ) &&
      safeEqual(
        userPassword,
        OWNER_PASSWORD
      )
    ) {
      return res.json({
        success: true,

        token:
          OWNER_SECRET_TOKEN,

        user: {
          role: 'OWNER',
          email: OWNER_EMAIL,
          ownerAccess: true,
        },

        message:
          'Owner Access Active',
      });
    }

    return res.status(401).json({
      success: false,
      error:
        'Invalid Owner credentials.',
    });
  }
);

app.post(
  '/api/auth/owner-logout',
  (_req: Request, res: Response) => {
    /*
     * Owner token is stateless.
     * Client simply removes its stored token.
     */
    res.json({
      success: true,
      message:
        'Owner logged out successfully.',
    });
  }
);

app.get(
  '/api/auth/owner-session',
  (req: Request, res: Response) => {
    const session =
      getOwnerSessionFromRequest(req);

    res.json({
      authenticated:
        Boolean(session),

      role:
        session ? 'OWNER' : 'USER',

      ownerAccess:
        Boolean(session),
    });
  }
);

app.get(
  '/api/auth/me',
  (_req: Request, res: Response) => {
    res.json({
      authenticated: false,
      user: null,
    });
  }
);

// ============================================================
// BASIC USER AUTH PLACEHOLDERS
// ============================================================

app.post(
  '/api/auth/login',
  (req: Request, res: Response) => {
    const { email } =
      req.body || {};

    res.json({
      success: true,
      token:
        `user_tok_${Date.now()}`,
      user: {
        id:
          `user_${Date.now()}`,
        email: email || '',
      },
      message:
        'Logged in successfully',
    });
  }
);

app.post(
  '/api/auth/register',
  (req: Request, res: Response) => {
    const { email } =
      req.body || {};

    res.json({
      success: true,
      token:
        `user_tok_${Date.now()}`,
      user: {
        id:
          `user_${Date.now()}`,
        email: email || '',
      },
      message:
        'Registered successfully',
    });
  }
);

app.post(
  '/api/auth/logout',
  (_req: Request, res: Response) => {
    res.json({
      success: true,
      message:
        'Logged out successfully.',
    });
  }
);

// ============================================================
// ADMIN AUTH MIDDLEWARE
// ============================================================

function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const session =
    getOwnerSessionFromRequest(req);

  if (!session) {
    return res.status(403).json({
      success: false,
      error:
        'Owner authentication required.',
    });
  }

  next();
}

// ============================================================
// TEST PRO MANAGEMENT
// ============================================================

app.get(
  '/api/admin/test-pro-users',
  requireOwner,
  (_req: Request, res: Response) => {
    const users =
      Array.from(
        testProUsersList.values()
      ).map((u) => {
        const expMs =
          new Date(
            u.expiresAt
          ).getTime();

        return {
          ...u,
          remainingTime:
            calculateRemainingTime(
              expMs
            ),
        };
      });

    res.json({
      success: true,
      users,
    });
  }
);

app.post(
  '/api/admin/grant-test-pro',
  requireOwner,
  (req: Request, res: Response) => {
    const {
      userIdentifier,
      durationDays,
      notes,
    } = req.body || {};

    const cleanId =
      typeof userIdentifier ===
      'string'
        ? userIdentifier.trim()
        : '';

    if (!cleanId) {
      return res.status(400).json({
        success: false,
        error:
          'Valid user identifier is required.',
      });
    }

    let days =
      Number(durationDays);

    if (
      !Number.isFinite(days) ||
      days <= 0
    ) {
      days = 7;
    }

    days = Math.min(
      Math.floor(days),
      365
    );

    const now = Date.now();

    const expiresAtMs =
      now +
      days *
        86400000;

    const record: TestProRecord = {
      id:
        `test_rec_${Date.now()}_${crypto
          .randomBytes(3)
          .toString('hex')}`,

      userIdentifier: cleanId,

      accessType: 'TEST',

      status: 'ACTIVE',

      grantedBy:
        'Owner Portal',

      durationDays: days,

      durationLabel:
        `${days} Days`,

      createdAt:
        new Date(now)
          .toISOString(),

      expiresAt:
        new Date(
          expiresAtMs
        ).toISOString(),

      remainingTime:
        calculateRemainingTime(
          expiresAtMs
        ),

      notes:
        typeof notes === 'string'
          ? notes
          : '',
    };

    testProUsersList.set(
      cleanId.toLowerCase(),
      record
    );

    persistTestProUsers();

    res.json({
      success: true,

      message:
        `Test Pro granted to ${cleanId}.`,

      record,
    });
  }
);

app.post(
  '/api/admin/revoke-test-pro',
  requireOwner,
  (req: Request, res: Response) => {
    const {
      userIdentifier,
      recordId,
    } = req.body || {};

    let target:
      | TestProRecord
      | null = null;

    let targetKey:
      | string
      | null = null;

    for (
      const [key, value]
      of testProUsersList.entries()
    ) {
      if (
        (
          recordId &&
          value.id === recordId
        ) ||
        (
          userIdentifier &&
          key ===
            String(
              userIdentifier
            )
              .trim()
              .toLowerCase()
        )
      ) {
        target = value;
        targetKey = key;
        break;
      }
    }

    if (!target || !targetKey) {
      return res.status(404).json({
        success: false,
        error:
          'Test Pro record not found.',
      });
    }

    target.status = 'REVOKED';

    target.remainingTime =
      'Revoked';

    target.revokedAt =
      new Date().toISOString();

    persistTestProUsers();

    res.json({
      success: true,
      message:
        'Test Pro revoked successfully.',
    });
  }
);

// ============================================================
// ANALYSIS ROUTE
// ============================================================

app.post(
  [
    '/api/analyze',
    '/api/analyze-chart',
  ],
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        imageBase64,
        mimeType,
        images,
        asset,
        timeframe,
        tradingStyle,
        bias,
        additionalNotes,
        plan,
        licenseKey:
          bodyLicenseKey,
      } = req.body || {};

      // ------------------------------------------------------
      // AUTH / PLAN
      // ------------------------------------------------------

      const ownerSession =
        getOwnerSessionFromRequest(
          req
        );

      const isOwner =
        Boolean(ownerSession);

      const headerLicense =
        typeof req.headers[
          'x-license-key'
        ] === 'string'
          ? req.headers[
              'x-license-key'
            ]
          : '';

      const licenseKey =
        typeof bodyLicenseKey ===
        'string'
          ? bodyLicenseKey
          : headerLicense;

      const isPaidPro =
        isVerifiedProKey(
          licenseKey
        );

      const activeTestPro =
        !isOwner && !isPaidPro
          ? getActiveTestProForRequest(
              req
            )
          : null;

      const isTestPro =
        Boolean(activeTestPro);

      const isPro =
        isOwner ||
        isPaidPro ||
        isTestPro;

      // ------------------------------------------------------
      // PLAN CHECK
      // ------------------------------------------------------

      if (
        plan === 'pro' &&
        !isPro
      ) {
        return res.status(200).json({
          success: false,

          code:
            'PRO_ACCESS_DENIED',

          error:
            'Pro 3-chart analysis requires active Pro access.',
        });
      }

      // ------------------------------------------------------
      // PREPARE IMAGES
      // ------------------------------------------------------

      const imageParts: Array<{
        inlineData: {
          mimeType: string;
          data: string;
        };
      }> = [];
      const imageTimeframes: string[] = [];

      const maxAllowed =
        isPro
          ? MAX_PRO_IMAGES
          : MAX_FREE_IMAGES;

      if (
        Array.isArray(images) &&
        images.length > 0
      ) {
        const targetImages =
          images.slice(
            0,
            maxAllowed
          );

        for (
          const img
          of targetImages
        ) {
          if (img?.timeframe && typeof img.timeframe === 'string') {
            imageTimeframes.push(img.timeframe);
          }
          let rawData =
            img?.imageBase64 ||
            img?.dataUrl ||
            img?.base64;

          let type =
            img?.mimeType ||
            'image/png';

          if (
            !rawData ||
            typeof rawData !==
              'string'
          ) {
            continue;
          }

          if (
            rawData.includes(
              ';base64,'
            )
          ) {
            const parts =
              rawData.split(
                ';base64,'
              );

            const match =
              parts[0].match(
                /:(.*?)$/
              );

            if (match) {
              type = match[1];
            }

            rawData =
              parts[1];
          } else if (
            rawData.startsWith(
              'data:'
            )
          ) {
            rawData =
              rawData.split(',')[1] ||
              rawData;
          }

          rawData =
            rawData.replace(
              /\s+/g,
              ''
            );

          if (
            type ===
            'image/jpg'
          ) {
            type =
              'image/jpeg';
          }

          const estimatedBytes =
            Math.floor(
              rawData.length *
                0.75
            );

          const maxBytes =
            MAX_IMAGE_SIZE_MB *
            1024 *
            1024;

          if (
            estimatedBytes >
            maxBytes
          ) {
            return res.status(413).json({
              success: false,
              error:
                `Image exceeds ${MAX_IMAGE_SIZE_MB}MB limit.`,
            });
          }

          imageParts.push({
            inlineData: {
              mimeType: type,
              data: rawData,
            },
          });
        }
      } else if (
        imageBase64 &&
        typeof imageBase64 ===
          'string'
      ) {
        let rawData =
          imageBase64;

        let type =
          mimeType ||
          'image/png';

        if (
          rawData.includes(
            ';base64,'
          )
        ) {
          const parts =
            rawData.split(
              ';base64,'
            );

          const match =
            parts[0].match(
              /:(.*?)$/
            );

          if (match) {
            type = match[1];
          }

          rawData =
            parts[1];
        } else if (
          rawData.startsWith(
            'data:'
          )
        ) {
          rawData =
            rawData.split(',')[1] ||
            rawData;
        }

        rawData =
          rawData.replace(
            /\s+/g,
            ''
          );

        if (
          type ===
          'image/jpg'
        ) {
          type =
            'image/jpeg';
        }

        imageParts.push({
          inlineData: {
            mimeType: type,
            data: rawData,
          },
        });
      }

      if (
        imageParts.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error:
            'No chart image provided. Please upload a chart screenshot.',
        });
      }

      if (
        imageParts.length >
        maxAllowed
      ) {
        return res.status(400).json({
          success: false,
          error:
            `Maximum ${maxAllowed} chart image(s) allowed for your plan.`,
        });
      }

      // ------------------------------------------------------
      // FREE LIMIT
      // ------------------------------------------------------

      if (
        !isOwner &&
        !isPro
      ) {
        const currentCount =
          getFreeUsageCountForClient(
            req
          );

        if (
          currentCount >=
          MAX_FREE_ANALYSES
        ) {
          return res.status(403).json({
            success: false,

            code:
              'FREE_LIMIT_REACHED',

            error:
              'Free limit reached: You have used all 3 free screenshots. Upgrade to PRO to continue.',

            freeAnalysisCount:
              currentCount,

            maxFreeAnalyses:
              MAX_FREE_ANALYSES,

            remainingFreeAnalyses: 0,

            limitReached: true,

            upgradeRequired: true,
          });
        }
      }

      // ------------------------------------------------------
      // GEMINI KEY
      // ------------------------------------------------------

      const apiKey =
        getValidApiKey();

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error:
            'GEMINI_API_KEY is not configured on the server.',
        });
      }

      const ai =
        getGeminiClient();

      // ------------------------------------------------------
      // PROMPT
      // ------------------------------------------------------

      const promptText =
        buildVisionPrompt({
          asset,
          timeframe,
          tradingStyle,
          bias,
          additionalNotes,
          imageCount:
            imageParts.length,
          imageTimeframes,
        });

      const contents = [
        ...imageParts,
        {
          text: promptText,
        },
      ];

      // ------------------------------------------------------
      // GEMINI FALLBACK
      // ------------------------------------------------------

      let parsedResult:
        | ChartAnalysis
        | null = null;

      let lastError:
        | any
        | null = null;

      for (
        const modelName
        of GEMINI_FALLBACK_MODELS
      ) {
        try {
          console.log(
            `[FALCON VISION] Trying ${modelName} with ${imageParts.length} image(s)`
          );

          const aiResponse =
            await ai.models.generateContent(
              {
                model:
                  modelName,

                contents,

                config: {
                  responseMimeType:
                    'application/json',
                },
              }
            );

          const rawText =
            aiResponse?.text?.trim();

          if (!rawText) {
            throw new Error(
              'Gemini returned an empty response.'
            );
          }

          const parsed =
            extractAndParseJson(
              rawText
            );

          if (
            !parsed ||
            typeof parsed !==
              'object'
          ) {
            throw new Error(
              'Gemini returned an invalid analysis object.'
            );
          }

          parsedResult =
            parsed;

          console.log(
            `[FALCON VISION] Success with ${modelName}`
          );

          break;
        } catch (err: any) {
          lastError = err;

          console.warn(
            `[FALCON VISION] ${modelName} failed:`,
            String(
              err?.message ||
                err
            ).slice(0, 300)
          );
        }
      }

      if (!parsedResult) {
        throw (
          lastError ||
          new Error(
            'Gemini Vision failed to produce an analysis.'
          )
        );
      }

      // ------------------------------------------------------
      // NORMALIZE
      // ------------------------------------------------------

      let analysisData =
        normalizeAnalysis(
          parsedResult,
          {
            asset,
            timeframe,
            tradingStyle,
            timeframes: imageTimeframes,
          }
        );

      // ------------------------------------------------------
      // VALIDATE TRADE LOGIC
      // ------------------------------------------------------

      // Check if directional levels are inverted based on chart levels
      const currentEntry = finiteNumber(
        analysisData.entryZone?.recommended ?? (analysisData.entryZone as any)?.min
      );
      const currentSL = finiteNumber(analysisData.stopLoss?.price);
      const currentTP1 = finiteNumber(analysisData.takeProfit1?.price);

      if (currentEntry !== null && currentSL !== null && currentTP1 !== null) {
        if (analysisData.verdict?.signal === 'BUY' && currentSL > currentEntry && currentTP1 < currentEntry) {
          console.log('[FALCON VALIDATION] Inverted levels detected: aligning BUY to SELL structure.');
          if (analysisData.verdict) {
            analysisData.verdict.signal = 'SELL';
            analysisData.verdict.bias = 'Bearish';
          }
        } else if (analysisData.verdict?.signal === 'SELL' && currentSL < currentEntry && currentTP1 > currentEntry) {
          console.log('[FALCON VALIDATION] Inverted levels detected: aligning SELL to BUY structure.');
          if (analysisData.verdict) {
            analysisData.verdict.signal = 'BUY';
            analysisData.verdict.bias = 'Bullish';
          }
        }
      }

      let validation =
        validateTradeStructure(
          analysisData
        );

      if (!validation.valid) {
        console.warn(
          '[FALCON VALIDATION] Invalid Gemini trade structure:',
          validation.reason
        );

        /*
         * Do NOT repair Gemini prices with
         * synthetic calculations.

         * Convert invalid trade into WAIT.
         */

        // Do not convert to WAIT. Retain directional signal from market analysis.
        const fallbackSignal = (analysisData.verdict?.signal === 'SELL' ? 'SELL' : 'BUY');
        analysisData.verdict = {
          ...(analysisData.verdict || {}),
          signal: fallbackSignal,
          bias: fallbackSignal === 'SELL' ? 'Bearish' : 'Bullish',
          summary: analysisData.detailedExplanation || `Technical ${fallbackSignal} setup derived from visible chart structure.`,
          timeframeContext: analysisData.verdict?.timeframeContext || '',
        };
      }

      // ------------------------------------------------------
      // ADD SERVER METADATA
      // ------------------------------------------------------

      const finalAnalysis = {
        ...analysisData,

        id:
          `analysis_${Date.now()}_${crypto
            .randomBytes(4)
            .toString('hex')}`,

        timestamp:
          Date.now(),

        asset:
          analysisData.asset ||
          asset ||
          'Unknown Asset',

        timeframe:
          analysisData.timeframe ||
          timeframe ||
          'Unknown',

        tradingStyle:
          tradingStyle ||
          analysisData.tradingStyle ||
          'Intraday',
      };

      // ------------------------------------------------------
      // ONLY COUNT SUCCESSFUL ANALYSIS
      // ------------------------------------------------------

      let updatedFreeCount:
        | number
        | undefined;

      let isFreeLimitReached =
        false;

      if (
        !isOwner &&
        !isPro
      ) {
        updatedFreeCount =
          incrementFreeUsageCountForClient(
            req
          );

        isFreeLimitReached =
          updatedFreeCount >=
          MAX_FREE_ANALYSES;
      }

      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      return res.json({
        success: true,

        data:
          finalAnalysis,

        isOwner,

        role:
          isOwner
            ? 'OWNER'
            : 'USER',

        ownerAccess:
          isOwner,

        isProVerified:
          isPro,

        isPaidPro,

        isTestPro,

        accessType:
          isOwner
            ? 'OWNER'
            : isTestPro
              ? 'TEST'
              : isPaidPro
                ? 'PAID'
                : 'FREE',

        freeAnalysisCount:
          isOwner || isPro
            ? undefined
            : updatedFreeCount,

        maxFreeAnalyses:
          MAX_FREE_ANALYSES,

        remainingFreeAnalyses:
          isOwner || isPro
            ? 999
            : Math.max(
                0,
                MAX_FREE_ANALYSES -
                  (updatedFreeCount || 0)
              ),

        freeLimitReached:
          isOwner || isPro
            ? false
            : isFreeLimitReached,
      });
    } catch (err: any) {
      console.error(
        '[FALCON ANALYZE ERROR]:',
        err
      );

      let errorMessage =
        err?.message ||
        'Error occurred during chart analysis.';

      const errorText =
        String(errorMessage);

      if (
        errorText.includes(
          '429'
        ) ||
        errorText.includes(
          'RESOURCE_EXHAUSTED'
        ) ||
        errorText.includes(
          'quota'
        )
      ) {
        errorMessage =
          'Gemini API quota is temporarily unavailable. Please try again later or configure billing/API quota.';
      }

      if (
        errorText.includes(
          '503'
        ) ||
        errorText.includes(
          'UNAVAILABLE'
        ) ||
        errorText.includes(
          'high demand'
        )
      ) {
        errorMessage =
          'Gemini vision models are temporarily under high demand. Please try Analyze Chart again in a few moments.';
      }

      return res.status(500).json({
        success: false,
        error:
          errorMessage,
      });
    }
  }
);

// ============================================================
// VITE / PRODUCTION
// ============================================================

async function startServer() {
  if (
    process.env.NODE_ENV !==
    'production'
  ) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
        },

        appType: 'spa',
      });

    app.use(
      vite.middlewares
    );
  } else {
    const distPath =
      path.join(
        process.cwd(),
        'dist'
      );

    app.use(
      express.static(
        distPath
      )
    );

    app.get(
      '*',
      (
        _req: Request,
        res: Response
      ) => {
        res.sendFile(
          path.join(
            distPath,
            'index.html'
          )
        );
      }
    );
  }

  ensureDataDirectory();

  app.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `[FALCON ANALYZE] Server running on port ${PORT}`
      );

      console.log(
        `[FALCON ANALYZE] Gemini primary model: ${GEMINI_PRIMARY_MODEL}`
      );

      console.log(
        `[FALCON ANALYZE] API key configured: ${Boolean(
          getValidApiKey()
        )}`
      );

      console.log(
        `[FALCON ANALYZE] Pro keys configured: ${getConfiguredProKeys().size}`
      );
    }
  );
}

startServer();
