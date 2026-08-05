import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Featured from '../Featured.jsx';

const mockCreate = vi.fn();
const mockRename = vi.fn();
const mockChangeColor = vi.fn();
const mockRemove = vi.fn();
let collectionsFixture = [];
let collectionsLoading = false;

vi.mock('../../../components/CollectionsContext.jsx', () => ({
  useCollections: () => ({
    collections: collectionsFixture,
    colors: ['#FF0000', '#00FF00'],
    loading: collectionsLoading,
    create: mockCreate,
    rename: mockRename,
    changeColor: mockChangeColor,
    remove: mockRemove,
  }),
}));

vi.mock('@telegram-apps/telegram-ui', () => ({
  Placeholder: ({ header, description, action }) => (
    <div data-testid="placeholder">
      <p>{header}</p>
      <p>{description}</p>
      {action}
    </div>
  ),
}));

const { mockSetShowInputCode } = vi.hoisted(() => ({
  mockSetShowInputCode: vi.fn(),
}));

vi.mock('../../../components/AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    isAuthReady: true,
    isCheckingAuth: false,
    showInputCode: false,
    setShowInputCode: mockSetShowInputCode,
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const sampleEvent = {
  id: 1,
  title: 'Highload++ 2025',
  event_type: ['Конференция'],
  start_date: '2025-04-14',
  start_time: '10:00:00',
  city: ['Москва'],
  price: 0,
  track: ['Backend'],
};

const sampleData = {
  for_you: { items: [sampleEvent] },
  top_month: { items: [] },
  top_half_year: { items: [] },
  sber: { items: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

const renderFeatured = () =>
  render(<MemoryRouter><Featured /></MemoryRouter>);

describe('Featured page', () => {
  it('shows loading spinner initially', () => {
    global.fetch.mockReturnValue(new Promise(() => {}));
    renderFeatured();
    expect(document.querySelector('.spinner')).toBeTruthy();
  });

  it('renders carousel with events when fetch succeeds', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleData,
    });
    renderFeatured();
    expect(await screen.findByText('Highload++ 2025')).toBeInTheDocument();
    expect(screen.getByText('Что-то для тебя')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows profile placeholder when for_you is null', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ for_you: null, top_month: { items: [] }, sber: { items: [] } }),
    });
    renderFeatured();
    expect(await screen.findByText('Персональные рекомендации')).toBeInTheDocument();
    expect(screen.getByText(/Заполни профиль/)).toBeInTheDocument();
  });

  it('shows error message on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('network'));
    renderFeatured();
    expect(await screen.findByText(/Не удалось загрузить рекомендации/)).toBeInTheDocument();
  });

  it('calls /featured with Bearer auth header', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ for_you: null, top_month: { items: [] }, sber: { items: [] } }),
    });
    renderFeatured();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ritmevents.ru/api/v1/featured',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      );
    });
  });
});

describe('Featured page — Мои подборки sub-tab', () => {
  beforeEach(() => {
    collectionsFixture = [];
    collectionsLoading = false;
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleData,
    });
  });

  it('shows an empty state with a create button when the user has no collections', async () => {
    renderFeatured();
    await screen.findByText('Что-то для тебя');

    fireEvent.click(screen.getByText('Мои подборки'));

    expect(await screen.findByText('У вас пока нет подборок')).toBeInTheDocument();
    expect(screen.getByText('Создать подборку')).toBeInTheDocument();
  });

  it('creating a collection from the empty state calls context.create()', async () => {
    mockCreate.mockResolvedValue({ id: 9, name: 'Мои события', event_count: 0 });
    renderFeatured();
    await screen.findByText('Что-то для тебя');
    fireEvent.click(screen.getByText('Мои подборки'));
    await screen.findByText('Создать подборку');

    fireEvent.click(screen.getByText('Создать подборку'));
    fireEvent.change(screen.getByPlaceholderText('Название подборки'), { target: { value: 'Мои события' } });
    fireEvent.click(screen.getByText('Создать'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('Мои события', '#FF0000'));
  });

  it('renders a section per collection with a non-empty one showing its carousel', async () => {
    collectionsFixture = [
      { id: 1, name: 'Мои конференции', event_count: 1 },
      { id: 2, name: 'На выходные', event_count: 0 },
    ];
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u === 'https://ritmevents.ru/api/v1/featured') {
        return Promise.resolve({ ok: true, status: 200, json: async () => sampleData });
      }
      if (u.includes('/collections/1')) {
        return Promise.resolve({ ok: true, json: async () => ({ id: 1, name: 'Мои конференции', events: [sampleEvent] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderFeatured();
    await screen.findByText('Что-то для тебя');
    fireEvent.click(screen.getByText('Мои подборки'));

    expect(await screen.findByText('Highload++ 2025')).toBeInTheDocument();
    expect(screen.getByText('Подборка пуста. Добавьте события через карточку события.')).toBeInTheDocument();
  });

  it('shows a color dot before the collection title in the section header', async () => {
    collectionsFixture = [{ id: 1, name: 'Мои митапы', color: '#00FF00', event_count: 0 }];
    renderFeatured();
    await screen.findByText('Что-то для тебя');
    fireEvent.click(screen.getByText('Мои подборки'));

    await waitFor(() => expect(screen.getByText('Мои митапы')).toBeInTheDocument());
    const dot = document.querySelector('.color-dot');
    expect(dot).toHaveStyle({ background: '#00FF00' });
  });

  it('opens a color picker modal from the kebab menu and calls changeColor on save', async () => {
    collectionsFixture = [{ id: 1, name: 'Мои митапы', color: '#FF0000', event_count: 0 }];
    renderFeatured();
    await screen.findByText('Что-то для тебя');
    fireEvent.click(screen.getByText('Мои подборки'));
    await screen.findByText('Мои митапы');

    fireEvent.click(screen.getByLabelText('Действия с подборкой'));
    fireEvent.click(screen.getByText('Изменить цвет'));

    expect(screen.getByText('Изменить цвет подборки')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('#00FF00'));
    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() => expect(mockChangeColor).toHaveBeenCalledWith(1, '#00FF00'));
  });

  it('color picker in the create modal defaults to the first palette color and is passed to create()', async () => {
    renderFeatured();
    await screen.findByText('Что-то для тебя');
    fireEvent.click(screen.getByText('Мои подборки'));
    await screen.findByText('Создать подборку');

    fireEvent.click(screen.getByText('Создать подборку'));

    expect(screen.getByLabelText('#FF0000')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByPlaceholderText('Название подборки'), { target: { value: 'Новая' } });
    fireEvent.click(screen.getByText('Создать'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('Новая', '#FF0000'));
  });

  it('kebab menu offers rename and delete, delete calls context.remove()', async () => {
    mockRemove.mockResolvedValue();
    collectionsFixture = [{ id: 1, name: 'На выходные', event_count: 0 }];
    renderFeatured();
    await screen.findByText('Что-то для тебя');
    fireEvent.click(screen.getByText('Мои подборки'));
    await screen.findByText('На выходные');

    fireEvent.click(screen.getByLabelText('Действия с подборкой'));
    fireEvent.click(screen.getByText('Удалить'));
    expect(screen.getByText(/Удалить подборку/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Это действие нельзя отменить.').closest('.modal-content').querySelector('.modal-confirm-btn'));

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(1));
  });
});
