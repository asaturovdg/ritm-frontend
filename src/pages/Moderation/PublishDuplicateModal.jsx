import './PublishDuplicateModal.css';

export default function PublishDuplicateModal({ candidates, isSubmitting, onSelect, onForce, onClose }) {
  return (
    <div
      className="modal-overlay"
      data-testid="publish-duplicate-overlay"
      onClick={() => !isSubmitting && onClose()}
    >
      <div className="modal-content publish-duplicate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Похожее событие уже есть</h3>
        </div>
        <div className="modal-body">
          <p className="publish-duplicate-modal__hint">
            Выберите событие, в которое перенести данные заявки, либо опубликуйте заявку как новое событие.
          </p>
          <div className="publish-duplicate-modal__list">
            {candidates.map((candidate) => (
              <div key={candidate.event_id} className="publish-duplicate-modal__candidate">
                <div className="publish-duplicate-modal__candidate-info">
                  <div className="publish-duplicate-modal__candidate-title">{candidate.title}</div>
                  <div className="publish-duplicate-modal__candidate-meta">
                    {candidate.start_date}
                    {candidate.city?.length ? ` · ${candidate.city.join(', ')}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="publish-duplicate-select"
                  className="publish-duplicate-modal__btn publish-duplicate-modal__btn--secondary"
                  disabled={isSubmitting}
                  onClick={() => onSelect(candidate.event_id)}
                >
                  Это оно
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer publish-duplicate-modal__footer">
          <button
            type="button"
            data-testid="publish-duplicate-cancel"
            className="publish-duplicate-modal__btn publish-duplicate-modal__btn--secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            data-testid="publish-duplicate-force"
            className="publish-duplicate-modal__btn publish-duplicate-modal__btn--primary"
            disabled={isSubmitting}
            onClick={onForce}
          >
            {isSubmitting ? 'Публикация…' : 'Это другое, опубликовать как новое'}
          </button>
        </div>
      </div>
    </div>
  );
}
