import { describe, it, expect } from 'vitest';
import {
  FIELD_LABELS,
  FIELD_TYPES,
  FIELD_OPTIONS,
  validateFieldValue,
  serializePeople,
  parsePeople,
  normalizeFieldValue,
} from './moderationFields.js';

describe('FIELD_TYPES / FIELD_LABELS', () => {
  it('has an entry for every suggestable field from the API contract', () => {
    const keys = [
      'title', 'description', 'event_type', 'participation_type', 'city',
      'track', 'tags', 'start_date', 'end_date', 'start_time', 'end_time',
      'expected_attendees', 'price', 'address', 'organizers', 'key_speakers',
      'category',
    ];
    keys.forEach((key) => {
      expect(FIELD_TYPES[key]).toBeDefined();
      expect(FIELD_LABELS[key]).toBeDefined();
    });
  });

  it('maps enum fields to select with options from filters.js constants', () => {
    expect(FIELD_TYPES.city).toBe('select');
    expect(FIELD_OPTIONS.city).toContain('Москва');
    expect(FIELD_TYPES.category).toBe('select');
    expect(FIELD_OPTIONS.category).toContain('Backend');
    expect(FIELD_TYPES.event_type).toBe('select');
    expect(FIELD_OPTIONS.event_type).toContain('Конференция');
    expect(FIELD_TYPES.participation_type).toBe('select');
    expect(FIELD_OPTIONS.participation_type).toContain('Слушатель');
  });

  it('keeps track/tags as free text (not in filters.js constants)', () => {
    expect(FIELD_TYPES.track).toBe('text');
    expect(FIELD_TYPES.tags).toBe('text');
  });
});

describe('validateFieldValue', () => {
  it('accepts a non-empty text value', () => {
    expect(validateFieldValue('title', 'Митап по бэкенду')).toEqual({ valid: true, error: null });
  });

  it('rejects an empty text value', () => {
    expect(validateFieldValue('title', '   ')).toEqual({ valid: false, error: 'Значение не может быть пустым' });
  });

  it('rejects text longer than the field limit', () => {
    const tooLong = 'a'.repeat(301);
    expect(validateFieldValue('title', tooLong)).toEqual({ valid: false, error: 'Слишком длинное значение' });
  });

  it('accepts a valid ISO date', () => {
    expect(validateFieldValue('start_date', '2026-06-16')).toEqual({ valid: true, error: null });
  });

  it('rejects a malformed date', () => {
    expect(validateFieldValue('start_date', '16.06.2026')).toEqual({ valid: false, error: 'Формат даты — YYYY-MM-DD' });
  });

  it('accepts a valid HH:MM time', () => {
    expect(validateFieldValue('start_time', '14:30')).toEqual({ valid: true, error: null });
  });

  it('rejects a malformed time', () => {
    expect(validateFieldValue('start_time', '14:30:00')).toEqual({ valid: false, error: 'Формат времени — HH:MM' });
  });

  it('accepts a numeric string for number fields', () => {
    expect(validateFieldValue('price', '1500')).toEqual({ valid: true, error: null });
  });

  it('rejects a non-numeric string for number fields', () => {
    expect(validateFieldValue('expected_attendees', 'много')).toEqual({ valid: false, error: 'Значение должно быть числом' });
  });

  it('accepts an http(s) url', () => {
    expect(validateFieldValue('event_url', 'https://example.com/event')).toEqual({ valid: true, error: null });
  });

  it('rejects a non-http(s) url scheme', () => {
    expect(validateFieldValue('registration_url', 'javascript:alert(1)')).toEqual({ valid: false, error: 'Ссылка должна начинаться с http:// или https://' });
  });

  it('accepts a select value present in FIELD_OPTIONS', () => {
    expect(validateFieldValue('city', 'Москва')).toEqual({ valid: true, error: null });
  });

  it('rejects a select value not in FIELD_OPTIONS', () => {
    expect(validateFieldValue('city', 'Атлантида')).toEqual({ valid: false, error: 'Недопустимое значение' });
  });

  it('accepts a people string with at least one named entry', () => {
    expect(validateFieldValue('organizers', 'Иван Петров (https://example.com)')).toEqual({ valid: true, error: null });
  });

  it('rejects a people string with no name', () => {
    expect(validateFieldValue('key_speakers', '(https://example.com)')).toEqual({ valid: false, error: 'Укажите хотя бы одно имя' });
  });
});

describe('serializePeople / parsePeople', () => {
  it('round-trips a list of people with urls', () => {
    const people = [
      { name: 'Иван Петров', url: 'https://example.com/ivan' },
      { name: 'Мария Сидорова', url: null },
    ];
    const text = serializePeople(people);
    expect(text).toBe('Иван Петров (https://example.com/ivan), Мария Сидорова');
    expect(parsePeople(text)).toEqual(people);
  });

  it('parses a single name without url', () => {
    expect(parsePeople('Алексей Кузнецов')).toEqual([{ name: 'Алексей Кузнецов', url: null }]);
  });

  it('ignores empty entries from trailing commas', () => {
    expect(parsePeople('Иван Петров,, ')).toEqual([{ name: 'Иван Петров', url: null }]);
  });
});

describe('normalizeFieldValue', () => {
  it('converts a number field to a Number', () => {
    expect(normalizeFieldValue('price', '1500')).toBe(1500);
  });

  it('converts a people field to an array of {name,url}', () => {
    expect(normalizeFieldValue('organizers', 'Иван Петров (https://example.com)')).toEqual([
      { name: 'Иван Петров', url: 'https://example.com' },
    ]);
  });

  it('leaves text/select/date/time/url fields as trimmed strings', () => {
    expect(normalizeFieldValue('title', '  Митап  ')).toBe('Митап');
    expect(normalizeFieldValue('start_date', '2026-06-16')).toBe('2026-06-16');
  });
});
