const OPEN_COUNT_KEY = 'pulse_check_open_count';
export const PULSE_CHECK_THRESHOLD = 3;

export function registerDigestOpen() {
  const raw = localStorage.getItem(OPEN_COUNT_KEY);
  const count = raw === null ? 0 : parseInt(raw, 10);
  const nextCount = count + 1;

  if (nextCount >= PULSE_CHECK_THRESHOLD) {
    localStorage.setItem(OPEN_COUNT_KEY, '0');
    return true;
  }

  localStorage.setItem(OPEN_COUNT_KEY, String(nextCount));
  return false;
}
