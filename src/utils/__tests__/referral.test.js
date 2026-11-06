import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildAppStartParam,
  buildEventStartParam,
  claimStoredReferral,
  parseEventStartParam,
  parseRefStartParam,
  readReferralCode,
  storeReferralCode,
} from '../referral.js';

describe('start params', () => {
  it('builds event param with and without a code', () => {
    expect(buildEventStartParam(42, 'k7Hq2xPa')).toBe('event_42_ref_k7Hq2xPa');
    expect(buildEventStartParam(42, undefined)).toBe('event_42');
    expect(buildEventStartParam(42, 'bad_code!')).toBe('event_42');
  });

  it('builds app param', () => {
    expect(buildAppStartParam('k7Hq2xPa')).toBe('ref_k7Hq2xPa');
  });

  it('parses new and legacy event params', () => {
    expect(parseEventStartParam('event_42_ref_k7Hq2xPa')).toEqual({ eventId: '42', code: 'k7Hq2xPa' });
    expect(parseEventStartParam('event_42')).toEqual({ eventId: '42', code: null });
    expect(parseEventStartParam('event_abc')).toBeNull();
    expect(parseEventStartParam('cal_google_42')).toBeNull();
  });

  it('parses ref param', () => {
    expect(parseRefStartParam('ref_k7Hq2xPa')).toBe('k7Hq2xPa');
    expect(parseRefStartParam('ref_')).toBeNull();
    expect(parseRefStartParam('event_42')).toBeNull();
  });
});

describe('stored referral code', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('keeps the first code and ignores invalid ones', () => {
    storeReferralCode('bad code');
    expect(readReferralCode()).toBeNull();
    storeReferralCode('first');
    storeReferralCode('second');
    expect(readReferralCode()).toBe('first');
  });

  it('claims once and clears the code on success', async () => {
    storeReferralCode('abc123');
    window.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await claimStoredReferral('tok');

    expect(window.fetch).toHaveBeenCalledWith(
      'https://ritmevents.ru/api/v1/referrals/claim',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: 'abc123' }) })
    );
    expect(readReferralCode()).toBeNull();
  });

  it('clears the code on 404', async () => {
    storeReferralCode('abc123');
    window.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await claimStoredReferral('tok');
    expect(readReferralCode()).toBeNull();
  });

  it('keeps the code on 401, 5xx and network errors', async () => {
    storeReferralCode('abc123');
    window.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await claimStoredReferral('tok');
    window.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await claimStoredReferral('tok');
    window.fetch = vi.fn().mockRejectedValue(new Error('offline'));
    await claimStoredReferral('tok');
    expect(readReferralCode()).toBe('abc123');
  });

  it('does nothing without a stored code or token', async () => {
    window.fetch = vi.fn();
    await claimStoredReferral('tok');
    storeReferralCode('abc123');
    await claimStoredReferral(null);
    expect(window.fetch).not.toHaveBeenCalled();
  });
});
