import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';

const API_URL = 'https://ritmevents.ru/api/v1';
const FILTERS_KEY = 'user_filters_session';

const parseField = (v) =>
  v ? v.split(',').map(s => s.trim()).filter(s => s && s !== 'string') : [];

export const parseFiltersFromUserData = (userData) => ({
  cities: parseField(userData.city),
  categories: parseField(userData.track),
  eventTypes: parseField(userData.preferred_event_types),
  participationTypes: parseField(userData.preferred_participation_types),
});

const EMPTY_FILTERS = { cities: [], categories: [], eventTypes: [], participationTypes: [] };

const FiltersContext = createContext(null);

export function FiltersProvider({ children }) {
  const { token, userId, userData, refreshUserData } = useAuth();
  const [filters, setFiltersState] = useState(EMPTY_FILTERS);
  const [isSaving, setIsSaving] = useState(false);

  const initializedRef = useRef(false);
  // Always-current values for use inside async callbacks / setTimeout
  const filtersRef = useRef(EMPTY_FILTERS);
  const saveTimerRef = useRef(null);
  // patchRef points to the latest closure so setTimeout never captures stale token/userId
  const patchRef = useRef(null);

  patchRef.current = useCallback(async (filtersToSave) => {
    if (!token || !userId) return;
    try {
      const res = await fetch(`${API_URL}/users/${userId}/filters`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: filtersToSave.cities.join(','),
          track: filtersToSave.categories.join(','),
          preferred_event_types: filtersToSave.eventTypes.join(','),
          preferred_participation_types: filtersToSave.participationTypes.join(','),
        }),
      });
      if (res.ok) {
        await refreshUserData();
      } else {
        console.error('Ошибка сохранения фильтров на сервер:', res.status, await res.text().catch(() => ''));
      }
    } catch (err) {
      console.error('Ошибка сохранения фильтров:', err);
    }
  }, [token, userId, refreshUserData]);

  // Initialize once: sessionStorage (survives navigation) → userData (server)
  useEffect(() => {
    if (!userData || initializedRef.current) return;
    initializedRef.current = true;
    try {
      const stored = sessionStorage.getItem(FILTERS_KEY);
      const initial = stored ? JSON.parse(stored) : parseFiltersFromUserData(userData);
      filtersRef.current = initial;
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify(initial));
      setFiltersState(initial);
    } catch {
      const initial = parseFiltersFromUserData(userData);
      filtersRef.current = initial;
      setFiltersState(initial);
    }
  }, [userData]);

  // setFilters: writes sessionStorage synchronously inside the state updater,
  // then schedules a debounced PATCH. The timer lives here in the context and
  // is never cancelled by component navigation — only by the next filter change.
  const setFilters = useCallback((valueOrUpdater) => {
    setFiltersState(prev => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      filtersRef.current = next;
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify(next));
      return next;
    });
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => patchRef.current(filtersRef.current), 800);
  }, []);

  // Explicit save: cancels debounce and PATCHes immediately
  const saveFilters = useCallback(async (filtersToSave) => {
    clearTimeout(saveTimerRef.current);
    filtersRef.current = filtersToSave;
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filtersToSave));
    setFiltersState(filtersToSave);
    setIsSaving(true);
    try {
      await patchRef.current(filtersToSave);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Flush: fires any pending debounced PATCH immediately (call on component unmount)
  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      patchRef.current(filtersRef.current);
    }
  }, []);

  // Save on app close — fires pending PATCH before the browser unloads
  useEffect(() => {
    const handle = () => {
      if (saveTimerRef.current) {
        patchRef.current(filtersRef.current);
      }
    };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, []);

  return (
    <FiltersContext.Provider value={{ filters, setFilters, saveFilters, flushPendingSave, isSaving }}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider');
  return ctx;
}
