import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommunityContext } from '../context.js';
import ContentEditor from '../ContentEditor.jsx';

vi.mock('../../components/AuthContext.jsx', () => ({ useAuth: () => ({ platform: 'web', userData: { id: 17 } }) }));
afterEach(cleanup);
const record = { kind: 'recommendation', id: 4, event_id: 55, user_id: 17, generation: 3, revision_id: 12, state: 'draft', visible: false, payload: { text: 'Мой опыт' }, reason: null };
function mount(request) {
  render(<MemoryRouter><CommunityContext.Provider value={{ enabled: true, request, userId: 17 }}><ContentEditor kind="recommendation" eventId={55} /></CommunityContext.Provider></MemoryRouter>);
}
describe('сохранение и отправка', () => {
  it('несохранённая правка блокирует submit; сохранение не публикует автоматически', async () => {
    const writes = [];
    const request = vi.fn(async (path, options) => {
      if (options) { writes.push([path, options]); return { id: 4, generation: 4, current_revision_id: 13 }; }
      return { items: [record], total: 1 };
    });
    mount(request);
    const text = await screen.findByLabelText('Текст рекомендации');
    fireEvent.change(text, { target: { value: 'Новый текст' } });
    expect(screen.getByRole('button', { name: 'Отправить на проверку' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить черновик' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual(['/events/55/recommendation', { method: 'PUT', body: { text: 'Новый текст' } }]);
  });
  it('409 обновляет собственную версию и не повторяет устаревший submit', async () => {
    let reads = 0;
    const request = vi.fn(async (path, options) => {
      if (options) throw Object.assign(new Error('Конфликт версии'), { status: 409 });
      reads++;
      return { items: [{ ...record, generation: reads > 1 ? 4 : 3, state: reads > 1 ? 'pending' : 'draft' }], total: 1 };
    });
    mount(request);
    fireEvent.click(await screen.findByRole('button', { name: 'Отправить на проверку' }));
    await screen.findByText('На ручной проверке');
    expect(request.mock.calls.filter(([, options]) => options)).toHaveLength(1);
    expect(request.mock.calls.find(([, options]) => options)[1]).toEqual({ method: 'POST', body: { generation: 3 } });
  });
});

describe('несохранённая форма', () => {
  it('не стирает правку при возвращении фокуса', async () => {
    mount(async () => ({ items: [record], total: 1 }));
    const text = await screen.findByLabelText('Текст рекомендации');
    fireEvent.change(text, { target: { value: 'Ещё не сохранено' } });
    fireEvent.focus(window);
    await waitFor(() => expect(screen.getByLabelText('Текст рекомендации')).toHaveValue('Ещё не сохранено'));
  });
});

describe('доступность редактора профиля', () => {
  function mountProfile(request) {
    render(<MemoryRouter><CommunityContext.Provider value={{ enabled: true, request, userId: 17 }}><ContentEditor kind="profile" /></CommunityContext.Provider></MemoryRouter>);
  }
  it('показывает форму первого профиля при пустом списке собственных записей', async () => {
    mountProfile(async () => ({ items: [], total: 0 }));
    expect(await screen.findByLabelText('Имя')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Сохранить черновик' })).toBeEnabled();
  });
  it('объясняет недоступность API при 404, не выдавая её за отсутствие черновика', async () => {
    const request = vi.fn(async () => { throw Object.assign(new Error('Not found'), { status: 404 }); });
    mountProfile(request);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Профили участников пока недоступны. Попробуйте позже.');
    expect(alert).not.toHaveTextContent('Not found');
    expect(screen.queryByLabelText('Имя')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeEnabled();
  });
});
