import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Featured from '../Featured.jsx';

vi.mock('@telegram-apps/telegram-ui', () => ({
  Placeholder: ({ header, description, action }) => (
    <div data-testid="placeholder">
      <p>{header}</p>
      <p>{description}</p>
      {action}
    </div>
  ),
}));

const { mockSetShowInputCode } = vi.hoisted(() => ({
  mockSetShowInputCode: vi.fn(),
}));

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    isAuthReady: true,
    isCheckingAuth: false,
    showInputCode: false,
    setShowInputCode: mockSetShowInputCode,
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const sampleEvent = {
  id: 1,
  title: 'Highload++ 2025',
  event_type: ['Конференция'],
  start_date: '2025-04-14',
  start_time: '10:00:00',
  city: ['Москва'],
  price: 0,
  track: ['Backend'],
};

const sampleData = {
  for_you: { items: [sampleEvent] },
  top_month: { items: [] },
  sber: { items: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

const renderFeatured = () =>
  render(<MemoryRouter><Featured /></MemoryRouter>);

describe('Featured page', () => {
  it('shows loading spinner initially', () => {
    global.fetch.mockReturnValue(new Promise(() => {}));
    renderFeatured();
    expect(document.querySelector('.spinner')).toBeTruthy();
  });

  it('renders carousel with events when fetch succeeds', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleData,
    });
    renderFeatured();
    expect(await screen.findByText('Highload++ 2025')).toBeInTheDocument();
    expect(screen.getByText('Что-то для тебя')).toBeInTheDocument();
    expect(screen.getByText('1 событий')).toBeInTheDocument();
  });

  it('shows profile placeholder when for_you is null', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ for_you: null, top_month: { items: [] }, sber: { items: [] } }),
    });
    renderFeatured();
    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();
    expect(screen.getByText(/Заполни профиль/)).toBeInTheDocument();
  });

  it('shows error message on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('network'));
    renderFeatured();
    expect(await screen.findByText(/Не удалось загрузить рекомендации/)).toBeInTheDocument();
  });

  it('calls /featured with Bearer auth header', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ for_you: null, top_month: { items: [] }, sber: { items: [] } }),
    });
    renderFeatured();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ritmevents.ru/api/v1/featured',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      );
    });
  });
});
