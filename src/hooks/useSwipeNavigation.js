import { useDrag } from '@use-gesture/react';

const SWIPE_DISTANCE = 50;  // px
const SWIPE_VELOCITY = 0.4; // px/ms

export function resolveSwipeTarget(currentIndex, itemCount, mx, vx) {
  const triggered = Math.abs(mx) > SWIPE_DISTANCE || Math.abs(vx) > SWIPE_VELOCITY;
  if (!triggered) return null;

  const direction = mx < 0 ? 1 : -1;
  const targetIndex = currentIndex + direction;
  return {
    direction,
    targetIndex,
    inBounds: targetIndex >= 0 && targetIndex < itemCount,
  };
}

export function useSwipeNavigation({ currentIndex, itemCount, onSwipe, enabled = true }) {
  return useDrag(
    ({ last, movement: [mx], velocity: [vx] }) => {
      if (!last || !enabled) return;
      const result = resolveSwipeTarget(currentIndex, itemCount, mx, vx);
      if (result) onSwipe(result);
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
    }
  );
}
