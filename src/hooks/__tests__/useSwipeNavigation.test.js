import { describe, it, expect } from 'vitest';
import { resolveSwipeTarget } from '../useSwipeNavigation.js';

describe('resolveSwipeTarget', () => {
  it('returns null when movement is below both the distance and velocity thresholds', () => {
    expect(resolveSwipeTarget(1, 3, 10, 0.1)).toBeNull();
  });

  it('triggers on distance alone (>50px)', () => {
    expect(resolveSwipeTarget(1, 3, -60, 0)).toEqual({ direction: 1, targetIndex: 2, inBounds: true });
  });

  it('triggers on velocity alone (>0.4px/ms)', () => {
    expect(resolveSwipeTarget(1, 3, -10, 0.5)).toEqual({ direction: 1, targetIndex: 2, inBounds: true });
  });

  it('negative movement (finger moving left) yields direction 1 (next)', () => {
    const result = resolveSwipeTarget(0, 3, -60, 0);
    expect(result.direction).toBe(1);
    expect(result.targetIndex).toBe(1);
  });

  it('positive movement (finger moving right) yields direction -1 (previous)', () => {
    const result = resolveSwipeTarget(1, 3, 60, 0);
    expect(result.direction).toBe(-1);
    expect(result.targetIndex).toBe(0);
  });

  it('marks out-of-bounds when swiping past the last item', () => {
    expect(resolveSwipeTarget(2, 3, -60, 0)).toEqual({ direction: 1, targetIndex: 3, inBounds: false });
  });

  it('marks out-of-bounds when swiping before the first item', () => {
    expect(resolveSwipeTarget(0, 3, 60, 0)).toEqual({ direction: -1, targetIndex: -1, inBounds: false });
  });
});
