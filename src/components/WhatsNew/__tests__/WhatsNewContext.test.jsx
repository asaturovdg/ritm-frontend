import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhatsNewProvider, useWhatsNew } from '../WhatsNewContext.jsx';
import changelog from '../../../data/changelog.json';

function Consumer() {
  const { visible, dismiss } = useWhatsNew();
  return (
    <div>
      <span data-testid="visible">{String(visible)}</span>
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
});
