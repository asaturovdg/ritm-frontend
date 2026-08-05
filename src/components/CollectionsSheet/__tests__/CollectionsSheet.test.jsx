import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CollectionsSheet from '../CollectionsSheet.jsx';

const mockCreate = vi.fn();
const mockLoad = vi.fn();
const mockBumpEventCount = vi.fn();
const mockShowToast = vi.fn();

let collectionsFixture;

vi.mock('../../AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

vi.mock('../../CollectionsContext.jsx', () => ({
  useCollections: () => ({
    collections: collectionsFixture,
    colors: ['#FF0000', '#00FF00'],
    create: mockCreate,
    load: mockLoad,
    bumpEventCount: mockBumpEventCount,
  }),
}));

vi.mock('../../Toast/ToastContext.jsx', () => ({
  useToast: () => mockShowToast,
}));

const event = { id: 42 };

describe('CollectionsSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collectionsFixture = [
      { id: 1, name: 'Мои конференции', event_count: 5 },
      { id: 2, name: 'На выходные', event_count: 0 },
    ];
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/events/42/collections') && !String(url).includes('PUT')) {
        return Promise.resolve({ ok: true, json: async () => ({ collection_ids: [1] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ collection_ids: [] }) });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefills checkboxes from GET /events/{id}/collections', async () => {
    render(<CollectionsSheet event={event} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Мои конференции')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/events/42/collections',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
  });

  it('clicks inside the sheet do not bubble to an ancestor click handler (portal still bubbles via the React tree)', async () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <CollectionsSheet event={event} onClose={vi.fn()} />
      </div>
    );

    await waitFor(() => expect(screen.getByText('Мои конференции')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByText('Готово'));
    fireEvent.click(screen.getByTestId('collections-sheet-backdrop'));

    expect(parentClick).not.toHaveBeenCalled();
  });

  it('pressing Space while typing a new collection name does not bubble to an ancestor keydown handler (e.g. card role="button" Space-to-click)', async () => {
    const parentKeyDown = vi.fn();
    collectionsFixture = [];
    render(
      <div onKeyDown={parentKeyDown}>
        <CollectionsSheet event={event} onClose={vi.fn()} />
      </div>
    );

    await waitFor(() => expect(screen.getByText('+ Новая подборка')).toBeInTheDocument());
    fireEvent.click(screen.getByText('+ Новая подборка'));

    fireEvent.keyDown(screen.getByPlaceholderText('Название подборки'), { key: ' ', code: 'Space' });

    expect(parentKeyDown).not.toHaveBeenCalled();
  });

  it('inline creation adds the new collection pre-checked and collapses the input', async () => {
    mockCreate.mockResolvedValue({ id: 3, name: 'IT-митапы', event_count: 0 });
    collectionsFixture = [];
    render(<CollectionsSheet event={event} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('+ Новая подборка')).toBeInTheDocument());

    fireEvent.click(screen.getByText('+ Новая подборка'));
    fireEvent.change(screen.getByPlaceholderText('Название подборки'), { target: { value: 'IT-митапы' } });
    fireEvent.click(screen.getByText('Создать'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('IT-митапы', '#FF0000'));
    // input collapses back to the "+ Новая подборка" row
    await waitFor(() => expect(screen.getByText('+ Новая подборка')).toBeInTheDocument());
  });

  it('colors each collection name to match its color', async () => {
    collectionsFixture = [
      { id: 1, name: 'Мои конференции', color: '#FF0000', event_count: 5 },
      { id: 2, name: 'На выходные', color: null, event_count: 0 },
    ];
    render(<CollectionsSheet event={event} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Мои конференции')).toBeInTheDocument());

    expect(screen.getByText('Мои конференции')).toHaveStyle({ color: '#FF0000' });
    // null color falls back to the first palette color
    expect(screen.getByText('На выходные')).toHaveStyle({ color: '#FF0000' });
  });

  it('shows the color picker in the create row, defaulting to the first palette color', async () => {
    collectionsFixture = [];
    render(<CollectionsSheet event={event} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('+ Новая подборка')).toBeInTheDocument());
    fireEvent.click(screen.getByText('+ Новая подборка'));

    expect(screen.getByLabelText('#FF0000')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByLabelText('#00FF00'));
    expect(screen.getByLabelText('#00FF00')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(screen.getByPlaceholderText('Название подборки'), { target: { value: 'IT-митапы' } });
    fireEvent.click(screen.getByText('Создать'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('IT-митапы', '#00FF00'));
  });

  it('"Готово" sends one PUT with the full collection_ids list and closes on success', async () => {
    const onClose = vi.fn();
    global.fetch = vi.fn((url, opts) => {
      const u = String(url);
      if (u.includes('/events/42/collections') && !opts) {
        return Promise.resolve({ ok: true, json: async () => ({ collection_ids: [1] }) });
      }
      if (u.includes('/events/42/collections') && opts?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({ collection_ids: [1, 2] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ collection_ids: [1] }) });
    });

    render(<CollectionsSheet event={event} source="search" onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Мои конференции')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('checkbox')[1]); // check "На выходные" too
    fireEvent.click(screen.getByText('Готово'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ritmevents.ru/api/v1/events/42/collections',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ collection_ids: [1, 2], source: 'search' }),
        })
      );
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('bumps event_count locally for collections added/removed after a successful "Готово"', async () => {
    // starts checked into [1] (Мои конференции), user checks [2] (На выходные) too
    // and unchecks [1] — so 1 is removed, 2 is added.
    global.fetch = vi.fn((url, opts) => {
      const u = String(url);
      if (u.includes('/events/42/collections') && opts?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({ collection_ids: [2] }) });
      }
      if (u.includes('/events/42/collections')) {
        return Promise.resolve({ ok: true, json: async () => ({ collection_ids: [1] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<CollectionsSheet event={event} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Мои конференции')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('checkbox')[0]); // uncheck "Мои конференции" (1)
    fireEvent.click(screen.getAllByRole('checkbox')[1]); // check "На выходные" (2)
    fireEvent.click(screen.getByText('Готово'));

    await waitFor(() => {
      expect(mockBumpEventCount).toHaveBeenCalledWith(2, 1);
      expect(mockBumpEventCount).toHaveBeenCalledWith(1, -1);
    });
  });

  it('on 400 shows a toast, keeps the sheet open, does not revert checkboxes, and reloads collections', async () => {
    const onClose = vi.fn();
    global.fetch = vi.fn((url, opts) => {
      const u = String(url);
      if (u.includes('/events/42/collections') && opts?.method === 'PUT') {
        return Promise.resolve({ ok: false, status: 400 });
      }
      if (u.includes('/events/42/collections')) {
        return Promise.resolve({ ok: true, json: async () => ({ collection_ids: [1] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<CollectionsSheet event={event} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Мои конференции')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Готово'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Не удалось сохранить, попробуйте ещё раз'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
    expect(mockLoad).toHaveBeenCalled();
  });
});
