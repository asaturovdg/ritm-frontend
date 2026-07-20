import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppTabs } from '../useAppTabs.js';

let mockUserId;
let mockUserData;

vi.mock('../../components/AuthContext.jsx', () => ({
  useAuth: () => ({ userId: mockUserId, userData: mockUserData }),
}));

describe('useAppTabs', () => {
  it('prepends /featured for a non-admin user', () => {
    mockUserId = '1';
    mockUserData = { is_admin: false };
    const { result } = renderHook(() => useAppTabs());
    expect(result.current.hasFeatured).toBe(true);
    expect(result.current.TAB_PATHS).toEqual(['/featured', '/', '/profile', '/feedback', '/submissions']);
    expect(result.current.TABS.map((t) => t.id)).toEqual(['featured', 'events', 'profile', 'feedback', 'submissions']);
  });

  it('prepends /featured for any user', () => {
    mockUserId = '5';
    mockUserData = { is_admin: false };
    const { result } = renderHook(() => useAppTabs());
    expect(result.current.hasFeatured).toBe(true);
    expect(result.current.TAB_PATHS).toEqual(['/featured', '/', '/profile', '/feedback', '/submissions']);
    expect(result.current.TABS[0].id).toBe('featured');
  });

  it('appends /moderation for an admin user', () => {
    mockUserId = '1';
    mockUserData = { is_admin: true };
    const { result } = renderHook(() => useAppTabs());
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.TAB_PATHS).toEqual(['/featured', '/', '/profile', '/feedback', '/submissions', '/moderation']);
    expect(result.current.TABS[result.current.TABS.length - 1].id).toBe('moderation');
  });

  it('combines /featured and /moderation when both apply', () => {
    mockUserId = '5';
    mockUserData = { is_admin: true };
    const { result } = renderHook(() => useAppTabs());
    expect(result.current.TAB_PATHS).toEqual(['/featured', '/', '/profile', '/feedback', '/submissions', '/moderation']);
  });

  it('does not append /moderation when userData is not loaded yet', () => {
    mockUserId = '1';
    mockUserData = null;
    const { result } = renderHook(() => useAppTabs());
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.TAB_PATHS).toEqual(['/featured', '/', '/profile', '/feedback', '/submissions']);
  });
});
