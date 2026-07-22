import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button, Placeholder } from '@telegram-apps/telegram-ui';
import './EventsDigest.css';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useUserFilters } from "../useUserFilters.jsx";
import { usePlatform } from "../../platform/usePlatform.js"
import TelegramLoginWidget from '../TelegramLoginWidget/TelegramLoginWidget.jsx';
import BookmarkButton from '../BookmarkButton/BookmarkButton.jsx';
import NotInterestedButton from '../NotInterestedButton/NotInterestedButton.jsx';
import { useNotInterested } from '../NotInterestedContext.jsx';
import { CALENDAR_ALLOWLIST, NOT_INTERESTED_ALLOWLIST, hasFeature } from '../../data/featureFlags.js';

import { Calendar, Clock, RussianRuble, MapPin, Users, Globe, ChevronLeft, ChevronRight, ChevronsLeft, Star } from "lucide-react";


const ITEMS_PER_PAGE = 20;

const formatTime = (t) => t ? t.substring(0, 5) : '';
const formatDate = (d) => d ? d.split('-').reverse().join('.') : '';

const pluralEvents = (n) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'событий';
  if (mod10 === 1) return 'событие';
  if (mod10 >= 2 && mod10 <= 4) return 'события';
  return 'событий';
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
    setToken,
    setIsAuthReady,
    refreshUserData,
  } = useAuth();
  const { openLink, expandApp } = usePlatform();
  const { filters } = useUserFilters();
  const hasCalendar = hasFeature(CALENDAR_ALLOWLIST, userId);
  const hasNotInterested = hasFeature(NOT_INTERESTED_ALLOWLIST, userId);
  const { isNotInterested } = useNotInterested();

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

  const [sortByImportance, setSortByImportance] = useState(() => {
    return sessionStorage.getItem('events_sort_importance') === 'true';
  });

  const [weekRange, setWeekRange] = useState({ start: '', end: '' });
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [widgetReady, setWidgetReady] = useState(false);
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
    sessionStorage.setItem('events_sort_importance', sortByImportance);
  }, [currentWeekOffset, currentPage, searchQuery, sortByImportance]);

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
      const todayISO = new Date().toISOString().split('T')[0];
      const dateFrom = currentWeekOffset === 0 && todayISO > startISO ? todayISO : startISO;
      const url = new URL('https://ritmevents.ru/api/v1/events');

      filters.cities.forEach(c => url.searchParams.append('city', c));
      filters.categories.forEach(c => url.searchParams.append('track', c));
      filters.eventTypes.forEach(t => url.searchParams.append('event_type', t));
      filters.participationTypes.forEach(t => url.searchParams.append('participation_type', t));
      url.searchParams.append('date_from', dateFrom);
      url.searchParams.append('date_to', endISO);
      url.searchParams.append('limit', ITEMS_PER_PAGE);
      url.searchParams.append('offset', page * ITEMS_PER_PAGE);
      url.searchParams.append('sort', sortByImportance ? 'importance' : 'date');

      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(url.toString(), { headers });

      if (res.ok) {
        const data = await res.json();
        setEvents(data.items || []);
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
  }, [filters, token, hasFilters, isAuthReady, handleInvalidToken, currentPage, currentWeekOffset, sortByImportance]);

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
        setEvents(Array.isArray(data) ? data : []);
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

  const goToFirstWeek = () => {
    setCurrentWeekOffset(0);
    setCurrentPage(0);
  };

  const toggleSortByImportance = () => {
    setSortByImportance(prev => !prev);
    setCurrentPage(0);
  };

  useEffect(() => {
    const range = getWeekRange(currentWeekOffset);
    setWeekRange({ start: range.start, end: range.end });
  }, [currentWeekOffset]);

  useEffect(() => {
    if (!events?.length) return;
    fetch('https://ritmevents.ru/api/v1/events/impressions', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_ids: events.map(e => e.id), source: isSearchMode ? 'search' : 'list' }),
    });
  }, [events, isSearchMode, token]);

  const runSearch = useCallback(async (query, page = 0, searchId) => {
    setEvents([]);
    setIsLoadingEvents(true);
    try {
      const { startISO, endISO } = getWeekRange(currentWeekOffset);
      const todayISO = new Date().toISOString().split('T')[0];
      const dateFrom = currentWeekOffset === 0 && todayISO > startISO ? todayISO : startISO;

      const body = {
        query,
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
        date_from: dateFrom,
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
    const isDevMode = import.meta.env.VITE_DEV_MODE !== 'false';
    return (
      <div className="events">
        <div className="login-container">
          <h2>Вход</h2>

          <TelegramLoginWidget
            onSuccess={({ access_token, refresh_token }) => {
              localStorage.setItem('access_token', access_token);
              localStorage.setItem('refresh_token', refresh_token);
              setToken(access_token);
              refreshUserData().then((user) => {
                if (user) {
                  setIsAuthReady(true);
                  setShowInputCode(false);
                }
              });
            }}
            onError={(msg) => setLoginError(msg)}
            onStatusChange={(s) => setWidgetReady(s === 'ready')}
          />

          {isDevMode && widgetReady && <p className="login-divider">— или —</p>}

          {isDevMode && (
            <>
              <p>Получите код, написав <b>/login</b> боту <b>@ritmevents_bot</b>, и введите его ниже</p>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Введите код"
                maxLength={6}
                className="login-input"
              />
              <Button mode="filled" stretched size="m" onClick={handleLogin}>
                Войти
              </Button>
            </>
          )}

          {loginError && <p className="login-error">{loginError}</p>}
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

      {hasFilters && !isSearchMode && (
        <label className="sort-importance-row">
          <span className="sort-importance-row__label">
            <Star size={14} />
            Сначала важные
          </span>
          <span
            className={`sort-importance-switch${sortByImportance ? ' is-on' : ''}`}
            role="switch"
            aria-checked={sortByImportance}
          >
            <input
              type="checkbox"
              checked={sortByImportance}
              onChange={toggleSortByImportance}
            />
          </span>
        </label>
      )}

      {(hasFilters || isSearchMode) && !isLoadingEvents && (
        <div className="week-nav-section">
          <div className="week-navigation">
            {currentWeekOffset >= 2 && (
              <button
                className="week-nav-btn"
                onClick={goToFirstWeek}
                title="К текущей неделе"
              >
                <ChevronsLeft size={16} />
              </button>
            )}
            <button
              className="week-nav-btn"
              onClick={prevWeek}
              disabled={currentWeekOffset === 0}
              title="Предыдущая неделя"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="week-range">
              {weekRange.start} – {weekRange.end}
            </span>
            <button
              className="week-nav-btn"
              onClick={nextWeek}
              title="Следующая неделя"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {totalEvents > 0 && (
            <p className="events__found-subtitle">
              {totalEvents} {pluralEvents(totalEvents)} по твоим фильтрам
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
          events.filter(event => !isNotInterested(event.id)).map(event => (
            <div
              key={event.id}
              role="button"
              tabIndex={0}
              className="digest__item"
              onClick={() => {
                fetch(`https://ritmevents.ru/api/v1/events/${event.id}/view`, {
                  method: 'POST',
                  headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ source: isSearchMode ? 'search' : 'list' }),
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
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); }}
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
              <div className="digest__bottom-row">
                <span className="digest__knowMore">Подробнее</span>
                {hasCalendar && <BookmarkButton event={event} />}
                {hasNotInterested && (
                  <NotInterestedButton event={event} source={isSearchMode ? 'search' : 'list'} />
                )}
              </div>
            </div>
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