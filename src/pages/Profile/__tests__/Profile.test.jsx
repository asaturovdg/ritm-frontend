import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Profile } from '../Profile.jsx';
import { NotInterestedProvider } from '../../../components/NotInterestedContext.jsx';

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

let mockUserId = '42';

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
    useAuth: () => ({ token: 'test-token', userData, isCheckingAuth: false, isAuthReady: true, userId: mockUserId }),
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

describe('Profile — hidden events subtab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = '42';
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
  });

  it('does not show the Пойду/Скрытые toggle for non-allowlisted users', () => {
    renderProfile();

    fireEvent.click(screen.getByText('События'));

    expect(screen.queryByText('Скрытые')).not.toBeInTheDocument();
  });

  it('shows the toggle and an empty hint for allowlisted users with no hidden events', () => {
    mockUserId = '88';
    renderProfile();

    fireEvent.click(screen.getByText('События'));
    fireEvent.click(screen.getByText('Скрытые'));

    expect(screen.getByText('Скрытых событий нет')).toBeInTheDocument();
  });

  it('renders a populated hidden event and removes it when "Вернуть в дайджест" is clicked', async () => {
    mockUserId = '88';
    global.fetch = vi.fn((url, options) => {
      const u = String(url);
      if (options?.method === 'DELETE') {
        return Promise.resolve({ ok: true });
      }
      if (u.includes('/not-interested-events')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([{ id: 99, title: 'Hidden Test Event', start_date: '2026-09-01', event_type: ['Конференция'] }]),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ([]) });
    });

    render(
      <MemoryRouter>
        <NotInterestedProvider>
          <Profile />
        </NotInterestedProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('События'));
    fireEvent.click(await screen.findByText('Скрытые'));

    const title = await screen.findByText('Hidden Test Event');
    expect(title).toBeInTheDocument();

    fireEvent.click(screen.getByText('Вернуть в дайджест'));

    await vi.waitFor(() => {
      expect(screen.queryByText('Hidden Test Event')).not.toBeInTheDocument();
    });
  });
});
