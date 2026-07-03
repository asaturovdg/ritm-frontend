import { useState, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';

const API_URL = 'https://ritmevents.ru/api/v1';

export function useCalendarPromptPreference() {
  const { token, userId, userData, refreshUserData } = useAuth();
  const [override, setOverride] = useState(null);
  const [isPending, setIsPending] = useState(false);

  const skipPrompt = override !== null
    ? override
    : Boolean(userData?.skip_external_calendar_prompt);

  const setSkipPrompt = useCallback(async (value) => {
    if (isPending) return;
    setIsPending(true);
    setOverride(value);
    if (!token || !userId) { setIsPending(false); return; }
    try {
      const res = await fetch(`${API_URL}/users/${userId}/calendar-preferences`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip_external_calendar_prompt: value }),
      });
      if (res.ok) {
        await refreshUserData();
        setOverride(null);
      } else {
        console.error('Ошибка сохранения настройки календаря:', res.status);
      }
    } catch (err) {
      console.error('Ошибка сохранения настройки календаря:', err);
    } finally {
      setIsPending(false);
    }
  }, [token, userId, refreshUserData, isPending]);

  return { skipPrompt, setSkipPrompt, isPending };
}
