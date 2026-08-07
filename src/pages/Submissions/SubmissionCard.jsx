import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { usePlatform } from '../../platform/usePlatform.js';
import { getStatusText, getStatusClass } from './submissionStatus.js';
import { formatDate, formatTime } from './submissionFormat.js';
import dateIcon from '../../assets/icons/DateRange.svg';
import timeIcon from '../../assets/icons/time.svg';
import priceIcon from '../../assets/icons/currency.svg';
import placeIcon from '../../assets/icons/Place.svg';
import partTypeIcon from '../../assets/icons/partType.svg';
import webIcon from '../../assets/icons/web.svg';
import './SubmissionCard.css';

export default function SubmissionCard({ submission, token, userId, onShowDetails, onCancel }) {
  const { openLink } = usePlatform();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const handleOpenLink = (e, url) => {
    e.preventDefault();
    openLink(url);
  };

  const isApprovedWithEvent = submission.status === 'approved' && submission.published_event_id;

  return (
    <div className="digest__item submission-item">
      {!isApprovedWithEvent && (
        <div className="submission-card__menu" ref={menuRef}>
          <button
            type="button"
            data-testid="submission-card-menu-trigger"
            className="submission-card__menu-trigger"
            aria-label="Действия с заявкой"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="submission-card__menu-popover">
              <button
                type="button"
                data-testid="submission-card-menu-details"
                className="submission-card__menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onShowDetails(submission);
                }}
              >
                Подробнее
              </button>
              {submission.status === 'pending' && (
                <button
                  type="button"
                  data-testid="submission-card-menu-cancel"
                  className="submission-card__menu-item submission-card__menu-item--danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onCancel(submission);
                  }}
                >
                  Отменить
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <div className="submission-status-badge">
        <span className={`status-badge ${getStatusClass(submission.status)}`}>
          {getStatusText(submission.status)}
        </span>
      </div>
      <div className="digest__header">
        <p className="digest__type">{submission.event_type?.join(', ')}</p>
        <h3 className="digest__title">{submission.title}</h3>
      </div>
      <div className="digest__mainInfo">
        <div className="digest__date-row">
          {submission.start_date && (
            <div className="digest__day">
              <img src={dateIcon} alt="icon" /> {formatDate(submission.start_date)}
            </div>
          )}
          {submission.start_time && (
            <div className="digest__time">
              <img src={timeIcon} alt="icon" /> {formatTime(submission.start_time)}
            </div>
          )}
        </div>
        {typeof submission.price === 'number' && (
          <div className="digest__price">
            <img src={priceIcon} alt="ruble icon" />
            {submission.price === 0 ? 'Бесплатно' : `${submission.price}`}
          </div>
        )}
        {submission.participation_type && submission.participation_type.length > 0 && (
          <div className="digest__partType">
            <img src={partTypeIcon} alt="person speaking icon" />
            {submission.participation_type.join(', ')}
          </div>
        )}
        <div className="digest__location">
          <img src={placeIcon} alt="icon" />
          {submission.city?.join(', ') || submission.address || 'Онлайн'}
        </div>
        {submission.event_url && (
          <div className="digest__eventUrl">
            <img src={webIcon} alt="site icon" className="icon" />
            <a href={submission.event_url} onClick={(e) => handleOpenLink(e, submission.event_url)} className="digest-link">
              Сайт мероприятия
            </a>
          </div>
        )}
      </div>
      {submission.tags && submission.tags.length > 0 && (
        <div className="digest__tags">
          {submission.tags.map((tag, i) => (
            <span key={i} className="digest__tag">#{tag}</span>
          ))}
        </div>
      )}

      {isApprovedWithEvent && (
        <Link to={`/events/${submission.published_event_id}`} state={{ token, userId }} className="digest__link">
          <button className="btn digest__knowMore">ПОДРОБНЕЕ</button>
        </Link>
      )}
    </div>
  );
}
