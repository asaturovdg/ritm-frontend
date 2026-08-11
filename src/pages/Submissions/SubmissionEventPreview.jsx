import Event from '../eventPage/Event.jsx';
import { submissionToEventPreview } from './submissionToEventPreview.js';
import './SubmissionEventPreview.css';

export default function SubmissionEventPreview({ submission, onClose }) {
  return (
    <div className="submission-event-preview" onClick={onClose}>
      <div className="submission-event-preview__panel" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="submission-event-preview__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>
        <Event
          isPreview
          status={submission.status}
          rejectionReason={submission.rejection_reason}
          previewData={submissionToEventPreview(submission)}
        />
      </div>
    </div>
  );
}
