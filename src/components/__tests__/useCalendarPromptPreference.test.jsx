import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarPromptPreference } from '../useCalendarPromptPreference.jsx';

const mockRefreshUserData = vi.fn();
let mockUserData = {};

vi.mock('../AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    userId: '42',
    userData: mockUserData,
    refreshUserData: mockRefreshUserData,
  }),
}));

describe('useCalendarPromptPreference', () => {
  beforeEach(() => {
    mockUserData = {};
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults skipPrompt to false when userData has no field yet', () => {
    const { result } = renderHook(() => useCalendarPromptPreference());
    expect(result.current.skipPrompt).toBe(false);
  });

  it('initializes skipPrompt from userData.skip_external_calendar_prompt', () => {
    mockUserData = { skip_external_calendar_prompt: true };
    const { result } = renderHook(() => useCalendarPromptPreference());
    expect(result.current.skipPrompt).toBe(true);
  });

  it('setSkipPrompt updates state optimistically before the PATCH resolves', async () => {
    const { result } = renderHook(() => useCalendarPromptPreference());

    let patchPromise;
    act(() => {
      patchPromise = result.current.setSkipPrompt(true);
    });

    expect(result.current.skipPrompt).toBe(true);
    await act(async () => { await patchPromise; });
  });

  it('setSkipPrompt PATCHes /users/{userId}/calendar-preferences with the value', async () => {
    const { result } = renderHook(() => useCalendarPromptPreference());

    await act(async () => {
      await result.current.setSkipPrompt(true);
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/42/calendar-preferences'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ skip_external_calendar_prompt: true }),
      })
    );
  });

  it('calls refreshUserData after a successful PATCH', async () => {
    const { result } = renderHook(() => useCalendarPromptPreference());

    await act(async () => {
      await result.current.setSkipPrompt(true);
    });

    expect(mockRefreshUserData).toHaveBeenCalledOnce();
  });

  it('keeps the optimistic local state when the PATCH fails (endpoint not deployed yet)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const { result } = renderHook(() => useCalendarPromptPreference());

    await act(async () => {
      await result.current.setSkipPrompt(true);
    });

    expect(result.current.skipPrompt).toBe(true);
    expect(mockRefreshUserData).not.toHaveBeenCalled();
  });

  it('keeps the optimistic local state when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useCalendarPromptPreference());

    await act(async () => {
      await result.current.setSkipPrompt(true);
    });

    expect(result.current.skipPrompt).toBe(true);
  });
});
