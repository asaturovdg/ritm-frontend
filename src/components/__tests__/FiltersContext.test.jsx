import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FiltersProvider, useFilters } from '../FiltersContext.jsx';

vi.mock('../AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    userId: '42',
    userData: {
      city: 'Москва',
      track: 'IT',
      preferred_event_types: 'Конференция',
      preferred_participation_types: 'Онлайн',
    },
    refreshUserData: vi.fn(),
  }),
}));

const wrapper = ({ children }) => <FiltersProvider>{children}</FiltersProvider>;

const filtersB = { cities: ['Санкт-Петербург'], categories: ['IT'], eventTypes: ['Митап'], participationTypes: ['Офлайн'] };

describe('FiltersContext — flushPendingSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('flushPendingSave fires PATCH immediately and cancels the debounce timer', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.setFilters(filtersB);
    });

    // Timer is pending — PATCH has NOT fired yet
    expect(fetch).not.toHaveBeenCalled();

    await act(async () => {
      result.current.flushPendingSave();
    });

    // PATCH fired immediately after flush
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/42/filters'),
      expect.objectContaining({ method: 'PATCH' })
    );

    // Advancing timers should NOT trigger a second PATCH (timer was cancelled)
    await act(async () => {
      vi.runAllTimers();
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('flushPendingSave does nothing when no timer is pending', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    await act(async () => {
      result.current.flushPendingSave();
    });

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('FiltersContext — beforeunload listener', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('fires PATCH on beforeunload when a debounce is pending', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.setFilters(filtersB);
    });

    expect(fetch).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/42/filters'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('does NOT fire PATCH on beforeunload when no debounce is pending', async () => {
    renderHook(() => useFilters(), { wrapper });

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(fetch).not.toHaveBeenCalled();
  });
});
