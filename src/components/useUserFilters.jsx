import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';

const API_URL = 'https://ritmevents.ru/api/v1';

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

export function useUserFilters() {
  const { token, userId, userData } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isSaving, setIsSaving] = useState(false);
  const initializedRef = useRef(false);

  // Apply server filters exactly once per mount
  useEffect(() => {
    if (!userData || initializedRef.current) return;
    initializedRef.current = true;
    setFilters(parseFiltersFromUserData(userData));
  }, [userData]);

  const saveFilters = useCallback(async (filtersToSave) => {
    if (!token || !userId) return;
    setIsSaving(true);
    try {
      await fetch(`${API_URL}/users/${userId}/filters`, {
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
    } catch (err) {
      console.error('Ошибка сохранения фильтров:', err);
    } finally {
      setIsSaving(false);
    }
  }, [token, userId]);

  return { filters, setFilters, saveFilters, isSaving };
}
