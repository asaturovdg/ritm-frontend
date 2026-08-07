import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CancelSubmissionModal from '../CancelSubmissionModal.jsx';

describe('CancelSubmissionModal', () => {
  it('shows the submission title in the confirmation text', () => {
    render(<CancelSubmissionModal submission={{ title: 'Митап по фронтенду' }} isSubmitting={false} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Митап по фронтенду/)).toBeInTheDocument();
  });

  it('calls onConfirm when the destructive button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<CancelSubmissionModal submission={{ title: 'X' }} isSubmitting={false} onConfirm={onConfirm} onClose={vi.fn()} />);
    await userEvent.click(screen.getByTestId('cancel-submission-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the dismiss button is clicked', async () => {
    const onClose = vi.fn();
    render(<CancelSubmissionModal submission={{ title: 'X' }} isSubmitting={false} onConfirm={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByTestId('cancel-submission-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the overlay is clicked', async () => {
    const onClose = vi.fn();
    render(<CancelSubmissionModal submission={{ title: 'X' }} isSubmitting={false} onConfirm={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByTestId('cancel-submission-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons and shows submitting text while isSubmitting is true', () => {
    render(<CancelSubmissionModal submission={{ title: 'X' }} isSubmitting={true} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('cancel-submission-confirm')).toBeDisabled();
    expect(screen.getByTestId('cancel-submission-dismiss')).toBeDisabled();
    expect(screen.getByTestId('cancel-submission-confirm')).toHaveTextContent('Отмена…');
  });
});
