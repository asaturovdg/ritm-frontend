const getMaxHashParams = () => new URLSearchParams(window.location.hash.slice(1));

const mightBeTelegram = () => {
  const ua = navigator.userAgent.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  return ua.includes('telegram') || !!params.get('tgWebAppData');
};

const mightBeMax = () => {
  const ua = navigator.userAgent.toLowerCase();
  const hashParams = getMaxHashParams();
  const urlParams = new URLSearchParams(window.location.search);
  return (
    ua.includes('messengermax') ||
    !!hashParams.get('WebAppData') ||
    !!urlParams.get('initData') ||
    !!urlParams.get('init_data') ||
    !!window.__MESSENGER_MAX__
  );
};

const pollUntil = (check, timeoutMs = 3000, intervalMs = 50) =>
  new Promise((resolve) => {
    let elapsed = 0;
    const tick = () => {
      if (check() || elapsed >= timeoutMs) { resolve(); return; }
      elapsed += intervalMs;
      setTimeout(tick, intervalMs);
    };
    tick();
  });

// Telegram/Max inject their SDK as a dynamic async script, so window.load does not
// guarantee it has executed yet. Poll briefly before proceeding so that initData
// is available when we need it (auth, deep-link start_param, etc).
export const waitForPlatformSdk = async () => {
  if (document.readyState !== 'complete') {
    await new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  }

  if (mightBeTelegram() && !window.Telegram?.WebApp) {
    await pollUntil(() => !!window.Telegram?.WebApp);
  } else if (mightBeMax() && !window.WebApp?.initData) {
    await pollUntil(() => !!window.WebApp?.initData);
  }
};
