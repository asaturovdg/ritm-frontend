const DEDUPE_WINDOW_MS = 10000;
const recentViews = new Map();

// Клик по карточке и открытие страницы события оба фиксируют просмотр;
// дубль в пределах окна не отправляем.
export function recordEventView(eventId, token, { source = 'list', block } = {}) {
  const now = Date.now();
  const last = recentViews.get(String(eventId));
  if (last && now - last < DEDUPE_WINDOW_MS) return;
  recentViews.set(String(eventId), now);

  fetch(`https://ritmevents.ru/api/v1/events/${eventId}/view`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source, ...(block ? { block } : {}) }),
  });
}
