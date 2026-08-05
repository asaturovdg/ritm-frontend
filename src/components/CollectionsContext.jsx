import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';

const defaultContext = {
  collections: [],
  colors: [],
  loading: false,
  load: () => {},
  loadColors: async () => {},
  create: async () => null,
  rename: async () => {},
  changeColor: async () => {},
  remove: async () => {},
  bumpEventCount: () => {},
};

const CollectionsContext = createContext(defaultContext);

export function CollectionsProvider({ children }) {
  const { token, userId, isAuthReady } = useAuth();
  const [collections, setCollections] = useState([]);
  const [colors, setColors] = useState([]);
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

  const loadColors = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('https://ritmevents.ru/api/v1/collections/colors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setColors(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('CollectionsContext loadColors error:', e);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthReady && token && userId) {
      load();
      loadColors();
    }
  }, [isAuthReady, token, userId, load, loadColors]);

  const create = useCallback(async (name, color) => {
    const res = await fetch('https://ritmevents.ru/api/v1/collections', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(color ? { name, color } : { name }),
    });
    if (!res.ok) throw new Error('collection create failed');
    const created = await res.json();
    const collection = {
      id: created.id,
      name: created.name,
      ...(created.color !== undefined || color !== undefined ? { color: created.color ?? color ?? null } : {}),
      event_count: 0,
    };
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

  const changeColor = useCallback(async (id, color) => {
    const res = await fetch(`https://ritmevents.ru/api/v1/collections/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ color }),
    });
    if (!res.ok) throw new Error('collection color change failed');
    const updated = await res.json();
    setCollections(prev => prev.map(c => c.id === id ? { ...c, color: updated.color } : c));
  }, [token]);

  const remove = useCallback(async (id) => {
    const res = await fetch(`https://ritmevents.ru/api/v1/collections/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('collection delete failed');
    setCollections(prev => prev.filter(c => c.id !== id));
  }, [token]);

  const bumpEventCount = useCallback((id, delta) => {
    setCollections(prev => prev.map(c =>
      c.id === id ? { ...c, event_count: Math.max(0, c.event_count + delta) } : c
    ));
  }, []);

  return (
    <CollectionsContext.Provider value={{
      collections,
      colors,
      loading,
      load,
      loadColors,
      create,
      rename,
      changeColor,
      remove,
      bumpEventCount,
    }}>
      {children}
    </CollectionsContext.Provider>
  );
}

export const useCollections = () => useContext(CollectionsContext);
