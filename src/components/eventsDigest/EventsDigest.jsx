import React, { useState, useMemo, useEffect } from "react";
import { Button, Placeholder } from '@telegram-apps/telegram-ui';
import eventsData from "../../data/mock_events.json";
import './EventsDigest.css';
import { Link } from "react-router-dom";
import Filters from "../Filters/Filters";

import dateIcon from "../../assets/icons/DateRange.svg";
import timeIcon from "../../assets/icons/time.svg";
import priceIcon from "../../assets/icons/currency.svg";
import placeIcon from "../../assets/icons/Place.svg";

export default function EventsDigest({ filters, setFilters }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const activeCount = Object.values(filters).flat().length;
  const isFilterApplied = activeCount > 0;



  useEffect(()=>{
    const handleAuth = async () => {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;
      const telegramId = tg?.initDataUnsafe?.user?.id;

      try {
        const response = await fetch('https://sunyodrive.ru', {
          method: 'POST',
          headers:{
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({init_data:initData}),
        });
        if(response.ok){
          const data = await response.json();
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);

          setIsLoggedIn(true);
          if (telegramId) {
            const userRes = await fetch(`https://sunyodrive.ru{telegramId}`, {
              headers: { 'Authorization': `Bearer ${data.access_token}` }
            });

            if (userRes.ok) {
              const userData = await userRes.json();
               setFilters({
                cities: userData.city ? [userData.city] : [],
                categories: userData.track ? [userData.track] : [],
                eventTypes: userData.preferred_event_types ? [userData.preferred_event_types] : [],
                participationTypes: userData.preferred_participation_types ? [userData.preferred_participation_types] : []
              });
              
              setIsDrawerOpen(false);
            }
        }}
        else{
          setIsLoggedIn(false);
          setIsDrawerOpen(true);
        }

      } catch (error) {
        console.log('ошибка: ', error);
        setIsDrawerOpen(true);
       
      }finally{
        setIsCheckingAuth(false);
      }
    }
    handleAuth();
  },[]);


  const filteredEvents = useMemo(() => {
    if (!isLoggedIn && !isFilterApplied) return [];
    
    return eventsData.filter(event => {
      if (filters.cities.length > 0 && !event.city?.some(c => filters.cities.includes(c))) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(event.category)) return false;
      if (filters.eventTypes.length > 0 && !event.event_type?.some(t => filters.eventTypes.includes(t))) return false;
      if (filters.participationTypes.length > 0 && !filters.participationTypes.includes(event.participation_type)) return false;
      return true;
    });
  }, [filters, isFilterApplied, isLoggedIn]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  return (
    <div className="events">
      <div className="filters-header-sticky">
        <Button 
          mode="outline" 
          stretched 
          size="m" 
          onClick={() => setIsDrawerOpen(true)} 
          className="filters-open-btn"
        >
          Фильтры {activeCount > 0 && `(${activeCount})`}
        </Button>
      </div>

      <Filters 
        filters={filters} 
        onFilterChange={setFilters} 
        isOpen={isDrawerOpen} 
        setIsOpen={setIsDrawerOpen} 
      />

      <div className="digest-list">
        {!isLoggedIn && !isFilterApplied ? (
          <Placeholder 
            className="placeholder"
            header="Выберите параметры" 
            description="Чтобы увидеть мероприятия, выберите интересующие вас категории"
          />
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map(event => (
            <div key={event.id} className="digest__item">
              <div className="digest__header">
                <p className="digest__type">{event.event_type?.join(', ')}</p>
                <h3 className="digest__title">{event.title}</h3>
              </div>
              <div className="digest__mainInfo">
                <div className="digest__date-row">
                  {event.start_date && (
                    <div className="digest__day"><img src={dateIcon} alt="icon" /> {event.start_date.split('-').reverse().join('.')}</div>
                  )}
                  {event.start_time && (
                    <div className="digest__time"><img src={timeIcon} alt="icon" /> {event.start_time}</div>
                  )}
                </div>
                {Number.isInteger(event.price) && (
                  <div className="digest__price"><img src={priceIcon} alt="ruble icon" /> {event.price === 0 ? "Бесплатно" : event.price}</div>
                )}
                <div className="digest__location"><img src={placeIcon} alt="icon" /> {event.city?.join(', ')}</div>
              </div>
              {event.tags && event.tags.length > 0 && (
                <div className="digest__tags">
                  {event.tags.map((tag, index) => (
                    <span key={index} className="digest__tag">#{tag}</span>
                  ))}
                </div>
              )}
              <Link to={`/events/${event.id}`} className="digest__link">
                <button className="btn digest__knowMore">ПОДРОБНЕЕ</button>
              </Link>
            </div>
          ))
        ) : (
          <p className="no-results">Мероприятий не найдено</p>
        )}
      </div>
    </div>
  );
}