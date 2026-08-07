import { describe, it, expect } from 'vitest';
import { getStatusText, getStatusClass, STATUS_FILTERS } from '../submissionStatus.js';

describe('submissionStatus', () => {
  it('maps known statuses to Russian labels', () => {
    expect(getStatusText('pending')).toBe('На модерации');
    expect(getStatusText('approved')).toBe('Одобрено');
    expect(getStatusText('rejected')).toBe('Отклонено');
  });

  it('falls back to the raw status string for unknown values', () => {
    expect(getStatusText('weird')).toBe('weird');
  });

  it('maps known statuses to CSS classes', () => {
    expect(getStatusClass('pending')).toBe('status-pending');
    expect(getStatusClass('approved')).toBe('status-approved');
    expect(getStatusClass('rejected')).toBe('status-rejected');
  });

  it('returns an empty class for unknown statuses', () => {
    expect(getStatusClass('weird')).toBe('');
  });

  it('exposes filter tabs in a fixed order starting with "all"', () => {
    expect(STATUS_FILTERS.map(f => f.key)).toEqual(['all', 'pending', 'approved', 'rejected']);
    expect(STATUS_FILTERS[0].label).toBe('Все');
  });
});
