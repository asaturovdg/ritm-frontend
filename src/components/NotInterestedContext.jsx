import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';

const defaultContext = {
  notInterestedIds: new Set(),
  hiddenEvents: [],
  pendingIds: new Set(),
  loading: false,
  markNotInterested: () => {},
  unmarkNotInterested: () => {},
  isNotInterested: () => false,
  isPending: () => false,
};

const NotInterestedContext = createContext(defaultContext);

export function NotInterestedProvider({ children }) {
  const { token, userId, isAuthReady } = useAuth();
  const [notInterestedIds, setNotInterestedIds] = useState(new Set());
  const [hiddenEvents, setHiddenEvents] = useState([]);
  const [pendingIds, setPendingIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const res = await fetch(`https://ritmevents.ru/api/v1/users/${userId}/not-interested-events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const records = Array.isArray(data) ? data : [];
        const ids = records.map(e => e.event_id ?? e.id).filter(Boolean);
        setNotInterestedIds(new Set(ids));

        if (ids.length > 0) {
          const firstRecord = records[0] ?? {};
          const hasFullData = firstRecord.title != null || firstRecord.start_date != null;

          if (hasFullData) {
            setHiddenEvents(records);
          } else {
            const url = new URL('https://ritmevents.ru/api/v1/events/by-ids');
            ids.forEach(id => url.searchParams.append('ids', id));
            const byIdsRes = await fetch(url.toString(), {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (byIdsRes.ok) {
              const fullEvents = await byIdsRes.json();
              setHiddenEvents(Array.isArray(fullEvents) ? fullEvents : []);
            } else {
              setHiddenEvents(records);
            }
          }
        } else {
          setHiddenEvents([]);
        }
      }
    } catch (e) {
      console.error('NotInterestedContext load error:', e);
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    if (isAuthReady && token && userId) load();
  }, [isAuthReady, token, userId, load]);

  const markNotInterested = useCallback(async (event, { source = 'list', block, reason } = {}) => {
    const eventId = event?.id ?? event;
    if (pendingIds.has(eventId)) return;
    setPendingIds(prev => new Set([...prev, eventId]));
    setNotInterestedIds(prev => new Set([...prev, eventId]));
    if (event?.id) {
      setHiddenEvents(prev => prev.some(e => (e.id ?? e.event_id) === eventId) ? prev : [...prev, event]);
    }
    try {
      const body = { source };
      if (block !== undefined) body.block = block;
      if (reason !== undefined) body.reason = reason;
      const res = await fetch(`https://ritmevents.ru/api/v1/events/${eventId}/not-interested`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setNotInterestedIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
        setHiddenEvents(prev => prev.filter(e => (e.id ?? e.event_id) !== eventId));
      }
    } catch {
      setNotInterestedIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
      setHiddenEvents(prev => prev.filter(e => (e.id ?? e.event_id) !== eventId));
    } finally {
      setPendingIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    }
  }, [token, pendingIds]);

  const unmarkNotInterested = useCallback(async (eventId) => {
    if (pendingIds.has(eventId)) return;
    setPendingIds(prev => new Set([...prev, eventId]));
    setNotInterestedIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    setHiddenEvents(prev => prev.filter(e => (e.id ?? e.event_id) !== eventId));
    try {
      const res = await fetch(`https://ritmevents.ru/api/v1/events/${eventId}/not-interested`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        load();
      }
    } catch {
      load();
    } finally {
      setPendingIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    }
  }, [token, pendingIds, load]);

  const isNotInterested = useCallback((eventId) => notInterestedIds.has(eventId), [notInterestedIds]);
  const isPending = useCallback((eventId) => pendingIds.has(eventId), [pendingIds]);

  return (
    <NotInterestedContext.Provider value={{
      notInterestedIds,
      hiddenEvents,
      pendingIds,
      loading,
      markNotInterested,
      unmarkNotInterested,
      isNotInterested,
      isPending,
    }}>
      {children}
    </NotInterestedContext.Provider>
  );
}

export const useNotInterested = () => useContext(NotInterestedContext);
