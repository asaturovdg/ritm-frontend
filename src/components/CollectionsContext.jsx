import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';

const defaultContext = {
  collections: [],
  loading: false,
  load: () => {},
  create: async () => null,
  rename: async () => {},
  remove: async () => {},
};

const CollectionsContext = createContext(defaultContext);

export function CollectionsProvider({ children }) {
  const { token, userId, isAuthReady } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const res = await fetch(`https://ritmevents.ru/api/v1/users/${userId}/collections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollections(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('CollectionsContext load error:', e);
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    if (isAuthReady && token && userId) load();
  }, [isAuthReady, token, userId, load]);

  const create = useCallback(async (name) => {
    const res = await fetch('https://ritmevents.ru/api/v1/collections', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('collection create failed');
    const created = await res.json();
    const collection = { id: created.id, name: created.name, event_count: 0 };
    setCollections(prev => [...prev, collection]);
    return collection;
  }, [token]);

  const rename = useCallback(async (id, name) => {
    const res = await fetch(`https://ritmevents.ru/api/v1/collections/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('collection rename failed');
    const updated = await res.json();
    setCollections(prev => prev.map(c => c.id === id ? { ...c, name: updated.name } : c));
  }, [token]);

  const remove = useCallback(async (id) => {
    const res = await fetch(`https://ritmevents.ru/api/v1/collections/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('collection delete failed');
    setCollections(prev => prev.filter(c => c.id !== id));
  }, [token]);

  return (
    <CollectionsContext.Provider value={{
      collections,
      loading,
      load,
      create,
      rename,
      remove,
    }}>
      {children}
    </CollectionsContext.Provider>
  );
}

export const useCollections = () => useContext(CollectionsContext);
