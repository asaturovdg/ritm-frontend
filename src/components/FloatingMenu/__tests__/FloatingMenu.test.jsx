import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FloatingMenu from '../FloatingMenu.jsx';

const authState = vi.hoisted(() => ({ userData: null }));
vi.mock('../../AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', platform: 'telegram', userData: authState.userData }),
}));
vi.mock('../../Toast/ToastContext.jsx', () => ({
  useToast: () => vi.fn(),
}));

describe('FloatingMenu', () => {
  it('is collapsed by default', () => {
    render(<FloatingMenu />);
    const fab = screen.getByLabelText('Обратная связь и идеи');
    expect(fab).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Сообщить о проблеме')).not.toBeInTheDocument();
  });

  it('expands on tap and shows the menu items', () => {
    render(<FloatingMenu />);
    fireEvent.click(screen.getByLabelText('Обратная связь и идеи'));

    expect(screen.getByLabelText('Закрыть меню')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Сообщить о проблеме')).toBeInTheDocument();
    expect(screen.getByText('Обратная связь')).toBeInTheDocument();
  });

  it('collapses on Escape', async () => {
    render(<FloatingMenu />);
    fireEvent.click(screen.getByLabelText('Обратная связь и идеи'));
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByText('Сообщить о проблеме')).not.toBeInTheDocument());
  });

  it('collapses on backdrop tap', async () => {
    render(<FloatingMenu />);
    fireEvent.click(screen.getByLabelText('Обратная связь и идеи'));
    fireEvent.click(screen.getByTestId('floating-menu-backdrop'));

    await waitFor(() => expect(screen.queryByText('Сообщить о проблеме')).not.toBeInTheDocument());
  });

  it('opens the report form with the "Баг" category preselected', async () => {
    render(<FloatingMenu />);
    fireEvent.click(screen.getByLabelText('Обратная связь и идеи'));
    fireEvent.click(screen.getByText('Сообщить о проблеме'));

    expect(screen.getByText('Сообщить о проблеме или идее')).toBeInTheDocument();
    expect(screen.getByText('Баг')).toHaveClass('profile_chip-active');
    await waitFor(() => expect(screen.queryByLabelText('Закрыть меню')).not.toBeInTheDocument());
  });

  it('opens the feedback form without a preselected category', () => {
    render(<FloatingMenu />);
    fireEvent.click(screen.getByLabelText('Обратная связь и идеи'));
    fireEvent.click(screen.getByText('Обратная связь'));

    expect(screen.getByText('Баг')).not.toHaveClass('profile_chip-active');
    expect(screen.getByText('Идея')).not.toHaveClass('profile_chip-active');
  });

  it('passes the current tab to the report request', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<FloatingMenu tab="submissions" />);
    fireEvent.click(screen.getByLabelText('Обратная связь и идеи'));
    fireEvent.click(screen.getByText('Сообщить о проблеме'));
    fireEvent.change(screen.getByPlaceholderText('Опиши, что случилось или что предлагаешь'), {
      target: { value: 'Не грузится форма' },
    });
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.tab).toBe('submissions');
    });
  });

  it('hides the share item until the user has a referral code', () => {
    authState.userData = null;
    render(<FloatingMenu />);
    fireEvent.click(screen.getByLabelText('Обратная связь и идеи'));
    expect(screen.queryByText('Поделиться приложением')).not.toBeInTheDocument();
  });

  it('shares the app with the referral link and closes the menu', async () => {
    authState.userData = { referral_code: 'abc123' };
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
    render(<FloatingMenu />);
    fireEvent.click(screen.getByLabelText('Обратная связь и идеи'));
    fireEvent.click(screen.getByText('Поделиться приложением'));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('startapp=ref_abc123')
      )
    );
    await waitFor(() => expect(screen.queryByText('Поделиться приложением')).not.toBeInTheDocument());
    authState.userData = null;
  });
});
