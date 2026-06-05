import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Filters from '../Filters/Filters.jsx';

const EMPTY = { cities: [], categories: [], eventTypes: [], participationTypes: [] };
const FULL = { cities: ['Москва'], categories: ['IT'], eventTypes: ['Конференция'], participationTypes: ['Онлайн'] };
const PARTIAL = { cities: [], categories: ['IT'], eventTypes: ['Конференция'], participationTypes: ['Онлайн'] };

const defaultProps = {
  onFilterChange: vi.fn(),
  isOpen: true,
  setIsOpen: vi.fn(),
  onReset: vi.fn(),
};

describe('Filters — completion hints', () => {
  it('shows apply button and no warning when all sections are filled', () => {
    render(<Filters {...defaultProps} filters={FULL} />);

    expect(screen.getByText('Показать результаты')).toBeInTheDocument();
    expect(screen.queryByText(/Выбери значения/)).not.toBeInTheDocument();
  });

  it('hides apply button and shows warning when no sections are filled', () => {
    render(<Filters {...defaultProps} filters={EMPTY} />);

    expect(screen.queryByText('Показать результаты')).not.toBeInTheDocument();
    expect(screen.getByText(/Выбери значения во всех разделах/)).toBeInTheDocument();
  });

  it('hides apply button and shows warning when some sections are filled', () => {
    render(<Filters {...defaultProps} filters={PARTIAL} />);

    expect(screen.queryByText('Показать результаты')).not.toBeInTheDocument();
    expect(screen.getByText(/Выбери значения во всех разделах/)).toBeInTheDocument();
  });

  it('shows ✓ chip for filled section and ✗ chip for missing section', () => {
    render(<Filters {...defaultProps} filters={PARTIAL} />);

    expect(screen.getByText('✓ Категории')).toBeInTheDocument();
    expect(screen.getByText('✗ Город')).toBeInTheDocument();
  });

  it('shows apply button after filling the last missing section', async () => {
    const user = userEvent.setup();
    render(<Filters {...defaultProps} filters={PARTIAL} />);

    expect(screen.queryByText('Показать результаты')).not.toBeInTheDocument();

    await user.click(screen.getByText('Москва'));

    expect(screen.getByText('Показать результаты')).toBeInTheDocument();
    expect(screen.queryByText(/Выбери значения/)).not.toBeInTheDocument();
  });

  it('renders null when isOpen is false', () => {
    const { container } = render(<Filters {...defaultProps} filters={EMPTY} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });
});
