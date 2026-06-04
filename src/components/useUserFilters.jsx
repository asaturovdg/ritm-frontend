import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';

const API_URL = 'https://ritmevents.ru/api/v1';
const FILTERS_KEY = 'user_filters_session';

const parseField = (value) =>
  value ? value.split(',').map(s => s.trim()).filter(s => s && s !== 'string') : [];

export const parseFiltersFromUserData = (userData) => ({
  cities: parseField(userData.city),
  categories: parseField(userData.track),
  eventTypes: parseField(userData.preferred_event_types),
  participationTypes: parseField(userData.preferred_participation_types),
});

const EMPTY_FILTERS = {
  cities: [],
  categories: [],
  eventTypes: [],
  participationTypes: [],
};

function readSessionFilters() {
  try {
    const stored = sessionStorage.getItem(FILTERS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

export function useUserFilters() {
  const { token, userId, userData, refreshUserData } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isSaving, setIsSaving] = useState(false);
  const initializedRef = useRef(false);
  const skipAutoSaveRef = useRef(false);
  const saveTimerRef = useRef(null);

  // Initialize once: sessionStorage (survives navigation) → userData (fresh load)
  useEffect(() => {
    if (!userData || initializedRef.current) return;
    initializedRef.current = true;
    skipAutoSaveRef.current = true; // don't PATCH on initialization
    const stored = readSessionFilters();
    setFilters(stored ?? parseFiltersFromUserData(userData));
  }, [userData]);

  // On every filter change: persist to sessionStorage + debounced PATCH to server
  useEffect(() => {
    if (!initializedRef.current) return;

    sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));

    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!token || !userId) return;
      try {
        const res = await fetch(`${API_URL}/users/${userId}/filters`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            city: filters.cities.join(','),
            track: filters.categories.join(','),
            preferred_event_types: filters.eventTypes.join(','),
            preferred_participation_types: filters.participationTypes.join(','),
          }),
        });
        if (res.ok) await refreshUserData();
      } catch (err) {
        console.error('Ошибка сохранения фильтров:', err);
      }
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [filters, token, userId, refreshUserData]);

  // Explicit save — cancels pending debounce and saves immediately
  const saveFilters = useCallback(async (filtersToSave) => {
    if (!token || !userId) return;
    clearTimeout(saveTimerRef.current);
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/users/${userId}/filters`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city: filtersToSave.cities.join(','),
          track: filtersToSave.categories.join(','),
          preferred_event_types: filtersToSave.eventTypes.join(','),
          preferred_participation_types: filtersToSave.participationTypes.join(','),
        }),
      });
      if (res.ok) await refreshUserData();
    } catch (err) {
      console.error('Ошибка сохранения фильтров:', err);
    } finally {
      setIsSaving(false);
    }
  }, [token, userId, refreshUserData]);

  return { filters, setFilters, saveFilters, isSaving };
}
