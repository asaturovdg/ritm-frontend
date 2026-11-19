import { describe, it, expect, vi, afterEach } from 'vitest';
import { startExperienceReading, sendInteraction } from '../analytics.js';
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe('реальное чтение', () => {
  it('подтверждает open до интервалов и прекращает учёт скрытого экрана и простоя', async () => {
    vi.useFakeTimers();
    let visible = true;
    const events = [];
    const request = vi.fn(async (path, body) => { events.push(...body.body.items); return { accepted: 1 }; });
    const stop = startExperienceReading({ request, experienceId: 3, source: 'companions', isVisible: () => visible });
    await vi.advanceTimersByTimeAsync(15000);
    expect(events.map(e => e.kind)).toEqual(['experience_open', 'experience_read_interval']);
    expect(events[1]).toMatchObject({ open_id: events[0].id, duration: 15, source: 'companions' });
    visible = false;
    await vi.advanceTimersByTimeAsync(30000);
    expect(events).toHaveLength(2);
    visible = true;
    await vi.advanceTimersByTimeAsync(90000);
    stop();
    expect(events.filter(e => e.kind === 'experience_read_interval').reduce((a, e) => a + e.duration, 0)).toBeLessThanOrEqual(30);
  });
  it('не считает время ожидания подтверждения open', async () => {
    vi.useFakeTimers();
    let accept;
    const events = [];
    const request = vi.fn(async (path, options) => { events.push(options.body.items[0]); if (events.length === 1) return new Promise(r => { accept = r; }); return {}; });
    const stop = startExperienceReading({ request, experienceId: 3, source: 'event', isVisible: () => true });
    await vi.advanceTimersByTimeAsync(30000);
    expect(events).toHaveLength(1);
    accept({ accepted: 1 });
    await vi.advanceTimersByTimeAsync(15000);
    expect(events[1].duration).toBe(15);
    stop();
  });
  it('повтор отправляет тот же UUID', async () => {
    const sent = [];
    const request = vi.fn(async (path, options) => { sent.push(options.body.items[0]); if (sent.length === 1) throw new Error('network'); return {}; });
    await sendInteraction(request, { id: 'fixed-id', kind: 'profile_view', profile_user_id: 7, source: 'direct' });
    expect(sent).toHaveLength(2);
    expect(sent[0].id).toBe(sent[1].id);
  });
});
