/**
 * Device and browser fingerprint generator for durable client tracking.
 * Resilient against localStorage clears, tab reopens, and session resets.
 */

const FINGERPRINT_KEY = 'falcon_device_fingerprint_v1';
const COOKIE_NAME = 'falcon_device_id';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  } catch (_) {
    return null;
  }
}

function setCookie(name: string, value: string, days: number = 365) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (_) {}
}

export function getDeviceFingerprint(): string {
  try {
    const components: string[] = [
      navigator.userAgent || 'unknown_ua',
      `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown_tz',
      navigator.language || 'en',
      String(navigator.hardwareConcurrency || 4),
      String(navigator.maxTouchPoints || 0),
    ];

    const raw = components.join('###');
    const hash = `fp_${simpleHash(raw)}`;

    // Store in cookie and localStorage as backup identifiers
    const existingCookie = getCookie(COOKIE_NAME);
    if (!existingCookie) {
      setCookie(COOKIE_NAME, hash, 365);
    }

    try {
      localStorage.setItem(FINGERPRINT_KEY, hash);
    } catch (_) {}

    return hash;
  } catch (_) {
    return 'fp_fallback_client';
  }
}

export function getPersistentDeviceId(): string {
  try {
    // 1. Try Cookie
    const cookieId = getCookie(COOKIE_NAME);
    if (cookieId && cookieId.trim().length > 0) {
      return cookieId.trim();
    }

    // 2. Try LocalStorage
    let lsId = localStorage.getItem('falcon_analyze_client_id_v1');
    if (lsId && lsId.trim().length > 0) {
      setCookie(COOKIE_NAME, lsId.trim(), 365);
      return lsId.trim();
    }

    // 3. Generate New Stable ID
    const newId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('falcon_analyze_client_id_v1', newId);
    setCookie(COOKIE_NAME, newId, 365);
    return newId;
  } catch (_) {
    return 'client_default_session';
  }
}

const USER_ID_KEY = 'falcon_user_id_v1';
const USER_EMAIL_KEY = 'falcon_user_email_v1';
const AUTH_TOKEN_KEY = 'falcon_user_auth_token_v1';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (_) {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      setCookie(AUTH_TOKEN_KEY, token, 30);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setCookie(AUTH_TOKEN_KEY, '', -1);
    }
  } catch (_) {}
}

export function getFormattedUserId(): string {
  try {
    let uid = localStorage.getItem(USER_ID_KEY);
    if (!uid) {
      // Create a clean readable User ID like user-7KFuVJ
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
      let rand = '';
      for (let i = 0; i < 6; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      uid = `user-${rand}`;
      localStorage.setItem(USER_ID_KEY, uid);
    }
    return uid;
  } catch (_) {
    return 'user-7KFuVJ';
  }
}

export function setPermanentUserId(userId: string): void {
  try {
    if (userId && userId.trim()) {
      localStorage.setItem(USER_ID_KEY, userId.trim());
    }
  } catch (_) {}
}

export function getStoredUserIdentifier(): string {
  try {
    const email = localStorage.getItem(USER_EMAIL_KEY);
    if (email && email.trim().length > 0) {
      return email.trim();
    }
    return 'milyas1071@gmail.com';
  } catch (_) {
    return 'milyas1071@gmail.com';
  }
}

export function setStoredUserIdentifier(identifier: string): void {
  try {
    const clean = identifier.trim();
    if (clean.includes('@')) {
      localStorage.setItem(USER_EMAIL_KEY, clean);
    } else {
      localStorage.setItem(USER_ID_KEY, clean);
    }
  } catch (_) {}
}
