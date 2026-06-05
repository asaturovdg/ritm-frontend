import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventsDigest from '../EventsDigest.jsx';

vi.mock('@telegram-apps/telegram-ui', () => ({
  Button: ({ children, onClick, mode, size, className }) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
  Placeholder: ({ header, description }) => (
    <div><p>{header}</p><p>{description}</p></div>
  ),
}));

const mockSetFilters = vi.fn();
const mockSaveFilters = vi.fn().mockResolvedValue(undefined);
const mockFlushPendingSave = vi.fn();

const fullFilters = {
  cities: ['Москва'],
  categories: ['IT'],
  eventTypes: ['Конференция'],
  participationTypes: ['Онлайн'],
};

vi.mock('../../useUserFilters.jsx', () => ({
  useUserFilters: () => ({
    filters: fullFilters,
    setFilters: mockSetFilters,
    saveFilters: mockSaveFilters,
    flushPendingSave: mockFlushPendingSave,
    isSaving: false,
  }),
}));

vi.mock('../../AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'test-token',
    userId: '42',
    isAuthReady: true,
    isCheckingAuth: false,
    showInputCode: false,
    setShowInputCode: vi.fn(),
  }),
}));

vi.mock('../../../platform/usePlatform.js', () => ({
  usePlatform: () => ({ openLink: vi.fn(), expandApp: vi.fn() }),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ items: [], total: 0 }),
});

const renderDigest = () =>
  render(
    <MemoryRouter>
      <EventsDigest />
    </MemoryRouter>
  );

describe('EventsDigest — filter behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('loads with full filters from useUserFilters', () => {
    renderDigest();

    // Verify that mockSaveFilters was not called on mount (filters come from context)
    expect(mockSaveFilters).not.toHaveBeenCalled();
  });

  it('does not call setFilters when filters come from useUserFilters', () => {
    renderDigest();

    expect(mockSetFilters).not.toHaveBeenCalled();
  });
});
