
import { useState, useEffect } from "react";
import './Profile.css';

export function Profile() {
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [assistants, setAssistants] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  
  // Состояния загрузки для каждого типа данных
  const [loadingExtra, setLoadingExtra] = useState({
    assistants: true,
    submissions: true,
    calendarEvents: true,
    calendars: true
  });

  // токен из localStorage
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      setToken(accessToken);
      console.log('Токен загружен');
    } else {
      setIsLoading(false);
      setError('Не найден токен авторизации');
    }
  }, []);

  // базовые данные пользователя
  useEffect(() => {
    if (!token) return;

    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        
        
        const response = await fetch('https://ritmevents.ru/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          setUserData(data);
      
          const userId = data.id;
         
       
          await fetchAllExtraData(userId);
          
        }
      } catch (err) {
        console.error('Ошибка при запросе:', err);
        setError('Не удалось подключиться к серверу');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [token]);

  const fetchAllExtraData = async (userId) => {
    console.log('дополнительные данные для userId:', userId);
    
    const fetchWithErrorHandling = async (url, dataType, setState, setLoadingState) => {
      try {
        setLoadingState(prev => ({ ...prev, [dataType]: true }));
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setState(data);
          
        } 
      } catch (err) {
        console.error(`Ошибка при загрузке ${dataType}:`, err);
        setState([]);
      } finally {
        setLoadingState(prev => ({ ...prev, [dataType]: false }));
      }
    };

    
    await Promise.all([
      fetchWithErrorHandling(
        `https://ritmevents.ru/api/v1/users/${userId}/assistants`,
        'assistants',
        setAssistants,
        setLoadingExtra
      ),
      fetchWithErrorHandling(
        `https://ritmevents.ru/api/v1/users/${userId}/submissions`,
        'submissions',
        setSubmissions,
        setLoadingExtra
      ),
      fetchWithErrorHandling(
        `https://ritmevents.ru/api/v1/users/${userId}/calendar-events`,
        'calendarEvents',
        setCalendarEvents,
        setLoadingExtra
      ),
      fetchWithErrorHandling(
        `https://ritmevents.ru/api/v1/users/${userId}/calendars`,
        'calendars',
        setCalendars,
        setLoadingExtra
      )
    ]);
    
  };

  
  const parseStringToList = (str) => {
    // if (!str || typeof str !== 'string') return [];
    if (!str || typeof str !== 'string') return [];
    if (str === 'string') return [];
    return str.split(',').map(item => item.trim()).filter(item => item);
  };

  
  const isExtraLoading = () => {
    return Object.values(loadingExtra).some(loading => loading === true);
  };

  
  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="spinner"></div>
          <p>Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  
if (error) {
    return (
      <div className="profile-container">
        <div className="profile-error">
         
          <button 
            onClick={() => window.location.reload()} 
            className="profile-retry-btn"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

 
  if (!userData) {
    return (
      <div className="profile-container">
        <div className="profile-empty">
          
          <p>Перейдите на вкладку «Мероприятия»</p>
        </div>
      </div>
    );
  }

 
  return (
    <div className="profile-container">
      
      <div className="profile-header">
        {/* <div className="profile-avatar">
          {window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url ? (
            <img 
              src={window.Telegram.WebApp.initDataUnsafe.user.photo_url} 
              alt="avatar"
              className="profile-avatar-img"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {userData.username?.[0]?.toUpperCase() || '👤'}
            </div>
          )}
        </div> */}
        
        {/* <div className="profile-info">
          <h2 className="profile-name">
            {userData.username || 'Пользователь'}
          </h2>
          <p className="profile-id">ID: {userData.id}</p>
          <p className="profile-status">
            
          </p>
        </div> */}
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">Мои фильтры</h3>
        
        <div className="profile-field">
          <span className="profile-field-label">Города:</span>
          <div className="profile-tags">
            {parseStringToList(userData.city).map((city, idx) => (
              <span key={idx} className="profile-tag profile-tag-city">
                {city}
              </span>
            ))}
            {!userData.city && <span className="profile-empty-value">Не выбрано</span>}
          </div>
        </div>

        <div className="profile-field">
          <span className="profile-field-label">Категории:</span>
          <div className="profile-tags">
            {parseStringToList(userData.track).map((track, idx) => (
              <span key={idx} className="profile-tag profile-tag-track">
                {track}
              </span>
            ))}
            {!userData.track && <span className="profile-empty-value">Не выбрано</span>}
          </div>
        </div>

        <div className="profile-field">
          <span className="profile-field-label">Типы мероприятий:</span>
          <div className="profile-tags">
            {parseStringToList(userData.preferred_event_types).map((type, idx) => (
              <span key={idx} className="profile-tag profile-tag-event">
                {type}
              </span>
            ))}
            {!userData.preferred_event_types && <span className="profile-empty-value">Не выбрано</span>}
          </div>
        </div>

        <div className="profile-field">
          <span className="profile-field-label">Формат участия:</span>
          <div className="profile-tags">
            {parseStringToList(userData.preferred_participation_types).map((type, idx) => (
              <span key={idx} className="profile-tag profile-tag-participation">
                {type}
              </span>
            ))}
            {!userData.preferred_participation_types && <span className="profile-empty-value">Не выбрано</span>}
          </div>
        </div>
      </div>

     
      <div className="profile-section">
        <h3 className="profile-section-title">Подключенные календари</h3>
        
        {loadingExtra.calendars ? (
          <div className="profile-loading-small">
            <div className="spinner-small"></div>
            <p>Загрузка...</p>
          </div>
        ) : calendars.length > 0 ? (
          <div className="profile-calendars-list">
            {calendars.map((calendar, idx) => (
              <div key={idx} className="profile-calendar-item">
                <span className="calendar-provider">{calendar.provider }</span>
                
              </div>
            ))}
          </div>
        ) : (
          <p className="profile-empty-value">Нет подключенных календарей</p>
        )}
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">События в календаре</h3>
        
        {loadingExtra.calendarEvents ? (
          <div className="profile-loading-small">
            <div className="spinner-small"></div>
            <p>Загрузка...</p>
          </div>
        ) : calendarEvents.length > 0 ? (
          <div className="profile-events-list">
            {calendarEvents.slice(0, 5).map((event, idx) => (
              <div key={idx} className="profile-event-item">
                <span className="event-name">{event.name || event.title }</span>
                <span className="event-date">
                  {event.date && new Date(event.date).toLocaleDateString('ru-RU')}
                </span>
              </div>
            ))}
            {/* {calendarEvents.length > 5 && (
              <p className="profile-more">+ еще {calendarEvents.length - 5} событий</p>
            )} */}
          </div>
        ) : (
          <p className="profile-empty-value">Нет событий в календаре</p>
        )}
      </div>

   
      {/* <div className="profile-section">
        <h3 className="profile-section-title"> Мои заявки</h3>
        
        {loadingExtra.submissions ? (
          <div className="profile-loading-small">
            <div className="spinner-small"></div>
            <p>Загрузка...</p>
          </div>
        ) : submissions.length > 0 ? (
          <div className="profile-submissions-list">
            {submissions.map((submission, idx) => (
              <div key={idx} className="profile-submission-item">
                <span className="submission-name">{submission.event_name || submission.title || 'Мероприятие'}</span>
                <span className={`submission-status status-${submission.status}`}>
                  {submission.status === 'pending' ? ' На рассмотрении' : 
                   submission.status === 'approved' ? ' Одобрено' : 
                   submission.status === 'rejected' ? ' Отклонено' : submission.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="profile-empty-value">Нет активных заявок</p>
        )}
      </div> */}

      {/* СЕКЦИЯ 5: ПОМОЩНИКИ/АССИСТЕНТЫ */}
      <div className="profile-section">
        <h3 className="profile-section-title">Помощники</h3>
        
        {loadingExtra.assistants ? (
          <div className="profile-loading-small">
            <div className="spinner-small"></div>
            <p>Загрузка...</p>
          </div>
        ) : assistants.length > 0 ? (
          <div className="profile-assistants-list">
            {assistants.map((assistant, idx) => (
              <div key={idx} className="profile-assistant-item">
                <span className="assistant-name">{assistant.name || assistant.username }</span>
                <span className="assistant-role">{assistant.role }</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="profile-empty-value">Нет добавленных помощников</p>
        )}
      </div>

      
    </div>
  );
}