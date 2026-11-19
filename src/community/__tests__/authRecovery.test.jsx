import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../components/AuthContext.jsx';
vi.mock('../../platform/waitForSdk.js', () => ({ waitForPlatformSdk: async () => {} }));
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); delete window.WebApp; });
function Harness() {
  const auth = useAuth();
  return <><p>{auth.isAuthReady ? `Готово ${auth.token}` : auth.showInputCode ? 'Ввод кода' : 'Восстановление'}</p><button onClick={() => auth.reauthenticate()}>Восстановить вход</button></>;
}
describe('восстановление входа после 401 сообщества', () => {
  it('использует сохранённый refresh и сохраняет новый access token', async () => {
    localStorage.setItem('access_token', 'old'); localStorage.setItem('refresh_token', 'refresh');
    const refreshBodies = [];
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (url.endsWith('/auth/refresh')) { refreshBodies.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ access_token: 'new', refresh_token: 'new-refresh' }) }; }
      return { ok: true, json: async () => ({ id: 17, is_active: true }) };
    }));
    render(<AuthProvider><Harness /></AuthProvider>);
    await screen.findByText('Готово old');
    fireEvent.click(screen.getByRole('button', { name: 'Восстановить вход' }));
    await screen.findByText('Готово new');
    expect(refreshBodies).toEqual([{ refresh_token: 'refresh' }]);
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh');
  });
  it('после неудачного refresh в Max повторяет платформенный вход без web fallback', async () => {
    localStorage.setItem('access_token', 'old'); localStorage.setItem('refresh_token', 'refresh');
    window.WebApp = { initData: 'max-data', ready: vi.fn() };
    vi.stubGlobal('fetch', vi.fn(async url => url.endsWith('/auth/refresh') ? { ok: false } : url.endsWith('/auth/max') ? { ok: true, json: async () => ({ access_token: 'max-new', refresh_token: 'max-refresh' }) } : { ok: true, json: async () => ({ id: 17 }) }));
    render(<AuthProvider><Harness /></AuthProvider>);
    await screen.findByText('Готово old');
    fireEvent.click(screen.getByRole('button', { name: 'Восстановить вход' }));
    await screen.findByText('Готово max-new');
    expect(screen.queryByText('Ввод кода')).not.toBeInTheDocument();
  });
});
