import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookmarkButton from '../BookmarkButton.jsx';

const mockSaveEvent = vi.fn();
const mockUnsaveEvent = vi.fn();
const mockIsSaved = vi.fn();
const mockHandleAddToCalendar = vi.fn();
const mockShowAlert = vi.fn();
const mockSetSkipPrompt = vi.fn();
let mockSkipPrompt = false;

vi.mock('../../SavedEventsContext.jsx', () => ({
  useSavedEvents: () => ({
    isSaved: mockIsSaved,
    isPending: () => false,
    saveEvent: mockSaveEvent,
    unsaveEvent: mockUnsaveEvent,
  }),
}));

vi.mock('../../useCalendar.jsx', () => ({
  useCalendar: () => ({
    handleAddToCalendar: mockHandleAddToCalendar,
    isProcessing: false,
  }),
}));

vi.mock('../../Toast/ToastContext.jsx', () => ({
  useToast: () => mockShowAlert,
}));

vi.mock('../../useCalendarPromptPreference.jsx', () => ({
  useCalendarPromptPreference: () => ({
    skipPrompt: mockSkipPrompt,
    setSkipPrompt: mockSetSkipPrompt,
  }),
}));

const event = { id: 1, start_date: '2026-08-01' };

describe('BookmarkButton — external calendar prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSkipPrompt = false;
    mockIsSaved.mockReturnValue(false);
  });

  it('shows the external prompt after saving when skipPrompt is false', () => {
    render(<BookmarkButton event={event} />);
    fireEvent.click(screen.getByText('+ В мой календарь'));
    expect(mockSaveEvent).toHaveBeenCalledWith(event);
    expect(screen.getByText('Добавить также во внешний?')).toBeInTheDocument();
  });

  it('does NOT show the external prompt after saving when skipPrompt is true', () => {
    mockSkipPrompt = true;
    render(<BookmarkButton event={event} />);
    fireEvent.click(screen.getByText('+ В мой календарь'));
    expect(mockSaveEvent).toHaveBeenCalledWith(event);
    expect(screen.queryByText('Добавить также во внешний?')).not.toBeInTheDocument();
  });

  it('"Нет" hides the prompt without changing the remembered preference', () => {
    render(<BookmarkButton event={event} />);
    fireEvent.click(screen.getByText('+ В мой календарь'));
    fireEvent.click(screen.getByText('Нет'));
    expect(screen.queryByText('Добавить также во внешний?')).not.toBeInTheDocument();
    expect(mockSetSkipPrompt).not.toHaveBeenCalled();
  });

  it('"Нет, запомнить мой выбор" hides the prompt, persists the choice, and alerts about Profile', () => {
    render(<BookmarkButton event={event} />);
    fireEvent.click(screen.getByText('+ В мой календарь'));
    fireEvent.click(screen.getByText('Нет, запомнить мой выбор'));

    expect(screen.queryByText('Добавить также во внешний?')).not.toBeInTheDocument();
    expect(mockSetSkipPrompt).toHaveBeenCalledWith(true);
    expect(mockShowAlert).toHaveBeenCalledWith('Ты можешь изменить эту настройку в профиле');
  });
});
