import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventsDigest from '../EventsDigest.jsx';

vi.mock('../../TelegramLoginWidget/TelegramLoginWidget.jsx', () => ({
  default: () => null,
}));

vi.mock('@telegram-apps/telegram-ui', () => ({
  Button: ({ children, onClick, mode, size, className }) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
  Placeholder: ({ header, description }) => (
    <div><p>{header}</p><p>{description}</p></div>
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

vi.mock('../../AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    userId: '42',
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

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ items: [], total: 0 }),
});

const renderDigest = () =>
  render(
    <MemoryRouter>
      <EventsDigest />
    </MemoryRouter>
  );

describe('EventsDigest — event card tracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 1,
            title: 'Test Event',
            start_date: '2099-01-01',
            start_time: '10:00',
            city: ['Москва'],
            track: ['ИИ', 'Кибербезопасность'],
            tags: ['тег1'],
            event_type: ['Конференция'],
          },
        ],
        total: 1,
      }),
    });
  });

  it('renders track chips above tag chips', async () => {
    renderDigest();

    const aiChip = await screen.findByText('ИИ');
    const secChip = await screen.findByText('Кибербезопасность');
    const tagChip = await screen.findByText('#тег1');

    expect(aiChip).toBeInTheDocument();
    expect(secChip).toBeInTheDocument();
    expect(aiChip).toHaveClass('digest__track');

    expect(aiChip.compareDocumentPosition(tagChip)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('does not render digest__tracks when track is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 2,
            title: 'No Track Event',
            start_date: '2099-01-01',
            start_time: '10:00',
            city: ['Москва'],
            track: [],
            tags: ['тег1'],
            event_type: ['Конференция'],
          },
        ],
        total: 1,
      }),
    });

    renderDigest();

    await screen.findByText('#тег1');

    const trackContainer = document.querySelector('.digest__tracks');
    expect(trackContainer).toBeNull();
  });
});

describe('EventsDigest — filter behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('loads with full filters from useUserFilters', () => {
    renderDigest();

    // Verify that mockSaveFilters was not called on mount (filters come from context)
    expect(mockSaveFilters).not.toHaveBeenCalled();
  });

  it('does not call setFilters when filters come from useUserFilters', () => {
    renderDigest();

    expect(mockSetFilters).not.toHaveBeenCalled();
  });
});

describe('EventsDigest — sort by importance toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    });
  });

  const lastFetchedUrl = () => new URL(global.fetch.mock.calls.at(-1)[0]);

  it('defaults to sort=date and switch is off', async () => {
    renderDigest();

    await screen.findByText('Сначала важные');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(lastFetchedUrl().searchParams.get('sort')).toBe('date');
  });

  it('switches to sort=importance and resets page to 1 on toggle', async () => {
    renderDigest();
    await screen.findByText('Сначала важные');

    fireEvent.click(screen.getByRole('switch'));

    await vi.waitFor(() => expect(lastFetchedUrl().searchParams.get('sort')).toBe('importance'));
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(lastFetchedUrl().searchParams.get('offset')).toBe('0');
    expect(sessionStorage.getItem('events_sort_importance')).toBe('true');
  });

  it('restores sort=date after toggling importance off again', async () => {
    renderDigest();
    await screen.findByText('Сначала важные');

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    await vi.waitFor(() => expect(lastFetchedUrl().searchParams.get('sort')).toBe('importance'));

    fireEvent.click(toggle);
    await vi.waitFor(() => expect(lastFetchedUrl().searchParams.get('sort')).toBe('date'));

    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });
});
