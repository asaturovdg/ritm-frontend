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

  it('renders nothing before the threshold is reached', async () => {
    const { container } = render(<PulseCheckBanner />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('shows the question on the third mount and submits a score', async () => {
    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);

    await waitFor(() => {
      expect(screen.getByText('Как тебе подборка?')).toBeInTheDocument();
    });

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

  it('dismisses without submitting when close is clicked', async () => {
    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);

    await waitFor(() => screen.getByLabelText('Закрыть'));

    fireEvent.click(screen.getByLabelText('Закрыть'));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('still shows thanks and dismisses even when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);

    await waitFor(() => screen.getByLabelText('Оценка 3'));

    fireEvent.click(screen.getByLabelText('Оценка 3'));
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ritmevents.ru/api/v1/feedback/pulse-check',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ score: 3, comment: null }),
        })
      );
    });

    expect(screen.getByText('Спасибо за отзыв!')).toBeInTheDocument();

    // Wait for auto-dismiss
    await waitFor(() => {
      expect(screen.queryByText('Спасибо за отзыв!')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('prevents double-submit by disabling button while submitting', async () => {
    global.fetch = vi.fn(() => new Promise((resolve) => {
      setTimeout(() => resolve({ ok: true }), 100);
    }));

    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);
    render(<PulseCheckBanner />);

    await waitFor(() => screen.getByLabelText('Оценка 2'));

    fireEvent.click(screen.getByLabelText('Оценка 2'));
    const submitButton = screen.getByText('Отправить');

    fireEvent.click(submitButton);
    fireEvent.click(submitButton); // Try to click again while first submit is in-flight

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1); // Should only be called once
    });
  });
});
