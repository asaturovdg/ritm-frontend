import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LinkQueue from '../LinkQueue.jsx';

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

const { mockShowToast } = vi.hoisted(() => ({ mockShowToast: vi.fn() }));
vi.mock('../../../components/Toast/ToastContext.jsx', () => ({
  useToast: () => mockShowToast,
}));

describe('LinkQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('loads and displays queued links on mount', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 42,
            url: 'https://example.com/some-event',
            status: 'pending',
            created_at: '2026-08-27T10:15:00Z',
            processed_at: null,
            result_event_id: null,
            error_message: null,
          },
        ],
        total: 1,
      }),
    });

    render(<LinkQueue />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ritmevents.ru/api/v1/crawler/link-queue?limit=20&offset=0',
        expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
      );
    });

    expect(await screen.findByText('https://example.com/some-event')).toBeInTheDocument();
  });

  it('submits a new link and shows it as pending', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [], total: 0 }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 42,
          url: 'https://example.com/some-event',
          status: 'pending',
          created_at: '2026-08-27T10:15:00Z',
          processed_at: null,
          result_event_id: null,
          error_message: null,
        }),
      });

    render(<LinkQueue />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://example.com/some-event' },
    });
    fireEvent.click(screen.getByText('Добавить'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        'https://ritmevents.ru/api/v1/crawler/link-queue',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ url: 'https://example.com/some-event' }),
        })
      );
    });

    expect(await screen.findByText('https://example.com/some-event')).toBeInTheDocument();
  });

  it('shows a validation error under the field on 422', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [], total: 0 }) })
      .mockResolvedValueOnce({ ok: false, status: 422 });

    render(<LinkQueue />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'not-a-url' },
    });
    fireEvent.click(screen.getByText('Добавить'));

    expect(await screen.findByText('Это не похоже на ссылку')).toBeInTheDocument();
  });

  it('filters the queue by status', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { id: 1, url: 'https://a.com', status: 'pending', created_at: '2026-08-27T10:00:00Z', processed_at: null, result_event_id: null, error_message: null },
        ],
        total: 1,
      }),
    });

    render(<LinkQueue />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { id: 2, url: 'https://b.com', status: 'done', created_at: '2026-08-27T09:00:00Z', processed_at: '2026-08-27T09:10:00Z', result_event_id: 501, error_message: null },
        ],
        total: 1,
      }),
    });

    fireEvent.click(screen.getByText('Готово'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        'https://ritmevents.ru/api/v1/crawler/link-queue?limit=20&offset=0&status=done',
        expect.anything()
      );
    });

    expect(await screen.findByText('https://b.com')).toBeInTheDocument();
  });

  it('shows the linked event for a done item and the error for a failed item', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { id: 1, url: 'https://a.com', status: 'done', created_at: '2026-08-27T10:00:00Z', processed_at: '2026-08-27T10:10:00Z', result_event_id: 501, error_message: null },
          { id: 2, url: 'https://b.com', status: 'failed', created_at: '2026-08-27T09:00:00Z', processed_at: '2026-08-27T09:05:00Z', result_event_id: null, error_message: 'Connection timeout' },
        ],
        total: 2,
      }),
    });

    render(<LinkQueue />);

    expect(await screen.findByText('Событие #501')).toBeInTheDocument();
    expect(await screen.findByText('Connection timeout')).toBeInTheDocument();
  });

  it('shows a toast on load failure', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    render(<LinkQueue />);
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Не удалось загрузить очередь'));
  });
});
