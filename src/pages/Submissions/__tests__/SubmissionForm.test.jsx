import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubmissionForm from '../SubmissionForm.jsx';

const { mockShowToast } = vi.hoisted(() => ({ mockShowToast: vi.fn() }));
vi.mock('../../../components/Toast/ToastContext.jsx', () => ({
  useToast: () => mockShowToast,
}));

// The date/time picker defaults to "today" when no date is passed in yet (fresh
// create-mode groups). Freezing the clock makes picking a fixed time slot like
// "18:00" deterministic — without this, the test would flake whenever it happens
// to run after 18:00 local time, since that "today + 18:00" combination would
// then genuinely be in the past.
let user;
beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T09:00:00'));
  user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
});

afterEach(() => {
  vi.useRealTimers();
});

const fillAboutGroup = async () => {
  await user.type(screen.getByRole('textbox'), 'Митап по бэкенду');
  await user.click(screen.getByText('Митап'));
  await user.click(screen.getByText('Backend'));
  await user.click(screen.getByText('Слушатель'));
};

const fillWhenWhereGroup = async () => {
  await user.click(screen.getByText('Онлайн'));
  await user.click(screen.getByTestId('datetime-trigger-start'));
  await user.click(screen.getByText('18:00'));
  await user.click(screen.getByTestId('datetime-picker-confirm'));
  await user.click(screen.getByTestId('datetime-trigger-end'));
  await user.click(screen.getByText('19:00'));
  await user.click(screen.getByTestId('datetime-picker-confirm'));
};

describe('SubmissionForm', () => {
  it('starts on group 1 of 4 with Назад disabled', () => {
    render(<SubmissionForm mode="create" token="t" onDone={vi.fn()} />);
    expect(screen.getByText('Шаг 1 из 4')).toBeInTheDocument();
    expect(screen.getByText('Назад')).toBeDisabled();
  });

  it('blocks Далее and shows inline errors when the current group is invalid', async () => {
    render(<SubmissionForm mode="create" token="t" onDone={vi.fn()} />);
    await user.click(screen.getByText('Далее'));
    expect(screen.getByText('Пожалуйста, введите название события (минимум 3 символа)')).toBeInTheDocument();
    expect(screen.getByText('Шаг 1 из 4')).toBeInTheDocument();
  });

  it('advances to the next group once the current one is valid, and Назад returns to it', async () => {
    render(<SubmissionForm mode="create" token="t" onDone={vi.fn()} />);
    await fillAboutGroup();
    await user.click(screen.getByText('Далее'));
    expect(screen.getByText('Шаг 2 из 4')).toBeInTheDocument();
    await user.click(screen.getByText('Назад'));
    expect(screen.getByText('Шаг 1 из 4')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Митап по бэкенду')).toBeInTheDocument();
  });

  it('shows "Отправить на проверку" on the last group for create mode, and "Сохранить" for edit mode', async () => {
    const { rerender } = render(<SubmissionForm mode="create" token="t" onDone={vi.fn()} />);
    await fillAboutGroup();
    await user.click(screen.getByText('Далее'));
    await fillWhenWhereGroup();
    await user.click(screen.getByText('Далее'));
    await user.click(screen.getByText('Далее'));
    expect(screen.getByText('Отправить на проверку')).toBeInTheDocument();

    // groupIndex is preserved across the rerender (same component instance) — still on
    // the last group, so switching mode to 'edit' should immediately swap the label to
    // "Сохранить" rather than "Отправить на проверку".
    rerender(<SubmissionForm mode="edit" editingId={7} token="t" onDone={vi.fn()} />);
    expect(screen.getByText('Сохранить')).toBeInTheDocument();
  });

  it('prefills fields from initialValues', () => {
    render(
      <SubmissionForm
        mode="edit"
        editingId={7}
        token="t"
        initialValues={{ title: 'Существующая заявка', event_type: ['Митап'], track: ['Backend'], participation_type: ['Слушатель'] }}
        onDone={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('Существующая заявка')).toBeInTheDocument();
  });

  it('submits via POST for create mode and calls onDone("create") on success', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const onDone = vi.fn();
    render(<SubmissionForm mode="create" token="t" onDone={onDone} />);
    await fillAboutGroup();
    await user.click(screen.getByText('Далее'));
    await fillWhenWhereGroup();
    await user.click(screen.getByText('Далее'));
    await user.click(screen.getByText('Далее'));
    const [nameInput] = screen.getAllByRole('textbox');
    await user.type(nameInput, 'Иван Иванов');
    const telegramInput = screen.getAllByRole('textbox')[1];
    await user.type(telegramInput, '@ivanov');
    await user.click(screen.getByText('Отправить на проверку'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/submissions',
      expect.objectContaining({ method: 'POST' })
    ));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('create'));
  });

  it('submits via PATCH to the editingId URL for edit mode', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const onDone = vi.fn();
    render(
      <SubmissionForm
        mode="edit"
        editingId={42}
        token="t"
        initialValues={{
          title: 'Существующая заявка', event_type: ['Митап'], track: ['Backend'], participation_type: ['Слушатель'],
          city: ['Онлайн'], start_date: '2026-09-07', start_time: '18:00', end_date: '2026-09-07', end_time: '19:00',
          contact_person: 'Иван Иванов', contact_telegram: '@ivanov',
        }}
        onDone={onDone}
      />
    );
    await user.click(screen.getByText('Далее'));
    await user.click(screen.getByText('Далее'));
    await user.click(screen.getByText('Далее'));
    await user.click(screen.getByText('Сохранить'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/submissions/42',
      expect.objectContaining({ method: 'PATCH' })
    ));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('edit'));
  });

  it('shows a toast and does not call onDone when the submit request fails', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });
    const onDone = vi.fn();
    render(
      <SubmissionForm
        mode="edit"
        editingId={42}
        token="t"
        initialValues={{
          title: 'XXX', event_type: ['Митап'], track: ['Backend'], participation_type: ['Слушатель'],
          city: ['Онлайн'], start_date: '2026-09-07', start_time: '18:00', end_date: '2026-09-07', end_time: '19:00',
          contact_person: 'Иван Иванов', contact_telegram: '@ivanov',
        }}
        onDone={onDone}
      />
    );
    await user.click(screen.getByText('Далее'));
    await user.click(screen.getByText('Далее'));
    await user.click(screen.getByText('Далее'));
    await user.click(screen.getByText('Сохранить'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Не удалось сохранить заявку. Попробуйте ещё раз'));
    expect(onDone).not.toHaveBeenCalled();
  });
});
