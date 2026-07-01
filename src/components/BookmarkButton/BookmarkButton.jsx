import { useState } from 'react';
import { useSavedEvents } from '../SavedEventsContext.jsx';
import { useCalendar } from '../useCalendar.jsx';
import { usePlatform } from '../../platform/usePlatform.js';
import google from '../../assets/icons/Google.svg';
import yandex from '../../assets/icons/Yandex.svg';
import './BookmarkButton.css';

export default function BookmarkButton({ event, className = '' }) {
  const { isSaved, saveEvent, unsaveEvent } = useSavedEvents();
  const { handleAddToCalendar, isProcessing } = useCalendar();
  const { showAlert } = usePlatform();
  const [showExternalPrompt, setShowExternalPrompt] = useState(false);

  const eventId = event?.id;
  const saved = isSaved(eventId);

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (saved) {
      unsaveEvent(eventId);
      setShowExternalPrompt(false);
    } else {
      saveEvent(event);
      if (event?.start_date) {
        setShowExternalPrompt(true);
      }
    }
  };

  const handleAddExternal = async (e, provider) => {
    e.stopPropagation();
    setShowExternalPrompt(false);
    await handleAddToCalendar(eventId, provider, {
      onSuccess: (label, alreadyExists) =>
        showAlert(alreadyExists
          ? `Уже добавлено в ${label} Календарь`
          : `Добавлено в ${label} Календарь`),
      onError: (msg) => showAlert(`Ошибка: ${msg}`),
    });
  };

  const handleSkip = (e) => {
    e.stopPropagation();
    setShowExternalPrompt(false);
  };

  return (
    <div className={`bookmark-wrapper ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        className={`save-calendar-btn ${saved ? 'save-calendar-btn--saved' : ''}`}
        onClick={handleClick}
      >
        {saved ? '✓ В моём календаре' : '+ В мой календарь'}
      </button>

      {showExternalPrompt && (
        <div className="external-prompt">
          <p className="external-prompt__label">Добавить также во внешний?</p>
          <div className="external-prompt__actions">
            <button
              className="external-prompt__btn"
              onClick={(e) => handleAddExternal(e, 'google')}
              disabled={isProcessing}
            >
              <img src={google} alt="Google" className="external-prompt__icon" />
              Google
            </button>
            <button
              className="external-prompt__btn"
              onClick={(e) => handleAddExternal(e, 'yandex')}
              disabled={isProcessing}
            >
              <img src={yandex} alt="Яндекс" className="external-prompt__icon" />
              Яндекс
            </button>
            <button className="external-prompt__skip" onClick={handleSkip}>
              Нет
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
