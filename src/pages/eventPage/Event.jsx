import { useParams, useLocation, useNavigate, Link, useSearchParams } from "react-router-dom";
import { Share2, Calendar, Clock, RussianRuble, MapPin, Users, Globe } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import blueCalendar from "../../assets/icons/calendarBlue.svg";
import yandex from "../../assets/icons/Yandex.svg"
import google from "../../assets/icons/Google.svg"

import './Event.css';
import { useAuth } from "../../components/AuthContext.jsx";
import { useCalendar } from "../../components/useCalendar.jsx";
import { usePlatform } from "../../platform/usePlatform.js";
import BookmarkButton from "../../components/BookmarkButton/BookmarkButton.jsx";
import NotInterestedButton from "../../components/NotInterestedButton/NotInterestedButton.jsx";
import { CALENDAR_ALLOWLIST, NOT_INTERESTED_ALLOWLIST, hasFeature } from "../../data/featureFlags.js";

export default function Event({ embeddedId, isPreview = false, status }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const id = embeddedId || paramId;
  const { token, isCheckingAuth, userId } = useAuth();
  const hasCalendar = hasFeature(CALENDAR_ALLOWLIST, userId);
  const hasNotInterested = hasFeature(NOT_INTERESTED_ALLOWLIST, userId);
  const { isProcessing, handleAddToCalendar, addEventToCalendar } = useCalendar();
  const { openLink, showAlert, shareEvent, platform } = usePlatform();

  const fromProfileEvents = location.state?.from === 'profile-events';

  const returnState = {
    weekOffset: location.state?.weekOffset,
    page: location.state?.page,
    searchQuery: location.state?.searchQuery,
  };

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const calCallbackRef = useRef(false);

  const PROVIDER_LABEL = { google: 'Google', yandex: 'Яндекс' };

  useEffect(() => {
    if (isCheckingAuth || calCallbackRef.current) return;
    const cal = searchParams.get('cal');
    const calerr = searchParams.get('calerr');
    if (!cal && !calerr) return;

    calCallbackRef.current = true;
    setSearchParams({}, { replace: true });

    if (cal) {
      addEventToCalendar(id, cal)
        .then(({ alreadyExists }) => showAlert(
          alreadyExists
            ? `Событие уже добавлено в ${PROVIDER_LABEL[cal] ?? cal} Календарь`
            : `Событие добавлено в ${PROVIDER_LABEL[cal] ?? cal} Календарь`
        ))
        .catch((e) => showAlert(`Ошибка: ${e.message}`));
    } else {
      showAlert('Не удалось подключить календарь. Попробуйте позже.');
    }
  }, [isCheckingAuth]);

  const handleBack = () => {
    const hasReturnState = returnState.weekOffset !== undefined || returnState.page !== undefined || returnState.searchQuery !== undefined;
    navigate('/', { state: hasReturnState ? returnState : undefined });
  };

  // Функция для форматирования строки времени
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  // Функция для получения статуса на русском
  const getStatusText = (statusValue) => {
    switch (statusValue) {
      case 'pending': return 'На модерации';
      case 'approved': return 'Одобрено';
      case 'rejected': return 'Отклонено';
      default: return statusValue;
    }
  };

  const getStatusClass = (statusValue) => {
    switch (statusValue) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  useEffect(() => {
    if (isCheckingAuth) return;

    const fetchEvent = async () => {
      if (!id) {
        setError('ID события не указан');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const eventId = Number(id);
        if (isNaN(eventId)) {
          setError('Некорректный ID события');
          setLoading(false);
          return;
        }

        const url = `https://ritmevents.ru/api/v1/events/${eventId}`;

        const response = await fetch(url, {
          headers: headers,
          method: 'GET'
        });

        if (response.ok) {
          const data = await response.json();
          setEvent(data);
          if (activeTab === 'speakers' && !data.speakers?.length) setActiveTab('description');
          if (activeTab === 'organizers' && !data.organizers?.length) setActiveTab('description');
        } else if (response.status === 403 || response.status === 401) {
          setError('Необходима авторизация для просмотра события');
        } else if (response.status === 404) {
          setError(`Событие с ID ${eventId} не найдено`);
        } else {
          const errorText = await response.text();
          console.error('API error:', errorText);
          setError(`Ошибка ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.error('Ошибка при запросе события:', error);
        setError(`Ошибка соединения: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, token, isCheckingAuth]);

  const onAddToCalendar = (provider) => {
    handleAddToCalendar(event.id, provider, {
      onSuccess: (label, alreadyExists) => {
        showAlert(alreadyExists
          ? `Событие уже добавлено в ${label} Календарь`
          : `Событие добавлено в ${label} Календарь`
        );
        setAddToCalendar(false);
      },
      onError: (msg) => showAlert(`Ошибка: ${msg}`)
    });
  };

  const parseSpeakerName = (speaker) => {
    const fullName = speaker.name || '';
    const hasDash = fullName.includes('-');
    if (hasDash) {
      const [name, description] = fullName.split('-');
      return { name: name.trim(), description: description.trim() };
    }
    return { name: fullName, description: null };
  };

  const handleOpenLink = (e, url) => {
    e.preventDefault();
    openLink(url);
  };

  if (loading) {
    return (
      <div className={`event ${isPreview ? 'event-preview' : ''}`}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка события...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`event ${isPreview ? 'event-preview' : ''}`}>
        <div className="event__not-found">
          <p>{error}</p>
          <button onClick={handleBack} className="back-to-digest-btn">
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`event ${isPreview ? 'event-preview' : ''}`}>
        <div className="event__not-found">
          Событие не найдено
          <button onClick={handleBack} className="back-to-digest-btn">
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`event ${isPreview ? 'event-preview' : ''}`}>
      {(platform === 'max' || platform === 'telegram') && !isPreview && (
        <button onClick={handleBack} className="event-back-btn">
          ← Назад
        </button>
      )}

      {/* Блок статуса для режима предпросмотра (заявки) */}
      {isPreview && status && (
        <div className="event-status-banner">
          <span className={`status-badge ${getStatusClass(status)}`}>
            {getStatusText(status)}
          </span>
        </div>
      )}

      <div className="event__header">
        <div className="event__header-text">
          <p className="event__type">
            {event?.event_type?.join(', ')}
          </p>
          <h1 className="event__title">
            {event?.title}
          </h1>
        </div>
        {!isPreview && platform !== 'web' && (
          <button
            className="event__share-btn"
            onClick={() => shareEvent(event.id, event.title, event.event_type)}
            aria-label="Поделиться"
          >
            <Share2 size={20} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <div className="event__info">
        <div className="event__mainInfo">
          <div className="event__date">
            <div className="event__day">
              {event.start_date && (
                <div className="event__dates">
                  <Calendar size={16} color="#1032A1" strokeWidth={1.5} />
                  <time dateTime={event.start_date}>
                    {event.start_date.split('-').reverse().join('.')}
                  </time>
                  {event.end_date && event.end_date !== event.start_date && (
                    <>
                      <span> - </span>
                      <time dateTime={event.end_date}>
                        {event.end_date.split('-').reverse().join('.')}
                      </time>
                    </>
                  )}
                </div>
              )}
            </div>

            {event.start_time && (
              <div className="event__time">
                <Clock size={16} color="#1032A1" strokeWidth={1.5} />
                <time dateTime={event.start_time}>{formatTime(event.start_time)}</time>
                {event.end_time && (
                  <>
                    <span> - </span>
                    <time dateTime={event.end_time}>{formatTime(event.end_time)}</time>
                  </>
                )}
              </div>
            )}
          </div>

          {typeof event.price === 'number' && (
            <div className="event__price">
              <RussianRuble size={16} color="#1032A1" strokeWidth={1.5} />
              {event.price === 0 ? "Бесплатно" : `${event.price}`}
            </div>
          )}

          {event.participation_type && (
            <div className="event__partType">
              <Users size={16} color="#1032A1" strokeWidth={1.5} />
              {event.participation_type?.join(', ')}
            </div>
          )}

          <div className="event__location">
            <MapPin size={16} color="#1032A1" strokeWidth={1.5} />
            <span className="location__text">
              <span className="event__city">{event.city?.join(', ')}</span>
              {event.address && <span className="event__address">, {event.address}</span>}
            </span>
          </div>

          {event.event_url && (
            <div className="event__eventUrl">
              <Globe size={16} color="#1032A1" strokeWidth={1.5} />
              <a
                href={event.event_url}
                onClick={(e) => handleOpenLink(e, event.event_url)}
                className="event-link"
              >
                Сайт мероприятия
              </a>
            </div>
          )}

          {event.track?.length > 0 && (
            <div className="event__tracks">
              {event.track.map((track, i) => (
                <span key={i} className="event__track">{track}</span>
              ))}
            </div>
          )}
          <div className="event__tags">
            {event.tags?.map((tag, index) => (
              <span key={index} className="event__tag">#{tag}</span>
            ))}
          </div>
        </div>

        {(event.registration_url || (!isPreview && !fromProfileEvents && event.start_date)) && (
          <div className="event__cta" style={{ position: 'relative' }}>
            {!isPreview && !fromProfileEvents && hasCalendar && (
              <BookmarkButton event={event} />
            )}
            {!isPreview && !fromProfileEvents && hasNotInterested && (
              <NotInterestedButton event={event} source="list" />
            )}
            {event.registration_url && (
              <a
                href={event.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  if (event.registration_url) {
                    handleOpenLink(e, event.registration_url);
                  }
                }}
                className="event-register--btn"
              >
                Регистрация
              </a>
            )}

            {!isPreview && !fromProfileEvents && event.start_date && !hasCalendar && (
              <div className="calendar-wrapper" style={{ paddingBottom: addToCalendar ? '110px' : '0' }}>
                <button
                  onClick={() => setAddToCalendar(!addToCalendar)}
                  className="event-addToCalendar--btn"
                  disabled={isProcessing}
                >
                  <img src={blueCalendar} alt='blue calendar icon' className="icon" />
                  {isProcessing ? 'Обработка...' : 'В календарь'}
                </button>

                {addToCalendar && (
                  <div className="calendar-dropdown">
                    <button onClick={() => onAddToCalendar('google')} disabled={isProcessing} className="calendar--btn">
                      <img src={google} alt='google icon'/>
                      Google Календарь
                    </button>
                    <button onClick={() => onAddToCalendar('yandex')} disabled={isProcessing} className="calendar--btn">
                      <img src={yandex} alt='yandex icon'/>
                      Яндекс Календарь
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="event__extraInfo">
          <div className="event__tabs">
            {[
              { key: 'description', label: 'Описание', show: true },
              { key: 'speakers', label: 'Спикеры', show: event.speakers?.length > 0 },
              { key: 'organizers', label: 'Организаторы', show: event.organizers?.length > 0 },
            ].filter(tab => tab.show).map((tab) => (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab__content">
            {activeTab === 'description' && (
              <div className="event__description-tab">
                <p className="description-text">{event.description}</p>
              </div>
            )}

            {activeTab === 'speakers' && (
              <div className="event__speakers-tab">
                {event.speakers?.map((speaker, index) => {
                  const { name, description } = parseSpeakerName(speaker);
                  return (
                    <div key={index}>
                      <span className="speaker__name">{name}</span>
                      {description && (
                        <>
                          <span> - </span>
                          <span className="speaker__desc">{description}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'organizers' && (
              <div className="event__organizers">
                <div className="organizers-list">
                  {event.organizers?.map((org, index) => (
                    org.url ? (
                      <a key={index} href={org.url} className="organizer-chip" onClick={(e) => handleOpenLink(e, org.url)}>
                        {org.name}
                      </a>
                    ) : (
                      <span key={index} className="organizer-chip organizer-chip--no-link">
                        {org.name}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}