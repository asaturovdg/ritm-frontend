import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QueueListSheet from '../QueueListSheet.jsx';

const items = [
  { id: 1, title: 'Митап по бэкенду', quality_score: 3 },
  { id: 2, title: 'DevOps конференция', quality_score: 2 },
  { id: 3, title: 'Frontend meetup', quality_score: 4 },
];

describe('QueueListSheet', () => {
  it('renders every item with its quality score and highlights the current one', () => {
    render(<QueueListSheet items={items} currentId={2} hasMore={false} onSelect={vi.fn()} onClose={vi.fn()} onLoadMore={vi.fn()} />);
    expect(screen.getByText('Митап по бэкенду')).toBeInTheDocument();
    expect(screen.getByText('DevOps конференция')).toBeInTheDocument();
    expect(screen.getByText('Frontend meetup')).toBeInTheDocument();
    const activeItem = screen.getByText('DevOps конференция').closest('.moderation-sheet__item');
    expect(activeItem.className).toContain('moderation-sheet__item--active');
  });

  it('calls onSelect with the clicked item id', async () => {
    const onSelect = vi.fn();
    render(<QueueListSheet items={items} currentId={1} hasMore={false} onSelect={onSelect} onClose={vi.fn()} onLoadMore={vi.fn()} />);
    await userEvent.click(screen.getByText('Frontend meetup'));
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(<QueueListSheet items={items} currentId={1} hasMore={false} onSelect={vi.fn()} onClose={onClose} onLoadMore={vi.fn()} />);
    await userEvent.click(screen.getByTestId('moderation-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onLoadMore when hasMore is true and the load-more sentinel is rendered', () => {
    const onLoadMore = vi.fn();
    render(<QueueListSheet items={items} currentId={1} hasMore={true} onSelect={vi.fn()} onClose={vi.fn()} onLoadMore={onLoadMore} />);
    expect(screen.getByTestId('moderation-sheet-load-more')).toBeInTheDocument();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not double-fire onLoadMore when the component re-renders with hasMore still true', () => {
    // Create two separate function mocks to exercise the firedRef guard
    const onLoadMoreFirst = vi.fn();
    const onLoadMoreSecond = vi.fn();

    // Render with the first callback
    const { rerender } = render(
      <QueueListSheet
        items={items}
        currentId={1}
        hasMore={true}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onLoadMore={onLoadMoreFirst}
      />
    );
    expect(onLoadMoreFirst).toHaveBeenCalledTimes(1);

    // Re-render with a different onLoadMore callback (simulating parent not memoizing)
    // hasMore stays true, so LoadMoreSentinel stays mounted
    rerender(
      <QueueListSheet
        items={items}
        currentId={2}
        hasMore={true}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onLoadMore={onLoadMoreSecond}
      />
    );

    // The firedRef guard prevents calling the second callback even though the effect re-ran due to onLoadMore dependency change
    expect(onLoadMoreFirst).toHaveBeenCalledTimes(1);
    expect(onLoadMoreSecond).toHaveBeenCalledTimes(0);
  });

  it('does not render the load-more sentinel when hasMore is false', () => {
    render(<QueueListSheet items={items} currentId={1} hasMore={false} onSelect={vi.fn()} onClose={vi.fn()} onLoadMore={vi.fn()} />);
    expect(screen.queryByTestId('moderation-sheet-load-more')).not.toBeInTheDocument();
  });
});
