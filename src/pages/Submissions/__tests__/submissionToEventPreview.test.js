import { describe, it, expect } from 'vitest';
import { submissionToEventPreview } from '../submissionToEventPreview.js';

describe('submissionToEventPreview', () => {
  it('carries scalar and array fields through unchanged', () => {
    const submission = {
      id: 5,
      event_type: ['Митап'],
      title: 'Митап по бэкенду',
      start_date: '2026-09-01',
      start_time: '18:00',
      end_date: '2026-09-01',
      end_time: '19:00',
      participation_type: ['Слушатель'],
      city: ['Онлайн'],
      address: null,
      event_url: 'https://example.com',
      registration_url: 'https://example.com/reg',
      track: ['Backend'],
      description: 'Описание',
    };
    const result = submissionToEventPreview(submission);
    expect(result).toMatchObject({
      id: 5,
      event_type: ['Митап'],
      title: 'Митап по бэкенду',
      start_date: '2026-09-01',
      start_time: '18:00',
      end_date: '2026-09-01',
      end_time: '19:00',
      participation_type: ['Слушатель'],
      city: ['Онлайн'],
      address: null,
      event_url: 'https://example.com',
      registration_url: 'https://example.com/reg',
      track: ['Backend'],
      description: 'Описание',
    });
    expect(result.tags).toEqual([]);
  });

  it('coerces price to a number, and null/undefined price stays null', () => {
    expect(submissionToEventPreview({ price: '500' }).price).toBe(500);
    expect(submissionToEventPreview({ price: 0 }).price).toBe(0);
    expect(submissionToEventPreview({ price: null }).price).toBeNull();
    expect(submissionToEventPreview({}).price).toBeNull();
  });

  it('normalizes organizers/speakers from plain strings to {name,url} objects', () => {
    const result = submissionToEventPreview({ organizers: ['Alice'], speakers: ['Bob'] });
    expect(result.organizers).toEqual([{ name: 'Alice', url: '' }]);
    expect(result.speakers).toEqual([{ name: 'Bob', url: '' }]);
  });

  it('leaves already-{name,url}-shaped organizers/speakers untouched', () => {
    const result = submissionToEventPreview({
      organizers: [{ name: 'Alice', url: 'https://alice.dev' }],
      speakers: [{ name: 'Bob', url: '' }],
    });
    expect(result.organizers).toEqual([{ name: 'Alice', url: 'https://alice.dev' }]);
    expect(result.speakers).toEqual([{ name: 'Bob', url: '' }]);
  });

  it('defaults missing array fields to empty arrays', () => {
    const result = submissionToEventPreview({});
    expect(result.event_type).toEqual([]);
    expect(result.participation_type).toEqual([]);
    expect(result.city).toEqual([]);
    expect(result.track).toEqual([]);
    expect(result.organizers).toEqual([]);
    expect(result.speakers).toEqual([]);
  });
});
