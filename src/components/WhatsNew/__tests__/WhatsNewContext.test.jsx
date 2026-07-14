import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhatsNewProvider, useWhatsNew } from '../WhatsNewContext.jsx';
import changelog from '../../../data/changelog.json';

function Consumer() {
  const { visible, dismiss, releases } = useWhatsNew();
  return (
    <div>
      <span data-testid="visible">{String(visible)}</span>
      <span data-testid="releases">{JSON.stringify(releases.map((r) => r.version))}</span>
      <button onClick={dismiss}>dismiss</button>
    </div>
  );
}

const STORAGE_KEY = 'whats_new_seen';
const LATEST_VERSION = changelog.releases[0].version;

describe('WhatsNewContext', () => {
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

  it('shows popup when localStorage has no saved version', () => {
    render(<WhatsNewProvider><Consumer /></WhatsNewProvider>);
    expect(screen.getByTestId('visible').textContent).toBe('true');
  });

  it('hides popup when saved version matches current version', () => {
    store[STORAGE_KEY] = LATEST_VERSION;
    render(<WhatsNewProvider><Consumer /></WhatsNewProvider>);
    expect(screen.getByTestId('visible').textContent).toBe('false');
  });

  it('shows popup when saved version differs from current version', () => {
    store[STORAGE_KEY] = '2025-01-01';
    render(<WhatsNewProvider><Consumer /></WhatsNewProvider>);
    expect(screen.getByTestId('visible').textContent).toBe('true');
  });

  it('dismiss() hides the popup and saves version to localStorage', () => {
    render(<WhatsNewProvider><Consumer /></WhatsNewProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));
    expect(screen.getByTestId('visible').textContent).toBe('false');
    expect(store[STORAGE_KEY]).toBe(LATEST_VERSION);
  });

  it('shows only the latest release when no saved version exists (first visit)', () => {
    render(<WhatsNewProvider><Consumer /></WhatsNewProvider>);
    expect(screen.getByTestId('releases').textContent).toBe(JSON.stringify([LATEST_VERSION]));
  });

  it('shows only the latest release when saved version is not found in changelog', () => {
    store[STORAGE_KEY] = '1999-01-01';
    render(<WhatsNewProvider><Consumer /></WhatsNewProvider>);
    expect(screen.getByTestId('releases').textContent).toBe(JSON.stringify([LATEST_VERSION]));
  });

  it('shows all missed releases with non-empty items, newest first', () => {
    store[STORAGE_KEY] = '2020-01-01';
    render(<WhatsNewProvider><Consumer /></WhatsNewProvider>);
    const shown = JSON.parse(screen.getByTestId('releases').textContent);
    const expected = changelog.releases
      .filter((r) => r.items.length > 0)
      .slice(0, 5)
      .map((r) => r.version);
    expect(shown).toEqual(expected);
  });

  it('hides popup when saved version is the latest even if it is index 0', () => {
    store[STORAGE_KEY] = changelog.releases[0].version;
    render(<WhatsNewProvider><Consumer /></WhatsNewProvider>);
    expect(screen.getByTestId('visible').textContent).toBe('false');
  });
});
