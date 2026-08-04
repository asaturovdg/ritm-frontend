import { useState } from 'react';
import { ListPlus } from 'lucide-react';
import CollectionsSheet from '../CollectionsSheet/CollectionsSheet.jsx';
import './CollectionsButton.css';

export default function CollectionsButton({ event, source = 'list' }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setSheetOpen(true);
  };

  return (
    <>
      <button
        className="collections-btn"
        onClick={handleClick}
        aria-label="В подборку"
      >
        <ListPlus size={14} strokeWidth={1.75} />
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
