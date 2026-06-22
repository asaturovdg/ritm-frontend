import { useEffect, useRef, useState } from 'react';

const WIDGET_TIMEOUT_MS = 5000;
const IFRAME_CHECK_DELAY_MS = 300;
const AUTH_ENDPOINT = 'https://ritmevents.ru/api/v1/auth/telegram-widget';

export default function TelegramLoginWidget({ onSuccess, onError, onStatusChange }) {
  const [status, setStatus] = useState('loading');
  const containerRef = useRef(null);

  const updateStatus = (s) => {
    setStatus(s);
    onStatusChange?.(s);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window.onTelegramAuth = async (user) => {
      try {
        const res = await fetch(AUTH_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        if (res.ok) {
          onSuccess(await res.json());
        } else {
          onError(`HTTP ${res.status}`);
        }
      } catch {
        onError('Ошибка соединения');
      }
    };

    const timer = setTimeout(() => updateStatus('failed'), WIDGET_TIMEOUT_MS);

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', import.meta.env.VITE_TG_BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    script.onerror = () => {
      clearTimeout(timer);
      updateStatus('failed');
    };

    script.onload = () => {
      clearTimeout(timer);
      setTimeout(() => {
        const iframe = container.querySelector('iframe');
        const hasErrorText = container.textContent.trim().length > 0;
        updateStatus(iframe && !hasErrorText ? 'ready' : 'failed');
      }, IFRAME_CHECK_DELAY_MS);
    };

    container.appendChild(script);

    return () => {
      clearTimeout(timer);
      delete window.onTelegramAuth;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ display: status === 'ready' ? 'block' : 'none' }}
    />
  );
}
