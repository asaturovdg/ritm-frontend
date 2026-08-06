// src/pages/Profile/__tests__/UxFeedbackModal.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UxFeedbackModal from '../UxFeedbackModal.jsx';

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

const { mockShowToast } = vi.hoisted(() => ({ mockShowToast: vi.fn() }));
vi.mock('../../../components/Toast/ToastContext.jsx', () => ({
  useToast: () => mockShowToast,
}));

describe('UxFeedbackModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('disables submit until a category and message are provided', () => {
    render(<UxFeedbackModal onClose={vi.fn()} />);
    const submitBtn = screen.getByText('Отправить');
    expect(submitBtn).toBeDisabled();

    fireEvent.click(screen.getByText('Баг'));
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Опиши, что случилось или что предлагаешь'), {
      target: { value: 'Не открывается фильтр' },
    });
    expect(submitBtn).not.toBeDisabled();
  });

  it('submits category and message, shows a toast, and closes', async () => {
    global.fetch.mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    render(<UxFeedbackModal onClose={onClose} />);

    fireEvent.click(screen.getByText('Идея'));
    fireEvent.change(screen.getByPlaceholderText('Опиши, что случилось или что предлагаешь'), {
      target: { value: 'Добавьте тёмную тему для карточек' },
    });
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ritmevents.ru/api/v1/feedback/report',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ category: 'idea', message: 'Добавьте тёмную тему для карточек' }),
        })
      );
    });

    expect(mockShowToast).toHaveBeenCalledWith('Спасибо, мы получили сообщение!');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error toast and keeps the modal open on failure', async () => {
    global.fetch.mockResolvedValue({ ok: false });
    const onClose = vi.fn();
    render(<UxFeedbackModal onClose={onClose} />);

    fireEvent.click(screen.getByText('Другое'));
    fireEvent.change(screen.getByPlaceholderText('Опиши, что случилось или что предлагаешь'), {
      target: { value: 'test' },
    });
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Не удалось отправить. Попробуй ещё раз.');
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
