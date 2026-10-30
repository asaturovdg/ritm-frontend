import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shareAppForPlatform, shareEventForPlatform } from '../usePlatform.js';

describe('shareEventForPlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.Telegram;
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  it('copies Telegram deep link to clipboard and shows toast', async () => {
    const showToast = vi.fn();
    await shareEventForPlatform(42, 'HolyJS 2026', ['Конференция'], 'telegram', showToast);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('https://t.me/ritmevents_bot?startapp=event_42')
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('рИТм')
    );
    expect(showToast).toHaveBeenCalledWith('Ссылка скопирована');
  });

  it('copies formatted Max message to clipboard and shows toast', async () => {
    const showToast = vi.fn();
    await shareEventForPlatform(42, 'HolyJS 2026', ['Конференция'], 'max', showToast);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('https://max.ru/ritmevents_bot?startapp=event_42')
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('рИТм')
    );
    expect(showToast).toHaveBeenCalledWith('Ссылка скопирована');
  });

  it('copies formatted text to clipboard on web when navigator.share unavailable', async () => {
    delete navigator.share;
    const showToast = vi.fn();
    await shareEventForPlatform(42, 'HolyJS 2026', ['Конференция'], 'web', showToast);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/events/42')
    );
  });

  it('adds the referral code to Telegram, Max and web event links', async () => {
    await shareEventForPlatform(42, 'T', [], 'telegram', vi.fn(), undefined, 'abc123');
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      expect.stringContaining('https://t.me/ritmevents_bot?startapp=event_42_ref_abc123')
    );
    await shareEventForPlatform(42, 'T', [], 'max', vi.fn(), undefined, 'abc123');
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      expect.stringContaining('https://max.ru/ritmevents_bot?startapp=event_42_ref_abc123')
    );
    delete navigator.share;
    await shareEventForPlatform(42, 'T', [], 'web', vi.fn(), undefined, 'abc123');
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      expect.stringContaining('/events/42?ref=abc123')
    );
  });

  describe('native Telegram share sheet', () => {
    beforeEach(() => {
      window.fetch = vi.fn();
    });

    it('uses shareMessage when the backend prepares a message id', async () => {
      window.fetch.mockResolvedValue({ ok: true, json: async () => ({ message_id: 'abc123' }) });
      const shareMessage = vi.fn((id, cb) => cb(true));
      window.Telegram = {
        WebApp: { shareMessage, isVersionAtLeast: () => true },
      };
      const showToast = vi.fn();

      await shareEventForPlatform(42, 'HolyJS 2026', ['Конференция'], 'telegram', showToast, 'tok');

      expect(window.fetch).toHaveBeenCalledWith(
        'https://ritmevents.ru/api/v1/events/42/share-message',
        expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer tok' } })
      );
      expect(shareMessage).toHaveBeenCalledWith('abc123', expect.any(Function));
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    it('falls back to clipboard when the backend call fails', async () => {
      window.fetch.mockResolvedValue({ ok: false });
      window.Telegram = {
        WebApp: { shareMessage: vi.fn(), isVersionAtLeast: () => true },
      };
      const showToast = vi.fn();

      await shareEventForPlatform(42, 'HolyJS 2026', ['Конференция'], 'telegram', showToast, 'tok');

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('https://t.me/ritmevents_bot?startapp=event_42')
      );
    });

    it('falls back to clipboard when the client does not support shareMessage', async () => {
      window.Telegram = { WebApp: { isVersionAtLeast: () => false } };
      const showToast = vi.fn();

      await shareEventForPlatform(42, 'HolyJS 2026', ['Конференция'], 'telegram', showToast, 'tok');

      expect(window.fetch).not.toHaveBeenCalled();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('https://t.me/ritmevents_bot?startapp=event_42')
      );
    });

    it('falls back to clipboard when there is no auth token', async () => {
      window.Telegram = {
        WebApp: { shareMessage: vi.fn(), isVersionAtLeast: () => true },
      };
      const showToast = vi.fn();

      await shareEventForPlatform(42, 'HolyJS 2026', ['Конференция'], 'telegram', showToast, null);

      expect(window.fetch).not.toHaveBeenCalled();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('https://t.me/ritmevents_bot?startapp=event_42')
      );
    });
  });
});

describe('shareAppForPlatform', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
    delete navigator.share;
  });

  it('copies Telegram and Max app links with the referral code', async () => {
    const showToast = vi.fn();
    await shareAppForPlatform('telegram', showToast, 'abc123');
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      expect.stringContaining('https://t.me/ritmevents_bot?startapp=ref_abc123')
    );
    await shareAppForPlatform('max', showToast, 'abc123');
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      expect.stringContaining('https://max.ru/ritmevents_bot?startapp=ref_abc123')
    );
    expect(showToast).toHaveBeenCalledWith('Ссылка скопирована');
  });

  it('uses navigator.share on web when available', async () => {
    navigator.share = vi.fn().mockResolvedValue(undefined);
    await shareAppForPlatform('web', vi.fn(), 'abc123');
    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${window.location.origin}/?ref=abc123` })
    );
  });

  it('does nothing without a valid code', async () => {
    await shareAppForPlatform('telegram', vi.fn(), undefined);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
