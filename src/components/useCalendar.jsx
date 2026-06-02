import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";
import { openLink } from "../data/platformService.js";

const API_URL = "https://ritmevents.ru/api/v1";

const PROVIDER_LABEL = { google: 'Google', yandex: 'Яндекс' };

export function useCalendar() {
  const { token, userId, platform } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // GET /users/{userId}/calendars → is provider active?
  const checkCalendarConnected = useCallback(async (provider) => {
    if (!token || !userId) return false;
    try {
      const res = await fetch(`${API_URL}/users/${userId}/calendars`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return false;
      const calendars = await res.json();
      return calendars.some(cal => cal.provider === provider && cal.is_active === true);
    } catch (err) {
      console.error('Ошибка проверки календаря:', err);
      return false;
    }
  }, [token, userId]);

  // POST /calendars/connect → oauth_url (throws on error)
  const connectCalendar = useCallback(async (provider) => {
    if (!token) throw new Error('Необходима авторизация');
    const res = await fetch(`${API_URL}/calendars/connect`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ошибка подключения: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data.oauth_url;
  }, [token]);

  // Polls GET /users/{userId}/calendars every second until connected.
  // Stops early if component unmounts. Returns boolean.
  const waitForCalendarConnection = useCallback(async (provider, maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!mountedRef.current) return false;
      try {
        const res = await fetch(`${API_URL}/users/${userId}/calendars`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const calendars = await res.json();
          if (calendars.some(cal => cal.provider === provider && cal.is_active === true)) {
            return true;
          }
        }
      } catch (err) {
        console.error('Ошибка ожидания календаря:', err);
      }
    }
    return false;
  }, [token, userId]);

  // POST /events/{eventId}/add-to-calendar (throws on error)
  const addEventToCalendar = useCallback(async (eventId, provider) => {
    const res = await fetch(`${API_URL}/events/${eventId}/add-to-calendar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ошибка добавления: ${res.status} ${text}`);
    }
    return res.json();
  }, [token]);

  // Full flow for Event page:
  //   check → if not connected: open OAuth → poll → add event
  // onSuccess(provider) and onError(message) are optional callbacks for UI reactions.
  const handleAddToCalendar = useCallback(async (eventId, provider, { onSuccess, onError } = {}) => {
    if (!token || !userId) {
      onError?.('Необходимо авторизоваться');
      return;
    }
    if (mountedRef.current) { setIsProcessing(true); setError(null); }
    try {
      const isConnected = await checkCalendarConnected(provider);

      if (!isConnected) {
        const oauthUrl = await connectCalendar(provider);
        openLink(oauthUrl, platform);
        const connected = await waitForCalendarConnection(provider);
        if (!connected) throw new Error('Не удалось подключить календарь. Попробуйте позже.');
      }

      await addEventToCalendar(eventId, provider);
      onSuccess?.(PROVIDER_LABEL[provider] ?? provider);
    } catch (err) {
      console.error('Ошибка добавления в календарь:', err);
      if (mountedRef.current) setError(err.message);
      onError?.(err.message);
    } finally {
      if (mountedRef.current) setIsProcessing(false);
    }
  }, [token, userId, platform, checkCalendarConnected, connectCalendar, waitForCalendarConnection, addEventToCalendar]);

  return {
    isProcessing,
    error,
    checkCalendarConnected,
    connectCalendar,
    waitForCalendarConnection,
    addEventToCalendar,
    handleAddToCalendar,
  };
}
