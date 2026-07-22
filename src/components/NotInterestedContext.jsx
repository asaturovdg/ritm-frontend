import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';

const defaultContext = {
  notInterestedIds: new Set(),
  pendingIds: new Set(),
  markNotInterested: () => {},
  unmarkNotInterested: () => {},
  isNotInterested: () => false,
  isPending: () => false,
};

const NotInterestedContext = createContext(defaultContext);

export function NotInterestedProvider({ children }) {
  const { token } = useAuth();
  const [notInterestedIds, setNotInterestedIds] = useState(new Set());
  const [pendingIds, setPendingIds] = useState(new Set());

  const markNotInterested = useCallback(async (event, { source = 'list', block, reason } = {}) => {
    const eventId = event?.id ?? event;
    if (pendingIds.has(eventId)) return;
    setPendingIds(prev => new Set([...prev, eventId]));
    setNotInterestedIds(prev => new Set([...prev, eventId]));
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
      }
    } catch {
      setNotInterestedIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    } finally {
      setPendingIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    }
  }, [token, pendingIds]);

  const unmarkNotInterested = useCallback(async (eventId) => {
    if (pendingIds.has(eventId)) return;
    setPendingIds(prev => new Set([...prev, eventId]));
    setNotInterestedIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    try {
      const res = await fetch(`https://ritmevents.ru/api/v1/events/${eventId}/not-interested`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setNotInterestedIds(prev => new Set([...prev, eventId]));
      }
    } catch {
      setNotInterestedIds(prev => new Set([...prev, eventId]));
    } finally {
      setPendingIds(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    }
  }, [token, pendingIds]);

  const isNotInterested = useCallback((eventId) => notInterestedIds.has(eventId), [notInterestedIds]);
  const isPending = useCallback((eventId) => pendingIds.has(eventId), [pendingIds]);

  return (
    <NotInterestedContext.Provider value={{
      notInterestedIds,
      pendingIds,
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
