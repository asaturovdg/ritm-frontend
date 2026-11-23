import { describe, it, expect } from 'vitest';
import { normalizeContact, describeContact } from '../contact.js';

describe('контакт без технического адреса в форме', () => {
  it('сохраняет ник как HTTPS-ссылку Telegram', () => {
    expect(normalizeContact('telegram', '@maria_example')).toMatchObject({ type: 'telegram', value: 'maria_example', url: 'https://t.me/maria_example', error: null });
  });
  it('распознаёт вставленную ссылку и сохраняет параметры', () => {
    expect(normalizeContact('web', 'https://max.ru/u/example?ref=ritm#contact')).toMatchObject({ type: 'max', value: 'max.ru/u/example?ref=ritm#contact', url: 'https://max.ru/u/example?ref=ritm#contact' });
    expect(normalizeContact('telegram', 'https://example.ru/team?q=one#contact')).toMatchObject({ type: 'web', url: 'https://example.ru/team?q=one#contact' });
  });
  it('поддерживает сайт без схемы и необязательный пустой контакт', () => {
    expect(normalizeContact('web', 'example.ru/contact')).toMatchObject({ url: 'https://example.ru/contact', error: null });
    expect(normalizeContact('telegram', '')).toMatchObject({ url: null, error: null });
  });
  it.each(['javascript:alert(1)', 'https://user:pass@example.ru', '//evil.test', 'https://', 'example.ru/a b'])('не принимает опасный или некорректный адрес %s', value => {
    expect(normalizeContact('web', value).error).toBeTruthy();
    expect(normalizeContact('web', value).url).toBe(null);
  });
  it('не превращает неизвестный MAX-ник в выдуманный URL', () => {
    expect(normalizeContact('max', 'maria_example').error).toBeTruthy();
  });
  it('восстанавливает контакт без потери query и без схемы в отображении', () => {
    expect(describeContact('https://t.me/maria_example')).toMatchObject({ type: 'telegram', value: 'maria_example', display: '@maria_example' });
    expect(describeContact('https://example.ru/contact?from=profile#me')).toMatchObject({ type: 'web', value: 'example.ru/contact?from=profile#me', display: 'example.ru/contact?from=profile#me' });
  });
});
