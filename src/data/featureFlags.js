// Sentinel: фича раскатана на всех пользователей.
export const ALL_USERS = Symbol('all');

export const FEATURED_ALLOWLIST = ALL_USERS;

export const CALENDAR_ALLOWLIST = ALL_USERS;

export const NOT_INTERESTED_ALLOWLIST = ALL_USERS;

// Раскат сообщества: new Set([123, 456]) — ID пользователей API, ALL_USERS — всем.
// Пустой список выключает интерфейс и запросы; админские права проверяются отдельно.
export const SOCIAL_PROFILES_ALLOWLIST = new Set();

export const hasFeature = (allowlist, userId) =>
  allowlist === ALL_USERS || allowlist.has(Number(userId));
