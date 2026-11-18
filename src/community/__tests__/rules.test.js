import { describe, it, expect } from 'vitest';
import { eventWindow, safeMemberReturn, profilePayload, canAccessCommunity } from '../rules.js';

describe('доступ и правила сообщества', () => {
  it('выборочный доступ не даёт доступ гостю или другому ID', () => {
    const allow = new Set([17]);
    expect(canAccessCommunity(allow, { token: 't', userId: '17', isAuthReady: true })).toBe(true);
    expect(canAccessCommunity(allow, { token: 't', userId: 18, isAuthReady: true })).toBe(false);
    expect(canAccessCommunity(allow, { token: null, userId: 17, isAuthReady: true })).toBe(false);
    expect(canAccessCommunity(allow, { token: 't', userId: 17, isAuthReady: true, showInputCode: true })).toBe(false);
  });
  it('принимает только внутренний адрес публичного профиля', () => {
    expect(safeMemberReturn('/members/17?source=companions')).toBe('/members/17?source=companions');
    for (const path of ['//evil.test', 'https://evil.test', '/members/me/edit', '/members/17/../18', '/members/0', '/members/17?redirect=https://evil.test']) expect(safeMemberReturn(path)).toBe(null);
  });
  it('использует московскую полночь и завершение следующего дня', () => {
    const event = { start_date: '2026-11-18', end_date: '2026-11-19' };
    expect(eventWindow(event, Date.parse('2026-11-17T20:59:59Z'))).toMatchObject({ upcoming: true, ended: false });
    expect(eventWindow(event, Date.parse('2026-11-17T21:00:00Z')).upcoming).toBe(false);
    expect(eventWindow(event, Date.parse('2026-11-19T21:00:00Z')).ended).toBe(true);
    expect(eventWindow({}, Date.now())).toMatchObject({ upcoming: false, ended: false });
  });
  it('полный снимок профиля исключает выходные поля и очищает пустой контакт', () => {
    expect(profilePayload({ name: ' Ира ', photo_url: 'https://a.test', user_id: 5, contact_url: '' })).toEqual({ name: 'Ира', about: null, company: null, position: null, interests: null, contact_url: null, contact_label: null, photo_provider: null });
  });
});

it('известное завершение без начала позволяет рассказ, но не компанию', () => {
  expect(eventWindow({ end_date: '2026-11-18', end_time: '15:00:00' }, Date.parse('2026-11-18T12:00:00Z'))).toMatchObject({ upcoming: false, ended: true });
});
