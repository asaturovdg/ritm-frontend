import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Event from '../Event.jsx';

let mockUserId = '88';

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({
    platform: 'telegram',
    openLink: vi.fn(),
    showAlert: vi.fn(),
    shareEvent: vi.fn(),
  }),
}));

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    userId: mockUserId,
    isCheckingAuth: false,
  }),
}));

vi.mock('../../../components/useCalendar.jsx', () => ({
  useCalendar: () => ({ isProcessing: false, handleAddToCalendar: vi.fn() }),
}));

const mockEvent = {
  id: 42,
  title: 'HolyJS 2026',
  event_type: ['Конференция'],
  start_date: '2026-10-01',
  city: ['Москва'],
  description: 'Описание события',
  tags: [],
  speakers: [],
  organizers: [],
};

const renderEvent = (id = '42') =>
  render(
    <MemoryRouter initialEntries={[`/events/${id}`]}>
      <Routes>
        <Route path="/events/:id" element={<Event />} />
      </Routes>
    </MemoryRouter>
  );

describe('Event page — not interested button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockEvent,
    });
  });

  it('renders "Скрыть" for an allowlisted user_id (88)', async () => {
    mockUserId = '88';
    renderEvent();

    const button = await screen.findByText('Скрыть');
    expect(button).toBeInTheDocument();
  });

  it('does not render the button for a non-allowlisted user_id', async () => {
    mockUserId = '42';
    renderEvent();

    await screen.findByText('HolyJS 2026');
    expect(screen.queryByText('Скрыть')).not.toBeInTheDocument();
  });
});
