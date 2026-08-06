import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PulseCheckBanner from '../PulseCheckBanner.jsx';

vi.mock('../../AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

describe('PulseCheckBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it('renders nothing before the threshold is reached', () => {
    const { container } = render(<PulseCheckBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the question on the third mount and submits a score', async () => {
    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);

    expect(screen.getByText('Как тебе подборка?')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Оценка 4'));
    expect(screen.getByPlaceholderText('Комментарий (необязательно)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ritmevents.ru/api/v1/feedback/pulse-check',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ score: 4, comment: null }),
        })
      );
    });

    expect(screen.getByText('Спасибо за отзыв!')).toBeInTheDocument();
  });

  it('dismisses without submitting when close is clicked', () => {
    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);

    fireEvent.click(screen.getByLabelText('Закрыть'));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
