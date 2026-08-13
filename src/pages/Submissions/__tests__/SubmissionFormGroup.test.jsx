import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SubmissionFormGroup from '../SubmissionFormGroup.jsx';
import { EMPTY_FORM_DATA } from '../submissionFormFields.js';

describe('SubmissionFormGroup', () => {
  it('renders the group title and only the fields that belong to it', () => {
    render(
      <SubmissionFormGroup
        groupId="about"
        formData={EMPTY_FORM_DATA}
        errors={{}}
        onFieldChange={vi.fn()}
        onDateTimeChange={vi.fn()}
      />
    );
    expect(screen.getByText('О событии')).toBeInTheDocument();
    expect(screen.getByText('Название события *')).toBeInTheDocument();
    expect(screen.getByText('Тема *')).toBeInTheDocument();
    expect(screen.queryByText('Стоимость участия, ₽')).not.toBeInTheDocument();
  });

  it('passes the matching error down to each field', () => {
    render(
      <SubmissionFormGroup
        groupId="about"
        formData={EMPTY_FORM_DATA}
        errors={{ title: 'Пожалуйста, введите название события (минимум 3 символа)' }}
        onFieldChange={vi.fn()}
        onDateTimeChange={vi.fn()}
      />
    );
    expect(screen.getByText('Пожалуйста, введите название события (минимум 3 символа)')).toBeInTheDocument();
  });

  it('shows the _group cross-field error for the contacts group', () => {
    render(
      <SubmissionFormGroup
        groupId="contacts"
        formData={EMPTY_FORM_DATA}
        errors={{ _group: 'Укажите хотя бы один способ связи: сайт, Telegram или email' }}
        onFieldChange={vi.fn()}
        onDateTimeChange={vi.fn()}
      />
    );
    expect(screen.getByText('Укажите хотя бы один способ связи: сайт, Telegram или email')).toBeInTheDocument();
  });
});
