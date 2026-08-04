import { useState } from 'react';
import { ListPlus } from 'lucide-react';
import CollectionsSheet from '../CollectionsSheet/CollectionsSheet.jsx';
import './CollectionsButton.css';

export default function CollectionsButton({ event, source = 'list', compact = false }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setSheetOpen(true);
  };

  return (
    <>
      <button
        className={`collections-btn ${compact ? 'collections-btn--compact' : ''}`}
        onClick={handleClick}
        aria-label="В подборку"
      >
        <ListPlus size={14} strokeWidth={1.75} />
        {!compact && <span>В подборку</span>}
      </button>
      {sheetOpen && (
        <CollectionsSheet
          event={event}
          source={source}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
