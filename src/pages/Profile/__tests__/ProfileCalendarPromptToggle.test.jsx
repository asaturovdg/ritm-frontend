import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Profile } from '../Profile.jsx';

const mockSetSkipPrompt = vi.fn();
let mockSkipPrompt = false;

vi.mock('../../../components/useUserFilters.jsx', () => ({
  useUserFilters: () => ({
    filters: { cities: ['Москва'], categories: ['IT'], eventTypes: ['Конференция'], participationTypes: ['Онлайн'] },
    setFilters: vi.fn(),
    saveFilters: vi.fn().mockResolvedValue(undefined),
    flushPendingSave: vi.fn(),
    isSaving: false,
  }),
}));

vi.mock('../../../components/AuthContext.jsx', () => {
  const userData = { id: '42', digest_period: 'daily', digest_day_of_week: null };
  return {
    useAuth: () => ({ token: 'test-token', userId: '42', userData, isCheckingAuth: false }),
  };
});

vi.mock('../../../components/useCalendar.jsx', () => ({
  useCalendar: () => ({ connectCalendar: vi.fn(), waitForCalendarConnection: vi.fn() }),
}));

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: vi.fn() }),
}));

vi.mock('../../../components/SavedEventsContext.jsx', () => ({
  useSavedEvents: () => ({ savedEvents: [], loading: false }),
}));

vi.mock('../../../components/useCalendarPromptPreference.jsx', () => ({
  useCalendarPromptPreference: () => ({
    skipPrompt: mockSkipPrompt,
    setSkipPrompt: mockSetSkipPrompt,
  }),
}));

global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });

const renderProfile = () =>
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );

describe('Profile — "Синхронизация" calendar prompt toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSkipPrompt = false;
  });

  it('shows a checked toggle when the prompt is enabled (skipPrompt=false)', () => {
    renderProfile();
    fireEvent.click(screen.getByText('Синхронизация'));
    const checkbox = screen.getByLabelText('Предлагать добавить во внешний календарь при сохранении события');
    expect(checkbox.checked).toBe(true);
  });

  it('shows an unchecked toggle when the prompt is disabled (skipPrompt=true)', () => {
    mockSkipPrompt = true;
    renderProfile();
    fireEvent.click(screen.getByText('Синхронизация'));
    const checkbox = screen.getByLabelText('Предлагать добавить во внешний календарь при сохранении события');
    expect(checkbox.checked).toBe(false);
  });

  it('unchecking the toggle calls setSkipPrompt(true)', () => {
    renderProfile();
    fireEvent.click(screen.getByText('Синхронизация'));
    const checkbox = screen.getByLabelText('Предлагать добавить во внешний календарь при сохранении события');
    fireEvent.click(checkbox);
    expect(mockSetSkipPrompt).toHaveBeenCalledWith(true);
  });

  it('checking the toggle calls setSkipPrompt(false)', () => {
    mockSkipPrompt = true;
    renderProfile();
    fireEvent.click(screen.getByText('Синхронизация'));
    const checkbox = screen.getByLabelText('Предлагать добавить во внешний календарь при сохранении события');
    fireEvent.click(checkbox);
    expect(mockSetSkipPrompt).toHaveBeenCalledWith(false);
  });
});
