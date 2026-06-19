import { describe, it, expect } from 'vitest';
import { buildCalendarReturnUrl, buildCalendarErrorReturnUrl } from '../usePlatform.js';

describe('buildCalendarReturnUrl', () => {
  it('возвращает telegram deep link для google', () => {
    expect(buildCalendarReturnUrl('google', 123, 'telegram'))
      .toBe('https://t.me/ritmevents_bot?startapp=cal_google_123');
  });

  it('возвращает max deep link для yandex', () => {
    expect(buildCalendarReturnUrl('yandex', 456, 'max'))
      .toBe('https://max.ru/ritmevents_bot?startapp=cal_yandex_456');
  });

  it('возвращает web URL', () => {
    expect(buildCalendarReturnUrl('google', 123, 'web'))
      .toBe('https://app.ritmevents.ru?calendar_connected=true&provider=google');
  });
});

describe('buildCalendarErrorReturnUrl', () => {
  it('возвращает telegram error deep link', () => {
    expect(buildCalendarErrorReturnUrl('google', 123, 'telegram'))
      .toBe('https://t.me/ritmevents_bot?startapp=calerr_google_123');
  });

  it('возвращает max error deep link', () => {
    expect(buildCalendarErrorReturnUrl('yandex', 456, 'max'))
      .toBe('https://max.ru/ritmevents_bot?startapp=calerr_yandex_456');
  });

  it('возвращает web error URL', () => {
    expect(buildCalendarErrorReturnUrl('google', 123, 'web'))
      .toBe('https://app.ritmevents.ru?calendar_error=true');
  });
});
