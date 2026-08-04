import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CollectionsProvider, useCollections } from '../CollectionsContext.jsx';

vi.mock('../AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', userId: '88', isAuthReady: true }),
}));

const wrapper = ({ children }) => <CollectionsProvider>{children}</CollectionsProvider>;

describe('CollectionsContext', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/users/88/collections')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: 'Мои конференции', event_count: 5 }],
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads collections for the current user on mount', async () => {
    const { result } = renderHook(() => useCollections(), { wrapper });

    await act(async () => {});

    expect(global.fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/users/88/collections',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
    expect(result.current.collections).toEqual([{ id: 1, name: 'Мои конференции', event_count: 5 }]);
  });

  it('create() posts the name and appends the new collection locally with event_count 0', async () => {
    global.fetch.mockImplementation((url, opts) => {
      const u = String(url);
      if (u.includes('/users/88/collections')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (u.endsWith('/collections') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 2, name: 'На выходные', created_at: '2026-08-04T00:00:00' }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await act(async () => {});

    let created;
    await act(async () => {
      created = await result.current.create('На выходные');
    });

    expect(created).toEqual({ id: 2, name: 'На выходные', event_count: 0 });
    expect(result.current.collections).toContainEqual({ id: 2, name: 'На выходные', event_count: 0 });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/collections',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'На выходные' }),
      })
    );
  });

  it('rename() updates the local collection name', async () => {
    global.fetch.mockImplementation((url, opts) => {
      const u = String(url);
      if (u.includes('/users/88/collections')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, name: 'Старое имя', event_count: 2 }] });
      }
      if (u.endsWith('/collections/1') && opts?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({ id: 1, name: 'Новое имя' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.rename(1, 'Новое имя');
    });

    expect(result.current.collections[0]).toEqual({ id: 1, name: 'Новое имя', event_count: 2 });
  });

  it('remove() deletes and removes the collection locally', async () => {
    global.fetch.mockImplementation((url, opts) => {
      const u = String(url);
      if (u.includes('/users/88/collections')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, name: 'Удалить меня', event_count: 0 }] });
      }
      if (u.endsWith('/collections/1') && opts?.method === 'DELETE') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await act(async () => {});
    expect(result.current.collections).toHaveLength(1);

    await act(async () => {
      await result.current.remove(1);
    });

    expect(result.current.collections).toHaveLength(0);
  });

  it('bumpEventCount() adjusts the local count and never goes below 0', async () => {
    global.fetch.mockImplementation((url) => {
      if (String(url).includes('/users/88/collections')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, name: 'Мои конференции', event_count: 2 }] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await act(async () => {});

    act(() => { result.current.bumpEventCount(1, 1); });
    expect(result.current.collections[0].event_count).toBe(3);

    act(() => { result.current.bumpEventCount(1, -5); });
    expect(result.current.collections[0].event_count).toBe(0);
  });
});
