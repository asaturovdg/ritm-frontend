import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shareEventForPlatform } from '../usePlatform.js';

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
