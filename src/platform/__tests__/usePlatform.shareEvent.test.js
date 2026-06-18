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
});
