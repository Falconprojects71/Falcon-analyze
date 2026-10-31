import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ChartUploader, ChartImageItem } from './components/ChartUploader';
import { ChartAnnotator } from './components/ChartAnnotator';
import { FreeTradeSetupCard } from './components/FreeTradeSetupCard';
import { ProResultCard } from './components/ProResultCard';
import { ProUpgradeModal } from './components/ProUpgradeModal';
import { UserAccountModal } from './components/UserAccountModal';
import { PaymentSuccessModal } from './components/PaymentSuccessModal';
import { OwnerAdminPortal } from './components/OwnerAdminPortal';
import { LandingPage } from './components/LandingPage';
import { ChartAnalysisResult, OwnerUser, AuthUser, TradeSignal } from './types';
import confetti from 'canvas-confetti';
import { ensureRasterImageBase64 } from './utils/imageUtils';
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Lock,
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

const FREE_PATHS = [
  '/3-free-chart-analysis',
  '/free',
];

function isProMultiChartRoute(pathname: string, hash: string): boolean {
  const cleanPath = (pathname || '').toLowerCase().replace(/\/+$/, '');
  const cleanHash = (hash || '').toLowerCase().replace(/^#\/?/, '').replace(/\/+$/, '');

  for (const p of PRO_MULTI_CHART_PATHS) {
    const raw = p.replace(/^\//, '');
    if (cleanPath === p || cleanPath.endsWith(p) || cleanHash === raw || cleanHash.startsWith(raw)) {
      return true;
    }
  }
  return false;
}

function isFreeRoute(pathname: string, hash: string): boolean {
  const cleanPath = (pathname || '').toLowerCase().replace(/\/+$/, '');
  const cleanHash = (hash || '').toLowerCase().replace(/^#\/?/, '').replace(/\/+$/, '');

  for (const f of FREE_PATHS) {
    const raw = f.replace(/^\//, '');
    if (cleanPath === f || cleanPath.endsWith(f) || cleanHash === raw || cleanHash.startsWith(raw)) {
      return true;
    }
  }
  return false;
}

export default function App() {
  // Navigation / Routing: supports both pathname (/owner, /admin) and hash routes (#/owner, #/admin)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const hash = window.location.hash.toLowerCase();
    if (
      hash === '#/owner' ||
      hash === '#owner' ||
      hash.startsWith('#/owner') ||
      hash.startsWith('#owner')
    ) {
      return '/owner';
    }
    if (
      hash === '#/admin' ||
      hash === '#admin' ||
      hash.startsWith('#/admin') ||
      hash.startsWith('#admin')
    ) {
      return '/admin';
    }
    const path = window.location.pathname.toLowerCase();
    if (path === '/owner' || path === '/admin') {
      return path;
    }
    if (isProMultiChartRoute(path, hash) || isFreeRoute(path, hash)) {
      return '/';
    }
    return window.location.pathname;
  });

  const [images, setImages] = useState<ChartImageItem[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [viewMode, setViewMode] = useState<'landing' | 'terminal'>(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#/terminal' || hash === '#terminal' || hash === '#/app' || hash === '#app') {
      return 'terminal';
    }
    if (hash === '#/overview' || hash === '#overview' || hash === '#/landing' || hash === '#landing') {
      return 'landing';
    }
    try {
      const token = localStorage.getItem('falcon_user_auth_token_v1') || localStorage.getItem('falcon_owner_token');
      if (token) {
        return 'terminal';
      }
    } catch (_) {}
    return 'landing';
  });

  // Owner state: strictly server-verified; never granted from raw unverified storage
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [ownerToken, setOwnerToken] = useState<string | null>(() => {
    return localStorage.getItem('falcon_owner_token');
  });
  const [ownerUser, setOwnerUser] = useState<OwnerUser | null>(null);

  const [userId] = useState<string>(() => getFormattedUserId());
  const [userIdentifier, setUserIdentifier] = useState<string>(() => getStoredUserIdentifier());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'register' | 'forgot' | 'account' | 'pro'>('signin');
  const [isUserAccountModalOpen, setIsUserAccountModalOpen] = useState<boolean>(false);

  // Pro status: strictly server-verified; never assumed from client storage or URL
  const [isProUser, setIsProUser] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [isPaymentSuccessModalOpen, setIsPaymentSuccessModalOpen] = useState<boolean>(false);
  const [paymentSuccessReference, setPaymentSuccessReference] = useState<string>('');
  const [prefilledLicenseKey, setPrefilledLicenseKey] = useState<string>('');

  const [freeAnalysisCount, setFreeAnalysisCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('falcon_cached_free_count');
      if (stored !== null) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val >= 0) return val;
      }
    } catch (_) {}
    return 0;
  });
  const [maxFreeAnalyses, setMaxFreeAnalyses] = useState<number>(3);
  const [freeLimitReached, setFreeLimitReached] = useState<boolean>(() => {
    try {
      return localStorage.getItem('falcon_cached_limit_reached') === 'true';
    } catch (_) {}
    return false;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('falcon_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (_) {}
    return 'light';
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      localStorage.setItem('falcon_theme', theme);
    } catch (_) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Dedicated server-verified Pro entitlement check
  const verifyProEntitlement = useCallback(async (): Promise<boolean> => {
    try {
      const userToken = getAuthToken() || localStorage.getItem('falcon_user_auth_token_v1') || '';
      const ownerTokenVal = localStorage.getItem('falcon_owner_token') || '';
      const licenseKey = localStorage.getItem('falcon_pro_license_key') || '';

      const headers: Record<string, string> = {
        'x-license-key': licenseKey,
      };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
        headers['x-auth-token'] = userToken;
      }
      if (ownerTokenVal) {
        headers['x-owner-token'] = ownerTokenVal;
      }

      const res = await fetch('/api/pro/verify-entitlement', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.isEntitled) {
          setIsProUser(true);
          if (data.isOwner) {
            setIsOwner(true);
          }
          if (data.user) {
            setAuthUser(data.user);
          }
          return true;
        }
      }
    } catch (err) {
      console.warn('Failed to verify Pro entitlement:', err);
    }
    return false;
  }, []);

  const navigateTo = async (path: string) => {
    const hasAuth = Boolean(
      authUser ||
      isOwner ||
      getAuthToken() ||
      localStorage.getItem('falcon_user_auth_token_v1') ||
      localStorage.getItem('falcon_owner_token')
    );

    if (path === '/') {
      if (hasAuth) {
        window.location.hash = '/terminal';
        setCurrentPath('/');
        setViewMode('terminal');
      } else {
        if (window.location.hash) {
          try {
            window.history.pushState(null, '', window.location.pathname + window.location.search);
          } catch (_) {
            window.location.hash = '';
          }
        } else {
          window.history.pushState({}, '', '/');
        }
        setCurrentPath('/');
        setViewMode('landing');
      }
    } else if (path === '/terminal' || path === '#/terminal') {
      try {
        window.history.pushState({}, '', '/');
      } catch (_) {}
      if (hasAuth) {
        window.location.hash = '/terminal';
        setCurrentPath('/');
        setViewMode('terminal');
      } else {
        setViewMode('landing');
        setAuthModalTab('signin');
        setIsUserAccountModalOpen(true);
      }
    } else if (path === '#/overview' || path === '/overview') {
      window.location.hash = '/overview';
      setCurrentPath('/');
      setViewMode('landing');
    } else if (path === '#/owner' || path === '/owner') {
      window.location.hash = '/owner';
      setCurrentPath('/owner');
    } else if (path === '#/admin' || path === '/admin') {
      window.location.hash = '/admin';
      setCurrentPath('/admin');
    } else if (isProMultiChartRoute(path, path)) {
      const entitled = isProUser || isOwner || (await verifyProEntitlement());
      if (!entitled) {
        setIsUpgradeModalOpen(true);
        setErrorMessage('Multi-Chart / 3-Screen Analysis is a PRO-ONLY feature. Upgrade to Pro or sign in with an active Pro account.');
        setPlan('free');
        setIsProUser(false);
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', '/');
        }
        setCurrentPath('/');
        if (hasAuth) {
          setViewMode('terminal');
        } else {
          setViewMode('landing');
        }
        return;
      }
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      setPlan('pro');
      setViewMode('terminal');
    } else if (isFreeRoute(path, path)) {
      setPlan('free');
      if (hasAuth) {
        window.location.hash = '/terminal';
        setCurrentPath('/');
        setViewMode('terminal');
      } else {
        window.history.pushState({}, '', '/');
        setCurrentPath('/');
        setViewMode('landing');
        setAuthModalTab('signin');
        setIsUserAccountModalOpen(true);
      }
    } else {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
  };

  useEffect(() => {
    const onLocationChange = async () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const hasAuth = Boolean(
        authUser ||
        isOwner ||
        getAuthToken() ||
        localStorage.getItem('falcon_user_auth_token_v1') ||
        localStorage.getItem('falcon_owner_token')
      );

      if (
        hash === '#/owner' ||
        hash === '#owner' ||
        hash.startsWith('#/owner') ||
        hash.startsWith('#owner') ||
        path === '/owner'
      ) {
        setCurrentPath('/owner');
      } else if (
        hash === '#/admin' ||
        hash === '#admin' ||
        hash.startsWith('#/admin') ||
        hash.startsWith('#admin') ||
        path === '/admin'
      ) {
        setCurrentPath('/admin');
      } else if (
        hash === '#/terminal' ||
        hash === '#terminal' ||
        hash === '#/app' ||
        hash === '#app' ||
        path === '/terminal' ||
        path === '/app'
      ) {
        setCurrentPath('/');
        if (hasAuth) {
          setViewMode('terminal');
        } else {
          setViewMode('landing');
          setAuthModalTab('signin');
          setIsUserAccountModalOpen(true);
        }
      } else if (
        hash === '#/overview' ||
        hash === '#overview' ||
        hash === '#/landing' ||
        hash === '#landing'
      ) {
        setCurrentPath('/');
        setViewMode('landing');
      } else if (isProMultiChartRoute(path, hash)) {
        const entitled = isProUser || isOwner || (await verifyProEntitlement());
        if (entitled) {
          setCurrentPath(path || hash);
          setPlan('pro');
          setViewMode('terminal');
        } else {
          setCurrentPath('/');
          setPlan('free');
          setIsProUser(false);
          if (hasAuth) {
            setViewMode('terminal');
          } else {
            setViewMode('landing');
          }
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', '/');
          }
          setIsUpgradeModalOpen(true);
          setErrorMessage('Multi-Chart / 3-Screen Analysis is a PRO-ONLY feature. Upgrade to Pro or sign in with an active Pro account.');
        }
      } else if (isFreeRoute(path, hash)) {
        setCurrentPath('/');
        setPlan('free');
        if (hasAuth) {
          setViewMode('terminal');
        } else {
          setViewMode('landing');
          setAuthModalTab('signin');
          setIsUserAccountModalOpen(true);
        }
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', '/');
        }
      } else {
        setCurrentPath(window.location.pathname);
        if (hasAuth) {
          setViewMode('terminal');
        } else {
          setViewMode('landing');
        }
      }
    };
    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, [isProUser, isOwner, verifyProEntitlement]);

  const [asset, setAsset] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('4H');
  const [tradingStyle, setTradingStyle] = useState<string>('Swing');
  const [bias, setBias] = useState<string>('Auto');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ChartAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [paymentBanner, setPaymentBanner] = useState<{
    type: 'success' | 'cancel';
    message: string;
  } | null>(null);

  // Server verification of Owner token on app launch
  useEffect(() => {
    const verifyOwnerSession = async () => {
      const storedToken = localStorage.getItem('falcon_owner_token');
      if (!storedToken) {
        setIsOwner(false);
        setOwnerToken(null);
        setOwnerUser(null);
        return;
      }
      try {
        const res = await fetch('/api/auth/owner-session', {
          headers: {
            'x-owner-token': storedToken,
            Authorization: `Bearer ${storedToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.role === 'OWNER') {
            setIsOwner(true);
            setOwnerToken(storedToken);
            setOwnerUser({
              role: 'OWNER',
              email: 'milyas1071@gmail.com',
              ownerAccess: true,
            });
            return;
          }
        }
        // Token was invalid or server rejected it: clear unverified token
        localStorage.removeItem('falcon_owner_token');
        setIsOwner(false);
        setOwnerToken(null);
        setOwnerUser(null);
      } catch {
        setIsOwner(false);
      }
    };
    verifyOwnerSession();
  }, []);

  // Restore authenticated user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = getAuthToken() || localStorage.getItem('falcon_user_auth_token_v1');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
              setAuthUser(data.user);
              if (data.user.isPro) {
                setIsProUser(true);
                setPlan('pro');
              } else {
                setIsProUser(false);
                setPlan('free');
              }
              const hash = window.location.hash.toLowerCase();
              if (hash !== '#/overview' && hash !== '#overview' && hash !== '#/landing' && hash !== '#landing') {
                setViewMode('terminal');
              }
            } else {
              setAuthToken(null);
              localStorage.removeItem('falcon_user_auth_token_v1');
              setViewMode('landing');
            }
          }
        } catch (_) {}
      }
    };
    restoreSession();
  }, []);

  const fetchUsageStatus = useCallback(async () => {
    try {
      const clientId = getPersistentDeviceId();
      const fingerprint = getDeviceFingerprint();
      const storedLicense = localStorage.getItem('falcon_pro_license_key') || '';
      const storedToken = localStorage.getItem('falcon_owner_token') || '';
      const userToken = getAuthToken() || localStorage.getItem('falcon_user_auth_token_v1') || '';
      const persistentUserId = getStoredUserIdentifier() || userId || getFormattedUserId();

      const headers: Record<string, string> = {
        'x-client-id': clientId,
        'x-device-fingerprint': fingerprint,
        'x-license-key': storedLicense,
        'x-owner-token': storedToken,
        'x-user-identifier': authUser?.email || persistentUserId,
      };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
        headers['x-auth-token'] = userToken;
      }

      const res = await fetch('/api/usage-status', { headers });
      if (res.ok) {
        const data = await res.json();
        const freeCount = typeof data.freeAnalysisCount === 'number' ? data.freeAnalysisCount : 0;
        const maxFree = typeof data.maxFreeAnalyses === 'number' ? data.maxFreeAnalyses : 3;
        const limitReached = Boolean(data.freeLimitReached || freeCount >= maxFree);

        setFreeAnalysisCount(freeCount);
        setMaxFreeAnalyses(maxFree);
        setFreeLimitReached(limitReached);
        try {
          localStorage.setItem('falcon_cached_free_count', String(freeCount));
          localStorage.setItem('falcon_cached_limit_reached', String(limitReached));
        } catch (_) {}

        const isOwnerConfirmed = Boolean(data.isOwner && data.role === 'OWNER');
        setIsOwner(isOwnerConfirmed);
        if (isOwnerConfirmed) {
          setOwnerUser({
            role: 'OWNER',
            email: 'milyas1071@gmail.com',
            ownerAccess: true,
          });
        }

        const proActive = Boolean(data.isProVerified || data.isPaidPro || isOwnerConfirmed);
        setIsProUser(proActive);

        if (data.user) {
          setAuthUser(data.user);
        }
        if (!proActive && limitReached) {
          setPlan('free');
        }
      }
    } catch (err) {
      console.warn('Failed to fetch usage status:', err);
    }
  }, [userId, authUser?.email]);

  useEffect(() => {
    fetchUsageStatus();
  }, [fetchUsageStatus]);

  // Pro Feature Route Protection: Check both route and server authorization
  useEffect(() => {
    let isCancelled = false;

    // Handle server redirect query flags like ?pro_access_denied=1 or ?pro_locked=1
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('pro_access_denied') || urlParams.get('pro_locked')) {
        urlParams.delete('pro_access_denied');
        urlParams.delete('pro_locked');
        const newSearch = urlParams.toString();
        const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', cleanUrl || '/');
        }
        setPlan('free');
        setIsProUser(false);
        setIsUpgradeModalOpen(true);
        setErrorMessage('Multi-Chart / 3-Screen Analysis is a PRO-ONLY feature. Upgrade to Pro or sign in with an active Pro account.');
        setCurrentPath('/');
        return;
      }
    } catch (_) {}

    const checkRouteAccess = async () => {
      const pathname = window.location.pathname;
      const hash = window.location.hash;

      if (
        pathname === '/owner' ||
        pathname === '/admin' ||
        hash.startsWith('#/owner') ||
        hash.startsWith('#/admin') ||
        hash === '#owner' ||
        hash === '#admin'
      ) {
        return;
      }

      if (isProMultiChartRoute(pathname, hash)) {
        if (isProUser || isOwner) {
          setPlan('pro');
          setCurrentPath(pathname || hash);
          return;
        }

        const hasToken = Boolean(
          getAuthToken() ||
          localStorage.getItem('falcon_user_auth_token_v1') ||
          localStorage.getItem('falcon_owner_token')
        );

        if (!hasToken) {
          setPlan('free');
          setIsProUser(false);
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', '/');
          }
          setCurrentPath('/');
          setIsUpgradeModalOpen(true);
          setErrorMessage('Multi-Chart / 3-Screen Analysis is a PRO-ONLY feature. Upgrade to Pro or sign in with an active Pro account.');
          return;
        }

        const entitled = await verifyProEntitlement();
        if (isCancelled) return;

        if (entitled) {
          setPlan('pro');
          setIsProUser(true);
          setCurrentPath(pathname || hash);
        } else {
          setPlan('free');
          setIsProUser(false);
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', '/');
          }
          setCurrentPath('/');
          setIsUpgradeModalOpen(true);
          setErrorMessage('Multi-Chart / 3-Screen Analysis is a PRO-ONLY feature. Upgrade to Pro or sign in with an active Pro account.');
        }
      } else if (isFreeRoute(pathname, hash)) {
        setPlan('free');
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', '/');
        }
        setCurrentPath('/');
      }
    };

    checkRouteAccess();

    return () => {
      isCancelled = true;
    };
  }, [currentPath, isProUser, isOwner, verifyProEntitlement]);

  // Handle Safepay payment return
  useEffect(() => {
    try {
      const pathname = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const reference = urlParams.get('reference');

      if (pathname.includes('/payment/success') || (pathname === '/' && reference)) {
        if (reference) {
          setPaymentSuccessReference(reference);
          setIsPaymentSuccessModalOpen(true);
        }
        window.history.replaceState({}, '', '/');
      } else if (pathname.includes('/payment/cancel')) {
        setPaymentBanner({
          type: 'cancel',
          message: 'Safepay checkout was cancelled. Your account remains on the Free plan.',
        });
        window.history.replaceState({}, '', '/');
      }
    } catch (_) {}
  }, []);

  const handleUserLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      const clientId = getPersistentDeviceId();
      const fingerprint = getDeviceFingerprint();

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          clientId,
          deviceFingerprint: fingerprint,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setAuthUser(data.user);
        setAuthToken(data.token);
        if (data.token) {
          localStorage.setItem('falcon_user_auth_token_v1', data.token);
        }
        setUserIdentifier(data.user.email);
        setStoredUserIdentifier(data.user.email);

        const userCount = typeof data.user.freeAnalysisCount === 'number' ? data.user.freeAnalysisCount : 0;
        const userLimit = Boolean(data.user.freeLimitReached || userCount >= 3);
        setFreeAnalysisCount(userCount);
        setFreeLimitReached(userLimit);
        try {
          localStorage.setItem('falcon_cached_free_count', String(userCount));
          localStorage.setItem('falcon_cached_limit_reached', String(userLimit));
        } catch (_) {}

        if (data.user.isPro || isOwner) {
          setIsProUser(true);
          setPlan('pro');
        } else {
          setIsProUser(false);
          setPlan('free');
        }

        // Navigate directly to terminal with Free 3 Chart mode
        setViewMode('terminal');
        window.location.hash = '/terminal';

        await fetchUsageStatus();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleUserRegister = async (
    email: string,
    password: string,
    confirmPassword?: string
  ): Promise<boolean> => {
    try {
      const clientId = getPersistentDeviceId();
      const fingerprint = getDeviceFingerprint();

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          confirmPassword,
          clientId,
          deviceFingerprint: fingerprint,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setAuthUser(data.user);
        setAuthToken(data.token);
        if (data.token) {
          localStorage.setItem('falcon_user_auth_token_v1', data.token);
        }
        setUserIdentifier(data.user.email);
        setStoredUserIdentifier(data.user.email);

        const userCount = typeof data.user.freeAnalysisCount === 'number' ? data.user.freeAnalysisCount : 0;
        const userLimit = Boolean(data.user.freeLimitReached || userCount >= 3);
        setFreeAnalysisCount(userCount);
        setFreeLimitReached(userLimit);
        try {
          localStorage.setItem('falcon_cached_free_count', String(userCount));
          localStorage.setItem('falcon_cached_limit_reached', String(userLimit));
        } catch (_) {}

        setIsProUser(isOwner);
        setPlan(isOwner ? 'pro' : 'free');
        setViewMode('terminal');
        window.location.hash = '/terminal';

        await fetchUsageStatus();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleUserLogout = async () => {
    const token = getAuthToken() || localStorage.getItem('falcon_user_auth_token_v1');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_) {}
    }
    setAuthUser(null);
    setAuthToken(null);
    localStorage.removeItem('falcon_user_auth_token_v1');

    if (isOwner) {
      // Owner session is active! Retain owner access and stay in terminal
      setIsProUser(true);
      setViewMode('terminal');
      window.location.hash = '/terminal';
    } else {
      setIsProUser(false);
      setPlan('free');
      setViewMode('landing');
      window.location.hash = '';
    }
    await fetchUsageStatus();
  };

  const handleActivateLicenseKey = async (keyInput?: string): Promise<boolean> => {
    try {
      const key = keyInput?.trim().toUpperCase();
      if (!key) return false;

      const clientId = getPersistentDeviceId();
      const fingerprint = getDeviceFingerprint();
      const userToken = getAuthToken() || localStorage.getItem('falcon_user_auth_token_v1') || '';
      const persistentUserId = getStoredUserIdentifier() || userId;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }

      const res = await fetch('/api/verify-license', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          licenseKey: key,
          clientId,
          deviceFingerprint: fingerprint,
          userId: persistentUserId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.valid) {
        localStorage.setItem('falcon_pro_license_key', key);
        setIsProUser(true);
        setPlan('pro');
        await fetchUsageStatus();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Owner handlers (for private interface)
  const handleOwnerLoginSuccess = (token: string, user: OwnerUser) => {
    setIsOwner(true);
    setOwnerToken(token);
    setOwnerUser(user);
    localStorage.setItem('falcon_owner_token', token);
    try {
      document.cookie = `falcon_owner_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
    } catch (_) {}
    fetchUsageStatus();
  };

  const handleOwnerLogout = async () => {
    const token = ownerToken || localStorage.getItem('falcon_owner_token');
    try {
      if (token) {
        await fetch('/api/auth/owner-logout', {
          method: 'POST',
          headers: {
            'x-owner-token': token,
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (_) {}
    setIsOwner(false);
    setOwnerToken(null);
    setOwnerUser(null);
    localStorage.removeItem('falcon_owner_token');
    try {
      document.cookie = `falcon_owner_token=; path=/; max-age=0; SameSite=Lax`;
    } catch (_) {}

    // If currently on /owner or /admin, navigate back to main interface
    if (currentPath === '/owner' || currentPath === '/admin') {
      setCurrentPath('/');
      try {
        window.history.pushState({}, '', '/');
      } catch (_) {}
      if (authUser || localStorage.getItem('falcon_user_auth_token_v1')) {
        window.location.hash = '/terminal';
        setViewMode('terminal');
      } else {
        window.location.hash = '';
        setViewMode('landing');
      }
    }
    await fetchUsageStatus();
  };

  const handleDeactivatePro = () => {
    setIsProUser(false);
    setPlan('free');
    localStorage.removeItem('falcon_pro_license_key');
    fetchUsageStatus();
  };

  const handleUserPlanChange = async (newPlan: 'free' | 'pro') => {
    if (newPlan === 'pro') {
      const entitled = isProUser || isOwner || (await verifyProEntitlement());
      if (!entitled) {
        setPlan('free');
        setIsProUser(false);
        setIsUpgradeModalOpen(true);
        setErrorMessage('Multi-Chart / 3-Screen Analysis is a PRO-ONLY feature. Upgrade to Pro or sign in with an active Pro account.');
        return;
      }
      setPlan('pro');
    } else {
      setPlan('free');
    }
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
      setErrorMessage('Lifetime free limit reached: You have completed all 3 free chart analyses. Free access is permanently locked. Upgrade to PRO to continue.');
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

      const persistentUserId = getStoredUserIdentifier() || userId || getFormattedUserId();

      const payload = JSON.stringify({
        images: rasterizedImages,
        plan,
        clientId,
        userIdentifier: persistentUserId,
        deviceFingerprint: fingerprint,
        licenseKey: storedLicense,
        asset: asset.trim() || 'CRYPTO/FOREX',
        timeframe: timeframe.trim() || '1H',
        tradingStyle: tradingStyle.trim() || 'Intraday',
        bias: bias.trim() || 'Auto',
        additionalNotes: additionalNotes.trim() || '',
      });

      const userToken = getAuthToken() || localStorage.getItem('falcon_user_auth_token_v1') || '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-device-fingerprint': fingerprint,
        'x-license-key': storedLicense,
        'x-owner-token': storedToken,
      };

      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
        headers['x-auth-token'] = userToken;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000);

      let response: Response;
      let text: string;
      try {
        response = await fetch('/api/analyze-chart', {
          method: 'POST',
          headers,
          body: payload,
          signal: controller.signal,
        });
        text = await response.text();
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') {
          throw new Error('Analysis request timed out after 60 seconds. Please try again.');
        }
        if (fetchErr.name === 'TypeError' || String(fetchErr).includes('NetworkError') || String(fetchErr).includes('Failed to fetch')) {
          throw new Error('Network connection error. Please check your internet connection and try again.');
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }
      let data: any = null;
      if (text && text.trim()) {
        try {
          data = JSON.parse(text);
        } catch (_) {}
      }

      if (!response.ok) {
        throw new Error(data?.error || `Server request failed with status ${response.status}. Please try again.`);
      }

      if (!data) {
        throw new Error('Server returned an empty or unreadable response. Check backend connection.');
      }

      if (data?.code === 'PRO_ACCESS_DENIED' || data?.requiresPro) {
        setIsProUser(false);
        setPlan('free');
        setIsUpgradeModalOpen(true);
        setErrorMessage(data.error || 'Multi-Chart / 3-Screen Analysis is a PRO-ONLY feature. Upgrade to Pro or sign in with an active Pro account.');
        setIsAnalyzing(false);
        return;
      }

      if (data?.code === 'FREE_LIMIT_REACHED' || data?.limitReached) {
        setFreeLimitReached(true);
        const count = data.freeAnalysisCount ?? maxFreeAnalyses;
        setFreeAnalysisCount(count);
        try {
          localStorage.setItem('falcon_cached_free_count', String(count));
          localStorage.setItem('falcon_cached_limit_reached', 'true');
        } catch (_) {}
        setIsUpgradeModalOpen(true);
        setErrorMessage(data.error || 'Lifetime free limit reached: You have completed all 3 free chart analyses. Free access is permanently locked. Upgrade to PRO to continue.');
        setIsAnalyzing(false);
        return;
      }

      if (!response.ok || !data) {
        throw new Error(data?.error || 'Failed to analyze chart screenshot.');
      }

      if (typeof data.freeAnalysisCount === 'number') {
        setFreeAnalysisCount(data.freeAnalysisCount);
        const reached = data.freeAnalysisCount >= maxFreeAnalyses || Boolean(data.freeLimitReached);
        if (reached) {
          setFreeLimitReached(true);
        }
        try {
          localStorage.setItem('falcon_cached_free_count', String(data.freeAnalysisCount));
          localStorage.setItem('falcon_cached_limit_reached', String(reached));
        } catch (_) {}
      }

      const resultObj = data.data || data.result || data.analysis;
      if (resultObj) {
        setAnalysisResult(resultObj);
      } else {
        throw new Error(data?.error || 'Analysis completed but result object was missing.');
      }

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#245BDB', '#16A36A', '#D99718'],
        });
      } catch (_) {}

    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'An error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ------------------------------------------------------------------
  // ROUTE 1: PRIVATE OWNER / ADMIN INTERFACE (/owner or /admin)
  // ------------------------------------------------------------------
  if (currentPath === '/owner' || currentPath === '/admin') {
    return (
      <OwnerAdminPortal
        ownerToken={ownerToken}
        isOwner={isOwner}
        ownerUser={ownerUser}
        onLoginSuccess={handleOwnerLoginSuccess}
        onLogout={handleOwnerLogout}
        onNavigateHome={() => navigateTo('/terminal')}
      />
    );
  }

  // ------------------------------------------------------------------
  // ROUTE 2: PUBLIC USER INTERFACE (/)
  // ------------------------------------------------------------------
  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-200 bg-[#F2F4F8] dark:bg-[#0B0F19] text-[#182338] dark:text-[#F1F5F9]"
    >
      {/* Public Header with Unified Settings/Menu Dropdown */}
      <Header
        onReset={handleReset}
        isAnalyzing={isAnalyzing}
        isProUser={isProUser}
        authUser={authUser}
        isOwner={isOwner}
        onOpenOwnerPortal={() => navigateTo('/owner')}
        onOpenLogin={() => {
          setAuthModalTab('signin');
          setIsUserAccountModalOpen(true);
        }}
        onOpenRegister={() => {
          setAuthModalTab('register');
          setIsUserAccountModalOpen(true);
        }}
        onOpenUserAccountModal={() => {
          setAuthModalTab(authUser ? 'account' : 'signin');
          setIsUserAccountModalOpen(true);
        }}
        onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        onLogout={handleUserLogout}
        freeAnalysisCount={freeAnalysisCount}
        maxFreeAnalyses={maxFreeAnalyses}
        freeLimitReached={freeLimitReached}
        currentView={viewMode}
        isDarkMode={theme === 'dark'}
        onToggleTheme={toggleTheme}
        onSelectView={(v) => {
          setViewMode(v);
          if (v === 'terminal') {
            window.location.hash = '/terminal';
          } else {
            if (window.location.hash === '#/terminal' || window.location.hash === '#terminal') {
              try {
                window.history.pushState(null, '', window.location.pathname);
              } catch (_) {
                window.location.hash = '';
              }
            }
          }
        }}
      />

      {paymentBanner && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
          <div
            className={`text-xs font-mono p-4 rounded-xl flex items-center justify-between gap-3 border shadow-xs ${
              paymentBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {paymentBanner.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-[#16A36A] shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#D99718] shrink-0" />
              )}
              <span className="leading-relaxed font-semibold">{paymentBanner.message}</span>
            </div>
            <button
              onClick={() => setPaymentBanner(null)}
              className="text-[#64748B] hover:text-[#182338] cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono p-4 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#DC4655] shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-[#DC4655] hover:text-rose-950">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {viewMode === 'landing' ? (
        <LandingPage
          onLaunchTerminal={() => {
            if (authUser || isOwner) {
              setViewMode('terminal');
              window.location.hash = '/terminal';
            } else {
              setAuthModalTab('signin');
              setIsUserAccountModalOpen(true);
            }
          }}
          onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
          onOpenLogin={() => {
            setAuthModalTab('signin');
            setIsUserAccountModalOpen(true);
          }}
          onOpenRegister={() => {
            setAuthModalTab('register');
            setIsUserAccountModalOpen(true);
          }}
          freeAnalysisCount={freeAnalysisCount}
          maxFreeAnalyses={maxFreeAnalyses}
          freeLimitReached={freeLimitReached}
          isProUser={isProUser}
          authUser={authUser}
        />
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <ChartUploader
              images={images}
              setImages={setImages}
              activeImageIndex={activeImageIndex}
              setActiveImageIndex={setActiveImageIndex}
              plan={plan}
              setPlan={handleUserPlanChange}
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
              <div className="h-full min-h-[380px] bg-white border border-[#D8DFEA] rounded-xl flex flex-col items-center justify-center p-8 text-center text-[#64748B] shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-[#E8F0FF] border border-[#D8DFEA] flex items-center justify-center text-[#245BDB] mb-3">
                  <BarChart2 className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-mono font-bold text-[#182338] mb-1">
                  Upload a chart screenshot to begin analysis.
                </h3>
                <p className="text-xs font-mono text-[#64748B] max-w-sm">
                  Upload TradingView, MT4/5, or Binance screenshots for real-time technical analysis.
                </p>
              </div>
            )}

            {/* Pro 3 Charts: Result Card separately below the chart view */}
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
          <div className="space-y-6 pt-4 border-t border-[#D8DFEA]">
            <FreeTradeSetupCard
              signal={analysisResult.verdict?.signal}
              entryZone={analysisResult.entryZone}
              stopLoss={analysisResult.stopLoss}
              takeProfit1={analysisResult.takeProfit1}
              takeProfit2={analysisResult.takeProfit2}
              asset={analysisResult.asset}
              timeframe={analysisResult.timeframe}
              tradingStyle={tradingStyle || analysisResult.tradingStyle}
              marketStructure={analysisResult.marketStructure}
              supportLevels={analysisResult.supportLevels}
              resistanceLevels={analysisResult.resistanceLevels}
              reason={analysisResult.verdict?.summary || analysisResult.detailedExplanation}
              marketTrend={analysisResult.marketTrend}
              riskRewardRatio={analysisResult.riskRewardRatio}
              confidence={analysisResult.confidence}
              tradePlanExecution={analysisResult.tradePlanExecution}
            />
          </div>
        )}
      </main>
      )}

      {/* Discreet Footer with subtle Owner/Admin Access Link */}
      <footer className="mt-auto border-t border-[#D8DFEA] bg-white py-4 px-4 sm:px-6">
        <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#182338]">Falcon Analyze</span>
            <span className="text-[#94A3B8]">&bull;</span>
            <span className="text-[#64748B]">Institutional AI Market Intelligence</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-[#94A3B8]">Multi-Timeframe Confluence Engine</span>
            <span className="hidden md:inline text-[#94A3B8]">&bull;</span>
            <a
              href="#/owner"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('#/owner');
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#245BDB] transition-colors opacity-75 hover:opacity-100 cursor-pointer"
              title="Owner / Admin Portal Access"
              id="owner-admin-access-link"
            >
              <Lock className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Owner / Admin</span>
            </a>
          </div>
        </div>
      </footer>

      <ProUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        isProUser={isProUser}
        userIdentifier={userIdentifier || userId}
        authUser={authUser}
        onOpenAccountModal={() => {
          setIsUpgradeModalOpen(false);
          setAuthModalTab('signin');
          setIsUserAccountModalOpen(true);
        }}
        onActivatePro={handleActivateLicenseKey}
        onDeactivatePro={handleDeactivatePro}
        freeLimitReached={freeLimitReached}
        initialLicenseKey={prefilledLicenseKey}
      />

      <PaymentSuccessModal
        isOpen={isPaymentSuccessModalOpen}
        onClose={() => setIsPaymentSuccessModalOpen(false)}
        reference={paymentSuccessReference}
        onOpenUpgradeModalWithKey={(key) => {
          setIsPaymentSuccessModalOpen(false);
          setPrefilledLicenseKey(key);
          setIsUpgradeModalOpen(true);
        }}
        onAutoActivatePro={async (key) => {
          await handleActivateLicenseKey(key);
          setIsProUser(true);
          setPlan('pro');
        }}
      />

      <UserAccountModal
        isOpen={isUserAccountModalOpen}
        onClose={() => setIsUserAccountModalOpen(false)}
        authUser={authUser}
        isOwner={isOwner}
        isPaidPro={isProUser}
        freeAnalysisCount={freeAnalysisCount}
        maxFreeAnalyses={maxFreeAnalyses}
        onLogin={handleUserLogin}
        onRegister={handleUserRegister}
        onLogout={handleUserLogout}
        onOpenUpgradeModal={() => {
          setIsUserAccountModalOpen(false);
          setIsUpgradeModalOpen(true);
        }}
        onActivateLicenseKey={handleActivateLicenseKey}
        initialTab={authModalTab}
      />
    </div>
  );
}