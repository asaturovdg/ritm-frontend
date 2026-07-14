import { createContext, useContext, useState, useCallback } from 'react';
import changelog from '../../data/changelog.json';

const STORAGE_KEY = 'whats_new_seen';
const MAX_RELEASES_SHOWN = 5;
const allReleases = changelog.releases;
const latest = allReleases[0];

function getMissedReleases(savedVersion) {
  if (savedVersion == null) {
    return latest.items.length > 0 ? [latest] : [];
  }

  const savedIndex = allReleases.findIndex((r) => r.version === savedVersion);
  if (savedIndex === -1) {
    return latest.items.length > 0 ? [latest] : [];
  }

  return allReleases
    .slice(0, savedIndex)
    .filter((r) => r.items.length > 0)
    .slice(0, MAX_RELEASES_SHOWN);
}

const WhatsNewContext = createContext(null);

export function WhatsNewProvider({ children }) {
  const [releases] = useState(() =>
    getMissedReleases(localStorage.getItem(STORAGE_KEY))
  );
  const [visible, setVisible] = useState(() => releases.length > 0);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, latest.version);
    setVisible(false);
  }, []);

  return (
    <WhatsNewContext.Provider value={{ visible, dismiss, releases }}>
      {children}
    </WhatsNewContext.Provider>
  );
}

export function useWhatsNew() {
  return useContext(WhatsNewContext);
}
