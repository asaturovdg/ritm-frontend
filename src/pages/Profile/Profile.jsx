import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import './Profile.css';
import { useAuth } from "../../components/AuthContext.jsx";
import { useCalendar } from "../../components/useCalendar.jsx";
import { usePlatform } from "../../platform/usePlatform.js";
import { useUserFilters } from "../../components/useUserFilters.jsx";
import { useSavedEvents } from "../../components/SavedEventsContext.jsx";
import { useCalendarPromptPreference } from "../../components/useCalendarPromptPreference.jsx";
import { CITIES, CATEGORIES, EVENT_TYPES, PARTICIPATION_TYPES } from "../../data/filters.js";
import { CALENDAR_ALLOWLIST, hasFeature } from "../../data/featureFlags.js";
import { Calendar, Clock, RussianRuble, MapPin, Users } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useSwipeNavigation } from "../../hooks/useSwipeNavigation.js";
import { useAppTabs } from "../../hooks/useAppTabs.js";
import { ProfileUserBadge } from "./ProfileUserBadge.jsx";

import dateIcon from "../../assets/icons/DateRange.svg";
import timeIcon from "../../assets/icons/time.svg";
import priceIcon from "../../assets/icons/currency.svg";
import placeIcon from "../../assets/icons/Place.svg";
import partType from "../../assets/icons/partType.svg"

export function Profile() {
  const { token, userData, isCheckingAuth, userId } = useAuth();
  const { connectCalendar, waitForCalendarConnection } = useCalendar();
  const { openLink } = usePlatform();
  const { filters, setFilters, saveFilters, flushPendingSave, isSaving } = useUserFilters();
  const { savedEvents, loading: savedLoading, unsaveEvent } = useSavedEvents();
  const { skipPrompt, setSkipPrompt, isPending: isCalendarPromptPending } = useCalendarPromptPreference();
  const hasCalendar = hasFeature(CALENDAR_ALLOWLIST, userId);
  const navigate = useNavigate();
  const tabs = ['myFilters', ...(hasCalendar ? ['myEvents'] : []), 'myCalendars'];
  const prefersReducedMotion = useReducedMotion();
  const { TAB_PATHS } = useAppTabs();

  // Только нужные состояния для помощников
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [showFilterSuccessModal, setShowFilterSuccessModal] = useState(false);
  const [showPeriodSuccessModal, setShowPeriodSuccessModal] = useState(false);
const [showCopySuccessModal, setShowCopySuccessModal] = useState(false);
const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  // Остальные состояния
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('myFilters');
  const [subtabDirection, setSubtabDirection] = useState(1);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [calendarPendingProvider, setCalendarPendingProvider] = useState(null);
  const [error, setError] = useState(null);
  const [digestPeriod, setDigestPeriod] = useState('daily');
  const [digestDay, setDigestDay] = useState(null);
  const [weeklyDayError, setWeeklyDayError] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [customCityOptions, setCustomCityOptions] = useState(() => {
    try {
      const stored = localStorage.getItem('user_custom_cities');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const location = useLocation();

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state?.tab]);

  // Sync: if server returned custom cities not in localStorage, add them
  useEffect(() => {
    const serverCustom = filters.cities.filter(c => !CITIES.includes(c));
    if (serverCustom.length === 0) return;
    setCustomCityOptions(prev => {
      const merged = [...new Set([...prev, ...serverCustom])];
      if (merged.length === prev.length) return prev;
      localStorage.setItem('user_custom_cities', JSON.stringify(merged));
      return merged;
    });
  }, [filters.cities]);

  const [assistants, setAssistants] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]); 
  
  const availableCalendars = [
    { id: 'google', name: 'Google Календарь' },
    { id: 'yandex', name: 'Яндекс Календарь' }
  ];
  
  const [loadingExtra, setLoadingExtra] = useState({
    assistants: true,
    submissions: true,
    calendars: true,
    calendarEvents: true
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return dateString.split('-').reverse().join('.');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const isUpcomingEvent = (eventDate) => {
    if (!eventDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDateObj = new Date(eventDate);
    eventDateObj.setHours(0, 0, 0, 0);
    return eventDateObj >= today;
  };

  const calendarRootUrl = {
    google: 'https://calendar.google.com/',
    yandex: 'https://calendar.yandex.ru/'
  };

  const getCalendarOpenUrl = (provider, date) => {
    if (provider === 'google') {
      const [y, m, d] = date.split('-');
      return `https://calendar.google.com/calendar/r/day/${y}/${m}/${d}`;
    }
    return `https://calendar.yandex.ru/?date=${date}`;
  };

  // функция для подключения календарей
  const handleConnectCalendar = async (provider) => {
    if (!token) {
      setError('Необходима авторизация');
      return;
    }

    setCalendarPendingProvider(provider);
    setError(null);

    try {
      const oauthUrl = await connectCalendar(provider);
      openLink(oauthUrl);
      const connected = await waitForCalendarConnection(provider);
      if (connected && userData) {
        await fetchAllExtraData(userData.id);
      }
    } catch (err) {
      console.error('Ошибка:', err);
      setError(err.message);
    } finally {
      setCalendarPendingProvider(null);
    }
  };

const applyFilters = async () => {
  if (!token || !userData) return;
  await saveFilters(filters);
  window.scrollTo(0, 0);
  navigate('/');
};

  useEffect(() => {
    if (!userData) return;
    setDigestPeriod(userData.digest_period ?? 'daily');
    setDigestDay(userData.digest_day_of_week ?? null);
    fetchAllExtraData(userData.id);
  }, [userData]);

  useEffect(() => () => flushPendingSave(), [flushPendingSave]);







  const saveDigestPeriod = async (period, day) => {
    if (period === 'weekly' && day === null) {
      setWeeklyDayError(true);
      return;
    }
    setWeeklyDayError(false);
    try {
      await fetch(`https://ritmevents.ru/api/v1/users/${userData.id}/digest`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ period, day_of_week: day })
      });
      setShowPeriodSuccessModal(true);
      setTimeout(() => setShowPeriodSuccessModal(false), 1500);
    } catch (err) {
      console.error('Ошибка сохранения периодичности:', err);
    }
  };

  const toggleChip = (section, value) => {
    const current = filters[section];
    const updated = {
      ...filters,
      [section]: current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
    };
    setFilters(updated);
  };

  const toggleAll = (section, allValues) => {
    const updated = {
      ...filters,
      [section]: filters[section].length === allValues.length ? [] : [...allValues]
    };
    setFilters(updated);
  };

  const allCities = [...CITIES, ...customCityOptions];

  const addCustomCity = () => {
    const city = cityInput.trim()
      .toLowerCase()
      .replace(/(^|[\s-])([а-яёa-z]+)/g, (_, sep, word) =>
        sep + (sep === '-' && word.length <= 2 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      );
    if (!city || customCityOptions.includes(city) || CITIES.includes(city)) {
      setCityInput('');
      return;
    }
    const updated = [...customCityOptions, city];
    setCustomCityOptions(updated);
    localStorage.setItem('user_custom_cities', JSON.stringify(updated));
    setFilters({ ...filters, cities: [...filters.cities, city] });
    setCityInput('');
  };

  const removeCustomCity = (city) => {
    const updatedOptions = customCityOptions.filter(c => c !== city);
    setCustomCityOptions(updatedOptions);
    localStorage.setItem('user_custom_cities', JSON.stringify(updatedOptions));
    setFilters({ ...filters, cities: filters.cities.filter(c => c !== city) });
  };

  const goToTab = (tab) => {
    const fromIndex = tabs.indexOf(activeTab);
    const toIndex = tabs.indexOf(tab);
    setSubtabDirection(toIndex > fromIndex ? 1 : -1);
    setActiveTab(tab);
  };

  const bindSubtabSwipe = useSwipeNavigation({
    currentIndex: tabs.indexOf(activeTab),
    itemCount: tabs.length,
    onSwipe: ({ direction, targetIndex, inBounds }) => {
      if (inBounds) {
        setSubtabDirection(direction);
        setActiveTab(tabs[targetIndex]);
        return;
      }
      const profileIndex = TAB_PATHS.indexOf('/profile');
      const escapeIndex = profileIndex + direction;
      if (profileIndex !== -1 && escapeIndex >= 0 && escapeIndex < TAB_PATHS.length) {
        navigate(TAB_PATHS[escapeIndex]);
      }
    },
  });

  const subtabVariants = {
    initial: (direction) =>
      prefersReducedMotion ? { opacity: 0 } : { x: `${direction > 0 ? 100 : -100}%`, opacity: 0 },
    animate: { x: '0%', opacity: 1 },
    exit: (direction) =>
      prefersReducedMotion ? { opacity: 0 } : { x: `${direction > 0 ? -100 : 100}%`, opacity: 0 },
  };

  // Удаление помощника
const deleteHelper = async (assistantId) => {
  if (!token || !userData) return;

  try {
    const response = await fetch(
      `https://ritmevents.ru/api/v1/users/${userData.id}/assistants/${assistantId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 204 || response.ok) {
      setAssistants(prev => prev.filter(assistant => assistant.id !== assistantId));
      setShowDeleteSuccessModal(true);
      setTimeout(() => setShowDeleteSuccessModal(false), 1500);
    } else if (response.status === 404) {
      setError("Помощник не найден");
      setTimeout(() => setError(null), 3000);
    } else {
      throw new Error("Ошибка при удалении");
    }
  } catch (err) {
    console.error('Ошибка:', err);
    setError("Не удалось удалить помощника");
    setTimeout(() => setError(null), 3000);
  }
};


// Создание инвайт-ссылки
const createInviteLink = async () => {
  if (!token) {
    setError("Необходима авторизация");
    return;
  }

  setIsCreatingInvite(true);
  setError(null);

  try {
    const response = await fetch('https://ritmevents.ru/api/v1/assistants/invite', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();

    if (response.ok) {
      const data = JSON.parse(responseText);
      const inviteUrl = `https://t.me/sber_events_agg_bot?startapp=invite_${data.token}`;
      setInviteLink({
        ...data,
        invite_url: inviteUrl
      });
      setShowInviteModal(true);
    } else {
      setError("Ошибка создания приглашения");
      setTimeout(() => setError(null), 3000);
    }
  } catch (err) {
    console.error('[createInviteLink] Network error:', err);
    setError("Не удалось создать приглашение");
    setTimeout(() => setError(null), 3000);
  } finally {
    setIsCreatingInvite(false);
  }
};

  // Копирование ссылки в буфер обмена
const copyInviteLink = () => {
  if (inviteLink?.invite_url) {
    navigator.clipboard.writeText(inviteLink.invite_url);
    setShowCopySuccessModal(true);
    setTimeout(() => setShowCopySuccessModal(false), 1500);
  }
};

  // Отзыв инвайт-ссылки
  const revokeInviteLink = async () => {
    if (!inviteLink?.token) return;

    try {
      const response = await fetch(`https://ritmevents.ru/api/v1/assistants/invite/${inviteLink.token}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 204 || response.ok) {
        setInviteLink(null);
        setShowInviteModal(false);
        setShowModal(true);
        setTimeout(() => setShowModal(false), 1500);
      }
    } catch (err) {
      console.error('Ошибка:', err);
      setError("Не удалось отозвать приглашение");
      setTimeout(() => setError(null), 3000);
    }
  };

  const fetchAllExtraData = async (userId) => {
    const fetchOne = async (url, dataType, setState) => {
      try {
        setLoadingExtra(prev => ({ ...prev, [dataType]: true }));
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setState(data);
        } else {
          setState([]);
        }
      } catch (err) {
        console.error(`Ошибка загрузки ${dataType}:`, err);
        setState([]);
      } finally {
        setLoadingExtra(prev => ({ ...prev, [dataType]: false }));
      }
    };

    const fetchCalendarEvents = async () => {
      try {
        setLoadingExtra(prev => ({ ...prev, calendarEvents: true }));
        const response = await fetch(
          `https://ritmevents.ru/api/v1/users/${userId}/calendar-events`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setCalendarEvents(data);

          const futureEventsList = [];

          const ids = data.map(item => item.event_id).filter(Boolean);
          if (ids.length > 0) {
            try {
              const url = new URL('https://ritmevents.ru/api/v1/events/by-ids');
              ids.forEach(id => url.searchParams.append('ids', id));
              const res = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                const eventsArray = await res.json();
                const eventsMap = Object.fromEntries(
                  (Array.isArray(eventsArray) ? eventsArray : []).map(e => [e.id, e])
                );
                for (const item of data) {
                  const eventData = eventsMap[item.event_id];
                  if (eventData?.start_date && isUpcomingEvent(eventData.start_date)) {
                    futureEventsList.push({
                      id: item.id,
                      event_id: item.event_id,
                      provider: item.provider,
                      eventDetails: eventData
                    });
                  }
                }
              } else if (res.status === 401) {
                console.error('Токен недействителен');
                localStorage.removeItem('access_token');
              }
            } catch (e) {
              console.error('Ошибка загрузки событий по ID:', e);
            }
          }
          
          futureEventsList.sort((a, b) => {
            const dateA = new Date(a.eventDetails.start_date);
            const dateB = new Date(b.eventDetails.start_date);
            return dateA - dateB;
          });
          
          setUpcomingEvents(futureEventsList);
        } else {
          setCalendarEvents([]);
          setUpcomingEvents([]);
        }
      } catch (err) {
        console.error('Ошибка загрузки событий календаря:', err);
        setCalendarEvents([]);
        setUpcomingEvents([]);
      } finally {
        setLoadingExtra(prev => ({ ...prev, calendarEvents: false }));
      }
    };

    await Promise.all([
      fetchOne(`https://ritmevents.ru/api/v1/users/${userId}/assistants`, 'assistants', setAssistants),
      fetchOne(`https://ritmevents.ru/api/v1/users/${userId}/submissions`, 'submissions', setSubmissions),
      fetchOne(`https://ritmevents.ru/api/v1/users/${userId}/calendars`, 'calendars', setCalendars),
      fetchCalendarEvents(),
    ]);
  };

  const deleteCalendar = async (provider) => {
    if (!token || calendarPendingProvider === provider) return;

    const calendarExists = calendars.some(cal => cal.provider === provider);
    if (!calendarExists) {
      await fetchAllExtraData(userData.id);
      return;
    }

    const providerName = provider === 'google' ? 'google' :
                         provider === 'yandex' ? 'yandex' : provider;

    setCalendarPendingProvider(provider);
    try {
      const response = await fetch(
        `https://ritmevents.ru/api/v1/calendars/${providerName}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 204 || response.ok) {
        setCalendars(prev => prev.filter(cal => cal.provider !== provider));
        setCalendarEvents(prev => prev.filter(event => event.provider !== provider));
        setUpcomingEvents(prev => prev.filter(event => event.provider !== provider));
      } else if (response.status === 404) {
        await fetchAllExtraData(userData.id);
      } else if (response.status === 401) {
        localStorage.removeItem('access_token');
        setError('Сессия истекла. Пожалуйста, войдите снова');
      } else {
        console.error('Ошибка удаления календаря:', response.status);
      }
    } catch (err) {
      console.error('Ошибка при удалении календаря:', err);
    } finally {
      setCalendarPendingProvider(null);
    }
  };

  const hasAllFilters = filters.cities.length > 0 &&
                        filters.categories.length > 0 &&
                        filters.eventTypes.length > 0 &&
                        filters.participationTypes.length > 0;

  if (isCheckingAuth) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="spinner"></div>
          <p>Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return <div className="profile-container"><div className="profile-empty"></div></div>;
  }

  return (
    <div className="profile-container" {...bindSubtabSwipe()}>
      <div className="profile-header">
        <h1 className="profile-header__title">Профиль</h1>
        <ProfileUserBadge userData={userData} />
      </div>
      <div className="profileTabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => goToTab(tab)}
            style={{color: '#000000'}}
          >
            {tab === 'myFilters' ? 'Фильтры'
              : tab === 'myEvents' ? 'События'
              : 'Календари'}
          </button>
        ))}
      </div>

      <div className="profile__tabs-content">
         {showFilterSuccessModal && (
            <div className="filter-success-modal">
              <div className="filter-success-content">
                <p>Фильтры сохранены!</p>
              </div>
            </div>
          )}
          {showPeriodSuccessModal && (
            <div className="filter-success-modal">
              <div className="filter-success-content">
                <p>Периодичность сохранена!</p>
              </div>
            </div>
          )}
          {showDeleteSuccessModal && (
  <div className="filter-success-modal">
    <div className="filter-success-content">
      <p>Помощник удалён</p>
    </div>
  </div>
)}

{showCopySuccessModal && (
  <div className="filter-success-modal">
    <div className="filter-success-content">
      <p>Ссылка скопирована!</p>
    </div>
  </div>
)}

        <AnimatePresence initial={false} custom={subtabDirection}>
          <motion.div
            key={activeTab}
            className="profile-subtab-panel"
            custom={subtabDirection}
            variants={subtabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
        {/* фильтры */}
        {activeTab === 'myFilters' && (
          <div className="profile__filters-section">
            {!hasAllFilters && (
              <div className="profile-inactive-banner">
                ⚠️ Дайджест неактивен — заполни все разделы
              </div>
            )}
            <div className="filter-section">
              <div className="filter-section-header">
                <h3 className="filter-section__title">Категории</h3>
                <button className="filter-section--chooseAll" onClick={() => toggleAll('categories', CATEGORIES)}>
                  {filters.categories.length === CATEGORIES.length ? 'Очистить все' : 'Выбрать все'}
                </button>
              </div>
              <div className="profile_chips-container">
                {CATEGORIES.map((item, i) => (
                  <button key={i} className={`profile_chip ${filters.categories.includes(item) ? 'profile_chip-active' : ''}`} onClick={() => toggleChip('categories', item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-section-header">
                <h3 className="filter-section__title">Город</h3>
                <button className="filter-section--chooseAll" onClick={() => toggleAll('cities', allCities)}>
                  {filters.cities.length === allCities.length ? 'Очистить все' : 'Выбрать все'}
                </button>
              </div>
              <div className="profile_chips-container">
                {CITIES.map((item, i) => (
                  <button key={i} className={`profile_chip ${filters.cities.includes(item) ? 'profile_chip-active' : ''}`} onClick={() => toggleChip('cities', item)}>
                    {item}
                  </button>
                ))}
                {customCityOptions.map((item, i) => (
                  <span key={`custom-${i}`} className={`profile_chip profile_chip--custom ${filters.cities.includes(item) ? 'profile_chip-active' : ''}`}>
                    <span onClick={() => toggleChip('cities', item)}>{item}</span>
                    <span className="profile_chip__remove" onClick={() => removeCustomCity(item)}>×</span>
                  </span>
                ))}
              </div>
              <div className="city-add-row">
                <input
                  className="city-add-input"
                  type="text"
                  placeholder="Другой город..."
                  value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomCity()}
                />
                <button className="city-add-btn" onClick={addCustomCity}>Добавить</button>
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-section-header">
                <h3 className="filter-section__title">Тип мероприятия</h3>
                <button className="filter-section--chooseAll" onClick={() => toggleAll('eventTypes', EVENT_TYPES)}>
                  {filters.eventTypes.length === EVENT_TYPES.length ? 'Очистить все' : 'Выбрать все'}
                </button>
              </div>
              <div className="profile_chips-container">
                {EVENT_TYPES.map((item, i) => (
                  <button key={i} className={`profile_chip ${filters.eventTypes.includes(item) ? 'profile_chip-active' : ''}`} onClick={() => toggleChip('eventTypes', item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-section-header">
                <h3 className="filter-section__title">Тип участия</h3>
                <button className="filter-section--chooseAll" onClick={() => toggleAll('participationTypes', PARTICIPATION_TYPES)}>
                  {filters.participationTypes.length === PARTICIPATION_TYPES.length ? 'Очистить все' : 'Выбрать все'}
                </button>
              </div>
              <div className="profile_chips-container">
                {PARTICIPATION_TYPES.map((item, i) => (
                  <button key={i} className={`profile_chip ${filters.participationTypes.includes(item) ? 'profile_chip-active' : ''}`} onClick={() => toggleChip('participationTypes', item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <button
              className={`apply-filters__btn ${isSaving ? 'saving' : ''}`}
              onClick={applyFilters}
              disabled={isSaving}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить фильтры'}
            </button>
            <button
              className="reset-filters__btn"
              onClick={() => saveFilters({ cities: [], categories: [], eventTypes: [], participationTypes: [] })}
            >
              Сбросить всё
            </button>
          </div>
        )}

        {activeTab === 'myFilters' && (
          <div className="profile__digest-settings-section">
            <div className="filter-section">
              <div className="filter-section-header">
                <h3 className="filter-section__title">Периодичность дайджеста</h3>
              </div>
              <div className="profile_chips-container">
                {[
                  { value: 'daily', label: 'Каждый день' },
                  { value: 'every_2_days', label: 'Раз в 2 дня' },
                  { value: 'weekly', label: 'Раз в неделю' },
                  { value: 'monthly', label: 'Раз в месяц' },
                  { value: 'never', label: 'Никогда' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    className={`profile_chip ${digestPeriod === value ? 'profile_chip-active' : ''}`}
                    onClick={() => {
                      setDigestPeriod(value);
                      if (value !== 'weekly') {
                        setDigestDay(null);
                        setWeeklyDayError(false);
                        saveDigestPeriod(value, null);
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {digestPeriod === 'weekly' && (
                <div className="digest-day-picker">
                  <p className="digest-day-picker__label">День недели</p>
                  <div className="digest-weekdays">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dayLabel, idx) => (
                      <button
                        key={idx}
                        className={`profile_chip ${digestDay === idx ? 'profile_chip-active' : ''}`}
                        onClick={() => {
                          setDigestDay(idx);
                          setWeeklyDayError(false);
                          saveDigestPeriod('weekly', idx);
                        }}
                      >
                        {dayLabel}
                      </button>
                    ))}
                  </div>
                  {weeklyDayError && (
                    <p className="digest-day-picker__error">Выберите день недели</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* календари */}
        {activeTab === 'myCalendars' && (
          <div className="profile__calendars-section">
            <div className="calendar-subsection">
              <label className="calendar-prompt-toggle">
                <input
                  type="checkbox"
                  checked={!skipPrompt}
                  onChange={(e) => setSkipPrompt(!e.target.checked)}
                  disabled={isCalendarPromptPending}
                />
                Предлагать добавить во внешний календарь при сохранении события
              </label>
            </div>
            <div className="calendar-subsection">
              {loadingExtra.calendars ? (
                <div className="profile-loading-small">
                  <div className="spinner-small"></div>
                  <p>Загрузка...</p>
                </div>
              ) : (
                <div className="all-calendars-list">
                  {availableCalendars.map((calendar) => {
                    const isConnected = calendars.some(cal => cal.provider === calendar.id);
                    
                    return (
                      <div key={calendar.id} className="calendar-item">
                        <div className="calendar-info">
                          <span className="calendar-name">{calendar.name}</span>
                        </div>
                        {isConnected ? (
                          <div className="calendar-actions">
                            <button
                              className="calendar-open-btn"
                              onClick={() => openLink(calendarRootUrl[calendar.id])}
                            >
                              Открыть
                            </button>
                            <button
                              className="calendar-delete-btn"
                              onClick={() => deleteCalendar(calendar.id)}
                              disabled={calendarPendingProvider === calendar.id}
                            >
                              {calendarPendingProvider === calendar.id ? 'Удаление...' : 'Удалить'}
                            </button>
                          </div>
                        ) : (
                          <button
                            className="calendar-connect-btn"
                            onClick={() => handleConnectCalendar(calendar.id)}
                            disabled={calendarPendingProvider === calendar.id}
                          >
                            {calendarPendingProvider === calendar.id ? 'Подключение...' : 'Подключить'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* мои события — встроенный календарь */}
        {activeTab === 'myEvents' && (() => {
          const toDateStr = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };
          const selectedStr = toDateStr(selectedCalendarDate);
          const todayStr = toDateStr(new Date());

          const eventDates = new Set(
            savedEvents.map(e => e.start_date).filter(Boolean)
          );

          const eventsForDay = savedEvents.filter(e => e.start_date === selectedStr);

          return (
            <div className="profile__events-section">
              {savedLoading ? (
                <div className="profile-loading-small">
                  <div className="spinner-small"></div>
                  <p>Загрузка событий...</p>
                </div>
              ) : (
                <>
                  <ReactCalendar
                    locale="ru-RU"
                    value={selectedCalendarDate}
                    onChange={setSelectedCalendarDate}
                    className="profile-react-calendar"
                    tileContent={({ date, view }) => {
                      if (view !== 'month') return null;
                      const ds = toDateStr(date);
                      const isSelected = ds === selectedStr;
                      const isToday = ds === todayStr;
                      return (
                        <>
                          {(isSelected || isToday) && (
                            <div
                              key={`highlight-${ds}`}
                              className={`calendar-tile-highlight ${isSelected ? 'calendar-tile-highlight--active' : 'calendar-tile-highlight--now'}`}
                            />
                          )}
                          {eventDates.has(ds) && (
                            <div
                              key={`dot-${ds}`}
                              className={`calendar-event-dot ${isSelected ? 'calendar-event-dot--active' : ''}`}
                            />
                          )}
                        </>
                      );
                    }}
                  />

                  <div className="profile-calendar-day-events">
                    {eventsForDay.length === 0 ? (
                      savedEvents.length === 0 ? (
                        <p className="profile-empty-hint">
                          Нажми закладку на событии, чтобы добавить его сюда
                        </p>
                      ) : (
                        <p className="profile-calendar-no-events">Нет событий в этот день</p>
                      )
                    ) : (
                      eventsForDay.map((event) => (
                        <div key={event.id} className="profile-event-card">
                          <button
                            type="button"
                            className="profile-event-card__remove"
                            aria-label="Удалить из календаря"
                            onClick={() => unsaveEvent(event.id)}
                          >
                            ×
                          </button>
                          <div className="digest__header">
                            <p className="digest__type">{event.event_type?.join(', ')}</p>
                            <h3 className="digest__title">{event.title}</h3>
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
                                {event.price === 0 ? 'Бесплатно' : event.price}
                              </div>
                            )}
                            {event.participation_type && (
                              <div className="digest__partType">
                                <Users size={14} color="#1032A1" strokeWidth={1.5} />
                                {event.participation_type?.join?.(', ') ?? event.participation_type}
                              </div>
                            )}
                            <div className="digest__location">
                              <MapPin size={14} color="#1032A1" strokeWidth={1.5} />
                              {event.city?.join(', ') || event.address || 'Онлайн'}
                            </div>
                          </div>
                          {event.tags?.length > 0 && (
                            <div className="digest__tags">
                              {event.tags.map((tag, i) => (
                                <span key={i} className="digest__tag">#{tag}</span>
                              ))}
                            </div>
                          )}
                          <Link
                            to={`/events/${event.id}`}
                            className="digest__link"
                            state={{ token, userId: userData?.id, from: 'profile-events' }}
                            onClick={() => {
                              fetch(`https://ritmevents.ru/api/v1/events/${event.id}/view`, {
                                method: 'POST',
                                headers: {
                                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ source: 'profile' }),
                              });
                            }}
                          >
                            <button className="btn digest__knowMore">ПОДРОБНЕЕ</button>
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Помощники */}
        {activeTab === 'myHelpers' && (
          <div className="profile__helpers-section">
            <p className="helpers-description">
              Помощники могут самостоятельно добавлять события в твой календарь
            </p>
            
            <button 
              className="create-invite-btn"
              onClick={createInviteLink}
              disabled={isCreatingInvite}
            >
              {isCreatingInvite ? "Создание..." : "+ Создать ссылку-приглашение"}
            </button>
            
            {loadingExtra.assistants ? (
              <div className="profile-loading-small">
                <div className="spinner-small"></div>
                <p>Загрузка...</p>
              </div>
            ) : (
              <>
                {assistants.length > 0 ? (
                  <div className="profile-assistants-list">
                    {assistants.map((assistant) => (
                      <div key={assistant.id} className="profile-assistant-item">
                        <div className="assistant-info">
                          <span className="assistant-name">{assistant.username || `Помощник ${assistant.id}`}</span>
                          {/* {assistant.telegram_id && (
                            <span className="assistant-telegram-id">TG ID: {assistant.telegram_id}</span>
                          )} */}
                        </div>
                        <button 
                          className="assistant-delete-btn"
                          onClick={() => deleteHelper(assistant.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="profile-empty-value"></p>
                )}
              </>
            )}
            
            {/* Модальное окно с инвайт-ссылкой */}
            {showInviteModal && inviteLink && (
              <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Приглашение помощника</h3>
                  <p>Отправьте эту ссылку человеку, которого хотите добавить как помощника:</p>
                  <div className="invite-link-container">
                    <input 
                      type="text" 
                      readOnly 
                      value={inviteLink.invite_url} 
                      className="invite-link-input"
                    />
                    <button className="copy-link-btn" onClick={copyInviteLink}>
                      Копировать
                    </button>
                  </div>
                  {/* <p className="invite-expires">
                    Ссылка действительна до: {new Date(inviteLink.expires_at).toLocaleString()}
                  </p> */}
                  <div className="modal-actions">
                    <button className="modal-cancel-btn" onClick={() => setShowInviteModal(false)}>
                      Закрыть
                    </button>
                    <button className="modal-confirm-btn" onClick={revokeInviteLink}>
                      Отозвать ссылку
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}