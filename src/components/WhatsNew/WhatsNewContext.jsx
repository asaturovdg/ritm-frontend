import { createContext, useContext, useState, useCallback } from 'react';
import changelog from '../../data/changelog.json';

const STORAGE_KEY = 'whats_new_seen';
const latest = changelog.releases[0];

const WhatsNewContext = createContext(null);

export function WhatsNewProvider({ children }) {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== latest.version
  );

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, latest.version);
    setVisible(false);
  }, []);

  return (
    <WhatsNewContext.Provider value={{ visible, dismiss, items: latest.items }}>
      {children}
    </WhatsNewContext.Provider>
  );
}

export function useWhatsNew() {
  return useContext(WhatsNewContext);
}
