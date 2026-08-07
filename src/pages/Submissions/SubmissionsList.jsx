import { useState, useMemo } from 'react';
import { useToast } from '../../components/Toast/ToastContext.jsx';
import SubmissionStatusFilter from './SubmissionStatusFilter.jsx';
import SubmissionCard from './SubmissionCard.jsx';
import SubmissionDetailsModal from './SubmissionDetailsModal.jsx';
import CancelSubmissionModal from './CancelSubmissionModal.jsx';
import { getStatusText } from './submissionStatus.js';
import './SubmissionsList.css';

export default function SubmissionsList({ submissions, isLoading, hasLoadedOnce, token, userId, onRefetch, onCreateNew }) {
  const showToast = useToast();
  const [activeFilter, setActiveFilter] = useState('all');
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const filtered = useMemo(
    () => (activeFilter === 'all' ? submissions : submissions.filter((s) => s.status === activeFilter)),
    [submissions, activeFilter]
  );

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      const response = await fetch(`https://ritmevents.ru/api/v1/submissions/${cancelTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setCancelTarget(null);
        onRefetch();
      } else {
        showToast('Не удалось отменить заявку. Попробуйте ещё раз');
      }
    } catch {
      showToast('Не удалось отменить заявку. Попробуйте ещё раз');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading && !hasLoadedOnce) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Загрузка заявок...</p>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="empty-submissions">
        <p>У вас пока нет отправленных заявок</p>
        <button className="create-event-btn" onClick={onCreateNew}>
          Создать событие
        </button>
      </div>
    );
  }

  return (
    <div className="my-submissions">
      <SubmissionStatusFilter submissions={submissions} activeFilter={activeFilter} onChange={setActiveFilter} />

      {filtered.length === 0 ? (
        <p className="submissions-empty-filtered">Нет заявок в статусе «{getStatusText(activeFilter)}»</p>
      ) : (
        <div className="digest-list">
          {filtered.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              token={token}
              userId={userId}
              onShowDetails={setDetailsTarget}
              onCancel={setCancelTarget}
            />
          ))}
        </div>
      )}

      {detailsTarget && (
        <SubmissionDetailsModal submission={detailsTarget} onClose={() => setDetailsTarget(null)} />
      )}

      {cancelTarget && (
        <CancelSubmissionModal
          submission={cancelTarget}
          isSubmitting={isCancelling}
          onConfirm={confirmCancel}
          onClose={() => !isCancelling && setCancelTarget(null)}
        />
      )}
    </div>
  );
}
