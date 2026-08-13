import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubmissionDateTimePicker from '../SubmissionDateTimePicker.jsx';

describe('SubmissionDateTimePicker', () => {
  it('shows the label and a disabled Готово button until a time is picked', () => {
    render(<SubmissionDateTimePicker label="Начало события" date="" time="" onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Начало события')).toBeInTheDocument();
    expect(screen.getByTestId('datetime-picker-confirm')).toBeDisabled();
  });

  it('enables Готово once a time slot is selected, and calls onConfirm with the date and the picked time', async () => {
    const onConfirm = vi.fn();
    render(<SubmissionDateTimePicker label="Начало события" date="2026-09-07" time="" onConfirm={onConfirm} onClose={vi.fn()} />);
    await userEvent.click(screen.getByText('18:00'));
    expect(screen.getByTestId('datetime-picker-confirm')).not.toBeDisabled();
    await userEvent.click(screen.getByTestId('datetime-picker-confirm'));
    expect(onConfirm).toHaveBeenCalledWith('2026-09-07', '18:00');
  });

  it('pre-selects the given time slot as active', () => {
    render(<SubmissionDateTimePicker label="Начало события" date="2026-09-07" time="18:30" onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('18:30').className).toContain('active');
  });

  it('lets the month and year selects change independently', async () => {
    render(<SubmissionDateTimePicker label="Начало события" date="2026-09-07" time="" onConfirm={vi.fn()} onClose={vi.fn()} />);
    const monthSelect = screen.getByTestId('datetime-picker-month');
    const yearSelect = screen.getByTestId('datetime-picker-year');
    expect(monthSelect).toHaveValue('8'); // September = index 8
    expect(yearSelect).toHaveValue('2026');
    await userEvent.selectOptions(monthSelect, '0'); // January
    expect(monthSelect).toHaveValue('0');
  });

  it('calls onClose when the overlay backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(<SubmissionDateTimePicker label="Начало события" date="" time="" onConfirm={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByTestId('datetime-picker-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the sheet content itself is clicked', async () => {
    const onClose = vi.fn();
    render(<SubmissionDateTimePicker label="Начало события" date="" time="" onConfirm={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByText('Начало события'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
