import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NotInterestedProvider, useNotInterested } from '../NotInterestedContext.jsx';

vi.mock('../AuthContext.jsx', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

const wrapper = ({ children }) => <NotInterestedProvider>{children}</NotInterestedProvider>;

describe('NotInterestedContext', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
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

  it('rolls back the optimistic unmark when the DELETE fails', async () => {
    const { result } = renderHook(() => useNotInterested(), { wrapper });

    await act(async () => {
      await result.current.markNotInterested({ id: 14 });
    });

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    await act(async () => {
      await result.current.unmarkNotInterested(14);
    });

    expect(result.current.isNotInterested(14)).toBe(true);
  });
});
