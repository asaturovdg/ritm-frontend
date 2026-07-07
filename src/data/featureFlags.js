export const FEATURED_ALLOWLIST = new Set([5, 88, 147]);

export const CALENDAR_ALLOWLIST = new Set([5, 88, 147]);

export const hasFeature = (allowlist, userId) =>
  allowlist.has(Number(userId));
