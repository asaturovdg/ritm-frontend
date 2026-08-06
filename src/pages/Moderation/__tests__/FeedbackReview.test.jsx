import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackReview from '../FeedbackReview.jsx';

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

const { mockShowToast } = vi.hoisted(() => ({ mockShowToast: vi.fn() }));
vi.mock('../../../components/Toast/ToastContext.jsx', () => ({
  useToast: () => mockShowToast,
}));

describe('FeedbackReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('loads and displays pulse-check scores by default', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 1, score: 5, comment: 'Отлично', created_at: '2026-08-01T00:00:00Z' }],
        total: 1,
      }),
    });

    render(<FeedbackReview />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ritmevents.ru/api/v1/feedback/pulse-check?limit=20&offset=0',
        expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
      );
    });

    expect(await screen.findByText('Отлично')).toBeInTheDocument();
  });

  it('switches to reports and refetches', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [], total: 0 }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 2, category: 'bug', message: 'Не открывается фильтр', created_at: '2026-08-02T00:00:00Z' }],
          total: 1,
        }),
      });

    render(<FeedbackReview />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('Обращения'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        'https://ritmevents.ru/api/v1/feedback/report?limit=20&offset=0',
        expect.anything()
      );
    });

    expect(await screen.findByText('Не открывается фильтр')).toBeInTheDocument();
  });

  it('shows an empty state and a toast on failure', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    render(<FeedbackReview />);
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Не удалось загрузить обратную связь'));
    expect(await screen.findByText('Пока пусто')).toBeInTheDocument();
  });
});
