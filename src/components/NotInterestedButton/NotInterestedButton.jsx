import { useNotInterested } from '../NotInterestedContext.jsx';
import { useSavedEvents } from '../SavedEventsContext.jsx';
import { useToast } from '../Toast/ToastContext.jsx';
import './NotInterestedButton.css';

export default function NotInterestedButton({ event, source = 'list', block }) {
  const { isNotInterested, isPending, markNotInterested, unmarkNotInterested } = useNotInterested();
  const { isSaved } = useSavedEvents();
  const showToast = useToast();

  const eventId = event?.id;
  const marked = isNotInterested(eventId);
  const pending = isPending(eventId);
  const alreadyGoing = isSaved(eventId);

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (marked) {
      unmarkNotInterested(eventId);
      return;
    }
    markNotInterested(event, { source, block });
    showToast('Событие скрыто', {
      duration: 3000,
      action: {
        label: 'Отменить',
        onClick: () => unmarkNotInterested(eventId),
      },
    });
  };

  return (
    <button
      className={`not-interested-btn ${marked ? 'not-interested-btn--marked' : ''}`}
      onClick={handleClick}
      disabled={pending || (!marked && alreadyGoing)}
    >
      {marked ? '✓ Скрыто' : 'Скрыть'}
    </button>
  );
}
