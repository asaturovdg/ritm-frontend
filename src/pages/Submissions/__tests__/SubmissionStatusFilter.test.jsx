import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubmissionStatusFilter from '../SubmissionStatusFilter.jsx';

const submissions = [
  { id: 1, status: 'pending' },
  { id: 2, status: 'pending' },
  { id: 3, status: 'approved' },
  { id: 4, status: 'rejected' },
];

describe('SubmissionStatusFilter', () => {
  it('renders one tab per status with a count including "Все"', () => {
    render(<SubmissionStatusFilter submissions={submissions} activeFilter="all" onChange={vi.fn()} />);
    expect(screen.getByTestId('submission-filter-all')).toHaveTextContent('Все');
    expect(screen.getByTestId('submission-filter-all')).toHaveTextContent('4');
    expect(screen.getByTestId('submission-filter-pending')).toHaveTextContent('2');
    expect(screen.getByTestId('submission-filter-approved')).toHaveTextContent('1');
    expect(screen.getByTestId('submission-filter-rejected')).toHaveTextContent('1');
  });

  it('marks the active filter tab', () => {
    render(<SubmissionStatusFilter submissions={submissions} activeFilter="pending" onChange={vi.fn()} />);
    expect(screen.getByTestId('submission-filter-pending').className).toContain('active');
    expect(screen.getByTestId('submission-filter-all').className).not.toContain('active');
  });

  it('calls onChange with the clicked filter key', async () => {
    const onChange = vi.fn();
    render(<SubmissionStatusFilter submissions={submissions} activeFilter="all" onChange={onChange} />);
    await userEvent.click(screen.getByTestId('submission-filter-rejected'));
    expect(onChange).toHaveBeenCalledWith('rejected');
  });
});
