import { describe, it, expect, beforeEach } from 'vitest';
import { registerDigestOpen } from '../pulseCheckStorage.js';

describe('registerDigestOpen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false for the first two opens', () => {
    expect(registerDigestOpen()).toBe(false);
    expect(registerDigestOpen()).toBe(false);
  });

  it('returns true on the third open and resets the counter', () => {
    registerDigestOpen();
    registerDigestOpen();
    expect(registerDigestOpen()).toBe(true);
    expect(localStorage.getItem('pulse_check_open_count')).toBe('0');
  });

  it('starts counting again after showing', () => {
    registerDigestOpen();
    registerDigestOpen();
    registerDigestOpen(); // shows, resets
    expect(registerDigestOpen()).toBe(false);
    expect(registerDigestOpen()).toBe(false);
    expect(registerDigestOpen()).toBe(true);
  });
});
