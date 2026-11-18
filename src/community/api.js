const BASE = 'https://ritmevents.ru/api/v1';

export function createCommunityClient(token, onUnauthorized) {
  let controller;
  return {
    activate() { controller = new AbortController(); },
    dispose() { controller?.abort(); },
    async request(path, { method = 'GET', body } = {}) {
      const session = controller;
      if (!session || session.signal.aborted) throw new DOMException('Сессия закрыта', 'AbortError');
      const res = await fetch(`${BASE}${path}`, {
        method, signal: session.signal, cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const data = res.status === 204 ? null : await res.json().catch(() => null);
      if (session.signal.aborted) throw new DOMException('Сессия закрыта', 'AbortError');
      if (!res.ok) {
        if (res.status === 401) { session.abort(); onUnauthorized(); }
        const fallback = { 401: 'Войдите снова', 403: 'Действие недоступно', 404: 'Объект недоступен', 409: 'Состояние изменилось. Данные обновлены; проверьте их перед повтором.', 422: 'Проверьте поля формы' };
        const detail = data?.detail;
        const message = Array.isArray(detail) ? detail.map(e => `${e.loc?.slice(1).join('.') || 'Поле'}: ${e.msg}`).join('; ') : typeof detail === 'string' ? detail : fallback[res.status] || 'Не удалось выполнить запрос';
        throw Object.assign(new Error(message), { status: res.status });
      }
      return data;
    },
  };
}

export async function findOwnContent(request, kind, eventId) {
  let offset = 0;
  while (true) {
    const page = await request(`/member-content/me?kind=${kind}&limit=20&offset=${offset}`);
    const found = page.items.find(item => item.kind === kind && Number(item.event_id) === Number(eventId));
    if (found) return found;
    offset += page.items.length;
    if (offset >= page.total) return null;
    if (!page.items.length) throw new Error('Не удалось восстановить собственную запись. Обновите страницу.');
  }
}
