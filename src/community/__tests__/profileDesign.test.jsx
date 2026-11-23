import { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommunityContext } from '../context.js';
import ContentEditor from '../ContentEditor.jsx';
import ContactField from '../ContactField.jsx';
import PublicationList from '../PublicationList.jsx';
vi.mock('../../components/AuthContext.jsx', () => ({ useAuth: () => ({ userData: { id: 17, telegram_id: 17 } }) }));
afterEach(cleanup);
function ContactHarness() { const [value, setValue] = useState('https://t.me/old_name'); return <ContactField value={value} onChange={setValue} label={null} onLabelChange={() => {}} />; }
function mount(children, request) { render(<MemoryRouter><CommunityContext.Provider value={{ enabled: true, request, userId: 17, isAdmin: false }}>{children}</CommunityContext.Provider></MemoryRouter>); }
describe('согласованный профиль', () => {
  it('вставляет ссылки без схемы в поле и сохраняет ввод при смене способа связи', () => {
    render(<ContactHarness />);
    const input = screen.getByLabelText('Имя пользователя');
    fireEvent.paste(input, { clipboardData: { getData: () => 'https://t.me/new_name' } });
    expect(input).toHaveValue('new_name');
    fireEvent.click(screen.getByRole('button', { name: 'MAX' }));
    fireEvent.paste(screen.getByLabelText('Ваш контакт в MAX'), { clipboardData: { getData: () => 'https://max.ru/u/contact' } });
    expect(screen.getByLabelText('Ваш контакт в MAX')).toHaveValue('max.ru/u/contact');
    fireEvent.click(screen.getByRole('button', { name: 'Telegram' }));
    expect(screen.getByLabelText('Имя пользователя')).toHaveValue('new_name');
  });
  it('сохраняет современный ввод как разрешённый HTTPS payload', async () => {
    const writes = [];
    const request = async (path, options) => { if (options) { writes.push(options); return { id: 4, generation: 1 }; } return { items: [], total: 0 }; };
    mount(<ContentEditor kind="profile" />, request);
    fireEvent.change(await screen.findByLabelText('Имя'), { target: { value: 'Мария' } });
    fireEvent.change(screen.getByLabelText('Имя пользователя'), { target: { value: 'maria_example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить черновик' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].body).toMatchObject({ name: 'Мария', contact_url: 'https://t.me/maria_example' });
    expect(Object.keys(writes[0].body)).not.toContain('contact_type');
  });
  it('некорректный контакт блокирует сохранение и не стирает имя', async () => {
    mount(<ContentEditor kind="profile" />, async () => ({ items: [], total: 0 }));
    fireEvent.change(await screen.findByLabelText('Имя'), { target: { value: 'Несохранённое имя' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сайт' }));
    fireEvent.change(screen.getByLabelText('Адрес сайта'), { target: { value: 'javascript:alert(1)' } });
    expect(screen.getByRole('button', { name: 'Сохранить черновик' })).toBeDisabled();
    expect(screen.getByLabelText('Имя')).toHaveValue('Несохранённое имя');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
  it('показывает название события вместо его технического ID', async () => {
    const request = async path => path.includes('/events/by-ids') ? [{ id: 55, title: 'Frontend & AI Meetup', start_date: '2026-11-26', city: ['Санкт-Петербург'] }] : { items: [{ id: 8, event_id: 55, user_id: 17, text: 'Рекомендую', published_at: '2026-11-18T10:00:00Z' }], total: 1 };
    mount(<PublicationList path="/member-profiles/17/recommendations" kind="recommendation" source="profile" profileUserId={17} />, request);
    expect(await screen.findByRole('link', { name: 'Frontend & AI Meetup' })).toHaveAttribute('href', '/events/55');
    expect(screen.queryByRole('navigation', { name: 'Страницы списка' })).not.toBeInTheDocument();
  });
  it('не скрывает публикацию при недоступных метаданных события', async () => {
    const request = async path => { if (path.includes('/events/by-ids')) throw new Error('metadata unavailable'); return { items: [{ id: 8, event_id: 55, user_id: 17, text: 'Важный опыт', published_at: '2026-11-18T10:00:00Z' }], total: 1 }; };
    mount(<PublicationList path="/member-profiles/17/recommendations" kind="recommendation" source="profile" profileUserId={17} />, request);
    expect(await screen.findByText('Важный опыт')).toBeInTheDocument();
  });
});

it('MAX-ник без ссылки не включает сохранение', async () => {
  const writes = [];
  const request = async (path, options) => { if (options) writes.push(options); return { items: [], total: 0 }; };
  mount(<ContentEditor kind="profile" />, request);
  fireEvent.change(await screen.findByLabelText('Имя'), { target: { value: 'Мария' } });
  fireEvent.click(screen.getByRole('button', { name: 'MAX' }));
  fireEvent.change(screen.getByLabelText('Ваш контакт в MAX'), { target: { value: 'maria_example' } });
  expect(screen.getByRole('alert')).toHaveTextContent('Вставьте ссылку на профиль из MAX.');
  expect(screen.getByRole('button', { name: 'Сохранить черновик' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить черновик' }));
  expect(writes).toHaveLength(0);
});

it('изменение контакта сбрасывает ранее данное согласие', async () => {
  const owner = { kind: 'profile', id: 4, user_id: 17, event_id: null, generation: 1, revision_id: 3, state: 'draft', visible: false, reason: null, payload: { name: 'Мария', contact_url: 'https://t.me/old_name' } };
  mount(<ContentEditor kind="profile" />, async () => ({ items: [owner], total: 1 }));
  await screen.findByLabelText('Имя');
  const consent = screen.getByRole('checkbox', { name: /Я согласен опубликовать/ });
  fireEvent.click(consent);
  expect(consent).toBeChecked();
  fireEvent.change(screen.getByLabelText('Имя пользователя'), { target: { value: 'new_name' } });
  expect(consent).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'Отправить на проверку' })).toBeDisabled();
});
