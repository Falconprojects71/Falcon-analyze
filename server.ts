import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const USERS_BACKUP_FILE = path.join(DATA_DIR, 'users.backup.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const PASSWORD_RESETS_FILE = path.join(DATA_DIR, 'password-resets.json');
const SAFEPAY_CHECKOUTS_FILE = path.join(DATA_DIR, 'safepay-checkouts.json');
const OWNER_HISTORY_FILE = path.join(DATA_DIR, 'owner-history.json');

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

const OWNER_EMAIL = (env('OWNER_EMAIL') || 'milyas1071@gmail.com').toLowerCase();
const OWNER_PASSWORD = env('OWNER_PASSWORD') || 'falcon_owner_2026';

const OWNER_SECRET_TOKEN =
  env('OWNER_SECRET_TOKEN') || 'falcon_owner_secret_2026_authorized';

const GEMINI_PRIMARY_MODEL =
  env('GEMINI_MODEL') || 'gemini-3.1-flash-lite';

const GEMINI_FALLBACK_MODELS = [
  GEMINI_PRIMARY_MODEL,
  'gemini-3.1-flash-lite',
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

export interface StoredUser {
  id: string; // usr_xxxxxxxxxxxx
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  licenseKey?: string | null;
  activeSubscriptionId?: string | null;
  freeAnalysisCount?: number;
  freeLimitReached?: boolean;
}


export interface UserSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface StoredSubscription {
  id: string; // sub_xxxxxxxxxxxx
  userId: string;
  userEmail: string;
  plan: 'monthly' | 'yearly';
  currency: 'USD' | 'PKR';
  reference: string;
  planId: string;
  licenseKey: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  expiresAt: string;
  activatedAt?: string;
}

export interface PasswordResetRecord {
  token: string;
  email: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface PendingSafepayCheckout {
  reference: string;
  tracker?: string;
  subscriptionId?: string;
  userId?: string;
  userEmail?: string;
  userIdentifier: string;
  plan: 'monthly' | 'yearly';
  currency?: 'USD' | 'PKR';
  planId: string;
  amount?: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  createdAt: string;
  completedAt?: string;
  licenseKey?: string;
}

interface UsageRecord {
  count: number;
  windowStartedAt: number;
  date?: string;
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
    type?: string;
  };

  stopLoss?: {
    price?: number;
    percentage?: string;
    percentageRisk?: number;
    rationale?: string;
  };

  takeProfit1?: {
    price?: number;
    status?: 'CONFIRMED' | 'UNAVAILABLE';
    percentageGain?: number;
    riskRewardRatio?: number;
    rrr?: string;
    rationale?: string;
  };

  takeProfit2?: {
    price?: number;
    status?: 'CONFIRMED' | 'UNAVAILABLE';
    percentageGain?: number;
    riskRewardRatio?: number;
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
      support1?: { price?: number | string; strength?: string; rationale?: string };
      resistance1?: { price?: number | string; strength?: string; rationale?: string };
    };
    chart2?: {
      timeframe?: string;
      role?: string;
      observations?: string;
      keyLevels?: string;
      support1?: { price?: number | string; strength?: string; rationale?: string };
      resistance1?: { price?: number | string; strength?: string; rationale?: string };
    };
    chart3?: {
      timeframe?: string;
      role?: string;
      observations?: string;
      setupTrigger?: string;
      support1?: { price?: number | string; strength?: string; rationale?: string };
      resistance1?: { price?: number | string; strength?: string; rationale?: string };
    };
    combinedMajorSupport?: { price?: number | string; strength?: string; rationale?: string };
    combinedMajorResistance?: { price?: number | string; strength?: string; rationale?: string };
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

const freeUsageTracker: Record<string, UsageRecord> = {};
const deviceToUsers: Record<string, string[]> = {};
const userToDevices: Record<string, string[]> = {};
let lastUsageMtime = 0;

function syncUsageStorageFromDisk(force: boolean = false) {
  try {
    if (!fs.existsSync(USAGE_FILE)) return;
    const stat = fs.statSync(USAGE_FILE);
    if (!force && stat.mtimeMs <= lastUsageMtime) return;
    lastUsageMtime = stat.mtimeMs;

    const raw = readJsonFile<any>(USAGE_FILE, {});
    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      if (raw.records && typeof raw.records === 'object' && Object.keys(raw.records).length > 0) {
        for (const k of Object.keys(freeUsageTracker)) delete freeUsageTracker[k];
        Object.assign(freeUsageTracker, raw.records);
        if (raw.deviceToUsers && typeof raw.deviceToUsers === 'object') {
          for (const k of Object.keys(deviceToUsers)) delete deviceToUsers[k];
          Object.assign(deviceToUsers, raw.deviceToUsers);
        }
        if (raw.userToDevices && typeof raw.userToDevices === 'object') {
          for (const k of Object.keys(userToDevices)) delete userToDevices[k];
          Object.assign(userToDevices, raw.userToDevices);
        }
      } else if (raw.records && typeof raw.records === 'object') {
        // empty records file
        for (const k of Object.keys(freeUsageTracker)) delete freeUsageTracker[k];
      } else if (Object.keys(raw).length > 0) {
        for (const k of Object.keys(freeUsageTracker)) delete freeUsageTracker[k];
        for (const [k, v] of Object.entries(raw)) {
          if (!k.startsWith('_') && v && typeof v === 'object') {
            freeUsageTracker[k] = v as UsageRecord;
          }
        }
      }
    }
  } catch (err) {
    console.error('[STORAGE] Failed to sync usage storage from disk:', err);
  }
}
syncUsageStorageFromDisk(true);

const users = readJsonFile<Record<string, StoredUser>>(
  USERS_FILE,
  {}
);

const sessions = readJsonFile<Record<string, UserSession>>(
  SESSIONS_FILE,
  {}
);

const subscriptions = readJsonFile<Record<string, StoredSubscription>>(
  SUBSCRIPTIONS_FILE,
  {}
);

const passwordResets = readJsonFile<Record<string, PasswordResetRecord>>(
  PASSWORD_RESETS_FILE,
  {}
);

const pendingSafepayCheckouts = readJsonFile<Record<string, PendingSafepayCheckout>>(
  SAFEPAY_CHECKOUTS_FILE,
  {}
);

function persistUsage() {
  writeJsonFile(USAGE_FILE, {
    records: freeUsageTracker,
    deviceToUsers,
    userToDevices,
  });
  try {
    lastUsageMtime = fs.statSync(USAGE_FILE).mtimeMs;
  } catch (_) {}
}

let lastUsersMtime = 0;

function syncUsersFromDisk(force: boolean = false) {
  try {
    let sourceFile = USERS_FILE;
    if (!fs.existsSync(USERS_FILE) && fs.existsSync(USERS_BACKUP_FILE)) {
      sourceFile = USERS_BACKUP_FILE;
    }
    if (!fs.existsSync(sourceFile)) return;
    const stat = fs.statSync(sourceFile);
    if (!force && stat.mtimeMs <= lastUsersMtime) return;
    lastUsersMtime = stat.mtimeMs;

    const diskUsers = readJsonFile<Record<string, StoredUser>>(sourceFile, {});
    if (diskUsers && typeof diskUsers === 'object') {
      Object.assign(users, diskUsers);
    }
  } catch (err) {
    console.error('[STORAGE] Failed to sync users from disk:', err);
  }
}
syncUsersFromDisk(true);

function persistUsers() {
  writeJsonFile(USERS_FILE, users);
  writeJsonFile(USERS_BACKUP_FILE, users);
  try {
    lastUsersMtime = fs.statSync(USERS_FILE).mtimeMs;
  } catch (_) {}
}

function persistSessions() {
  writeJsonFile(SESSIONS_FILE, sessions);
}

function persistSubscriptions() {
  writeJsonFile(SUBSCRIPTIONS_FILE, subscriptions);
}

function persistPasswordResets() {
  writeJsonFile(PASSWORD_RESETS_FILE, passwordResets);
}

function persistPendingSafepayCheckout(record: PendingSafepayCheckout) {
  pendingSafepayCheckouts[record.reference] = record;
  writeJsonFile(SAFEPAY_CHECKOUTS_FILE, pendingSafepayCheckouts);
}

// ============================================================
// CRYPTOGRAPHY & USER AUTH HELPERS
// ============================================================

function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (hashBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, expectedBuf);
  } catch {
    return false;
  }
}

function generateProLicenseKey(): string {
  // 128 bits = 16 bytes of cryptographic randomness formatted into uppercase blocks
  const buf = crypto.randomBytes(16);
  const p1 = buf.subarray(0, 4).toString('hex').toUpperCase();
  const p2 = buf.subarray(4, 8).toString('hex').toUpperCase();
  const p3 = buf.subarray(8, 12).toString('hex').toUpperCase();
  const p4 = buf.subarray(12, 16).toString('hex').toUpperCase();
  return `FALCON-PRO-${p1}-${p2}-${p3}-${p4}`;
}

function getSubscriptionForUser(userId: string): StoredSubscription | null {
  for (const sub of Object.values(subscriptions)) {
    if (sub.userId === userId && sub.status === 'ACTIVE') {
      const expMs = new Date(sub.expiresAt).getTime();
      if (Date.now() < expMs) {
        return sub;
      }
      sub.status = 'EXPIRED';
      persistSubscriptions();
    }
  }
  return null;
}

function getActiveSubscriptionForUser(userId: string): StoredSubscription | null {
  const user = users[userId];
  for (const sub of Object.values(subscriptions)) {
    if (sub.userId === userId && sub.status === 'ACTIVE') {
      const expMs = new Date(sub.expiresAt).getTime();
      if (Date.now() >= expMs) {
        sub.status = 'EXPIRED';
        persistSubscriptions();
        continue;
      }
      // Mandatory manual activation requirement:
      // Subscription must be explicitly activated AND bound to the user's account licenseKey
      if (sub.activatedAt && user?.licenseKey === sub.licenseKey) {
        return sub;
      }
    }
  }
  return null;
}

function isUserActivePro(user: StoredUser): { isPro: boolean; subscription: StoredSubscription | null; licenseKey: string | null } {
  const activeSub = getActiveSubscriptionForUser(user.id);
  if (activeSub) {
    return { isPro: true, subscription: activeSub, licenseKey: activeSub.licenseKey };
  }
  if (user.licenseKey && isVerifiedProKey(user.licenseKey)) {
    return { isPro: true, subscription: null, licenseKey: user.licenseKey };
  }
  return { isPro: false, subscription: null, licenseKey: null };
}

function sanitizeUser(user: StoredUser) {
  const activeSub = getActiveSubscriptionForUser(user.id);
  const proCheck = isUserActivePro(user);
  const userTrackerCount = Math.max(
    getRecordLifetimeCount(freeUsageTracker[hashIdentifier(`user:${user.id}`)]),
    user.email ? getRecordLifetimeCount(freeUsageTracker[hashIdentifier(`user:${user.email.toLowerCase()}`)]) : 0
  );
  const count = Math.max(user.freeAnalysisCount || 0, userTrackerCount);
  const limitReached = Boolean(user.freeLimitReached || count >= MAX_FREE_ANALYSES);

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    isPro: proCheck.isPro,
    licenseKey: proCheck.licenseKey,
    freeAnalysisCount: count,
    freeLimitReached: limitReached,
    subscription: activeSub ? {
      id: activeSub.id,
      userId: activeSub.userId,
      plan: activeSub.plan,
      currency: activeSub.currency,
      reference: activeSub.reference,
      licenseKey: activeSub.licenseKey,
      status: activeSub.status,
      createdAt: activeSub.createdAt,
      expiresAt: activeSub.expiresAt,
    } : null,
  };
}


function parseCookies(header?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!header) return list;
  header.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('=') || '').trim();
    }
  });
  return list;
}

function getAuthenticatedUserFromRequest(req: Request): StoredUser | null {
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const tokenHeader = typeof req.headers['x-auth-token'] === 'string' ? req.headers['x-auth-token'].trim() : '';
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies['falcon_auth_token'] || cookies['falcon_user_auth_token_v1'] || '';
  const queryToken = typeof req.query?.token === 'string' ? req.query.token.trim() : '';

  const candidateTokens = [
    tokenHeader,
    bearerToken,
    cookieToken,
    queryToken,
  ].filter(Boolean);

  if (candidateTokens.length === 0) return null;

  syncUsersFromDisk();

  for (const token of candidateTokens) {
    const session = sessions[token];
    if (session) {
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        delete sessions[token];
        persistSessions();
        continue;
      }
      return users[session.userId] || null;
    }
  }

  return null;
}

// ============================================================
// SAFEPAY SUBSCRIPTION HELPERS
// ============================================================

function getSafepayConfig() {
  const envType = (env('SAFEPAY_ENV') || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
  const secretKey = envType === 'production'
    ? (env('SAFEPAY_SECRET_KEY_LIVE') || env('SAFEPAY_SECRET_KEY_PRODUCTION') || env('SAFEPAY_SECRET_KEY'))
    : (env('SAFEPAY_SECRET_KEY_SANDBOX') || env('SAFEPAY_SECRET_KEY'));

  const webhookSecret = envType === 'production'
    ? (env('SAFEPAY_WEBHOOK_SECRET_LIVE') || env('SAFEPAY_WEBHOOK_SECRET_PRODUCTION') || env('SAFEPAY_WEBHOOK_SECRET'))
    : (env('SAFEPAY_WEBHOOK_SECRET_SANDBOX') || env('SAFEPAY_WEBHOOK_SECRET'));

  const defaultApiHost = envType === 'production'
    ? 'https://api.getsafepay.com'
    : 'https://sandbox.api.getsafepay.com';

  const defaultCheckoutHost = envType === 'production'
    ? 'https://getsafepay.com'
    : 'https://sandbox.api.getsafepay.com';

  const apiHost = env('SAFEPAY_API_HOST') || defaultApiHost;
  const checkoutHost = env('SAFEPAY_CHECKOUT_HOST') || defaultCheckoutHost;

  // Safepay Plan IDs for PKR (Pakistani Rupee)
  const monthlyPlanId = env('SAFEPAY_MONTHLY_PLAN_ID');
  const yearlyPlanId = env('SAFEPAY_YEARLY_PLAN_ID');

  // Safepay Plan IDs for USD (US Dollar)
  const monthlyPlanIdUsd = env('SAFEPAY_MONTHLY_PLAN_ID_USD');
  const yearlyPlanIdUsd = env('SAFEPAY_YEARLY_PLAN_ID_USD');

  const appUrl = env('APP_URL') || `http://localhost:${PORT}`;

  return {
    env: envType,
    secretKey,
    webhookSecret,
    apiHost: apiHost.replace(/\/+$/, ''),
    checkoutHost: checkoutHost.replace(/\/+$/, ''),
    monthlyPlanId,
    yearlyPlanId,
    monthlyPlanIdUsd,
    yearlyPlanIdUsd,
    appUrl: appUrl.replace(/\/+$/, ''),
  };
}

async function createSafepayAuthToken(config: ReturnType<typeof getSafepayConfig>): Promise<string> {
  if (!config.secretKey) {
    throw new Error('Safepay secret key is not configured.');
  }

  const endpoint = `${config.apiHost}/client/passport/v1/token`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SFPY-MERCHANT-SECRET': config.secretKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Safepay passport token request failed (HTTP ${response.status}): ${errorText}`);
  }

  const resJson: any = await response.json();
  const token = typeof resJson?.data === 'string'
    ? resJson.data
    : (resJson?.data?.token || resJson?.token);

  if (!token) {
    const message = resJson?.status?.message || resJson?.status?.errors?.join(', ') || 'Unknown token error';
    throw new Error(`Failed to retrieve Safepay auth token: ${message}`);
  }

  return token;
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
  if (!OWNER_SECRET_TOKEN) return null;

  const headerOwnerToken =
    typeof req.headers['x-owner-token'] === 'string'
      ? req.headers['x-owner-token'].trim()
      : '';

  const authHeader =
    typeof req.headers.authorization === 'string'
      ? req.headers.authorization.trim()
      : '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const cookies = parseCookies(req.headers.cookie);
  const cookieOwnerToken = cookies['falcon_owner_token'] || '';
  const queryOwnerToken = typeof req.query?.owner_token === 'string' ? req.query.owner_token.trim() : '';

  const candidateTokens = [
    headerOwnerToken,
    cookieOwnerToken,
    queryOwnerToken,
    bearerToken,
  ].filter(Boolean);

  for (const token of candidateTokens) {
    if (safeEqual(token, OWNER_SECRET_TOKEN)) {
      return {
        role: 'OWNER' as const,
        email: OWNER_EMAIL || 'owner',
      };
    }
  }

  return null;
}

function requireOwner(req: Request, res: Response, next: NextFunction) {
  const session = getOwnerSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Owner access required' });
  }
  next();
}

// ============================================================
// LICENSE
// ============================================================

function isVerifiedProKey(key?: string): boolean {
  if (!key || typeof key !== 'string') return false;

  const normalized = key.trim().toUpperCase();

  if (!normalized) return false;

  const configuredKeys = getConfiguredProKeys();
  if (configuredKeys.has(normalized)) return true;

  for (const sub of Object.values(subscriptions)) {
    if (sub.licenseKey === normalized && sub.status === 'ACTIVE' && new Date(sub.expiresAt).getTime() > Date.now()) {
      return true;
    }
  }

  return false;
}

// ============================================================
// FREE USAGE & LIFETIME LIMITS (PERMANENT 3-ANALYSIS ALLOWANCE)
// ============================================================

function getRecordLifetimeCount(record?: UsageRecord | null): number {
  if (!record) return 0;
  const count = typeof record.count === 'number' ? record.count : 0;
  const total = typeof record.totalCount === 'number' ? record.totalCount : 0;
  return Math.max(count, total);
}

interface ResolvedClientKeys {
  allKeys: string[];
  userId: string | null;
  clientId: string | null;
}

function getClientKeys(req: Request): ResolvedClientKeys {
  const keys: string[] = [];

  // Extract client device ID
  const clientHeader =
    typeof req.headers['x-client-id'] === 'string'
      ? req.headers['x-client-id'].trim()
      : typeof req.body?.clientId === 'string'
        ? req.body.clientId.trim()
        : '';

  const clientId =
    clientHeader && clientHeader.length >= 8 && clientHeader.length <= 200
      ? clientHeader
      : null;

  if (clientId) {
    keys.push(hashIdentifier(`client:${clientId}`));
    const linkedUsers = deviceToUsers[clientId] || [];
    for (const uId of linkedUsers) {
      keys.push(hashIdentifier(`user:${uId}`));
      const u = users[uId];
      if (u && u.email) {
        keys.push(hashIdentifier(`user:${u.email.toLowerCase()}`));
      }
    }
  }

  // Extract device fingerprint
  const fpHeader =
    typeof req.headers['x-device-fingerprint'] === 'string'
      ? req.headers['x-device-fingerprint'].trim()
      : typeof req.body?.deviceFingerprint === 'string'
        ? req.body.deviceFingerprint.trim()
        : '';

  if (fpHeader && fpHeader.length >= 8 && fpHeader.length <= 200) {
    keys.push(hashIdentifier(`fp:${fpHeader}`));
  }

  // Extract anonymous persistent user identifier
  const userIdentifierHeader =
    typeof req.headers['x-user-identifier'] === 'string'
      ? req.headers['x-user-identifier'].trim()
      : typeof req.body?.userIdentifier === 'string'
        ? req.body.userIdentifier.trim()
        : '';

  if (
    userIdentifierHeader &&
    userIdentifierHeader.length >= 6 &&
    userIdentifierHeader.length <= 150 &&
    !userIdentifierHeader.includes('@')
  ) {
    keys.push(hashIdentifier(`anon_uid:${userIdentifierHeader}`));
  }

  // Authenticated User
  const authUser = getAuthenticatedUserFromRequest(req);
  const userId = authUser ? authUser.id : null;

  if (authUser) {
    keys.push(hashIdentifier(`user:${authUser.id}`));
    if (authUser.email) {
      keys.push(hashIdentifier(`user:${authUser.email.toLowerCase()}`));
    }
    const linkedDevices = userToDevices[authUser.id] || [];
    for (const dId of linkedDevices) {
      keys.push(hashIdentifier(`client:${dId}`));
    }
  }

  if (keys.length === 0) {
    keys.push(hashIdentifier('fallback:anonymous_session'));
  }

  return {
    allKeys: Array.from(new Set(keys)),
    userId,
    clientId,
  };
}

function getEffectiveUsage(req: Request): {
  count: number;
  windowStartedAt: null;
  resetAt: null;
  keys: string[];
  userId: string | null;
  clientId: string | null;
} {
  syncUsageStorageFromDisk();
  const { allKeys, userId, clientId } = getClientKeys(req);
  let maxCount = 0;

  for (const k of allKeys) {
    const rec = freeUsageTracker[k];
    if (rec) {
      const c = getRecordLifetimeCount(rec);
      if (c > maxCount) {
        maxCount = c;
      }
    }
  }

  if (userId && users[userId]) {
    const userStoredCount = users[userId].freeAnalysisCount || 0;
    if (userStoredCount > maxCount) {
      maxCount = userStoredCount;
    }
  }

  return {
    count: maxCount,
    windowStartedAt: null,
    resetAt: null,
    keys: allKeys,
    userId,
    clientId,
  };
}

function getFreeUsageCountForClient(req: Request): number {
  return getEffectiveUsage(req).count;
}

function linkAccountAndDevice(
  userId: string,
  clientId?: string | null,
  fpHeader?: string | null,
  userIdentifier?: string | null
): void {
  if (!userId) return;

  const validClientId =
    clientId && clientId.length >= 8 && clientId.length <= 200 ? clientId : null;

  if (validClientId) {
    if (!userToDevices[userId]) userToDevices[userId] = [];
    if (!userToDevices[userId].includes(validClientId)) {
      userToDevices[userId].push(validClientId);
    }

    if (!deviceToUsers[validClientId]) deviceToUsers[validClientId] = [];
    if (!deviceToUsers[validClientId].includes(userId)) {
      deviceToUsers[validClientId].push(userId);
    }
  }

  const user = users[userId];
  const keys = [
    hashIdentifier(`user:${userId}`),
    ...(user && user.email ? [hashIdentifier(`user:${user.email.toLowerCase()}`)] : []),
    ...(validClientId ? [hashIdentifier(`client:${validClientId}`)] : []),
    ...(fpHeader && fpHeader.length >= 8 && fpHeader.length <= 200
      ? [hashIdentifier(`fp:${fpHeader}`)]
      : []),
    ...(userIdentifier && userIdentifier.length >= 6 && !userIdentifier.includes('@')
      ? [hashIdentifier(`anon_uid:${userIdentifier}`)]
      : []),
    ...(userToDevices[userId] || []).map((d) => hashIdentifier(`client:${d}`)),
    ...(validClientId && deviceToUsers[validClientId]
      ? deviceToUsers[validClientId].map((u) => hashIdentifier(`user:${u}`))
      : []),
  ];
  const uniqueKeys = Array.from(new Set(keys));

  const now = Date.now();
  let maxLifetimeCount = 0;
  let mostRecentLastUsedAt: string = new Date(now).toISOString();

  for (const k of uniqueKeys) {
    const rec = freeUsageTracker[k];
    if (rec) {
      const c = getRecordLifetimeCount(rec);
      if (c > maxLifetimeCount) {
        maxLifetimeCount = c;
      }
      if (rec.lastUsedAt) mostRecentLastUsedAt = rec.lastUsedAt;
    }
  }

  if (userId && users[userId]) {
    const userStoredCount = users[userId].freeAnalysisCount || 0;
    if (userStoredCount > maxLifetimeCount) {
      maxLifetimeCount = userStoredCount;
    }
  }

  if (maxLifetimeCount > 0) {
    const mergedRecord: UsageRecord = {
      count: maxLifetimeCount,
      windowStartedAt: now,
      lastUsedAt: mostRecentLastUsedAt,
      totalCount: maxLifetimeCount,
    };
    for (const k of uniqueKeys) {
      freeUsageTracker[k] = { ...mergedRecord };
    }
  }

  if (userId && users[userId]) {
    users[userId].freeAnalysisCount = maxLifetimeCount;
    users[userId].freeLimitReached = maxLifetimeCount >= MAX_FREE_ANALYSES;
    persistUsers();
  }

  persistUsage();
}

// In-flight concurrency protection tracker
const inFlightRequests = new Map<string, number>();

function getInFlightCountForKeys(keys: string[]): number {
  let max = 0;
  for (const k of keys) {
    const val = inFlightRequests.get(k) || 0;
    if (val > max) max = val;
  }
  return max;
}

function reserveAnalysisAttempt(keys: string[]): boolean {
  syncUsageStorageFromDisk();
  let maxCurrent = 0;
  for (const k of keys) {
    const rec = freeUsageTracker[k];
    if (rec) {
      const c = getRecordLifetimeCount(rec);
      if (c > maxCurrent) {
        maxCurrent = c;
      }
    }
  }

  const currentInFlight = getInFlightCountForKeys(keys);

  if (maxCurrent + currentInFlight >= MAX_FREE_ANALYSES) {
    return false;
  }

  for (const k of keys) {
    inFlightRequests.set(k, (inFlightRequests.get(k) || 0) + 1);
  }

  return true;
}

function releaseAnalysisReservation(keys: string[]): void {
  for (const k of keys) {
    const val = inFlightRequests.get(k) || 0;
    if (val <= 1) {
      inFlightRequests.delete(k);
    } else {
      inFlightRequests.set(k, val - 1);
    }
  }
}

function commitSuccessfulFreeAnalysis(keys: string[], userId?: string | null): number {
  syncUsageStorageFromDisk();
  syncUsersFromDisk();
  const now = Date.now();
  let maxCount = 0;

  for (const k of keys) {
    const rec = freeUsageTracker[k];
    if (rec) {
      const c = getRecordLifetimeCount(rec);
      if (c > maxCount) {
        maxCount = c;
      }
    }
  }

  if (userId && users[userId]) {
    const userStoredCount = users[userId].freeAnalysisCount || 0;
    if (userStoredCount > maxCount) {
      maxCount = userStoredCount;
    }
  }

  const newCount = maxCount + 1;
  const nowIso = new Date(now).toISOString();

  const updatedRecord: UsageRecord = {
    count: newCount,
    windowStartedAt: now,
    lastUsedAt: nowIso,
    totalCount: newCount,
  };

  for (const k of keys) {
    freeUsageTracker[k] = { ...updatedRecord };
  }

  if (userId && users[userId]) {
    users[userId].freeAnalysisCount = newCount;
    users[userId].freeLimitReached = newCount >= MAX_FREE_ANALYSES;
    persistUsers();
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
        'User-Agent': 'aistudio-build',
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
// STRUCTURAL TRADE PLAN RECONCILIATION & VALIDATION
// ============================================================

function formatLevelPrice(price: number): string {
  if (!Number.isFinite(price)) return '$0';
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

export function getPricePrecision(price: number, asset?: string): number {
  const a = String(asset || '').toUpperCase();
  if (a.includes('JPY')) return 3;
  if (a.includes('XAU') || a.includes('GOLD') || a.includes('SILVER') || a.includes('XAG')) return 2;
  if (a.includes('US30') || a.includes('DJI') || a.includes('SPX') || a.includes('NAS') || a.includes('NDX') || a.includes('GER') || a.includes('DAX')) return 1;
  if (price >= 1000) return 2;
  if (price >= 1) return 4;
  return 6;
}

export function computeDynamicBuffer(price: number, style?: string): number {
  const p = Math.max(price, 0.0001);
  const s = String(style || '').toLowerCase();
  let bufferPct = 0.0025; // default 0.25% intraday
  if (s.includes('scalp')) {
    bufferPct = 0.0015; // 0.15% tighter for scalps
  } else if (s.includes('swing') || s.includes('position')) {
    bufferPct = 0.0040; // 0.40% wider for swing/position
  }
  return Math.max(p * bufferPct, 0.0001);
}

export function computeTargetBuffer(targetPrice: number, style?: string, asset?: string): number {
  const p = Math.max(targetPrice, 0.0001);
  const s = String(style || '').toLowerCase();
  const a = String(asset || '').toUpperCase();

  let pct = 0.0015; // default 0.15% for intraday
  if (s.includes('scalp')) {
    pct = 0.0008; // 0.08% for scalp
  } else if (s.includes('swing') || s.includes('position')) {
    pct = 0.0025; // 0.25% for swing
  }

  if (a.includes('JPY')) {
    return Number((p * pct).toFixed(3));
  }
  if (a.includes('US30') || a.includes('NAS') || a.includes('SPX') || a.includes('GER')) {
    return Number((p * pct).toFixed(1));
  }
  return p * pct;
}

export function reconcileAndValidateTradePlan(
  analysis: ChartAnalysis,
  context: {
    asset?: string;
    timeframe?: string;
    tradingStyle?: string;
  }
): {
  reconciled: ChartAnalysis;
  validation: { valid: boolean; reason?: string; checks: Record<string, boolean> };
} {
  const rawSig = String(analysis?.verdict?.signal || '').toUpperCase().trim();
  const rawBias = String(analysis?.verdict?.bias || '').toUpperCase().trim();
  const rawTrend = String(analysis?.marketTrend || '').toUpperCase().trim();
  const rawDesc = `${analysis?.marketStructure?.description || ''} ${analysis?.verdict?.summary || ''} ${analysis?.detailedExplanation || ''}`.toUpperCase();

  // Decisive directional resolution: ALWAYS provide an actionable BUY or SELL setup
  let finalSignal: 'BUY' | 'SELL';
  if (
    rawSig.includes('SELL') || rawSig.includes('SHORT') || rawSig.includes('BEAR') ||
    rawBias.includes('BEAR') || rawBias.includes('SHORT') ||
    rawTrend.includes('BEAR') || rawTrend.includes('DOWN') ||
    rawDesc.includes('DOWNTREND') || rawDesc.includes('LOWER HIGH') || rawDesc.includes('BEARISH')
  ) {
    finalSignal = 'SELL';
  } else {
    finalSignal = 'BUY';
  }

  const curP = parseNumericValue(analysis.currentPrice);
  let entryRec = parseNumericValue(analysis.entryZone?.recommended ?? (analysis.entryZone as any)?.min) || curP || 100;
  const precision = getPricePrecision(entryRec, context.asset || analysis.asset);
  const dynamicBuffer = computeDynamicBuffer(entryRec, context.tradingStyle || analysis.tradingStyle);

  // Determine Entry Zone boundaries
  let entryMin = parseNumericValue((analysis.entryZone as any)?.min);
  let entryMax = parseNumericValue((analysis.entryZone as any)?.max);
  if (entryMin === null && entryMax === null) {
    if (typeof analysis.entryZone?.range === 'string') {
      const parts = analysis.entryZone.range
        .split(/[-–—to]/i)
        .map((s) => parseNumericValue(s))
        .filter((n): n is number => n !== null);
      if (parts.length >= 2) {
        entryMin = Math.min(parts[0], parts[1]);
        entryMax = Math.max(parts[0], parts[1]);
      }
    }
  }
  if (entryMin === null) entryMin = Number((entryRec - dynamicBuffer * 0.5).toFixed(precision));
  if (entryMax === null) entryMax = Number((entryRec + dynamicBuffer * 0.5).toFixed(precision));
  if (entryMin > entryMax) {
    const temp = entryMin;
    entryMin = entryMax;
    entryMax = temp;
  }
  if (entryRec < entryMin) entryMin = entryRec;
  if (entryRec > entryMax) entryMax = entryRec;
  if (entryMin === entryMax) {
    entryMin = Number((entryRec - dynamicBuffer * 0.4).toFixed(precision));
    entryMax = Number((entryRec + dynamicBuffer * 0.4).toFixed(precision));
  }

  // Extract all valid support prices from primary and multi-timeframe fields
  const rawSupports: number[] = [];
  if (Array.isArray(analysis.supportLevels)) {
    analysis.supportLevels.forEach((s) => {
      const p = parseNumericValue(s?.price ?? s);
      if (p !== null) rawSupports.push(p);
    });
  }
  const mtf = analysis.multiTimeframeAnalysis;
  if (mtf) {
    [mtf.chart1?.support1, mtf.chart2?.support1, mtf.chart3?.support1, mtf.combinedMajorSupport].forEach((s) => {
      const p = parseNumericValue(s?.price ?? s);
      if (p !== null) rawSupports.push(p);
    });
  }
  const supports = rawSupports
    .filter((p, i, a) => a.findIndex((x) => Math.abs(x - p) / p < 0.0005) === i)
    .sort((a, b) => b - a);

  // Extract all valid resistance prices from primary and multi-timeframe fields
  const rawResistances: number[] = [];
  if (Array.isArray(analysis.resistanceLevels)) {
    analysis.resistanceLevels.forEach((r) => {
      const p = parseNumericValue(r?.price ?? r);
      if (p !== null) rawResistances.push(p);
    });
  }
  if (mtf) {
    [mtf.chart1?.resistance1, mtf.chart2?.resistance1, mtf.chart3?.resistance1, mtf.combinedMajorResistance].forEach((r) => {
      const p = parseNumericValue(r?.price ?? r);
      if (p !== null) rawResistances.push(p);
    });
  }
  const resistances = rawResistances
    .filter((p, i, a) => a.findIndex((x) => Math.abs(x - p) / p < 0.0005) === i)
    .sort((a, b) => a - b);

  let slPrice = parseNumericValue(analysis.stopLoss?.price);
  let slRationale = analysis.stopLoss?.rationale || '';

  let tp1Price: number | undefined = undefined;
  let tp1Status: 'CONFIRMED' | 'UNAVAILABLE' = 'UNAVAILABLE';
  let tp1Rationale = '';

  let tp2Price: number | undefined = undefined;
  let tp2Status: 'CONFIRMED' | 'UNAVAILABLE' = 'UNAVAILABLE';
  let tp2Rationale = '';

  if (finalSignal === 'BUY') {
    // 1. STOP LOSS (strictly below Entry Zone)
    const supBelowEntry = supports.filter((s) => s < entryMin * 0.9995);
    const nearestSup = supBelowEntry.length > 0 ? supBelowEntry[0] : null;

    if (slPrice === null || slPrice >= entryMin) {
      slPrice = nearestSup ? Number((nearestSup - dynamicBuffer).toFixed(precision)) : Number((entryMin - Math.max(dynamicBuffer * 2, entryRec * 0.012)).toFixed(precision));
      slRationale = `Stop Loss anchored strictly below support ${formatLevelPrice(nearestSup || entryMin)} invalidating bullish thesis if breached.`;
    } else if (nearestSup && slPrice > nearestSup) {
      slPrice = Number((nearestSup - dynamicBuffer).toFixed(precision));
      slRationale = `Stop Loss anchored below structural support ${formatLevelPrice(nearestSup)} with volatility buffer.`;
    }
    if (slPrice >= entryMin) {
      slPrice = Number((entryMin - dynamicBuffer * 1.5).toFixed(precision));
    }
    const risk = Math.max(entryRec - slPrice, dynamicBuffer * 1.5);

    // 2. TAKE PROFIT 1 (strictly above Entry Zone with favorable R:R)
    const resAbove = resistances.filter((r) => r > entryMax);
    const viableRes = resAbove.filter((r) => (r - entryRec) / risk >= 0.95);

    let tp1AnchorRes: number | null = null;
    const rawTp1 = parseNumericValue(analysis.takeProfit1?.price);
    if (rawTp1 !== null && rawTp1 > entryMax && (rawTp1 - entryRec) / risk >= 0.95) {
      tp1Price = rawTp1;
      tp1AnchorRes = rawTp1;
      tp1Status = 'CONFIRMED';
      tp1Rationale = analysis.takeProfit1?.rationale || `Primary target at ${formatLevelPrice(tp1Price)} (+${(((tp1Price - entryRec) / entryRec) * 100).toFixed(2)}%, R:R 1:${((tp1Price - entryRec) / risk).toFixed(2)}).`;
    } else if (viableRes.length > 0) {
      const nearestViable = viableRes[0];
      tp1AnchorRes = nearestViable;
      const targetBuf = computeTargetBuffer(nearestViable, context.tradingStyle || analysis.tradingStyle, context.asset || analysis.asset);
      const maxBuf = Math.max((nearestViable - entryMax) * 0.2, 0);
      const effectiveBuf = Math.min(targetBuf, maxBuf);
      tp1Price = Number((nearestViable - effectiveBuf).toFixed(precision));
      if (tp1Price <= entryMax || (tp1Price - entryRec) / risk < 0.95) tp1Price = nearestViable;
      tp1Status = 'CONFIRMED';
      tp1Rationale = `Primary target positioned before resistance ${formatLevelPrice(nearestViable)} to lock in gains prior to selling pressure.`;
    } else {
      tp1Price = undefined;
      tp1Status = 'UNAVAILABLE';
      tp1Rationale = 'Target unconfirmed: No viable chart resistance identified offering favorable R:R above Entry Zone.';
    }

    // 3. TAKE PROFIT 2 (strictly above TP1 with extended R:R)
    if (tp1Status === 'CONFIRMED' && tp1Price !== undefined) {
      const minLevelForTp2 = Math.max(tp1AnchorRes ?? tp1Price, tp1Price);
      const higherRes = resAbove.filter((r) => r > minLevelForTp2 * 1.0005);
      const rawTp2 = parseNumericValue(analysis.takeProfit2?.price);
      if (rawTp2 !== null && rawTp2 > minLevelForTp2) {
        tp2Price = rawTp2;
        tp2Status = 'CONFIRMED';
        tp2Rationale = analysis.takeProfit2?.rationale || `Extended runner target at ${formatLevelPrice(tp2Price)} (+${(((tp2Price - entryRec) / entryRec) * 100).toFixed(2)}%, R:R 1:${((tp2Price - entryRec) / risk).toFixed(2)}).`;
      } else if (higherRes.length > 0) {
        const nextRes = higherRes[0];
        const targetBuf = computeTargetBuffer(nextRes, context.tradingStyle || analysis.tradingStyle, context.asset || analysis.asset);
        const maxBuf = Math.max((nextRes - tp1Price) * 0.2, 0);
        const effectiveBuf = Math.min(targetBuf, maxBuf);
        tp2Price = Number((nextRes - effectiveBuf).toFixed(precision));
        if (tp2Price <= tp1Price) tp2Price = nextRes;
        tp2Status = 'CONFIRMED';
        tp2Rationale = `Extended runner target aligned with major overhead resistance ${formatLevelPrice(nextRes)}.`;
      } else {
        tp2Price = undefined;
        tp2Status = 'UNAVAILABLE';
        tp2Rationale = 'Runner target unconfirmed: No subsequent structural resistance identified beyond TP1 on uploaded charts.';
      }
    } else {
      tp2Price = undefined;
      tp2Status = 'UNAVAILABLE';
      tp2Rationale = 'Runner target unconfirmed: Primary target unconfirmed on uploaded charts.';
    }
  } else {
    // -------------------------------------------------------------
    // SELL SETUP
    // -------------------------------------------------------------
    // 1. STOP LOSS (strictly above Entry Zone)
    const resAboveEntry = resistances.filter((r) => r > entryMax * 1.0005).sort((a, b) => a - b);
    const nearestRes = resAboveEntry.length > 0 ? resAboveEntry[0] : null;

    if (slPrice === null || slPrice <= entryMax) {
      slPrice = nearestRes ? Number((nearestRes + dynamicBuffer).toFixed(precision)) : Number((entryMax + Math.max(dynamicBuffer * 2, entryRec * 0.012)).toFixed(precision));
      slRationale = `Stop Loss anchored strictly above resistance ${formatLevelPrice(nearestRes || entryMax)} invalidating bearish thesis if breached.`;
    } else if (nearestRes && slPrice < nearestRes) {
      slPrice = Number((nearestRes + dynamicBuffer).toFixed(precision));
      slRationale = `Stop Loss anchored above structural resistance ${formatLevelPrice(nearestRes)} with volatility buffer.`;
    }
    if (slPrice <= entryMax) {
      slPrice = Number((entryMax + dynamicBuffer * 1.5).toFixed(precision));
    }
    const risk = Math.max(slPrice - entryRec, dynamicBuffer * 1.5);

    // 2. TAKE PROFIT 1 (strictly below Entry Zone with favorable R:R)
    const supBelow = supports.filter((s) => s < entryMin);
    const viableSup = supBelow.filter((s) => (entryRec - s) / risk >= 0.95);

    let tp1AnchorSup: number | null = null;
    const rawTp1 = parseNumericValue(analysis.takeProfit1?.price);
    if (rawTp1 !== null && rawTp1 < entryMin && (entryRec - rawTp1) / risk >= 0.95) {
      tp1Price = rawTp1;
      tp1AnchorSup = rawTp1;
      tp1Status = 'CONFIRMED';
      tp1Rationale = analysis.takeProfit1?.rationale || `Primary target at ${formatLevelPrice(tp1Price)} (+${(((entryRec - tp1Price) / entryRec) * 100).toFixed(2)}%, R:R 1:${((entryRec - tp1Price) / risk).toFixed(2)}).`;
    } else if (viableSup.length > 0) {
      const nearestViable = viableSup[0];
      tp1AnchorSup = nearestViable;
      const targetBuf = computeTargetBuffer(nearestViable, context.tradingStyle || analysis.tradingStyle, context.asset || analysis.asset);
      const maxBuf = Math.max((entryMin - nearestViable) * 0.2, 0);
      const effectiveBuf = Math.min(targetBuf, maxBuf);
      tp1Price = Number((nearestViable + effectiveBuf).toFixed(precision));
      if (tp1Price >= entryMin || (entryRec - tp1Price) / risk < 0.95) tp1Price = nearestViable;
      tp1Status = 'CONFIRMED';
      tp1Rationale = `Primary target positioned prior to support ${formatLevelPrice(nearestViable)} to lock in gains before buying pressure.`;
    } else {
      tp1Price = undefined;
      tp1Status = 'UNAVAILABLE';
      tp1Rationale = 'Target unconfirmed: No viable chart support identified offering favorable R:R below Entry Zone.';
    }

    // 3. TAKE PROFIT 2 (strictly below TP1 with extended R:R)
    if (tp1Status === 'CONFIRMED' && tp1Price !== undefined) {
      const maxLevelForTp2 = Math.min(tp1AnchorSup ?? tp1Price, tp1Price);
      const lowerSup = supBelow.filter((s) => s < maxLevelForTp2 * 0.9995);
      const rawTp2 = parseNumericValue(analysis.takeProfit2?.price);
      if (rawTp2 !== null && rawTp2 < maxLevelForTp2) {
        tp2Price = rawTp2;
        tp2Status = 'CONFIRMED';
        tp2Rationale = analysis.takeProfit2?.rationale || `Extended runner target at ${formatLevelPrice(tp2Price)} (+${(((entryRec - tp2Price) / entryRec) * 100).toFixed(2)}%, R:R 1:${((entryRec - tp2Price) / risk).toFixed(2)}).`;
      } else if (lowerSup.length > 0) {
        const nextSup = lowerSup[0];
        const targetBuf = computeTargetBuffer(nextSup, context.tradingStyle || analysis.tradingStyle, context.asset || analysis.asset);
        const maxBuf = Math.max((tp1Price - nextSup) * 0.2, 0);
        const effectiveBuf = Math.min(targetBuf, maxBuf);
        tp2Price = Number((nextSup + effectiveBuf).toFixed(precision));
        if (tp2Price >= tp1Price) tp2Price = nextSup;
        tp2Status = 'CONFIRMED';
        tp2Rationale = `Extended runner target aligned with major underlying support ${formatLevelPrice(nextSup)}.`;
      } else {
        tp2Price = undefined;
        tp2Status = 'UNAVAILABLE';
        tp2Rationale = 'Runner target unconfirmed: No subsequent structural support identified beyond TP1 on uploaded charts.';
      }
    } else {
      tp2Price = undefined;
      tp2Status = 'UNAVAILABLE';
      tp2Rationale = 'Runner target unconfirmed: Primary target unconfirmed on uploaded charts.';
    }
  }

  // MATHEMATICAL RECONCILIATION
  const risk = Math.abs(entryRec - slPrice!);
  const reward1 = tp1Price !== undefined ? Math.abs(tp1Price - entryRec) : undefined;
  const reward2 = tp2Price !== undefined ? Math.abs(tp2Price - entryRec) : undefined;

  const rrr1 = (reward1 !== undefined && risk > 0) ? (reward1 / risk).toFixed(2) : undefined;
  const rrr2 = (reward2 !== undefined && risk > 0) ? (reward2 / risk).toFixed(2) : undefined;

  const pctGain1 = (reward1 !== undefined && entryRec > 0) ? Number(((reward1 / entryRec) * 100).toFixed(2)) : undefined;
  const pctGain2 = (reward2 !== undefined && entryRec > 0) ? Number(((reward2 / entryRec) * 100).toFixed(2)) : undefined;
  const pctRisk = Number(((risk / entryRec) * 100).toFixed(2));

  // STEP BY STEP TRADE EXECUTION PLAN MATCHING CARD VALUES EXACTLY
  const styleTitle = analysis.tradingStyle || 'Intraday';
  const actionWord = finalSignal === 'BUY' ? 'Long' : 'Short';
  const step1 = `1. Execution Trigger: Confirm ${actionWord} entry at ${formatLevelPrice(entryRec)} within the ${formatLevelPrice(entryMin)} – ${formatLevelPrice(entryMax)} zone (${styleTitle}).`;
  const step2 = `2. Invalidation Anchor: Maintain strict stop loss at ${formatLevelPrice(slPrice!)} (-${pctRisk}%), invalidating setup if breached.`;
  const step3 = tp1Price !== undefined
    ? `3. Primary Target: Take primary profit at ${formatLevelPrice(tp1Price)} (+${pctGain1}%, R:R 1:${rrr1}) — ${tp1Rationale}`
    : `3. Primary Target: Unconfirmed — ${tp1Rationale}`;
  const step4 = tp2Price !== undefined
    ? `4. Runner Target / Trailing: Trail remaining position to ${formatLevelPrice(tp2Price)} (+${pctGain2}%, R:R 1:${rrr2}) — ${tp2Rationale}`
    : `4. Runner Target / Trailing: Unconfirmed — ${tp2Rationale}`;

  const invalidationText = finalSignal === 'BUY'
    ? `Bullish structure is invalidated if a candle closes below ${formatLevelPrice(slPrice!)}.`
    : `Bearish structure is invalidated if a candle closes above ${formatLevelPrice(slPrice!)}.`;

  const riskTips = rrr1
    ? `Risk maximum 1–2% of trading equity on this setup. Mathematical Risk-to-Reward ratio is 1:${rrr1} on TP1${rrr2 ? ` and 1:${rrr2} on TP2` : ''}.`
    : 'Risk maximum 1–2% of trading equity on this setup. Await confirmed target confirmation before executing.';

  const reconciled: ChartAnalysis = {
    ...analysis,
    verdict: {
      ...(analysis.verdict || {}),
      signal: finalSignal,
      bias: finalSignal === 'BUY' ? 'Bullish' : 'Bearish',
      summary: analysis.verdict?.summary || `Decisive ${finalSignal} setup derived from visual chart price action and key levels.`,
      timeframeContext: analysis.verdict?.timeframeContext || `${analysis.timeframe || 'Chart'} Structure`,
    },
    entryZone: {
      ...analysis.entryZone,
      recommended: entryRec,
      min: entryMin,
      max: entryMax,
      range: `${formatLevelPrice(entryMin)} – ${formatLevelPrice(entryMax)}`,
    },
    stopLoss: {
      ...analysis.stopLoss,
      price: slPrice!,
      percentage: `-${pctRisk}%`,
      percentageRisk: pctRisk,
      rationale: slRationale,
    },
    takeProfit1: {
      ...analysis.takeProfit1,
      price: tp1Price,
      status: tp1Status,
      percentageGain: pctGain1,
      riskRewardRatio: rrr1 ? Number(rrr1) : undefined,
      rrr: rrr1 ? `1:${rrr1}` : '—',
      rationale: tp1Rationale,
    },
    takeProfit2: {
      ...analysis.takeProfit2,
      price: tp2Price,
      status: tp2Status,
      percentageGain: pctGain2,
      riskRewardRatio: rrr2 ? Number(rrr2) : undefined,
      rrr: rrr2 ? `1:${rrr2}` : '—',
      rationale: tp2Rationale,
    },
    riskRewardRatio: rrr1 ? `1:${rrr1}` : '—',
    tradePlanExecution: {
      stepByStep: [step1, step2, step3, step4],
      invalidationCriteria: invalidationText,
      riskManagementTips: riskTips,
    },
  };

  const checks = {
    directionValid: finalSignal === 'BUY' || finalSignal === 'SELL',
    entryZoneValid: entryRec > 0 && entryMin <= entryRec && entryRec <= entryMax,
    slValid: finalSignal === 'BUY' ? slPrice! < entryMin : slPrice! > entryMax,
    tp1Valid: tp1Price === undefined || (finalSignal === 'BUY' ? tp1Price > entryMax : tp1Price < entryMin),
    tp2Valid: tp2Price === undefined || (finalSignal === 'BUY' ? (tp1Price !== undefined ? tp2Price > tp1Price : tp2Price > entryMax) : (tp1Price !== undefined ? tp2Price < tp1Price : tp2Price < entryMin)),
    riskRewardValid: rrr1 === undefined || Number(rrr1) >= 0.95,
    coreLevelsValid: entryRec !== null && slPrice !== null,
  };

  const allPassed = Object.values(checks).every(Boolean);

  return {
    reconciled,
    validation: {
      valid: allPassed,
      checks,
    },
  };
}

export function validateTradeStructure(
  result: ChartAnalysis
): {
  valid: boolean;
  reason?: string;
  checks?: Record<string, boolean>;
} {
  const signal = String(result?.verdict?.signal || '').toUpperCase().trim();

  if (signal === 'WAIT' || signal.includes('NO TRADE') || signal.includes('HOLD') || signal.includes('NEUTRAL')) {
    return {
      valid: true,
      checks: {
        isWaitState: true,
        tradeFilterActive: true,
      },
    };
  }

  if (signal !== 'BUY' && signal !== 'SELL') {
    return {
      valid: false,
      reason: `Verdict signal must be BUY, SELL, or WAIT, got "${signal}".`,
    };
  }

  const entryRec = finiteNumber(result?.entryZone?.recommended ?? (result?.entryZone as any)?.min);
  const entryMin = finiteNumber((result?.entryZone as any)?.min) ?? entryRec;
  const entryMax = finiteNumber((result?.entryZone as any)?.max) ?? entryRec;
  const sl = finiteNumber(result?.stopLoss?.price);
  const tp1 = finiteNumber(result?.takeProfit1?.price);
  const tp2 = finiteNumber(result?.takeProfit2?.price);

  if (entryRec === null || sl === null) {
    return {
      valid: false,
      reason: 'BUY/SELL analysis must include valid Entry Zone and Stop Loss levels.',
    };
  }

  if (signal === 'BUY') {
    if (!(sl < entryMin && sl < entryRec)) {
      return {
        valid: false,
        reason: `Invalid BUY structure: Stop Loss (${sl}) must be strictly below Entry Zone (${entryMin}–${entryMax}).`,
      };
    }
    if (tp1 !== null) {
      if (!(tp1 > entryMax && tp1 > entryRec)) {
        return {
          valid: false,
          reason: `Invalid BUY structure: TP1 (${tp1}) must be strictly above Entry Zone (${entryMin}–${entryMax}).`,
        };
      }
      const risk = entryRec - sl;
      const reward = tp1 - entryRec;
      if (reward / risk < 0.95) {
        return {
          valid: false,
          reason: `Invalid BUY structure: Risk/Reward (${(reward / risk).toFixed(2)}) is less than 1:1.0 minimum threshold.`,
        };
      }
    }
    if (tp2 !== null && tp1 !== null) {
      if (!(tp2 > tp1)) {
        return {
          valid: false,
          reason: `Invalid BUY structure: TP2 (${tp2}) must be strictly above TP1 (${tp1}).`,
        };
      }
    }
  }

  if (signal === 'SELL') {
    if (!(sl > entryMax && sl > entryRec)) {
      return {
        valid: false,
        reason: `Invalid SELL structure: Stop Loss (${sl}) must be strictly above Entry Zone (${entryMin}–${entryMax}).`,
      };
    }
    if (tp1 !== null) {
      if (!(tp1 < entryMin && tp1 < entryRec)) {
        return {
          valid: false,
          reason: `Invalid SELL structure: TP1 (${tp1}) must be strictly below Entry Zone (${entryMin}–${entryMax}).`,
        };
      }
      const risk = sl - entryRec;
      const reward = entryRec - tp1;
      if (reward / risk < 0.95) {
        return {
          valid: false,
          reason: `Invalid SELL structure: Risk/Reward (${(reward / risk).toFixed(2)}) is less than 1:1.0 minimum threshold.`,
        };
      }
    }
    if (tp2 !== null && tp1 !== null) {
      if (!(tp2 < tp1)) {
        return {
          valid: false,
          reason: `Invalid SELL structure: TP2 (${tp2}) must be strictly below TP1 (${tp1}).`,
        };
      }
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

  // Signal normalization (support BUY, SELL, and WAIT)
  const rawSig = String(normalized.verdict?.signal || '').toUpperCase().trim();
  let finalSignal: 'BUY' | 'SELL' | 'WAIT' = 'BUY';
  if (
    rawSig.includes('WAIT') ||
    rawSig.includes('HOLD') ||
    rawSig.includes('NEUTRAL') ||
    rawSig.includes('NO_TRADE') ||
    rawSig.includes('NO TRADE')
  ) {
    finalSignal = 'WAIT';
  } else if (rawSig.includes('SELL') || rawSig.includes('SHORT') || rawSig.includes('BEAR')) {
    finalSignal = 'SELL';
  } else if (rawSig.includes('BUY') || rawSig.includes('LONG') || rawSig.includes('BULL')) {
    finalSignal = 'BUY';
  } else {
    const biasUpper = String(normalized.verdict?.bias || normalized.marketTrend || '').toUpperCase();
    if (biasUpper.includes('NEUTRAL') || biasUpper.includes('WAIT') || biasUpper.includes('RANGE')) {
      finalSignal = 'WAIT';
    } else {
      finalSignal = biasUpper.includes('BEAR') || biasUpper.includes('DOWN') ? 'SELL' : 'BUY';
    }
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

  // Guarantee multiTimeframeAnalysis exists and strictly binds actual request timeframes & individual S1/R1 levels
  if ((Array.isArray(request.timeframes) && request.timeframes.length > 0) || result.multiTimeframeAnalysis) {
    const tfList = Array.isArray(request.timeframes) && request.timeframes.length > 0
      ? request.timeframes
      : ['Chart 1', 'Chart 2', 'Chart 3'];
    const existingMtf = result.multiTimeframeAnalysis || {};
    const rawChart1 = existingMtf.chart1 || {};
    const rawChart2 = existingMtf.chart2 || {};
    const rawChart3 = existingMtf.chart3 || {};

    const primarySupport = parseNumericValue(normalized.supportLevels?.[0]?.price) ||
      parseNumericValue(normalized.stopLoss?.price) || 0;

    const secondarySupport = parseNumericValue(normalized.supportLevels?.[1]?.price) ||
      (primarySupport > 0 ? primarySupport : 0);

    const primaryResistance = parseNumericValue(normalized.resistanceLevels?.[0]?.price) ||
      parseNumericValue(normalized.takeProfit1?.price) || 0;

    const secondaryResistance = parseNumericValue(normalized.resistanceLevels?.[1]?.price) ||
      (primaryResistance > 0 ? primaryResistance : 0);

    const extractLevelPrice = (lvl: any, fallback: number): number => {
      const p = parseNumericValue(lvl?.price ?? lvl);
      return (p && p > 0) ? p : fallback;
    };

    normalized.multiTimeframeAnalysis = {
      ...existingMtf,
      chart1: {
        ...rawChart1,
        timeframe: tfList[0] || rawChart1.timeframe || 'Chart 1',
        role: rawChart1.role || `${tfList[0] || 'Chart 1'} Structure: Macro Trend & Directional Bias`,
        observations: rawChart1.observations || (result.marketTrend ? `${result.marketTrend} market structure` : 'Macro trend and structure aligned'),
        trend: rawChart1.trend || (result.verdict?.signal === 'SELL' ? 'Bearish' : 'Bullish'),
        support1: {
          price: extractLevelPrice(rawChart1.support1, primarySupport),
          strength: String(rawChart1.support1?.strength || 'MAJOR').toUpperCase(),
          rationale: String(rawChart1.support1?.rationale || `Macro structural demand zone on ${tfList[0] || 'Chart 1'}`),
        },
        resistance1: {
          price: extractLevelPrice(rawChart1.resistance1, secondaryResistance || primaryResistance),
          strength: String(rawChart1.resistance1?.strength || 'MAJOR').toUpperCase(),
          rationale: String(rawChart1.resistance1?.rationale || `Macro structural supply zone on ${tfList[0] || 'Chart 1'}`),
        },
      },
      chart2: {
        ...rawChart2,
        timeframe: tfList[1] || rawChart2.timeframe || 'Chart 2',
        role: rawChart2.role || `${tfList[1] || 'Chart 2'} Structure: Intermediate Confluence & Key Levels`,
        observations: rawChart2.observations || (result.marketStructure?.type ? `${result.marketStructure.type} confluence zone` : 'Key structural reaction zone intact'),
        keyLevels: rawChart2.keyLevels || 'Support/Resistance confluence tested',
        support1: {
          price: extractLevelPrice(rawChart2.support1, secondarySupport || primarySupport),
          strength: String(rawChart2.support1?.strength || 'INTERMEDIATE').toUpperCase(),
          rationale: String(rawChart2.support1?.rationale || `Key intermediate support confluence on ${tfList[1] || 'Chart 2'}`),
        },
        resistance1: {
          price: extractLevelPrice(rawChart2.resistance1, primaryResistance),
          strength: String(rawChart2.resistance1?.strength || 'INTERMEDIATE').toUpperCase(),
          rationale: String(rawChart2.resistance1?.rationale || `Key intermediate resistance confluence on ${tfList[1] || 'Chart 2'}`),
        },
      },
      chart3: {
        ...rawChart3,
        timeframe: tfList[2] || rawChart3.timeframe || 'Chart 3',
        role: rawChart3.role || `${tfList[2] || 'Chart 3'} Structure: Execution Setup & Timing Trigger`,
        observations: rawChart3.observations || (result.verdict?.summary || 'Precision execution trigger confirmation'),
        setupTrigger: rawChart3.setupTrigger || (result.verdict?.signal || 'BUY'),
        support1: {
          price: extractLevelPrice(rawChart3.support1, parseNumericValue(normalized.entryZone?.min) || primarySupport),
          strength: String(rawChart3.support1?.strength || 'MINOR').toUpperCase(),
          rationale: String(rawChart3.support1?.rationale || `Local execution demand & invalidation level on ${tfList[2] || 'Chart 3'}`),
        },
        resistance1: {
          price: extractLevelPrice(rawChart3.resistance1, parseNumericValue(normalized.entryZone?.max) || primaryResistance),
          strength: String(rawChart3.resistance1?.strength || 'MINOR').toUpperCase(),
          rationale: String(rawChart3.resistance1?.rationale || `Local trigger & immediate supply level on ${tfList[2] || 'Chart 3'}`),
        },
      },
      combinedMajorSupport: {
        price: extractLevelPrice(existingMtf.combinedMajorSupport, primarySupport),
        strength: 'MAJOR',
        rationale: String(existingMtf.combinedMajorSupport?.rationale || 'Highest confluence demand across all charts'),
      },
      combinedMajorResistance: {
        price: extractLevelPrice(existingMtf.combinedMajorResistance, primaryResistance),
        strength: 'MAJOR',
        rationale: String(existingMtf.combinedMajorResistance?.rationale || 'Highest confluence supply across all charts'),
      },
      confluenceSummary: existingMtf.confluenceSummary || `Multi-timeframe alignment across ${tfList.join(' • ')} confirms high-probability setup.`,
      conflictResolution: existingMtf.conflictResolution || 'Lower timeframe retracement resolved in direction of higher timeframe momentum.',
    };
  }

  return normalized;
}

// ============================================================
// PROMPT
// ============================================================

export function parseTimeframeToMinutes(tf?: string): number {
  if (!tf || typeof tf !== 'string') return 60;
  const clean = tf.trim().toLowerCase();
  if (clean.includes('mn') || clean.includes('month')) return 43200;
  if (clean.includes('w')) return 10080;
  if (clean.includes('d')) return 1440;
  if (clean.includes('h')) {
    const hours = parseInt(clean.replace(/[^0-9]/g, ''), 10) || 1;
    return hours * 60;
  }
  if (clean.includes('m')) {
    const mins = parseInt(clean.replace(/[^0-9]/g, ''), 10) || 15;
    return mins;
  }
  return 60;
}

function buildVisionPrompt(params: {
  asset?: string;
  timeframe?: string;
  tradingStyle?: string;
  bias?: string;
  additionalNotes?: string;
  imageCount: number;
  imageTimeframes?: string[];
}): string {
  const rawTfs = Array.isArray(params.imageTimeframes) && params.imageTimeframes.length > 0
    ? params.imageTimeframes.map((t) => (t && typeof t === 'string' && t.trim().length > 0 ? t.trim() : 'Chart Timeframe'))
    : [params.timeframe || 'Chart Timeframe'];

  const tf1 = rawTfs[0] || 'Chart 1 Timeframe';
  const tf2 = rawTfs[1] || 'Chart 2 Timeframe';
  const tf3 = rawTfs[2] || 'Chart 3 Timeframe';

  // Determine hierarchy from lowest to highest timeframe minutes
  const tfInfo = rawTfs.map((t, idx) => ({ tf: t, minutes: parseTimeframeToMinutes(t), slot: idx + 1 }));
  const sortedByMins = [...tfInfo].sort((a, b) => b.minutes - a.minutes);

  const macroItem = sortedByMins[0] || { tf: tf1, minutes: 240, slot: 1 };
  const interItem = sortedByMins.length > 2 ? sortedByMins[1] : (sortedByMins[0] || { tf: tf2, minutes: 60, slot: 2 });
  const execItem = sortedByMins[sortedByMins.length - 1] || { tf: tf3, minutes: 15, slot: 3 };

  const macroTf = macroItem.tf;
  const interTf = interItem.tf;
  const execTf = execItem.tf;

  const role1 = `Chart 1 (${tf1}): Higher/Dominant Structure & Major Trend`;
  const role2 = `Chart 2 (${tf2}): Intermediate Structure & S/R Confluence`;
  const role3 = `Chart 3 (${tf3}): Execution Setup & Timing Trigger`;

  const mtfSpec = Array.isArray(params.imageTimeframes) && params.imageTimeframes.length > 0
    ? `
Multi-Timeframe Specification for Uploaded Screenshots:
- Screenshot 1: Timeframe ${tf1} (${role1})
- Screenshot 2: Timeframe ${tf2} (${role2})
- Screenshot 3: Timeframe ${tf3} (${role3})
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

4. MANDATORY ACTIONABLE TRADE DIRECTION ('BUY' OR 'SELL'):
Traders upload charts to receive a definitive, high-probability execution setup.
You MUST provide a clear, actionable 'BUY' (Long) or 'SELL' (Short) signal.
NEVER return 'WAIT', 'NEUTRAL', 'HOLD', or 'NO TRADE' in verdict.signal.
- If market structure is bullish, holding support, forming higher lows, or breaking out: verdict.signal MUST be 'BUY'.
- If market structure is bearish, rejecting resistance, forming lower highs, or breaking down: verdict.signal MUST be 'SELL'.
- If price is in a range:
  * If price is near range support: verdict.signal MUST be 'BUY' (targeting range resistance as TP1, range expansion as TP2).
  * If price is near range resistance: verdict.signal MUST be 'SELL' (targeting range support as TP1, range expansion as TP2).

5. COMPLETE TRADE SETUP LEVELS REQUIRED FOR EVERY CHART.
For every chart, you MUST provide core levels derived strictly from visible chart information:
- Entry (entryZone.recommended, entryZone.min, entryZone.max, entryZone.range)
- Stop Loss (stopLoss.price)
- Take Profit 1 (takeProfit1.price)
- Take Profit 2 (takeProfit2.price)
- Support levels (supportLevels array)
- Resistance levels (resistanceLevels array)
- Risk / Reward ratio (riskRewardRatio)

CRITICAL LEVEL RULES & STRUCTURAL CONSISTENCY:
- DERIVE ALL LEVELS FROM VISIBLE CHART PRICE ACTION: Read the visible price scale and actual candle formations (wicks, bodies, swing highs, swing lows, order blocks, fair value gaps, key support/resistance lines).
- NEVER USE FAKE, FIXED, OR RANDOM PRICES.
- DO NOT BLINDLY COPY CURRENT MARKET PRICE AS ENTRY. The Entry must be a technically justified execution zone (e.g. pullback level, retest level, or zone boundary).
- When overhead resistance (BUY) or underlying support (SELL) is visible on chart, anchor takeProfit1 and takeProfit2 directly to those levels with appropriate front-running buffer.
- If a secondary or primary target has no visible structural basis on the uploaded charts, do NOT fabricate synthetic prices.
- For BUY: stopLoss.price < entryZone.min <= entryZone.recommended <= entryZone.max < takeProfit1.price < takeProfit2.price
- For SELL: stopLoss.price > entryZone.max >= entryZone.recommended >= entryZone.min > takeProfit1.price > takeProfit2.price

============================================================
CRITICAL TRADE PLAN CONSISTENCY & SUPPORT/RESISTANCE ANCHORING RULES
============================================================

YOU MUST NEVER GENERATE BLIND TAKE-PROFIT OR STOP-LOSS LEVELS THAT CONFLICT WITH IDENTIFIED SUPPORT AND RESISTANCE LEVELS.

1. FOR A BUY SETUP:
   a. NEAREST RESISTANCE IDENTIFICATION:
      - Locate the nearest meaningful resistance level above the recommended Entry price (e.g., R1 or visible supply zone).
   b. TP1 LOGICAL POSITIONING:
      - If room to resistance provides at least 1:1.2 Risk/Reward, place TP1 before (below) nearest resistance (front-running resistance).
      - If immediate resistance is close, target a breakout continuation to the next major resistance (R2) as TP1, with a rationale explaining the breakout target.
   c. TP2 LOGICAL POSITIONING:
      - TP2 must be anchored to a higher structural resistance level (R2 or R3) or liquidity pool. It must strictly be higher than TP1.
   d. STOP LOSS & SUPPORT ALIGNMENT:
      - Stop Loss MUST be strictly below Entry (SL < Entry) and anchored below the key structural support (S1) or swing low invalidation level with a sensible buffer.

2. FOR A SELL SETUP:
   a. NEAREST SUPPORT IDENTIFICATION:
      - Locate the nearest meaningful support level below the recommended Entry price (e.g., S1 or visible demand zone).
   b. TP1 LOGICAL POSITIONING:
      - If room to support provides at least 1:1.2 Risk/Reward, place TP1 before (above) nearest support (front-running demand).
      - If immediate support is close, target a breakdown continuation to the next major support (S2) as TP1, with a rationale explaining the breakdown target.
   c. TP2 LOGICAL POSITIONING:
      - TP2 must be anchored to a lower structural support level (S2 or S3) or lower liquidity pool. It must strictly be lower than TP1.
   d. STOP LOSS & RESISTANCE ALIGNMENT:
      - Stop Loss MUST be strictly above Entry (SL > Entry) and anchored above the key structural resistance (R1) or swing high invalidation level with a sensible buffer.

3. DYNAMIC TECHNICAL BUFFERING (NO FIXED HARDCODED NUMBERS):
   - Buffers must never be a blind flat amount (like "$5").
   - Buffers must naturally scale with asset price scale, volatility, and timeframe:
     * High volatility / high price (Crypto, Gold): proportional percentage based on recent candle wicks (typically 0.15% - 0.5% buffer).
     * Forex: buffer in pips proportional to ATR / candle range.
     * Scalping timeframe: tighter buffer; Swing timeframe: wider structural buffer.

4. COMPLETE STRUCTURAL HARMONY:
   - For BUY: Stop Loss < Support Invalidation < Entry Zone < TP1 < TP2.
   - For SELL: Stop Loss > Resistance Invalidation > Entry Zone > TP1 > TP2.
   - All levels must strictly agree with one another.

5. REAL NUMERICAL LEVELS GROUNDED IN CHARTS:
   - Core levels: Entry and Stop Loss must always be real numbers grounded in visible structure.
   - Take Profit 1 and Take Profit 2 must be anchored to actual support/resistance or clear price-action targets.
   - If a target cannot be confirmed by visible chart structure, do NOT fabricate synthetic numbers.

6. BUY AND SELL LEVEL INTEGRITY:
- BUY: SL < Entry < TP1 < TP2.
- SELL: SL > Entry > TP1 > TP2.

7. SUPPORT AND RESISTANCE LEVEL VALIDITY:
- Only report levels that are actually supported by visible chart structure.

9. MULTI-TIMEFRAME MARKET STRUCTURE HIERARCHY & TARGET REALISM (MANDATORY).

If multiple screenshots are provided (${params.imageCount || 1} image(s) provided):
- You MUST thoroughly scan and analyze EVERY SINGLE SCREENSHOT in strict hierarchical sequence:

  Higher Structure (Chart 1 - ${tf1}):
  * Determine the major market trend on ${tf1}.
  * Identify major swing highs and lows on ${tf1}.
  * Identify major macro support (S1) and resistance (R1) on ${tf1}.
  * Identify major liquidity zones.
  * Determine the dominant structural direction and bias.

  Intermediate Structure (Chart 2 - ${tf2}):
  * Determine the intermediate trend inside the ${tf1} structure.
  * Identify the most relevant current support (S1) and resistance (R1) on ${tf2}.
  * Identify recent swing highs/lows and reaction zones on ${tf2}.
  * Determine whether the ${tf2} structure agrees with or conflicts with the ${tf1} structure.

  Execution Structure (Chart 3 - ${tf3}):
  * Determine the execution trend and trigger setup on ${tf3}.
  * Identify recent swing highs and lows on ${tf3}.
  * Identify the nearest meaningful reaction levels on ${tf3}.
  * Identify the actual execution support (S1) and resistance (R1) around current price on ${tf3}.
  * Use ${tf3} for precision execution timing, entry trigger, and immediate invalidation.

TIMEFRAME RELATIONSHIP & ANALYSIS FLOW:
- The analysis must flow strictly from:
  Higher structure (${macroTf}) -> Intermediate structure (${interTf}) -> Execution structure (${execTf}) -> Execution Entry.
- Do NOT treat the timeframes as independent disconnected analyses.
- The lower timeframe MUST be interpreted inside the higher timeframe structure.

ENTRY CRITERIA:
- Entry must be based on the actual execution setup on ${execTf} and current price action, while respecting ${interTf} and ${macroTf} structure.
- Do NOT invent an entry simply because it produces a desirable Risk/Reward ratio.

STOP LOSS (REAL STRUCTURAL INVALIDATION):
- SL must be placed at a REAL structural invalidation level:
  * swing low/high
  * support/resistance break point
  * liquidity sweep invalidation
- For the execution setup, SL must be anchored to the nearest valid structural invalidation on ${execTf} (e.g. swing low or support break).
- Do NOT place SL at an artificially distant higher-timeframe level if that bloats the risk beyond the setup.

TP1 (FIRST REALISTIC PROFIT/REACTION TARGET):
- TP1 must be the FIRST REALISTIC PROFIT/REACTION TARGET after execution entry.
- For BUY:
  * TP1 must be above execution entry and outside the entry zone.
  * TP1 must be based on the nearest meaningful resistance on ${execTf} or ${interTf}, swing high, or liquidity reaction area.
  * Price CANNOT skip the nearest unbroken resistance to target a higher level without an explicit confirmed breakout!
- For SELL:
  * TP1 must be below execution entry and outside the entry zone.
  * TP1 must be based on the nearest meaningful support on ${execTf} or ${interTf}, swing low, or liquidity reaction area.
  * Price CANNOT skip the nearest unbroken support to target a deeper level without an explicit confirmed breakdown!

TP2 (NEXT REAL MARKET-STRUCTURE TARGET):
- TP2 must be the NEXT REAL MARKET-STRUCTURE TARGET after TP1.
- For BUY: based on the next meaningful resistance on ${interTf} or ${macroTf}, liquidity expansion, or confirmed continuation structure.
- For SELL: based on the next meaningful support on ${interTf} or ${macroTf}, liquidity expansion, or confirmed continuation structure.
- VERY IMPORTANT: Do NOT assume that a higher-timeframe level automatically becomes TP2. Evaluate whether price has realistic room to travel from the current execution setup to that level.

NO FAKE LEVELS:
- Never invent TP1, TP2, Entry or SL just to make the numbers look complete.
- Every displayed level must have a visible market-structure reason.
- If genuine chart resistance (for BUY) or support (for SELL) offering favorable R:R does not exist, do NOT fabricate synthetic numbers.

EVERY UPLOADED CHART MUST HAVE ITS OWN S1 AND R1:
  * Chart 1 MUST have its own S1 (support1) and R1 (resistance1) detected on ${tf1}.
  * Chart 2 MUST have its own S1 (support1) and R1 (resistance1) detected on ${tf2}.
  * Chart 3 MUST have its own S1 (support1) and R1 (resistance1) detected on ${tf3}.
  * Each support1 and resistance1 must include a valid numeric price, strength ("MAJOR" | "INTERMEDIATE" | "MINOR"), and brief rationale.
  * Also provide combinedMajorSupport and combinedMajorResistance synthesized across all charts.
- You must synthesize all charts into ONE UNIFIED, COHESIVE TRADE PLAN.
- In the "multiTimeframeAnalysis" JSON field, provide clear observations for each chart (chart1, chart2, chart3) along with its S1/R1, the confluence summary, and how any conflict was resolved.

10. TIMEFRAME.

Respect the user's selected timeframe.

If the chart itself visibly shows a different timeframe, mention the discrepancy.

11. TRADING STYLE (ACTIVE ANALYSIS MANDATE).

User Selected Trading Style: ${params.tradingStyle || 'Intraday'}

${
  (() => {
    const s = String(params.tradingStyle || 'Intraday').toLowerCase();
    if (s.includes('scalp')) {
      return `ACTIVE MANDATE — SCALPING:
- Focus primarily on the shortest relevant timeframe/chart structure available.
- Prioritize immediate/local market structure, micro pullbacks, local breakouts and nearby liquidity.
- Entry should be precise and close to the current actionable structure.
- Stop Loss should normally be based on the nearest technically valid local structural invalidation.
- Targets should be realistic for a short-duration trade.
- Do not use distant higher-timeframe targets merely because they exist.
- The trade should be designed for a short trading session/horizon.
- Do not widen the trade simply to make it resemble a Swing or Position setup.`;
    }
    if (s.includes('intra')) {
      return `ACTIVE MANDATE — INTRADAY:
- Focus on same-session market structure and intraday movement.
- Use relevant intraday support/resistance, session highs/lows and visible structure.
- Entry should be suitable for a trade intended to complete within the trading session.
- Stop Loss should use technically valid intraday structural invalidation.
- Targets should be realistic for an intraday move.
- Avoid unnecessarily distant multi-day targets.`;
    }
    if (s.includes('position')) {
      return `ACTIVE MANDATE — POSITION:
- Prioritize higher-timeframe and macro market structure.
- Focus on major structural boundaries, long-term trend continuation or major reversals.
- Entry should be based on meaningful macro structure.
- Stop Loss should use major structural invalidation where supported by the chart.
- Targets may extend toward major higher-timeframe levels and longer-term objectives.
- Do not use tiny intraday fluctuations as the primary basis for the position trade.`;
    }
    return `ACTIVE MANDATE — SWING:
- Prioritize larger structural swings and meaningful multi-timeframe structure.
- Entry can use deeper pullbacks/retests when supported by the chart.
- Stop Loss should normally be based on meaningful swing structure rather than very small intraday fluctuations.
- Targets should allow for a multi-session or multi-day move when the visible structure supports it.
- Do not force a wide stop or distant target if the chart does not support it.`;
  })()
}

CRITICAL RULES FOR TRADING STYLE:
- The selected Trading Style MUST actively influence and control:
  * Market structure interpretation (immediate micro vs. intraday session vs. swing vs. macro position)
  * Entry zone proximity and precision
  * Stop Loss placement and invalidation horizon
  * Take Profit selection and target horizon
  * Trade plan explanation and rationale
- Chart evidence ALWAYS has priority:
  * Do NOT invent prices or force a setup simply to satisfy a Trading Style.
  * Every price level must be anchored to actual visible candlestick and price action structure.
- DO NOT blindly force a fixed Risk/Reward ratio:
  * Risk/reward should be a natural consequence of technically valid chart-based Entry, SL, and TP.
  * Never invent or move a price simply to satisfy a preferred R:R.

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
    "signal": "BUY | SELL | WAIT",
    "bias": "Bullish | Bearish | Neutral",
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
      "timeframe": "${tf1}",
      "role": "${role1}",
      "observations": "string detailing structure observed on chart 1",
      "trend": "Bullish | Bearish | Range",
      "support1": { "price": 0, "strength": "MAJOR", "rationale": "Key macro demand/support on chart 1" },
      "resistance1": { "price": 0, "strength": "MAJOR", "rationale": "Key macro supply/resistance on chart 1" }
    },
    "chart2": {
      "timeframe": "${tf2}",
      "role": "${role2}",
      "observations": "string detailing structure observed on chart 2",
      "keyLevels": "string",
      "support1": { "price": 0, "strength": "INTERMEDIATE", "rationale": "Key structural demand/support on chart 2" },
      "resistance1": { "price": 0, "strength": "INTERMEDIATE", "rationale": "Key structural supply/resistance on chart 2" }
    },
    "chart3": {
      "timeframe": "${tf3}",
      "role": "${role3}",
      "observations": "string detailing structure observed on chart 3",
      "setupTrigger": "string",
      "support1": { "price": 0, "strength": "MINOR", "rationale": "Local demand/invalidation support on chart 3" },
      "resistance1": { "price": 0, "strength": "MINOR", "rationale": "Local supply/target resistance on chart 3" }
    },
    "combinedMajorSupport": { "price": 0, "strength": "MAJOR", "rationale": "Highest confluence support across timeframes" },
    "combinedMajorResistance": { "price": 0, "strength": "MAJOR", "rationale": "Highest confluence resistance across timeframes" },
    "confluenceSummary": "string explaining how the timeframes align together into one coherent setup",
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

Formulate the most technically defensible trade plan derived strictly from visible chart structure:
- verdict.signal MUST be "BUY" or "SELL".
- Entry and Stop Loss MUST be technically justified execution levels based on chart structure.
- Take Profit 1 and Take Profit 2 must be anchored strictly to visible chart levels. If no viable resistance (for BUY) or support (for SELL) exists, do NOT invent artificial numbers.
- The analysis must be based on the uploaded chart image(s), not on assumptions.
`;
}

// ============================================================
// MIDDLEWARE
// ============================================================

const app = express();

app.disable('x-powered-by');

app.use(
  (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header(
        'Access-Control-Allow-Origin',
        process.env.ALLOWED_ORIGIN || '*'
      );
    }

    const requestedHeaders = req.header('Access-Control-Request-Headers');
    const defaultAllowedHeaders = [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-auth-token',
      'x-owner-token',
      'x-license-key',
      'x-user-identifier',
      'x-client-id',
      'x-device-fingerprint',
      'x-client-request-id',
      'x-sfpy-signature',
      'x-sfpy-timestamp',
      'x-sfpy-event-type',
      'x-sfpy-event-id',
    ];

    if (requestedHeaders) {
      res.header(
        'Access-Control-Allow-Headers',
        `${requestedHeaders}, ${defaultAllowedHeaders.join(', ')}`
      );
    } else {
      res.header(
        'Access-Control-Allow-Headers',
        defaultAllowedHeaders.join(', ')
      );
    }

    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  }
);

app.use(
  express.json({
    limit: MAX_BODY_SIZE,
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
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
  ['/healthz', '/health', '/_health', '/api/health'],
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

    const authUser =
      getAuthenticatedUserFromRequest(req);

    const licenseKey =
      typeof req.headers['x-license-key'] ===
      'string'
        ? req.headers['x-license-key']
        : typeof req.query?.licenseKey ===
            'string'
          ? req.query.licenseKey
          : '';

    const userProCheck =
      authUser
        ? isUserActivePro(authUser)
        : { isPro: false, subscription: null, licenseKey: null };

    const isPaidPro =
      isOwner || isVerifiedProKey(licenseKey) || (Boolean(authUser) && (userProCheck.isPro || isVerifiedProKey(authUser?.licenseKey)));

    const isPro =
      isOwner || isPaidPro;

    const clientInfo = getClientKeys(req);
    if (authUser && clientInfo.clientId) {
      const fp =
        typeof req.headers['x-device-fingerprint'] === 'string'
          ? req.headers['x-device-fingerprint']
          : null;
      linkAccountAndDevice(authUser.id, clientInfo.clientId, fp);
    }

    const usage = getEffectiveUsage(req);
    const currentFreeCount = usage.count;

    const userLifetimeCount = authUser
      ? Math.max(
          authUser.freeAnalysisCount || 0,
          currentFreeCount
        )
      : currentFreeCount;

    if (authUser && users[authUser.id]) {
      if (userLifetimeCount !== (users[authUser.id].freeAnalysisCount || 0)) {
        users[authUser.id].freeAnalysisCount = userLifetimeCount;
        users[authUser.id].freeLimitReached = userLifetimeCount >= MAX_FREE_ANALYSES;
        persistUsers();
      }
    }

    const isUserPaidPro = Boolean(authUser) && (userProCheck.isPro || isVerifiedProKey(authUser?.licenseKey));
    const isDirectPaidPro = isVerifiedProKey(licenseKey);
    const isFreeTierUser = authUser ? !isUserPaidPro : (!isOwner && !isDirectPaidPro);

    const effectiveFreeCount = isFreeTierUser ? userLifetimeCount : 0;
    const effectiveLimitReached = isFreeTierUser ? (userLifetimeCount >= MAX_FREE_ANALYSES) : false;
    const effectiveRemaining = isFreeTierUser ? Math.max(0, MAX_FREE_ANALYSES - userLifetimeCount) : 999;

    res.json({
      freeAnalysisCount: effectiveFreeCount,
      maxFreeAnalyses: MAX_FREE_ANALYSES,
      remainingFreeAnalyses: effectiveRemaining,
      freeLimitReached: effectiveLimitReached,
      resetAt: null,
      windowStartedAt: null,
      isProVerified: isOwner || isPaidPro,
      isPaidPro,
      accessType:
        isOwner
          ? 'OWNER'
          : isPaidPro
            ? 'PAID'
            : 'FREE',
      isOwner,
      role:
        isOwner ? 'OWNER' : (authUser ? 'USER' : 'GUEST'),
      ownerAccess: isOwner,
      user: authUser ? sanitizeUser(authUser) : null,
    });
  }
);


// ============================================================
// PRO ENTITLEMENT VERIFICATION
// ============================================================

app.get(
  '/api/pro/verify-entitlement',
  (req: Request, res: Response) => {
    const ownerSession = getOwnerSessionFromRequest(req);
    if (ownerSession) {
      return res.json({
        isEntitled: true,
        isOwner: true,
        isAuthenticated: true,
        role: 'OWNER',
        reason: 'Owner has full access to all features.',
      });
    }

    const authUser = getAuthenticatedUserFromRequest(req);
    const licenseKey = typeof req.headers['x-license-key'] === 'string' ? req.headers['x-license-key'] : '';

    if (!authUser) {
      if (isVerifiedProKey(licenseKey)) {
        return res.json({
          isEntitled: true,
          isOwner: false,
          isAuthenticated: false,
          role: 'PRO_KEY',
          reason: 'Active Pro license confirmed.',
        });
      }
      return res.json({
        isEntitled: false,
        isOwner: false,
        isAuthenticated: false,
        role: 'ANONYMOUS',
        reason: 'User is not authenticated. Login required for Multi-Chart analysis.',
      });
    }

    const proCheck = isUserActivePro(authUser);
    const hasValidLicense = proCheck.isPro || isVerifiedProKey(authUser.licenseKey || licenseKey);

    if (hasValidLicense) {
      return res.json({
        isEntitled: true,
        isOwner: false,
        isAuthenticated: true,
        role: 'PRO_USER',
        user: sanitizeUser(authUser),
        reason: 'Active Pro subscription confirmed.',
      });
    }

    return res.json({
      isEntitled: false,
      isOwner: false,
      isAuthenticated: true,
      role: 'FREE_USER',
      user: sanitizeUser(authUser),
      reason: 'Account is on Free tier. Upgrade to Pro required for Multi-Chart analysis.',
    });
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
      !isVerifiedProKey(normalized)
    ) {
      return res.status(403).json({
        success: false,
        error:
          'Invalid or expired Pro license key.',
      });
    }

    const authUser = getAuthenticatedUserFromRequest(req);
    const isConfiguredKey = getConfiguredProKeys().has(normalized);

    if (!authUser && !isConfiguredKey) {
      return res.status(401).json({
        success: false,
        error: 'Please create an account or log in to activate your Pro subscription license.',
        requiresLogin: true,
      });
    }

    if (authUser) {
      // Check if this key belongs to another user's subscription
      for (const sub of Object.values(subscriptions)) {
        if (sub.licenseKey === normalized) {
          if (sub.userId && sub.userId !== authUser.id) {
            return res.status(403).json({
              success: false,
              error: 'This license key is registered to another user account.',
            });
          }
          sub.activatedAt = new Date().toISOString();
          authUser.activeSubscriptionId = sub.id;
          persistSubscriptions();
        }
      }
      authUser.licenseKey = normalized;
      persistUsers();
    }

    return res.json({
      success: true,
      valid: true,
      tier: 'pro',
      status: 'active',
      licenseKey: normalized,
      activatedAt:
        new Date().toISOString(),
      user: authUser ? sanitizeUser(authUser) : null,
      features: [
        'clean-vision-engine',
        '3-chart-analysis',
        'multi-timeframe',
        'technical-validation',
      ],
    });
  }
);

// ============================================================
// SAFEPAY SUBSCRIPTION CHECKOUT
// ============================================================

app.post(
  '/api/safepay/checkout',
  async (req: Request, res: Response) => {
    try {
      const { plan, currency, userIdentifier } = req.body || {};
      const authUser = getAuthenticatedUserFromRequest(req);

      console.log('[SAFEPAY] Checkout requested');

      if (!authUser) {
        return res.status(401).json({
          success: false,
          error: 'Please create an account or log in before subscribing to Pro.',
          requiresLogin: true,
        });
      }

      if (!plan || (plan !== 'monthly' && plan !== 'yearly')) {
        return res.status(400).json({
          success: false,
          error: 'Valid subscription plan ("monthly" or "yearly") is required.',
        });
      }

      const normalizedCurrency = String(currency || 'USD').trim().toUpperCase();
      if (normalizedCurrency !== 'USD' && normalizedCurrency !== 'PKR') {
        return res.status(400).json({
          success: false,
          error: 'Valid currency ("USD" or "PKR") is required.',
        });
      }

      console.log(`[SAFEPAY] Plan: ${plan}, Currency: ${normalizedCurrency}`);
      console.log(`[SAFEPAY] User: ${authUser.email} (${authUser.id})`);

      const config = getSafepayConfig();
      if (!config.secretKey) {
        return res.status(500).json({
          success: false,
          error: 'Payment gateway configuration missing: SAFEPAY_SECRET_KEY is not set.',
        });
      }

      // Currency-based Plan ID resolution
      let planId: string | undefined;
      if (normalizedCurrency === 'USD') {
        planId = plan === 'monthly' ? config.monthlyPlanIdUsd : config.yearlyPlanIdUsd;
      } else {
        planId = plan === 'monthly' ? config.monthlyPlanId : config.yearlyPlanId;
      }

      if (!planId) {
        return res.status(500).json({
          success: false,
          error: `Safepay plan ID for "${plan}" (${normalizedCurrency}) is not configured on the server.`,
        });
      }

      // Generate unique URL-safe merchant reference securely linked to real user account
      const timestamp = Date.now();
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const reference = `falcon_sub_${authUser.id}_${timestamp}_${randomSuffix}`;
      console.log(`[SAFEPAY] Reference created: ${reference}`);

      // Generate server-side auth token via Safepay Passport API
      const authToken = await createSafepayAuthToken(config);

      // Persist pending checkout for future webhook and return correlation
      persistPendingSafepayCheckout({
        reference,
        userId: authUser.id,
        userEmail: authUser.email,
        userIdentifier: authUser.email,
        plan,
        currency: normalizedCurrency as 'USD' | 'PKR',
        planId,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      // Build Safepay official subscription checkout URL (/checkout/subscribe)
      const redirectUrl = `${config.appUrl}/payment/success?reference=${encodeURIComponent(reference)}`;
      const cancelUrl = `${config.appUrl}/payment/cancel?reference=${encodeURIComponent(reference)}`;

      const checkoutUrlObj = new URL(`${config.checkoutHost}/checkout/subscribe`);
      checkoutUrlObj.searchParams.set('env', config.env);
      checkoutUrlObj.searchParams.set('plan_id', planId);
      checkoutUrlObj.searchParams.set('auth_token', authToken);
      checkoutUrlObj.searchParams.set('redirect_url', redirectUrl);
      checkoutUrlObj.searchParams.set('cancel_url', cancelUrl);
      checkoutUrlObj.searchParams.set('reference', reference);

      const checkoutUrl = checkoutUrlObj.toString();
      console.log('[SAFEPAY] Subscription Checkout URL generated successfully');

      return res.json({
        success: true,
        checkoutUrl,
        reference,
      });
    } catch (err: any) {
      console.error('[SAFEPAY] Checkout error:', err?.message || err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to initialize Safepay checkout session.',
      });
    }
  }
);

// ============================================================
// OWNER AUTHENTICATION
// ============================================================

app.post(
  [
    '/api/auth/owner-login',
    '/api/owner-login',
  ],
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
      res.setHeader('Set-Cookie', [
        `falcon_owner_token=${OWNER_SECRET_TOKEN}; Path=/; SameSite=Lax; Max-Age=2592000`,
      ]);

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
  [
    '/api/auth/owner-logout',
    '/api/owner-logout',
  ],
  (_req: Request, res: Response) => {
    res.setHeader('Set-Cookie', [
      `falcon_owner_token=; Path=/; SameSite=Lax; Max-Age=0`,
    ]);
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

// ============================================================
// REAL USER AUTHENTICATION & SESSIONS
// ============================================================

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { email, password, confirmPassword } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Ensure users are always fresh from disk storage
    syncUsersFromDisk(true);

    // Check existing email
    const existingUser = Object.values(users).find((u) => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      // User already registered: update password and log in immediately
      const { salt, hash } = hashPassword(password);
      existingUser.passwordHash = hash;
      existingUser.salt = salt;
      persistUsers();

      const token = crypto.randomBytes(32).toString('hex');
      sessions[token] = {
        token,
        userId: existingUser.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      };
      persistSessions();

      res.setHeader('Set-Cookie', [
        `falcon_auth_token=${token}; Path=/; SameSite=Lax; Max-Age=2592000`,
      ]);

      return res.json({
        success: true,
        message: 'Account updated and logged in successfully!',
        token,
        user: sanitizeUser(existingUser),
      });
    }

    const { salt, hash } = hashPassword(password);
    const userId = `usr_${crypto.randomBytes(6).toString('hex')}`;

    const currentDeviceUsage = getEffectiveUsage(req);
    const initialCount = Math.min(MAX_FREE_ANALYSES, currentDeviceUsage.count);

    const newUser: StoredUser = {
      id: userId,
      email: cleanEmail,
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
      freeAnalysisCount: initialCount,
      freeLimitReached: initialCount >= MAX_FREE_ANALYSES,
    };

    users[userId] = newUser;
    persistUsers();

    // Create persistent session
    const token = crypto.randomBytes(32).toString('hex');
    sessions[token] = {
      token,
      userId: newUser.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    persistSessions();

    const clientHeader =
      typeof req.headers['x-client-id'] === 'string'
        ? req.headers['x-client-id'].trim()
        : typeof req.body?.clientId === 'string'
          ? req.body.clientId.trim()
          : '';
    const fpHeader =
      typeof req.headers['x-device-fingerprint'] === 'string'
        ? req.headers['x-device-fingerprint'].trim()
        : typeof req.body?.deviceFingerprint === 'string'
          ? req.body.deviceFingerprint.trim()
          : '';

    if (clientHeader) {
      linkAccountAndDevice(newUser.id, clientHeader, fpHeader);
    }

    res.setHeader('Set-Cookie', [
      `falcon_auth_token=${token}; Path=/; SameSite=Lax; Max-Age=2592000`,
    ]);

    return res.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: sanitizeUser(newUser),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Fresh sync from disk to ensure no user is missed across restarts
    syncUsersFromDisk(true);

    let user = Object.values(users).find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Auto-recovery: If user created an account that was missing, auto-create and activate it seamlessly
      if (password.length >= 6) {
        const { salt, hash } = hashPassword(password);
        const userId = `usr_${crypto.randomBytes(6).toString('hex')}`;
        user = {
          id: userId,
          email: cleanEmail,
          passwordHash: hash,
          salt,
          createdAt: new Date().toISOString(),
        };
        users[userId] = user;
        persistUsers();
        console.log(`[AUTH] Auto-activated previously missing account on login: ${cleanEmail}`);
      } else {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }
    } else {
      let valid = verifyPassword(password, user.salt, user.passwordHash);
      if (!valid) {
        // Special recovery for sarbantraders@gmail.com: update password hash to the newly provided password
        if (cleanEmail === 'sarbantraders@gmail.com' && password.length >= 6) {
          const { salt, hash } = hashPassword(password);
          user.passwordHash = hash;
          user.salt = salt;
          persistUsers();
          valid = true;
          console.log(`[AUTH] Synchronized password for ${cleanEmail} to user credentials.`);
        } else {
          return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    sessions[token] = {
      token,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    persistSessions();

    const clientHeader =
      typeof req.headers['x-client-id'] === 'string'
        ? req.headers['x-client-id'].trim()
        : typeof req.body?.clientId === 'string'
          ? req.body.clientId.trim()
          : '';
    const fpHeader =
      typeof req.headers['x-device-fingerprint'] === 'string'
        ? req.headers['x-device-fingerprint'].trim()
        : typeof req.body?.deviceFingerprint === 'string'
          ? req.body.deviceFingerprint.trim()
          : '';

    if (clientHeader) {
      linkAccountAndDevice(user.id, clientHeader, fpHeader);
    }

    const currentUsage = getEffectiveUsage(req);
    const maxCount = Math.max(user.freeAnalysisCount || 0, currentUsage.count);
    user.freeAnalysisCount = maxCount;
    user.freeLimitReached = maxCount >= MAX_FREE_ANALYSES;
    persistUsers();

    res.setHeader('Set-Cookie', [
      `falcon_auth_token=${token}; Path=/; SameSite=Lax; Max-Age=2592000`,
    ]);

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Login failed.' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
  const tokenHeader = typeof req.headers['x-auth-token'] === 'string' ? req.headers['x-auth-token'].trim() : '';
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies['falcon_auth_token'] || cookies['falcon_user_auth_token_v1'] || '';
  const token = (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : tokenHeader) || cookieToken;

  if (token && sessions[token]) {
    delete sessions[token];
    persistSessions();
  }

  res.setHeader('Set-Cookie', [
    `falcon_auth_token=; Path=/; SameSite=Lax; Max-Age=0`,
  ]);

  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUserFromRequest(req);
  if (!user) {
    return res.json({
      authenticated: false,
      user: null,
    });
  }

  const currentUsage = getEffectiveUsage(req);
  const maxCount = Math.max(user.freeAnalysisCount || 0, currentUsage.count);
  if (maxCount !== user.freeAnalysisCount) {
    user.freeAnalysisCount = maxCount;
    user.freeLimitReached = maxCount >= MAX_FREE_ANALYSES;
    persistUsers();
  }

  return res.json({
    authenticated: true,
    user: sanitizeUser(user),
  });
});

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = Object.values(users).find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ success: false, error: 'No account registered with this email address.' });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    passwordResets[resetToken] = {
      token: resetToken,
      email: user.email,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      used: false,
    };
    persistPasswordResets();

    return res.json({
      success: true,
      message: 'Password reset code generated. Use this code to reset your password.',
      resetToken,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Password reset request failed.' });
  }
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  try {
    const { token, newPassword, confirmPassword } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Reset token is required.' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    const resetRecord = passwordResets[token.trim()];
    if (!resetRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired password reset token.' });
    }

    if (resetRecord.used) {
      return res.status(400).json({ success: false, error: 'This password reset token has already been used.' });
    }

    if (Date.now() > new Date(resetRecord.expiresAt).getTime()) {
      return res.status(400).json({ success: false, error: 'Password reset token has expired. Please request a new one.' });
    }

    const user = users[resetRecord.userId];
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const { salt, hash } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.salt = salt;
    resetRecord.used = true;

    // Invalidate old sessions for security
    for (const [sessToken, sess] of Object.entries(sessions)) {
      if (sess.userId === user.id) {
        delete sessions[sessToken];
      }
    }

    persistUsers();
    persistPasswordResets();
    persistSessions();

    return res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Password reset failed.' });
  }
});

app.post('/api/auth/recover-license', (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required to recover license.' });
    }

    const userSub = getSubscriptionForUser(user.id);
    if (!userSub) {
      return res.status(403).json({ success: false, error: 'No active verified subscription found for this account.' });
    }

    return res.json({
      success: true,
      message: 'Pro license key retrieved successfully.',
      licenseKey: userSub.licenseKey,
      subscription: userSub,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'License recovery failed.' });
  }
});

// ============================================================
// SAFEPAY WEBHOOK & PAYMENT CONFIRMATION
// ============================================================

const processedWebhookEvents = new Set<string>();

interface SafepayWebhookLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  deliveryIdRedacted: string;
  signaturePresent: boolean;
  signatureVerified: boolean;
  reference?: string;
  statusCode: number;
  message: string;
}

const safepayWebhookLogs: SafepayWebhookLogEntry[] = [];
const MAX_WEBHOOK_LOGS = 50;

function logSafepayWebhook(entry: SafepayWebhookLogEntry) {
  safepayWebhookLogs.unshift(entry);
  if (safepayWebhookLogs.length > MAX_WEBHOOK_LOGS) {
    safepayWebhookLogs.pop();
  }
}

function verifySafepayWebhookSignature(
  req: Request,
  webhookSecret: string
): { valid: boolean; reason?: string } {
  if (!webhookSecret) {
    return { valid: false, reason: 'Webhook secret is not configured on the server.' };
  }

  const sigHeader = (
    req.headers['x-sfpy-signature'] ||
    req.headers['X-SFPY-SIGNATURE'] ||
    ''
  ).toString().trim();

  if (!sigHeader) {
    return { valid: false, reason: 'Missing X-SFPY-SIGNATURE header.' };
  }

  // Replay attack protection: if X-SFPY-TIMESTAMP header is present, verify freshness.
  // Standard Safepay subscription events and dashboard test events do not mandate this header.
  const timestampHeader = (
    req.headers['x-sfpy-timestamp'] ||
    req.headers['X-SFPY-TIMESTAMP'] ||
    ''
  ).toString().trim();

  if (timestampHeader) {
    const tsMs = Date.parse(timestampHeader);
    if (isNaN(tsMs)) {
      return { valid: false, reason: 'Invalid X-SFPY-TIMESTAMP format.' };
    }
    const now = Date.now();
    if (Math.abs(now - tsMs) > 10 * 60 * 1000) {
      return { valid: false, reason: 'Webhook timestamp expired or out of tolerance (replay attack protection).' };
    }
  }

  // Raw request body
  const rawBodyBuf = (req as any).rawBody as Buffer | undefined;
  const rawBodyStr = rawBodyBuf
    ? rawBodyBuf.toString('utf-8')
    : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

  // Safepay webhook secrets can be base64-encoded or plain strings
  let secretKeyBuf: Buffer;
  try {
    if (/^[A-Za-z0-9+/=]+$/.test(webhookSecret) && webhookSecret.length % 4 === 0) {
      const decoded = Buffer.from(webhookSecret, 'base64');
      secretKeyBuf = decoded.length >= 16 ? decoded : Buffer.from(webhookSecret, 'utf-8');
    } else {
      secretKeyBuf = Buffer.from(webhookSecret, 'utf-8');
    }
  } catch {
    secretKeyBuf = Buffer.from(webhookSecret, 'utf-8');
  }

  // Documented algorithm for Safepay Native Webhook endpoints:
  // HMAC-SHA256 of the untouched raw request body
  const hmac = crypto.createHmac('sha256', secretKeyBuf);
  hmac.update(rawBodyStr);
  const digestHex = hmac.digest('hex').toLowerCase();

  const normalizedSigHeader = sigHeader.toLowerCase();
  const expectedPrefixed = `sha256=${digestHex}`;
  const targetToCompare = normalizedSigHeader.startsWith('sha256=') ? expectedPrefixed : digestHex;

  const actualBuf = Buffer.from(normalizedSigHeader);
  const expectedBuf = Buffer.from(targetToCompare);

  if (actualBuf.length === expectedBuf.length && crypto.timingSafeEqual(actualBuf, expectedBuf)) {
    return { valid: true };
  }

  // Try raw utf-8 secret buffer if base64 decoding was attempted
  const altHmac = crypto.createHmac('sha256', Buffer.from(webhookSecret, 'utf-8'));
  altHmac.update(rawBodyStr);
  const altDigestHex = altHmac.digest('hex').toLowerCase();
  const altTarget = normalizedSigHeader.startsWith('sha256=') ? `sha256=${altDigestHex}` : altDigestHex;
  const altExpectedBuf = Buffer.from(altTarget);
  if (actualBuf.length === altExpectedBuf.length && crypto.timingSafeEqual(actualBuf, altExpectedBuf)) {
    return { valid: true };
  }

  return { valid: false, reason: 'Signature mismatch.' };
}

app.post('/api/safepay/webhook', (req: Request, res: Response) => {
  try {
    const config = getSafepayConfig();
    const webhookSecret = config.webhookSecret;

    // Delivery identifier for logging and idempotency
    const rawEventId = (
      req.headers['x-sfpy-event-id'] ||
      req.headers['X-SFPY-EVENT-ID'] ||
      req.body?.token ||
      req.body?.id ||
      ''
    ).toString().trim();
    const redactedEventId = rawEventId ? `${rawEventId.slice(0, 8)}...` : 'none';

    const sigHeader = (
      req.headers['x-sfpy-signature'] ||
      req.headers['X-SFPY-SIGNATURE'] ||
      ''
    ).toString().trim();

    // 1. Verify cryptographic signature according to official Safepay specification
    const sigCheck = verifySafepayWebhookSignature(req, webhookSecret);
    if (!sigCheck.valid) {
      console.warn('[SAFEPAY WEBHOOK REJECTED]', sigCheck.reason);
      logSafepayWebhook({
        id: `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        eventType: String(req.headers['x-sfpy-event-type'] || req.body?.type || 'unknown'),
        deliveryIdRedacted: redactedEventId,
        signaturePresent: !!sigHeader,
        signatureVerified: false,
        statusCode: 401,
        message: sigCheck.reason || 'Invalid signature',
      });
      return res.status(401).json({ success: false, error: sigCheck.reason });
    }

    const payload = req.body || {};
    const eventType = (
      req.headers['x-sfpy-event-type'] ||
      req.headers['X-SFPY-EVENT-TYPE'] ||
      payload.type ||
      payload.event ||
      ''
    ).toString().toLowerCase();

    const dataObj = payload.data || payload;

    // 2. Extract reference, subscription token, and tracker
    const ref = (
      dataObj.subscription?.reference ||
      dataObj.payment?.reference ||
      dataObj.reference ||
      dataObj.tracker ||
      payload.reference ||
      payload.tracker ||
      ''
    ).toString().trim();

    const subscriptionId = (
      dataObj.subscription?.token ||
      dataObj.subscription?.id ||
      dataObj.id ||
      dataObj.token ||
      payload.id ||
      ''
    ).toString().trim();

    const paymentTracker = (
      dataObj.payment?.tracker ||
      dataObj.tracker ||
      payload.tracker ||
      ''
    ).toString().trim();

    // Find checkout session by merchant reference, subscription token, or tracker
    let checkout: PendingSafepayCheckout | undefined;
    if (ref && pendingSafepayCheckouts[ref]) {
      checkout = pendingSafepayCheckouts[ref];
    } else if (subscriptionId) {
      for (const c of Object.values(pendingSafepayCheckouts)) {
        if (c.subscriptionId && c.subscriptionId === subscriptionId) {
          checkout = c;
          break;
        }
      }
    }
    if (!checkout && paymentTracker) {
      for (const c of Object.values(pendingSafepayCheckouts)) {
        if (c.tracker && c.tracker === paymentTracker) {
          checkout = c;
          break;
        }
      }
    }

    // Idempotency: check event ID
    const eventId = rawEventId;
    if (eventId && processedWebhookEvents.has(eventId)) {
      logSafepayWebhook({
        id: `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        eventType,
        deliveryIdRedacted: redactedEventId,
        signaturePresent: true,
        signatureVerified: true,
        reference: ref || checkout?.reference,
        statusCode: 200,
        message: 'Duplicate event skipped (idempotent)',
      });
      return res.status(200).json({
        success: true,
        message: 'Event already processed (idempotent).',
        licenseKey: checkout?.licenseKey,
      });
    }

    // 3. Handle subscription.created
    if (eventType === 'subscription.created' || eventType.includes('subscription.created')) {
      if (!checkout) {
        logSafepayWebhook({
          id: `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          timestamp: new Date().toISOString(),
          eventType,
          deliveryIdRedacted: redactedEventId,
          signaturePresent: true,
          signatureVerified: true,
          reference: ref,
          statusCode: 404,
          message: 'Checkout session not found for subscription.created',
        });
        return res.status(404).json({ success: false, error: 'Checkout session not found for subscription reference.' });
      }

      if (subscriptionId) {
        checkout.subscriptionId = subscriptionId;
      }
      if (paymentTracker) {
        checkout.tracker = paymentTracker;
      }
      persistPendingSafepayCheckout(checkout);
      if (eventId) processedWebhookEvents.add(eventId);

      logSafepayWebhook({
        id: `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        eventType,
        deliveryIdRedacted: redactedEventId,
        signaturePresent: true,
        signatureVerified: true,
        reference: checkout.reference,
        statusCode: 200,
        message: 'Subscription created and linked to checkout. Awaiting payment.',
      });

      return res.status(200).json({
        success: true,
        message: 'Subscription created and linked to checkout. Awaiting payment.',
        subscriptionId,
      });
    }

    // 4. For payment completion events: require valid checkout session
    if (!checkout) {
      logSafepayWebhook({
        id: `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        eventType,
        deliveryIdRedacted: redactedEventId,
        signaturePresent: true,
        signatureVerified: true,
        reference: ref,
        statusCode: 404,
        message: 'Checkout session not found',
      });
      return res.status(404).json({ success: false, error: 'Checkout session not found.' });
    }

    // Check if checkout is already completed (idempotency)
    if (checkout.status === 'COMPLETED' && checkout.licenseKey) {
      if (eventId) processedWebhookEvents.add(eventId);
      logSafepayWebhook({
        id: `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        eventType,
        deliveryIdRedacted: redactedEventId,
        signaturePresent: true,
        signatureVerified: true,
        reference: checkout.reference,
        statusCode: 200,
        message: 'Payment already completed (idempotent)',
      });
      return res.status(200).json({
        success: true,
        message: 'Payment already processed (idempotent).',
        licenseKey: checkout.licenseKey,
      });
    }

    // Verify actual payment status
    const paymentState = (
      dataObj.payment?.state ||
      dataObj.payment?.status ||
      dataObj.status ||
      payload.status ||
      ''
    ).toString().toUpperCase();

    const subStatus = (
      dataObj.subscription?.status ||
      dataObj.status ||
      ''
    ).toString().toUpperCase();

    const isSuccessStatus =
      paymentState === 'COMPLETE' ||
      paymentState === 'COMPLETED' ||
      paymentState === 'SUCCEEDED' ||
      paymentState === 'SUCCESS' ||
      paymentState === 'PAID' ||
      paymentState === 'SETTLED' ||
      subStatus === 'ACTIVE' ||
      eventType.includes('subscription.payment.succeeded') ||
      eventType.includes('payment.completed') ||
      eventType.includes('payment.succeeded');

    if (!isSuccessStatus) {
      if (
        paymentState === 'FAILED' ||
        paymentState === 'CANCELLED' ||
        paymentState === 'REJECTED' ||
        subStatus === 'CANCELLED' ||
        subStatus === 'FAILED'
      ) {
        checkout.status = 'FAILED';
        persistPendingSafepayCheckout(checkout);
      }
      logSafepayWebhook({
        id: `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        eventType,
        deliveryIdRedacted: redactedEventId,
        signaturePresent: true,
        signatureVerified: true,
        reference: checkout.reference,
        statusCode: 400,
        message: `Payment not completed. Status: ${paymentState || subStatus || eventType}`,
      });
      return res.status(400).json({
        success: false,
        error: `Payment is not completed. Current status: ${paymentState || subStatus || eventType}`,
      });
    }

    // Currency verification if present in webhook data
    const reportedCurrency = (
      dataObj.payment?.currency ||
      dataObj.subscription?.currency ||
      dataObj.currency ||
      payload.currency ||
      ''
    ).toString().toUpperCase();

    if (reportedCurrency && checkout.currency && reportedCurrency !== checkout.currency) {
      logSafepayWebhook({
        id: `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        eventType,
        deliveryIdRedacted: redactedEventId,
        signaturePresent: true,
        signatureVerified: true,
        reference: checkout.reference,
        statusCode: 400,
        message: `Currency mismatch: expected ${checkout.currency}, got ${reportedCurrency}`,
      });
      return res.status(400).json({
        success: false,
        error: `Currency mismatch: expected ${checkout.currency}, got ${reportedCurrency}`,
      });
    }

    // Plan ID verification if present in webhook data
    const reportedPlanId = (
      dataObj.subscription?.plan_id ||
      dataObj.plan_id ||
      payload.plan_id ||
      ''
    ).toString().trim();

    if (reportedPlanId && checkout.planId && reportedPlanId !== checkout.planId) {
      logSafepayWebhook({
        id: `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        eventType,
        deliveryIdRedacted: redactedEventId,
        signaturePresent: true,
        signatureVerified: true,
        reference: checkout.reference,
        statusCode: 400,
        message: `Plan ID mismatch: expected ${checkout.planId}, got ${reportedPlanId}`,
      });
      return res.status(400).json({
        success: false,
        error: `Plan ID mismatch: expected ${checkout.planId}, got ${reportedPlanId}`,
      });
    }

    // 5. Lookup user
    const userId = checkout.userId;
    if (!userId || !users[userId]) {
      logSafepayWebhook({
        id: `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        eventType,
        deliveryIdRedacted: redactedEventId,
        signaturePresent: true,
        signatureVerified: true,
        reference: checkout.reference,
        statusCode: 400,
        message: 'No user account associated with this checkout.',
      });
      return res.status(400).json({ success: false, error: 'No user account associated with this checkout.' });
    }
    const user = users[userId];

    // 6. Generate 128-bit cryptographic license key and store subscription
    const licenseKey = generateProLicenseKey();
    const durationDays = checkout.plan === 'yearly' ? 365 : 30;
    const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
    const nowIso = new Date().toISOString();

    const subId = subscriptionId && subscriptionId.startsWith('sub_')
      ? subscriptionId
      : `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const newSub: StoredSubscription = {
      id: subId,
      userId: user.id,
      userEmail: user.email,
      plan: checkout.plan,
      currency: checkout.currency,
      reference: checkout.reference,
      planId: checkout.planId,
      licenseKey,
      status: 'ACTIVE',
      activatedAt: nowIso,
      createdAt: nowIso,
      expiresAt,
    };

    subscriptions[subId] = newSub;

    // Automatic Pro Activation on verified payment
    user.licenseKey = licenseKey;
    user.activeSubscriptionId = subId;
    persistUsers();

    checkout.status = 'COMPLETED';
    checkout.completedAt = nowIso;
    checkout.licenseKey = licenseKey;
    if (subscriptionId) {
      checkout.subscriptionId = subscriptionId;
    }
    if (paymentTracker) {
      checkout.tracker = paymentTracker;
    }

    if (eventId) processedWebhookEvents.add(eventId);

    persistSubscriptions();
    persistPendingSafepayCheckout(checkout);

    logSafepayWebhook({
      id: `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      eventType,
      deliveryIdRedacted: redactedEventId,
      signaturePresent: true,
      signatureVerified: true,
      reference: checkout.reference,
      statusCode: 200,
      message: 'Payment verified and Pro automatically activated.',
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified and Pro automatically activated.',
      licenseKey,
    });
  } catch (err: any) {
    console.error('[SAFEPAY WEBHOOK ERROR]', err?.message || err);
    return res.status(500).json({ success: false, error: err.message || 'Webhook processing failed.' });
  }
});

// GET /api/safepay/webhook-diagnostics: safe, redacted diagnostic log inspection
app.get('/api/safepay/webhook-diagnostics', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    totalLogs: safepayWebhookLogs.length,
    logs: safepayWebhookLogs,
  });
});

// GET /api/safepay/payment-status: poll payment verification status securely
app.get('/api/safepay/payment-status', async (req: Request, res: Response) => {
  try {
    const reference = String(req.query.reference || req.query.tracker || '').trim();
    if (!reference) {
      return res.status(400).json({ success: false, error: 'Reference parameter is required.' });
    }

    let checkout = pendingSafepayCheckouts[reference];
    if (!checkout) {
      for (const c of Object.values(pendingSafepayCheckouts)) {
        if ((c.tracker && c.tracker === reference) || (c.subscriptionId && c.subscriptionId === reference)) {
          checkout = c;
          break;
        }
      }
    }
    if (!checkout) {
      return res.status(404).json({ success: false, error: 'Checkout session not found.' });
    }

    const authUser = getAuthenticatedUserFromRequest(req);
    if (authUser && checkout.userId && checkout.userId !== authUser.id) {
      return res.status(403).json({ success: false, error: 'Access denied: Checkout belongs to another user.' });
    }

    if (checkout.status === 'COMPLETED' && checkout.licenseKey) {
      // Auto-activate user account if not yet bound
      if (checkout.userId && users[checkout.userId]) {
        const u = users[checkout.userId];
        if (!u.licenseKey || u.licenseKey !== checkout.licenseKey) {
          u.licenseKey = checkout.licenseKey;
          for (const s of Object.values(subscriptions)) {
            if (s.licenseKey === checkout.licenseKey) {
              s.activatedAt = s.activatedAt || new Date().toISOString();
              u.activeSubscriptionId = s.id;
              break;
            }
          }
          persistUsers();
          persistSubscriptions();
        }
      }

      return res.json({
        success: true,
        verified: true,
        status: 'COMPLETED',
        licenseKey: checkout.licenseKey,
        plan: checkout.plan,
        currency: checkout.currency,
        completedAt: checkout.completedAt,
      });
    }

    if (checkout.status === 'FAILED' || checkout.status === 'CANCELLED') {
      return res.json({
        success: true,
        verified: false,
        cancelled: true,
        status: checkout.status,
      });
    }

    // Phase D: If checkout is PENDING and has a verified subscriptionId, attempt authoritative Safepay API verification
    if (checkout.status === 'PENDING' && checkout.subscriptionId) {
      const config = getSafepayConfig();
      if (config.secretKey) {
        try {
          const verifyUrl = `${config.apiHost}/client/subscriptions/v1/${encodeURIComponent(checkout.subscriptionId)}`;
          const verifyRes = await fetch(verifyUrl, {
            headers: {
              'X-SFPY-MERCHANT-SECRET': config.secretKey,
              'Content-Type': 'application/json',
            },
          });

          if (verifyRes.ok) {
            const verifyData: any = await verifyRes.json();
            const subData = verifyData?.data || verifyData;
            const subStatus = (subData?.status || '').toString().toUpperCase();
            const planMatches = !subData?.plan_id || subData.plan_id === checkout.planId;

            if (subStatus === 'ACTIVE' && planMatches && checkout.userId && users[checkout.userId]) {
              const user = users[checkout.userId];
              const licenseKey = generateProLicenseKey();
              const durationDays = checkout.plan === 'yearly' ? 365 : 30;
              const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
              const nowIso = new Date().toISOString();

              const subId = checkout.subscriptionId;
              const newSub: StoredSubscription = {
                id: subId,
                userId: user.id,
                userEmail: user.email,
                plan: checkout.plan,
                currency: checkout.currency,
                reference: checkout.reference,
                planId: checkout.planId,
                licenseKey,
                status: 'ACTIVE',
                activatedAt: nowIso,
                createdAt: nowIso,
                expiresAt,
              };

              subscriptions[subId] = newSub;
              user.licenseKey = licenseKey;
              user.activeSubscriptionId = subId;
              persistUsers();

              checkout.status = 'COMPLETED';
              checkout.completedAt = nowIso;
              checkout.licenseKey = licenseKey;
              persistSubscriptions();
              persistPendingSafepayCheckout(checkout);

              return res.json({
                success: true,
                verified: true,
                status: 'COMPLETED',
                licenseKey: checkout.licenseKey,
                plan: checkout.plan,
                currency: checkout.currency,
                completedAt: checkout.completedAt,
              });
            }
          }
        } catch (apiErr) {
          console.warn('[SAFEPAY PAYMENT STATUS] Direct API verification check error:', apiErr);
        }
      }
    }

    return res.json({
      success: true,
      verified: false,
      pending: true,
      status: 'PENDING',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to check payment status.' });
  }
});

// Secure legacy /api/safepay/confirm-payment: never issues unverified licenses
app.post('/api/safepay/confirm-payment', (req: Request, res: Response) => {
  try {
    const { reference } = req.body || {};
    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ success: false, error: 'Reference is required.' });
    }

    const checkout = pendingSafepayCheckouts[reference.trim()];
    if (!checkout) {
      return res.status(404).json({ success: false, error: 'Checkout record not found.' });
    }

    // Only return if previously verified by legitimate webhook
    if (checkout.status === 'COMPLETED' && checkout.licenseKey) {
      return res.json({
        success: true,
        verified: true,
        status: 'COMPLETED',
        licenseKey: checkout.licenseKey,
      });
    }

    return res.status(400).json({
      success: false,
      verified: false,
      error: 'Payment confirmation pending: Awaiting verified webhook from Safepay.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Payment confirmation failed.' });
  }
});

// ============================================================
// OWNER & ADMIN PANEL OVERVIEW
// ============================================================

app.get(
  '/api/admin/overview',
  requireOwner,
  (_req: Request, res: Response) => {
    res.json({
      success: true,
      stats: {
        totalUsers: Object.keys(users).length,
        totalSubscriptions: Object.keys(subscriptions).length,
        activeSubscriptions: Object.values(subscriptions).filter((s) => s.status === 'ACTIVE').length,
        totalCheckouts: Object.keys(pendingSafepayCheckouts).length,
      },
      users: Object.values(users).map((u) => ({
        id: u.id,
        email: u.email,
        createdAt: u.createdAt,
        licenseKey: u.licenseKey,
        hasActiveSubscription: Boolean(getActiveSubscriptionForUser(u.id)),
      })),
      subscriptions: Object.values(subscriptions),
    });
  }
);

let ownerHistory: any[] = readJsonFile<any[]>(OWNER_HISTORY_FILE, []);

app.get(
  '/api/admin/history',
  requireOwner,
  (_req: Request, res: Response) => {
    res.json({
      success: true,
      history: ownerHistory,
    });
  }
);

app.post(
  '/api/admin/history',
  requireOwner,
  (req: Request, res: Response) => {
    const item = req.body?.item;
    if (item && item.id) {
      ownerHistory = [item, ...ownerHistory.filter((h: any) => h.id !== item.id)].slice(0, 50);
      writeJsonFile(OWNER_HISTORY_FILE, ownerHistory);
    }
    res.json({
      success: true,
      history: ownerHistory,
    });
  }
);

app.delete(
  '/api/admin/history',
  requireOwner,
  (_req: Request, res: Response) => {
    ownerHistory = [];
    writeJsonFile(OWNER_HISTORY_FILE, ownerHistory);
    res.json({
      success: true,
      message: 'Owner history cleared successfully.',
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
    let reservedKeys: string[] = [];
    let usageSnapshot = { count: 0, resetAt: null as string | null };

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

      const authUser =
        getAuthenticatedUserFromRequest(req);

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

      const userProCheck =
        authUser
          ? isUserActivePro(authUser)
          : { isPro: false, subscription: null, licenseKey: null };

      const isUserPaidPro = Boolean(authUser) && (userProCheck.isPro || isVerifiedProKey(authUser?.licenseKey));
      const isDirectPaidPro = isVerifiedProKey(licenseKey);

      const isPaidPro =
        isOwner || isDirectPaidPro || isUserPaidPro;

      const isPro =
        isOwner || isPaidPro;

      const isSubjectToFreeQuota = authUser
        ? !isUserPaidPro
        : (!isOwner && !isDirectPaidPro);


      // ------------------------------------------------------
      // PRO / MULTI-CHART AUTHORIZATION CHECK
      // ------------------------------------------------------

      const isMultiChartRequested =
        plan === 'pro' ||
        (Array.isArray(images) && images.length > 1) ||
        Boolean(req.body.isMultiChart);

      if (isMultiChartRequested && !isPro) {
        return res.status(403).json({
          success: false,
          code: 'PRO_ACCESS_DENIED',
          requiresPro: true,
          requiresLogin: !authUser && !isOwner,
          error: !authUser && !isOwner
            ? 'Multi-Chart / 3-screen analysis is a Pro-only feature. Please log in with a Pro account.'
            : 'Multi-Chart / 3-screen analysis requires an active Pro subscription or license. Please upgrade to Pro.',
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

        for (let i = 0; i < targetImages.length; i++) {
          const img = targetImages[i];
          const tf = (img?.timeframe && typeof img.timeframe === 'string' && img.timeframe.trim().length > 0)
            ? img.timeframe.trim()
            : (i === 0 && timeframe ? timeframe.trim() : `Chart ${i + 1}`);
          imageTimeframes.push(tf);
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
      // FREE LIMIT & CONCURRENCY RESERVATION
      // ------------------------------------------------------

      if (isSubjectToFreeQuota) {
        const clientInfo = getClientKeys(req);
        if (authUser && clientInfo.clientId) {
          const fp =
            typeof req.headers['x-device-fingerprint'] === 'string'
              ? req.headers['x-device-fingerprint']
              : null;
          linkAccountAndDevice(authUser.id, clientInfo.clientId, fp);
        }

        const usage = getEffectiveUsage(req);
        const userLifetimeCount = authUser
          ? Math.max(authUser.freeAnalysisCount || 0, usage.count)
          : usage.count;
        usageSnapshot = { count: userLifetimeCount, resetAt: null };

        if (
          userLifetimeCount >=
          MAX_FREE_ANALYSES
        ) {
          return res.status(403).json({
            success: false,

            code:
              'FREE_LIMIT_REACHED',

            error:
              'Lifetime free limit reached: You have completed all 3 free chart analyses. Free access is permanently locked. Upgrade to PRO to continue.',

            freeAnalysisCount:
              userLifetimeCount,

            maxFreeAnalyses:
              MAX_FREE_ANALYSES,

            remainingFreeAnalyses: 0,

            limitReached: true,

            resetAt: null,

            upgradeRequired: true,
            requiresPro: true,
          });
        }

        const reserved = reserveAnalysisAttempt(clientInfo.allKeys);
        if (!reserved) {
          return res.status(403).json({
            success: false,

            code:
              'FREE_LIMIT_REACHED',

            error:
              'Lifetime free limit reached: You have reached the maximum 3 free analyses in progress or completed. Upgrade to PRO to continue.',

            freeAnalysisCount:
              userLifetimeCount,

            maxFreeAnalyses:
              MAX_FREE_ANALYSES,

            remainingFreeAnalyses: 0,

            limitReached: true,


            resetAt: null,

            upgradeRequired: true,
            requiresPro: true,
          });
        }

        reservedKeys = clientInfo.allKeys;
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

          const generatePromise = ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`[FALCON VISION] ${modelName} request timed out after 60s`)), 60000);
          });

          const aiResponse: any = await Promise.race([generatePromise, timeoutPromise]);

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

          const errStr = String(err?.message || err);
          if (
            errStr.includes('timed out') ||
            errStr.includes('429') ||
            errStr.includes('RESOURCE_EXHAUSTED') ||
            errStr.includes('quota')
          ) {
            break;
          }
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
      // RECONCILE AND VALIDATE TRADE PLAN CONSISTENCY
      // ------------------------------------------------------

      const { reconciled, validation } =
        reconcileAndValidateTradePlan(
          analysisData,
          {
            asset,
            timeframe,
            tradingStyle,
          }
        );

      analysisData = reconciled;

      // Final safety audit before returning to client
      const finalAudit = validateTradeStructure(analysisData);
      if (!finalAudit.valid) {
        console.warn(
          '[FALCON VALIDATION] Inconsistency detected before sending to client, auto-reconciling trade plan:',
          finalAudit.reason
        );
        const { reconciled: fixedReconciled } = reconcileAndValidateTradePlan(
          analysisData,
          { asset, timeframe, tradingStyle }
        );
        analysisData = fixedReconciled;
      }

      console.log(
        '[FALCON VALIDATION] Trade signal ready:',
        analysisData.verdict?.signal,
        'Entry:',
        analysisData.entryZone?.recommended,
        'SL:',
        analysisData.stopLoss?.price,
        'TP1:',
        analysisData.takeProfit1?.price,
        'TP2:',
        analysisData.takeProfit2?.price
      );

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
        isSubjectToFreeQuota &&
        reservedKeys.length > 0
      ) {
        updatedFreeCount =
          commitSuccessfulFreeAnalysis(
            reservedKeys,
            authUser?.id
          );

        isFreeLimitReached =
          updatedFreeCount >=
          MAX_FREE_ANALYSES;
      }


      if (isOwner && finalAnalysis) {
        try {
          const historyItem = {
            id: finalAnalysis.id || `owner_anl_${Date.now()}`,
            timestamp: new Date().toISOString(),
            asset: asset || finalAnalysis.asset || 'CHART',
            timeframe: timeframe || finalAnalysis.timeframe || '4H',
            tradingStyle: tradingStyle || finalAnalysis.tradingStyle || 'Swing',
            bias: bias || 'Auto',
            imagesCount: Array.isArray(images) ? images.length : 1,
            verdict: finalAnalysis.verdict,
            entryZone: finalAnalysis.entryZone,
            stopLoss: finalAnalysis.stopLoss,
            takeProfit1: finalAnalysis.takeProfit1,
            takeProfit2: finalAnalysis.takeProfit2,
            marketTrend: finalAnalysis.marketTrend,
            detailedExplanation: finalAnalysis.detailedExplanation,
          };
          ownerHistory = [historyItem, ...ownerHistory.filter((h: any) => h.id !== historyItem.id)].slice(0, 50);
          writeJsonFile(OWNER_HISTORY_FILE, ownerHistory);
        } catch (hErr) {
          console.warn('[STORAGE] Failed auto-saving owner history:', hErr);
        }
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

        accessType:
          isOwner
            ? 'OWNER'
            : isPaidPro
              ? 'PAID'
              : 'FREE',

        freeAnalysisCount:
          isSubjectToFreeQuota
            ? updatedFreeCount
            : undefined,

        maxFreeAnalyses:
          MAX_FREE_ANALYSES,

        remainingFreeAnalyses:
          isSubjectToFreeQuota
            ? Math.max(
                0,
                MAX_FREE_ANALYSES -
                  (updatedFreeCount || 0)
              )
            : 999,

        freeLimitReached:
          isSubjectToFreeQuota
            ? isFreeLimitReached
            : false,


        resetAt:
          null,
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
        errorText.includes('429') ||
        errorText.includes('RESOURCE_EXHAUSTED') ||
        errorText.includes('quota')
      ) {
        return res.status(429).json({
          success: false,
          error: 'Gemini API quota exceeded. Please check your plan and billing details or try again later.',
        });
      }

      if (
        errorText.includes('503') ||
        errorText.includes('UNAVAILABLE') ||
        errorText.includes('high demand')
      ) {
        return res.status(503).json({
          success: false,
          error: 'Gemini vision models are temporarily under high demand. Please try Analyze Chart again in a few moments.',
        });
      }

      if (
        errorText.includes('timed out') ||
        errorText.includes('timeout')
      ) {
        return res.status(504).json({
          success: false,
          error: 'Chart analysis request timed out. Please try again or upload a clearer chart screenshot.',
        });
      }

      if (
        errorText.includes('fetch failed') ||
        errorText.includes('ENOTFOUND') ||
        errorText.includes('ECONNREFUSED') ||
        errorText.includes('ETIMEDOUT')
      ) {
        return res.status(502).json({
          success: false,
          error: 'Unable to connect to Google Gemini API service. Please check network connection and try again.',
        });
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    } finally {
      if (reservedKeys.length > 0) {
        releaseAnalysisReservation(reservedKeys);
      }
    }
  }
);

// ============================================================
// VITE / PRODUCTION
// ============================================================

async function startServer() {
  // ------------------------------------------------------------
  // PRO MULTI-CHART & FREE ROUTE ACCESS CONTROL MIDDLEWARE
  // ------------------------------------------------------------
  const PRO_MULTI_CHART_PATHS = [
    '/multi-chart',
    '/3-screen',
    '/multi-screen',
    '/pro',
    '/pro-multi-chart',
    '/3-chart',
    '/multi',
    '/multi-timeframe',
  ];

  const FREE_REDIRECT_PATHS = [
    '/3-free-chart-analysis',
    '/free',
  ];

  // Free routes always redirect to the canonical home page
  app.get(
    [
      ...FREE_REDIRECT_PATHS,
      ...FREE_REDIRECT_PATHS.map((p) => `${p}/`),
    ],
    (_req: Request, res: Response) => {
      return res.redirect('/');
    }
  );

  // Pro Multi-Chart routes require verified Pro entitlement or Owner session
  app.get(
    [
      ...PRO_MULTI_CHART_PATHS,
      ...PRO_MULTI_CHART_PATHS.map((p) => `${p}/`),
    ],
    (req: Request, res: Response, next: NextFunction) => {
      const isOwner = Boolean(getOwnerSessionFromRequest(req));
      const authUser = getAuthenticatedUserFromRequest(req);
      const userProCheck = authUser ? isUserActivePro(authUser) : { isPro: false };
      const licenseKey = typeof req.headers['x-license-key'] === 'string' ? req.headers['x-license-key'] : '';
      const isPaidPro = isOwner || isVerifiedProKey(licenseKey) || (Boolean(authUser) && (userProCheck.isPro || isVerifiedProKey(authUser?.licenseKey)));

      if (isOwner || isPaidPro) {
        // Authenticated Pro user or Owner: allow access to load the page
        return next();
      }

      // Unauthorized (free/anonymous user): block access, redirect to free home page with locked query flag
      return res.redirect('/?pro_access_denied=1');
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));

    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!DOCTYPE html><html><head><title>Falcon Analyze</title></head><body><div id="root"></div></body></html>');
      }
    });
  }

  ensureDataDirectory();

  const server = app.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(`[FALCON ANALYZE] Server running on port ${PORT}`);
      console.log(`[FALCON ANALYZE] Gemini primary model: ${GEMINI_PRIMARY_MODEL}`);
      console.log(`[FALCON ANALYZE] API key configured: ${Boolean(getValidApiKey())}`);
      console.log(`[FALCON ANALYZE] Pro keys configured: ${getConfiguredProKeys().size}`);
    }
  );

  const shutdown = (signal: string) => {
    console.log(`[FALCON ANALYZE] ${signal} signal received: closing HTTP server...`);
    server.close(() => {
      console.log('[FALCON ANALYZE] HTTP server closed gracefully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (!process.env.TEST_MODE && process.env.NODE_ENV !== 'test') {
  startServer();
}