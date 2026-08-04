import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CollectionsButton from '../CollectionsButton.jsx';

vi.mock('../../CollectionsSheet/CollectionsSheet.jsx', () => ({
  default: ({ event, source, onClose }) => (
    <div data-testid="collections-sheet">
      <span>event:{event.id}</span>
      <span>source:{source}</span>
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

const event = { id: 7 };

describe('CollectionsButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render the sheet before being clicked', () => {
    render(<CollectionsButton event={event} />);
    expect(screen.queryByTestId('collections-sheet')).not.toBeInTheDocument();
  });

  it('opens the sheet on click and stops propagation (card is clickable)', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <CollectionsButton event={event} source="search" />
      </div>
    );

    fireEvent.click(screen.getByLabelText('В подборку'));

    expect(screen.getByTestId('collections-sheet')).toBeInTheDocument();
    expect(screen.getByText('source:search')).toBeInTheDocument();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('closes the sheet when onClose fires', () => {
    render(<CollectionsButton event={event} />);
    fireEvent.click(screen.getByLabelText('В подборку'));
    fireEvent.click(screen.getByText('close'));
    expect(screen.queryByTestId('collections-sheet')).not.toBeInTheDocument();
  });
});
