import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommunityContext } from '../context.js';
import EventCommunity from '../EventCommunity.jsx';
vi.mock('../../components/AuthContext.jsx', () => ({ useAuth: () => ({ userData: { id: 17 } }) }));
afterEach(cleanup);
const event = { id: 8, start_date: '2099-11-18', start_time: '15:00:00' };
function mount(request, enabled = true) { render(<MemoryRouter><CommunityContext.Provider value={{ enabled, request, userId: 17 }}><EventCommunity event={event} /></CommunityContext.Provider></MemoryRouter>); }
describe('поиск компании', () => {
  it('берёт собственное состояние отдельным GET, даже без себя в companions; ошибка не переключает его', async () => {
    const request = vi.fn(async (path, options) => {
      if (options) throw new Error('Сеть недоступна');
      if (path.endsWith('/companion-request')) return { enabled: true };
      if (path === '/member-profiles/17') return { user_id: 17, name: 'Ира', contact_url: 'https://t.me/ira' };
      return { items: [], total: 0 };
    });
    mount(request);
    const toggle = await screen.findByRole('checkbox', { name: 'Ищу компанию' });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    await screen.findByText('Сеть недоступна');
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Ищу компанию' })).toBeChecked());
    expect(request.mock.calls.filter(([, options]) => options)).toHaveLength(1);
  });
  it('закрытая для пользователя функция не показывает блок и не отправляет запросы', () => {
    const request = vi.fn(); mount(request, false);
    expect(screen.queryByText('Сообщество')).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });
});

it('при ошибке изменения и повторной загрузки сохраняет последнее подтверждённое состояние', async () => {
  let stateReads = 0;
  const request = vi.fn(async (path, options) => {
    if (options) throw new Error('Изменение не подтверждено');
    if (path.endsWith('/companion-request')) { stateReads++; if (stateReads > 1) throw new Error('Не удалось обновить поиск'); return { enabled: true }; }
    if (path === '/member-profiles/17') return { user_id: 17, name: 'Ира', contact_url: 'https://t.me/ira' };
    return { items: [], total: 0 };
  });
  mount(request);
  const toggle = await screen.findByRole('checkbox', { name: 'Ищу компанию' });
  await waitFor(() => expect(toggle).toBeChecked());
  fireEvent.click(toggle);
  await screen.findByText('Не удалось обновить поиск');
  expect(screen.getByRole('checkbox', { name: 'Ищу компанию' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Ищу компанию' })).toBeDisabled();
});
