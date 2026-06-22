import { createContext, useContext, useState, useCallback } from 'react';
import changelog from '../../data/changelog.json';

const STORAGE_KEY = 'whats_new_seen';

const WhatsNewContext = createContext(null);

export function WhatsNewProvider({ children }) {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== changelog.version
  );

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, changelog.version);
    setVisible(false);
  }, []);

  return (
    <WhatsNewContext.Provider value={{ visible, dismiss, items: changelog.items }}>
      {children}
    </WhatsNewContext.Provider>
  );
}

export function useWhatsNew() {
  return useContext(WhatsNewContext);
}
