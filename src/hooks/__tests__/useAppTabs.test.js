import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppTabs } from '../useAppTabs.js';

let mockUserId;

vi.mock('../../components/AuthContext.jsx', () => ({
  useAuth: () => ({ userId: mockUserId }),
}));

describe('useAppTabs', () => {
  it('returns the base tabs, without /featured, for a non-allowlisted user', () => {
    mockUserId = '1';
    const { result } = renderHook(() => useAppTabs());
    expect(result.current.hasFeatured).toBe(false);
    expect(result.current.TAB_PATHS).toEqual(['/', '/profile', '/feedback', '/submissions']);
    expect(result.current.TABS.map((t) => t.id)).toEqual(['events', 'profile', 'feedback', 'submissions']);
  });

  it('prepends /featured for an allowlisted user', () => {
    mockUserId = '5';
    const { result } = renderHook(() => useAppTabs());
    expect(result.current.hasFeatured).toBe(true);
    expect(result.current.TAB_PATHS).toEqual(['/featured', '/', '/profile', '/feedback', '/submissions']);
    expect(result.current.TABS[0].id).toBe('featured');
  });
});
