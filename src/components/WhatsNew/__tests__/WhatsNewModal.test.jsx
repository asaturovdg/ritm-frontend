import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WhatsNewModal, { formatReleaseDate } from '../WhatsNewModal.jsx';
import { WhatsNewProvider } from '../WhatsNewContext.jsx';
import changelog from '../../../data/changelog.json';

vi.mock('../../../data/changelog.json', () => ({
  default: {
    releases: [
      { version: '2026-08-01', items: ['Фича A'] },
      { version: '2026-07-15', items: [] },
      { version: '2026-07-01', items: ['Фича B', 'Фича C'] },
      { version: '2026-06-01', items: ['Фича D'] },
    ],
  },
}));

describe('formatReleaseDate', () => {
  it('formats YYYY-MM-DD as "D месяца" without a year', () => {
    expect(formatReleaseDate('2026-07-07')).toBe('7 июля');
    expect(formatReleaseDate('2026-01-01')).toBe('1 января');
  });
});

describe('WhatsNewModal', () => {
  let store = {};
  const localStorageMock = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
  };

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', localStorageMock);
  });

  it('renders a date heading and items list for each missed release', () => {
    const savedVersion = '2026-06-01';
    store['whats_new_seen'] = savedVersion;
    render(<WhatsNewProvider><WhatsNewModal /></WhatsNewProvider>);

    const savedIndex = changelog.releases.findIndex((r) => r.version === savedVersion);
    const expectedReleases = changelog.releases
      .slice(0, savedIndex)
      .filter((r) => r.items.length > 0)
      .slice(0, 5);

    expectedReleases.forEach((release) => {
      expect(screen.getByText(formatReleaseDate(release.version))).toBeInTheDocument();
      release.items.forEach((item) => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    expect(screen.queryByText('Фича D')).not.toBeInTheDocument();
  });

  it('does not render a date heading when there is only one release shown', () => {
    render(<WhatsNewProvider><WhatsNewModal /></WhatsNewProvider>);
    const latest = changelog.releases[0];
    expect(screen.queryByText(formatReleaseDate(latest.version))).not.toBeInTheDocument();
  });
});
