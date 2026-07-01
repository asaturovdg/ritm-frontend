import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { CALENDAR_ALLOWLIST, hasFeature } from '../data/featureFlags.js';

const defaultContext = {
  savedEvents: [],
  savedIds: new Set(),
  loading: false,
  saveEvent: () => {},
  unsaveEvent: () => {},
  isSaved: () => false,
  isInExternalCalendar: () => false,
};

const SavedEventsContext = createContext(defaultContext);

export function SavedEventsProvider({ children }) {
  const { token, userId, isAuthReady } = useAuth();
  const [savedEvents, setSavedEvents] = useState([]);   // full event objects
  const [savedIds, setSavedIds] = useState(new Set());  // fast lookup
  const [externalIds, setExternalIds] = useState(new Set()); // event_ids in Google/Yandex
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const [savedRes, extRes] = await Promise.all([
        fetch(`https://ritmevents.ru/api/v1/users/${userId}/saved-events`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`https://ritmevents.ru/api/v1/users/${userId}/calendar-events`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (savedRes.ok) {
        const data = await savedRes.json();
        const records = Array.isArray(data) ? data : [];
        const ids = records.map(e => e.event_id ?? e.id).filter(Boolean);
        setSavedIds(new Set(ids));

        if (ids.length > 0) {
          // records may not contain full event data — fetch by-ids
          const firstRecord = records[0] ?? {};
          const hasFullData = firstRecord.title != null || firstRecord.start_date != null;

          if (hasFullData) {
            setSavedEvents(records);
          } else {
            const url = new URL('https://ritmevents.ru/api/v1/events/by-ids');
            ids.forEach(id => url.searchParams.append('ids', id));
            const byIdsRes = await fetch(url.toString(), {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (byIdsRes.ok) {
              const fullEvents = await byIdsRes.json();
              setSavedEvents(Array.isArray(fullEvents) ? fullEvents : []);
            }
          }
        } else {
          setSavedEvents([]);
        }
      }

      if (extRes.ok) {
        const data = await extRes.json();
        setExternalIds(new Set((Array.isArray(data) ? data : []).map(e => e.event_id)));
      }
    } catch (e) {
      console.error('SavedEventsContext load error:', e);
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    if (isAuthReady && token && userId && hasFeature(CALENDAR_ALLOWLIST, userId)) load();
  }, [isAuthReady, token, userId, load]);

  const saveEvent = useCallback(async (eventObj) => {
    const eventId = eventObj.id ?? eventObj;
    setSavedIds(prev => new Set([...prev, eventId]));
    if (eventObj.id) {
      setSavedEvents(prev => prev.some(e => (e.id ?? e.event_id) === eventId) ? prev : [...prev, eventObj]);
    }
    try {
      const res = await fetch(`https://ritmevents.ru/api/v1/events/${eventId}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        setSavedIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
        setSavedEvents(prev => prev.filter(e => (e.id ?? e.event_id) !== eventId));
      }
    } catch {
      setSavedIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
      setSavedEvents(prev => prev.filter(e => (e.id ?? e.event_id) !== eventId));
    }
  }, [token]);

  const unsaveEvent = useCallback(async (eventId) => {
    setSavedIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    setSavedEvents(prev => prev.filter(e => (e.id ?? e.event_id) !== eventId));
    try {
      const res = await fetch(`https://ritmevents.ru/api/v1/events/${eventId}/save`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        // Revert: reload from server to get full object back
        load();
      }
    } catch {
      load();
    }
  }, [token, load]);

  const isSaved = useCallback((eventId) => savedIds.has(eventId), [savedIds]);
  const isInExternalCalendar = useCallback((eventId) => externalIds.has(eventId), [externalIds]);

  return (
    <SavedEventsContext.Provider value={{
      savedEvents,
      savedIds,
      loading,
      saveEvent,
      unsaveEvent,
      isSaved,
      isInExternalCalendar,
    }}>
      {children}
    </SavedEventsContext.Provider>
  );
}

export const useSavedEvents = () => useContext(SavedEventsContext);
