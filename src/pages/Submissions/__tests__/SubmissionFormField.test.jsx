import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubmissionFormField from '../SubmissionFormField.jsx';
import { EMPTY_FORM_DATA } from '../submissionFormFields.js';

vi.mock('../SubmissionDateTimePicker.jsx', () => ({
  default: ({ label, onConfirm, onClose }) => (
    <div data-testid="mock-datetime-picker">
      <span>{label}</span>
      <button onClick={() => onConfirm('2026-09-07', '18:00')}>mock-confirm</button>
      <button onClick={onClose}>mock-close</button>
    </div>
  ),
}));

const renderField = (fieldId, overrides = {}, props = {}) =>
  render(
    <SubmissionFormField
      fieldId={fieldId}
      formData={{ ...EMPTY_FORM_DATA, ...overrides }}
      error={null}
      onFieldChange={vi.fn()}
      onDateTimeChange={vi.fn()}
      {...props}
    />
  );

describe('SubmissionFormField', () => {
  it('renders a required label with an asterisk for a text field, and calls onFieldChange on input', async () => {
    const onFieldChange = vi.fn();
    renderField('title', {}, { onFieldChange });
    expect(screen.getByText('Название события *')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox'), 'M');
    expect(onFieldChange).toHaveBeenCalledWith('title', 'M');
  });

  it('renders an optional label without an asterisk', () => {
    renderField('description');
    expect(screen.getByText('Описание')).toBeInTheDocument();
  });

  it('toggles a multiselect chip and calls onFieldChange with the updated array', async () => {
    const onFieldChange = vi.fn();
    renderField('event_type', { event_type: ['Конференция'] }, { onFieldChange });
    await userEvent.click(screen.getByText('Митап'));
    expect(onFieldChange).toHaveBeenCalledWith('event_type', ['Конференция', 'Митап']);
  });

  it('deselecting an active chip removes it from the array', async () => {
    const onFieldChange = vi.fn();
    renderField('event_type', { event_type: ['Конференция', 'Митап'] }, { onFieldChange });
    await userEvent.click(screen.getByText('Конференция'));
    expect(onFieldChange).toHaveBeenCalledWith('event_type', ['Митап']);
  });

  it('adds a tag on Enter and clears the input', async () => {
    const onFieldChange = vi.fn();
    renderField('organizers', { organizers: [] }, { onFieldChange });
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Alice{Enter}');
    expect(onFieldChange).toHaveBeenCalledWith('organizers', ['Alice']);
  });

  it('removes a tag when its × button is clicked', async () => {
    const onFieldChange = vi.fn();
    renderField('organizers', { organizers: ['Alice', 'Bob'] }, { onFieldChange });
    await userEvent.click(screen.getAllByText('×')[0]);
    expect(onFieldChange).toHaveBeenCalledWith('organizers', ['Bob']);
  });

  it('strips whitespace from contact_telegram as it is typed', async () => {
    const onFieldChange = vi.fn();
    renderField('contact_telegram', {}, { onFieldChange });
    await userEvent.type(screen.getByRole('textbox'), '@ ivan');
    expect(onFieldChange).toHaveBeenLastCalledWith('contact_telegram', '@ivan');
  });

  it('rejects non-Cyrillic/Latin characters while typing contact_person', async () => {
    const onFieldChange = vi.fn();
    renderField('contact_person', {}, { onFieldChange });
    await userEvent.type(screen.getByRole('textbox'), '1');
    expect(onFieldChange).not.toHaveBeenCalled();
  });

  it('auto-prefixes https:// on contact_website when a bare domain is typed', async () => {
    const onFieldChange = vi.fn();
    renderField('contact_website', {}, { onFieldChange });
    await userEvent.type(screen.getByRole('textbox'), 'sber.ru');
    expect(onFieldChange).toHaveBeenLastCalledWith('contact_website', 'https://sber.ru');
  });

  it('shows an inline format hint for an invalid contact_email without blocking input', () => {
    renderField('contact_email', { contact_email: 'not-an-email' });
    expect(screen.getByText('Неверный формат email')).toBeInTheDocument();
  });

  it('shows the passed-in error message', () => {
    render(
      <SubmissionFormField
        fieldId="title"
        formData={EMPTY_FORM_DATA}
        error="Пожалуйста, введите название события (минимум 3 символа)"
        onFieldChange={vi.fn()}
        onDateTimeChange={vi.fn()}
      />
    );
    expect(screen.getByText('Пожалуйста, введите название события (минимум 3 символа)')).toBeInTheDocument();
  });

  it('renders two datetime trigger rows and opens the start/end picker on click', async () => {
    renderField('date_time', { start_date: '2026-09-01', start_time: '10:00' });
    expect(screen.getByTestId('datetime-trigger-start')).toHaveTextContent('01.09.2026');
    expect(screen.getByTestId('datetime-trigger-end')).toHaveTextContent('выбрать');
    await userEvent.click(screen.getByTestId('datetime-trigger-start'));
    expect(screen.getByTestId('mock-datetime-picker')).toHaveTextContent('Начало события');
  });

  it('confirming the start picker calls onDateTimeChange with start_date/start_time only', async () => {
    const onDateTimeChange = vi.fn();
    renderField('date_time', {}, { onDateTimeChange });
    await userEvent.click(screen.getByTestId('datetime-trigger-start'));
    await userEvent.click(screen.getByText('mock-confirm'));
    expect(onDateTimeChange).toHaveBeenCalledWith({ start_date: '2026-09-07', start_time: '18:00' });
  });

  it('confirming the end picker calls onDateTimeChange with end_date/end_time only', async () => {
    const onDateTimeChange = vi.fn();
    renderField('date_time', {}, { onDateTimeChange });
    await userEvent.click(screen.getByTestId('datetime-trigger-end'));
    await userEvent.click(screen.getByText('mock-confirm'));
    expect(onDateTimeChange).toHaveBeenCalledWith({ end_date: '2026-09-07', end_time: '18:00' });
  });
});
