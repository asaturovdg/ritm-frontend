import { hasFeature, SOCIAL_PROFILES_ADMINS_ENABLED } from '../data/featureFlags.js';

export function canAccessCommunity(allowlist, auth, adminsEnabled = SOCIAL_PROFILES_ADMINS_ENABLED) {
  return Boolean(auth.token && auth.isAuthReady && !auth.showInputCode && auth.userId && auth.userData?.is_active !== false && (hasFeature(allowlist, auth.userId) || (adminsEnabled && auth.userData?.is_admin === true)));
}

export function safeMemberReturn(path) {
  return typeof path === 'string' && /^\/members\/[1-9]\d*(?:\?source=(?:event|profile|direct|companions))?$/.test(path) ? path : null;
}

export function profilePayload(form) {
  return Object.fromEntries(['name', 'about', 'company', 'position', 'interests', 'contact_url', 'contact_label', 'photo_provider'].map(key => [key, typeof form[key] === 'string' ? form[key].trim() || null : null]));
}

export function eventWindow(event, now = Date.now()) {
  const start = event.start_date ? Date.parse(`${event.start_date}T${event.start_time || '00:00:00'}+03:00`) : NaN;
  const date = event.end_date || event.start_date;
  const end = date ? Date.parse(`${date}T${event.end_time || '00:00:00'}+03:00`) + (event.end_time ? 0 : 86400000) : NaN;
  return { start, end, upcoming: Number.isFinite(start) && now < start, ended: Number.isFinite(end) && now >= end };
}

export const STATE_LABELS = { draft: 'Черновик', checking: 'Автопроверка', pending: 'На ручной проверке', approved: 'Одобрено', changes_requested: 'Нужны правки', superseded: 'Версия заменена' };
export const KIND_LABELS = { profile: 'Профиль', recommendation: 'Рекомендация', experience: 'Рассказ' };
export function interactionSource(search) {
  const source = new URLSearchParams(search).get('source');
  return ['event', 'profile', 'direct', 'companions'].includes(source) ? source : 'direct';
}
export function httpsContact(url) {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && !parsed.username && !parsed.password; } catch { return false; }
}
