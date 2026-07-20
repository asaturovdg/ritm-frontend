import { CITIES, CATEGORIES, EVENT_TYPES, PARTICIPATION_TYPES } from '../../data/filters.js';

export const FIELD_LABELS = {
  title: 'Название',
  description: 'Описание',
  event_type: 'Тип события',
  participation_type: 'Тип участия',
  city: 'Город',
  track: 'Трек',
  tags: 'Теги',
  start_date: 'Дата начала',
  end_date: 'Дата окончания',
  start_time: 'Время начала',
  end_time: 'Время окончания',
  expected_attendees: 'Ожидаемое число участников',
  price: 'Цена',
  address: 'Адрес',
  organizers: 'Организаторы',
  key_speakers: 'Спикеры',
  category: 'Категория',
};

export const FIELD_TYPES = {
  title: 'text',
  description: 'text',
  event_type: 'select',
  participation_type: 'select',
  city: 'select',
  track: 'text',
  tags: 'text',
  start_date: 'date',
  end_date: 'date',
  start_time: 'time',
  end_time: 'time',
  expected_attendees: 'number',
  price: 'number',
  address: 'text',
  organizers: 'people',
  key_speakers: 'people',
  category: 'select',
};

export const FIELD_OPTIONS = {
  city: CITIES,
  category: CATEGORIES,
  event_type: EVENT_TYPES,
  participation_type: PARTICIPATION_TYPES,
};

const TEXT_MAX_LENGTH = {
  description: 1000,
  address: 300,
  track: 300,
  tags: 300,
  title: 300,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const URL_RE = /^https?:\/\//i;

export function validateFieldValue(fieldKey, rawValue) {
  const type = FIELD_TYPES[fieldKey];
  const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

  switch (type) {
    case 'text': {
      if (!value) return { valid: false, error: 'Значение не может быть пустым' };
      const max = TEXT_MAX_LENGTH[fieldKey] ?? 300;
      if (value.length > max) return { valid: false, error: 'Слишком длинное значение' };
      return { valid: true, error: null };
    }
    case 'select': {
      const options = FIELD_OPTIONS[fieldKey] ?? [];
      if (!options.includes(value)) return { valid: false, error: 'Недопустимое значение' };
      return { valid: true, error: null };
    }
    case 'date': {
      if (!DATE_RE.test(value)) return { valid: false, error: 'Формат даты — YYYY-MM-DD' };
      return { valid: true, error: null };
    }
    case 'time': {
      if (!TIME_RE.test(value)) return { valid: false, error: 'Формат времени — HH:MM' };
      return { valid: true, error: null };
    }
    case 'number': {
      if (value === '' || Number.isNaN(Number(value))) return { valid: false, error: 'Значение должно быть числом' };
      return { valid: true, error: null };
    }
    case 'url': {
      if (!URL_RE.test(value)) return { valid: false, error: 'Ссылка должна начинаться с http:// или https://' };
      return { valid: true, error: null };
    }
    case 'people': {
      const people = parsePeople(value ?? '');
      if (people.length === 0) return { valid: false, error: 'Укажите хотя бы одно имя' };
      return { valid: true, error: null };
    }
    default:
      return { valid: true, error: null };
  }
}

// event_url/registration_url не входят в FIELD_TYPES по ключу (это подполя EventResponse,
// не suggestions-ключ), но используют тот же 'url'-тип валидации напрямую.
FIELD_TYPES.event_url = 'url';
FIELD_TYPES.registration_url = 'url';
FIELD_LABELS.event_url = 'Ссылка на событие';
FIELD_LABELS.registration_url = 'Ссылка на регистрацию';

export function serializePeople(people) {
  return people
    .map((p) => (p.url ? `${p.name} (${p.url})` : p.name))
    .join(', ');
}

const PERSON_RE = /^(.*?)(?:\((https?:\/\/[^)]+)\))?$/;

export function parsePeople(text) {
  return text
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const match = chunk.match(PERSON_RE);
      const name = (match?.[1] ?? chunk).trim();
      const url = match?.[2] ?? null;
      return { name, url };
    })
    .filter((p) => p.name.length > 0);
}

export function normalizeFieldValue(fieldKey, rawValue) {
  const type = FIELD_TYPES[fieldKey];
  const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

  if (type === 'number') return Number(value);
  if (type === 'people') return parsePeople(value);
  return value;
}
