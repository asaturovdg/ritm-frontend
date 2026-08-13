import { describe, it, expect } from 'vitest';
import { formatDate, formatTime } from '../submissionFormat.js';

describe('submissionFormat', () => {
  it('formats an ISO date as DD.MM.YYYY', () => {
    expect(formatDate('2026-08-07')).toBe('07.08.2026');
  });

  it('returns an empty string for a falsy date', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('truncates a HH:MM:SS time to HH:MM', () => {
    expect(formatTime('14:30:00')).toBe('14:30');
  });

  it('returns an empty string for a falsy time', () => {
    expect(formatTime('')).toBe('');
    expect(formatTime(undefined)).toBe('');
  });
});
