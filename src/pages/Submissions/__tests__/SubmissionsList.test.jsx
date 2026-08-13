import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SubmissionsList from '../SubmissionsList.jsx';

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: vi.fn(), shareEvent: vi.fn(), showAlert: vi.fn(), platform: 'web' }),
}));

const { mockShowToast } = vi.hoisted(() => ({ mockShowToast: vi.fn() }));
vi.mock('../../../components/Toast/ToastContext.jsx', () => ({
  useToast: () => mockShowToast,
}));

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', userId: '1', isCheckingAuth: false }),
}));

const submission = (overrides = {}) => ({
  id: 1,
  title: 'Митап по бэкенду',
  status: 'pending',
  event_type: ['IT'],
  start_date: '2026-09-01',
  price: 0,
  city: ['Москва'],
  ...overrides,
});

const renderList = (props = {}) =>
  render(
    <MemoryRouter>
      <SubmissionsList
        submissions={[]}
        isLoading={false}
        hasLoadedOnce={true}
        token="t"
        userId="1"
        onRefetch={vi.fn()}
        onCreateNew={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('SubmissionsList', () => {
  it('shows a spinner while loading', () => {
    renderList({ isLoading: true, hasLoadedOnce: false });
    expect(document.querySelector('.spinner')).toBeTruthy();
  });

  it('shows the empty state with a create-event CTA when there are no submissions', async () => {
    const onCreateNew = vi.fn();
    renderList({ submissions: [], onCreateNew });
    expect(screen.getByText('У вас пока нет отправленных заявок')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Создать событие'));
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('renders the filter tabs and a card per submission', () => {
    renderList({ submissions: [submission({ id: 1 }), submission({ id: 2, status: 'approved' })] });
    expect(screen.getByTestId('submission-filter-all')).toBeInTheDocument();
    expect(screen.getAllByText('Митап по бэкенду')).toHaveLength(2);
  });

  it('filters the visible cards when a status tab is clicked', async () => {
    renderList({
      submissions: [
        submission({ id: 1, status: 'pending', title: 'Заявка на модерации' }),
        submission({ id: 2, status: 'approved', title: 'Одобренная заявка' }),
      ],
    });
    await userEvent.click(screen.getByTestId('submission-filter-approved'));
    expect(screen.queryByText('Заявка на модерации')).not.toBeInTheDocument();
    expect(screen.getByText('Одобренная заявка')).toBeInTheDocument();
  });

  it('shows a filtered-empty message (not the CTA empty state) when a filter matches nothing', async () => {
    renderList({ submissions: [submission({ id: 1, status: 'pending' })] });
    await userEvent.click(screen.getByTestId('submission-filter-rejected'));
    expect(screen.getByText('Нет заявок в статусе «Отклонено»')).toBeInTheDocument();
    expect(screen.queryByText('У вас пока нет отправленных заявок')).not.toBeInTheDocument();
  });

  it('opens the event preview from a card\'s "Подробнее" menu item', async () => {
    renderList({ submissions: [submission({ id: 1 })] });
    await userEvent.click(screen.getByTestId('submission-card-menu-trigger'));
    await userEvent.click(screen.getByTestId('submission-card-menu-details'));
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
  });

  it('opens the event preview by tapping the card itself', async () => {
    renderList({ submissions: [submission({ id: 1 })] });
    await userEvent.click(screen.getByText('Митап по бэкенду'));
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
  });

  it('closes the event preview via the close button', async () => {
    renderList({ submissions: [submission({ id: 1 })] });
    await userEvent.click(screen.getByText('Митап по бэкенду'));
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(screen.queryByRole('button', { name: 'Закрыть' })).not.toBeInTheDocument();
  });

  it('opens the cancel confirm modal, calls DELETE, and refetches on success', async () => {
    const onRefetch = vi.fn();
    global.fetch.mockResolvedValue({ ok: true, status: 204 });
    renderList({ submissions: [submission({ id: 7 })], onRefetch });

    await userEvent.click(screen.getByTestId('submission-card-menu-trigger'));
    await userEvent.click(screen.getByTestId('submission-card-menu-cancel'));
    expect(screen.getByTestId('cancel-submission-confirm')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('cancel-submission-confirm'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/submissions/7',
      expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer t' } })
    ));
    await waitFor(() => expect(onRefetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('cancel-submission-confirm')).not.toBeInTheDocument();
  });

  it('shows a toast and keeps the confirm modal closed-on-retry state when the DELETE call fails', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });
    renderList({ submissions: [submission({ id: 7 })] });

    await userEvent.click(screen.getByTestId('submission-card-menu-trigger'));
    await userEvent.click(screen.getByTestId('submission-card-menu-cancel'));
    await userEvent.click(screen.getByTestId('cancel-submission-confirm'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Не удалось отменить заявку. Попробуйте ещё раз'));
    expect(screen.getByText('Митап по бэкенду')).toBeInTheDocument();
  });

  it('passes onEdit/onResubmit through to the card', async () => {
    const onEdit = vi.fn();
    const onResubmit = vi.fn();
    renderList({
      submissions: [submission({ id: 1, status: 'pending' }), submission({ id: 2, status: 'rejected' })],
      onEdit,
      onResubmit,
    });

    const triggers = screen.getAllByTestId('submission-card-menu-trigger');
    await userEvent.click(triggers[0]);
    await userEvent.click(screen.getByTestId('submission-card-menu-edit'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));

    await userEvent.click(triggers[1]);
    await userEvent.click(screen.getByTestId('submission-card-menu-resubmit'));
    expect(onResubmit).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });
});
