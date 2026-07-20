import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ModerationCard from '../ModerationCard.jsx';

const renderCard = (props) => render(<ModerationCard {...props} />, { wrapper: MemoryRouter });

const baseEvent = {
  id: 42,
  title: 'Митап по бекенду',
  description: 'Расскажем про очередь.',
  city: ['Москва'],
  event_type: ['Конференция'],
  quality_score: 3,
  suggestions: {
    title: 'Митап по бэкенду: как мы...',
    start_date: '2026-06-16',
  },
  start_date: '2026-06-15',
};

describe('ModerationCard', () => {
  it('renders the counter, quality badge, and a before/after block per suggestion key', () => {
    renderCard({ event: baseEvent, index: 2, total: 42, onOpenList: vi.fn(), onApprove: vi.fn(), onReject: vi.fn() });
    expect(screen.getByText('3 / 42')).toBeInTheDocument();
    expect(screen.getByText(/3\/5/)).toBeInTheDocument();
    expect(screen.getByText('Митап по бекенду')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Митап по бэкенду: как мы...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-06-16')).toBeInTheDocument();
  });

  it('calls onOpenList when the counter is clicked', async () => {
    const onOpenList = vi.fn();
    renderCard({ event: baseEvent, index: 2, total: 42, onOpenList: onOpenList, onApprove: vi.fn(), onReject: vi.fn() });
    await userEvent.click(screen.getByText('3 / 42'));
    expect(onOpenList).toHaveBeenCalledTimes(1);
  });

  it('calls onReject with the event id when "Пропустить" is clicked', async () => {
    const onReject = vi.fn();
    renderCard({ event: baseEvent, index: 0, total: 1, onOpenList: vi.fn(), onApprove: vi.fn(), onReject: onReject });
    await userEvent.click(screen.getByText('Пропустить'));
    expect(onReject).toHaveBeenCalledWith(42);
  });

  it('excludes an unchecked field and includes a manually edited value in the approve payload', async () => {
    const onApprove = vi.fn();
    renderCard({ event: baseEvent, index: 0, total: 1, onOpenList: vi.fn(), onApprove: onApprove, onReject: vi.fn() });

    const startDateCheckbox = screen.getByLabelText('принять правку: Дата начала');
    await userEvent.click(startDateCheckbox); // uncheck

    const titleInput = screen.getByDisplayValue('Митап по бэкенду: как мы...');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Митап по бэкенду (правка админа)');

    await userEvent.click(screen.getByText('Принять выбранное'));

    expect(onApprove).toHaveBeenCalledWith(42, { title: 'Митап по бэкенду (правка админа)' });
  });

  it('shows an unchanged-fields summary line for fields not in suggestions', () => {
    renderCard({ event: baseEvent, index: 0, total: 1, onOpenList: vi.fn(), onApprove: vi.fn(), onReject: vi.fn() });
    expect(screen.getByText(/Москва/)).toBeInTheDocument();
    expect(screen.getByText(/Конференция/)).toBeInTheDocument();
  });

  it('renders a select control for enum fields instead of free text', () => {
    const eventWithCitySuggestion = {
      ...baseEvent,
      suggestions: { city: 'Санкт-Петербург' },
    };
    renderCard({ event: eventWithCitySuggestion, index: 0, total: 1, onOpenList: vi.fn(), onApprove: vi.fn(), onReject: vi.fn() });
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('Санкт-Петербург');
  });

  it('renders human-readable text for people-typed fields instead of [object Object]', () => {
    const eventWithOrganizersSuggestion = {
      ...baseEvent,
      organizers: [{ name: 'Пётр Петров', url: null }],
      suggestions: {
        organizers: [{ name: 'Иван Петров', url: 'https://example.com' }],
      },
    };
    renderCard({ event: eventWithOrganizersSuggestion, index: 0, total: 1, onOpenList: vi.fn(), onApprove: vi.fn(), onReject: vi.fn() });

    expect(screen.getByText('Пётр Петров')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Иван Петров (https://example.com)')).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });

  it('links to the original event page so the admin can see it in context', () => {
    renderCard({ event: baseEvent, index: 0, total: 1, onOpenList: vi.fn(), onApprove: vi.fn(), onReject: vi.fn() });
    const link = screen.getByText('Открыть карточку события →');
    expect(link).toHaveAttribute('href', '/events/42');
  });

  it('excludes a checked-but-invalid field from the approve payload', async () => {
    const onApprove = vi.fn();
    const eventWithBadDate = {
      ...baseEvent,
      suggestions: {
        ...baseEvent.suggestions,
      },
    };
    renderCard({ event: eventWithBadDate, index: 0, total: 1, onOpenList: vi.fn(), onApprove: onApprove, onReject: vi.fn() });

    const startDateInput = screen.getByDisplayValue('2026-06-16');
    await userEvent.clear(startDateInput);
    await userEvent.type(startDateInput, 'not-a-date');

    // checkbox stays checked (default), but value is invalid
    await userEvent.click(screen.getByText('Принять выбранное'));

    expect(onApprove).toHaveBeenCalledWith(42, { title: 'Митап по бэкенду: как мы...' });
  });
});
