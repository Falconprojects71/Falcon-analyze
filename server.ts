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

const PORT = Number(process.env.PORT) || 3000;
console.log('[PORT DEBUG]', {
  envPort: process.env.PORT,
  resolvedPort: PORT,
  host: '0.0.0.0',
});

const MAX_FREE_ANALYSES = 3;
const FREE_WINDOW_DAYS = 1;

const MAX_FREE_IMAGES = 1;
const MAX_PRO_IMAGES = 3;

const MAX_IMAGE_SIZE_MB = 12;
const MAX_BODY_SIZE = '50mb';

const DATA_DIR = path.join(process.cwd(), 'data');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');
const TEST_PRO_FILE = path.join(DATA_DIR, 'test-pro.json');
const PAID_SUBSCRIPTIONS_FILE = path.join(
  DATA_DIR,
  'paid-subscriptions.json'
);
console.log('[STORAGE PATH]', {
  cwd: process.cwd(),
  dataDir: DATA_DIR,
  testProFile: TEST_PRO_FILE,
});
// ============================================================
// ENVIRONMENT / SECRETS
// ============================================================

function env(name: string, fallback = ''): string {
  return (process.env[name] || fallback).trim();
}

// ============================================================
// SAFEPAY SUBSCRIPTIONS
// ============================================================

const SAFEPAY_SECRET_KEY = env('SAFEPAY_SECRET_KEY');

const SAFEPAY_HOST =
  env('SAFEPAY_HOST') ||
  'https://api.getsafepay.com';

const SAFEPAY_CHECKOUT_HOST =
  env('SAFEPAY_CHECKOUT_HOST') ||
  'https://getsafepay.com';
const SAFEPAY_WEBHOOK_SECRET =
  env('SAFEPAY_WEBHOOK_SECRET');

const SAFEPAY_MONTHLY_PLAN_ID =
  env('SAFEPAY_MONTHLY_PLAN_ID');

const SAFEPAY_YEARLY_PLAN_ID =
  env('SAFEPAY_YEARLY_PLAN_ID');
const SAFEPAY_USD_MONTHLY_PLAN_ID =
  env('SAFEPAY_USD_MONTHLY_PLAN_ID');

const SAFEPAY_USD_YEARLY_PLAN_ID =
  env('SAFEPAY_USD_YEARLY_PLAN_ID');

let safepayAuthTokenCache: {
  token: string;
  expiresAt: number;
} = {
  token: '',
  expiresAt: 0,
};

async function getSafepayAuthToken(): Promise<string> {
  const now = Date.now();

  if (
    safepayAuthTokenCache.token &&
    now < safepayAuthTokenCache.expiresAt - 5 * 60 * 1000
  ) {
    return safepayAuthTokenCache.token;
  }

  if (!SAFEPAY_SECRET_KEY) {
    throw new Error(
      'SAFEPAY_SECRET_KEY is not configured.'
    );
  }

  const response = await fetch(
    `${SAFEPAY_HOST}/client/passport/v1/token`,
    {
      method: 'POST',
     headers: {
  'X-SFPY-MERCHANT-SECRET': SAFEPAY_SECRET_KEY,
  'Content-Type': 'application/json',
},
body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Safepay auth token failed: ${response.status} ${errorText}`
    );
  }

const data = await response.json() as {
  data?: string;
};

if (!data.data) {
  throw new Error(
    'Safepay auth token was not returned.'
  );
}

safepayAuthTokenCache = {
  token: data.data,
  expiresAt: now + 60 * 60 * 1000,
};

  return data.token;
}

function buildSafepayCheckoutUrl(params: {
  planId: string;
  reference: string;
  redirectUrl: string;
  cancelUrl: string;
  authToken: string;
}): string {
  const query = new URLSearchParams({
    plan_id: params.planId,
    auth_token: params.authToken,
    env: 'production',
    redirect_url: params.redirectUrl,
    cancel_url: params.cancelUrl,
  });

return String(SAFEPAY_CHECKOUT_HOST) + '/checkout/auth/login?' + query.toString();
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
export interface PaidSubscriptionRecord {
  reference: string;
  userIdentifier: string;
  planId: string;
  planType: 'MONTHLY' | 'YEARLY';
  status:
    | 'PENDING'
    | 'ACTIVE'
    | 'CANCELED'
    | 'ENDED'
    | 'PAYMENT_FAILED';
  subscriptionId?: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
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
  multiTimeframeSupport?: {
  support1?: {
    timeframe?: string;
    price?: number | null;
    strength?: string;
    rationale?: string;
  };
  resistance1?: {
    timeframe?: string;
    price?: number | null;
    strength?: string;
    rationale?: string;
  };
  support2?: {
    timeframe?: string;
    price?: number | null;
    strength?: string;
    rationale?: string;
  };
  resistance2?: {
    timeframe?: string;
    price?: number | null;
    strength?: string;
    rationale?: string;
  };
  support3?: {
    timeframe?: string;
    price?: number | null;
    strength?: string;
    rationale?: string;
  };
  resistance3?: {
    timeframe?: string;
    price?: number | null;
    strength?: string;
    rationale?: string;
  };
  combinedMajorSupport?: {
    price?: number | null;
    strength?: string;
    rationale?: string;
  };
  combinedMajorResistance?: {
    price?: number | null;
    strength?: string;
    rationale?: string;
  };
}

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
const paidSubscriptionsList =
  new Map<string, PaidSubscriptionRecord>(
    Object.entries(
      readJsonFile<Record<string, PaidSubscriptionRecord>>(
        PAID_SUBSCRIPTIONS_FILE,
        {}
      )
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

  console.log(
    '[TEST PRO STORAGE]',
    TEST_PRO_FILE,
    'users:',
    Object.keys(data).length
  );
}
function persistPaidSubscriptions() {
  const data: Record<string, PaidSubscriptionRecord> = {};

  for (const [key, value] of paidSubscriptionsList.entries()) {
    data[key] = value;
  }

  writeJsonFile(
    PAID_SUBSCRIPTIONS_FILE,
    data
  );
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
 console.log('[MTF NORMALIZE DEBUG]', {
  support1: result.multiTimeframeSupport?.support1,
  support2: result.multiTimeframeSupport?.support2,
  support3: result.multiTimeframeSupport?.support3,
  resistance1: result.multiTimeframeSupport?.resistance1,
  resistance2: result.multiTimeframeSupport?.resistance2,
  resistance3: result.multiTimeframeSupport?.resistance3,
  combinedMajorSupport: result.multiTimeframeSupport?.combinedMajorSupport,
  combinedMajorResistance: result.multiTimeframeSupport?.combinedMajorResistance,
});
  // Normalize Multi-Timeframe Support
  if (result.multiTimeframeSupport) {
  const mts = result.multiTimeframeSupport;

  normalized.multiTimeframeSupport = {
    support1: mts.support1
      ? {
          ...mts.support1,
          timeframe: mts.support1.timeframe || '',
          price: mts.support1.price === null
            ? null
            : parseNumericValue(mts.support1.price) ?? undefined,
          strength: mts.support1.strength || 'Unavailable',
          rationale: mts.support1.rationale || '',
        }
      : undefined,

    resistance1: mts.resistance1
      ? {
          ...mts.resistance1,
          timeframe: mts.resistance1.timeframe || '',
          price: mts.resistance1.price === null
            ? null
            : parseNumericValue(mts.resistance1.price) ?? undefined,
          strength: mts.resistance1.strength || 'Unavailable',
          rationale: mts.resistance1.rationale || '',
        }
      : undefined,

    support2: mts.support2
      ? {
          ...mts.support2,
          timeframe: mts.support2.timeframe || '',
          price: mts.support2.price === null
            ? null
            : parseNumericValue(mts.support2.price) ?? undefined,
          strength: mts.support2.strength || 'Unavailable',
          rationale: mts.support2.rationale || '',
        }
      : undefined,

    resistance2: mts.resistance2
      ? {
          ...mts.resistance2,
          timeframe: mts.resistance2.timeframe || '',
          price: mts.resistance2.price === null
            ? null
            : parseNumericValue(mts.resistance2.price) ?? undefined,
          strength: mts.resistance2.strength || 'Unavailable',
          rationale: mts.resistance2.rationale || '',
        }
      : undefined,

    support3: mts.support3
      ? {
          ...mts.support3,
          timeframe: mts.support3.timeframe || '',
          price: mts.support3.price === null
            ? null
            : parseNumericValue(mts.support3.price) ?? undefined,
          strength: mts.support3.strength || 'Unavailable',
          rationale: mts.support3.rationale || '',
        }
      : undefined,

    resistance3: mts.resistance3
      ? {
          ...mts.resistance3,
          timeframe: mts.resistance3.timeframe || '',
          price: mts.resistance3.price === null
            ? null
            : parseNumericValue(mts.resistance3.price) ?? undefined,
          strength: mts.resistance3.strength || 'Unavailable',
          rationale: mts.resistance3.rationale || '',
        }
      : undefined,

    combinedMajorSupport: mts.combinedMajorSupport
      ? {
          ...mts.combinedMajorSupport,
          price: mts.combinedMajorSupport.price === null
            ? null
            : parseNumericValue(mts.combinedMajorSupport.price) ?? undefined,
          strength: mts.combinedMajorSupport.strength || 'Strong',
          rationale: mts.combinedMajorSupport.rationale || '',
        }
      : undefined,

    combinedMajorResistance: mts.combinedMajorResistance
      ? {
          ...mts.combinedMajorResistance,
          price: mts.combinedMajorResistance.price === null
            ? null
            : parseNumericValue(mts.combinedMajorResistance.price) ?? undefined,
          strength: mts.combinedMajorResistance.strength || 'Strong',
          rationale: mts.combinedMajorResistance.rationale || '',
        }
      : undefined,
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

8. SUPPORT AND RESISTANCE — DYNAMIC MULTI-TIMEFRAME REQUIREMENT.

Only report support and resistance levels that are actually supported
by visible chart structure.

When multiple screenshots are provided, analyze EACH uploaded chart
independently.

The three uploaded charts are identified by their upload order:

- Chart 1 = first uploaded screenshot
- Chart 2 = second uploaded screenshot
- Chart 3 = third uploaded screenshot

NEVER assume that the three charts are 15M, 1H and 4H.

The actual timeframe must be read from the chart when visible and must
be preserved exactly.

------------------------------------------------------------
CHART 1 — SUPPORT / RESISTANCE
------------------------------------------------------------

Identify the most relevant visible support and resistance from Chart 1.

Store them as:

- multiTimeframeSupport.support1
- multiTimeframeSupport.resistance1

The "timeframe" field MUST contain the actual timeframe of Chart 1.

Example:

"support1": {
  "timeframe": "5M",
  "price": 4165,
  "strength": "Strong",
  "rationale": "Recent 5M swing low with repeated bullish rejection."
}

Do NOT assume Chart 1 is 15M, 1H, 4H, Daily, or any other fixed timeframe.

Support 1 must come from Chart 1.

Resistance 1 must come from Chart 1.

------------------------------------------------------------
CHART 2 — SUPPORT / RESISTANCE
------------------------------------------------------------

Identify the most relevant visible support and resistance from Chart 2.

Store them as:

- multiTimeframeSupport.support2
- multiTimeframeSupport.resistance2

The "timeframe" field MUST contain the actual timeframe of Chart 2.

Support 2 must come from Chart 2.

Resistance 2 must come from Chart 2.

Do NOT copy Chart 1 levels into Chart 2 unless the same price level is
independently visible and structurally valid on Chart 2.

------------------------------------------------------------
CHART 3 — SUPPORT / RESISTANCE
------------------------------------------------------------

Identify the most relevant visible support and resistance from Chart 3.

Store them as:

- multiTimeframeSupport.support3
- multiTimeframeSupport.resistance3

The "timeframe" field MUST contain the actual timeframe of Chart 3.

Support 3 must come from Chart 3.

Resistance 3 must come from Chart 3.

Do NOT copy Chart 1 or Chart 2 levels into Chart 3 unless the same
price level is independently visible and structurally valid on Chart 3.

------------------------------------------------------------
HOW TO IDENTIFY SUPPORT
------------------------------------------------------------

For each chart, prefer support based on visible:

- recent swing lows
- repeated price reactions
- demand zones
- successful retests
- liquidity sweeps followed by reclaim
- strong bullish rejection
- previous structural support
- clearly visible consolidation boundaries

The support price MUST come from the visible price structure of that
specific chart.

Do NOT invent a precise price when the price scale is unreadable.

------------------------------------------------------------
HOW TO IDENTIFY RESISTANCE
------------------------------------------------------------

For each chart, prefer resistance based on visible:

- recent swing highs
- repeated price reactions
- supply zones
- failed breakouts
- resistance retests
- liquidity sweeps followed by rejection
- strong bearish rejection
- previous structural resistance
- clearly visible consolidation boundaries

The resistance price MUST come from the visible price structure of that
specific chart.

Do NOT invent a precise price when the price scale is unreadable.

------------------------------------------------------------
UNAVAILABLE CHART DATA
------------------------------------------------------------

If a chart is provided but its timeframe or price structure cannot be
reliably read, do NOT fabricate a level.

Use:

"price": null,
"strength": "Unavailable",
"rationale": "No usable chart data for this level."

If the timeframe can still be identified, preserve it in the
"timeframe" field.

If the timeframe itself cannot be identified, use:

"timeframe": "Unknown"

------------------------------------------------------------
COMBINED MAJOR SUPPORT
------------------------------------------------------------

After independently analyzing Support 1, Support 2 and Support 3,
determine the strongest major support for the unified trade plan.

Store it as:

multiTimeframeSupport.combinedMajorSupport

Prefer genuine confluence where support areas from multiple charts
overlap or are closely aligned.

If the individual support levels are materially different:

- Do NOT pretend they are the same level.
- Select the structurally most important major support.
- Explain why it is more important for the unified trade plan.

The Combined Major Support MUST be supported by actual visible chart
evidence.

------------------------------------------------------------
COMBINED MAJOR RESISTANCE
------------------------------------------------------------

After independently analyzing Resistance 1, Resistance 2 and
Resistance 3, determine the strongest major resistance for the unified
trade plan.

Store it as:

multiTimeframeSupport.combinedMajorResistance

Prefer genuine confluence where resistance areas from multiple charts
overlap or are closely aligned.

If the individual resistance levels are materially different:

- Do NOT pretend they are the same level.
- Select the structurally most important major resistance.
- Explain why it is more important for the unified trade plan.

The Combined Major Resistance MUST be supported by actual visible chart
evidence.

------------------------------------------------------------
CRITICAL RULES
------------------------------------------------------------

NEVER assume fixed timeframes such as:

15M
1H
4H

The uploaded charts may be ANY timeframes.

For example, if the charts are:

5M + 30M + 2H

then report:

Support 1 → 5M
Support 2 → 30M
Support 3 → 2H

and:

Resistance 1 → 5M
Resistance 2 → 30M
Resistance 3 → 2H

If the charts are:

1H + 4H + 1D

then report:

Support 1 → 1H
Support 2 → 4H
Support 3 → 1D

and:

Resistance 1 → 1H
Resistance 2 → 4H
Resistance 3 → 1D

NEVER rename an actual timeframe.

NEVER replace individual levels with combined labels such as:

"15M/1H support"
"1H/4H support"
"15M/1H/4H support"

Each chart's level must remain individually identified.

The Combined Major Support and Combined Major Resistance are separate
from Support 1/2/3 and Resistance 1/2/3.

The combined levels must be derived from the actual visible levels
identified across the uploaded charts.

9. MULTIPLE SCREENSHOTS (PRO MULTI-TIMEFRAME ANALYSIS).

If multiple screenshots are provided (${params.imageCount || 1} image(s) provided):

- You MUST thoroughly scan and analyze EVERY SINGLE SCREENSHOT in sequence:
  Chart 1, Chart 2, Chart 3.

- Determine the ACTUAL timeframe of each uploaded chart from the
  visible chart information whenever possible.

- NEVER assume fixed timeframes such as 15M, 1H, 4H, Daily, 5M, 30M,
  or any other predefined timeframe.

- Preserve each chart's actual timeframe and identity throughout the
  analysis.

- Understand each chart's role based on its ACTUAL timeframe and
  visible market structure:

  * Chart 1:
    Analyze its actual timeframe for the market structure, trend,
    important swing points, and major visible levels.

  * Chart 2:
    Analyze its actual timeframe for intermediate structure,
    support/resistance, confluence, liquidity behavior, and key zones.

  * Chart 3:
    Analyze its actual timeframe for entry setup, local price action,
    confirmation, and structural invalidation.

- The roles above are functional descriptions only.
  Do NOT assign a fixed timeframe to any role.

- If the uploaded charts have different timeframes, compare them
  according to their actual timeframe hierarchy.

- If there is a conflict between timeframes:
  * Determine which chart represents the broader/higher timeframe
    structure based on the actual uploaded timeframes.
  * Use the broader structure to determine the dominant market context.
  * Use the more precise/lower timeframe structure for entry timing,
    confirmation, and invalidation when appropriate.
  * Do NOT automatically treat Chart 1 as the highest timeframe or
    Chart 3 as the lowest timeframe unless the actual uploaded
    timeframes confirm this.

- If the uploaded charts are not in conventional higher-to-lower
  timeframe order, analyze them according to their actual timeframes
  rather than their upload order.

- You MUST synthesize all available charts into ONE UNIFIED,
  COHESIVE TRADE PLAN.

- In the "multiTimeframeAnalysis" JSON field, provide clear observations
  for each uploaded chart:

  * chart1:
    - actual timeframe
    - role based on the actual chart
    - observations
    - trend when applicable

  * chart2:
    - actual timeframe
    - role based on the actual chart
    - observations
    - key levels when applicable

  * chart3:
    - actual timeframe
    - role based on the actual chart
    - observations
    - setup trigger when applicable

- Also provide:
  * confluenceSummary:
    Explain where the uploaded charts agree or show confluence.

  * conflictResolution:
    Explain how any disagreement between the actual chart
    timeframes was resolved.

- NEVER invent a timeframe that is not visible or reliably identifiable
  from the uploaded chart.

- If a chart's timeframe cannot be reliably identified, use
  "Unknown" rather than guessing.
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
ENTRY / STOP LOSS / TAKE PROFIT EXECUTION LOGIC
============================================================

The trade setup MUST be built from the identified multi-timeframe
support and resistance levels.

Do NOT use the current market price as the Entry simply because it is
visible.

------------------------------------------------------------
DYNAMIC MULTI-TIMEFRAME EXECUTION RULES
------------------------------------------------------------

The user may provide ANY three chart timeframes.

NEVER assume that the charts are always 15M, 1H and 4H.

The three uploaded charts are represented as:

- Chart 1 = the first uploaded chart and its actual timeframe
- Chart 2 = the second uploaded chart and its actual timeframe
- Chart 3 = the third uploaded chart and its actual timeframe

Always use the ACTUAL timeframe detected from each chart.

Do NOT rename, replace, or assume a timeframe.

The support and resistance levels must remain individually tied to
their source chart:

- Support 1 / Resistance 1 → Chart 1 actual timeframe
- Support 2 / Resistance 2 → Chart 2 actual timeframe
- Support 3 / Resistance 3 → Chart 3 actual timeframe

The actual timeframe must be reported in the corresponding
multiTimeframeSupport object.

------------------------------------------------------------
SELL SETUP
------------------------------------------------------------

When the final signal is SELL:

1. ENTRY

The preferred SELL Entry should be near the resistance level that is
most appropriate for the execution timeframe.

Prefer rejection, sweep-and-rejection, or bearish confirmation at
that resistance.

Do NOT assume that the execution timeframe is 15M.

Select the appropriate resistance from the available chart
timeframes based on visible price structure and execution quality.

entryZone.min and entryZone.max must define the actual visible
execution zone.

Do NOT chase price after it has already moved substantially away
from the selected resistance zone.

2. STOP LOSS

The SELL Stop Loss must be above the relevant structural resistance
or swing high that invalidates the setup.

Prefer the higher-timeframe structural resistance when it is clearly
visible and relevant.

Leave enough room above the structural level for a normal
liquidity sweep or wick.

The SL must remain above Entry.

Do NOT use a fixed timeframe such as 1H for Stop Loss.

3. TAKE PROFIT 1

TP1 should normally be the nearest meaningful support below Entry
from one of the available chart timeframes.

Use the EXACT price from the corresponding support object.

The TP1 rationale MUST explicitly identify the source timeframe.

For example:

"TP1 is aligned with the 5M support at 4165."

or:

"TP1 is aligned with the 1H support at 4180."

Never invent a separate TP1 price when a valid visible support exists.

4. TAKE PROFIT 2

TP2 should normally be the Combined Major Support below TP1.

Use the exact price from:

multiTimeframeSupport.combinedMajorSupport.price

TP2 rationale MUST explicitly say:

"Combined Major Support"

TP2 must be below TP1.

Therefore the preferred SELL structure is:

SELL Entry → appropriate visible resistance
SL → structural invalidation resistance/swing high
TP1 → nearest meaningful timeframe-specific support
TP2 → Combined Major Support


------------------------------------------------------------
BUY SETUP
------------------------------------------------------------

When the final signal is BUY:

1. ENTRY

The preferred BUY Entry should be near the support level that is
most appropriate for the execution timeframe.

Prefer support bounce, sweep-and-reclaim, or bullish confirmation
at that support.

Do NOT assume that the execution timeframe is 15M.

Select the appropriate support from the available chart timeframes
based on visible price structure and execution quality.

entryZone.min and entryZone.max must define the actual visible
execution zone.

Do NOT chase price after it has already moved substantially away
from the selected support zone.

2. STOP LOSS

The BUY Stop Loss must be below the relevant structural support
or swing low that invalidates the setup.

Prefer the higher-timeframe structural support when it is clearly
visible and relevant.

Leave enough room below the structural level for a normal
liquidity sweep or wick.

The SL must remain below Entry.

Do NOT use a fixed timeframe such as 1H for Stop Loss.

3. TAKE PROFIT 1

TP1 should normally be the nearest meaningful resistance above
Entry from one of the available chart timeframes.

Use the EXACT price from the corresponding resistance object.

The TP1 rationale MUST explicitly identify the source timeframe.

For example:

"TP1 is aligned with the 15M resistance at 4200."

or:

"TP1 is aligned with the 4H resistance at 4250."

Never invent a separate TP1 price when a valid visible resistance exists.

4. TAKE PROFIT 2

TP2 should normally be the Combined Major Resistance above TP1.

Use the exact price from:

multiTimeframeSupport.combinedMajorResistance.price

TP2 rationale MUST explicitly say:

"Combined Major Resistance"

TP2 must be above TP1.

Therefore the preferred BUY structure is:

BUY Entry → appropriate visible support
SL → structural invalidation support/swing low
TP1 → nearest meaningful timeframe-specific resistance
TP2 → Combined Major Resistance


------------------------------------------------------------
TIMEFRAME-SPECIFIC SUPPORT / RESISTANCE RULE
------------------------------------------------------------

Every individual support and resistance MUST retain its own
timeframe identity.

Use this structure:

Chart 1 actual timeframe:
Support 1
Resistance 1

Chart 2 actual timeframe:
Support 2
Resistance 2

Chart 3 actual timeframe:
Support 3
Resistance 3

Example:

If the charts are 5M, 30M and 2H:

Support 1 = 5M support
Resistance 1 = 5M resistance

Support 2 = 30M support
Resistance 2 = 30M resistance

Support 3 = 2H support
Resistance 3 = 2H resistance

If the charts are 1H, 4H and 1D:

Support 1 = 1H support
Resistance 1 = 1H resistance

Support 2 = 4H support
Resistance 2 = 4H resistance

Support 3 = 1D support
Resistance 3 = 1D resistance

NEVER create fixed fields or references such as:

support15M
support1H
support4H
resistance15M
resistance1H
resistance4H

The timeframe must come from the actual uploaded chart.

------------------------------------------------------------
COMBINED MAJOR LEVELS
------------------------------------------------------------

Combined Major Support and Combined Major Resistance are separate
from Support 1/2/3 and Resistance 1/2/3.

They must be derived from the actual visible support/resistance
levels across the uploaded charts.

Combined Major Support must NOT be invented.

Combined Major Resistance must NOT be invented.

If multiple timeframe levels are closely aligned, this is confluence.

Keep the individual levels separate and preserve their individual
timeframe identities.

For example:

"5M support at 4165 and 30M support at 4168 form strong confluence."

Do NOT write:

"5M/30M support"

Instead identify each timeframe separately.

------------------------------------------------------------
------------------------------------------------------------
GENERAL EXECUTION RULES
------------------------------------------------------------

- All Entry, SL and TP levels must come from visible chart structure.
- Never use fixed hard-coded prices.
- Never use arbitrary percentage-based SL or TP.
- The exact numerical values must be derived from the actual chart.
- If the required timeframe level is unavailable or unreadable, use the
  next strongest clearly visible structural level and explain why.
- The final setup must maintain the mandatory BUY/SELL mathematical
  structure.
- The setup should prioritize a high-quality entry near a key
  timeframe level rather than entering at the current market price.
- Risk/reward must be calculated from the final Entry, SL and TP1.
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

MULTI-TIMEFRAME SUPPORT TARGET RULE:

When a Take Profit target is based on support, you MUST identify the
exact support timeframe and use the exact price from
multiTimeframeSupport.

For SELL trades:
- If TP1 is based on 15M support, use the 15M support price and say
  "15M support".
- If TP1 is based on 1H support, use the 1H support price and say
  "1H support".
- If TP1 is based on 4H support, use the 4H support price and say
  "4H support".
- If TP1 or TP2 is based on Combined Major Support, say
  "Combined Major Support" and use its exact price.

The same rule applies to TP2 and TP3.

STRICTLY FORBIDDEN:
- "15M/4H support"
- "1H/4H support"
- "15M/1H support"
- "15M/1H/4H support"
- Any other combined timeframe label for an individual support.

Never merge two timeframe labels into one support reference.

If multiple timeframe supports are close to each other, keep their
individual identities separate and mention confluence separately.

The support price mentioned in TP rationale MUST exactly match one of:
- multiTimeframeSupport.support15M.price
- multiTimeframeSupport.support1H.price
- multiTimeframeSupport.support4H.price
- multiTimeframeSupport.combinedMajorSupport.price

Do NOT create a new support price inside the TP rationale.
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
  "multiTimeframeSupport": {
  "support1": {
    "timeframe": "string",
    "price": 0,
    "strength": "Strong | Moderate | Weak | Unavailable",
    "rationale": "string explaining the visible support structure on Chart 1"
  },
  "resistance1": {
    "timeframe": "string",
    "price": 0,
    "strength": "Strong | Moderate | Weak | Unavailable",
    "rationale": "string explaining the visible resistance structure on Chart 1"
  },
  "support2": {
    "timeframe": "string",
    "price": 0,
    "strength": "Strong | Moderate | Weak | Unavailable",
    "rationale": "string explaining the visible support structure on Chart 2"
  },
  "resistance2": {
    "timeframe": "string",
    "price": 0,
    "strength": "Strong | Moderate | Weak | Unavailable",
    "rationale": "string explaining the visible resistance structure on Chart 2"
  },
  "support3": {
    "timeframe": "string",
    "price": 0,
    "strength": "Strong | Moderate | Weak | Unavailable",
    "rationale": "string explaining the visible support structure on Chart 3"
  },
  "resistance3": {
    "timeframe": "string",
    "price": 0,
    "strength": "Strong | Moderate | Weak | Unavailable",
    "rationale": "string explaining the visible resistance structure on Chart 3"
  },
  "combinedMajorSupport": {
    "price": 0,
    "strength": "Strong | Moderate | Weak | Unavailable",
    "rationale": "string explaining why this is the combined major support"
  },
  "combinedMajorResistance": {
    "price": 0,
    "strength": "Strong | Moderate | Weak | Unavailable",
    "rationale": "string explaining why this is the combined major resistance"
  }
},
============================================================
FINAL SUPPORT REPORTING — MANDATORY
============================================================

STRICT SUPPORT LABELING RULE:

NEVER write support references using combined timeframe labels such as:
- "15M/4H support"
- "1H/4H support"
- "15M/1H support"
- "15M/1H/4H support"

These labels are forbidden in the final analysis.

Every support reference MUST identify the exact timeframe:

- 15M support → use ONLY the identified 15M support price.
- 1H support → use ONLY the identified 1H support price.
- 4H support → use ONLY the identified 4H support price.
- Combined Major Support → use ONLY the identified combinedMajorSupport price.

If a target is based on a support level, explicitly state which timeframe's
support it is based on.

For example:
"TP1 is aligned with the 15M support at 4165."
NOT:
"TP1 is aligned with 15M/4H support."

For the combined level write:
"Combined Major Support is 4142, supported by the 1H and 4H structural levels."
Do not call it "1H/4H support."

The exact prices in the final explanation MUST match the prices in
multiTimeframeSupport.

Do not create a new support price in the explanation.
Before writing the final explanation or unified trade plan, use the
multiTimeframeSupport data that was identified from the charts.

The final analysis MUST explicitly report the support levels for all
three uploaded charts using their ACTUAL detected timeframes.

Report them in this structure:

[Chart 1 actual timeframe] Support: [price or Unavailable]
[Chart 2 actual timeframe] Support: [price or Unavailable]
[Chart 3 actual timeframe] Support: [price or Unavailable]
Combined Major Support: [price or Unavailable]

For each available timeframe, briefly explain why that level qualifies
as support based on visible chart structure.

The same rule applies to resistance levels:

[Chart 1 actual timeframe] Resistance: [price or Unavailable]
[Chart 2 actual timeframe] Resistance: [price or Unavailable]
[Chart 3 actual timeframe] Resistance: [price or Unavailable]
Combined Major Resistance: [price or Unavailable]

NEVER assume that the timeframes are 15M, 1H and 4H.

The actual timeframe must come from the uploaded chart.

If the three uploaded charts are 5M, 30M and 2H, report:

5M Support: [price or Unavailable]
30M Support: [price or Unavailable]
2H Support: [price or Unavailable]

If the three uploaded charts are 1H, 4H and 1D, report:

1H Support: [price or Unavailable]
4H Support: [price or Unavailable]
1D Support: [price or Unavailable]

Preserve each timeframe's individual identity.

NEVER replace individual timeframe levels with combined labels such as:

"15M/1H support"
"1H/4H support"
"15M/1H/4H support"

If multiple timeframe supports are closely aligned, explicitly mention
the confluence while keeping each support level individually identified.

The Combined Major Support MUST be based on the actual visible support
levels from the uploaded charts.

The Combined Major Resistance MUST be based on the actual visible
resistance levels from the uploaded charts.

Never fabricate or estimate a missing timeframe level.
If a timeframe level is unavailable, explicitly report:

"[Actual Timeframe] Support: Unavailable"

or:

"[Actual Timeframe] Resistance: Unavailable"
The Combined Major Support MUST be based on the actual visible
timeframe support levels and MUST NOT be invented.

If a timeframe is unavailable, explicitly write:
"[Timeframe] Support: Unavailable"

Never fabricate or estimate a missing support price.

The final trade plan, TP logic, and support-based target discussion
must remain consistent with these identified support levels.

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

// ============================================================
// SAFEPAY WEBHOOK RAW BODY
// ============================================================

app.use(
  '/api/safepay/webhook',
  express.raw({
    type: 'application/json',
    limit: MAX_BODY_SIZE,
  })
);
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
// SAFEPAY CHECKOUT
// ============================================================

app.post(
  '/api/safepay/checkout',
  async (req: Request, res: Response) => {
    console.log('[SAFEPAY] Checkout endpoint reached');
    try {
      const {
        plan,
        userIdentifier,
        currency,
      } = req.body || {};

      if (
        plan !== 'monthly' &&
        plan !== 'yearly'
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Safepay plan.',
        });
      }

      const identifier =
        typeof userIdentifier === 'string'
          ? userIdentifier.trim()
          : '';

      if (!identifier) {
        return res.status(400).json({
          success: false,
          error: 'User identifier is required.',
        });
      }

    const selectedCurrency =
  currency === 'USD'
    ? 'USD'
    : 'PKR';

const planId =
  selectedCurrency === 'USD'
    ? (
        plan === 'monthly'
          ? SAFEPAY_USD_MONTHLY_PLAN_ID
          : SAFEPAY_USD_YEARLY_PLAN_ID
      )
    : (
        plan === 'monthly'
          ? SAFEPAY_MONTHLY_PLAN_ID
          : SAFEPAY_YEARLY_PLAN_ID
      );
      if (!planId) {
        return res.status(500).json({
          success: false,
          error:
            'Safepay plan ID is not configured.',
        });
      }

      const authToken =
        await getSafepayAuthToken();

      const reference =
        `falcon_${Date.now()}_${crypto
          .randomBytes(6)
          .toString('hex')}`;

      const baseUrl =
        `${req.protocol}://${req.get('host')}`;

      const redirectUrl =
        `${baseUrl}/?safepay=success&reference=${encodeURIComponent(reference)}`;

      const cancelUrl =
        `${baseUrl}/?safepay=cancelled&reference=${encodeURIComponent(reference)}`;

      const now =
        new Date().toISOString();

      const record: PaidSubscriptionRecord = {
        reference,
        userIdentifier: identifier,
        planId,
        planType:
          plan === 'monthly'
            ? 'MONTHLY'
            : 'YEARLY',
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      };

      paidSubscriptionsList.set(
        reference,
        record
      );

      persistPaidSubscriptions();

      const checkoutUrl =
        buildSafepayCheckoutUrl({
          planId,
          reference,
          redirectUrl,
          cancelUrl,
          authToken,
        });

      return res.json({
        success: true,
        checkoutUrl,
        reference,
        plan,
      });
    } catch (error) {
      console.error(
        '[SAFEPAY] Checkout creation failed:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create Safepay checkout.',
      });
    }
  }
);
// ============================================================
 // SAFEPAY WEBHOOK
 // ============================================================

function verifySafepayWebhookSignature(
  rawBody: Buffer,
  receivedSignature: string
): boolean {
  if (
    !SAFEPAY_WEBHOOK_SECRET ||
    !receivedSignature
  ) {
    return false;
  }

 const computedSignature =
  crypto
    .createHmac(
      'sha512',
      SAFEPAY_WEBHOOK_SECRET
    )
    .update(rawBody)
    .digest('hex');

  const receivedBuffer =
    Buffer.from(
      receivedSignature,
      'hex'
    );

  const computedBuffer =
    Buffer.from(
      computedSignature,
      'hex'
    );

  if (
    receivedBuffer.length !==
    computedBuffer.length ||
    receivedBuffer.length === 0
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    computedBuffer,
    receivedBuffer
  );
}

app.post(
  '/api/safepay/webhook',
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const signatureHeader =
        req.headers['x-sfpy-signature'];

      const signature =
        typeof signatureHeader === 'string'
          ? signatureHeader
          : '';

      const rawBody =
        Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from('');
// فائل: server.ts

console.log(
  '[SAFEPAY] Webhook debug:',
  {
    isBuffer: Buffer.isBuffer(req.body),
    rawBodyLength: rawBody.length,
    signaturePresent: Boolean(signature),
    signatureLength: signature.length,
  }
);

      if (
        !verifySafepayWebhookSignature(
          rawBody,
          signature
        )
      ) {
        console.warn(
          '[SAFEPAY] Invalid webhook signature.'
        );

        return res
          .status(401)
          .send('Invalid signature');
      }

      const event =
        JSON.parse(
          rawBody.toString('utf8')
        );

      const eventType =
        typeof event?.type === 'string'
          ? event.type
          : '';

      const eventData =
        event?.data || {};

      if (!eventType) {
        return res
          .status(400)
          .send('Invalid event');
      }

      console.log(
        `[SAFEPAY] Webhook received: ${eventType}`
      );

      res.status(200).send('OK');

      if (
        eventType === 'subscription.created'
      ) {
        const reference =
          typeof eventData.reference === 'string'
            ? eventData.reference
            : '';

        const subscriptionId =
          typeof eventData.subscription_id === 'string'
            ? eventData.subscription_id
            : '';

        if (!reference) {
          console.warn(
            '[SAFEPAY] subscription.created without reference.'
          );
          return;
        }

        const existing =
          paidSubscriptionsList.get(reference);

        if (existing) {
          existing.status = 'PENDING';
          existing.subscriptionId =
            subscriptionId ||
            existing.subscriptionId;
          existing.updatedAt =
            new Date().toISOString();

          paidSubscriptionsList.set(
            reference,
            existing
          );

          persistPaidSubscriptions();
        }

        return;
      }

      if (
        eventType ===
        'subscription.payment.succeeded'
      ) {
        const reference =
          typeof eventData.reference === 'string'
            ? eventData.reference
            : '';

        const subscriptionId =
          typeof eventData.subscription_id === 'string'
            ? eventData.subscription_id
            : '';

        if (!reference) {
          console.warn(
            '[SAFEPAY] Successful subscription payment without reference.'
          );
          return;
        }

        const existing =
          paidSubscriptionsList.get(reference);

        if (!existing) {
          console.warn(
            `[SAFEPAY] No pending subscription found for reference: ${reference}`
          );
          return;
        }

        existing.status = 'ACTIVE';

        if (subscriptionId) {
          existing.subscriptionId =
            subscriptionId;
        }

        existing.updatedAt =
          new Date().toISOString();

        paidSubscriptionsList.set(
          reference,
          existing
        );

        persistPaidSubscriptions();

        console.log(
          `[SAFEPAY] Pro subscription activated: ${reference}`
        );

        return;
      }

      if (
        eventType ===
        'subscription.payment.failed'
      ) {
        const reference =
          typeof eventData.reference === 'string'
            ? eventData.reference
            : '';

        if (!reference) return;

        const existing =
          paidSubscriptionsList.get(reference);

        if (!existing) return;

        existing.status = 'PAYMENT_FAILED';
        existing.updatedAt =
          new Date().toISOString();

        paidSubscriptionsList.set(
          reference,
          existing
        );

        persistPaidSubscriptions();

        console.log(
          `[SAFEPAY] Subscription payment failed: ${reference}`
        );

        return;
      }

      if (
        eventType === 'subscription.cancelled' ||
        eventType === 'subscription.canceled' ||
        eventType === 'subscription.ended'
      ) {
        const reference =
          typeof eventData.reference === 'string'
            ? eventData.reference
            : '';

        if (!reference) return;

        const existing =
          paidSubscriptionsList.get(reference);

        if (!existing) return;

        existing.status =
          eventType === 'subscription.ended'
            ? 'ENDED'
            : 'CANCELED';

        existing.updatedAt =
          new Date().toISOString();

        paidSubscriptionsList.set(
          reference,
          existing
        );

        persistPaidSubscriptions();

        console.log(
          `[SAFEPAY] Subscription access ended: ${reference}`
        );

        return;
      }

      console.log(
        `[SAFEPAY] Ignored event: ${eventType}`
      );
    } catch (error) {
      console.error(
        '[SAFEPAY] Webhook processing error:',
        error
      );

      if (!res.headersSent) {
        return res
          .status(500)
          .send('Webhook processing failed');
      }
    }
  }
);
// ============================================================
// LICENSE VERIFICATION
// ============================================================

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

console.log('[PRICE SERVER DEBUG] parsedResult:', JSON.stringify(parsedResult));
console.log('[PRICE SERVER DEBUG] analysisData:', JSON.stringify(analysisData));
console.log('[PRICE SERVER DEBUG] ENTRY:', JSON.stringify(analysisData.entryZone));
console.log('[PRICE SERVER DEBUG] SL/TP:', JSON.stringify({
  stopLoss: analysisData.stopLoss,
  takeProfit1: analysisData.takeProfit1,
  takeProfit2: analysisData.takeProfit2,
}));
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
  console.log('[STORAGE DEBUG]', {
  cwd: process.cwd(),
  dataDir: DATA_DIR,
  testProFile: TEST_PRO_FILE,
  testProUsers: testProUsersList.size,
  testProFileExists: fs.existsSync(TEST_PRO_FILE),
});
  console.log('[FILESYSTEM TEST]', {
  cwd: process.cwd(),
  dataDirExists: fs.existsSync(DATA_DIR),
  testProFileExists: fs.existsSync(TEST_PRO_FILE),
});

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
