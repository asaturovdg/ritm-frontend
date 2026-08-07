import './CancelSubmissionModal.css';

export default function CancelSubmissionModal({ submission, isSubmitting, onConfirm, onClose }) {
  return (
    <div
      className="modal-overlay"
      data-testid="cancel-submission-overlay"
      onClick={() => !isSubmitting && onClose()}
    >
      <div className="modal-content cancel-submission-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Отменить заявку?</h3>
        </div>
        <div className="modal-body">
          <p>
            Заявка «{submission.title}» будет удалена без возможности восстановления.
          </p>
        </div>
        <div className="modal-footer cancel-submission-modal__footer">
          <button
            type="button"
            data-testid="cancel-submission-dismiss"
            className="cancel-submission-modal__btn cancel-submission-modal__btn--secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Не отменять
          </button>
          <button
            type="button"
            data-testid="cancel-submission-confirm"
            className="cancel-submission-modal__btn cancel-submission-modal__btn--danger"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? 'Отмена…' : 'Отменить заявку'}
          </button>
        </div>
      </div>
    </div>
  );
}
