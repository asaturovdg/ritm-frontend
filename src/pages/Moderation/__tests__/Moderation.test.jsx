import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Moderation from '../Moderation.jsx';

vi.mock('@telegram-apps/telegram-ui', () => ({
  Placeholder: ({ header, description, children }) => (
    <div data-testid="placeholder">
      <p>{header}</p>
      <p>{description}</p>
      {children}
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

  it('keeps the correct card selected when rejecting the card chosen via the sheet (not the first card)', async () => {
    const items = [
      queueItem({ id: 1, title: 'Событие А' }),
      queueItem({ id: 2, title: 'Событие Б' }),
      queueItem({ id: 3, title: 'Событие В' }),
      queueItem({ id: 4, title: 'Событие Г' }),
    ];
    global.fetch.mockImplementation((url) => {
      if (String(url).includes('moderation-queue')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items, total: 4, limit: 20, offset: 0 }),
        });
      }
      if (String(url).includes('reject-suggestions')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    renderModeration();
    expect(await screen.findByText('Событие А')).toBeInTheDocument();

    // Open the sheet and select event C (index 2), not the currently-displayed card.
    await userEvent.click(screen.getByText('1 / 4'));
    await userEvent.click(screen.getByText('Событие В'));
    expect(await screen.findByText('Событие В')).toBeInTheDocument();
    expect(screen.getByText('3 / 4')).toBeInTheDocument();

    // Now reject the card actually being viewed (C). The fix ensures removeCurrentFromQueue
    // re-derives currentIndex from the surviving item's id rather than clamping a stale index,
    // so this should land on a sensible next card (D), not silently jump elsewhere.
    // The harder mid-flight race (A resolving late after switching to C) is exercised by the
    // same id-based lookup logic in removeCurrentFromQueue and is not re-tested with an explicit
    // timing scenario here, since ModerationCard only exposes actions for the currently-viewed card.
    await userEvent.click(screen.getByText('Пропустить'));
    await waitFor(() => expect(screen.queryByText('Событие В')).not.toBeInTheDocument());
    expect(screen.getByText('Событие Г')).toBeInTheDocument();
  });

  it('keeps the correct card selected when a different card\'s in-flight request resolves after navigating away via the sheet', async () => {
    function deferred() {
      let resolve;
      const promise = new Promise((res) => { resolve = res; });
      return { promise, resolve };
    }

    const items = [
      queueItem({ id: 1, title: 'Событие А' }),
      queueItem({ id: 2, title: 'Событие Б' }),
      queueItem({ id: 3, title: 'Событие В' }),
      queueItem({ id: 4, title: 'Событие Г' }),
    ];
    const rejectA = deferred();
    global.fetch.mockImplementation((url) => {
      if (String(url).includes('moderation-queue')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items, total: 4, limit: 20, offset: 0 }),
        });
      }
      if (String(url).includes('/events/1/reject-suggestions')) {
        return rejectA.promise;
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    renderModeration();
    expect(await screen.findByText('Событие А')).toBeInTheDocument();
    expect(screen.getByText('1 / 4')).toBeInTheDocument();

    // Fire the reject for card A (the currently-viewed card), but its request
    // stays pending — the UI is not blocked, so the moderator can navigate away.
    await userEvent.click(screen.getByText('Пропустить'));

    // While A's request is still in flight, open the sheet and jump to card C.
    await userEvent.click(screen.getByText('1 / 4'));
    await userEvent.click(screen.getByText('Событие В'));
    expect(await screen.findByText('Событие В')).toBeInTheDocument();
    expect(screen.getByText('3 / 4')).toBeInTheDocument();

    // Now A's request finally resolves. This must not disturb the currently-viewed
    // card (C): removeCurrentFromQueue should re-derive currentIndex from C's id,
    // not from a stale index captured back when A was selected.
    rejectA.resolve({ ok: true, status: 200, json: async () => queueItem({ id: 1 }) });
    await waitFor(() => expect(screen.queryByText('Событие А')).not.toBeInTheDocument());

    expect(screen.getByText('Событие В')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('shows a distinct error state (not the empty-queue placeholder) when the initial load fails with a non-401 error', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });
    renderModeration();
    expect(await screen.findByText('Не удалось загрузить')).toBeInTheDocument();
    expect(screen.queryByText('Очередь пуста')).not.toBeInTheDocument();
  });

  it('retries the initial load and clears the error state on success', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [queueItem()], total: 1, limit: 20, offset: 0 }),
      });
    renderModeration();
    expect(await screen.findByText('Не удалось загрузить')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Повторить'));
    expect(await screen.findByText('Митап по бекенду')).toBeInTheDocument();
    expect(screen.queryByText('Не удалось загрузить')).not.toBeInTheDocument();
  });

  it('auto-loads the next page as the local queue runs low, instead of showing the empty placeholder while more items remain on the server', async () => {
    const page1 = [
      queueItem({ id: 1, title: 'Событие А' }),
      queueItem({ id: 2, title: 'Событие Б' }),
      queueItem({ id: 3, title: 'Событие В' }),
    ];
    const page2 = [
      queueItem({ id: 4, title: 'Событие Г' }),
      queueItem({ id: 5, title: 'Событие Д' }),
    ];
    let queueCalls = 0;
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('moderation-queue')) {
        queueCalls += 1;
        if (u.includes('offset=0')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: page1, total: 5, limit: 20, offset: 0 }),
          });
        }
        if (u.includes('offset=3')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: page2, total: 5, limit: 20, offset: 3 }),
          });
        }
        return Promise.reject(new Error(`unexpected queue offset: ${u}`));
      }
      if (u.includes('reject-suggestions')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${u}`));
    });

    renderModeration();
    expect(await screen.findByText('Событие А')).toBeInTheDocument();
    expect(queueCalls).toBe(1);

    // Reject the first card. Locally-loaded items drop to 2 (< total 5), and only
    // 2 remain ahead of the current index — this should trigger an automatic fetch
    // of the next page, without the admin opening the queue-list sheet.
    await userEvent.click(screen.getByText('Пропустить'));
    await waitFor(() => expect(queueCalls).toBe(2));

    // Work through the rest of page 1 and confirm page 2's items become reachable
    // instead of the queue prematurely reporting itself empty.
    await waitFor(() => expect(screen.getByText('Событие Б')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Пропустить'));
    await waitFor(() => expect(screen.getByText('Событие В')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Пропустить'));

    await waitFor(() => expect(screen.getByText('Событие Г')).toBeInTheDocument());
    expect(screen.queryByText('Очередь пуста')).not.toBeInTheDocument();
  });

  it('does not crash when the queue response is missing the items array', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ total: 0, limit: 20, offset: 0 }),
    });
    renderModeration();
    expect(await screen.findByText('Очередь пуста')).toBeInTheDocument();
  });

  it('stops auto-retrying and shows the retry UI when loadMore keeps returning zero items while total claims more exist', async () => {
    const page1 = [
      queueItem({ id: 1, title: 'Событие А' }),
      queueItem({ id: 2, title: 'Событие Б' }),
      queueItem({ id: 3, title: 'Событие В' }),
    ];
    let queueCalls = 0;
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('moderation-queue')) {
        queueCalls += 1;
        if (u.includes('offset=0')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: page1, total: 10, limit: 20, offset: 0 }),
          });
        }
        // Every subsequent page request returns an empty page while total still
        // claims more items exist — this must not loop forever.
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total: 10, limit: 20, offset: 3 }),
        });
      }
      if (u.includes('reject-suggestions')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${u}`));
    });

    renderModeration();
    expect(await screen.findByText('Событие А')).toBeInTheDocument();
    expect(queueCalls).toBe(1);

    // Exhaust the three loaded items via reject; the last reject brings
    // items.length - currentIndex to <= 2, triggering auto-pagination.
    await userEvent.click(screen.getByText('Пропустить'));
    await waitFor(() => expect(screen.getByText('Событие Б')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Пропустить'));
    await waitFor(() => expect(screen.getByText('Событие В')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Пропустить'));

    // The retry/error UI should appear instead of a permanent spinner.
    await waitFor(() => expect(screen.getByText('Не удалось загрузить')).toBeInTheDocument());

    // Give any lingering effects a chance to fire, then confirm fetch calls stabilized
    // (bounded), i.e. no infinite refetch loop of the same offset.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const callsAfterSettling = queueCalls;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(queueCalls).toBe(callsAfterSettling);
    expect(queueCalls).toBeLessThanOrEqual(3);
  });

  it('surfaces the retry UI (not just a toast) when loadMore fails with a network error', async () => {
    const page1 = [
      queueItem({ id: 1, title: 'Событие А' }),
      queueItem({ id: 2, title: 'Событие Б' }),
    ];
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('moderation-queue')) {
        if (u.includes('offset=0')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ items: page1, total: 10, limit: 20, offset: 0 }),
          });
        }
        return Promise.reject(new Error('network error'));
      }
      if (u.includes('reject-suggestions')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${u}`));
    });

    renderModeration();
    expect(await screen.findByText('Событие А')).toBeInTheDocument();

    // Exhaust the two loaded items via reject, triggering auto-pagination which fails.
    await userEvent.click(screen.getByText('Пропустить'));
    await waitFor(() => expect(screen.getByText('Событие Б')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Пропустить'));

    await waitFor(() => expect(screen.getByText('Не удалось загрузить')).toBeInTheDocument());
  });
});
