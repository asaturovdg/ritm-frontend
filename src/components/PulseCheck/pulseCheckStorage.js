const OPEN_COUNT_KEY = 'pulse_check_open_count';
const LAST_SHOWN_KEY = 'pulse_check_last_shown';
export const PULSE_CHECK_THRESHOLD = 3;
export const PULSE_CHECK_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

export function registerDigestOpen(now = Date.now()) {
  const raw = localStorage.getItem(OPEN_COUNT_KEY);
  const count = raw === null ? 0 : parseInt(raw, 10);
  const nextCount = count + 1;

  if (nextCount >= PULSE_CHECK_THRESHOLD) {
    const lastShownRaw = localStorage.getItem(LAST_SHOWN_KEY);
    const lastShown = lastShownRaw === null ? null : parseInt(lastShownRaw, 10);

    if (lastShown !== null && now - lastShown < PULSE_CHECK_COOLDOWN_MS) {
      // Still in cooldown: keep accumulating the count instead of resetting,
      // so we're eligible again as soon as the cooldown expires.
      localStorage.setItem(OPEN_COUNT_KEY, String(nextCount));
      return false;
    }

    localStorage.setItem(OPEN_COUNT_KEY, '0');
    localStorage.setItem(LAST_SHOWN_KEY, String(now));
    return true;
  }

  localStorage.setItem(OPEN_COUNT_KEY, String(nextCount));
  return false;
}
