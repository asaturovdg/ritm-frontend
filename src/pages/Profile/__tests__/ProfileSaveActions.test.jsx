import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

// Stable references — prevent useEffect dependency churn that causes OOM
const userData = { id: '1', digest_period: 'daily', digest_day_of_week: null };
const saveFiltersFn = vi.fn().mockResolvedValue(undefined);
const setFiltersFn = vi.fn();
const flushPendingSaveFn = vi.fn();
const openLinkFn = vi.fn();
const connectCalendarFn = vi.fn();
const waitForCalendarConnectionFn = vi.fn();
const refreshUserDataFn = vi.fn();
const filledFilters = { cities: ['Москва'], categories: ['IT'], eventTypes: ['Конф'], participationTypes: ['Онлайн'] };

vi.mock('../../../components/AuthContext.jsx', () => {
  const userData = { id: '1', digest_period: 'daily', digest_day_of_week: null };
  return {
    useAuth: () => ({
      token: 'tok',
      userId: '1',
      userData,
      isCheckingAuth: false,
      refreshUserData: vi.fn(),
    }),
  };
});

vi.mock('../../../components/useUserFilters.jsx', () => ({
  useUserFilters: () => ({
    filters: filledFilters,
    setFilters: setFiltersFn,
    saveFilters: saveFiltersFn,
    flushPendingSave: flushPendingSaveFn,
    isSaving: false,
  }),
}));

vi.mock('../../../components/useCalendar.jsx', () => ({
  useCalendar: () => ({
    connectCalendar: connectCalendarFn,
    waitForCalendarConnection: waitForCalendarConnectionFn,
  }),
}));

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: openLinkFn }),
}));

global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });

import { Profile } from '../Profile.jsx';

let lastLocation;
function LocationRecorder() {
  lastLocation = useLocation();
  return null;
}

const render$ = () =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/profile', state: { tab: 'myFilters' } }]}>
      <LocationRecorder />
      <Profile />
    </MemoryRouter>
  );

describe('Profile — save actions', () => {
  beforeEach(() => {
    lastLocation = undefined;
    saveFiltersFn.mockClear();
  });

  it('navigates to digest after saving filters', async () => {
    render$();
    fireEvent.click(screen.getByText('Сохранить фильтры'));
    await waitFor(() => expect(lastLocation.pathname).toBe('/'));
  });

  it('shows "Периодичность сохранена!" after changing periodicity', async () => {
    render$();
    fireEvent.click(screen.getByText('Раз в 2 дня'));
    await waitFor(() =>
      expect(screen.getByText('Периодичность сохранена!')).toBeInTheDocument()
    );
  });

  it('does not show "Фильтры сохранены!" after changing periodicity', async () => {
    render$();
    fireEvent.click(screen.getByText('Каждый день'));
    await waitFor(() =>
      expect(screen.queryByText('Фильтры сохранены!')).not.toBeInTheDocument()
    );
  });
});
