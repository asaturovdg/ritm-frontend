import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotInterestedButton from '../NotInterestedButton.jsx';

const mockMarkNotInterested = vi.fn();
const mockUnmarkNotInterested = vi.fn();
const mockIsNotInterested = vi.fn();
const mockIsSaved = vi.fn();
const mockShowToast = vi.fn();

vi.mock('../../NotInterestedContext.jsx', () => ({
  useNotInterested: () => ({
    isNotInterested: mockIsNotInterested,
    isPending: () => false,
    markNotInterested: mockMarkNotInterested,
    unmarkNotInterested: mockUnmarkNotInterested,
  }),
}));

vi.mock('../../SavedEventsContext.jsx', () => ({
  useSavedEvents: () => ({ isSaved: mockIsSaved }),
}));

vi.mock('../../Toast/ToastContext.jsx', () => ({
  useToast: () => mockShowToast,
}));

const event = { id: 5 };

describe('NotInterestedButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsNotInterested.mockReturnValue(false);
    mockIsSaved.mockReturnValue(false);
  });

  it('marks the event not-interested and shows an undo toast on click', () => {
    render(<NotInterestedButton event={event} source="search" />);
    fireEvent.click(screen.getByText('Не интересно'));

    expect(mockMarkNotInterested).toHaveBeenCalledWith(event, { source: 'search', block: undefined });
    expect(mockShowToast).toHaveBeenCalledWith('Событие скрыто', expect.objectContaining({
      duration: 3000,
      action: expect.objectContaining({ label: 'Отменить' }),
    }));
  });

  it('the toast action calls unmarkNotInterested', () => {
    render(<NotInterestedButton event={event} />);
    fireEvent.click(screen.getByText('Не интересно'));

    const [, options] = mockShowToast.mock.calls[0];
    options.action.onClick();

    expect(mockUnmarkNotInterested).toHaveBeenCalledWith(5);
  });

  it('clicking again while marked calls unmarkNotInterested directly (toggle)', () => {
    mockIsNotInterested.mockReturnValue(true);
    render(<NotInterestedButton event={event} />);
    fireEvent.click(screen.getByText('✓ Не интересно'));

    expect(mockUnmarkNotInterested).toHaveBeenCalledWith(5);
    expect(mockMarkNotInterested).not.toHaveBeenCalled();
  });

  it('is disabled when the event is already saved ("Пойду")', () => {
    mockIsSaved.mockReturnValue(true);
    render(<NotInterestedButton event={event} />);

    expect(screen.getByText('Не интересно')).toBeDisabled();
  });
});
