import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommunityContext } from '../context.js';
import CommunityModeration from '../CommunityModeration.jsx';
afterEach(cleanup);
function mount(request, userId = 9, isAdmin = true) { render(<MemoryRouter><CommunityContext.Provider value={{ enabled: true, request, userId, isAdmin }}><CommunityModeration /></CommunityContext.Provider></MemoryRouter>); }
const item = { kind: 'profile', id: 12, user_id: 17, event_id: null, revision_id: 53, generation: 2, payload: { name: 'Ира' }, lexical_result: { state: 'ok' }, submitted_at: '2026-11-18T12:00:00Z' };
describe('ручная модерация', () => {
  it('не загружает очередь без прав администратора', () => { const request = vi.fn(); mount(request, 9, false); expect(request).not.toHaveBeenCalled(); expect(screen.getByText('Нужны права администратора.')).toBeInTheDocument(); });
  it('первая публикация с 404 профиля остаётся доступна для проверки', async () => {
    const request = vi.fn(async path => { if (path.startsWith('/member-profiles/')) throw Object.assign(new Error('Not found'), { status: 404 }); return { items: [item], total: 1 }; });
    mount(request, 17);
    expect(await screen.findByText('Ира')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Сравнить с опубликованным снимком' }));
    await screen.findByText('Опубликованного снимка нет.');
    expect(screen.getByRole('button', { name: 'Одобрить' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Вернуть на правку' })).toBeDisabled();
  });
  it('отправляет revision_id и generation; 409 перечитывает очередь без повтора решения', async () => {
    let reads = 0;
    const writes = [];
    const request = vi.fn(async (path, options) => {
      if (options) { writes.push([path, options]); throw Object.assign(new Error('Версия устарела'), { status: 409 }); }
      if (path.startsWith('/member-profiles/')) throw Object.assign(new Error('Not found'), { status: 404 });
      reads++; return { items: reads === 1 ? [item] : [], total: reads === 1 ? 1 : 0 };
    });
    mount(request);
    fireEvent.click(await screen.findByRole('button', { name: 'Одобрить' }));
    await screen.findByText('Очередь пуста.');
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual(['/member-content/revisions/53/decision', { method: 'POST', body: { generation: 2, decision: 'approve', reason: null } }]);
  });
});


it.each([
  ['approve', 'Одобрить', null],
  ['request_changes', 'Вернуть на правку', 'Уточнить описание'],
])('администратор отправляет решение %s для своей записи', async (decision, label, reason) => {
  const writes = [];
  const request = vi.fn(async (path, options) => {
    if (options) { writes.push([path, options]); return { id: 53, generation: 2, state: decision === 'approve' ? 'approved' : 'changes_requested', reason }; }
    return { items: writes.length ? [] : [item], total: writes.length ? 0 : 1 };
  });
  mount(request, item.user_id);
  await screen.findByText('Ира');
  expect(screen.queryByText('Собственную запись проверять нельзя.')).not.toBeInTheDocument();
  if (reason) {
    expect(screen.getByRole('button', { name: label })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Причина возврата'), { target: { value: reason } });
  }
  expect(screen.getByRole('button', { name: label })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: label }));
  await screen.findByText('Очередь пуста.');
  expect(writes).toEqual([['/member-content/revisions/53/decision', { method: 'POST', body: { generation: 2, decision, reason } }]]);
});
