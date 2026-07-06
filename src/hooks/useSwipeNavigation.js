import { useRef } from 'react';
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

// `ignoreSelector` lets a nested native scroller (e.g. a horizontal
// carousel) opt out of this gesture. touch-action alone can't do this:
// it only tells the browser whether to hand the touch to JS at all, but
// once handed over, the touchmove still bubbles up to this handler
// regardless of touch-action on the inner element. So we check where the
// drag started and skip navigation if it began inside the excluded area.
export function useSwipeNavigation({ currentIndex, itemCount, onSwipe, enabled = true, ignoreSelector }) {
  const ignoreDragRef = useRef(false);

  return useDrag(
    ({ first, last, movement: [mx], velocity: [vx], event }) => {
      if (first) {
        ignoreDragRef.current = !!(ignoreSelector && event.target.closest?.(ignoreSelector));
      }
      if (!last || !enabled || ignoreDragRef.current) return;
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
