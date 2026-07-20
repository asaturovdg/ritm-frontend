import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Moderation from '../Moderation.jsx';

vi.mock('@telegram-apps/telegram-ui', () => ({
  Placeholder: ({ header, description }) => (
    <div data-testid="placeholder">
      <p>{header}</p>
      <p>{description}</p>
    </div>
  ),
}));

const { mockSetShowInputCode, mockShowToast } = vi.hoisted(() => ({
  mockSetShowInputCode: vi.fn(),
  mockShowToast: vi.fn(),
}));

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    isAuthReady: true,
    setShowInputCode: mockSetShowInputCode,
  }),
}));

vi.mock('../../../components/Toast/ToastContext.jsx', () => ({
  useToast: () => mockShowToast,
}));

const queueItem = (overrides = {}) => ({
  id: 1,
  title: 'Митап по бекенду',
  city: ['Москва'],
  event_type: ['Конференция'],
  quality_score: 3,
  suggestions: { title: 'Митап по бэкенду: как мы...' },
  ...overrides,
});

let localStorageStore = {};
const localStorageMock = {
  getItem: (key) => localStorageStore[key] ?? null,
  setItem: (key, value) => { localStorageStore[key] = String(value); },
  removeItem: (key) => { delete localStorageStore[key]; },
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  localStorageStore = {};
  vi.stubGlobal('localStorage', localStorageMock);
});

const renderModeration = () => render(<MemoryRouter><Moderation /></MemoryRouter>);

describe('Moderation page', () => {
  it('shows a loading spinner initially', () => {
    global.fetch.mockReturnValue(new Promise(() => {}));
    renderModeration();
    expect(document.querySelector('.spinner')).toBeTruthy();
  });

  it('renders the first card once the queue loads', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [queueItem()], total: 1, limit: 20, offset: 0 }),
    });
    renderModeration();
    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByText('Митап по бекенду')).toBeInTheDocument();
  });

  it('shows the empty-queue placeholder when there are no items', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0, limit: 20, offset: 0 }),
    });
    renderModeration();
    expect(await screen.findByText('Очередь пуста')).toBeInTheDocument();
  });

  it('handles 401 by clearing tokens and showing the input-code screen', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401 });
    localStorage.setItem('access_token', 'x');
    localStorage.setItem('refresh_token', 'y');
    localStorage.setItem('user_id', '1');
    renderModeration();
    await waitFor(() => expect(mockSetShowInputCode).toHaveBeenCalledWith(true));
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('user_id')).toBeNull();
  });

  it('removes the card from the queue and advances after a successful reject', async () => {
    global.fetch.mockImplementation((url, opts) => {
      if (String(url).includes('moderation-queue')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            items: [queueItem({ id: 1, title: 'Событие А' }), queueItem({ id: 2, title: 'Событие Б' })],
            total: 2,
            limit: 20,
            offset: 0,
          }),
        });
      }
      if (String(url).includes('reject-suggestions')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => queueItem({ id: 1 }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    renderModeration();
    expect(await screen.findByText('Событие А')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Пропустить'));
    await waitFor(() => expect(screen.getByText('Событие Б')).toBeInTheDocument());
    expect(screen.queryByText('Событие А')).not.toBeInTheDocument();
  });

  it('shows a toast and keeps the card when approve fails', async () => {
    global.fetch.mockImplementation((url) => {
      if (String(url).includes('moderation-queue')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [queueItem()], total: 1, limit: 20, offset: 0 }),
        });
      }
      if (String(url).includes('approve-suggestions')) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    renderModeration();
    await screen.findByText('Митап по бекенду');
    await userEvent.click(screen.getByText('Принять выбранное'));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Не удалось сохранить. Попробуйте ещё раз'));
    expect(screen.getByText('Митап по бекенду')).toBeInTheDocument();
  });
});
