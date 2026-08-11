import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SubmissionCard from '../SubmissionCard.jsx';

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: vi.fn() }),
}));

const pendingSubmission = {
  id: 1,
  title: 'Митап по бэкенду',
  status: 'pending',
  event_type: ['IT'],
  start_date: '2026-09-01',
  start_time: '18:00:00',
  price: 0,
  city: ['Москва'],
};

const renderCard = (submission, props = {}) =>
  render(
    <MemoryRouter>
      <SubmissionCard submission={submission} token="t" userId="1" onShowDetails={vi.fn()} onCancel={vi.fn()} {...props} />
    </MemoryRouter>
  );

describe('SubmissionCard', () => {
  it('renders the title, status badge and price', () => {
    renderCard(pendingSubmission);
    expect(screen.getByText('Митап по бэкенду')).toBeInTheDocument();
    expect(screen.getByText('На модерации')).toBeInTheDocument();
    expect(screen.getByText('Бесплатно')).toBeInTheDocument();
  });

  it('opens the kebab menu and shows Подробнее + Отменить for a pending submission', async () => {
    renderCard(pendingSubmission);
    await userEvent.click(screen.getByTestId('submission-card-menu-trigger'));
    expect(screen.getByTestId('submission-card-menu-details')).toBeInTheDocument();
    expect(screen.getByTestId('submission-card-menu-cancel')).toBeInTheDocument();
  });

  it('only shows Подробнее (no cancel) for a rejected submission', async () => {
    renderCard({ ...pendingSubmission, status: 'rejected', rejection_reason: 'дубль' });
    await userEvent.click(screen.getByTestId('submission-card-menu-trigger'));
    expect(screen.getByTestId('submission-card-menu-details')).toBeInTheDocument();
    expect(screen.queryByTestId('submission-card-menu-cancel')).not.toBeInTheDocument();
  });

  it('calls onShowDetails with the submission when Подробнее is clicked', async () => {
    const onShowDetails = vi.fn();
    renderCard(pendingSubmission, { onShowDetails });
    await userEvent.click(screen.getByTestId('submission-card-menu-trigger'));
    await userEvent.click(screen.getByTestId('submission-card-menu-details'));
    expect(onShowDetails).toHaveBeenCalledWith(pendingSubmission);
  });

  it('calls onCancel with the submission when Отменить is clicked', async () => {
    const onCancel = vi.fn();
    renderCard(pendingSubmission, { onCancel });
    await userEvent.click(screen.getByTestId('submission-card-menu-trigger'));
    await userEvent.click(screen.getByTestId('submission-card-menu-cancel'));
    expect(onCancel).toHaveBeenCalledWith(pendingSubmission);
  });

  it('renders a direct link to the event instead of a kebab menu when approved with a published event', () => {
    renderCard({ ...pendingSubmission, status: 'approved', published_event_id: 42 });
    expect(screen.queryByTestId('submission-card-menu-trigger')).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/events/42');
  });
});

describe('SubmissionCard edit/resubmit actions', () => {
  it('shows Редактировать (not Отправить заново) for a pending submission and calls onEdit', async () => {
    const onEdit = vi.fn();
    renderCard(pendingSubmission, { onEdit });
    await userEvent.click(screen.getByTestId('submission-card-menu-trigger'));
    expect(screen.getByTestId('submission-card-menu-edit')).toBeInTheDocument();
    expect(screen.queryByTestId('submission-card-menu-resubmit')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('submission-card-menu-edit'));
    expect(onEdit).toHaveBeenCalledWith(pendingSubmission);
  });

  it('shows Отправить заново (not Редактировать) for a rejected submission and calls onResubmit', async () => {
    const onResubmit = vi.fn();
    const rejected = { ...pendingSubmission, status: 'rejected' };
    renderCard(rejected, { onResubmit });
    await userEvent.click(screen.getByTestId('submission-card-menu-trigger'));
    expect(screen.getByTestId('submission-card-menu-resubmit')).toBeInTheDocument();
    expect(screen.queryByTestId('submission-card-menu-edit')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('submission-card-menu-resubmit'));
    expect(onResubmit).toHaveBeenCalledWith(rejected);
  });
});
