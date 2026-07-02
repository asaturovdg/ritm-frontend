import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';

const API_URL = 'https://ritmevents.ru/api/v1';

export function useCalendarPromptPreference() {
  const { token, userId, userData, refreshUserData } = useAuth();
  const [skipPrompt, setSkipPromptState] = useState(
    Boolean(userData?.skip_external_calendar_prompt)
  );

  useEffect(() => {
    setSkipPromptState(Boolean(userData?.skip_external_calendar_prompt));
  }, [userData]);

  const setSkipPrompt = useCallback(async (value) => {
    setSkipPromptState(value);
    if (!token || !userId) return;
    try {
      const res = await fetch(`${API_URL}/users/${userId}/calendar-preferences`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip_external_calendar_prompt: value }),
      });
      if (res.ok) {
        await refreshUserData();
      } else {
        console.error('Ошибка сохранения настройки календаря:', res.status);
      }
    } catch (err) {
      console.error('Ошибка сохранения настройки календаря:', err);
    }
  }, [token, userId, refreshUserData]);

  return { skipPrompt, setSkipPrompt };
}
