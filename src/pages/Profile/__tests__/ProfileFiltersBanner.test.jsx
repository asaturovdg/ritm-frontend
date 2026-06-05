import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let mockFilters = { cities: [], categories: [], eventTypes: [], participationTypes: [] };

vi.mock('../../../components/AuthContext.jsx', () => {
  const userData = {
    id: '1',
    city: '',
    track: '',
    preferred_event_types: '',
    preferred_participation_types: '',
    digest_period: 'daily',
    digest_day_of_week: null,
  };
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
    filters: mockFilters,
    setFilters: vi.fn(),
    saveFilters: vi.fn(),
    flushPendingSave: vi.fn(),
    isSaving: false,
  }),
}));

vi.mock('../../../components/useCalendar.jsx', () => ({
  useCalendar: () => ({ connectCalendar: vi.fn(), waitForCalendarConnection: vi.fn() }),
}));

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: vi.fn() }),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => [],
});

import { Profile } from '../Profile.jsx';

const render$ = (locationState) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/profile', state: locationState }]}>
      <Profile />
    </MemoryRouter>
  );

describe('Profile — inactive banner', () => {
  it('shows inactive banner when filters are empty', () => {
    mockFilters = { cities: [], categories: [], eventTypes: [], participationTypes: [] };
    render$();
    expect(screen.getByText(/Дайджест неактивен/)).toBeInTheDocument();
  });

  it('hides inactive banner when all 4 sections are filled', () => {
    mockFilters = { cities: ['Москва'], categories: ['IT'], eventTypes: ['Конференция'], participationTypes: ['Онлайн'] };
    render$();
    expect(screen.queryByText(/Дайджест неактивен/)).not.toBeInTheDocument();
  });

  it('opens myFilters tab when navigated with state.tab = myFilters', () => {
    mockFilters = { cities: [], categories: [], eventTypes: [], participationTypes: [] };
    render$({ tab: 'myFilters' });
    expect(screen.getByText('Категории')).toBeInTheDocument();
  });
});
