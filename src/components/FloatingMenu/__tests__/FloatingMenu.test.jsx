import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FloatingMenu from '../FloatingMenu.jsx';

vi.mock('../../AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token' }),
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
});
