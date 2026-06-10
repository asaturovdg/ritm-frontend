import { useDrag } from '@use-gesture/react';
import { useNavigate } from 'react-router-dom';

const TAB_PATHS = ['/', '/profile', '/feedback', '/submissions'];

const SWIPE_DISTANCE = 50;  // px
const SWIPE_VELOCITY = 0.4; // px/ms

export function useTabSwipe(currentPath, enabled) {
  const navigate = useNavigate();
  const currentIndex = TAB_PATHS.indexOf(currentPath);

  return useDrag(
    ({ last, movement: [mx], velocity: [vx] }) => {
      if (!last || !enabled || currentIndex === -1) return;

      const triggered = Math.abs(mx) > SWIPE_DISTANCE || Math.abs(vx) > SWIPE_VELOCITY;
      if (!triggered) return;

      if (mx < 0 && currentIndex < TAB_PATHS.length - 1) {
        navigate(TAB_PATHS[currentIndex + 1]);
      } else if (mx > 0 && currentIndex > 0) {
        navigate(TAB_PATHS[currentIndex - 1]);
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
    }
  );
}
