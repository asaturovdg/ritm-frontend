// Sentinel: фича раскатана на всех пользователей.
export const ALL_USERS = Symbol('all');

export const FEATURED_ALLOWLIST = new Set([5, 88, 147, 150]);

export const CALENDAR_ALLOWLIST = ALL_USERS;

export const hasFeature = (allowlist, userId) =>
  allowlist === ALL_USERS || allowlist.has(Number(userId));
