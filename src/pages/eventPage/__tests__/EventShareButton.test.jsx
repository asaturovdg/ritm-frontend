import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Event from '../Event.jsx';

const mockShareEvent = vi.fn();
let mockPlatform = 'telegram';

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({
    platform: mockPlatform,
    openLink: vi.fn(),
    showAlert: vi.fn(),
    shareEvent: mockShareEvent,
  }),
}));

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
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

describe('Event — share button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatform = 'telegram';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockEvent,
    });
  });

  it('renders share button in header for Telegram platform', async () => {
    renderEvent();
    expect(await screen.findByRole('button', { name: /поделиться/i })).toBeInTheDocument();
  });

  it('calls shareEvent with event id and title when share button clicked', async () => {
    renderEvent();
    const btn = await screen.findByRole('button', { name: /поделиться/i });
    fireEvent.click(btn);
    expect(mockShareEvent).toHaveBeenCalledWith(42, 'HolyJS 2026', mockEvent.event_type);
  });

  it('hides share button when platform is web', async () => {
    mockPlatform = 'web';
    renderEvent();
    await screen.findByText('HolyJS 2026');
    expect(screen.queryByRole('button', { name: /поделиться/i })).toBeNull();
  });

  it('hides share button in isPreview mode', async () => {
    render(
      <MemoryRouter>
        <Event embeddedId={42} isPreview={true} />
      </MemoryRouter>
    );
    await screen.findByText('HolyJS 2026');
    expect(screen.queryByRole('button', { name: /поделиться/i })).toBeNull();
  });
});
