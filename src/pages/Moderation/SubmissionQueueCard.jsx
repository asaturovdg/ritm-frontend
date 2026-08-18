import { useState, useRef, useEffect } from 'react';
import Event from '../eventPage/Event.jsx';
import { submissionToEventPreview } from '../Submissions/submissionToEventPreview.js';
import PublishDuplicateModal from './PublishDuplicateModal.jsx';
import './SubmissionQueueCard.css';

export default function SubmissionQueueCard({ submission, index, total, onOpenList, onApprove, onReject, onPublish }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [candidates, setCandidates] = useState(null);
  const rejectRef = useRef(null);

  useEffect(() => {
    if (!rejectOpen) return;
    const handleOutside = (e) => {
      if (rejectRef.current && !rejectRef.current.contains(e.target)) setRejectOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [rejectOpen]);

  const handleConfirmReject = () => {
    onReject(submission.id, reason);
    setRejectOpen(false);
    setReason('');
  };

  const handlePublish = async (payload) => {
    setIsPublishing(true);
    const result = await onPublish(submission.id, payload);
    setIsPublishing(false);
    if (result.status === 'conflict') {
      setCandidates(result.candidates);
    } else if (result.status === 'success') {
      setCandidates(null);
    }
  };

  const isApprovedUnpublished = submission.status === 'approved' && !submission.published_event_id;

  return (
    <div className="submission-queue-card">
      <div className="submission-queue-card__header">
        <button type="button" className="submission-queue-card__counter" onClick={onOpenList}>
          {index + 1} / {total}
        </button>
      </div>

      <div className="submission-queue-card__preview">
        <Event isPreview status={submission.status || 'pending'} previewData={submissionToEventPreview(submission)} />
      </div>

      <div className="submission-queue-card__footer">
        {isApprovedUnpublished ? (
          <button
            type="button"
            data-testid="submission-queue-card__publish"
            className="submission-queue-card__btn submission-queue-card__btn--primary"
            disabled={isPublishing}
            onClick={() => handlePublish({})}
          >
            {isPublishing ? 'Публикация…' : 'Опубликовать'}
          </button>
        ) : (
          <>
            <div className="submission-queue-card__reject-wrap" ref={rejectRef}>
              <button
                type="button"
                data-testid="submission-queue-card__reject-toggle"
                className="submission-queue-card__btn"
                onClick={() => setRejectOpen((v) => !v)}
              >
                Отклонить
              </button>
              {rejectOpen && (
                <div className="submission-queue-card__reject-popover" data-testid="reject-popover">
                  <textarea
                    className="submission-queue-card__reject-textarea"
                    placeholder="Причина (необязательно)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <button
                    type="button"
                    data-testid="submission-queue-card__reject-confirm"
                    className="submission-queue-card__btn submission-queue-card__btn--danger"
                    onClick={handleConfirmReject}
                  >
                    Отклонить
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              data-testid="submission-queue-card__approve"
              className="submission-queue-card__btn submission-queue-card__btn--primary"
              onClick={() => onApprove(submission.id)}
            >
              Одобрить
            </button>
          </>
        )}
      </div>

      {candidates && (
        <PublishDuplicateModal
          candidates={candidates}
          isSubmitting={isPublishing}
          onSelect={(eventId) => handlePublish({ match_event_id: eventId })}
          onForce={() => handlePublish({ force: true })}
          onClose={() => setCandidates(null)}
        />
      )}
    </div>
  );
}
