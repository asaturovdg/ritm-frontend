import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Submissions from '../Submissions.jsx';

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: vi.fn() }),
}));

const { mockShowToast } = vi.hoisted(() => ({ mockShowToast: vi.fn() }));
vi.mock('../../../components/Toast/ToastContext.jsx', () => ({
  useToast: () => mockShowToast,
}));

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', userId: '1' }),
}));

const submissionsPayload = [
  { id: 1, title: 'Митап по бэкенду', status: 'pending', event_type: ['IT'], start_date: '2026-09-01', price: 0, city: ['Москва'] },
];

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

const renderSubmissions = () => render(<MemoryRouter><Submissions /></MemoryRouter>);

describe('Submissions page — Мои заявки tab', () => {
  it('fetches submissions with a full-screen spinner on first entry', async () => {
    let resolveFetch;
    global.fetch.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));
    renderSubmissions();
    await userEvent.click(screen.getByText('Мои заявки'));
    expect(document.querySelector('.spinner')).toBeTruthy();
    resolveFetch({ ok: true, json: async () => submissionsPayload });
    expect(await screen.findByText('Митап по бэкенду')).toBeInTheDocument();
  });

  it('refetches silently (no spinner) when re-entering the tab after data is already cached', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => submissionsPayload });
    renderSubmissions();
    await userEvent.click(screen.getByText('Мои заявки'));
    await screen.findByText('Митап по бэкенду');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByText('Создать событие'));
    await userEvent.click(screen.getByText('Мои заявки'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(document.querySelector('.spinner')).toBeFalsy();
    expect(screen.getByText('Митап по бэкенду')).toBeInTheDocument();
  });

  it('shows a toast and keeps stale data on a background refetch failure', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => submissionsPayload })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    renderSubmissions();
    await userEvent.click(screen.getByText('Мои заявки'));
    await screen.findByText('Митап по бэкенду');

    await userEvent.click(screen.getByText('Создать событие'));
    await userEvent.click(screen.getByText('Мои заявки'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Не удалось загрузить заявки. Попробуйте ещё раз'));
    expect(screen.getByText('Митап по бэкенду')).toBeInTheDocument();
  });
});

// A date safely in the future no matter when this suite runs, so validateField('date_time', ...)
// passes without needing to fake the system clock in this integration-level test file.
const futureDate = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];

const editablePendingSubmission = (overrides = {}) => ({
  id: 5,
  title: 'Митап по бэкенду',
  status: 'pending',
  event_type: ['Митап'],
  track: ['Backend'],
  participation_type: ['Слушатель'],
  start_date: futureDate,
  start_time: '18:00',
  end_date: futureDate,
  end_time: '19:00',
  city: ['Онлайн'], // avoids also having to fill the conditionally-required address field
  price: 0,
  contact_person: 'Иван Иванов',
  contact_telegram: '@ivanov',
  ...overrides,
});

describe('Submissions page — Создать событие tab (wizard rework)', () => {
  it('resets to a fresh create form when the "Создать событие" tab is clicked', async () => {
    renderSubmissions();
    expect(screen.getByText('Шаг 1 из 4')).toBeInTheDocument();
  });

  it('clicking Редактировать on a pending card switches to the create tab prefilled in edit mode', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => [editablePendingSubmission()] });
    renderSubmissions();
    await userEvent.click(screen.getByText('Мои заявки'));
    await screen.findByText('Митап по бэкенду');
    await userEvent.click(screen.getByTestId('submission-card-menu-trigger'));
    await userEvent.click(screen.getByTestId('submission-card-menu-edit'));

    expect(screen.getByDisplayValue('Митап по бэкенду')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Далее'));
    await userEvent.click(screen.getByText('Далее'));
    await userEvent.click(screen.getByText('Далее'));
    expect(screen.getByText('Сохранить')).toBeInTheDocument();
  });

  it('a successful edit shows a toast, returns to Мои заявки, and refetches', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [editablePendingSubmission()] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // PATCH
      .mockResolvedValueOnce({ ok: true, json: async () => [] }); // refetch after edit
    renderSubmissions();
    await userEvent.click(screen.getByText('Мои заявки'));
    await screen.findByText('Митап по бэкенду');
    await userEvent.click(screen.getByTestId('submission-card-menu-trigger'));
    await userEvent.click(screen.getByTestId('submission-card-menu-edit'));

    await userEvent.click(screen.getByText('Далее'));
    await userEvent.click(screen.getByText('Далее'));
    await userEvent.click(screen.getByText('Далее'));
    await userEvent.click(screen.getByText('Сохранить'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Заявка обновлена'));
    expect(await screen.findByText('Мои заявки')).toHaveClass('active');
  });
});
