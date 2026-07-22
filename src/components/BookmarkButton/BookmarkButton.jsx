import { useState } from 'react';
import { useSavedEvents } from '../SavedEventsContext.jsx';
import { useCalendar } from '../useCalendar.jsx';
import { useCalendarPromptPreference } from '../useCalendarPromptPreference.jsx';
import { useToast } from '../Toast/ToastContext.jsx';
import google from '../../assets/icons/Google.svg';
import yandex from '../../assets/icons/Yandex.svg';
import './BookmarkButton.css';

export default function BookmarkButton({ event, className = '' }) {
  const { isSaved, isPending, saveEvent, unsaveEvent } = useSavedEvents();
  const { handleAddToCalendar, isProcessing } = useCalendar();
  const showToast = useToast();
  const { skipPrompt, setSkipPrompt } = useCalendarPromptPreference();
  const [showExternalPrompt, setShowExternalPrompt] = useState(false);

  const eventId = event?.id;
  const saved = isSaved(eventId);
  const pending = isPending(eventId);

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (saved) {
      unsaveEvent(eventId);
      setShowExternalPrompt(false);
    } else {
      saveEvent(event);
      if (event?.start_date && !skipPrompt) {
        setShowExternalPrompt(true);
      }
    }
  };

  const handleAddExternal = async (e, provider) => {
    e.stopPropagation();
    setShowExternalPrompt(false);
    await handleAddToCalendar(eventId, provider, {
      onSuccess: (label, alreadyExists) =>
        showToast(alreadyExists
          ? `Уже добавлено в ${label} Календарь`
          : `Добавлено в ${label} Календарь`),
      onError: (msg) => showToast(`Ошибка: ${msg}`),
    });
  };

  const handleSkip = (e) => {
    e.stopPropagation();
    setShowExternalPrompt(false);
  };

  const handleRemember = (e) => {
    e.stopPropagation();
    setShowExternalPrompt(false);
    setSkipPrompt(true);
    showToast('Ты можешь изменить эту настройку в профиле');
  };

  return (
    <div className={`bookmark-wrapper ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        className={`save-calendar-btn ${saved ? 'save-calendar-btn--saved' : ''}`}
        onClick={handleClick}
        disabled={pending}
      >
        {saved ? '✓ В календаре' : '+ В календарь'}
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
            <button className="external-prompt__remember" onClick={handleRemember}>
              Нет, запомнить мой выбор
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
