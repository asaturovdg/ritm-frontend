import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SubmissionQueueCard from '../SubmissionQueueCard.jsx';

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: vi.fn(), shareEvent: vi.fn(), showAlert: vi.fn(), platform: 'web' }),
}));

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', userId: '1', isCheckingAuth: false }),
}));

const submission = {
  id: 7,
  title: 'Митап по бэкенду',
  status: 'pending',
  event_type: ['Митап'],
  start_date: '2026-09-01',
  price: 0,
  city: ['Онлайн'],
};

const renderCard = (props = {}) =>
  render(
    <MemoryRouter>
      <SubmissionQueueCard
        submission={submission}
        index={0}
        total={1}
        onOpenList={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  );

describe('SubmissionQueueCard', () => {
  it('renders the counter and the submission through the real event preview', () => {
    renderCard({ index: 2, total: 9 });
    expect(screen.getByText('3 / 9')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Митап по бэкенду' })).toBeInTheDocument();
  });

  it('calls onOpenList when the counter is clicked', async () => {
    const onOpenList = vi.fn();
    renderCard({ onOpenList });
    await userEvent.click(screen.getByText('1 / 1'));
    expect(onOpenList).toHaveBeenCalledTimes(1);
  });

  it('calls onApprove with the submission id, with no confirmation step', async () => {
    const onApprove = vi.fn();
    renderCard({ onApprove });
    await userEvent.click(screen.getByTestId('submission-queue-card__approve'));
    expect(onApprove).toHaveBeenCalledWith(7);
  });

  it('opens a reason popover when Отклонить is clicked, instead of rejecting immediately', async () => {
    const onReject = vi.fn();
    renderCard({ onReject });
    await userEvent.click(screen.getByTestId('submission-queue-card__reject-toggle'));
    expect(screen.getByTestId('reject-popover')).toBeInTheDocument();
    expect(onReject).not.toHaveBeenCalled();
  });

  it('confirms rejection with an empty reason when nothing is typed', async () => {
    const onReject = vi.fn();
    renderCard({ onReject });
    await userEvent.click(screen.getByTestId('submission-queue-card__reject-toggle'));
    await userEvent.click(screen.getByTestId('submission-queue-card__reject-confirm'));
    expect(onReject).toHaveBeenCalledWith(7, '');
  });

  it('confirms rejection with the typed reason', async () => {
    const onReject = vi.fn();
    renderCard({ onReject });
    await userEvent.click(screen.getByTestId('submission-queue-card__reject-toggle'));
    await userEvent.type(screen.getByPlaceholderText('Причина (необязательно)'), 'Дубликат');
    await userEvent.click(screen.getByTestId('submission-queue-card__reject-confirm'));
    expect(onReject).toHaveBeenCalledWith(7, 'Дубликат');
  });

  it('closes the reason popover on outside click without calling onReject', async () => {
    const onReject = vi.fn();
    renderCard({ onReject });
    await userEvent.click(screen.getByTestId('submission-queue-card__reject-toggle'));
    expect(screen.getByTestId('reject-popover')).toBeInTheDocument();
    await userEvent.click(document.body);
    expect(screen.queryByTestId('reject-popover')).not.toBeInTheDocument();
    expect(onReject).not.toHaveBeenCalled();
  });
});
