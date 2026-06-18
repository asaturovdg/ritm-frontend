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

  it('opens Telegram share dialog with event deep link and title', () => {
    const openTelegramLink = vi.fn();
    window.Telegram = { WebApp: { openTelegramLink } };

    shareEventForPlatform(42, 'HolyJS 2026', 'telegram');

    expect(openTelegramLink).toHaveBeenCalledOnce();
    const calledUrl = openTelegramLink.mock.calls[0][0];
    expect(calledUrl).toContain('t.me/share/url');
    expect(calledUrl).toContain('ritmevents_bot');
    expect(calledUrl).toContain('event_42');
    expect(calledUrl).toContain('HolyJS');
  });

  it('copies Max deep link to clipboard and shows toast on Max platform', async () => {
    const showToast = vi.fn();
    await shareEventForPlatform(42, 'HolyJS 2026', 'max', showToast);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://max.ru/ritmevents_bot?startapp=event_42'
    );
    expect(showToast).toHaveBeenCalledWith('Ссылка скопирована');
  });

  it('copies web URL to clipboard on web platform when navigator.share unavailable', async () => {
    delete navigator.share;
    const showToast = vi.fn();
    await shareEventForPlatform(42, 'HolyJS 2026', 'web', showToast);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/events/42')
    );
  });
});
