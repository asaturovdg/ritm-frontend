import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCommunityClient, findOwnContent } from '../api.js';

afterEach(() => vi.unstubAllGlobals());
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
describe('API сообщества', () => {
  it('находит форму события на следующих страницах по kind и event_id', async () => {
    const request = vi.fn(async (path) => path.includes('offset=0') ? { items: [{ id: 77, kind: 'recommendation', event_id: 5 }], total: 2 } : { items: [{ id: 99, kind: 'recommendation', event_id: 77, generation: 3 }], total: 2 });
    expect(await findOwnContent(request, 'recommendation', 77)).toMatchObject({ id: 99, generation: 3 });
    expect(request.mock.calls[1][0]).toContain('offset=1');
  });
  it('не повторяет конфликт и читает ошибки FastAPI', async () => {
    const fetcher = vi.fn(async () => response({ detail: [{ loc: ['body', 'text'], msg: 'слишком длинный текст' }] }, 422));
    vi.stubGlobal('fetch', fetcher);
    const client = createCommunityClient('t', () => {});
    client.activate();
    await expect(client.request('/member-content/me')).rejects.toMatchObject({ status: 422, message: 'text: слишком длинный текст' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('отбрасывает ответ прежней сессии и запрещает новые запросы после выхода', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn(() => new Promise(r => { resolve = r; })));
    const client = createCommunityClient('t', () => {});
    client.activate();
    const pending = client.request('/member-profiles/17');
    client.dispose();
    resolve(response({ contact_url: 'https://t.me/private' }));
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(client.request('/member-profiles/17')).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('при 401 очищает сессию и вызывает существующий вход', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ detail: 'Expired' }, 401)));
    const login = vi.fn();
    const client = createCommunityClient('t', login);
    client.activate();
    await expect(client.request('/member-content/me')).rejects.toMatchObject({ status: 401 });
    expect(login).toHaveBeenCalledOnce();
  });
});
