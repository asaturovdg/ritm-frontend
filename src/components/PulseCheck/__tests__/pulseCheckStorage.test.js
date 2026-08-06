import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { registerDigestOpen, PULSE_CHECK_COOLDOWN_MS } from '../pulseCheckStorage.js';

describe('registerDigestOpen', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('starts counting again after showing, once the cooldown has passed', () => {
    registerDigestOpen();
    registerDigestOpen();
    registerDigestOpen(); // shows, resets

    vi.setSystemTime(new Date(Date.now() + PULSE_CHECK_COOLDOWN_MS + 1));

    expect(registerDigestOpen()).toBe(false);
    expect(registerDigestOpen()).toBe(false);
    expect(registerDigestOpen()).toBe(true);
  });

  it('does not re-show within 24h of the last time it was shown, even after another 3 opens', () => {
    registerDigestOpen();
    registerDigestOpen();
    expect(registerDigestOpen()).toBe(true); // shows, records last-shown timestamp

    // Advance a bit, but stay well within the 24h cooldown window.
    vi.setSystemTime(new Date(Date.now() + 60 * 60 * 1000));

    expect(registerDigestOpen()).toBe(false);
    expect(registerDigestOpen()).toBe(false);
    expect(registerDigestOpen()).toBe(false); // would be the 3rd open, but suppressed by cooldown
  });

  it('shows again once 24h have passed since it was last shown', () => {
    registerDigestOpen();
    registerDigestOpen();
    expect(registerDigestOpen()).toBe(true); // shows, records last-shown timestamp

    vi.setSystemTime(new Date(Date.now() + PULSE_CHECK_COOLDOWN_MS + 1));

    registerDigestOpen();
    registerDigestOpen();
    expect(registerDigestOpen()).toBe(true);
  });
});
