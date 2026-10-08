import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventsDigest from '../EventsDigest.jsx';
import { ToastProvider } from '../../Toast/ToastContext.jsx';
import { NotInterestedProvider } from '../../NotInterestedContext.jsx';

vi.mock('../../TelegramLoginWidget/TelegramLoginWidget.jsx', () => ({
  default: () => null,
}));

vi.mock('@telegram-apps/telegram-ui', () => ({
  Button: ({ children, onClick, mode, size, className }) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
  Placeholder: ({ header, description, action }) => (
    <div><p>{header}</p><p>{description}</p>{action}</div>
  ),
}));

const mockSetFilters = vi.fn();
const mockSaveFilters = vi.fn().mockResolvedValue(undefined);
const mockFlushPendingSave = vi.fn();

const fullFilters = {
  cities: ['Москва'],
  categories: ['IT'],
  eventTypes: ['Конференция'],
  participationTypes: ['Онлайн'],
};

vi.mock('../../useUserFilters.jsx', () => ({
  useUserFilters: () => ({
    filters: fullFilters,
    setFilters: mockSetFilters,
    saveFilters: mockSaveFilters,
    flushPendingSave: mockFlushPendingSave,
    isSaving: false,
  }),
}));

const mockSetShowInputCode = vi.fn();

let mockUserId = '42';

vi.mock('../../AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    userId: mockUserId,
    isAuthReady: true,
    isCheckingAuth: false,
    showInputCode: false,
    setShowInputCode: mockSetShowInputCode,
    setToken: vi.fn(),
    setIsAuthReady: vi.fn(),
    refreshUserData: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: vi.fn(), expandApp: vi.fn() }),
}));


const renderDigest = () =>
  render(
    <MemoryRouter>
      <NotInterestedProvider>
        <ToastProvider>
          <EventsDigest />
        </ToastProvider>
      </NotInterestedProvider>
    </MemoryRouter>
  );


const searchBodies = () =>
  global.fetch.mock.calls
    .filter(([url]) => String(url).endsWith('/api/v1/search'))
    .map(([, init]) => JSON.parse(init.body));

const mockSearchResponse = (searchResponse) => {
  global.fetch = vi.fn().mockImplementation(async (url) => {
    if (String(url).endsWith('/api/v1/search')) {
      return { ok: true, json: async () => searchResponse };
    }
    return { ok: true, json: async () => ({ items: [], total: 0 }) };
  });
};

const typeQuery = (value) =>
  fireEvent.change(screen.getByPlaceholderText('Поиск мероприятий...'), { target: { value } });

describe('EventsDigest — период поиска', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('по умолчанию ищет без date_from/date_to', async () => {
    mockSearchResponse({ event_ids: [], total_outside_range: null });
    renderDigest();
    typeQuery('python');

    await vi.waitFor(() => expect(searchBodies().length).toBeGreaterThan(0));
    const body = searchBodies().at(-1);
    expect(body.query).toBe('python');
    expect(body.limit).toBe(100);
    expect(body).not.toHaveProperty('date_from');
    expect(body).not.toHaveProperty('date_to');
  });

  it('чип «Эта неделя» добавляет границы периода', async () => {
    mockSearchResponse({ event_ids: [], total_outside_range: 0 });
    renderDigest();
    typeQuery('python');
    fireEvent.click(await screen.findByText('Эта неделя'));

    await vi.waitFor(() => expect(searchBodies().at(-1)).toHaveProperty('date_from'));
    const body = searchBodies().at(-1);
    expect(body.date_to > body.date_from).toBe(true);
  });

  it('при пустом результате с периодом показывает подсказку и кнопку сброса', async () => {
    mockSearchResponse({ event_ids: [], total_outside_range: 7 });
    renderDigest();
    typeQuery('python');
    fireEvent.click(await screen.findByText('Эта неделя'));

    expect(await screen.findByText('Ничего за выбранный период')).toBeInTheDocument();
    expect(await screen.findByText('Есть ещё события в другие даты (7)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Искать по всем датам'));
    await vi.waitFor(() => expect(searchBodies().at(-1)).not.toHaveProperty('date_from'));
  });

  it('не показывает число, если total_outside_range = null', async () => {
    mockSearchResponse({ event_ids: [], total_outside_range: null });
    renderDigest();
    typeQuery('python');
    fireEvent.click(await screen.findByText('Эта неделя'));

    await screen.findByText('Ничего за выбранный период');
    expect(screen.queryByText(/Есть ещё события/)).not.toBeInTheDocument();
  });

  it('в режиме поиска нет недельной навигации', async () => {
    mockSearchResponse({ event_ids: [], total_outside_range: null });
    renderDigest();
    await vi.waitFor(() => expect(screen.getByTitle('Следующая неделя')).toBeInTheDocument());
    typeQuery('python');
    expect(screen.queryByTitle('Следующая неделя')).not.toBeInTheDocument();
  });
});
