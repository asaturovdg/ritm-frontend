import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PLATFORMS = {
  TELEGRAM: 'telegram',
  VK: 'vk',
  MAX: 'max',
  WEB: 'web'
};

const AUTH_ENDPOINTS = {
  telegram: 'https://ritmevents.ru/api/v1/auth/telegram',
  vk: 'https://ritmevents.ru/api/v1/auth/vk',
  max: 'https://ritmevents.ru/api/v1/auth/max'
};

const detectPlatform = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userAgent = navigator.userAgent.toLowerCase();

  if (typeof window !== 'undefined' && window.WebApp?.initData) {
    return PLATFORMS.MAX;
  }

  if (
    userAgent.includes('messengermax') ||
    urlParams.get('initData') ||
    urlParams.get('init_data') ||
    window.__MESSENGER_MAX__
  ) {
    return PLATFORMS.MAX;
  }

  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    return PLATFORMS.TELEGRAM;
  }

  if (userAgent.includes('telegram') || urlParams.get('tgWebAppData')) {
    return PLATFORMS.TELEGRAM;
  }

  if (
    urlParams.get('vk_access_token_settings') ||
    urlParams.get('vk_app_id') ||
    urlParams.get('vk_platform')
  ) {
    return PLATFORMS.VK;
  }

  return PLATFORMS.WEB;
};

const getInitData = (platform) => {
  switch (platform) {
    case PLATFORMS.TELEGRAM:
      return window.Telegram?.WebApp?.initData ?? null;

    case PLATFORMS.VK: {
      const p = new URLSearchParams(window.location.search);
      return {
        init_data: p.get('vk_init_data') || p.get('init_data'),
        vk_user_id: p.get('vk_user_id'),
        vk_app_id: p.get('vk_app_id'),
        sign: p.get('sign')
      };
    }

    case PLATFORMS.MAX: {
      if (window.WebApp?.initData) {
        return window.WebApp.initData;
      }
      const p = new URLSearchParams(window.location.search);
      return p.get('initData') || p.get('init_data');
    }

    default:
      return null;
  }
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [platform, setPlatform] = useState(null);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showInputCode, setShowInputCode] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [userData, setUserData] = useState(null);

  // GET /users/me — returns user object or null. No refresh logic.
  const fetchUserData = useCallback(async (accessToken) => {
    try {
      const res = await fetch('https://ritmevents.ru/api/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUserId(data.id);
        setUserData(data);
        localStorage.setItem('user_id', String(data.id));
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // POST /auth/refresh — returns new access_token string or null.
  // On failure clears stored tokens.
  const tryRefresh = useCallback(async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return null;
    try {
      const res = await fetch('https://ritmevents.ru/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        return data.access_token;
      }
    } catch { /* network error, fall through */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return null;
  }, []);

  // POST /auth/{platform} — returns { success, error? }.
  const authorize = useCallback(async (platformType) => {
    const initData = getInitData(platformType);
    if (!initData) return { success: false, error: 'No init data' };

    try {
      const body = platformType === PLATFORMS.VK ? initData : { init_data: initData };
      const response = await fetch(AUTH_ENDPOINTS[platformType], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('platform', platformType);
        setToken(data.access_token);
        await fetchUserData(data.access_token);
        setIsAuthReady(true);
        return { success: true };
      }

      return { success: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [fetchUserData]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const initSdk = () => {
          if (window.WebApp?.initData) {
            window.WebApp.ready();
            return PLATFORMS.MAX;
          }
          if (window.Telegram?.WebApp?.initData) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            return PLATFORMS.TELEGRAM;
          }
          return detectPlatform();
        };

        const detectedPlatform = initSdk();
        setPlatform(detectedPlatform);

        // 2. Try cached access_token
        const savedToken = localStorage.getItem('access_token');
        if (savedToken) {
          const user = await fetchUserData(savedToken);
          if (user) {
            setToken(savedToken);
            setIsAuthReady(true);
            return;
          }

          // 3. Token invalid — try refresh
          const newToken = await tryRefresh();
          if (newToken) {
            const user = await fetchUserData(newToken);
            if (user) {
              setToken(newToken);
              setIsAuthReady(true);
              return;
            }
          }
        }

        // 4. Platform auth (Telegram / VK / MAX)
        if (detectedPlatform !== PLATFORMS.WEB) {
          const result = await authorize(detectedPlatform);
          if (result.success) return;
          setAuthError(result.error);
          return; // non-WEB: no code-input fallback
        }

        // 5. WEB only: show manual code input
        setShowInputCode(true);
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (detectPlatform() === PLATFORMS.WEB) {
          setShowInputCode(true);
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initAuth();
  }, [authorize, fetchUserData, tryRefresh]);

  return (
    <AuthContext.Provider value={{
      platform,
      token,
      userId,
      userData,
      isAuthReady,
      isCheckingAuth,
      showInputCode,
      setShowInputCode,
      authError,
      setAuthError,
      setIsAuthReady,
      setToken,
      setUserId,
      authorize
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
