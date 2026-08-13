import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SubmissionsQueue from '../SubmissionsQueue.jsx';

vi.mock('@telegram-apps/telegram-ui', () => ({
  Placeholder: ({ header, description, children }) => (
    <div data-testid="placeholder">
      <p>{header}</p>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: vi.fn(), shareEvent: vi.fn(), showAlert: vi.fn(), platform: 'web' }),
}));

const { mockSetShowInputCode, mockShowToast } = vi.hoisted(() => ({
  mockSetShowInputCode: vi.fn(),
  mockShowToast: vi.fn(),
}));

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    isAuthReady: true,
    isCheckingAuth: false,
    userId: '1',
    setShowInputCode: mockSetShowInputCode,
  }),
}));

vi.mock('../../../components/Toast/ToastContext.jsx', () => ({
  useToast: () => mockShowToast,
}));

const submissionItem = (overrides = {}) => ({
  id: 1,
  title: 'Митап по бэкенду',
  status: 'pending',
  event_type: ['Митап'],
  start_date: '2026-09-01',
  price: 0,
  city: ['Онлайн'],
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

const renderQueue = () => render(<MemoryRouter><SubmissionsQueue /></MemoryRouter>);

describe('SubmissionsQueue', () => {
  it('shows a loading spinner initially', () => {
    global.fetch.mockReturnValue(new Promise(() => {}));
    renderQueue();
    expect(document.querySelector('.spinner')).toBeTruthy();
  });

  it('renders the first card once the queue loads', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [submissionItem()], total: 1, limit: 20, offset: 0 }),
    });
    renderQueue();
    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Митап по бэкенду' })).toBeInTheDocument();
  });

  it('shows the empty-queue placeholder when there are no items', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0, limit: 20, offset: 0 }),
    });
    renderQueue();
    expect(await screen.findByText('Очередь пуста')).toBeInTheDocument();
    expect(screen.getByText('Все заявки проверены')).toBeInTheDocument();
  });

  it('handles 401 by clearing tokens and showing the input-code screen', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401 });
    localStorage.setItem('access_token', 'x');
    localStorage.setItem('refresh_token', 'y');
    localStorage.setItem('user_id', '1');
    renderQueue();
    await waitFor(() => expect(mockSetShowInputCode).toHaveBeenCalledWith(true));
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('user_id')).toBeNull();
  });

  it('approves via POST with no body and removes the card from the queue', async () => {
    global.fetch.mockImplementation((url, opts) => {
      const u = String(url);
      if (u.includes('moderation-queue')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            items: [submissionItem({ id: 1, title: 'Заявка А' }), submissionItem({ id: 2, title: 'Заявка Б' })],
            total: 2,
            limit: 20,
            offset: 0,
          }),
        });
      }
      if (u.includes('/submissions/1/approve')) {
        expect(opts.method).toBe('POST');
        expect(opts.body).toBeUndefined();
        return Promise.resolve({ ok: true, status: 200, json: async () => submissionItem({ id: 1, status: 'approved' }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${u}`));
    });
    renderQueue();
    expect(await screen.findByRole('heading', { name: 'Заявка А' })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('submission-queue-card__approve'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Заявка Б' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Заявка А' })).not.toBeInTheDocument();
  });

  it('shows a toast and keeps the card when approve fails', async () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('moderation-queue')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [submissionItem()], total: 1, limit: 20, offset: 0 }),
        });
      }
      if (u.includes('/approve')) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.reject(new Error(`unexpected fetch: ${u}`));
    });
    renderQueue();
    await screen.findByRole('heading', { name: 'Митап по бэкенду' });
    await userEvent.click(screen.getByTestId('submission-queue-card__approve'));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Не удалось сохранить. Попробуйте ещё раз'));
    expect(screen.getByRole('heading', { name: 'Митап по бэкенду' })).toBeInTheDocument();
  });

  it('rejects with the typed reason in the request body and removes the card', async () => {
    global.fetch.mockImplementation((url, opts) => {
      const u = String(url);
      if (u.includes('moderation-queue')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [submissionItem({ id: 1, title: 'Заявка А' })], total: 1, limit: 20, offset: 0 }),
        });
      }
      if (u.includes('/submissions/1/reject')) {
        expect(JSON.parse(opts.body)).toEqual({ reason: 'Дубликат' });
        return Promise.resolve({ ok: true, status: 200, json: async () => submissionItem({ id: 1, status: 'rejected' }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${u}`));
    });
    renderQueue();
    expect(await screen.findByRole('heading', { name: 'Заявка А' })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('submission-queue-card__reject-toggle'));
    await userEvent.type(screen.getByPlaceholderText('Причина (необязательно)'), 'Дубликат');
    await userEvent.click(screen.getByTestId('submission-queue-card__reject-confirm'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Заявка А' })).not.toBeInTheDocument());
  });

  it('rejects with an empty reason by omitting the reason key from the request body', async () => {
    global.fetch.mockImplementation((url, opts) => {
      const u = String(url);
      if (u.includes('moderation-queue')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [submissionItem({ id: 1 })], total: 1, limit: 20, offset: 0 }),
        });
      }
      if (u.includes('/submissions/1/reject')) {
        expect(JSON.parse(opts.body)).toEqual({});
        return Promise.resolve({ ok: true, status: 200, json: async () => submissionItem({ id: 1, status: 'rejected' }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${u}`));
    });
    renderQueue();
    expect(await screen.findByRole('heading', { name: 'Митап по бэкенду' })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('submission-queue-card__reject-toggle'));
    await userEvent.click(screen.getByTestId('submission-queue-card__reject-confirm'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Митап по бэкенду' })).not.toBeInTheDocument());
  });

  it('shows a distinct error state (not the empty-queue placeholder) when the initial load fails with a non-401 error', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });
    renderQueue();
    expect(await screen.findByText('Не удалось загрузить')).toBeInTheDocument();
    expect(screen.queryByText('Очередь пуста')).not.toBeInTheDocument();
  });

  it('retries the initial load and clears the error state on success', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [submissionItem()], total: 1, limit: 20, offset: 0 }),
      });
    renderQueue();
    expect(await screen.findByText('Не удалось загрузить')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Повторить'));
    expect(await screen.findByRole('heading', { name: 'Митап по бэкенду' })).toBeInTheDocument();
    expect(screen.queryByText('Не удалось загрузить')).not.toBeInTheDocument();
  });

  it('auto-loads the next page as the local queue runs low', async () => {
    const page1 = [
      submissionItem({ id: 1, title: 'Заявка А' }),
      submissionItem({ id: 2, title: 'Заявка Б' }),
      submissionItem({ id: 3, title: 'Заявка В' }),
    ];
    const page2 = [submissionItem({ id: 4, title: 'Заявка Г' })];
    let queueCalls = 0;
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('moderation-queue')) {
        queueCalls += 1;
        if (u.includes('offset=0')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ items: page1, total: 4, limit: 20, offset: 0 }) });
        }
        if (u.includes('offset=3')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ items: page2, total: 4, limit: 20, offset: 3 }) });
        }
        return Promise.reject(new Error(`unexpected queue offset: ${u}`));
      }
      if (u.includes('/reject')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${u}`));
    });

    renderQueue();
    expect(await screen.findByRole('heading', { name: 'Заявка А' })).toBeInTheDocument();
    expect(queueCalls).toBe(1);

    const rejectCurrent = async () => {
      await userEvent.click(screen.getByTestId('submission-queue-card__reject-toggle'));
      await userEvent.click(screen.getByTestId('submission-queue-card__reject-confirm'));
    };

    await rejectCurrent();
    await waitFor(() => expect(queueCalls).toBe(2));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Заявка Б' })).toBeInTheDocument());
    await rejectCurrent();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Заявка В' })).toBeInTheDocument());
    await rejectCurrent();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Заявка Г' })).toBeInTheDocument());
    expect(screen.queryByText('Очередь пуста')).not.toBeInTheDocument();
  });
});
