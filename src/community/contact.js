const TELEGRAM_HOSTS = new Set(['t.me', 'telegram.me']);

export function describeContact(url) {
  if (!url) return { type: 'telegram', value: '', display: '', action: 'Написать в Telegram' };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('invalid');
    const host = parsed.hostname.replace(/^www\./, '');
    const type = TELEGRAM_HOSTS.has(host) ? 'telegram' : host === 'max.ru' ? 'max' : 'web';
    const tail = parsed.pathname.slice(1) + parsed.search + parsed.hash;
    const value = type === 'telegram' ? tail : parsed.host + parsed.pathname + parsed.search + parsed.hash;
    return {
      type, value,
      display: type === 'telegram' && /^[a-z0-9_]+$/i.test(tail) ? `@${tail}` : type === 'telegram' ? `${host}/${tail}` : value,
      action: type === 'telegram' ? 'Написать в Telegram' : type === 'max' ? 'Написать в MAX' : 'Открыть сайт',
    };
  } catch {
    return { type: 'web', value: String(url), display: '', action: 'Открыть контакт' };
  }
}

export function normalizeContact(type, raw) {
  const value = raw.trim();
  if (!value) return { type, value: '', url: null, error: null };
  const invalid = message => ({ type, value, url: null, error: message });
  if (/[\s<>]/.test(value) || value.startsWith('//') || (/^[a-z][\w+.-]*:/i.test(value) && !/^https?:\/\//i.test(value))) return invalid('Проверьте ник или адрес.');
  let candidate = value;
  const isAddress = /^https?:\/\//i.test(value) || /^[^/]+\.[^/]+/.test(value);
  if (type === 'telegram' && !isAddress) candidate = `https://t.me/${value.replace(/^@/, '')}`;
  else if (type === 'max' && !isAddress) return invalid('Вставьте ссылку на профиль из MAX.');
  else if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname || parsed.username || parsed.password || !['http:', 'https:'].includes(parsed.protocol)) return invalid('Используйте адрес без логина и пароля.');
    parsed.protocol = 'https:';
    const url = parsed.href;
    if (url.length > 2048) return invalid('Ссылка слишком длинная.');
    const contact = describeContact(url);
    return { ...contact, url, error: null };
  } catch {
    return invalid('Не удалось распознать адрес.');
  }
}
