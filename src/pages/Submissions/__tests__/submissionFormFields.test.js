import { describe, it, expect } from 'vitest';
import { FORM_GROUPS, FIELD_DEFS, EMPTY_FORM_DATA, buildInitialFormData, buildSubmissionPayload } from '../submissionFormFields.js';

describe('submissionFormFields', () => {
  it('every field referenced by a group has a definition, and every definition is used by exactly one group', () => {
    const fieldsInGroups = FORM_GROUPS.flatMap((g) => g.fields);
    expect(new Set(fieldsInGroups).size).toBe(fieldsInGroups.length);
    fieldsInGroups.forEach((id) => expect(FIELD_DEFS[id]).toBeDefined());
    expect(Object.keys(FIELD_DEFS).sort()).toEqual(fieldsInGroups.sort());
  });

  it('has exactly 4 groups in the expected order', () => {
    expect(FORM_GROUPS.map((g) => g.id)).toEqual(['about', 'when_where', 'details', 'contacts']);
  });

  it('buildInitialFormData returns EMPTY_FORM_DATA when there are no initial values', () => {
    expect(buildInitialFormData(null)).toEqual(EMPTY_FORM_DATA);
  });

  it('buildInitialFormData normalizes organizers/speakers whether they are strings or {name,url} objects', () => {
    const result = buildInitialFormData({
      title: 'Митап',
      organizers: ['Alice', { name: 'Bob', url: '' }],
      speakers: [{ name: 'Carol', url: 'https://x.com' }],
    });
    expect(result.title).toBe('Митап');
    expect(result.organizers).toEqual(['Alice', 'Bob']);
    expect(result.speakers).toEqual(['Carol']);
  });

  it('buildInitialFormData stringifies numeric price/expected_attendees for form inputs', () => {
    const result = buildInitialFormData({ price: 0, expected_attendees: 50 });
    expect(result.price).toBe('0');
    expect(result.expected_attendees).toBe('50');
  });

  it('buildSubmissionPayload converts organizers/speakers back to {name,url} objects and nulls out empty optionals', () => {
    const payload = buildSubmissionPayload({
      ...EMPTY_FORM_DATA,
      title: 'Митап',
      event_type: ['IT'],
      participation_type: ['Слушатель'],
      city: ['Москва'],
      track: ['Backend'],
      start_date: '2026-09-01',
      end_date: '2026-09-01',
      organizers: ['Alice'],
      speakers: [],
      price: '',
      event_url: '',
    });
    expect(payload.organizers).toEqual([{ name: 'Alice', url: '' }]);
    expect(payload.speakers).toBeNull();
    expect(payload.price).toBeNull();
    expect(payload.event_url).toBeNull();
  });

  it('buildSubmissionPayload clamps negative price to 0 and parses it as an integer', () => {
    const payload = buildSubmissionPayload({ ...EMPTY_FORM_DATA, price: '-5' });
    expect(payload.price).toBe(0);
  });
});
