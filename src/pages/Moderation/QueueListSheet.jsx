import { useEffect, useRef } from 'react';

function LoadMoreSentinel({ onLoadMore }) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onLoadMore();
  }, [onLoadMore]);
  return <div data-testid="moderation-sheet-load-more" className="moderation-sheet__load-more">Загрузка…</div>;
}

export default function QueueListSheet({ items, currentId, hasMore, onSelect, onClose, onLoadMore }) {
  return (
    <div className="moderation-sheet">
      <div
        className="moderation-sheet__backdrop"
        data-testid="moderation-sheet-backdrop"
        onClick={onClose}
      />
      <div className="moderation-sheet__panel">
        <div className="moderation-sheet__title">Очередь модерации</div>
        {items.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            className={`moderation-sheet__item${item.id === currentId ? ' moderation-sheet__item--active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            <span className="moderation-sheet__item-title">{item.title}</span>
            <span className="moderation-sheet__item-quality">{item.quality_score}/5</span>
          </div>
        ))}
        {hasMore && <LoadMoreSentinel onLoadMore={onLoadMore} />}
      </div>
    </div>
  );
}
