import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubmissionDetailsModal from '../SubmissionDetailsModal.jsx';

const mockOpenLink = vi.fn();
vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: mockOpenLink }),
}));

const baseSubmission = {
  id: 1,
  title: 'Митап по бэкенду',
  status: 'pending',
  start_date: '2026-09-01',
  start_time: '18:00:00',
  price: 0,
};

describe('SubmissionDetailsModal', () => {
  it('renders the title and status', () => {
    render(<SubmissionDetailsModal submission={baseSubmission} onClose={vi.fn()} />);
    expect(screen.getByText('Митап по бэкенду')).toBeInTheDocument();
    expect(screen.getByText('На модерации')).toBeInTheDocument();
  });

  it('shows the rejection reason only when present', () => {
    const { rerender } = render(<SubmissionDetailsModal submission={baseSubmission} onClose={vi.fn()} />);
    expect(screen.queryByText(/Причина отклонения/)).not.toBeInTheDocument();

    rerender(
      <SubmissionDetailsModal
        submission={{ ...baseSubmission, status: 'rejected', rejection_reason: 'Дублирует существующее событие' }}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/Причина отклонения/)).toBeInTheDocument();
    expect(screen.getByText('Дублирует существующее событие')).toBeInTheDocument();
  });

  it('calls onClose from the header close button', async () => {
    const onClose = vi.fn();
    render(<SubmissionDetailsModal submission={baseSubmission} onClose={onClose} />);
    await userEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('routes event_url clicks through usePlatform openLink', async () => {
    render(<SubmissionDetailsModal submission={{ ...baseSubmission, event_url: 'https://example.com' }} onClose={vi.fn()} />);
    await userEvent.click(screen.getByText('https://example.com'));
    expect(mockOpenLink).toHaveBeenCalledWith('https://example.com');
  });
});
