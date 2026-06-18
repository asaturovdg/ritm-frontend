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

  it('opens Telegram share dialog with formatted message and deep link', () => {
    const openTelegramLink = vi.fn();
    window.Telegram = { WebApp: { openTelegramLink } };

    shareEventForPlatform(42, 'HolyJS 2026', ['Конференция'], 'telegram');

    expect(openTelegramLink).toHaveBeenCalledOnce();
    const calledUrl = decodeURIComponent(openTelegramLink.mock.calls[0][0]);
    expect(calledUrl).toContain('t.me/share/url');
    expect(calledUrl).toContain('ritmevents_bot');
    expect(calledUrl).toContain('event_42');
    expect(calledUrl).toContain('рИТм');
    // URL is in text= at the end (no separate url= so link preview doesn't appear at top)
    expect(calledUrl).toContain('t.me/ritmevents_bot?startapp=event_42');
    expect(calledUrl).not.toContain('url=https://');
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
});
