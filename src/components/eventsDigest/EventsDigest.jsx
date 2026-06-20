import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button, Placeholder } from '@telegram-apps/telegram-ui';
import './EventsDigest.css';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useUserFilters } from "../useUserFilters.jsx";
import { usePlatform } from "../../platform/usePlatform.js"

import { Calendar, Clock, RussianRuble, MapPin, Users, Globe } from "lucide-react";


const ITEMS_PER_PAGE = 20;

const formatTime = (t) => t ? t.substring(0, 5) : '';
const formatDate = (d) => d ? d.split('-').reverse().join('.') : '';

const isEventPassed = (eventDate, eventTime) => {
  if (!eventDate) return true; 
  
  const eventDateTime = new Date(eventDate);
  const now = new Date();
  
  if (eventTime && eventTime.trim() !== '') {
    let hours = 0, minutes = 0;
    if (eventTime.includes(':')) {
      const timeParts = eventTime.split(':');
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
    }
    eventDateTime.setHours(hours, minutes, 0, 0);
    return eventDateTime < now;
  }
  
  const eventDateOnly = new Date(eventDate);
  eventDateOnly.setHours(0, 0, 0, 0);
  
  const todayDateOnly = new Date();
  todayDateOnly.setHours(0, 0, 0, 0);
  
  return eventDateOnly < todayDateOnly;
};

const getWeekRange = (offset = 0) => {
  const today = new Date();
  
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + (offset * 7));
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  const formatDateStr = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  };
  
  const formatISO = (date) => date.toISOString().split('T')[0];
  
  return {
    start: formatDateStr(startDate),
    end: formatDateStr(endDate),
    startISO: formatISO(startDate),
    endISO: formatISO(endDate)
  };
};

export default function EventsDigest() {
  const {
    token,
    userId,
    isAuthReady,
    isCheckingAuth,
    showInputCode,
    setShowInputCode,
  } = useAuth();
  const { openLink, expandApp } = usePlatform();
  const { filters } = useUserFilters();

  const location = useLocation();
  const navigate = useNavigate();
  
  // Состояния для дайджеста
  const [currentWeekOffset, setCurrentWeekOffset] = useState(() => {
    if (location.state?.weekOffset !== undefined) return location.state.weekOffset;
    const saved = sessionStorage.getItem('events_week_offset');
    return saved ? parseInt(saved) : 0;
  });
  
  const [currentPage, setCurrentPage] = useState(() => {
    if (location.state?.page !== undefined) return location.state.page;
    const saved = sessionStorage.getItem('events_page');
    return saved ? parseInt(saved) : 0;
  });
  
  const [searchQuery, setSearchQuery] = useState(() => {
    if (location.state?.searchQuery !== undefined) return location.state.searchQuery;
    return sessionStorage.getItem('events_search_query') || '';
  });
  
  const [weekRange, setWeekRange] = useState({ start: '', end: '' });
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const searchIdRef = useRef(0);

  const hasFilters = filters.cities.length > 0 &&
                     filters.categories.length > 0 &&
                     filters.eventTypes.length > 0 &&
                     filters.participationTypes.length > 0;
  const isSearchMode = searchQuery.trim().length > 0;

  useEffect(() => {
    expandApp();
  }, [expandApp]);
  // Сохраняем состояние в sessionStorage
  useEffect(() => {
    sessionStorage.setItem('events_week_offset', currentWeekOffset);
    sessionStorage.setItem('events_page', currentPage);
    sessionStorage.setItem('events_search_query', searchQuery);
  }, [currentWeekOffset, currentPage, searchQuery]);

  const handleInvalidToken = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    setShowInputCode(true);
  }, [setShowInputCode]);

  // Основной fetch событий 
  const fetchEvents = useCallback(async (page = currentPage) => {
    if (!hasFilters || !isAuthReady || !token) {
      setEvents([]);
      setTotalEvents(0);
      setTotalPages(0);
      return;
    }

    setIsLoadingEvents(true);
    try {
      const { startISO, endISO } = getWeekRange(currentWeekOffset);
      const url = new URL('https://ritmevents.ru/api/v1/events');

      filters.cities.forEach(c => url.searchParams.append('city', c));
      filters.categories.forEach(c => url.searchParams.append('track', c));
      filters.eventTypes.forEach(t => url.searchParams.append('event_type', t));
      filters.participationTypes.forEach(t => url.searchParams.append('participation_type', t));
      url.searchParams.append('date_from', startISO);  
      url.searchParams.append('date_to', endISO);      
      url.searchParams.append('limit', ITEMS_PER_PAGE);
      url.searchParams.append('offset', page * ITEMS_PER_PAGE);

      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(url.toString(), { headers });

      if (res.ok) {
        const data = await res.json();
        const sortedAndFilteredEvents = (data.items || [])
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
          .filter((event) => !isEventPassed(event.start_date, event.start_time));
        
        setEvents(sortedAndFilteredEvents);
        setTotalEvents(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
      }
      else if (res.status === 401) {
        handleInvalidToken();
      } else {
        setEvents([]);
      }
    } catch (e) {
      console.error('Ошибка загрузки событий:', e);
      setEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [filters, token, hasFilters, isAuthReady, handleInvalidToken, currentPage, currentWeekOffset]);

  const fetchAndSetEventsByIds = useCallback(async (ids, page, searchId) => {
    if (!ids || ids.length === 0 || !token) {
      setEvents([]);
      setTotalEvents(0);
      setTotalPages(0);
      return;
    }
    const pageIds = ids.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

    setIsLoadingEvents(true);
    try {
      const url = new URL('https://ritmevents.ru/api/v1/events/by-ids');
      pageIds.forEach(id => url.searchParams.append('ids', id));
      const res = await fetch(url.toString(), {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (searchId !== undefined && searchId !== searchIdRef.current) return;

      if (res.ok) {
        const data = await res.json();
        const validEvents = (Array.isArray(data) ? data : []).filter(
          event => event && !isEventPassed(event.start_date, event.start_time)
        );
        setEvents(validEvents);
      } else {
        setEvents([]);
      }
    } catch (e) {
      console.error('Ошибка загрузки событий по ID:', e);
      setEvents([]);
    } finally {
      if (searchId === undefined || searchId === searchIdRef.current) setIsLoadingEvents(false);
    }
  }, [token]);

  // Переключение недель
  const nextWeek = () => {
    setCurrentWeekOffset(prev => prev + 1);
    setCurrentPage(0);
  };

  const prevWeek = () => {
    if (currentWeekOffset > 0) {
      setCurrentWeekOffset(prev => prev - 1);
      setCurrentPage(0);
    }
  };

  useEffect(() => {
    const range = getWeekRange(currentWeekOffset);
    setWeekRange({ start: range.start, end: range.end });
  }, [currentWeekOffset]);

  const runSearch = useCallback(async (query, page = 0, searchId) => {
    setEvents([]);
    setIsLoadingEvents(true);
    try {
      const { startISO, endISO } = getWeekRange(currentWeekOffset);

      const body = {
        query,
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
        date_from: startISO,
        date_to: endISO
      };

      const res = await fetch('https://ritmevents.ru/api/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(body)
      });

      // Discard stale responses (another search was started after this one)
      if (searchId !== searchIdRef.current) return;

      if (res.ok) {
        const data = await res.json();
        const ids = data.event_ids || [];

        setTotalEvents(ids.length);
        setTotalPages(Math.ceil(ids.length / ITEMS_PER_PAGE));

        if (ids.length > 0) {
          await fetchAndSetEventsByIds(ids, page, searchId);
        } else {
          setEvents([]);
        }
      } else {
        setEvents([]);
        setTotalEvents(0);
        setTotalPages(0);
      }
    } catch (e) {
      console.error('Ошибка в runSearch:', e);
      setEvents([]);
    } finally {
      if (searchId === searchIdRef.current) setIsLoadingEvents(false);
    }
  }, [token, fetchAndSetEventsByIds, currentWeekOffset]);

  useEffect(() => {
    if (!isAuthReady) return;

    if (searchQuery.trim()) {
      const tid = setTimeout(() => {
        searchIdRef.current += 1;
        runSearch(searchQuery.trim(), currentPage, searchIdRef.current);
      }, 300);
      return () => clearTimeout(tid);
    }

    if (hasFilters) {
      fetchEvents(currentPage);
    } else {
      setEvents([]);
      setTotalEvents(0);
      setTotalPages(0);
    }
  }, [
    isAuthReady,
    filters,
    currentPage,
    searchQuery,
    hasFilters,
    runSearch,
    fetchEvents,
    currentWeekOffset
  ]);
  
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setCurrentPage(0);
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = async () => {
    if (!code.trim()) return;
    setLoginError('');
    try {
      const res = await fetch('https://ritmevents.ru/api/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        setShowInputCode(false);
        window.location.reload();
      } else {
        setLoginError('Неверный или истёкший код. Попробуйте ещё раз.');
      }
    } catch {
      setLoginError('Ошибка соединения. Попробуйте позже.');
    }
  };

  const handleOpenLink = (e, url) => {
    e.preventDefault();
    openLink(url);
  };

  // Отображение загрузки
  if (isCheckingAuth) {
    return (
      <div className="events">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  // Отображение ввода кода (только в dev-режиме)
  if (showInputCode) {
    if (import.meta.env.VITE_DEV_MODE === 'false') return null;
    return (
      <div className="events">
        <div className="login-container">
          <h2>Вход</h2>
          <p>Получите код, написав <b>/login</b> боту <b>@ritmevents_bot</b>, и введите его ниже</p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Введите код"
            maxLength={6}
            className="login-input"
          />
          {loginError && <p className="login-error">{loginError}</p>}
          <Button mode="filled" stretched size="m" onClick={handleLogin}>
            Войти
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="events">
      <div className="filters-header-sticky">
        <div className="search-and-filters">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск мероприятий..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {(hasFilters || isSearchMode) && !isLoadingEvents && (
        <div className="week-nav-section">
          <div className="week-navigation">
            <button
              className="week-nav-btn prev"
              onClick={prevWeek}
              disabled={currentWeekOffset === 0}
            >
              Предыдущая неделя
            </button>
            <span className="week-range">
              {weekRange.start} – {weekRange.end}
            </span>
            <button
              className="week-nav-btn next"
              onClick={nextWeek}
            >
              Следующая неделя
            </button>
          </div>
          {events.length > 0 && (
            <p className="events__found-subtitle">
              Найдено {events.length} мероприятий
            </p>
          )}
        </div>
      )}

      <div className="digest-list">
        {!hasFilters && !isSearchMode ? (
          <Placeholder
            className="placeholder"
            header="Дайджест неактивен"
            description="Настрой предпочтения в профиле, чтобы увидеть события"
            action={
              <Button
                mode="filled"
                size="m"
                onClick={() => navigate('/profile', { state: { tab: 'myFilters' } })}
              >
                Настроить предпочтения
              </Button>
            }
          />
        ) : isLoadingEvents ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Загрузка мероприятий...</p>
          </div>
        ) : events.length > 0 ? (
          events.map(event => (
            <button
              key={event.id}
              type="button"
              className="digest__item"
              onClick={() => {
                fetch(`https://ritmevents.ru/api/v1/events/${event.id}/view`, {
                  method: 'POST',
                  headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ surface: isSearchMode ? 'search' : 'list' }),
                });
                navigate(`/events/${event.id}`, {
                  state: {
                    token,
                    userId,
                    weekOffset: currentWeekOffset,
                    page: currentPage,
                    searchQuery: searchQuery,
                  },
                });
              }}
            >
              <div className="digest__header">
                <p className="digest__type">
                  {event.event_type?.join(', ')}
                </p>
                <h3 className="digest__title">
                  {event.title}
                </h3>
              </div>
              <div className="digest__mainInfo">
                <div className="digest__date-row">
                  {event.start_date && (
                    <div className="digest__day">
                      <Calendar size={14} color="#1032A1" strokeWidth={1.5} /> {formatDate(event.start_date)}
                    </div>
                  )}
                  {event.start_time && (
                    <div className="digest__time">
                      <Clock size={14} color="#1032A1" strokeWidth={1.5} /> {formatTime(event.start_time)}
                    </div>
                  )}
                </div>
                {typeof event.price === 'number' && (
                  <div className="digest__price">
                    <RussianRuble size={14} color="#1032A1" strokeWidth={1.5} />
                    {event.price === 0 ? 'Бесплатно' : `${event.price}`}
                  </div>
                )}
                {event.participation_type && (
                  <div className="digest__partType">
                    <Users size={14} color="#1032A1" strokeWidth={1.5} />
                    {event.participation_type?.join(', ')}
                  </div>
                )}
                <div className="digest__location">
                  <MapPin size={14} color="#1032A1" strokeWidth={1.5} />
                  {event.city?.join(', ') || event.address || 'Онлайн'}
                </div>

                {event.event_url && (
                  <div className="digest__eventUrl">
                    <Globe size={14} color="#1032A1" strokeWidth={1.5} />
                    <a
                      href={event.event_url}
                      onClick={(e) => { e.stopPropagation(); handleOpenLink(e, event.event_url); }}
                      className="digest-link"
                    >
                      Сайт мероприятия
                    </a>
                  </div>
                )}
              </div>
              {event.track?.length > 0 && (
                <div className="digest__tracks">
                  {event.track.map((track, i) => (
                    <span key={i} className="digest__track">{track}</span>
                  ))}
                </div>
              )}
              {event.tags?.length > 0 && (
                <div className="digest__tags">
                  {event.tags.map((tag, i) => (
                    <span key={i} className="digest__tag">#{tag}</span>
                  ))}
                </div>
              )}
              <span className="digest__knowMore">ПОДРОБНЕЕ</span>
            </button>
          ))
        ) : (
          <Placeholder
            className="placeholder"
            header="Нет мероприятий"
            description="Попробуйте изменить поисковый запрос или фильтры"
          />
        )}
      </div>

      {!isLoadingEvents && events.length > 0 && totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            Назад
          </button>
          <span className="pagination-info">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
          >
            Далее
          </button>
        </div>
      )}
    </div>
  );
}