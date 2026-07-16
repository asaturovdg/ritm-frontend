import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Profile } from '../Profile.jsx';

const mockSetFilters = vi.fn();
const mockSaveFilters = vi.fn().mockResolvedValue(undefined);
const mockFlushPendingSave = vi.fn();

const fullFilters = {
  cities: ['Москва'],
  categories: ['IT'],
  eventTypes: ['Конференция'],
  participationTypes: ['Онлайн'],
};

vi.mock('../../../components/useUserFilters.jsx', () => ({
  useUserFilters: () => ({
    filters: fullFilters,
    setFilters: mockSetFilters,
    saveFilters: mockSaveFilters,
    flushPendingSave: mockFlushPendingSave,
    isSaving: false,
  }),
}));

vi.mock('../../../components/AuthContext.jsx', () => {
  // Stable object reference — prevents useEffect([userData]) from looping on every render
  const userData = {
    id: '42',
    digest_period: 'daily',
    digest_day_of_week: null,
    first_name: 'Иван',
    last_name: 'Иванов',
    photo_url: null,
    username: 'ivan_petrov',
  };
  return {
    useAuth: () => ({ token: 'test-token', userData, isCheckingAuth: false }),
  };
});

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

const renderProfile = () =>
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );

describe('Profile — filter flush on unmount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls flushPendingSave when the component unmounts', () => {
    const { unmount } = renderProfile();
    expect(mockFlushPendingSave).not.toHaveBeenCalled();
    unmount();
    expect(mockFlushPendingSave).toHaveBeenCalledOnce();
  });
});

describe('Profile — "Сбросить всё" button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls saveFilters with empty filters and NOT setFilters', () => {
    renderProfile();

    fireEvent.click(screen.getByText('Сбросить всё'));

    expect(mockSaveFilters).toHaveBeenCalledWith({
      cities: [],
      categories: [],
      eventTypes: [],
      participationTypes: [],
    });
    expect(mockSetFilters).not.toHaveBeenCalled();
  });
});

describe('Profile — user identification header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the page title and the user name from userData', () => {
    renderProfile();

    expect(screen.getByText('Профиль')).toBeInTheDocument();
    expect(screen.getByText('Иван Иванов')).toBeInTheDocument();
  });
});
