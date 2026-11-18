import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CommunityProvider from '../CommunityProvider.jsx';
import MemberProfile from '../MemberProfile.jsx';

const state = vi.hoisted(() => ({ auth: {}, allowlist: new Set([17]) }));
vi.mock('../../components/AuthContext.jsx', () => ({ useAuth: () => state.auth }));
vi.mock('../../data/featureFlags.js', () => ({ SOCIAL_PROFILES_ALLOWLIST: state.allowlist, hasFeature: (allow, id) => allow.has(Number(id)) }));
vi.mock('../../platform/usePlatform.js', () => ({ usePlatform: () => ({ openLink: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const auth = (extra = {}) => ({ token: 'token', userId: 17, isAuthReady: true, showInputCode: false, userData: { id: 17, is_admin: false, is_active: true }, setToken: vi.fn(), setUserId: vi.fn(), setIsAuthReady: vi.fn(), setShowInputCode: vi.fn(), ...extra });
const tree = () => <MemoryRouter initialEntries={['/members/99']}><CommunityProvider><Routes><Route path="/members/:userId" element={<MemberProfile />} /></Routes></CommunityProvider></MemoryRouter>;
describe('доступ по ID и очистка сессии', () => {
  it('разрешённый пользователь видит публичный контакт; после выхода он исчезает', async () => {
    state.auth = auth();
    vi.stubGlobal('fetch', vi.fn(async url => ({ ok: true, status: 200, json: async () => url.endsWith('/member-profiles/99') ? { user_id: 99, name: 'Автор', contact_url: 'https://t.me/author', contact_label: 'Написать автору' } : { items: [], total: 0 } })));
    const view = render(tree());
    expect(await screen.findByRole('link', { name: 'Написать автору' })).toHaveAttribute('href', 'https://t.me/author');
    state.auth = auth({ token: null, isAuthReady: false, showInputCode: true });
    view.rerender(tree());
    expect(screen.queryByRole('link', { name: 'Написать автору' })).not.toBeInTheDocument();
  });
  it('прямой URL не обходит allowlist и не загружает профиль', async () => {
    state.auth = auth({ userId: 18 });
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    render(tree());
    await waitFor(() => expect(screen.getByText('Профили участников пока недоступны для вашего аккаунта.')).toBeInTheDocument());
    expect(fetcher).not.toHaveBeenCalled();
  });
});

it('запускается до загрузки user_id и токена, без запросов к сообществу', () => {
  state.auth = auth({ token: null, userId: null, userData: null, isAuthReady: false });
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect(() => render(tree())).not.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
