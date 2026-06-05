import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('@telegram-apps/telegram-ui', () => ({
  Button: ({ children, onClick, className }) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
  Placeholder: ({ header, description, action, children }) => (
    <div><p>{header}</p><p>{description}</p>{action}{children}</div>
  ),
}));

// Stable references — prevent useCallback dependency churn that causes infinite render loops
const setShowInputCodeFn = vi.fn();
const emptyFilters = { cities: [], categories: [], eventTypes: [], participationTypes: [] };
const openLinkFn = vi.fn();
const expandAppFn = vi.fn();

vi.mock('../../AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'tok',
    userId: '1',
    isAuthReady: true,
    isCheckingAuth: false,
    showInputCode: false,
    setShowInputCode: setShowInputCodeFn,
  }),
}));

vi.mock('../../useUserFilters.jsx', () => ({
  useUserFilters: () => ({
    filters: emptyFilters,
    setFilters: vi.fn(),
  }),
}));

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: openLinkFn, expandApp: expandAppFn }),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ items: [], total: 0 }),
});

import EventsDigest from '../EventsDigest.jsx';

// Records current router location so tests can assert on navigation
let lastLocation;
function LocationRecorder() {
  lastLocation = useLocation();
  return null;
}

const render$ = () =>
  render(
    <MemoryRouter initialEntries={['/digest']}>
      <LocationRecorder />
      <EventsDigest />
    </MemoryRouter>
  );

describe('EventsDigest — inactive placeholder', () => {
  beforeEach(() => {
    lastLocation = undefined;
  });

  it('shows "Дайджест неактивен" when no filters are set', () => {
    render$();
    expect(screen.getByText('Дайджест неактивен')).toBeInTheDocument();
  });

  it('shows "Настроить предпочтения" button when no filters', () => {
    render$();
    expect(screen.getByRole('button', { name: /настроить предпочтения/i })).toBeInTheDocument();
  });

  it('navigates to /profile with myFilters state when button clicked', () => {
    render$();
    fireEvent.click(screen.getByRole('button', { name: /настроить предпочтения/i }));
    expect(lastLocation.pathname).toBe('/profile');
    expect(lastLocation.state).toEqual({ tab: 'myFilters' });
  });
});
