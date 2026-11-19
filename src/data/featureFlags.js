// Sentinel: фича раскатана на всех пользователей.
export const ALL_USERS = Symbol('all');

export const FEATURED_ALLOWLIST = ALL_USERS;

export const CALENDAR_ALLOWLIST = ALL_USERS;

export const NOT_INTERESTED_ALLOWLIST = ALL_USERS;

// Раскат сообщества: new Set([123, 456]) — ID пользователей API, ALL_USERS — всем.
// Остальные пользователи получают доступ только через этот список.
export const SOCIAL_PROFILES_ALLOWLIST = new Set();

// Как в админской панели: актуальные администраторы определяются API, без списка ID.
// Для полного отключения сообщества: false и пустой SOCIAL_PROFILES_ALLOWLIST.
export const SOCIAL_PROFILES_ADMINS_ENABLED = true;

export const hasFeature = (allowlist, userId) =>
  allowlist === ALL_USERS || allowlist.has(Number(userId));
