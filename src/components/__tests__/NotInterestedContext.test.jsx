import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NotInterestedProvider, useNotInterested } from '../NotInterestedContext.jsx';

vi.mock('../AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token', userId: '88', isAuthReady: true }),
}));

const wrapper = ({ children }) => <NotInterestedProvider>{children}</NotInterestedProvider>;

describe('NotInterestedContext', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/not-interested-events')) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('markNotInterested optimistically marks the event and POSTs with source/block', async () => {
    const { result } = renderHook(() => useNotInterested(), { wrapper });

    await act(async () => {
      await result.current.markNotInterested({ id: 10 }, { source: 'featured', block: 'for_you' });
    });

    expect(result.current.isNotInterested(10)).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/events/10/not-interested',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: JSON.stringify({ source: 'featured', block: 'for_you' }),
      })
    );
  });

  it('markNotInterested defaults source to "list" and omits block/reason when not given', async () => {
    const { result } = renderHook(() => useNotInterested(), { wrapper });

    await act(async () => {
      await result.current.markNotInterested({ id: 11 });
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/events/11/not-interested',
      expect.objectContaining({ body: JSON.stringify({ source: 'list' }) })
    );
  });

  it('rolls back the optimistic mark when the POST fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 409 });
    const { result } = renderHook(() => useNotInterested(), { wrapper });

    await act(async () => {
      await result.current.markNotInterested({ id: 12 });
    });

    expect(result.current.isNotInterested(12)).toBe(false);
  });

  it('unmarkNotInterested optimistically unmarks and DELETEs', async () => {
    const { result } = renderHook(() => useNotInterested(), { wrapper });

    await act(async () => {
      await result.current.markNotInterested({ id: 13 });
    });
    expect(result.current.isNotInterested(13)).toBe(true);

    await act(async () => {
      await result.current.unmarkNotInterested(13);
    });

    expect(result.current.isNotInterested(13)).toBe(false);
    expect(fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/events/13/not-interested',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('rolls back the optimistic unmark when the DELETE fails by refetching from the server', async () => {
    const { result } = renderHook(() => useNotInterested(), { wrapper });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ([]) });
    await act(async () => {
      await result.current.markNotInterested({ id: 14 });
    });
    expect(result.current.isNotInterested(14)).toBe(true);

    global.fetch = vi.fn((url, options) => {
      const u = String(url);
      if (options?.method === 'DELETE') {
        return Promise.resolve({ ok: false, status: 404 });
      }
      if (u.includes('/not-interested-events')) {
        return Promise.resolve({ ok: true, json: async () => ([{ id: 14, title: 'Refetched Event' }]) });
      }
      return Promise.resolve({ ok: true, json: async () => ([]) });
    });

    await act(async () => {
      await result.current.unmarkNotInterested(14);
    });

    await vi.waitFor(() => expect(result.current.isNotInterested(14)).toBe(true));
    expect(result.current.hiddenEvents).toContainEqual({ id: 14, title: 'Refetched Event' });
  });
});

describe('NotInterestedContext — hiddenEvents load()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads hiddenEvents from GET /users/:id/not-interested-events on mount', async () => {
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/not-interested-events')) {
        return Promise.resolve({ ok: true, json: async () => ([
          { event_id: 20, id: 20, title: 'Hidden Event', start_date: '2026-09-01' },
        ]) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useNotInterested(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.hiddenEvents).toHaveLength(1);
    });
    expect(result.current.hiddenEvents[0].title).toBe('Hidden Event');
    expect(result.current.isNotInterested(20)).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/users/88/not-interested-events',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
  });

  it('hydrates via /events/by-ids when records lack full event data', async () => {
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/not-interested-events')) {
        return Promise.resolve({ ok: true, json: async () => ([{ event_id: 21 }]) });
      }
      if (u.includes('/events/by-ids')) {
        return Promise.resolve({ ok: true, json: async () => ([{ id: 21, title: 'Hydrated Event' }]) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useNotInterested(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.hiddenEvents).toHaveLength(1);
    });
    expect(result.current.hiddenEvents[0].title).toBe('Hydrated Event');
  });

  it('markNotInterested appends the full event object to hiddenEvents', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ([]) });
    const { result } = renderHook(() => useNotInterested(), { wrapper });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.markNotInterested({ id: 30, title: 'New Hide' });
    });

    expect(result.current.hiddenEvents).toContainEqual({ id: 30, title: 'New Hide' });
  });

  it('unmarkNotInterested removes the event from hiddenEvents, restores it on failure via refetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ([]) });
    const { result } = renderHook(() => useNotInterested(), { wrapper });
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.markNotInterested({ id: 31, title: 'To Remove' });
    });
    expect(result.current.hiddenEvents).toHaveLength(1);

    global.fetch = vi.fn((url, options) => {
      const u = String(url);
      if (options?.method === 'DELETE') {
        return Promise.resolve({ ok: false, status: 404 });
      }
      if (u.includes('/not-interested-events')) {
        return Promise.resolve({ ok: true, json: async () => ([{ id: 31, title: 'To Remove' }]) });
      }
      return Promise.resolve({ ok: true, json: async () => ([]) });
    });
    await act(async () => {
      await result.current.unmarkNotInterested(31);
    });

    await vi.waitFor(() => expect(result.current.hiddenEvents).toContainEqual({ id: 31, title: 'To Remove' }));
    expect(result.current.isNotInterested(31)).toBe(true);
  });
});
