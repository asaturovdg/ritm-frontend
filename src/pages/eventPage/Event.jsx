import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import eventsData from "../../data/mock_events.json";
import currency from "../../assets/icons/currency.svg";
import date from "../../assets/icons/DateRange.svg";
import place from "../../assets/icons/Place.svg";
import time from "../../assets/icons/time.svg";
import './Event.css';

export default function Event() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      setToken(accessToken);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchUser = async () => {
      try {
        const response = await fetch('https://ritmevents.ru/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUserId(data.id);
        }
      } catch (error) {
        console.error('Ошибка получения userId:', error);
      }
    };
    fetchUser();
  }, [token]);

  useEffect(() => {
    try {
      const eve = eventsData.find(item => item.id === Number(id));
      setEvent(eve);
    } catch (error) {
      console.error("Ошибка при поиске события:", error);
    }
  }, [id]);

  const openLink = (url) => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const waitForCalendarConnection = async (provider, maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const response = await fetch(`https://ritmevents.ru/api/v1/users/${userId}/calendars`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const calendars = await response.json();
          const isConnected = calendars.some(cal => cal.provider === provider && cal.is_active === true);
          if (isConnected) {
            return true;
          }
        }
      } catch (error) {
        console.error('Ошибка проверки:', error);
      }
    }
    return false;
  };

  const checkCalendarConnected = async (provider) => {
    if (!token || !userId) return false;

    try {
      const response = await fetch(`https://ritmevents.ru/api/v1/users/${userId}/calendars`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const calendars = await response.json();
        return calendars.some(cal => cal.provider === provider && cal.is_active === true);
      }
      return false;
    } catch (error) {
      console.error('Ошибка проверки календаря:', error);
      return false;
    }
  };

  const connectCalendar = async (provider) => {
    const response = await fetch('https://ritmevents.ru/api/v1/calendars/connect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка подключения: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.oauth_url;
  };

  const addEventToCalendar = async (provider) => {
    const response = await fetch(`https://ritmevents.ru/api/v1/events/${event.id}/add-to-calendar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка добавления: ${response.status} ${errorText}`);
    }

    return await response.json();
  };

  const handleAddToCalendar = async (provider) => {
    if (!token) {
      const tg = window.Telegram?.WebApp;
      
      return;
    }

    if (!userId) {
      const tg = window.Telegram?.WebApp;
      
      return;
    }

    setIsProcessing(true);

    try {
      const isConnected = await checkCalendarConnected(provider);
      
      if (isConnected) {
        await addEventToCalendar(provider);
        const tg = window.Telegram?.WebApp;
        tg?.showAlert(`Событие добавлено в ${provider === 'google' ? 'Google' : 'Яндекс'} Календарь`);
        setAddToCalendar(false);
      } else {
        const oauthUrl = await connectCalendar(provider);
        openLink(oauthUrl);
        
        const tg = window.Telegram?.WebApp;
        
        
        const connected = await waitForCalendarConnection(provider);
        
        if (connected) {
          await addEventToCalendar(provider);
          tg?.showAlert(`Событие добавлено в ${provider === 'google' ? 'Google' : 'Яндекс'} Календарь`);
          setAddToCalendar(false);
        } else {
          tg?.showAlert('Не удалось подключить календарь. Попробуйте позже.');
        }
      }
      
    } catch (error) {
      console.error('Ошибка:', error);
      const tg = window.Telegram?.WebApp;
      tg?.showAlert(`Ошибка: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
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

  if (!event) {
    return <div className="event__not-found">Событие не найдено</div>;
  }

  return (
    <div className="event">
      <div className="event__header">
        <p className="event__type">{event.event_type?.join(', ')}</p>
        <h1 className="event__title">{event.title}</h1>
      </div>

      <div className="event__info">
        <div className="event__mainInfo">
          <div className="event__date">
            <div className="event__day">
              {event.start_date && (
                <div className="event__dates">
                  <img src={date} alt="date icon" />
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
                <img src={time} alt="time icon" />
                <time dateTime={event.start_time}>{event.start_time}</time>
                {event.end_time && (
                  <>
                    <span> - </span>
                    <time dateTime={event.end_time}>{event.end_time}</time>
                  </>
                )}
              </div>
            )}
          </div>

          {Number.isInteger(event.price) && (
            <div className="event__price">
              <img src={currency} alt="price icon" />
              {event.price === 0 ? "Бесплатно" : event.price}
            </div>
          )}

          <div className="event__location">
            <img src={place} alt="place icon" />
            <span className="location__text">
              <span className="event__city">{event.city?.join(', ')}</span>
              {event.address && <span className="event__address">, {event.address}</span>}
            </span>
          </div>

          <div className="event__tags">
            {event.tags.map((tag, index) => (
              <span key={index} className="event__tag">#{tag}</span>
            ))}
          </div>
        </div>

        <div className="event__extraInfo">
          <div className="event__tabs">
            {['description', 'speakers', 'organizers'].map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'description' ? 'Описание' : tab === 'speakers' ? 'Спикеры' : 'Организаторы'}
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
                {event.speakers.map((speaker, index) => {
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
                  {event.organizers.map((org, index) => (
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

      <div className="event__action" style={{ position: 'relative' }}>
        <a
          href={event.registration_url}
          className="event-register--btn"
          onClick={(e) => handleOpenLink(e, event.registration_url)}
        >
          Зарегистрироваться
        </a>

        {event.start_date && (
          <>
            <button
              onClick={() => setAddToCalendar(!addToCalendar)}
              className="event-addToCalendar--btn"
              disabled={isProcessing}
            >
              {isProcessing ? 'Обработка...' : 'Добавить в календарь'}
            </button>

            {addToCalendar && (
              <div className="calendar-dropdown">
                <button onClick={() => handleAddToCalendar('google')} disabled={isProcessing}>
                  Google Календарь
                </button>
                <button onClick={() => handleAddToCalendar('yandex')} disabled={isProcessing}>
                  Яндекс Календарь
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}