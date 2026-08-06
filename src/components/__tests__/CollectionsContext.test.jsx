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

  it('loads the color palette automatically on mount', async () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/users/88/collections')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (u.endsWith('/collections/colors')) {
        return Promise.resolve({ ok: true, json: async () => ['#F44336', '#E91E63'] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await act(async () => {});

    expect(result.current.colors).toEqual(['#F44336', '#E91E63']);
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

  it('loadColors() re-fetches and replaces the stored palette', async () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/users/88/collections')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (u.endsWith('/collections/colors')) {
        return Promise.resolve({ ok: true, json: async () => ['#FF0000', '#00FF00'] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await act(async () => {});

    expect(result.current.colors).toEqual(['#FF0000', '#00FF00']);

    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.endsWith('/collections/colors')) {
        return Promise.resolve({ ok: true, json: async () => ['#123456'] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await act(async () => {
      await result.current.loadColors();
    });

    expect(result.current.colors).toEqual(['#123456']);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/collections/colors',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
  });

  it('loadColors() leaves colors empty on failure', async () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/users/88/collections')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (u.endsWith('/collections/colors')) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.loadColors();
    });

    expect(result.current.colors).toEqual([]);
  });

  it('create(name, color) posts the color and stores it locally', async () => {
    global.fetch.mockImplementation((url, opts) => {
      const u = String(url);
      if (u.includes('/users/88/collections')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (u.endsWith('/collections') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 4, name: 'Митапы', color: '#FF0000', created_at: '2026-08-05T00:00:00' }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await act(async () => {});

    let created;
    await act(async () => {
      created = await result.current.create('Митапы', '#FF0000');
    });

    expect(created).toEqual({ id: 4, name: 'Митапы', color: '#FF0000', event_count: 0 });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/collections',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Митапы', color: '#FF0000' }),
      })
    );
  });

  it('changeColor() patches the color and updates the local collection', async () => {
    global.fetch.mockImplementation((url, opts) => {
      const u = String(url);
      if (u.includes('/users/88/collections')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, name: 'Мои конференции', color: '#FF0000', event_count: 2 }] });
      }
      if (u.endsWith('/collections/1') && opts?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({ id: 1, name: 'Мои конференции', color: '#00FF00' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await result.current.changeColor(1, '#00FF00');
    });

    expect(result.current.collections[0]).toEqual({ id: 1, name: 'Мои конференции', color: '#00FF00', event_count: 2 });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/collections/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ color: '#00FF00' }),
      })
    );
  });

  it('changeColor() throws on failure and leaves the local collection unchanged', async () => {
    global.fetch.mockImplementation((url, opts) => {
      const u = String(url);
      if (u.includes('/users/88/collections')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, name: 'Мои конференции', color: '#FF0000', event_count: 2 }] });
      }
      if (u.endsWith('/collections/1') && opts?.method === 'PATCH') {
        return Promise.resolve({ ok: false, status: 422 });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useCollections(), { wrapper });
    await act(async () => {});

    await expect(act(async () => {
      await result.current.changeColor(1, '#00FF00');
    })).rejects.toThrow('collection color change failed');

    expect(result.current.collections[0].color).toBe('#FF0000');
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
