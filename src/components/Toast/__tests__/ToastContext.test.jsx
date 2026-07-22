import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastContext.jsx';

function TriggerButton({ message, options }) {
  const showToast = useToast();
  return <button onClick={() => showToast(message, options)}>trigger</button>;
}

describe('ToastContext — action support', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a plain message and auto-dismisses after the default duration', () => {
    render(
      <ToastProvider>
        <TriggerButton message="Готово" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Готово')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1150); });
    expect(screen.queryByText('Готово')).not.toBeInTheDocument();
  });

  it('renders an action button and calls onClick + dismisses when clicked', () => {
    const onClick = vi.fn();
    render(
      <ToastProvider>
        <TriggerButton
          message="Событие скрыто"
          options={{ duration: 3000, action: { label: 'Отменить', onClick } }}
        />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Событие скрыто')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Отменить'));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByText('Событие скрыто')).not.toBeInTheDocument();
  });

  it('auto-dismisses an action toast after its custom duration if not clicked', () => {
    render(
      <ToastProvider>
        <TriggerButton
          message="Событие скрыто"
          options={{ duration: 3000, action: { label: 'Отменить', onClick: vi.fn() } }}
        />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('trigger'));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByText('Событие скрыто')).not.toBeInTheDocument();
  });
});
