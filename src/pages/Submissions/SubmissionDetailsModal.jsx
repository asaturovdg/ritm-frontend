import { usePlatform } from '../../platform/usePlatform.js';
import { getStatusText, getStatusClass } from './submissionStatus.js';
import { formatDate, formatTime } from './submissionFormat.js';

export default function SubmissionDetailsModal({ submission, onClose }) {
  const { openLink } = usePlatform();

  const handleOpenLink = (e, url) => {
    e.preventDefault();
    openLink(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{submission.title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-section">
            <strong>Статус:</strong>
            <span className={`status-badge ${getStatusClass(submission.status)}`}>
              {getStatusText(submission.status)}
            </span>
          </div>

          {submission.event_type && submission.event_type.length > 0 && (
            <div className="detail-section">
              <strong>Тема:</strong> {submission.event_type.join(', ')}
            </div>
          )}

          {submission.track && submission.track.length > 0 && (
            <div className="detail-section">
              <strong>Формат:</strong> {submission.track.join(', ')}
            </div>
          )}

          {submission.participation_type && submission.participation_type.length > 0 && (
            <div className="detail-section">
              <strong>Кого приглашаем:</strong> {submission.participation_type.join(', ')}
            </div>
          )}

          {submission.city && submission.city.length > 0 && (
            <div className="detail-section">
              <strong>Город:</strong> {submission.city.join(', ')}
            </div>
          )}

          <div className="detail-section">
            <strong>Дата:</strong> {formatDate(submission.start_date)}
            {submission.start_time && ` в ${formatTime(submission.start_time)}`}
            {submission.end_date && submission.end_date !== submission.start_date && (
              <> - {formatDate(submission.end_date)}</>
            )}
          </div>

          {submission.price !== undefined && submission.price !== null && (
            <div className="detail-section">
              <strong>Стоимость:</strong> {submission.price === 0 ? 'Бесплатно' : `${submission.price} ₽`}
            </div>
          )}

          {submission.address && (
            <div className="detail-section">
              <strong>Адрес:</strong> {submission.address}
            </div>
          )}

          {submission.description && (
            <div className="detail-section">
              <strong>Описание:</strong>
              <p>{submission.description}</p>
            </div>
          )}

          {submission.organizers && submission.organizers.length > 0 && (
            <div className="detail-section">
              <strong>Организаторы:</strong> {submission.organizers.join(', ')}
            </div>
          )}

          {submission.speakers && submission.speakers.length > 0 && (
            <div className="detail-section">
              <strong>Спикеры:</strong> {submission.speakers.join(', ')}
            </div>
          )}

          {submission.event_url && (
            <div className="detail-section">
              <strong>Сайт:</strong>
              <a href={submission.event_url} onClick={(e) => handleOpenLink(e, submission.event_url)}>
                {submission.event_url}
              </a>
            </div>
          )}

          {submission.registration_url && (
            <div className="detail-section">
              <strong>Регистрация:</strong>
              <a href={submission.registration_url} onClick={(e) => handleOpenLink(e, submission.registration_url)}>
                {submission.registration_url}
              </a>
            </div>
          )}

          {submission.rejection_reason && (
            <div className="detail-section rejection-reason">
              <strong>Причина отклонения:</strong> {submission.rejection_reason}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
