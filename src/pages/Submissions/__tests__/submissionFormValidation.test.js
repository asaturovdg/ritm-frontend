import { describe, it, expect } from 'vitest';
import { validateField, validateGroup, isDateValid, isTimeValid, isEndDateValid } from '../submissionFormValidation.js';
import { EMPTY_FORM_DATA } from '../submissionFormFields.js';

const base = { ...EMPTY_FORM_DATA };

describe('validateField', () => {
  it('requires a title of at least 3 characters', () => {
    expect(validateField('title', { ...base, title: 'Ab' })).toMatch(/название/);
    expect(validateField('title', { ...base, title: 'Abc' })).toBeNull();
  });

  it('requires at least one option for each multiselect field', () => {
    ['event_type', 'track', 'participation_type', 'city'].forEach((id) => {
      expect(validateField(id, { ...base, [id]: [] })).toMatch(/хотя бы 1/);
      expect(validateField(id, { ...base, [id]: ['x'] })).toBeNull();
    });
  });

  it('requires an address only when a non-"Онлайн" city is selected', () => {
    expect(validateField('address', { ...base, city: ['Онлайн'], address: '' })).toBeNull();
    expect(validateField('address', { ...base, city: ['Москва'], address: '' })).toMatch(/адрес/);
    expect(validateField('address', { ...base, city: ['Москва'], address: 'ул. Ленина' })).toBeNull();
  });

  it('rejects event_url/registration_url that do not start with https://', () => {
    expect(validateField('event_url', { ...base, event_url: 'http://x.com' })).toMatch(/https/);
    expect(validateField('event_url', { ...base, event_url: 'https://x.com' })).toBeNull();
    expect(validateField('event_url', { ...base, event_url: '' })).toBeNull();
    expect(validateField('registration_url', { ...base, registration_url: 'ftp://x.com' })).toMatch(/https/);
  });

  it('requires contact_person of at least 2 characters', () => {
    expect(validateField('contact_person', { ...base, contact_person: 'A' })).toMatch(/ФИО/);
    expect(validateField('contact_person', { ...base, contact_person: 'Ab' })).toBeNull();
  });

  it('leaves description, expected_attendees, and organizers optional (matches current production behavior)', () => {
    expect(validateField('description', { ...base, description: '' })).toBeNull();
    expect(validateField('expected_attendees', { ...base, expected_attendees: '' })).toBeNull();
    expect(validateField('organizers', { ...base, organizers: [] })).toBeNull();
  });

  it('validates date_time: requires start date not in the past and end date on/after start', () => {
    expect(validateField('date_time', { ...base, start_date: '' })).toMatch(/дату начала/);
    expect(validateField('date_time', { ...base, start_date: '2020-01-01', end_date: '2020-01-02' })).toMatch(/прошлом/);
    const future = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    expect(validateField('date_time', { ...base, start_date: future, end_date: '' })).toMatch(/дату окончания/);
    const earlierEnd = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];
    expect(validateField('date_time', { ...base, start_date: future, end_date: earlierEnd })).toMatch(/раньше даты начала/);
    expect(validateField('date_time', { ...base, start_date: future, end_date: future })).toBeNull();
  });
});

describe('validateGroup', () => {
  it('returns one error per invalid field in the group', () => {
    const errors = validateGroup('about', { ...base, title: '', event_type: [], track: ['x'], participation_type: ['x'] });
    expect(Object.keys(errors).sort()).toEqual(['event_type', 'title']);
  });

  it('returns an empty object when every field in the group is valid', () => {
    const errors = validateGroup('about', { ...base, title: 'Митап', event_type: ['IT'], track: ['Backend'], participation_type: ['Слушатель'] });
    expect(errors).toEqual({});
  });

  it('adds a _group error for contacts when no contact method is provided', () => {
    const errors = validateGroup('contacts', { ...base, contact_person: 'Иван Иванов', contact_website: '', contact_telegram: '', contact_email: '' });
    expect(errors._group).toMatch(/способ связи/);
  });

  it('has no _group error for contacts when at least one contact method is provided', () => {
    const errors = validateGroup('contacts', { ...base, contact_person: 'Иван Иванов', contact_telegram: '@ivan' });
    expect(errors._group).toBeUndefined();
  });
});

describe('date helpers', () => {
  it('isDateValid rejects past dates and accepts today/future', () => {
    expect(isDateValid('2000-01-01')).toBe(false);
    const future = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    expect(isDateValid(future)).toBe(true);
  });

  it('isEndDateValid requires end on/after start when both present', () => {
    expect(isEndDateValid('2026-09-05', '2026-09-01')).toBe(false);
    expect(isEndDateValid('2026-09-01', '2026-09-05')).toBe(true);
    expect(isEndDateValid('', '2026-09-05')).toBe(true);
  });

  it('isTimeValid rejects an end time on/before the start time on the same day', () => {
    expect(isTimeValid('2026-09-01', '2026-09-01', '18:00', '17:00')).toBe(false);
    expect(isTimeValid('2026-09-01', '2026-09-01', '18:00', '19:00')).toBe(true);
    expect(isTimeValid('2026-09-01', '2026-09-02', '18:00', '10:00')).toBe(true);
  });
});
