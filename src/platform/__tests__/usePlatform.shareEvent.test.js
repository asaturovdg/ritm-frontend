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

  it('copies Max deep link to clipboard on Max platform', async () => {
    await shareEventForPlatform(42, 'HolyJS 2026', 'max');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://max.ru/ritmevents_bot?startapp=event_42'
    );
  });

  it('copies web URL to clipboard on web platform when navigator.share unavailable', async () => {
    delete navigator.share;

    await shareEventForPlatform(42, 'HolyJS 2026', 'web');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/events/42')
    );
  });
});
