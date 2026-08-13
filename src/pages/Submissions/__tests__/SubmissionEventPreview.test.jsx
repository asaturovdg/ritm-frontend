import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SubmissionEventPreview from '../SubmissionEventPreview.jsx';

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: vi.fn(), shareEvent: vi.fn(), showAlert: vi.fn(), platform: 'web' }),
}));

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', userId: '1', isCheckingAuth: false }),
}));

const pendingSubmission = {
  id: 1,
  title: 'Митап по бэкенду',
  status: 'pending',
  event_type: ['Митап'],
  start_date: '2026-09-01',
  start_time: '18:00',
  price: 0,
  city: ['Онлайн'],
  description: 'Описание события',
};

const renderPreview = (submission, onClose = vi.fn()) =>
  render(
    <MemoryRouter>
      <SubmissionEventPreview submission={submission} onClose={onClose} />
    </MemoryRouter>
  );

describe('SubmissionEventPreview', () => {
  it('renders the submission through the real event-page layout', () => {
    renderPreview(pendingSubmission);
    expect(screen.getByRole('heading', { name: 'Митап по бэкенду' })).toBeInTheDocument();
    expect(screen.getByText('Описание события')).toBeInTheDocument();
    expect(screen.getByText('Бесплатно')).toBeInTheDocument();
  });

  it('shows the submission status badge', () => {
    renderPreview(pendingSubmission);
    expect(screen.getByText('На модерации')).toBeInTheDocument();
  });

  it('shows the rejection reason for a rejected submission', () => {
    renderPreview({ ...pendingSubmission, status: 'rejected', rejection_reason: 'Дубликат события' });
    expect(screen.getByText('Отклонено')).toBeInTheDocument();
    expect(screen.getByText('Дубликат события')).toBeInTheDocument();
  });

  it('hides live event actions (share, bookmark, calendar) in preview mode', () => {
    renderPreview(pendingSubmission);
    expect(screen.queryByLabelText('Поделиться')).not.toBeInTheDocument();
    expect(screen.queryByText('В календарь')).not.toBeInTheDocument();
  });

  it('calls onClose when the backdrop or the close button is clicked', async () => {
    const onClose = vi.fn();
    renderPreview(pendingSubmission, onClose);
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the preview panel itself is clicked', async () => {
    const onClose = vi.fn();
    renderPreview(pendingSubmission, onClose);
    await userEvent.click(screen.getByRole('heading', { name: 'Митап по бэкенду' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
